// Contrato entre a tela de chat da MárcIA e quem executa os pedidos.
// O painel usa o fluxo real (interpretar → perguntar → confirmar → registrar);
// a demonstração usa um roteiro local com o mesmo contrato.

export type ChatAttachment = {
  name: string;
  size: number;
  mimeType: string;
  kind: "image" | "pdf";
  dataUrl: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at?: string;
  attachment?: { name: string; size: number; kind: "image" | "pdf"; previewUrl?: string };
  preview?: Array<{ label: string; value: string }>;
  kind?: "question" | "confirm" | "answer" | "success" | "error";
};

export type ChatPhase = "idle" | "listening" | "understanding" | "executing";

export type ChatPendingTurn = {
  messageId: string;
  mode: "question" | "confirm";
  quickReplies: string[];
};

export type MarciaChatController = {
  messages: ChatMessage[];
  phase: ChatPhase;
  pending: ChatPendingTurn | null;
  historyLoading?: boolean;
  send: (text: string, attachment?: ChatAttachment | null) => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
  setListening: (listening: boolean) => void;
  /** Texto usado quando o navegador não oferece ditado (demonstração). */
  voiceFallback?: string;
};

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_ATTACHMENTS = "image/png,image/jpeg,image/webp,application/pdf";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
