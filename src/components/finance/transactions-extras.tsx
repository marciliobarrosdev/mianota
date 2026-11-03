import { PAYMENT_METHOD_OPTION_LABELS } from "@/lib/finance/payment-method-rules";
import { useMemo, useState, type ChangeEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ChevronDown, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceTransactionDetail } from "@/lib/finance/finance-dashboard.functions";
import { dailyFlow, expensesByCategory, normalizeTags, validateSplits, type TxLike } from "@/lib/finance/transactions-rules";
import { parseStatement, type StatementRow } from "@/lib/finance/bank-statement-rules";
import { money } from "./finance-overview";

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--brand)", "var(--muted-foreground)"];

/** Campo de tags: digite e aperte Enter ou vírgula. */
export function TagInput({ value, onChange, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const commit = (raw: string) => {
    const next = normalizeTags([...value, ...normalizeTags(raw)]);
    onChange(next);
    setDraft("");
  };
  const rest = suggestions.filter((s) => !value.includes(s)).slice(0, 8);
  return (
    <div className="space-y-1.5">
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
            #{t}
            <button type="button" aria-label={`Remover ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="size-3" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && draft.trim()) { e.preventDefault(); commit(draft); }
            else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={value.length ? "" : "ex.: viagem, trabalho"}
          aria-label="Adicionar tag"
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {rest.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {rest.map((s) => (
            <button key={s} type="button" onClick={() => onChange(normalizeTags([...value, s]))} className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-muted">+ #{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Divide o valor de um lançamento entre categorias. */
export function SplitDialog({
  item,
  categories,
  onClose,
  onSave,
  busy,
}: {
  item: FinanceTransactionDetail;
  categories: { id: string; name: string; type: string }[];
  onClose: () => void;
  onSave: (parts: { categoryId: string | null; amountCents: number }[]) => void;
  busy: boolean;
}) {
  const initial = item.splits?.length
    ? item.splits.map((s) => ({ categoryId: s.categoryId || "none", amountCents: s.amountCents as number | null }))
    : [{ categoryId: item.categoryId || "none", amountCents: item.amountCents as number | null }, { categoryId: "none", amountCents: null as number | null }];
  const [parts, setParts] = useState(initial);
  const options = categories.filter((c) => c.type === item.type || c.type === "ambos" || !c.type);
  const clean = parts.map((p) => ({ categoryId: p.categoryId === "none" ? null : p.categoryId, amountCents: p.amountCents || 0 }));
  const sum = clean.reduce((a, p) => a + p.amountCents, 0);
  const error = validateSplits(item.amountCents, clean);
  const update = (i: number, patch: Partial<(typeof parts)[number]>) => setParts((c) => c.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const fillRest = (i: number) => {
    const others = clean.reduce((a, p, j) => (j === i ? a : a + p.amountCents), 0);
    if (item.amountCents - others > 0) update(i, { amountCents: item.amountCents - others });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dividir em categorias</DialogTitle>
          <DialogDescription>{item.description} · total {money(item.amountCents)}. Orçamentos, gráfico e relatórios contam cada parte na sua categoria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {parts.map((p, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-center gap-2">
              <Select value={p.categoryId} onValueChange={(v) => update(i, { categoryId: v })}>
                <SelectTrigger aria-label={`Categoria da parte ${i + 1}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <MoneyInput aria-label={`Valor da parte ${i + 1}`} cents={p.amountCents} onChange={(v) => update(i, { amountCents: v })} onFocus={() => !p.amountCents && fillRest(i)} />
              <Button type="button" size="icon" variant="ghost" aria-label="Remover parte" disabled={parts.length <= 2} onClick={() => setParts((c) => c.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" disabled={parts.length >= 10} onClick={() => setParts((c) => [...c, { categoryId: "none", amountCents: null }])}><Plus /> Adicionar parte</Button>
          <div className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${error ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>
            Soma das partes: {money(sum)} de {money(item.amountCents)}{error ? ` — ${error}` : " ✓"}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          {item.splits?.length ? <Button type="button" variant="ghost" className="text-rose-700 dark:text-rose-400" disabled={busy} onClick={() => onSave([])}>Remover divisão</Button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={busy || Boolean(error)} onClick={() => onSave(clean)}>Salvar divisão</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Gráficos: despesas por categoria (rosca) e entradas × saídas por dia. */
export function ExpenseCharts({ items, onPickCategory, activeCategory }: { items: TxLike[]; onPickCategory: (name: string) => void; activeCategory: string }) {
  const [open, setOpen] = useState(true);
  const cats = useMemo(() => expensesByCategory(items), [items]);
  const flow = useMemo(() => dailyFlow(items).map((d) => ({ ...d, label: d.date.slice(8, 10) + "/" + d.date.slice(5, 7), entradas: d.incomeCents / 100, saidas: d.expenseCents / 100 })), [items]);
  const total = cats.reduce((a, c) => a + c.cents, 0);
  const top = cats.slice(0, 6);
  const other = cats.slice(6).reduce((a, c) => a + c.cents, 0);
  const pie = [...top, ...(other ? [{ name: "Outras", cents: other }] : [])];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2.5 text-left sm:px-4" aria-expanded={open}>
        <span className="flex items-center gap-2 text-sm font-extrabold"><BarChart3 className="size-4 text-[color:var(--brand-text)]" /> Gráfico de despesas</span>
        <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        !items.length ? <p className="px-4 pb-4 text-xs text-muted-foreground">Sem movimentações para mostrar com os filtros atuais.</p> : (
          <div className="grid gap-4 border-t border-border p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">Despesas por categoria</h3>
              {!total ? <p className="mt-2 text-xs text-muted-foreground">Nenhuma saída no período.</p> : (
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative size-36 shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pie} dataKey="cents" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={1} stroke="none" onClick={(d: { name?: string }) => d?.name && d.name !== "Outras" && onPickCategory(d.name)}>
                          {pie.map((c, i) => <Cell key={c.name} fill={PALETTE[i % PALETTE.length]} opacity={activeCategory === "all" || activeCategory === c.name ? 1 : 0.35} className="cursor-pointer" />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => money(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div><div className="text-[9px] font-bold uppercase text-muted-foreground">Saídas</div><div className="text-xs font-extrabold tabular-nums">{money(total)}</div></div>
                    </div>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1 text-xs">
                    {pie.map((c, i) => (
                      <li key={c.name}>
                        <button type="button" disabled={c.name === "Outras"} onClick={() => onPickCategory(c.name)} className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/50 ${activeCategory === c.name ? "bg-muted font-bold" : ""}`}>
                          <i className="size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="tabular-nums text-muted-foreground">{Math.round((c.cents / total) * 100)}%</span>
                          <span className="tabular-nums font-bold">{money(c.cents)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">Entradas e saídas por dia</h3>
              <div className="mt-2 h-40">
                <ResponsiveContainer>
                  <BarChart data={flow} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip formatter={(v: number, n: string) => [money(Math.round(v * 100)), n === "entradas" ? "Entradas" : "Saídas"]} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="entradas" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="saidas" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      )}
    </section>
  );
}

export type ImportPreviewRow = StatementRow & { duplicate: boolean; categoryId: string | null };

/** Importação de extrato: escolher arquivo → revisar → confirmar. */
export function ImportStatementDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  preview,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: { id: string; name: string; type: string }[];
  accounts: { id: string; name: string }[];
  preview: (rows: StatementRow[]) => Promise<ImportPreviewRow[]>;
  onImport: (input: { fileName: string; accountId: string | null; paymentMethod: string; rows: (StatementRow & { categoryId: string | null })[] }) => Promise<void>;
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<(ImportPreviewRow & { include: boolean })[]>([]);
  const [accountId, setAccountId] = useState("none");
  const [payMethod, setPayMethod] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setRows([]); setFileName(""); setError(""); };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    if (f.size > 5 * 1024 * 1024) return setError("Arquivo grande demais (máximo 5 MB).");
    const buf = await f.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("\uFFFD")) text = new TextDecoder("windows-1252").decode(buf);
    const parsed = parseStatement(f.name, text);
    if (!parsed.length) return setError("Não encontrei lançamentos. Envie um arquivo OFX ou CSV com colunas de data, descrição e valor.");
    if (parsed.length > 1000) return setError("O arquivo tem mais de 1.000 lançamentos. Exporte um período menor.");
    setBusy(true);
    try {
      const p = await preview(parsed);
      setRows(p.map((r) => ({ ...r, include: !r.duplicate })));
      setFileName(f.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler o arquivo.");
    } finally {
      setBusy(false);
    }
  };
  const chosen = rows.filter((r) => r.include);
  const inc = chosen.filter((r) => r.type === "receita").reduce((a, r) => a + r.amountCents, 0);
  const out = chosen.filter((r) => r.type === "despesa").reduce((a, r) => a + r.amountCents, 0);
  const dups = rows.filter((r) => r.duplicate).length;
  const upd = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((c) => c.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar extrato bancário</DialogTitle>
          <DialogDescription>Arquivos OFX ou CSV exportados pelo app ou site do seu banco. Nada é salvo antes de você confirmar.</DialogDescription>
        </DialogHeader>
        {!rows.length ? (
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-8 text-center hover:bg-muted/40">
              <Upload className="size-6 text-[color:var(--brand-text)]" />
              <span className="text-sm font-bold">{busy ? "Lendo arquivo…" : "Escolher arquivo OFX ou CSV"}</span>
              <span className="text-xs text-muted-foreground">Nubank, Inter, Itaú, Bradesco, Caixa, BB, Santander e outros</span>
              <input type="file" accept=".ofx,.csv,.txt,text/csv" className="sr-only" onChange={onFile} disabled={busy} aria-label="Arquivo do extrato" />
            </label>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3 text-xs">
              <div className="min-w-48 flex-1">
                <Label>Conta de destino</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta específica</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-48 flex-1">
                <Label>Forma de pagamento *</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="mt-1" aria-invalid={!payMethod}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_OPTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!payMethod && <p className="mt-1 text-destructive">Informe a forma de pagamento</p>}
              </div>
              <div className="text-muted-foreground"><strong className="text-foreground">{fileName}</strong> · {rows.length} linhas{dups ? ` · ${dups} já existem (desmarcadas)` : ""}</div>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-2"><Checkbox aria-label="Marcar todas" checked={chosen.length === rows.length} onCheckedChange={(v) => setRows((c) => c.map((r) => ({ ...r, include: Boolean(v) })))} /></th><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2">Categoria</th><th className="p-2 text-right">Valor</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.include ? "" : "opacity-50"}>
                      <td className="p-2"><Checkbox aria-label={`Importar ${r.description}`} checked={r.include} onCheckedChange={(v) => upd(i, { include: Boolean(v) })} /></td>
                      <td className="whitespace-nowrap p-2 tabular-nums">{r.date.split("-").reverse().join("/")}</td>
                      <td className="p-2">
                        <Input value={r.description} onChange={(e) => upd(i, { description: e.target.value })} className="h-7 text-xs" maxLength={240} />
                        {r.duplicate && <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Já existe no app</span>}
                      </td>
                      <td className="p-2">
                        <Select value={r.categoryId || "none"} onValueChange={(v) => upd(i, { categoryId: v === "none" ? null : v })}>
                          <SelectTrigger className="h-7 min-w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem categoria</SelectItem>
                            {categories.filter((c) => c.type === r.type || c.type === "ambos").map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className={`whitespace-nowrap p-2 text-right font-bold tabular-nums ${r.type === "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{r.type === "receita" ? "+" : "−"} {money(r.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>{chosen.length} selecionadas · entradas <strong className="text-emerald-700 dark:text-emerald-400">{money(inc)}</strong> · saídas <strong className="text-rose-700 dark:text-rose-400">{money(out)}</strong></span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset}>Trocar arquivo</Button>
                <Button
                  disabled={busy || !payMethod || !chosen.length || chosen.some((r) => !r.description.trim())}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onImport({ fileName, accountId: accountId === "none" ? null : accountId, paymentMethod: payMethod, rows: chosen.map(({ include: _i, duplicate: _d, ...r }) => ({ ...r, description: r.description.trim() })) });
                      reset();
                      onOpenChange(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Importando…" : `Importar ${chosen.length}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
