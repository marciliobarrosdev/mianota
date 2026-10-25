// Regras puras (sem banco nem rede) do canal central e do onboarding pós-compra.
// Testadas em tests/purchase-onboarding.test.ts.

import { normalizeBrazilianPhoneToE164 } from "./phone";

export type CentralProvider = "evolution" | "meta";

export type OnboardingStatus =
  | "awaiting_account"
  | "awaiting_phone"
  | "awaiting_channel"
  | "awaiting_template"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "paired"
  | "conflict"
  | "cancelled";

export const ACTIVATION_TTL_HOURS = 48;
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TOKEN_PREFIX = "mo1:";

export const SUGGESTED_EVOLUTION_PURCHASE_MESSAGE = [
  "Olá, {{nome}}! Sua compra da {{produto}} foi aprovada. ✅",
  "",
  "Sua assessora financeira já está pronta para te ajudar por aqui. Para confirmar que este WhatsApp é seu, responda exatamente:",
  "",
  "COMEÇAR {{codigo}}",
  "",
  "O código vale por {{validade_horas}} horas e só pode ser usado uma vez.",
].join("\n");

export const SUGGESTED_META_TEMPLATE_BODY =
  "Olá, {{1}}! Sua compra foi aprovada e sua assessora financeira já está pronta para te ajudar por aqui. Para confirmar que este WhatsApp é seu, toque em Começar ou responda: COMEÇAR {{2}}. O código vale por 48 horas.";

/** Eventos do canal inativo nunca geram resposta nem vínculo. */
export function shouldProcessInbound(
  activeProvider: string | null | undefined,
  provider: CentralProvider,
) {
  return activeProvider === provider;
}

export type CentralChannelSnapshot =
  | {
      active_provider?: string | null;
      provider?: string | null;
      status?: string | null;
      instance_name?: string | null;
    }
  | null
  | undefined;

/**
 * O canal ativo está pronto para enviar somente quando o registro compartilhado
 * descreve ESSE provedor (provider = active_provider) e está conectado. Se a
 * configuração do outro canal sobrescreveu provider/status, o envio aguarda.
 */
export function isActiveChannelConnected(channel: CentralChannelSnapshot): boolean {
  const active = channel?.active_provider;
  if (active !== "evolution" && active !== "meta") return false;
  if (channel?.provider !== active || channel?.status !== "connected") return false;
  if (active === "evolution" && !String(channel?.instance_name ?? "").trim()) return false;
  return true;
}

/** Telefone de quem respondeu, normalizado igual ao telefone do comprador. */
export function respondingPhoneE164(value: string): string {
  return normalizeBuyerPhone(value) ?? `+${String(value || "").replace(/\D/g, "")}`;
}

/** Código/token/botão só valem para o telefone exato que recebeu a confirmação. */
export function activationPhoneMatches(
  buyerPhoneE164: string | null | undefined,
  respondingE164: string | null | undefined,
): boolean {
  const expected = normalizeBuyerPhone(buyerPhoneE164);
  return Boolean(expected) && expected === respondingE164;
}

