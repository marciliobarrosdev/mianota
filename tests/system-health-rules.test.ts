import { describe, expect, it } from "vitest";
import { buildSystemHealth, overallLevel, type HealthInput } from "@/lib/master/system-health-rules";

const now = new Date("2026-11-18T20:00:00.000Z");
const base: HealthInput = {
  now,
  ai: { mode: "openrouter", test_ok: true, tested_at: "2026-11-17T20:00:00.000Z", last_error: null, paused_until: null, consecutive_failures: 0 },
  commandErrors24h: 0,
  commands24h: 12,
  whatsappStuck: 0,
  billingErrors7d: 0,
  outboxErrors: 0,
  webhookErrors24h: 0,
};
const item = (input: HealthInput, key: string) => buildSystemHealth(input).find((i) => i.key === key)!;

describe("saúde do sistema", () => {
  it("tudo em dia fica ok", () => {
    expect(overallLevel(buildSystemHealth(base))).toBe("ok");
  });
  it("provedor em pausa automática é crítico", () => {
    const input = { ...base, ai: { ...base.ai!, paused_until: "2026-11-18T20:04:00.000Z", consecutive_failures: 3 } };
    expect(item(input, "ai").level).toBe("critical");
  });
  it("teste de conexão com mais de 7 dias pede atenção", () => {
    const input = { ...base, ai: { ...base.ai!, tested_at: "2026-11-10T19:00:00.000Z" } };
    expect(item(input, "ai").level).toBe("warn");
  });
  it("qualquer aviso de pagamento com erro é crítico", () => {
    expect(item({ ...base, billingErrors7d: 1 }, "billing").level).toBe("critical");
  });
  it("comandos com erro: 1 a 4 atenção, 5 ou mais crítico", () => {
    expect(item({ ...base, commandErrors24h: 4 }, "commands").level).toBe("warn");
    expect(item({ ...base, commandErrors24h: 5 }, "commands").level).toBe("critical");
  });
});
