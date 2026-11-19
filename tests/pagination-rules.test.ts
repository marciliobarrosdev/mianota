import { describe, expect, it } from "vitest";
import {
  chunkList,
  clampWindow,
  fetchAll,
  fetchWindow,
  hasMore,
  nextWindow,
  safeSearchTerm,
  windowChunks,
} from "@/lib/common/pagination-rules";

const table = Array.from({ length: 2500 }, (_, i) => i);
const range = async (from: number, to: number) => ({
  rows: table.slice(from, to + 1),
  count: table.length,
});

describe("pagination rules", () => {
  it("busca janelas acima de 1000 linhas em blocos, sem cortar", async () => {
    expect(windowChunks(2200)).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
      { from: 2000, to: 2199 },
    ]);
    const r = await fetchWindow(2200, range);
    expect(r.rows).toHaveLength(2200);
    expect(r.total).toBe(2500);
  });

  it("para no fim da tabela e informa o total real", async () => {
    const r = await fetchWindow(5000, range);
    expect(r.rows).toHaveLength(2500);
    expect(r.total).toBe(2500);
    expect(hasMore(r.rows.length, r.total)).toBe(false);
    expect(hasMore(20, 21)).toBe(true);
  });

  it("fetchAll lê todas as linhas, mesmo com mais de 1000", async () => {
    const all = await fetchAll(async (from, to) => table.slice(from, to + 1));
    expect(all).toHaveLength(2500);
  });

  it("Carregar mais soma o passo sem passar do total", () => {
    expect(nextWindow(20, 20, 55)).toBe(40);
    expect(nextWindow(40, 20, 55)).toBe(55);
    expect(clampWindow("abc", 20)).toBe(20);
    expect(clampWindow(50_000, 20)).toBe(10_000);
  });

  it("limpa a busca de caracteres que mudariam o filtro", () => {
    expect(safeSearchTerm("ana,(x)*%")).toBe("ana x");
    expect(chunkList([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
