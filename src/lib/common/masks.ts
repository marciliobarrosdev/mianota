export function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
export function maskCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
export function maskCep(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

// ---------------------------------------------------------------------------
// E-mail e URL — mesmas regras em todos os formulários.
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "  Ana@Email.COM " → "ana@email.com". */
export function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isValidEmail(value: string | null | undefined): boolean {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/** Mensagem em português simples, ou null quando o e-mail está ok. */
export function emailError(
  value: string | null | undefined,
  { required = true }: { required?: boolean } = {},
): string | null {
  const email = normalizeEmail(value);
  if (!email) return required ? "Informe seu e-mail." : null;
  if (!isValidEmail(email)) return "E-mail inválido. Confira se está no formato nome@exemplo.com.";
  return null;
}

/** Endereços humanos editáveis (checkout, servidor): só http(s) completos. */
export function isValidHttpUrl(value: string | null | undefined): boolean {
  const text = String(value ?? "").trim();
  if (!text || /\s/.test(text)) return false;
  try {
    const url = new URL(text);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Props padrão de um campo de e-mail (teclado certo, sem maiúscula automática). */
export const EMAIL_INPUT_PROPS = {
  type: "email",
  inputMode: "email",
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const;
