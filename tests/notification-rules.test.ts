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
