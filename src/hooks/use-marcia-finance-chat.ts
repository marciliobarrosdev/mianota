/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  cancelFinanceCommand,
  executeFinanceCommand,
  interpretFinanceCommand,
  listFinanceChatHistory,
} from "@/lib/finance-command.functions";
import {
  newId,
  type ChatAttachment,
  type ChatMessage,
  type ChatPendingTurn,
  type ChatPhase,
  type MarciaChatController,
} from "@/components/finance/marcia-chat-types";

const CONFIRM_WORDS = /^(sim|confirmar|confirma|pode fazer|pode|execute|executar|ok)$/;
const CANCEL_WORDS = /^(cancelar|cancela|nao|não)$/;
const CHAT_REQUEST_TIMEOUT_MS = 35_000;

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
}

/** Chat real com a MárcIA: usa as mesmas funções de servidor do WhatsApp financeiro. */
export function useMarciaFinanceChat(
  companyId: string | null | undefined,
  options: { loadHistory?: boolean } = {},
): MarciaChatController {
  const loadHistory = options.loadHistory ?? true;
  const interpret = useServerFn(interpretFinanceCommand);
  const execute = useServerFn(executeFinanceCommand);
  const cancelCommand = useServerFn(cancelFinanceCommand);
  const readHistory = useServerFn(listFinanceChatHistory);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [pending, setPending] = useState<ChatPendingTurn | null>(null);
  const [historyLoading, setHistoryLoading] = useState(loadHistory);
  const commandIdRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!companyId || !loadHistory) {
      setHistoryLoading(false);
      return;
    }
    let alive = true;
    setHistoryLoading(true);
    readHistory({ data: { companyId } })
      .then((rows) => {
        if (!alive) return;
        setMessages((current) =>
          current.length ? current : rows.map((row) => ({ ...row, kind: "answer" as const })),
        );
      })
      .catch(() => undefined)
      .finally(() => alive && setHistoryLoading(false));
    return () => {
      alive = false;
    };
  }, [companyId, loadHistory, readHistory]);

  const append = useCallback((item: Omit<ChatMessage, "id">) => {
    const id = newId();
    setMessages((current) => [...current, { ...item, id, at: new Date().toISOString() }]);
    return id;
  }, []);

  const confirm = useCallback(async () => {
    const commandId = commandIdRef.current;
    if (!companyId || !commandId || busyRef.current) return;
    busyRef.current = true;
    setPhase("executing");
    try {
      const result: any = await execute({ data: { companyId, commandId } });
      append({
        role: "assistant",
        text: result?.message || "Pronto. Registrei para você.",
        kind: "success",
      });
      commandIdRef.current = null;
      setPending(null);
      window.dispatchEvent(new CustomEvent("marcia:finance-updated"));
    } catch (error: any) {
      const text = error?.message || "Não consegui registrar agora.";
      append({ role: "assistant", text, kind: "error" });
      toast.error(text);
    } finally {
      busyRef.current = false;
      setPhase("idle");
    }
  }, [append, companyId, execute]);

  const cancel = useCallback(async () => {
    const commandId = commandIdRef.current;
    if (!companyId || !commandId) return;
    try {
      await cancelCommand({ data: { companyId, commandId } });
    } catch {
      // Encerrar a conversa na tela é seguro mesmo se o pedido já tiver sido fechado.
    }
    commandIdRef.current = null;
    setPending(null);
    append({ role: "assistant", text: "Tudo bem, cancelei esse pedido.", kind: "answer" });
  }, [append, cancelCommand, companyId]);

  const send = useCallback(
    async (raw: string, attachment?: ChatAttachment | null) => {
      const text = raw.trim();
      if (!companyId || busyRef.current || (!text && !attachment)) return;
      const lower = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (pending?.mode === "confirm" && !attachment && CONFIRM_WORDS.test(lower)) {
        append({ role: "user", text });
        await confirm();
        return;
      }
      if (commandIdRef.current && !attachment && CANCEL_WORDS.test(lower)) {
        append({ role: "user", text });
        await cancel();
        return;
      }
      const message = text || "Leia este comprovante e prepare o lançamento.";
      append({
        role: "user",
        text: text || "Enviei um comprovante.",
        attachment: attachment
          ? {
              name: attachment.name,
              size: attachment.size,
              kind: attachment.kind,
              previewUrl: attachment.kind === "image" ? attachment.dataUrl : undefined,
            }
          : undefined,
      });
      busyRef.current = true;
      setPending(null);
      setPhase("understanding");
      try {
        const result = await interpret({
          signal: AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS),
          data: {
            companyId,
            message,
            commandId: commandIdRef.current,
            imageDataUrl: attachment?.kind === "image" ? attachment.dataUrl : null,
            fileDataUrl: attachment?.kind === "pdf" ? attachment.dataUrl : null,
            fileName: attachment?.kind === "pdf" ? attachment.name : null,
          },
        });
        const messageId = append({
          role: "assistant",
          text: result.message,
          preview: result.preview,
          kind: result.mode,
        });
        if (result.mode === "answer") {
          commandIdRef.current = null;
          setPending(null);
        } else {
          commandIdRef.current = result.commandId;
          setPending({ messageId, mode: result.mode, quickReplies: result.quickReplies || [] });
        }
      } catch (error: any) {
        const textError = isTimeoutError(error)
          ? "A IA demorou para responder. A tentativa foi encerrada; tente novamente em alguns instantes."
          : error?.message || "Não consegui entender agora. Tente novamente.";
        append({ role: "assistant", text: textError, kind: "error" });
        toast.error(textError);
      } finally {
        busyRef.current = false;
        setPhase("idle");
      }
    },
    [append, cancel, companyId, confirm, interpret, pending?.mode],
  );

  const setListening = useCallback((listening: boolean) => {
    setPhase((current) => (listening ? "listening" : current === "listening" ? "idle" : current));
  }, []);

  return { messages, phase, pending, historyLoading, send, confirm, cancel, setListening };
}
