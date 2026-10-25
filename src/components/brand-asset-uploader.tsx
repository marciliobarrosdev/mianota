import { useState, type ChangeEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/auth/realm-supabase";
import { ensureBrandAssetBucket } from "@/lib/brand-storage.functions";

const BRAND_BUCKET = "clone-brand-assets";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 4096;
const MIME_EXTENSION: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type BrandAssetKind = "logo" | "icon" | "avatar";

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("A imagem não pôde ser lida."));
    };
    image.src = objectUrl;
  });
}

function validateFile(file: File, kind: BrandAssetKind) {
  const extension = MIME_EXTENSION[file.type];
  if (!extension) throw new Error("Use uma imagem PNG, JPG ou WebP.");
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("A imagem precisa ter no máximo 5 MB.");
  }
  return extension;
}

async function normalizePwaIcon(file: File, size: 192 | 512): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("O ícone não pôde ser convertido."));
      next.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar o ícone.");
    context.drawImage(image, 0, 0, size, size);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error("O ícone não pôde ser convertido."))),
        "image/png",
      ),
    );
    return new File([blob], `icone-${size}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function BrandAssetUploader({
  kind,
  onUploaded,
}: {
  kind: BrandAssetKind;
  onUploaded: (publicUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const ensureBucket = useServerFn(ensureBrandAssetBucket);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      validateFile(file, kind);
      const { width, height } = await imageDimensions(file);
      if (!width || !height || width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) {
        throw new Error("Use uma imagem válida com até 4096 × 4096 px.");
      }
      if (kind === "icon" && width !== height) {
        throw new Error("O ícone do aplicativo precisa ser quadrado.");
      }

      await ensureBucket();
      const assetId = globalThis.crypto.randomUUID();
      let path: string;
      if (kind === "icon") {
        const uploadedPaths: string[] = [];
        try {
          for (const size of [192, 512] as const) {
            const uploadFile = await normalizePwaIcon(file, size);
            validateFile(uploadFile, kind);
            const variantPath = `${kind}/${assetId}-${size}.png`;
            const { error } = await supabase.storage
              .from(BRAND_BUCKET)
              .upload(variantPath, uploadFile, {
                cacheControl: "31536000",
                contentType: uploadFile.type,
                upsert: false,
              });
            if (error) throw new Error(error.message);
            uploadedPaths.push(variantPath);
          }
        } catch (error) {
          if (uploadedPaths.length) await supabase.storage.from(BRAND_BUCKET).remove(uploadedPaths);
          throw error;
        }
        path = `${kind}/${assetId}-512.png`;
      } else {
        const extension = validateFile(file, kind);
        path = `${kind}/${assetId}.${extension}`;
        const { error } = await supabase.storage.from(BRAND_BUCKET).upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
      }

      onUploaded(`/api/public/brand-asset?path=${encodeURIComponent(path)}`);
      toast.success("Upload concluído. Agora clique em Aplicar minha marca.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      input.value = "";
      setUploading(false);
    }
  }

  return (
    <div className="relative rounded-xl border border-dashed border-[color:var(--brand)]/35 bg-[color:var(--brand-soft)] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[color:var(--brand-text)]">
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? "Enviando imagem…" : "Enviar do computador ou celular"}
      </div>
      <Input
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        disabled={uploading}
        onChange={handleFile}
        aria-label={`Enviar ${kind}`}
        className="h-10 cursor-pointer bg-background text-xs file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
      />
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
        PNG, JPG ou WebP · até 5 MB · máximo 4096 px
        {kind === "icon" ? " · quadrado (gera 192 e 512 px)" : ""}
      </p>
    </div>
  );
}
