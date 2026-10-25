// Dados fictícios da demonstração pública. Nunca toca no banco.
// As datas são relativas a "hoje" para que o calendário e os períodos
// sempre mostrem um mês vivo.
import type {
  FinanceDashboardSnapshot,
  FinancePlannerItem,
  FinanceTransactionDetail,
} from "./finance-dashboard.functions";
import { addDays, daysBetween, isWithin, toIsoDate } from "./finance-period";

const CATEGORIES: Record<string, string> = {
  Moradia: "#7C3AED",
  Mercado: "#10B981",
  Transporte: "#0EA5E9",
  Restaurantes: "#F97316",
  Saúde: "#EF4444",
  Lazer: "#EC4899",
  Assinaturas: "#6366F1",
  Educação: "#14B8A6",
  Salário: "#16A34A",
  "Renda extra": "#22C55E",
};

type Seed = {
  offset: number; // dias a partir de hoje (negativo = passado)
  time?: string;
  type: "receita" | "despesa";
  description: string;
  merchant?: string;
  category: string;
  amount: number;
  payment: string;
  account?: string;
  card?: string;
  source: string;
  status?: "pago" | "pendente";
  note?: string;
  attachment?: boolean;
  original?: string;
};

// Um ciclo de ~30 dias repetido para trás (3 meses) com pequenas variações.
const CYCLE: Seed[] = [
  {
    offset: 0,
    time: "08:42",
    type: "despesa",
    description: "Padaria",
    merchant: "Padaria Pão Nosso",
    category: "Mercado",
    amount: 18.5,
    payment: "pix",
    account: "Nubank",
    source: "whatsapp",
    original: "18,50 padaria pix",
  },
  {
    offset: -1,
    time: "19:15",
    type: "despesa",
    description: "Mercado do mês",
    merchant: "Supermercado Bom Preço",
    category: "Mercado",
    amount: 486.3,
    payment: "cartao",
    card: "Visa •4821",
    source: "ia",
    attachment: true,
    note: "Compra grande com produtos de limpeza",
    original: "Foto do cupom fiscal",
  },
  {
    offset: -2,
    time: "12:30",
    type: "despesa",
    description: "Almoço",
    merchant: "Restaurante Sabor Caseiro",
    category: "Restaurantes",
    amount: 42.9,
    payment: "pix",
    account: "Nubank",
    source: "whatsapp",
    original: "almocei 42,90 no pix",
  },
  {
    offset: -3,
    time: "07:55",
    type: "despesa",
    description: "Combustível",
    merchant: "Posto Shell Centro",
    category: "Transporte",
    amount: 220,
    payment: "cartao",
    card: "Visa •4821",
    source: "ia",
    original: "abasteci 220 no cartão",
  },
  {
    offset: -4,
    time: "18:10",
    type: "receita",
    description: "Projeto de design",
    merchant: "Cliente Studio Lua",
    category: "Renda extra",
    amount: 850,
    payment: "pix",
    account: "Nubank",
    source: "ia",
    note: "Segunda parcela do projeto",
    original: "recebi 850 do projeto da Studio Lua",
  },
  {
    offset: -5,
    time: "10:00",
    type: "despesa",
    description: "Farmácia",
    merchant: "Drogaria São Paulo",
    category: "Saúde",
    amount: 87.4,
    payment: "pix",
    account: "Nubank",
    source: "whatsapp",
    original: "gastei 87,40 na farmácia",
  },
  {
    offset: -6,
    time: "21:00",
    type: "despesa",
    description: "Streaming",
    merchant: "Netflix",
    category: "Assinaturas",
    amount: 55.9,
    payment: "cartao",
    card: "Visa •4821",
    source: "recorrencia",
  },
  {
    offset: -7,
    time: "20:30",
    type: "despesa",
    description: "Cinema",
    merchant: "Cinemark",
    category: "Lazer",
    amount: 64,
    payment: "cartao",
    card: "Visa •4821",
    source: "manual",
  },
  {
    offset: -9,
    time: "09:00",
    type: "despesa",
    description: "Aluguel",
    merchant: "Imobiliária Central",
    category: "Moradia",
    amount: 1850,
    payment: "boleto",
    account: "Itaú",
    source: "recorrencia",
    note: "Vence todo dia 5",
  },
  {
    offset: -10,
    time: "08:00",
    type: "receita",
    description: "Salário",
    merchant: "Empresa Aurora Ltda",
    category: "Salário",
    amount: 6200,
    payment: "transferencia",
    account: "Itaú",
    source: "manual",
  },
  {
    offset: -11,
    time: "13:20",
    type: "despesa",
    description: "Uber",
    merchant: "Uber",
    category: "Transporte",
    amount: 31.7,
    payment: "cartao",
    card: "Visa •4821",
    source: "whatsapp",
  },
  {
    offset: -12,
    time: "16:45",
    type: "despesa",
    description: "Curso online",
    merchant: "Alura",
    category: "Educação",
    amount: 129,
    payment: "cartao",
    card: "Visa •4821",
    source: "recorrencia",
  },
  {
    offset: -14,
    time: "11:10",
    type: "despesa",
    description: "Feira",
    merchant: "Feira livre",
    category: "Mercado",
    amount: 68,
    payment: "dinheiro",
    account: "Carteira",
    source: "ia",
    original: "feira 68 em dinheiro",
  },
  {
    offset: -16,
    time: "20:05",
    type: "despesa",
    description: "Pizza",
    merchant: "Pizzaria Bella",
    category: "Restaurantes",
    amount: 89.9,
    payment: "pix",
    account: "Nubank",
    source: "whatsapp",
  },
  {
    offset: -18,
    time: "09:30",
    type: "despesa",
    description: "Conta de luz",
    merchant: "Enel",
    category: "Moradia",
    amount: 182.4,
    payment: "pix",
    account: "Itaú",
    source: "ia",
    attachment: true,
    original: "PDF da fatura de energia",
  },
  {
    offset: -20,
    time: "17:40",
    type: "despesa",
    description: "Academia",
    merchant: "Smart Fit",
    category: "Saúde",
    amount: 99.9,
    payment: "cartao",
    card: "Visa •4821",
    source: "recorrencia",
  },
  {
    offset: -22,
    time: "15:00",
    type: "receita",
    description: "Venda de bicicleta",
    merchant: "OLX",
    category: "Renda extra",
    amount: 420,
    payment: "pix",
    account: "Nubank",
    source: "manual",
    note: "Bicicleta antiga",
  },
  {
    offset: -24,
    time: "12:15",
    type: "despesa",
    description: "Internet",
    merchant: "Vivo Fibra",
    category: "Moradia",
    amount: 119.9,
    payment: "boleto",
    account: "Itaú",
    source: "recorrencia",
  },
  {
    offset: -26,
    time: "19:30",
    type: "despesa",
    description: "Mercado",
    merchant: "Supermercado Bom Preço",
    category: "Mercado",
    amount: 212.6,
    payment: "cartao",
    card: "Visa •4821",
    source: "ia",
  },
  {
    offset: -28,
    time: "10:20",
    type: "despesa",
    description: "Presente de aniversário",
    merchant: "Livraria Cultura",
    category: "Lazer",
    amount: 145,
    payment: "pix",
    account: "Nubank",
    source: "whatsapp",
  },
];

