/** Regras puras da foto do assinante (sem DOM, sem banco). */
export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Tamanho final salvo (quadrado). */
export const AVATAR_OUTPUT_SIZE = 256;
/** Limite do texto da imagem otimizada salva no cadastro. */
export const AVATAR_MAX_DATA_URL_LENGTH = 400_000;

export function avatarFileError(file: { type: string; size: number }): string | null {
  if (!(AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return "Use uma imagem JPEG, PNG ou WebP.";
  }
  if (file.size > AVATAR_MAX_BYTES) return "A imagem precisa ter no máximo 2 MB.";
  if (file.size <= 0) return "Arquivo vazio.";
  return null;
}

export function avatarDimensionsError(width: number, height: number): string | null {
  if (!width || !height) return "Não foi possível ler a imagem.";
  // Tolera 1% de diferença por arredondamentos de editores de imagem.
  if (Math.abs(width - height) / Math.max(width, height) > 0.01) {
    return `A imagem precisa ser quadrada (1:1). Esta tem ${width}×${height}.`;
  }
  return null;
}

/** Normaliza o valor recebido no servidor: null limpa, string precisa ser data URL válida ou https. */
export function normalizeAvatarValue(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const v = String(value);
  if (/^https:\/\/\S+$/.test(v) && v.length <= 2000) return v;
  if (v.length > AVATAR_MAX_DATA_URL_LENGTH) throw new Error("Imagem do assinante muito grande.");
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) {
    throw new Error("Imagem do assinante inválida. Use JPEG, PNG ou WebP.");
  }
  return v;
}
