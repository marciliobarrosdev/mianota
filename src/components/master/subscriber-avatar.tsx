import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { cn } from "@/lib/utils";
import {
  AVATAR_OUTPUT_SIZE,
  avatarDimensionsError,
  avatarFileError,
} from "@/lib/master/subscriber-avatar-rules";

export function SubscriberAvatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name ? `Foto de ${name}` : "Foto do assinante"}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return <InitialsAvatar name={name} size={size} className={className} />;
}

async function fileToAvatar(file: File): Promise<string> {
  const fileErr = avatarFileError(file);
  if (fileErr) throw new Error(fileErr);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const dimErr = avatarDimensionsError(img.naturalWidth, img.naturalHeight);
    if (dimErr) throw new Error(dimErr);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(img, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
    let out = canvas.toDataURL("image/webp", 0.85);
    if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/jpeg", 0.85);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SubscriberAvatarInput({
  value,
  onChange,
  name,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  name?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToAvatar(file));
    } catch (err: any) {
      setError(err?.message ?? "Imagem inválida.");
      toast.error(err?.message ?? "Imagem inválida.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <SubscriberAvatar name={name || "?"} src={value} size={72} />
      <div className="space-y-1.5">
        <div className="text-sm font-medium">Inserir imagem do assinante</div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <ImagePlus className="size-3.5 mr-1" />}
            {value ? "Trocar imagem" : "Escolher imagem"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <Trash2 className="size-3.5 mr-1" /> Remover
            </Button>
          )}
        </div>
        <p className={cn("text-[11px]", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? "JPEG, PNG ou WebP · quadrada (1:1) · até 2 MB (opcional)"}
        </p>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
      </div>
    </div>
  );
}
