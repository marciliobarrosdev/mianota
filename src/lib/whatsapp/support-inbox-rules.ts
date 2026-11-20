const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Label for a chat day separator: Hoje, Ontem or dd/mm(/yyyy). */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (dayKey(d) === dayKey(now)) return "Hoje";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (dayKey(d) === dayKey(y)) return "Ontem";
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("pt-BR", opts);
}

/** True when this message starts a new day compared with the previous one. */
export function startsNewDay(prev: string | undefined, current: string): boolean {
  return !prev || dayKey(new Date(prev)) !== dayKey(new Date(current));
}

/** Near the bottom of a scroll area (auto-scroll is safe). */
export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, slack = 80) {
  return scrollHeight - scrollTop - clientHeight <= slack;
}

/** Formata o telefone do contato ou exibe "Número indisponível" se apenas LID estiver presente. */
export function formatContactPhone(phone: string | null | undefined, lidJid?: string | null): string {
  if (!phone || phone === "indisponivel") {
    return lidJid ? "Número indisponível" : "Sem número";
  }
  const digits = phone.replace(/\D/g, "");
  const lidDigits = lidJid ? lidJid.split("@")[0].replace(/\D/g, "") : "";
  if (lidDigits && digits === lidDigits) {
    return "Número indisponível";
  }
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return digits ? `+${digits}` : "Número indisponível";
}

/** Resolve o destinatário WhatsApp correto para envio (PN JID, telefone E.164 ou LID JID com sufixo @lid). */
export function resolveConversationRecipient(conv: {
  phone_e164?: string | null;
  lid_jid?: string | null;
  pn_jid?: string | null;
}): string {
  // 1. Se temos pn_jid canônico (ex: 558796316081@s.whatsapp.net), esse é o destinatário preferencial
  if (conv.pn_jid && conv.pn_jid.includes("@")) {
    return conv.pn_jid;
  }

  const phone = conv.phone_e164 ? conv.phone_e164.replace(/\D/g, "") : "";
  const lid = conv.lid_jid ? conv.lid_jid.trim() : "";
  const lidDigits = lid ? lid.split("@")[0].replace(/\D/g, "") : "";

  // Se o phone_e164 coincide com os dígitos do LID, ele NÃO é um telefone, é o próprio LID
  const isPhoneLid = Boolean(lidDigits && phone && phone === lidDigits);

  // 2. Se phone_e164 for válido e não for os dígitos do LID nem "indisponivel"
  if (phone && phone !== "indisponivel" && !isPhoneLid) {
    return phone;
  }

  // 3. Se temos lid_jid, garantir que contenha o sufixo @lid para o whatsmeow rotear para o servidor de LIDs
  if (lid) {
    return lid.includes("@") ? lid : `${lid}@lid`;
  }

  // 4. Se só restou phone que é o LID, adicionar @lid
  if (isPhoneLid && phone) {
    return `${phone}@lid`;
  }

  return phone || "";
}

/** Regras visuais para a situação do atendimento. */
export function getStatusBadge(status: "pending" | "open" | "resolved" | string) {
  switch (status) {
    case "pending":
      return {
        label: "Aguardando",
        color: "amber",
        className: "bg-amber-100 text-amber-900 border-amber-300",
      };
    case "open":
      return {
        label: "Em atendimento",
        color: "blue",
        className: "bg-blue-100 text-blue-900 border-blue-300",
      };
    case "resolved":
      return {
        label: "Resolvida",
        color: "emerald",
        className: "bg-emerald-100 text-emerald-900 border-emerald-300",
      };
    default:
      return {
        label: status || "Pendente",
        color: "gray",
        className: "bg-muted text-muted-foreground",
      };
  }
}

/** Identificação do autor de uma mensagem no histórico. */
export function getMessageAuthor(message: {
  direction: "inbound" | "outbound" | string;
  sender_type?: "subscriber" | "owner" | "system" | string;
  sender_name?: string | null;
  contact_name?: string | null;
}) {
  if (message.direction === "inbound") {
    return {
      type: "subscriber" as const,
      label: message.sender_name || message.contact_name || "Assinante",
      badgeColor: "gray",
    };
  }

  if (message.sender_type === "system") {
    return {
      type: "ai" as const,
      label: "MIA (IA)",
      badgeColor: "violet",
    };
  }

  if (message.sender_name === "Celular vinculado") {
    return {
      type: "linked_phone" as const,
      label: "Celular vinculado",
      badgeColor: "emerald",
    };
  }

  return {
    type: "operator" as const,
    label: message.sender_name || "Atendente",
    badgeColor: "primary",
  };
}

/** Determina se a confirmação de exclusão confere com o contato ou token de segurança. */
export function isDeletionConfirmationValid(
  input: string,
  contact: { name?: string | null; phone?: string | null },
): boolean {
  const trimmed = (input || "").trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed === "excluir" || trimmed === "confirmar") return true;

  const expectedName = (contact.name || "").trim().toLowerCase();
  if (expectedName && trimmed === expectedName) return true;

  const inputDigits = trimmed.replace(/\D/g, "");
  const expectedPhoneDigits = (contact.phone || "").replace(/\D/g, "");
  if (expectedPhoneDigits && inputDigits === expectedPhoneDigits) return true;

  return false;
}

