export type AdminRemovalBlock = "self" | "owner" | "last" | null;

/** Why an e-mail cannot be removed from the super admin list (null = allowed). */
export function adminRemovalBlock(
  email: string,
  list: string[],
  me: string | null,
  owner: string | null,
): AdminRemovalBlock {
  const e = email.toLowerCase();
  if (me && e === me.toLowerCase()) return "self";
  if (owner && e === owner.toLowerCase()) return "owner";
  if (list.length <= 1) return "last";
  return null;
}

export const REMOVAL_BLOCK_LABEL: Record<Exclude<AdminRemovalBlock, null>, string> = {
  self: "Você não pode remover o seu próprio acesso.",
  owner: "O dono da instalação não pode ser removido.",
  last: "É preciso manter pelo menos um administrador.",
};

export function sameEmailList(a: string[], b: string[]) {
  const x = [...a].map((e) => e.toLowerCase()).sort();
  const y = [...b].map((e) => e.toLowerCase()).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export type EventLike = {
  provider: string;
  processed: boolean;
  error: string | null;
  buyer_email: string | null;
  created_at: string;
};
export type EventStatus = "ok" | "ignored" | "error";

/** "evento ignorado" is a processed, harmless event; any other error needs review. */
export function eventStatus(e: Pick<EventLike, "processed" | "error">): EventStatus {
  if (e.error === "evento ignorado") return "ignored";
  if (e.error || !e.processed) return "error";
  return "ok";
}

export function summarizeEvents(events: EventLike[], now = new Date()) {
  const dayAgo = now.getTime() - 24 * 3600 * 1000;
  const today = now.toISOString().slice(0, 10);
  let todayCount = 0,
    ok = 0,
    errors = 0,
    errors24h = 0;
  for (const e of events) {
    const s = eventStatus(e);
    if (e.created_at.slice(0, 10) === today) todayCount++;
    if (s === "error") {
      errors++;
      if (new Date(e.created_at).getTime() >= dayAgo) errors24h++;
    } else ok++;
  }
  return { today: todayCount, ok, errors, errors24h };
}

export function filterEvents<T extends EventLike>(
  events: T[],
  f: { provider?: string; status?: EventStatus | "all"; search?: string },
): T[] {
  const q = (f.search ?? "").trim().toLowerCase();
  return events.filter(
    (e) =>
      (!f.provider || f.provider === "all" || e.provider === f.provider) &&
      (!f.status || f.status === "all" || eventStatus(e) === f.status) &&
      (!q || (e.buyer_email ?? "").toLowerCase().includes(q)),
  );
}

/** Last received date per provider. */
export function lastEventByProvider(events: EventLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of events) if (!out[e.provider] || e.created_at > out[e.provider]) out[e.provider] = e.created_at;
  return out;
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function eventsCsv(events: (EventLike & { event_type: string | null })[]) {
  const label: Record<EventStatus, string> = { ok: "Processado", ignored: "Ignorado", error: "Erro" };
  const rows = events.map((e) =>
    [e.created_at, e.provider, e.event_type, e.buyer_email, label[eventStatus(e)], e.error]
      .map(csvCell)
      .join(";"),
  );
  return ["Data;Plataforma;Evento;Comprador;Status;Detalhe", ...rows].join("\n");
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "admins.update": "Administradores alterados",
  "integration.save": "Chaves de integração salvas",
  "integration.delete": "Chaves de integração removidas",
  "company.suspend": "Assinante suspenso",
  "company.reactivate": "Assinante reativado",
  "billing.reprocess": "Aviso de pagamento reprocessado",
};

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}
