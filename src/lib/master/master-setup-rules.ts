// Regras puras do checklist "Comece aqui" do Master (sem banco, sem React).

export type SetupGroup = "vender" | "atender" | "avisar" | "operar";
export type SetupStatus = "ready" | "missing" | "attention";

export const SETUP_GROUPS: { id: SetupGroup; title: string; description: string }[] = [
  { id: "vender", title: "Vender", description: "Planos, preços e pagamento funcionando." },
  { id: "atender", title: "Atender", description: "WhatsApp e MIA respondendo os assinantes." },
  { id: "avisar", title: "Avisar", description: "Notificações, avisos automáticos e relatórios." },
  { id: "operar", title: "Operar", description: "Acesso, assinantes e pedidos pendentes." },
];

/** Status de um item: pronto, falta (obrigatório) ou atenção (opcional pendente). */
export function setupStatus(ready: boolean, optional: boolean): SetupStatus {
  if (ready) return "ready";
  return optional ? "attention" : "missing";
}

type Countable = { group: SetupGroup; ready: boolean; optional: boolean };

/** Progresso considera só itens obrigatórios; opcionais não travam o lançamento. */
export function setupProgress(checks: Countable[]) {
  const required = checks.filter((c) => !c.optional);
  const completed = required.filter((c) => c.ready).length;
  const total = required.length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 100,
    readyToLaunch: completed === total,
    pending: total - completed,
  };
}

export function groupSetupChecks<T extends Countable>(checks: T[]) {
  return SETUP_GROUPS.map((group) => {
    const items = checks.filter((c) => c.group === group.id);
    return { ...group, items, ...setupProgress(items) };
  }).filter((g) => g.items.length > 0);
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias" ou null quando nunca aconteceu. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d === 1 ? "" : "s"}`;
}

/** Avisos automáticos estão "rodando" quando houve geração nas últimas 48 h. */
export function isRecent(iso: string | null | undefined, hours: number, now: Date = new Date()) {
  if (!iso) return false;
  return now.getTime() - new Date(iso).getTime() <= hours * 3600_000;
}
