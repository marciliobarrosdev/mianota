// Pure CRM pipeline rules for /master/leads (no DB, fully testable).
export const LEAD_STAGES = [
  { id: "novo", label: "Novos Leads", color: "var(--chart-1)" },
  { id: "contato", label: "Em Contato", color: "var(--chart-2)" },
  { id: "experimental", label: "Em Plano Grátis / Experimental", color: "var(--chart-3)" },
  { id: "migracao", label: "Em Migração", color: "var(--chart-4)" },
  { id: "convertido", label: "Convertido", color: "var(--success, var(--chart-2))" },
  { id: "perdido", label: "Perdidos", color: "var(--destructive)" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["id"];
export type LeadTemp = "frio" | "morno" | "quente";
export const LOST_REASONS = ["Sem interesse", "Não respondeu", "Preço", "Outro"] as const;

export function isLeadStage(v: unknown): v is LeadStage {
  return LEAD_STAGES.some((s) => s.id === v);
}

export interface LeadLike {
  id: string;
  stage: LeadStage;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  origem?: string | null;
  temperatura?: LeadTemp;
  tags?: string[];
  valor_cents?: number;
  created_at: string;
  trial_ate?: string | null;
  creditos_saldo?: number | null;
  open_tasks_overdue?: number;
}

/** Position placed between neighbours for drag & drop ordering. */
export function positionBetween(before: number | null, after: number | null): number {
  if (before == null && after == null) return 1000;
  if (before == null) return (after as number) - 1000;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}

/** Days left in free trial (negative = expired). null when unknown. */
export function trialDaysLeft(trialAte: string | null | undefined, now = new Date()): number | null {
  if (!trialAte) return null;
  const t = new Date(trialAte).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / 86_400_000);
}

/** Free lead whose trial ended (or credits ran out) at least 7 days ago without payment → Perdidos. */
export function shouldAutoLose(lead: LeadLike, now = new Date()): boolean {
  if (lead.stage === "convertido" || lead.stage === "perdido") return false;
  const left = trialDaysLeft(lead.trial_ate, now);
  return left !== null && left <= -7;
}

export function daysInStage(stageChangedAt: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(stageChangedAt).getTime()) / 86_400_000));
}

export function filterLeads<T extends LeadLike>(
  leads: T[],
  f: { q?: string; tag?: string; origem?: string; temperatura?: string; from?: string; to?: string },
): T[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return leads.filter((l) => {
    if (q && ![l.nome, l.email, l.telefone, l.empresa].some((v) => (v ?? "").toLowerCase().includes(q))) return false;
    if (f.tag && !(l.tags ?? []).includes(f.tag)) return false;
    if (f.origem && l.origem !== f.origem) return false;
    if (f.temperatura && l.temperatura !== f.temperatura) return false;
    const d = l.created_at.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    return true;
  });
}

export function pipelineMetrics(leads: LeadLike[], now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  const converted = leads.filter((l) => l.stage === "convertido");
  const closed = converted.length + leads.filter((l) => l.stage === "perdido").length;
  return {
    total: leads.length,
    newThisMonth: leads.filter((l) => l.created_at.slice(0, 7) === month).length,
    conversionRate: closed ? Math.round((converted.length / closed) * 1000) / 10 : 0,
    expiringSoon: leads.filter((l) => {
      if (l.stage === "convertido" || l.stage === "perdido") return false;
      const d = trialDaysLeft(l.trial_ate, now);
      return d !== null && d >= 0 && d <= 2;
    }).length,
    overdueTasks: leads.reduce((s, l) => s + (l.open_tasks_overdue ?? 0), 0),
    convertedCents: converted.reduce((s, l) => s + (l.valor_cents ?? 0), 0),
  };
}

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function leadsCsv(leads: LeadLike[]): string {
  const label = (id: string) => LEAD_STAGES.find((s) => s.id === id)?.label ?? id;
  const head = ["Nome", "E-mail", "WhatsApp", "Empresa", "Etapa", "Origem", "Temperatura", "Etiquetas", "Valor (R$)", "Criado em"];
  const rows = leads.map((l) => [
    l.nome, l.email, l.telefone, l.empresa, label(l.stage), l.origem, l.temperatura,
    (l.tags ?? []).join("|"), ((l.valor_cents ?? 0) / 100).toFixed(2).replace(".", ","), l.created_at.slice(0, 10),
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
}

export function whatsappLink(phone: string | null | undefined, name: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = `Olá ${name.split(" ")[0]}! Aqui é da equipe MIAnota. Como está sendo sua experiência com a MIA?`;
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}
