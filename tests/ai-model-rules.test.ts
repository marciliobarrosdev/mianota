import { describe, expect, it } from "vitest";
import { resolveModel } from "../src/lib/ai-model-rules";

describe("resolveModel", () => {
  it("optimized mode uses the economy model of the provider", () => {
    expect(resolveModel("openai", "gpt-5.2", true)).toBe("gpt-5-mini");
    expect(resolveModel("anthropic", "claude-opus-4-1", true)).toBe("claude-haiku-4-5");
  });
  it("non-optimized uses the chosen model", () => {
    expect(resolveModel("anthropic", "claude-sonnet-4-5", false)).toBe("claude-sonnet-4-5");
    expect(resolveModel("lovable", "openai/gpt-6-astra", false)).toBe("openai/gpt-6-astra");
  });
  it("unknown chosen model falls back to economy", () => {
    expect(resolveModel("openai", "claude-haiku-4-5", false)).toBe("gpt-5-mini");
  });
});
