/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  Check,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ACCEPTED_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  type ChatAttachment,
  type ChatMessage,
  type MarciaChatController,
} from "./marcia-chat-types";

function readAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const isPdf = file.type === "application/pdf";
    const isImage = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
    if (!isPdf && !isImage) return reject(new Error("Envie uma foto (PNG, JPG, WebP) ou um PDF."));
    if (file.size === 0) return reject(new Error("Esse arquivo está vazio."));
    if (file.size > MAX_ATTACHMENT_BYTES)
      return reject(new Error("O arquivo precisa ter até 5 MB."));
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return reject(new Error("Não foi possível ler o arquivo."));
      resolve({
        name: file.name || (isPdf ? "comprovante.pdf" : "foto.jpg"),
        size: file.size,
        mimeType: file.type,
        kind: isPdf ? "pdf" : "image",
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function MarciaChat({
  controller,
  assistantName,
  suggestions = [],
  variant = "full",
  placeholder,
  emptyState,
  composeText,
}: {
  controller: MarciaChatController;
  assistantName: string;
  suggestions?: string[];
  variant?: "full" | "compact";
  placeholder?: string;
  emptyState?: ReactNode;
  /** Ajusta a mensagem antes de enviar (ex.: incluir a data escolhida no calendário). */
  composeText?: (text: string) => string;
}) {
  const { messages, phase, pending, historyLoading } = controller;
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const spokenRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = phase === "understanding" || phase === "executing";
  const listening = phase === "listening";
  const compact = variant === "compact";

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length, phase]);

  async function submit(text = input) {
    if (busy || listening) return;
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    const finalText = trimmed && composeText ? composeText(trimmed) : trimmed;
    const current = attachment;
    setInput("");
    setAttachment(null);
    await controller.send(finalText, current);
  }

  async function pickFile(file?: File | null) {
    if (!file) return;
    try {
      setAttachment(await readAttachment(file));
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível anexar.");
    }
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    if (busy) return;
    const Recognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!Recognition) {
      if (controller.voiceFallback) {
        setInput(controller.voiceFallback);
        return;
      }
      toast.error("O ditado por voz não está disponível neste navegador. Use Chrome ou Edge.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    spokenRef.current = "";
    recognition.onstart = () => controller.setListening(true);
    recognition.onresult = (event: any) => {
      let transcript = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = String(event.results[i][0]?.transcript || "");
        transcript += piece;
        if (event.results[i].isFinal) finalText += piece;
      }
      if (transcript.trim()) setInput(transcript.trim());
      if (finalText.trim()) spokenRef.current = finalText.trim();
    };
    recognition.onerror = (event: any) => {
      controller.setListening(false);
      if (event?.error !== "aborted")
        toast.error("Não consegui ouvir. Toque no microfone e tente novamente.");
    };
    recognition.onend = () => {
      controller.setListening(false);
      recognitionRef.current = null;
      const spoken = spokenRef.current.trim();
      if (spoken) {
        setInput("");
        void controller.send(composeText ? composeText(spoken) : spoken, null);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden ${compact ? "rounded-2xl border border-border bg-background/60" : "min-h-0 flex-1"}`}
    >
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto ${compact ? "max-h-64 p-3" : "px-3 py-4 sm:px-6"}`}
        aria-live="polite"
      >
        {historyLoading && !messages.length ? (
          <div className="grid h-full place-items-center py-10 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" /> Carregando conversa…
            </span>
          </div>
        ) : !messages.length ? (
          (emptyState ?? null)
        ) : (
          messages.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              assistantName={assistantName}
              active={pending?.messageId === message.id && !busy}
              mode={pending?.messageId === message.id ? pending.mode : undefined}
              onConfirm={controller.confirm}
              onCancel={controller.cancel}
              compact={compact}
            />
          ))
        )}
        {busy && <Thinking assistantName={assistantName} executing={phase === "executing"} />}
      </div>

      {pending?.mode === "question" &&
        pending.quickReplies.length > 0 &&
        !busy &&
        lastAssistant?.id === pending.messageId && (
          <div className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2 sm:px-6">
            {pending.quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => void controller.send(reply, null)}
                className="whitespace-nowrap rounded-full border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] px-3 py-1.5 text-xs font-bold text-[color:var(--brand-text)]"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className={`shrink-0 border-t border-border bg-card/95 backdrop-blur ${compact ? "p-2" : "p-2.5 sm:p-3"}`}
      >
        {!compact && suggestions.length > 0 && !busy && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void submit(suggestion)}
                className="whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-[color:var(--brand-soft-strong)] hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {attachment && (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] p-2">
            {attachment.kind === "image" ? (
              <img
                src={attachment.dataUrl}
                alt="Prévia do anexo"
                className="size-10 rounded-lg object-cover"
              />
            ) : (
              <div className="grid size-10 place-items-center rounded-lg bg-card text-rose-600">
                <FileText className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold">{attachment.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {attachment.kind === "pdf" ? "PDF" : "Imagem"} · {formatBytes(attachment.size)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
              aria-label="Remover anexo"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-background p-1.5 focus-within:border-[color:var(--brand-soft-strong)] focus-within:ring-2 focus-within:ring-[color:var(--brand-soft)]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={busy || listening}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Anexar arquivo"
                title="Anexar foto, comprovante ou PDF"
              >
                <Paperclip className="size-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                <FileText /> Foto, comprovante ou PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => cameraRef.current?.click()}>
                <Camera /> Tirar foto agora
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_ATTACHMENTS}
            className="hidden"
            data-testid="chat-file-input"
            onChange={(event) => {
              void pickFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void pickFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            disabled={busy || listening}
            rows={1}
            aria-label={`Mensagem para ${assistantName}`}
            placeholder={
              listening
                ? "Estou ouvindo…"
                : pending?.mode === "question"
                  ? `Responda ${assistantName}…`
                  : placeholder || "Ex.: gastei R$ 85 no mercado pelo Pix"
            }
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            className={`grid size-9 shrink-0 place-items-center rounded-xl transition disabled:opacity-50 ${listening ? "animate-pulse bg-rose-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            aria-label={listening ? "Parar de ouvir" : "Falar"}
            title={listening ? "Parar" : "Falar"}
          >
            {listening ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <Mic className="size-[18px]" />
            )}
          </button>
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && !attachment) || busy || listening}
            className="size-9 shrink-0 rounded-xl bg-[color:var(--brand)] text-white hover:brightness-95"
            aria-label="Enviar"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        {!compact && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {assistantName} só registra depois da sua confirmação.
          </p>
        )}
      </form>
    </div>
  );
}

function Bubble({
  message,
  assistantName,
  active,
  mode,
  onConfirm,
  onCancel,
  compact,
}: {
  message: ChatMessage;
  assistantName: string;
  active: boolean;
  mode?: "question" | "confirm";
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
  compact: boolean;
}) {
  const mine = message.role === "user";
  const time = message.at
    ? new Date(message.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && !compact && (
        <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[color:var(--brand)] text-white">
          <Sparkles className="size-3.5" />
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            mine
              ? "rounded-br-md bg-[color:var(--brand)] text-white"
              : message.kind === "error"
                ? "rounded-bl-md border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
                : message.kind === "success"
                  ? "rounded-bl-md border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "rounded-bl-md border border-border bg-card"
          }`}
        >
          {message.attachment && (
            <div
              className={`mb-2 flex items-center gap-2 rounded-xl p-1.5 ${mine ? "bg-white/15" : "bg-muted"}`}
            >
              {message.attachment.previewUrl ? (
                <img
                  src={message.attachment.previewUrl}
                  alt={message.attachment.name}
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <div className="grid size-12 place-items-center rounded-lg bg-white/90 text-rose-600">
                  <FileText className="size-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-bold">{message.attachment.name}</div>
                <div className={`text-[10px] ${mine ? "text-white/75" : "text-muted-foreground"}`}>
                  {message.attachment.kind === "pdf" ? "PDF" : "Imagem"} ·{" "}
                  {formatBytes(message.attachment.size)}
                </div>
              </div>
            </div>
          )}
          <p className="whitespace-pre-wrap">{message.text}</p>
          {(mode === "confirm" || message.kind === "confirm") &&
            message.preview &&
            message.preview.length > 0 && (
              <div className="mt-2.5 overflow-hidden rounded-xl border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)]">
                <div className="border-b border-[color:var(--brand-soft-strong)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[color:var(--brand-text)]">
                  Confira antes de registrar
                </div>
                <dl className="divide-y divide-[color:var(--brand-soft-strong)] text-xs">
                  {message.preview.map((row) => (
                    <div key={row.label} className="flex justify-between gap-3 px-3 py-1.5">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-bold text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {active && mode === "confirm" && (
                  <div className="flex gap-2 border-t border-[color:var(--brand-soft-strong)] p-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 flex-1 rounded-lg"
                      onClick={() => void onCancel()}
                    >
                      <X /> Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 flex-1 rounded-lg bg-[color:var(--brand)] text-white"
                      onClick={() => void onConfirm()}
                    >
                      <Check /> Confirmar
                    </Button>
                  </div>
                )}
              </div>
            )}
        </div>
        {time && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground">
            {mine ? "Você" : assistantName} · {time}
          </span>
        )}
      </div>
    </div>
  );
}

function Thinking({ assistantName, executing }: { assistantName: string; executing: boolean }) {
  return (
    <div className="flex items-center gap-2" role="status">
      <div className="grid size-7 place-items-center rounded-full bg-[color:var(--brand)] text-white">
        <Sparkles className="size-3.5 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-xs text-muted-foreground">
        <span className="flex gap-1" aria-hidden>
          <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--brand)] [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--brand)] [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--brand)]" />
        </span>
        {executing ? `${assistantName} está registrando…` : `${assistantName} está analisando…`}
      </div>
    </div>
  );
}
