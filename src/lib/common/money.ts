/**
 * Valores monetários em reais (pt-BR).
 *
 * A interface mostra e edita "R$ 49,00"; banco, Stripe e servidores continuam
 * recebendo centavos inteiros (4900). Toda conversão passa por aqui para que
 * R$ 49,00 nunca vire R$ 4.900,00 nem R$ 0,49.
 */

/** Teto padrão: R$ 1.000.000,00 (cabe com folga em colunas integer). */
export const DEFAULT_MAX_CENTS = 100_000_000;

function groupThousands(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 4900 → "49,00" (sem símbolo). */
export function formatCentsPlain(cents: number): string {
  const safe = Math.trunc(Number.isFinite(cents) ? cents : 0);
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  const reais = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, "0");
  return `${sign}${groupThousands(String(reais))},${centavos}`;
}

/** 4900 → "R$ 49,00"; -1050 → "-R$ 10,50". */
export function formatCentsBRL(cents: number): string {
  const plain = formatCentsPlain(cents);
  return plain.startsWith("-") ? `-R$ ${plain.slice(1)}` : `R$ ${plain}`;
}

/**
 * Converte texto digitado em pt-BR para centavos inteiros.
 * Aceita "49", "49,9", "49,90", "R$ 1.234,56", "1234.5" e "-10,00".
 * Retorna null para vazio, letras, mais de duas casas ou formato ambíguo.
 */
export function parseBRLToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input)
    .replace(/R\$/gi, "")
    .replace(/[\s\u00a0]/g, "");
  if (!s) return null;

  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (!s || !/^[\d.,]+$/.test(s)) return null;

  let intPart: string;
  let decPart = "";
  const commaCount = (s.match(/,/g) || []).length;
  if (commaCount > 1) return null;

  if (commaCount === 1) {
    [intPart, decPart] = s.split(",");
    if (intPart.includes(".")) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(intPart)) return null;
      intPart = intPart.replace(/\./g, "");
    }
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // "49.90": ponto seguido de 1–2 dígitos é decimal.
    [intPart, decPart] = s.split(".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    intPart = s.replace(/\./g, "");
  } else if (/^\d+$/.test(s)) {
    intPart = s;
  } else {
    return null;
  }

  if (!/^\d*$/.test(intPart) || !/^\d{0,2}$/.test(decPart)) return null;
  if (!intPart && !decPart) return null;
  if (intPart.length > 13) return null;

  const cents = Number(intPart || "0") * 100 + Number((decPart || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/**
 * Limpa o que a pessoa digita: só números, vírgula/ponto e no máximo duas
 * casas depois da vírgula. Letras e o sinal de menos (quando não permitido)
 * simplesmente não entram.
 */
export function sanitizeMoneyTyping(raw: string, allowNegative = false): string {
  let s = String(raw ?? "").replace(/R\$/gi, "");
  const negative = allowNegative && s.trim().startsWith("-");
  s = s.replace(/[^\d.,]/g, "");
  const comma = s.indexOf(",");
  if (comma >= 0) {
    s =
      s.slice(0, comma + 1) +
      s
        .slice(comma + 1)
        .replace(/[.,]/g, "")
        .slice(0, 2);
  }
  return (negative ? "-" : "") + s;
}

export type MoneyValidationOptions = {
  required?: boolean;
  allowNegative?: boolean;
  allowZero?: boolean;
  maxCents?: number;
};

/** Mensagem em português simples, ou null quando o valor está ok. */
export function moneyError(text: string, options: MoneyValidationOptions = {}): string | null {
  const {
    required = false,
    allowNegative = false,
    allowZero = true,
    maxCents = DEFAULT_MAX_CENTS,
  } = options;
  const trimmed = String(text ?? "")
    .replace(/R\$/gi, "")
    .trim();
  if (!trimmed) return required ? "Informe um valor." : null;
  const cents = parseBRLToCents(trimmed);
  if (cents === null) return "Valor inválido. Use o formato 49,90.";
  if (cents < 0 && !allowNegative) return "O valor não pode ser negativo.";
  if (cents === 0 && !allowZero) return "Informe um valor maior que zero.";
  if (Math.abs(cents) > maxCents) return `O valor máximo é ${formatCentsBRL(maxCents)}.`;
  return null;
}
