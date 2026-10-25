// Regras de período compartilhadas entre o painel do assinante, a demonstração
// e as funções de servidor. Datas sempre em YYYY-MM-DD (dia civil, sem fuso).

export type FinancePeriodPreset = "this_month" | "last_month" | "last_30" | "custom";

export type FinancePeriod = {
  preset: FinancePeriodPreset;
  from: string;
  to: string;
};

export const FINANCE_PERIOD_LABELS: Record<FinancePeriodPreset, string> = {
  this_month: "Este mês",
  last_month: "Mês passado",
  last_30: "Últimos 30 dias",
  custom: "Personalizado",
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Maior intervalo aceito em "Personalizado" (inclusive). */
export const MAX_PERIOD_DAYS = 366;

export function resolveFinancePeriod(
  preset: FinancePeriodPreset,
  custom?: { from?: string | null; to?: string | null } | null,
  today: Date = new Date(),
): FinancePeriod {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (preset === "last_month") {
    return {
      preset,
      from: toIsoDate(new Date(y, m - 1, 1)),
      to: toIsoDate(new Date(y, m, 0)),
    };
  }
  if (preset === "last_30") {
    const to = toIsoDate(today);
    return { preset, from: addDays(to, -29), to };
  }
  if (preset === "custom" && isIsoDate(custom?.from) && isIsoDate(custom?.to)) {
    let from = custom.from;
    let to = custom.to;
    if (from > to) [from, to] = [to, from];
    if (daysBetween(from, to) + 1 > MAX_PERIOD_DAYS) from = addDays(to, -(MAX_PERIOD_DAYS - 1));
    return { preset, from, to };
  }
  return {
    preset: "this_month",
    from: toIsoDate(new Date(y, m, 1)),
    to: toIsoDate(new Date(y, m + 1, 0)),
  };
}

/** Valida um intervalo vindo do cliente. Retorna null quando inválido. */
export function sanitizeRange(from: unknown, to: unknown): { from: string; to: string } | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  let start = from;
  let end = to;
  if (start > end) [start, end] = [end, start];
  if (daysBetween(start, end) + 1 > MAX_PERIOD_DAYS) start = addDays(end, -(MAX_PERIOD_DAYS - 1));
  return { from: start, to: end };
}

export function isWithin(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

export function formatPeriodLabel(period: { from: string; to: string }) {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(period.from)} – ${fmt(period.to)}`;
}

/** Situação visual de um compromisso/movimentação no calendário. */
export type FinanceDayStatus = "pago" | "recebido" | "previsto" | "vencido";

export function financeDayStatus(
  item: { type: "receita" | "despesa"; status: string; date: string },
  today: string,
): FinanceDayStatus {
  if (item.status === "pago") return item.type === "receita" ? "recebido" : "pago";
  if (item.status === "atrasado" || item.date < today) return "vencido";
  return "previsto";
}

export type FinanceDaySummary = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  pendingCount: number;
  pendingCents: number;
};

/** Resumo do dia: só valores efetivados contam em entrou/saiu; o resto é compromisso pendente. */
export function summarizeFinanceDay(
  items: Array<{ type: "receita" | "despesa"; status: string; amountCents: number }>,
): FinanceDaySummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let pendingCount = 0;
  let pendingCents = 0;
  for (const item of items) {
    if (item.status === "pago") {
      if (item.type === "receita") incomeCents += item.amountCents;
      else expenseCents += item.amountCents;
    } else {
      pendingCount += 1;
      pendingCents += item.type === "receita" ? item.amountCents : -item.amountCents;
    }
  }
  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    pendingCount,
    pendingCents,
  };
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  boleto: "Boleto",
  outro: "Outro",
};

export const SOURCE_LABELS: Record<string, string> = {
  ia: "Chat MárcIA",
  chat: "Chat MárcIA",
  whatsapp: "WhatsApp",
  manual: "Manual",
  foto: "Foto",
  recorrencia: "Recorrência",
  banco: "Importado",
};

export function sourceLabel(source: string | null | undefined, hasAttachment = false) {
  if (hasAttachment && (source === "ia" || source === "whatsapp")) return "Foto";
  return SOURCE_LABELS[String(source || "manual")] || "Manual";
}

export function statusLabel(
  type: "receita" | "despesa",
  status: string,
  date: string,
  today: string,
) {
  const s = financeDayStatus({ type, status, date }, today);
  return s === "pago"
    ? "Pago"
    : s === "recebido"
      ? "Recebido"
      : s === "vencido"
        ? "Vencido"
        : "Previsto";
}
