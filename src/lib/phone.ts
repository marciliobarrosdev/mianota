import { maskPhone } from "./masks";

/**
 * Normaliza um telefone brasileiro para E.164.
 *
 * Aceita números nacionais com DDD (10 ou 11 dígitos) e números já
 * informados com o DDI 55. Retorna null para entradas incompletas ou que não
 * sejam brasileiras, evitando persistir um valor que apenas parece válido.
 */
export function normalizeBrazilianPhoneToE164(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return null;
}

export function brazilianPhoneDigits(value?: string | null): string | null {
  const normalized = value ? normalizeBrazilianPhoneToE164(value) : null;
  return normalized ? normalized.slice(1) : null;
}

export function formatBrazilianPhone(value?: string | null): string {
  if (!value) return "Sem WhatsApp";
  const normalized = normalizeBrazilianPhoneToE164(value);
  if (!normalized) return value;

  const local = normalized.slice(3);
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
}

// ---------------------------------------------------------------------------
// Campos de telefone/WhatsApp de pessoas (não usar em IDs técnicos da Meta,
// Evolution ou Stripe).
// ---------------------------------------------------------------------------

/** Dígitos nacionais (DDD + número), removendo +55/0055 quando presentes. */
function nationalDigits(value: string): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return digits;
}

/** Máscara durante a digitação: (11) 98765-4321 ou (11) 3456-7890. */
export function maskBrazilianPhoneInput(value: string | null | undefined): string {
  return maskPhone(nationalDigits(String(value ?? "")));
}

/**
 * Telefone brasileiro completo: DDD válido (sem zero) + 8 dígitos, ou
 * + 9 dígitos começando por 9 (celular).
 */
export function isValidBrazilianPhone(value: string | null | undefined): boolean {
  const digits = nationalDigits(String(value ?? ""));
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (!/^[1-9]{2}/.test(digits)) return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  return true;
}

/** Normaliza para +55… somente quando o número passa na validação acima. */
export function normalizeValidBrazilianPhone(value: string | null | undefined): string | null {
  if (!isValidBrazilianPhone(value)) return null;
  return `+55${nationalDigits(String(value ?? ""))}`;
}

/** Mensagem em português simples, ou null quando o telefone está ok. */
export function brazilianPhoneError(
  value: string | null | undefined,
  { required = true }: { required?: boolean } = {},
): string | null {
  const digits = nationalDigits(String(value ?? ""));
  if (!digits) return required ? "Informe o telefone com DDD." : null;
  if (!isValidBrazilianPhone(value))
    return "Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.";
  return null;
}

/** Props padrão de um campo de telefone. */
export const PHONE_INPUT_PROPS = {
  type: "tel",
  inputMode: "tel",
  autoComplete: "tel-national",
  placeholder: "(11) 98765-4321",
  maxLength: 15,
} as const;