const FUTURE: Seed[] = [
  {
    offset: 2,
    type: "despesa",
    description: "Cartão Visa",
    category: "Moradia",
    amount: 1287.4,
    payment: "boleto",
    source: "ia",
    status: "pendente",
    note: "Fatura do cartão",
  },
  {
    offset: 4,
    type: "despesa",
    description: "Conta de água",
    category: "Moradia",
    amount: 96.3,
    payment: "boleto",
    source: "ia",
    status: "pendente",
  },
  {
    offset: 6,
    type: "receita",
    description: "Freelance Studio Lua",
    category: "Renda extra",
    amount: 1200,
    payment: "pix",
    source: "ia",
    status: "pendente",
    note: "Última parcela",
  },
  {
    offset: 9,
    type: "despesa",
    description: "IPVA (parcela 3/3)",
    category: "Transporte",
    amount: 412,
    payment: "boleto",
    source: "manual",
    status: "pendente",
  },
  {
    offset: 12,
    type: "despesa",
    description: "Dentista",
    category: "Saúde",
    amount: 250,
    payment: "pix",
    source: "whatsapp",
    status: "pendente",
    note: "Lembrete: levar exames",
  },
  {
    offset: -2,
    type: "despesa",
    description: "Seguro do carro",
    category: "Transporte",
    amount: 189.9,
    payment: "boleto",
    source: "ia",
    status: "pendente",
    note: "Venceu — pagar hoje",
  },
];

