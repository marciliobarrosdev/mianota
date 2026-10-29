// Regras puras da página Configurações (sem I/O).

const AUDIT_LABELS: Record<string, string> = {
  login: "Entrou na conta",
  logout: "Saiu da conta",
  "password.change": "Senha alterada",
  password_change: "Senha alterada",
  "lancamento.create": "Lançamento criado",
  "lancamento.update": "Lançamento alterado",
  "lancamento.delete": "Lançamento excluído",
  insert: "Registro criado",
  update: "Registro alterado",
  delete: "Registro excluído",
  "lgpd.export": "Dados exportados",
  lgpd_export: "Dados exportados",
  "plan.change": "Plano alterado",
  "subscription.update": "Assinatura atualizada",
};

const RESOURCE_LABELS: Record<string, string> = {
  fin_lancamento: "Lançamento",
  fin_categoria: "Categoria",
  fin_orcamento: "Orçamento",
  fin_meta: "Meta",
  company: "Espaço financeiro",
  profiles: "Perfil",
  subscription: "Assinatura",
};

/** Converte códigos do histórico em linguagem simples. */
export function auditLabel(acao: string | null | undefined, recurso?: string | null): string {
  const a = String(acao || "").trim().toLowerCase();
  const r = String(recurso || "").trim().toLowerCase();
  const direct = AUDIT_LABELS[a] || AUDIT_LABELS[`${r}.${a}`];
  if (direct) {
    if (["insert", "update", "delete"].includes(a) && RESOURCE_LABELS[r]) {
      const verb = a === "insert" ? "criado" : a === "update" ? "alterado" : "excluído";
      return `${RESOURCE_LABELS[r]} ${verb}`;
    }
    return direct;
  }
  if (!a) return "Atividade";
  const txt = a.replace(/[._]+/g, " ");
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function auditGroup(acao: string | null | undefined): "acesso" | "dados" | "conta" {
  const a = String(acao || "").toLowerCase();
  if (a.includes("login") || a.includes("logout") || a.includes("password")) return "acesso";
  if (a.includes("plan") || a.includes("subscription") || a.includes("lgpd")) return "conta";
  return "dados";
}

/** Validade do plano: dias restantes e % consumido de um ciclo de 30 dias. */
export function planValidity(endIso: string | null | undefined, now: Date = new Date(), cycleDays = 30) {
  if (!endIso) return { daysLeft: null as number | null, percentLeft: 0, expired: false };
  const end = new Date(endIso).getTime();
  if (Number.isNaN(end)) return { daysLeft: null as number | null, percentLeft: 0, expired: false };
  const diff = end - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diff / 86400000));
  const percentLeft = Math.max(0, Math.min(100, Math.round((daysLeft / cycleDays) * 100)));
  return { daysLeft, percentLeft, expired: diff <= 0 };
}

/** Força da senha: 0 (fraca) a 4 (forte). */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw || pw.length < 8) return 0;
  let s = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
}

/** Mascara um telefone E.164 mantendo só os 4 últimos dígitos. */
export function maskPhone(e164: string | null | undefined): string {
  const d = String(e164 || "").replace(/\D/g, "");
  if (d.length < 4) return "";
  return `•••• ${d.slice(-4)}`;
}

export const SETTINGS_TABS = ["experiencia", "canais", "conta", "privacidade"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];
export function parseSettingsTab(v: unknown): SettingsTab {
  return (SETTINGS_TABS as readonly string[]).includes(String(v)) ? (v as SettingsTab) : "experiencia";
}
