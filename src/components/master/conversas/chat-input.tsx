import { useEffect, useRef, useState } from "react";
import {
  FileUp,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Paperclip,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Message } from "./chat-types";
import { getMessageAuthor } from "@/lib/whatsapp/support-inbox-rules";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ChatInputProps {
  conversationId: string;
  connected: boolean;
  isMetaProvider?: boolean;
  quotingMessage: Message | null;
  onClearQuote: () => void;
  onSendText: (body: string, quotedMessageId?: string) => Promise<void>;
  onSendVoice: (
    base64Data: string,
    mimeType: string,
    quotedMessageId?: string,
  ) => Promise<void>;
  onOpenMediaModal: () => void;
  onOpenLocationModal: () => void;
}

export function ChatInput({
  conversationId,
  connected,
  isMetaProvider = false,
  quotingMessage,
  onClearQuote,
  onSendText,
  onSendVoice,
  onOpenMediaModal,
  onOpenLocationModal,
}: ChatInputProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const isSubmittingRef = useRef(false);

  // Estados da Gravação de Áudio
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Isolamento e preservação de rascunho por conversa
  const draftsMapRef = useRef<Map<string, string>>(new Map());
  const prevConvIdRef = useRef<string>(conversationId);

  useEffect(() => {
    if (prevConvIdRef.current !== conversationId) {
      if (prevConvIdRef.current) {
        draftsMapRef.current.set(prevConvIdRef.current, body);
      }
      const saved = draftsMapRef.current.get(conversationId) || "";
      setBody(saved);
      prevConvIdRef.current = conversationId;
      onClearQuote();
      cancelRecording();
    }
  }, [conversationId, onClearQuote]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, []);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending || isSubmittingRef.current || !connected) return;
    isSubmittingRef.current = true;
    setSending(true);
    try {
      await onSendText(text, quotingMessage?.id);
      setBody("");
      draftsMapRef.current.delete(conversationId);
      onClearQuote();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
      isSubmittingRef.current = false;
    }
  }

  // --- Gravação de Áudio ---
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Seu navegador não suporta captura de microfone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm;codecs=opus";
      if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      toast.error(
        "Permissão de microfone negada ou erro ao iniciar gravação: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  function cancelRecording() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setRecording(false);
    setRecordSeconds(0);
  }

  async function finishAndSendRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    setSending(true);
    recorder.onstop = async () => {
      try {
        recorder.stream.getTracks().forEach((track) => track.stop());
        const mimeType = recorder.mimeType || "audio/ogg";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 500) {
          toast.error("Áudio muito curto.");
          setSending(false);
          setRecording(false);
          return;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.replace(/^data:[^;]+;base64,/, ""));
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioBlob);
        const base64Data = await base64Promise;

        await onSendVoice(base64Data, mimeType, quotingMessage?.id);
        onClearQuote();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao enviar áudio.");
      } finally {
        setSending(false);
        setRecording(false);
        setRecordSeconds(0);
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      }
    };

    try {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    } catch {
      setSending(false);
      setRecording(false);
    }
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <footer className="border-t bg-card p-3 md:p-4">
      <div className="mx-auto max-w-3xl space-y-2">
        {isMetaProvider && (
          <p className="text-[11px] text-muted-foreground">
            Na API oficial, respostas livres respeitam a janela de 24 horas da Meta.
          </p>
        )}

        {/* Banner de Citação (Quoting preview) */}
        {quotingMessage && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <div className="border-l-2 border-primary pl-2 min-w-0">
              <span className="font-semibold text-primary block truncate">
                Respondendo a {getMessageAuthor(quotingMessage).label}
              </span>
              <p className="line-clamp-1 text-muted-foreground">{quotingMessage.body}</p>
            </div>
            <button
              type="button"
              onClick={onClearQuote}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              title="Cancelar resposta"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Modo de Gravação de Áudio ao Vivo */}
        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-600 animate-pulse" />
              <span className="font-mono text-sm font-bold text-red-900">
                {formatTimer(recordSeconds)}
              </span>
            </div>
            <span className="text-xs text-red-700 italic flex-1">
              Gravando mensagem de voz…
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelRecording}
              className="text-red-700 hover:bg-red-100 hover:text-red-900"
              title="Descartar gravação"
            >
              <Trash2 className="size-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={finishAndSendRecording}
              disabled={sending}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Enviar áudio
            </Button>
          </div>
        ) : (
          /* Modo Normal de Digitação */
          <div className="flex items-end gap-2">
            {/* Menu de Anexos */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0 rounded-xl border-border text-muted-foreground hover:text-foreground"
                  disabled={!connected || sending}
                  title="Anexar arquivos ou localização"
                >
                  <Paperclip className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5">
                <DropdownMenuItem
                  onClick={onOpenMediaModal}
                  className="gap-2.5 cursor-pointer py-2 text-xs"
                >
                  <FileUp className="size-4 text-violet-500" />
                  <div>
                    <strong className="block">Foto, Vídeo ou Documento</strong>
                    <span className="text-[10px] text-muted-foreground">
                      PNG, JPG, PDF, DOCX
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onOpenLocationModal}
                  className="gap-2.5 cursor-pointer py-2 text-xs"
                >
                  <MapPin className="size-4 text-red-500" />
                  <div>
                    <strong className="block">Compartilhar Localização</strong>
                    <span className="text-[10px] text-muted-foreground">
                      GPS atual ou coordenadas
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Caixa de Texto Multi-linha */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Escreva sua resposta… (Enter envia, Shift+Enter pula linha)"
              rows={2}
              disabled={!connected || sending}
              className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60"
            />

            {/* Gravar Áudio pelo Microfone */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={startRecording}
              disabled={!connected || sending}
              className="size-11 shrink-0 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Gravar áudio pelo microfone"
            >
              <Mic className="size-4" />
            </Button>

            {/* Botão Enviar Texto */}
            <Button
              type="button"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={handleSend}
              disabled={sending || !body.trim() || !connected}
              title="Enviar mensagem"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </footer>
  );
}
