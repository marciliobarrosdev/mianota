import {
  Check,
  CheckCheck,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Reply,
  Volume2,
} from "lucide-react";
import { Message } from "./chat-types";
import { getMessageAuthor } from "@/lib/whatsapp/support-inbox-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChatBubbleProps {
  message: Message;
  allMessages?: Message[];
  onQuote: (message: Message) => void;
  onPreviewImage: (url: string) => void;
}

export function ChatBubble({
  message,
  allMessages = [],
  onQuote,
  onPreviewImage,
}: ChatBubbleProps) {
  const outgoing = message.direction === "outbound";
  const author = getMessageAuthor(message);

  // Encontra a mensagem citada se existir
  const quoted = message.quoted_message_id
    ? allMessages.find((m) => m.id === message.quoted_message_id)
    : null;

  return (
    <div
      className={`group relative flex ${outgoing ? "justify-end" : "justify-start"} items-end gap-1.5`}
    >
      {!outgoing && (
        <button
          type="button"
          onClick={() => onQuote(message)}
          title="Responder mensagem"
          className="mb-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <Reply className="size-3.5" />
        </button>
      )}

      <div
        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs transition-shadow ${
          outgoing
            ? author.type === "ai"
              ? "bg-violet-600 text-white rounded-br-xs"
              : author.type === "linked_phone"
                ? "bg-emerald-700 text-white rounded-br-xs"
                : "bg-primary text-primary-foreground rounded-br-xs"
            : "bg-card border border-border/80 text-foreground rounded-bl-xs"
        }`}
      >
        {/* Identificação do autor */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-bold tracking-tight truncate ${
              outgoing ? "text-white/90" : "text-primary"
            }`}
          >
            {author.label}
          </span>
          {outgoing && (
            <Badge
              variant="outline"
              className={`h-4 px-1 text-[9px] font-semibold border-white/20 ${
                author.type === "ai"
                  ? "bg-violet-700/60 text-violet-100"
                  : author.type === "linked_phone"
                    ? "bg-emerald-800/60 text-emerald-100"
                    : "bg-white/15 text-white"
              }`}
            >
              {author.type === "ai"
                ? "IA"
                : author.type === "linked_phone"
                  ? "WhatsApp Celular"
                  : "Atendente"}
            </Badge>
          )}
        </div>

        {/* Citação de mensagem anterior (Quoted Message) */}
        {quoted && (
          <div
            className={`mb-2 rounded-lg border-l-4 px-2.5 py-1.5 text-xs ${
              outgoing
                ? "border-white/80 bg-black/15 text-white/90"
                : "border-primary bg-muted/60 text-muted-foreground"
            }`}
          >
            <div className="font-semibold text-[11px]">
              {getMessageAuthor(quoted).label}
            </div>
            <p className="line-clamp-2 text-[11px] opacity-90">{quoted.body}</p>
          </div>
        )}

        {/* Renderização de Mídia */}
        {renderMedia(message, outgoing, onPreviewImage)}

        {/* Texto do corpo (se não for áudio vazio ou pura mídia sem legenda) */}
        {Boolean(message.body) &&
          message.message_type !== "audio" &&
          message.message_type !== "location" && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed break-words mt-0.5">
              {message.body}
            </p>
          )}

        {/* Rodapé: Horário e Status de Entrega */}
        <div
          className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
            outgoing ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          <span>
            {new Date(message.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {outgoing && <DeliveryStatusIcon status={message.delivery_status} />}
        </div>
      </div>

      {outgoing && (
        <button
          type="button"
          onClick={() => onQuote(message)}
          title="Responder mensagem"
          className="mb-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <Reply className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function renderMedia(
  message: Message,
  outgoing: boolean,
  onPreviewImage: (url: string) => void,
) {
  const url = message.media_url;
  const type = message.message_type;
  const meta = message.media_meta;

  // Áudio / Mensagem de Voz
  if (type === "audio" || (url && /\.(ogg|opus|mp3|wav|m4a)($|\?)/i.test(url))) {
    return (
      <div className="my-1.5">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className={`size-3.5 ${outgoing ? "text-white/80" : "text-primary"}`} />
          <span className="text-[11px] font-semibold opacity-90">Mensagem de voz</span>
        </div>
        {url ? (
          <audio
            controls
            src={url}
            className={`w-full max-w-[260px] h-9 rounded-md ${outgoing ? "brightness-95 contrast-125" : ""}`}
            preload="metadata"
          />
        ) : (
          <div className="text-xs italic opacity-75">Áudio gravado pelo WhatsApp</div>
        )}
      </div>
    );
  }

  // Imagem
  if (type === "image" || (url && /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(url))) {
    return (
      <div className="my-1.5">
        {url ? (
          <button
            type="button"
            onClick={() => onPreviewImage(url)}
            className="block overflow-hidden rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <img
              src={url}
              alt="Mídia"
              className="max-h-64 max-w-full rounded-xl object-cover hover:scale-[1.02] transition-transform duration-150 cursor-pointer"
            />
          </button>
        ) : (
          <div className="text-xs italic opacity-75">Foto anexada</div>
        )}
      </div>
    );
  }

  // Vídeo
  if (type === "video" || (url && /\.(mp4|mov|webm)($|\?)/i.test(url))) {
    return (
      <div className="my-1.5">
        {url ? (
          <video
            controls
            src={url}
            className="max-h-64 max-w-full rounded-xl object-contain bg-black/40"
          />
        ) : (
          <div className="text-xs italic opacity-75">Vídeo recebido</div>
        )}
      </div>
    );
  }

  // Localização
  if (type === "location" || meta?.latitude != null) {
    const lat = meta?.latitude;
    const lng = meta?.longitude;
    const address = meta?.address || meta?.name || "Localização compartilhada";
    const mapsUrl =
      lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;

    return (
      <div
        className={`my-1.5 rounded-xl p-3 border ${
          outgoing
            ? "bg-white/10 border-white/20 text-white"
            : "bg-muted/50 border-border text-foreground"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-500/20 text-red-500">
            <MapPin className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block text-xs font-semibold truncate">{address}</strong>
            {lat != null && lng != null && (
              <span className="block text-[11px] opacity-75">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 inline-flex items-center gap-1 text-xs font-bold underline ${
                  outgoing ? "text-white" : "text-primary"
                }`}
              >
                Abrir no Google Maps <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Documento / Arquivo Genérico
  if (type === "document" || url) {
    const fileName = meta?.fileName || "Documento anexado";
    return (
      <div
        className={`my-1.5 flex items-center justify-between gap-3 rounded-xl p-2.5 border ${
          outgoing
            ? "bg-white/10 border-white/20 text-white"
            : "bg-muted/50 border-border text-foreground"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="size-5 shrink-0 opacity-80" />
          <div className="min-w-0">
            <span className="block text-xs font-medium truncate max-w-[200px]">
              {fileName}
            </span>
            <span className="block text-[10px] opacity-70 uppercase tracking-wider">
              {meta?.mimeType?.split("/")[1] || "Arquivo"}
            </span>
          </div>
        </div>
        {url && (
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-8 rounded-lg shrink-0 hover:bg-black/10"
          >
            <a href={url} download={fileName} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  return null;
}

function DeliveryStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "read":
      return (
        <span title="Lida" className="inline-flex">
          <CheckCheck className="size-3 text-sky-300 fill-sky-300" />
        </span>
      );
    case "delivered":
      return (
        <span title="Entregue" className="inline-flex">
          <CheckCheck className="size-3 text-white/80" />
        </span>
      );
    case "sent":
      return (
        <span title="Enviada" className="inline-flex">
          <Check className="size-3 text-white/70" />
        </span>
      );
    case "pending":
    case "queued":
    default:
      return (
        <span title="Pendente" className="inline-flex">
          <Clock3 className="size-3 text-white/60" />
        </span>
      );
  }
}
