// Regras puras do perfil da MIA (página "Personalidade e regras").
// Salvo em company.finance_profile; lido pelo chat do app, WhatsApp e avisos.

export type AssistantStyle = "direta" | "didatica" | "motivadora";
export type PrimaryGoal = "control" | "save" | "debt" | "plan";
export type CategoryRule = { keyword: string; categoryId: string };

export type AssistantProfile = {
  preferred_name: string;
  primary_goal: PrimaryGoal;
  assistant_style: AssistantStyle;
  response_length: "curta" | "detalhada";
  use_emojis: boolean;
  alert_budget_percent: number;
  large_expense_cents: number; // 0 = desligado
  ask_before_save: true;
  weekly_summary: boolean;
  proactive_insights: boolean;
  custom_rules: string[];
  category_rules: CategoryRule[];
};

export const MAX_CUSTOM_RULES = 10;
export const MAX_CATEGORY_RULES = 20;

export const GOAL_LABEL: Record<PrimaryGoal, string> = {
  control: "Controlar gastos",
  save: "Economizar",
  debt: "Sair das dívidas",
  plan: "Realizar planos",
};

export const DEFAULT_ASSISTANT_PROFILE: AssistantProfile = {
  preferred_name: "",
  primary_goal: "control",
  assistant_style: "direta",
  response_length: "curta",
  use_emojis: true,
  alert_budget_percent: 80,
  large_expense_cents: 0,
  ask_before_save: true,
  weekly_summary: true,
  proactive_insights: true,
  custom_rules: [],
  category_rules: [],
};

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Normaliza qualquer JSON salvo em um perfil válido (preserva campos desconhecidos fora daqui). */
export function normalizeAssistantProfile(raw: unknown): AssistantProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const d = DEFAULT_ASSISTANT_PROFILE;
  const pct = clampInt(r.alert_budget_percent, 50, 100, d.alert_budget_percent);
  const rules = Array.isArray(r.custom_rules)
    ? r.custom_rules
        .map((s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, MAX_CUSTOM_RULES)
    : [];
  const seen = new Set<string>();
  const cats: CategoryRule[] = [];
  for (const c of Array.isArray(r.category_rules) ? r.category_rules : []) {
    const keyword = String(c?.keyword ?? "").trim().toLowerCase().slice(0, 60);
    const categoryId = String(c?.categoryId ?? "").trim();
    if (!keyword || !/^[0-9a-f-]{36}$/i.test(categoryId) || seen.has(keyword)) continue;
    seen.add(keyword);
    cats.push({ keyword, categoryId });
    if (cats.length >= MAX_CATEGORY_RULES) break;
  }
  return {
    preferred_name: String(r.preferred_name ?? "").trim().slice(0, 80),
    primary_goal: (["control", "save", "debt", "plan"].includes(r.primary_goal) ? r.primary_goal : d.primary_goal) as PrimaryGoal,
    assistant_style: (["direta", "didatica", "motivadora"].includes(r.assistant_style) ? r.assistant_style : d.assistant_style) as AssistantStyle,
    response_length: r.response_length === "detalhada" ? "detalhada" : "curta",
    use_emojis: r.use_emojis !== false,
    alert_budget_percent: Math.round(pct / 5) * 5,
    large_expense_cents: clampInt(r.large_expense_cents, 0, 100_000_000, 0),
    ask_before_save: true,
    weekly_summary: r.weekly_summary !== false,
    proactive_insights: r.proactive_insights !== false,
    custom_rules: rules,
    category_rules: cats,
  };
}

/** Percentual de alerta: o do orçamento da categoria vence; senão, o padrão do perfil. */
export function effectiveBudgetAlertPercent(categoryPercent: unknown, profile: Pick<AssistantProfile, "alert_budget_percent">) {
  const n = Number(categoryPercent);
  return Number.isFinite(n) && n > 0 ? n : profile.alert_budget_percent;
}

/** Categoria forçada pelas regras automáticas (palavra contida na mensagem). */
export function matchCategoryRule(message: string, rules: CategoryRule[]): string | null {
  const text = message.toLowerCase();
  for (const r of rules) if (r.keyword && text.includes(r.keyword)) return r.categoryId;
  return null;
}

/** É um gasto grande para avisar? */
export function isLargeExpense(amountCents: number, profile: Pick<AssistantProfile, "large_expense_cents" | "proactive_insights">) {
  return profile.proactive_insights && profile.large_expense_cents > 0 && amountCents >= profile.large_expense_cents;
}

/** Trecho de preferências anexado ao prompt. Nunca substitui as regras de segurança. */
export function assistantProfilePrompt(profile: AssistantProfile, categoryNames: Map<string, string> = new Map()) {
  const lines: string[] = [];
  if (profile.category_rules.length)
    lines.push(
      "Categorias automáticas (use o categoryId indicado quando a palavra aparecer):",
      ...profile.category_rules.map((r) => `- "${r.keyword}" → ${r.categoryId}${categoryNames.get(r.categoryId) ? ` (${categoryNames.get(r.categoryId)})` : ""}`),
    );
  if (profile.custom_rules.length)
    lines.push("Preferências do usuário (siga quando não contrariarem as regras acima):", ...profile.custom_rules.map((r) => `- ${r}`));
  return lines.length ? `\n\nPREFERÊNCIAS DO USUÁRIO:\n${lines.join("\n")}` : "";
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const STYLE_TAIL: Record<AssistantStyle, Record<PrimaryGoal, string>> = {
  direta: { control: "", save: "", debt: "", plan: "" },
  didatica: {
    control: "Registrar tudo ajuda a ver para onde o dinheiro vai.",
    save: "Cada gasto registrado mostra onde dá para economizar.",
    debt: "Saber o que vence primeiro ajuda a evitar juros.",
    plan: "Com os gastos em dia, fica mais fácil calcular quanto guardar para seus planos.",
  },
  motivadora: {
    control: "Mandou bem! Seguimos no controle. 💪",
    save: "Ótimo! Cada passo conta para sua reserva. 💪",
    debt: "Boa! Um passo a mais para sair das dívidas. 💪",
    plan: "Isso aí! Seus planos estão mais perto. 💪",
  },
};

/** Aplica nome, estilo, tamanho e emojis a uma resposta já pronta. */
export function personalizeReply(text: string, profile: AssistantProfile, opts: { tail?: boolean } = {}) {
  let out = text.trim();
  const name = profile.preferred_name.split(" ")[0];
  if (name && !out.toLowerCase().startsWith(name.toLowerCase())) out = `${name}, ${out.charAt(0).toLowerCase()}${out.slice(1)}`;
  const tail = STYLE_TAIL[profile.assistant_style][profile.primary_goal];
  if (opts.tail !== false && tail && (profile.response_length === "detalhada" || profile.assistant_style === "motivadora"))
    out = `${out}\n\n${tail}`;
  if (!profile.use_emojis) out = out.replace(EMOJI, "").replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim();
  return out;
}
