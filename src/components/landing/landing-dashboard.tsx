import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import NumberFlow from "@number-flow/react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  Check,
  FileDown,
  Plus,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";

// Dados ilustrativos (fixos) — nunca de clientes.
const CHART = [
  { d: "01", e: 0, s: 320, b: -320 }, { d: "05", e: 5200, s: 980, b: 3900 }, { d: "10", e: 5200, s: 1520, b: 3680 },
  { d: "15", e: 5900, s: 1980, b: 3920 }, { d: "20", e: 5900, s: 2340, b: 3560 }, { d: "25", e: 6400, s: 2610, b: 3790 },
  { d: "30", e: 6400, s: 2781, b: 3619 },
];
const CATS = [
  { name: "Moradia", v: 1200, c: "var(--ln-violet)" },
  { name: "Alimentação", v: 720, c: "var(--ln-magenta)" },
  { name: "Transporte", v: 380, c: "var(--ln-lime)" },
  { name: "Lazer", v: 290, c: "var(--wa-accent)" },
  { name: "Outros", v: 191, c: "var(--ln-muted)" },
];
const LATEST = [
  ["Salário", "Receita · Transferência", "+ R$ 5.200,00", true],
  ["Mercado", "Alimentação · Pix", "- R$ 84,90", false],
  ["Uber", "Transporte · Cartão", "- R$ 23,40", false],
  ["Freela design", "Receita · Pix", "+ R$ 700,00", true],
] as const;
const UPCOMING = [
  ["Conta de luz", "amanhã", "R$ 182,37"],
  ["Internet", "em 4 dias", "R$ 120,00"],
  ["Cartão Nubank", "em 9 dias", "R$ 1.340,00"],
] as const;