const RECURRING: Array<{
  day: number;
  description: string;
  category: string;
  amount: number;
  type: "receita" | "despesa";
}> = [
  { day: 5, description: "Aluguel", category: "Moradia", amount: 1850, type: "despesa" },
  { day: 10, description: "Salário", category: "Salário", amount: 6200, type: "receita" },
  { day: 15, description: "Academia", category: "Saúde", amount: 99.9, type: "despesa" },
  { day: 20, description: "Internet", category: "Moradia", amount: 119.9, type: "despesa" },
];

function toDetail(seed: Seed, date: string, id: string): FinanceTransactionDetail {
  const status = seed.status || "pago";
  return {
    id,
    date,
    time: status === "pago" ? seed.time || null : null,
    type: seed.type,
    description: seed.description,
    merchant: seed.merchant || null,
    category: seed.category,
    categoryColor: CATEGORIES[seed.category] || "#94A3B8",
    amountCents: Math.round(seed.amount * 100),
    paymentMethod: seed.payment,
    account: seed.account || null,
    card: seed.card || null,
    source: seed.source,
    hasAttachment: Boolean(seed.attachment),
    status,
    dueDate: status === "pago" ? null : date,
    paidAt: status === "pago" ? date : null,
    note: seed.note || null,
    originalInput: seed.original || null,
    installment: null,
  };
}

/** Extrato fictício: 3 ciclos para trás + contas futuras. */
export function buildDemoTransactions(today: Date = new Date()): FinanceTransactionDetail[] {
  const base = toIsoDate(today);
  const out: FinanceTransactionDetail[] = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    CYCLE.forEach((seed, index) => {
      const variation = cycle === 0 ? 1 : 1 + ((index % 5) - 2) * 0.04 * cycle;
      const amount = [
        "Salário",
        "Aluguel",
        "Streaming",
        "Academia",
        "Internet",
        "Curso online",
      ].includes(seed.description)
        ? seed.amount
        : Math.round(seed.amount * variation * 100) / 100;
      out.push(
        toDetail(
          { ...seed, amount },
          addDays(base, seed.offset - cycle * 30),
          `demo-${cycle}-${index}`,
        ),
      );
    });
  }
  FUTURE.forEach((seed, index) =>
    out.push(toDetail(seed, addDays(base, seed.offset), `demo-f-${index}`)),
  );
  return out.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || String(b.time || "").localeCompare(String(a.time || "")),
  );
}

export function buildDemoPlanner(
  transactions: FinanceTransactionDetail[],
  first: string,
  last: string,
): FinancePlannerItem[] {
  const items: FinancePlannerItem[] = transactions
    .filter((t) => isWithin(t.date, first, last))
    .map((t) => ({
      id: `entry-${t.id}`,
      date: t.date,
      time: t.time,
      title: t.description,
      amountCents: t.amountCents,
      type: t.type,
      status: t.status,
      kind: t.status === "pago" ? "movimentacao" : "conta",
      recurring: t.source === "recorrencia",
      category: t.category,
      paymentMethod: t.paymentMethod,
      source: t.source,
      note: t.note,
    }));
  // Próximas ocorrências das recorrências (somente datas futuras ainda não lançadas).
  const today = toIsoDate(new Date());
  const start = new Date(`${first}T12:00:00`);
  for (let i = 0; i <= daysBetween(first, last); i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toIsoDate(d);
    if (iso <= today) continue;
    for (const r of RECURRING) {
      if (d.getDate() !== r.day) continue;
      items.push({
        id: `rec-${r.description}-${iso}`,
        date: iso,
        time: null,
        title: r.description,
        amountCents: Math.round(r.amount * 100),
        type: r.type,
        status: "pendente",
        kind: "recorrencia",
        recurring: true,
        category: r.category,
        paymentMethod: null,
        source: "recorrencia",
        note: "Repete mensal",
      });
    }
  }
  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || String(a.time || "99").localeCompare(String(b.time || "99")),
  );
}

