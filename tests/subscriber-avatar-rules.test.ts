import { describe, expect, it } from "vitest";
import { avatarDimensionsError, avatarFileError, normalizeAvatarValue } from "@/lib/master/subscriber-avatar-rules";

describe("foto do assinante", () => {
  it("aceita jpeg, png e webp até 2 MB", () => {
    expect(avatarFileError({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(avatarFileError({ type: "image/png", size: 1000 })).toBeNull();
    expect(avatarFileError({ type: "image/webp", size: 1000 })).toBeNull();
  });
  it("recusa outros formatos", () => {
    expect(avatarFileError({ type: "image/gif", size: 1000 })).not.toBeNull();
  });
  it("recusa acima de 2 MB", () => {
    expect(avatarFileError({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("exige formato 1:1", () => {
    expect(avatarDimensionsError(500, 500)).toBeNull();
    expect(avatarDimensionsError(800, 600)).not.toBeNull();
  });
  it("servidor recusa conteúdo que não é imagem", () => {
    expect(() => normalizeAvatarValue("data:text/html;base64,AAAA")).toThrow();
    expect(normalizeAvatarValue("")).toBeNull();
    expect(normalizeAvatarValue("data:image/webp;base64,AAAA")).toBe("data:image/webp;base64,AAAA");
  });
});
