import { describe, expect, test } from "bun:test";
import {
  budgetAlertLevel,
  isQuietHour,
  notificationTarget,
  shouldSendPush,
  withinReminderLead,
  DEFAULT_PREFERENCE,
} from "../src/lib/notification-rules";

describe("Central de avisos", () => {
  test("silêncio das 22h às 7h bloqueia 23h e 3h, libera 12h", () => {
    expect(isQuietHour(23, 22, 7)).toBe(true);
    expect(isQuietHour(3, 22, 7)).toBe(true);
    expect(isQuietHour(12, 22, 7)).toBe(false);
  });

  test("categoria desligada não vai para o celular", () => {
    const pref = { ...DEFAULT_PREFERENCE, push_categories: ["agenda"] };
    expect(shouldSendPush({ type: "finance.due" }, pref, 12)).toBe(false);
    expect(shouldSendPush({ type: "finance.due" }, DEFAULT_PREFERENCE, 12)).toBe(true);
  });

  test("antecedência de 1 dia ignora conta daqui a 3 dias, mas sempre inclui atrasadas", () => {
    expect(withinReminderLead("2026-11-03", "2026-10-31", 1)).toBe(false);
    expect(withinReminderLead("2026-11-01", "2026-10-31", 1)).toBe(true);
    expect(withinReminderLead("2026-10-20", "2026-10-31", 0)).toBe(true);
  });

  test("orçamento alerta em 80% e estoura em 100%", () => {
    expect(budgetAlertLevel(7900, 10000)).toBe(null);
    expect(budgetAlertLevel(8000, 10000)).toBe("warning");
    expect(budgetAlertLevel(10000, 10000)).toBe("exceeded");
  });

  test("destino só aceita páginas internas de /app", () => {
    expect(notificationTarget({ type: "x", data: { route: "https://evil.com" } })).toBe("/app/notificacoes");
    expect(notificationTarget({ type: "finance.due", entity_type: "fin_lancamento" })).toBe("/app/planejamento");
  });
});

import { shouldSendWhatsapp } from "../src/lib/notification-rules";
import { monthBounds, previousMonth, summarizeMonth } from "../src/lib/monthly-report-rules";

describe("WhatsApp e relatório mensal", () => {
  test("WhatsApp respeita categoria, desligado e silêncio; aviso em massa não vai", () => {
    expect(shouldSendWhatsapp({ type: "finance.due" }, null, 12)).toBe(true);
    expect(shouldSendWhatsapp({ type: "finance.due" }, { whatsapp_enabled: false }, 12)).toBe(false);
    expect(shouldSendWhatsapp({ type: "finance.due" }, { whatsapp_categories: ["agenda"] }, 12)).toBe(false);
    expect(shouldSendWhatsapp({ type: "finance.due" }, { quiet_start: 22, quiet_end: 7 }, 23)).toBe(false);
    expect(shouldSendWhatsapp({ type: "system.broadcast" }, null, 12)).toBe(false);
  });

  test("mês anterior e limites viram o ano em janeiro/dezembro", () => {
    expect(previousMonth("2026-01-01")).toBe("2025-12");
    expect(monthBounds("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });

  test("totais ignoram cancelados e somam a pagar", () => {
    const s = summarizeMonth([
      { tipo: "receita", status: "pago", valor_cents: 500000, categoria: null },
      { tipo: "despesa", status: "pago", valor_cents: 12000, categoria: "Mercado" },
      { tipo: "despesa", status: "pendente", valor_cents: 8000, categoria: "Luz" },
      { tipo: "despesa", status: "cancelado", valor_cents: 99999, categoria: "Mercado" },
    ]);
    expect(s.expense).toBe(20000);
    expect(s.balance).toBe(480000);
    expect(s.pending).toBe(8000);
    expect(s.categories[0]).toEqual({ name: "Mercado", cents: 12000, pct: 60 });
  });
});
