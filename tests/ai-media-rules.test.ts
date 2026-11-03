import { describe, expect, it } from "vitest";
import { maskKey, partsNeedingConversion, readGeminiText, toGeminiRequest } from "@/lib/ai/ai-media-rules";

const img = { type: "image_url" as const, image_url: { url: "data:image/png;base64,AAA" } };
const pdf = { type: "file" as const, file: { filename: "r.pdf", file_data: "data:application/pdf;base64,BBB" } };

describe("ai-media-rules", () => {
  it("Gemini recebe system separado, papel model e anexos inline", () => {
    const body: any = toGeminiRequest([
      { role: "system", content: "Você é a MIA" },
      { role: "assistant", content: "Oi" },
      { role: "user", content: [{ type: "text", text: "lê" }, img, pdf] },
    ]);
    expect(body.system_instruction.parts[0].text).toBe("Você é a MIA");
    expect(body.contents[0].role).toBe("model");
    expect(body.contents[1].parts[1]).toEqual({ inline_data: { mime_type: "image/png", data: "AAA" } });
    expect(body.contents[1].parts[2].inline_data.mime_type).toBe("application/pdf");
  });
  it("modelo só texto precisa converter imagem e PDF", () => {
    const msgs = [{ role: "user" as const, content: [img, pdf] }];
    expect(partsNeedingConversion(msgs, { vision: false, pdf: false, audio: false })).toHaveLength(2);
    expect(partsNeedingConversion(msgs, { vision: true, pdf: false, audio: false })).toHaveLength(1);
    expect(partsNeedingConversion(msgs, { vision: true, pdf: true, audio: true })).toHaveLength(0);
  });
  it("lê texto da resposta Gemini", () => {
    expect(readGeminiText({ candidates: [{ content: { parts: [{ text: "o" }, { text: "k" }] } }] })).toBe("ok");
  });
  it("máscara nunca revela a chave inteira", () => {
    expect(maskKey("sk-or-v1-abcdef1234567890wxyz")).toBe("sk-or-…wxyz");
    expect(maskKey("AIzaSyABCDEFGHIJ1234")).toBe("AIza…1234");
  });
});