export function LandingDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);

  const kpis = [
    { label: "Saldo do período", v: 3619, icon: Wallet, tone: "text-ln-ink", hint: "+18% vs. mês anterior" },
    { label: "Entrou", v: 6400, icon: ArrowDownLeft, tone: "text-wa-accent", hint: "2 recebimentos" },
    { label: "Saiu", v: 2781, icon: ArrowUpRight, tone: "text-ln-magenta", hint: "27 movimentações" },
    { label: "Sobra prevista", v: 1976, icon: Sparkles, tone: "text-ln-lime", hint: "após contas futuras" },
  ];

  return (
    <div ref={ref} className="mt-12 [perspective:1600px]">
      <motion.div style={{ rotateX, scale }} className="origin-top rounded-[28px] border border-ln-line bg-ln-surface/80 shadow-2xl ln-glow">
        {/* barra do navegador */}
        <div className="flex items-center gap-2 border-b border-ln-line px-4 py-3">
          <span className="size-3 rounded-full bg-ln-magenta/70" /><span className="size-3 rounded-full bg-ln-lime/70" /><span className="size-3 rounded-full bg-wa-accent/70" />
          <div className="mx-auto hidden rounded-lg bg-ln-bg/60 px-6 py-1 text-[11px] text-ln-muted sm:block">mianota.app/inicio</div>
        </div>

        <div className="space-y-4 p-3 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ln-muted">Visão do mês · Novembro</div>
              <div className="font-sora text-xl font-bold sm:text-2xl">Bom dia, Ana 👋</div>
            </div>
            <span className="rounded-full bg-ln-lime/15 px-3 py-1 text-[11px] font-bold text-ln-lime">Mês no azul</span>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {[[Plus, "Nova despesa"], [ArrowDownLeft, "Nova receita"], [Upload, "Importar extrato"], [CalendarClock, "Planejamento"], [Bell, "Avisos"], [FileDown, "PDF do mês"]].map(([I, l]) => {
              const Icon = I as typeof Plus;
              return (
                <span key={l as string} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-ln-line bg-ln-bg/50 px-3 py-2 text-[12px] font-semibold">
                  <Icon className="size-3.5 text-ln-magenta" /> {l as string}
                </span>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {kpis.map(({ label, v, icon: Icon, tone, hint }) => (
              <motion.div key={label} whileHover={{ y: -4 }} className="rounded-2xl border border-ln-line bg-ln-bg/60 p-3 sm:p-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-ln-muted">
                  {label} <Icon className={`size-4 ${tone}`} />
                </div>
                <div className={`mt-2 font-sora text-base font-bold sm:text-2xl ${tone}`}>
                  <NumberFlow value={inView ? v : 0} locales="pt-BR" format={{ style: "currency", currency: "BRL", maximumFractionDigits: 0 }} />
                </div>
                <div className="mt-1 text-[10px] text-ln-muted sm:text-[11px]">{hint}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-ln-line bg-ln-bg/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-sora text-sm font-bold">Evolução</h3>
                <div className="flex gap-3 text-[10px] text-ln-muted">
                  <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-wa-accent" />Entrou</span>
                  <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-ln-magenta" />Saiu</span>
                  <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-ln-violet" />Saldo</span>
                </div>
              </div>
              <div className="mt-2 h-44 sm:h-56">
                {mounted && inView && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                      <defs>
                        {[["ge", "var(--wa-accent)"], ["gs", "var(--ln-magenta)"], ["gb", "var(--ln-violet)"]].map(([id, c]) => (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={c} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <XAxis dataKey="d" tick={{ fill: "var(--ln-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Area type="monotone" dataKey="e" stroke="var(--wa-accent)" strokeWidth={2} fill="url(#ge)" animationDuration={1400} />
                      <Area type="monotone" dataKey="s" stroke="var(--ln-magenta)" strokeWidth={2} fill="url(#gs)" animationDuration={1600} />
                      <Area type="monotone" dataKey="b" stroke="var(--ln-violet)" strokeWidth={2.5} fill="url(#gb)" animationDuration={1800} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-ln-line bg-ln-bg/60 p-4">
              <h3 className="font-sora text-sm font-bold">Maiores categorias</h3>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative size-32 shrink-0">
                  {mounted && inView && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={CATS} dataKey="v" innerRadius="62%" outerRadius="100%" paddingAngle={3} stroke="none" animationDuration={1200}>
                          {CATS.map((c) => <Cell key={c.name} fill={c.c} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 grid place-items-center text-center text-[10px] text-ln-muted"><span><b className="block font-sora text-sm text-ln-ink">R$ 2.781</b>no mês</span></div>
                </div>
                <ul className="flex-1 space-y-1.5 text-[12px]">
                  {CATS.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: c.c }} />{c.name}</span>
                      <span className="text-ln-muted">{Math.round((c.v / 2781) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-ln-line bg-ln-bg/60 p-4">
              <h3 className="font-sora text-sm font-bold">Últimas movimentações</h3>
              <ul className="mt-3 divide-y divide-ln-line">
                {LATEST.map(([t, s, v, inc]) => (
                  <li key={t} className="flex items-center gap-3 py-2.5">
                    <span className={`grid size-8 place-items-center rounded-xl ${inc ? "bg-wa-accent/15 text-wa-accent" : "bg-ln-magenta/15 text-ln-magenta"}`}>
                      {inc ? <ArrowDownLeft className="size-4" /> : <ArrowDownRight className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1"><b className="block text-[13px]">{t}</b><span className="text-[11px] text-ln-muted">{s}</span></span>
                    <span className={`text-[13px] font-bold ${inc ? "text-wa-accent" : ""}`}>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ln-line bg-ln-bg/60 p-4">
              <h3 className="font-sora text-sm font-bold">Próximos 14 dias</h3>
              <ul className="mt-3 space-y-2">
                {UPCOMING.map(([t, w, v]) => (
                  <li key={t} className="flex items-center gap-3 rounded-xl border border-ln-line px-3 py-2.5">
                    <CalendarClock className="size-4 text-ln-lime" />
                    <span className="flex-1"><b className="block text-[13px]">{t}</b><span className="text-[11px] text-ln-muted">vence {w}</span></span>
                    <span className="text-[13px] font-bold">{v}</span>
                    <span className="grid size-7 place-items-center rounded-lg bg-ln-lime/15 text-ln-lime"><Check className="size-3.5" /></span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-ln-violet/15 p-3 text-[12px]">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-ln-magenta" />
                <span><b>Leitura da MIA:</b> você gastou 12% menos com alimentação que no mês passado. Bom ritmo!</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <p className="mt-4 text-center text-[11px] text-ln-muted">Ilustração com valores de exemplo.</p>
    </div>
  );
}
