/** Leitura pura de extratos bancários (OFX e CSV) para importação em Movimentações. */

export type StatementRow = {
  date: string; // YYYY-MM-DD
  description: string;
  amountCents: number; // sempre positivo
  type: "receita" | "despesa";
  fitid: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

function validIso(y: number, m: number, d: number): string | null {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Aceita 31/10/2026, 31-10-26, 2026-10-31 e 20261031 (OFX). */
export function parseStatementDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m && !/^\d{1,4}[/.-]/.test(s)) return validIso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validIso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return validIso(y, +m[2], +m[1]);
  }
  return null;
}

/** "R$ -1.234,56", "1,234.56", "-12.5", "(30,00)" → centavos com sinal. */
export function parseStatementAmount(raw: string): number | null {
  let s = raw.trim().replace(/R\$|\s/g, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) { neg = !neg; s = s.slice(0, -1); }
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, "");
  else if (lastDot >= 0 && /\.\d{3}$/.test(s) && s.split(".").length > 2) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return neg ? -cents : cents;
}

function row(date: string | null, description: string, signed: number | null, fitid: string | null): StatementRow | null {
  if (!date || signed === null || signed === 0) return null;
  return {
    date,
    description: description.replace(/\s+/g, " ").trim().slice(0, 240) || "Lançamento importado",
    amountCents: Math.abs(signed),
    type: signed > 0 ? "receita" : "despesa",
    fitid,
  };
}

export function parseOfx(text: string): StatementRow[] {
  const out: StatementRow[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const tag = (b: string, t: string) => b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() || "";
  for (const b of blocks) {
    const body = b.split(/<\/STMTTRN>/i)[0];
    const r = row(
      parseStatementDate(tag(body, "DTPOSTED")),
      tag(body, "MEMO") || tag(body, "NAME"),
      parseStatementAmount(tag(body, "TRNAMT")),
      tag(body, "FITID") || null,
    );
    if (r) out.push(r);
  }
  return out;
}

function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { cells.push(cur); cur = ""; }
    else cur += c;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function parseCsv(text: string): StatementRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const first = lines[0];
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : (first.includes("\t") ? "\t" : ",");
  const head = splitCsvLine(first, sep).map(norm);
  const find = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  const iDate = find("data", "date");
  const iDesc = find("descri", "historico", "lancamento", "title", "estabelecimento", "memo");
  const iAmount = find("valor", "amount", "quantia");
  const iIn = find("entrada", "credito");
  const iOut = find("saida", "debito");
  if (iDate < 0 || (iAmount < 0 && iIn < 0 && iOut < 0)) return [];
  const out: StatementRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line, sep);
    let signed: number | null = null;
    if (iAmount >= 0 && c[iAmount]) signed = parseStatementAmount(c[iAmount]);
    else {
      const a = iIn >= 0 ? parseStatementAmount(c[iIn] || "") : null;
      const b = iOut >= 0 ? parseStatementAmount(c[iOut] || "") : null;
      if (a) signed = Math.abs(a);
      else if (b) signed = -Math.abs(b);
    }
    const r = row(parseStatementDate(c[iDate] || ""), iDesc >= 0 ? c[iDesc] || "" : "", signed, null);
    if (r) out.push(r);
  }
  return out;
}

export function parseStatement(fileName: string, text: string): StatementRow[] {
  if (/\.ofx$/i.test(fileName) || /<OFX>|<STMTTRN>/i.test(text)) return parseOfx(text);
  return parseCsv(text);
}

/** Chave de repetição: mesma data, mesmo valor/tipo e descrição parecida. */
export function duplicateKey(r: { date: string; amountCents: number; type: string; description: string }) {
  return `${r.date}|${r.type}|${r.amountCents}|${norm(r.description).replace(/[^a-z0-9]/g, "").slice(0, 20)}`;
}

/** Marca quais linhas já existem (por FITID ou pela chave de repetição), inclusive repetidas no próprio arquivo. */
export function markDuplicates(rows: StatementRow[], existing: { date: string; amountCents: number; type: string; description: string; fitid?: string | null }[]) {
  const keys = new Set(existing.map(duplicateKey));
  const fitids = new Set(existing.map((e) => e.fitid).filter(Boolean) as string[]);
  return rows.map((r) => {
    const k = duplicateKey(r);
    const dup = (r.fitid && fitids.has(r.fitid)) || keys.has(k);
    keys.add(k);
    if (r.fitid) fitids.add(r.fitid);
    return { ...r, duplicate: Boolean(dup) };
  });
}

/** Sugere categoria pelas regras que o usuário ensinou à MIA (palavra contida na descrição). */
export function suggestCategory(description: string, rules: { keyword: string; categoryId: string }[]): string | null {
  const d = norm(description);
  return rules.find((r) => r.keyword && d.includes(norm(r.keyword)))?.categoryId || null;
}
