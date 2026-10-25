/* eslint-disable @typescript-eslint/no-explicit-any */
// Banco em memória mínimo, imitando o encadeamento do cliente do backend.
type Row = Record<string, any>;

const UNIQUE: Record<string, string[]> = {
  purchase_onboarding: ["source_event_key", "provider_message_id"],
};

export function createFakeDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  const table = (name: string) => (tables[name] ??= []);

  function query(name: string) {
    const filters: ((r: Row) => boolean)[] = [];
    let op: "select" | "insert" | "update" | "upsert" = "select";
    let payload: any = null;
    let single: "maybe" | "one" | null = null;
    let returning = false;
    let limit = Infinity;
    let upsertOpts: any = {};
    const api: any = {
      select() {
        if (op !== "select") returning = true;
        return api;
      },
      insert(v: any) {
        op = "insert";
        payload = v;
        return api;
      },
      update(v: any) {
        op = "update";
        payload = v;
        return api;
      },
      upsert(v: any, opts: any = {}) {
        op = "upsert";
        payload = v;
        upsertOpts = opts;
        return api;
      },
      eq: (c: string, v: any) => (filters.push((r) => r[c] === v), api),
      neq: (c: string, v: any) => (filters.push((r) => r[c] !== v), api),
      is: (c: string, v: any) => (filters.push((r) => (r[c] ?? null) === v), api),
      gt: (c: string, v: any) => (filters.push((r) => r[c] != null && r[c] > v), api),
      lt: (c: string, v: any) => (filters.push((r) => r[c] != null && r[c] < v), api),
      lte: (c: string, v: any) => (filters.push((r) => r[c] != null && r[c] <= v), api),
      in: (c: string, v: any[]) => (filters.push((r) => v.includes(r[c])), api),
      or: (expr: string) => {
        const parts = expr.split(",").map((p) => p.split("."));
        filters.push((r) =>
          parts.some(([c, o, ...rest]) => {
            const v = rest.join(".");
            if (o === "is") return (r[c] ?? null) === null;
            if (o === "lt") return r[c] != null && r[c] < v;
            return false;
          }),
        );
        return api;
      },
      order: () => api,
      limit: (n: number) => ((limit = n), api),
      maybeSingle: () => ((single = "maybe"), api),
      single: () => ((single = "one"), api),
      then(resolve: any, reject: any) {
        return Promise.resolve(run()).then(resolve, reject);
      },
    };
    function run() {
      const rows = table(name);
      const match = (r: Row) => filters.every((f) => f(r));
      if (op === "insert") {
        const list = Array.isArray(payload) ? payload : [payload];
        const created: Row[] = [];
        for (const item of list) {
          for (const col of UNIQUE[name] ?? []) {
            if (item[col] != null && rows.some((r) => r[col] === item[col]))
              return { data: null, error: { code: "23505", message: "duplicate" } };
          }
          const row = { id: crypto.randomUUID(), attempts: 0, ...item };
          rows.push(row);
          created.push(row);
        }
        return shape(created);
      }
      if (op === "upsert") {
        const keys = String(upsertOpts.onConflict || "id").split(",");
        const existing = rows.find((r) => keys.every((k) => r[k] === payload[k]));
        if (existing) {
          if (!upsertOpts.ignoreDuplicates) Object.assign(existing, payload);
          return shape([existing]);
        }
        const row = { id: crypto.randomUUID(), ...payload };
        rows.push(row);
        return shape([row]);
      }
      if (op === "update") {
        const changed = rows.filter(match);
        for (const r of changed) Object.assign(r, payload);
        return returning || single ? shape(changed) : { data: null, error: null };
      }
      return shape(rows.filter(match).slice(0, limit));
    }
    function shape(list: Row[]) {
      if (single) return { data: list[0] ? { ...list[0] } : null, error: null };
      return { data: list.map((r) => ({ ...r })), error: null };
    }
    return api;
  }
  return { tables, client: { from: query, rpc: async () => ({ data: null, error: null }) } };
}