export function normalizeBuyerName(value: unknown): string | null {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!text || /@/.test(text)) return null;
  return text
    .toLowerCase()
    .split(" ")
    .map((part) =>
      ["da", "de", "do", "das", "dos", "e"].includes(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

export function firstName(name: string | null | undefined) {
  return (name || "").split(" ")[0] || "";
}

/** Telefone do comprador em E.164 (apenas Brasil, igual ao restante do app). */
export function normalizeBuyerPhone(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return normalizeBrazilianPhoneToE164(raw);
}

export function maskPhone(e164: string | null | undefined) {
  const d = String(e164 || "").replace(/\D/g, "");
  if (d.length < 6) return d ? "••••" : "";
  return `+${d.slice(0, 4)}•••••${d.slice(-2)}`;
}

export function generateActivationCode(random: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[random[i] % CODE_ALPHABET.length];
  return out;
}

export function generateActivationToken(random: Uint8Array): string {
  let s = "";
  for (const b of random) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type ActivationReply =
  | { kind: "code"; code: string }
  | { kind: "token"; token: string }
  | { kind: "bare_start" }
  | null;

/** Interpreta "COMEÇAR K7P2QX", o payload do botão Meta ou um "Começar" sem código. */
export function parseActivationReply(
  message: string,
  buttonPayload?: string | null,
): ActivationReply {
  const payload = String(buttonPayload || "").trim();
  if (payload.startsWith(TOKEN_PREFIX) && payload.length > TOKEN_PREFIX.length + 16) {
    return { kind: "token", token: payload.slice(TOKEN_PREFIX.length) };
  }
  const normalized = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = normalized.match(/^COMECAR ([A-Z0-9]{6})$/);
  if (match) {
    const code = match[1];
    if ([...code].every((ch) => CODE_ALPHABET.includes(ch))) return { kind: "code", code };
    return null;
  }
  if (normalized === "COMECAR") return { kind: "bare_start" };
  return null;
}

export type OnboardingDecisionInput = {
  hasCompany: boolean;
  phone: string | null;
  activeProvider: CentralProvider | null;
  channelConnected: boolean;
  metaTemplateName: string | null;
  metaTemplateApproved: boolean;
  existingIdentityCompanyId: string | null;
  companyId: string | null;
};

export type OnboardingDecision =
  | { action: "wait"; status: OnboardingStatus; detail: string }
  | { action: "conflict"; detail: string }
  | { action: "renewal"; provider: CentralProvider }
  | { action: "send"; provider: CentralProvider; mode: "text" | "template" };

export function decideOnboarding(input: OnboardingDecisionInput): OnboardingDecision {
  if (!input.hasCompany)
    return {
      action: "wait",
      status: "awaiting_account",
      detail: "Compra sem conta correspondente; crie ou vincule o assinante.",
    };
  if (!input.phone)
    return {
      action: "wait",
      status: "awaiting_phone",
      detail: "O pagamento não trouxe telefone. Informe o WhatsApp do assinante.",
    };
  if (!input.activeProvider || !input.channelConnected)
    return {
      action: "wait",
      status: "awaiting_channel",
      detail: "Nenhum canal central ativo e conectado.",
    };
  if (input.existingIdentityCompanyId && input.existingIdentityCompanyId !== input.companyId)
    return {
      action: "conflict",
      detail: "Este telefone já está ativo em outra assinatura.",
    };
  if (input.existingIdentityCompanyId && input.existingIdentityCompanyId === input.companyId)
    return { action: "renewal", provider: input.activeProvider };
  if (input.activeProvider === "meta" && (!input.metaTemplateName || !input.metaTemplateApproved))
    return {
      action: "wait",
      status: "awaiting_template",
      detail: input.metaTemplateName
        ? "Template configurado ainda não está aprovado pela Meta."
        : "Configure o template de compra aprovada da Meta.",
    };
  return {
    action: "send",
    provider: input.activeProvider,
    mode: input.activeProvider === "meta" ? "template" : "text",
  };
}

export function buildEvolutionActivationText(input: {
  name: string | null;
  product: string;
  code: string;
  template?: string | null;
}) {
  const candidate = String(input.template || "").trim();
  // O código é o vínculo seguro entre compra, telefone e dashboard. Uma
  // configuração antiga ou inválida nunca pode remover essa etapa do envio.
  const template = /\{\{codigo\}\}/i.test(candidate)
    ? candidate
    : SUGGESTED_EVOLUTION_PURCHASE_MESSAGE;
  const values: Record<string, string> = {
    nome: firstName(input.name) || "cliente",
    produto: input.product,
    codigo: input.code,
    validade_horas: String(ACTIVATION_TTL_HOURS),
  };
  return template.replace(
    /\{\{(nome|produto|codigo|validade_horas)\}\}/gi,
    (_match, key) => values[String(key).toLowerCase()] ?? "",
  );
}

export function buildRenewalText(input: { name: string | null; product: string }) {
  const hello = firstName(input.name) ? `Olá, ${firstName(input.name)}!` : "Olá!";
  return `${hello} Seu pagamento da ${input.product} foi confirmado e sua assinatura continua ativa. Seu WhatsApp segue vinculado — é só continuar mandando seus gastos e dúvidas por aqui.`;
}

export const FIRST_USEFUL_QUESTION =
  'Pronto, seu WhatsApp está vinculado à sua conta! 🎉\n\nPara começar: qual é a sua renda mensal aproximada? Pode responder do seu jeito, por exemplo "recebo 4.500 por mês". Depois você também pode me mandar gastos como "almoço 32 no pix".';

export function buildMetaTemplatePayload(input: {
  to: string;
  name: string;
  language: string;
  buyerName: string | null;
  code: string;
  token: string;
  hasButton: boolean;
}) {
  const components: any[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: firstName(input.buyerName) || "cliente" },
        { type: "text", text: input.code },
      ],
    },
  ];
  if (input.hasButton) {
    components.push({
      type: "button",
      sub_type: "quick_reply",
      index: "0",
      parameters: [{ type: "payload", payload: `${TOKEN_PREFIX}${input.token}` }],
    });
  }
  return {
    messaging_product: "whatsapp",
    to: input.to.replace(/\D/g, ""),
    type: "template",
    template: { name: input.name, language: { code: input.language }, components },
  };
}

const DELIVERY_RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 };

/** Mescla status de entrega sem regredir; estados finais/de vínculo são preservados. */
export function mergeDeliveryStatus(current: string, incoming: string): string {
  if (["paired", "cancelled", "conflict"].includes(current)) return current;
  if (incoming === "failed") return ["delivered", "read"].includes(current) ? current : "failed";
  const inc = DELIVERY_RANK[incoming];
  if (!inc) return current;
  const cur = DELIVERY_RANK[current] ?? 0;
  return inc > cur ? incoming : current;
}

export function mapEvolutionAck(value: unknown): "sent" | "delivered" | "read" | "failed" | null {
  const s = String(value ?? "").toUpperCase();
  if (s === "ERROR" || s === "0") return "failed";
  if (s === "SERVER_ACK" || s === "PENDING" || s === "1") return "sent";
  if (s === "DELIVERY_ACK" || s === "2") return "delivered";
  if (s === "READ" || s === "PLAYED" || s === "3" || s === "4") return "read";
  return null;
}

/** Remove qualquer sequência que pareça token/código antes de gravar erro ou log. */
export function redactSecrets(text: string) {
  return String(text || "")
    .replace(/mo1:[A-Za-z0-9_-]+/g, "mo1:[oculto]")
    .replace(/COME[CÇ]AR\s+[A-Z0-9]{6}/gi, "COMEÇAR [oculto]")
    .replace(/(Bearer|token|key)[=: ]+[A-Za-z0-9._-]{8,}/gi, "$1 [oculto]")
    .slice(0, 400);
}
