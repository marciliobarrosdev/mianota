import { describe, expect, it } from "vitest";
import { circuitAfterFailure, circuitAfterSuccess, isProviderPaused } from "@/lib/ai/ai-circuit-rules";

const now = new Date("2026-11-18T20:00:00.000Z");

describe("pausa automática do provedor de IA", () => {
  it("não pausa nas duas primeiras falhas seguidas", () => {
    expect(circuitAfterFailure(0, now)).toEqual({ consecutive_failures: 1, paused_until: null });
    expect(circuitAfterFailure(1, now)).toEqual({ consecutive_failures: 2, paused_until: null });
  });

  it("pausa por 5 minutos na terceira falha seguida", () => {
    expect(circuitAfterFailure(2, now)).toEqual({
      consecutive_failures: 3,
      paused_until: "2026-11-18T20:05:00.000Z",
    });
  });

  it("volta a pausar se a tentativa após a pausa também falhar", () => {
    expect(circuitAfterFailure(3, now).paused_until).toBe("2026-11-18T20:05:00.000Z");
  });

  it("uma resposta bem-sucedida zera falhas e encerra a pausa", () => {
    expect(circuitAfterSuccess()).toEqual({ consecutive_failures: 0, paused_until: null });
  });

  it("considera pausado só até o horário final", () => {
    expect(isProviderPaused("2026-11-18T20:05:00.000Z", now)).toBe(true);
    expect(isProviderPaused("2026-11-18T19:59:59.000Z", now)).toBe(false);
    expect(isProviderPaused(null, now)).toBe(false);
  });
});
