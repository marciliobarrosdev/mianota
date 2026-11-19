/**
 * Paginação "Carregar mais" sem teto escondido.
 *
 * As listas crescem por janela (20 → 40 → 60…): o servidor sempre devolve as N
 * primeiras linhas e o total real. Assim "Atualizar", polling e ações recarregam
 * exatamente o que está na tela. O banco entrega no máximo 1000 linhas por
 * pedido, então janelas maiores são buscadas em blocos — nunca cortadas.
 */

/** Maior bloco que o banco devolve em um único pedido. */
export const DB_CHUNK = 1000;

/** Normaliza o tamanho da janela pedido pelo navegador. */
export function clampWindow(value: unknown, fallback: number, max = 10_000): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/** Faixas [from, to] (inclusivas) para buscar `limit` linhas em blocos. */
export function windowChunks(limit: number, chunk = DB_CHUNK): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (let from = 0; from < limit; from += chunk) {
    out.push({ from, to: Math.min(from + chunk, limit) - 1 });
  }
  return out;
}

/** Ainda existem linhas no servidor além das que estão na tela. */
export function hasMore(loaded: number, total: number): boolean {
  return loaded < total;
}

/** Próxima janela ao clicar em "Carregar mais" (não passa do total). */
export function nextWindow(current: number, step: number, total: number): number {
  return Math.max(current, Math.min(current + step, Math.max(total, current)));
}

type RangeResult<T> = { rows: T[]; count: number | null };

/**
 * Busca as primeiras `limit` linhas em blocos de até 1000.
 * `fetchRange` deve montar uma consulta nova a cada chamada (com count exato).
 */
export async function fetchWindow<T>(
  limit: number,
  fetchRange: (from: number, to: number) => PromiseLike<RangeResult<T>>,
  chunk = DB_CHUNK,
): Promise<{ rows: T[]; total: number }> {
  const rows: T[] = [];
  let total: number | null = null;
  for (const { from, to } of windowChunks(limit, chunk)) {
    const page = await fetchRange(from, to);
    if (total === null) total = page.count;
    rows.push(...page.rows);
    if (page.rows.length < to - from + 1) break;
  }
  return { rows, total: total ?? rows.length };
}

/** Busca todas as linhas, bloco a bloco, até a última página incompleta. */
export async function fetchAll<T>(
  fetchRange: (from: number, to: number) => PromiseLike<T[]>,
  chunk = DB_CHUNK,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += chunk) {
    const page = await fetchRange(from, from + chunk - 1);
    rows.push(...page);
    if (page.length < chunk) return rows;
  }
}

/** Divide uma lista (ex.: ids para `.in()`) para não gerar endereços gigantes. */
export function chunkList<T>(list: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * Texto de busca seguro para filtros `or(...)` do banco: remove vírgulas,
 * parênteses, aspas, curingas e barras, que mudariam o sentido do filtro.
 */
export function safeSearchTerm(q: unknown, max = 80): string {
  return String(q ?? "")
    .replace(/[,()*%"'\\:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