/** Monta a mesma estrutura da Visão do mês real, a partir do extrato fictício. */
export function buildDemoSnapshot(
  transactions: FinanceTransactionDetail[],
  period: { from: string; to: string },
): Pick<
  FinanceDashboardSnapshot,
  "period" | "totals" | "cashflow" | "categories" | "upcoming" | "latest" | "insight"
> {
  const rows = transactions.filter((t) => isWithin(t.date, period.from, period.to));
  const sum = (pred: (t: FinanceTransactionDetail) => boolean) =>
    rows.filter(pred).reduce((acc, t) => acc + t.amountCents, 0);
  const receivedCents = sum((t) => t.type === "receita" && t.status === "pago");
  const spentCents = sum((t) => t.type === "despesa" && t.status === "pago");
  const pendingIncomeCents = sum((t) => t.type === "receita" && t.status !== "pago");
  const pendingExpenseCents = sum((t) => t.type === "despesa" && t.status !== "pago");
  const netCents = receivedCents - spentCents;
  const leftoverCents = netCents + pendingIncomeCents - pendingExpenseCents;
  const byCategory = new Map<string, number>();
  rows
    .filter((t) => t.type === "despesa" && t.status === "pago")
    .forEach((t) =>
      byCategory.set(
        t.category || "Sem categoria",
        (byCategory.get(t.category || "Sem categoria") || 0) + t.amountCents,
      ),
    );
  const categories = Array.from(byCategory.entries())
    .map(([name, amountCents]) => ({
      id: name,
      name,
      color: CATEGORIES[name] || "#94A3B8",
      amountCents,
      share: spentCents ? Math.round((amountCents / spentCents) * 100) : 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 6);
  const days = daysBetween(period.from, period.to) + 1;
  const cashflow = Array.from({ length: days }, (_, i) => {
    const date = addDays(period.from, i);
    const dayRows = rows.filter((t) => t.date === date && t.status === "pago");
    const incomeCents = dayRows
      .filter((t) => t.type === "receita")
      .reduce((a, t) => a + t.amountCents, 0);
    const expenseCents = dayRows
      .filter((t) => t.type === "despesa")
      .reduce((a, t) => a + t.amountCents, 0);
    return {
      date,
      label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
    };
  });
  const today = toIsoDate(new Date());
  const limit = addDays(today, 14);
  const top = categories[0];
  return {
    period,
    totals: {
      balanceCents: netCents,
      receivedCents,
      spentCents,
      netCents,
      pendingIncomeCents,
      pendingExpenseCents,
      projectedCents: leftoverCents,
      leftoverCents,
    },
    cashflow,
    categories,
    upcoming: transactions
      .filter((t) => t.status !== "pago" && t.date <= limit)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        description: t.description,
        type: t.type,
        amountCents: t.amountCents,
        dueDate: t.date,
        status: t.status,
      })),
    latest: rows
      .filter((t) => t.status === "pago")
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        description: t.description,
        type: t.type,
        amountCents: t.amountCents,
        date: t.date,
        status: t.status,
        category: t.category,
        categoryColor: t.categoryColor,
        source: t.source,
      })),
    insight: top
      ? {
          title: `${top.name} lidera seus gastos`,
          body: `${top.share}% das saídas do período estão nessa categoria. Peça à MárcIA para comparar com o mês passado.`,
          tone: top.share >= 40 ? "attention" : "neutral",
        }
      : {
          title: "Período sem saídas",
          body: "Nenhuma despesa registrada neste intervalo.",
          tone: "positive",
        },
  };
}
