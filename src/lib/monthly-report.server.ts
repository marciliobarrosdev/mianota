/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { monthBounds, monthLabel, summarizeMonth, type ReportRow } from "./monthly-report-rules";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Fontes padrão do PDF só aceitam o alfabeto latino; removemos emojis e afins.
const safe = (s: string) => s.replace(/[^\u0020-\u00FF]/g, "").trim();

/** Gera o PDF do mês (AAAA-MM) da conta. Retorna bytes do arquivo. */
export async function buildMonthlyReport(db: any, companyId: string, month: string) {
  const { start, end } = monthBounds(month);
  const [{ data: company }, { data: rows, error }] = await Promise.all([
    db.from("company").select("nome,nome_fantasia").eq("id", companyId).maybeSingle(),
    db
      .from("fin_lancamento")
      .select("tipo,status,valor_cents,descricao,competencia,fin_categoria(nome)")
      .eq("company_id", companyId)
      .gte("competencia", start)
      .lt("competencia", end)
      .order("competencia", { ascending: true })
      .limit(2000),
  ]);
  if (error) throw new Error(error.message);
  const list = (rows || []).map((r: any) => ({ ...r, categoria: r.fin_categoria?.nome ?? null }));
  const sum = summarizeMonth(list as ReportRow[]);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const purple = rgb(0.43, 0.2, 0.86);
  const gray = rgb(0.4, 0.4, 0.45);
  const dark = rgb(0.1, 0.1, 0.15);
  let page = pdf.addPage([595, 842]);
  let y = 842;
  const M = 48;
  const text = (t: string, x: number, size = 10, f = font, color = dark) =>
    page.drawText(safe(t), { x, y, size, font: f, color });
  const right = (t: string, xr: number, size = 10, f = font, color = dark) =>
    page.drawText(safe(t), { x: xr - f.widthOfTextAtSize(safe(t), size), y, size, font: f, color });
  const ensure = (h: number) => {
    if (y - h < 60) {
      page = pdf.addPage([595, 842]);
      y = 842 - M;
    }
  };

  page.drawRectangle({ x: 0, y: 842 - 110, width: 595, height: 110, color: purple });
  y = 842 - 50;
  text("MIAnota", M, 22, bold, rgb(1, 1, 1));
  y -= 22;
  text(`Relatório mensal · ${monthLabel(month)}`, M, 12, font, rgb(1, 1, 1));
  y -= 16;
  text(company?.nome_fantasia || company?.nome || "", M, 9, font, rgb(0.92, 0.9, 1));
  y = 842 - 150;

  const cards: [string, number][] = [
    ["Receitas", sum.income],
    ["Despesas", sum.expense],
    ["Saldo do mês", sum.balance],
    ["A pagar", sum.pending],
  ];
  const w = (595 - M * 2 - 30) / 4;
  cards.forEach(([label, v], i) => {
    const x = M + i * (w + 10);
    page.drawRectangle({ x, y: y - 40, width: w, height: 56, color: rgb(0.96, 0.95, 1) });
    page.drawText(label, { x: x + 10, y: y, size: 8, font, color: gray });
    page.drawText(safe(brl(v)), { x: x + 10, y: y - 22, size: 12, font: bold, color: v < 0 ? rgb(0.8, 0.1, 0.1) : dark });
  });
  y -= 80;

  text("Gastos por categoria", M, 13, bold);
  y -= 20;
  if (!sum.categories.length) {
    text("Nenhuma despesa registrada neste mês.", M, 10, font, gray);
    y -= 18;
  }
  for (const c of sum.categories.slice(0, 12)) {
    ensure(20);
    text(c.name, M, 10);
    const barX = M + 170;
    const barW = 230;
    page.drawRectangle({ x: barX, y: y - 1, width: barW, height: 8, color: rgb(0.92, 0.92, 0.95) });
    page.drawRectangle({ x: barX, y: y - 1, width: Math.max(2, (barW * c.pct) / 100), height: 8, color: purple });
    right(`${brl(c.cents)}  ${c.pct}%`, 595 - M, 10, bold);
    y -= 18;
  }
  y -= 14;

  ensure(40);
  text("Lançamentos do mês", M, 13, bold);
  y -= 20;
  const header = () => {
    text("Data", M, 8, bold, gray);
    text("Descrição", M + 60, 8, bold, gray);
    text("Categoria", M + 290, 8, bold, gray);
    right("Valor", 595 - M, 8, bold, gray);
    y -= 14;
  };
  header();
  for (const r of list) {
    if (y < 70) {
      ensure(1000);
      header();
    }
    const d = String(r.competencia || "");
    text(d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "", M, 9);
    text(String(r.descricao || "").slice(0, 42), M + 60, 9);
    text(String(r.categoria || "-").slice(0, 22), M + 290, 9, font, gray);
    const sign = r.tipo === "receita" ? "+ " : "- ";
    right(sign + brl(Number(r.valor_cents || 0)) + (r.status === "cancelado" ? " (cancelado)" : ""), 595 - M, 9, bold, r.tipo === "receita" ? rgb(0.05, 0.55, 0.3) : dark);
    y -= 14;
  }
  if (!list.length) text("Sem lançamentos.", M, 10, font, gray);

  const pages = pdf.getPages();
  pages.forEach((p, i) =>
    p.drawText(`MIAnota · Sua assistente financeira na palma da mão. · página ${i + 1} de ${pages.length}`, {
      x: M,
      y: 28,
      size: 8,
      font,
      color: gray,
    }),
  );
  return { bytes: await pdf.save(), summary: sum };
}

export const bytesToBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
