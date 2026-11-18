/**
 * Regras do painel "Saúde do sistema" (Master).
 * Recebe contagens já lidas do banco e devolve um item por área com nível
 * ok / atenção / crítico, para o dono ver em segundos onde há problema.
 */
import { isProviderPaused } from "@/lib/ai/ai-circuit-rules";

export type HealthLevel = "ok" | "warn" | "critical";
export type HealthItem = { key: string; label: string; level: HealthLevel; detail: string };

export type HealthInput = {
  now: Date;
  ai: {
    mode: string;
    test_ok: boolean | null;
    tested_at: string | null;
    last_error: string | null;
    paused_until: string | null;
    consecutive_failures: number | null;
  } | null;
  commandErrors24h: number;
  commands24h: number;
  whatsappStuck: number;
  billingErrors7d: number;
  outboxErrors: number;
  webhookErrors24h: number;
};

/** Teste de conexão com mais de 7 dias é considerado antigo. */
export const AI_TEST_STALE_DAYS = 7;

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function aiItem(input: HealthInput): HealthItem {
  const ai = input.ai;
  const base = { key: "ai", label: "Provedor de IA" };
  if (!ai || ai.mode === "lovable") return { ...base, level: "ok", detail: "Lovable AI (padrão) ativo." };
  if (isProviderPaused(ai.paused_until, input.now)) {
    const until = new Date(ai.paused_until!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    return { ...base, level: "critical", detail: `Em pausa automática até ${until} após falhas seguidas; a MIA responde pela Lovable AI.` };
  }
  if (ai.test_ok !== true) return { ...base, level: "critical", detail: "Provedor sem teste aprovado; a MIA usa a Lovable AI." };
  if ((ai.consecutive_failures ?? 0) > 0)
    return { ...base, level: "warn", detail: `${plural(ai.consecutive_failures ?? 0, "falha seguida", "falhas seguidas")} recentes.` };
  const testedAt = ai.tested_at ? new Date(ai.tested_at).getTime() : 0;
  const ageDays = (input.now.getTime() - testedAt) / 86_400_000;
  if (!testedAt || ageDays > AI_TEST_STALE_DAYS)
    return { ...base, level: "warn", detail: `Último teste de conexão há mais de ${AI_TEST_STALE_DAYS} dias.` };
  return { ...base, level: "ok", detail: "Conectado e respondendo." };
}

export function buildSystemHealth(input: HealthInput): HealthItem[] {
  return [
    aiItem(input),
    {
      key: "commands",
      label: "Comandos da MIA (24h)",
      level: input.commandErrors24h === 0 ? "ok" : input.commandErrors24h >= 5 ? "critical" : "warn",
      detail:
        input.commandErrors24h === 0
          ? `${plural(input.commands24h, "comando", "comandos")} sem erro.`
          : `${plural(input.commandErrors24h, "comando com erro", "comandos com erro")} de ${input.commands24h}.`,
    },
    {
      key: "whatsapp",
      label: "Mensagens do WhatsApp",
      level: input.whatsappStuck === 0 ? "ok" : "warn",
      detail:
        input.whatsappStuck === 0
          ? "Nenhuma mensagem travada ou com falha."
          : `${plural(input.whatsappStuck, "mensagem com falha ou na fila", "mensagens com falha ou na fila")} há mais de 15 min.`,
    },
    {
      key: "billing",
      label: "Pagamentos (7 dias)",
      level: input.billingErrors7d === 0 ? "ok" : "critical",
      detail:
        input.billingErrors7d === 0
          ? "Todos os avisos de pagamento processados."
          : `${plural(input.billingErrors7d, "aviso de pagamento com erro", "avisos de pagamento com erro")}; confira em Pagamentos.`,
    },
    {
      key: "outbox",
      label: "Envios automáticos",
      level: input.outboxErrors === 0 ? "ok" : "warn",
      detail:
        input.outboxErrors === 0
          ? "Fila de envios em dia."
          : `${plural(input.outboxErrors, "envio com erro", "envios com erro")} aguardando nova tentativa.`,
    },
    {
      key: "webhooks",
      label: "Webhooks dos assinantes (24h)",
      level: input.webhookErrors24h === 0 ? "ok" : "warn",
      detail:
        input.webhookErrors24h === 0
          ? "Nenhuma entrega com erro."
          : `${plural(input.webhookErrors24h, "entrega com erro", "entregas com erro")}.`,
    },
  ];
}

export function overallLevel(items: HealthItem[]): HealthLevel {
  if (items.some((i) => i.level === "critical")) return "critical";
  if (items.some((i) => i.level === "warn")) return "warn";
  return "ok";
}
