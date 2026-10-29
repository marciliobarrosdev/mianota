// Regras puras da "Visão do mês" (comparativo, alertas, dicas, saudação).
import { addDays, daysBetween, toIsoDate } from "./finance-period";

export function previousPeriod(p: { from: string; to: string }): { from: string; to: string } {
  const f = new Date(`${p.from}T12:00:00Z`);
  const t = new Date(`${p.to}T12:00:00Z`);
  const lastDay = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  // Mês cheio → mês anterior cheio
  if (f.getUTCDate() === 1 && t.getUTCDate() === lastDay && f.getUTCMonth() === t.getUTCMonth()) {
    const y = f.getUTCFullYear();
    const m = f.getUTCMonth();
    return {
      from: toIsoDate(new Date(y, m - 1, 1)),
      to: toIsoDate(new Date(y, m, 0)),
    };
  }
  const len = daysBetween(p.from, p.to) + 1;
  return { from: addDays(p.from, -len), to: addDays(p.from, -1) };
}

/** Variação percentual arredondada; null quando não há base de comparação. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function greeting(hour: number): string {
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

type Upcoming = { id: string; description: string; type: string; amountCents: number; dueDate: string; status: string };
type Budget = { id: string; name: string; limitCents: number; spentCents: number; percentage: number };

export type OverviewAlert = {
  key: string;
  tone: "rose" | "amber";
  title: string;
  target: "planner" | "transactions" | "settings";
};

export function buildOverviewAlerts(input: {
  upcoming: Upcoming[];
  budgets: Budget[];
  leftoverCents: number;
  today: string;
  money: (c: number) => string;
}): OverviewAlert[] {
  const out: OverviewAlert[] = [];
  const overdue = input.upcoming.filter(
    (u) => u.type === "despesa" && u.status !== "pago" && (u.status === "atrasado" || u.dueDate < input.today),
  );
  if (overdue.length) {
    const total = overdue.reduce((s, u) => s + u.amountCents, 0);
    out.push({
      key: "overdue",
      tone: "rose",
      title: `${overdue.length} conta${overdue.length > 1 ? "s" : ""} atrasada${overdue.length > 1 ? "s" : ""} · ${input.money(total)}`,
      target: "planner",
    });
  }
  const tomorrow = addDays(input.today, 1);
  const soon = input.upcoming.filter(
    (u) => u.type === "despesa" && u.status !== "pago" && (u.dueDate === input.today || u.dueDate === tomorrow),
  );
  if (soon.length) {
    out.push({
      key: "soon",
      tone: "amber",
      title: `${soon.length} conta${soon.length > 1 ? "s vencem" : " vence"} hoje ou amanhã`,
      target: "planner",
    });
  }
  for (const b of input.budgets) {
    if (b.limitCents > 0 && b.spentCents > b.limitCents) {
      out.push({
        key: `budget-${b.id}`,
        tone: "rose",
        title: `Orçamento de ${b.name} estourado em ${input.money(b.spentCents - b.limitCents)}`,
        target: "transactions",
      });
    }
  }
  if (input.leftoverCents < 0) {
    out.push({
      key: "leftover",
      tone: "amber",
      title: `Pelo planejado, faltarão ${input.money(-input.leftoverCents)} no período`,
      target: "planner",
    });
  }
  return out;
}

export type OverviewInsight = { title: string; body: string; question: string };

export function buildOverviewInsights(input: {
  categories: Array<{ id: string; name: string; amountCents: number }>;
  previousCategories?: Array<{ id: string; name: string; amountCents: number }>;
  latest: Array<{ description: string; type: string; amountCents: number }>;
  upcoming: Upcoming[];
  today: string;
  money: (c: number) => string;
}): OverviewInsight[] {
  const out: OverviewInsight[] = [];
  const top = input.categories[0];
  if (top) {
    out.push({
      title: `Maior gasto: ${top.name}`,
      body: `${input.money(top.amountCents)} no período.`,
      question: `Como posso gastar menos com ${top.name}?`,
    });
  }
  if (input.previousCategories?.length) {
    const prev = new Map(input.previousCategories.map((c) => [c.id, c.amountCents]));
    let best: { name: string; diff: number } | null = null;
    for (const c of input.categories) {
      const diff = c.amountCents - (prev.get(c.id) || 0);
      if (diff > 0 && (!best || diff > best.diff)) best = { name: c.name, diff };
    }
    if (best) {
      out.push({
        title: `${best.name} subiu`,
        body: `+${input.money(best.diff)} em relação ao período anterior.`,
        question: `Por que meus gastos com ${best.name} aumentaram?`,
      });
    }
  }
  const tomorrow = addDays(input.today, 1);
  const next = input.upcoming.find((u) => u.type === "despesa" && u.status !== "pago" && u.dueDate >= input.today && u.dueDate <= tomorrow);
  if (next) {
    out.push({
      title: `${next.description} vence ${next.dueDate === input.today ? "hoje" : "amanhã"}`,
      body: `${input.money(next.amountCents)} a pagar.`,
      question: `Tenho saldo para pagar ${next.description}?`,
    });
  }
  return out.slice(0, 3);
}
