import { describe, expect, it } from "vitest";
import { resolveModel } from "@/lib/ai/ai-model-rules";

describe("resolveModel", () => {
  it("optimized mode uses the economy model of the provider", () => {
    expect(resolveModel("gemini", "gemini-3.1-pro-preview", true)).toBe("gemini-3.8-flash");
    expect(resolveModel("openai", "gpt-6-sol", true)).toBe("gpt-5-mini");
    expect(resolveModel("anthropic", "claude-sonnet-5-5", true)).toBe("claude-haiku-5-5");
    expect(resolveModel("deepseek", "deepseek-reasoner", true)).toBe("deepseek-chat");
    expect(resolveModel("xai", "grok-2-1212", true)).toBe("grok-4.7");
  });

  it("non-optimized uses the chosen model", () => {
    expect(resolveModel("gemini", "gemini-3.6-flash", false)).toBe("gemini-3.6-flash");
    expect(resolveModel("anthropic", "claude-sonnet-5-5", false)).toBe("claude-sonnet-5-5");
    expect(resolveModel("openai", "gpt-6-sol", false)).toBe("gpt-6-sol");
    expect(resolveModel("deepseek", "deepseek-reasoner", false)).toBe("deepseek-reasoner");
  });

  it("unknown chosen model falls back to economy", () => {
    expect(resolveModel("openai", "claude-haiku-5-5", false)).toBe("gpt-5-mini");
    expect(resolveModel("gemini", "desconhecido-x", false)).toBe("gemini-3.8-flash");
  });
});
