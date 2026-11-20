import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Image as ImageIcon, Loader2, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";

export interface MediaPayload {
  mediaType: "image" | "video" | "audio" | "document";
  base64Data: string;
  mimeType: string;
  fileName: string;
  caption: string;
}

interface SendMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (payload: MediaPayload) => Promise<void>;
}

export function SendMediaDialog({
  open,
  onOpenChange,
  onSend,
}: SendMediaDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setSubmitting(false);
  }

  async function handleSend() {
    if (!file) return;
    setSubmitting(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.replace(/^data:[^;]+;base64,/, ""));
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      let mediaType: "image" | "video" | "audio" | "document" = "document";
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("video/")) mediaType = "video";
      else if (file.type.startsWith("audio/")) mediaType = "audio";

      await onSend({
        mediaType,
        base64Data,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        caption,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao preparar arquivo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) reset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-primary" /> Enviar arquivo ou foto
          </DialogTitle>
          <DialogDescription>
            Envie imagens, vídeos ou documentos (PDF, planilhas) direto pelo WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!file ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 hover:bg-muted/40 cursor-pointer transition-colors">
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary mb-3">
                <ImageIcon className="size-6" />
              </div>
              <span className="text-sm font-semibold">Clique para selecionar um arquivo</span>
              <span className="text-xs text-muted-foreground mt-1">
                PNG, JPG, MP4, PDF, DOCX (até 16MB)
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-3">
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border max-h-56 grid place-items-center bg-black/5">
                  <img src={previewUrl} alt="Preview" className="max-h-56 object-contain" />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-muted/40">
                  <FileText className="size-8 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{file.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    Trocar
                  </Button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="caption" className="text-xs">
                  Legenda (opcional)
                </Label>
                <Input
                  id="caption"
                  placeholder="Escreva uma legenda para o arquivo…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button disabled={!file || submitting} onClick={handleSend}>
            {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Enviar pelo WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SendLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (loc: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => Promise<void>;
}

export function SendLocationDialog({
  open,
  onOpenChange,
  onSend,
}: SendLocationDialogProps) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setLat("");
    setLng("");
    setName("");
    setAddress("");
    setLocating(false);
    setSubmitting(false);
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não é suportada pelo seu navegador.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setName("Minha localização atual");
        setLocating(false);
        toast.success("Coordenadas obtidas via GPS.");
      },
      (err) => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  async function handleSend() {
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    if (isNaN(nLat) || isNaN(nLng)) {
      toast.error("Informe latitude e longitude válidas.");
      return;
    }
    setSubmitting(true);
    try {
      await onSend({
        latitude: nLat,
        longitude: nLng,
        name: name.trim() || undefined,
        address: address.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar localização.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) reset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-red-500" /> Compartilhar Localização
          </DialogTitle>
          <DialogDescription>
            Envie coordenadas geográficas nativas para o WhatsApp do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2 border-red-200 hover:bg-red-50 text-red-950"
            disabled={locating}
            onClick={handleGetCurrentLocation}
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4 text-red-500" />}
            Usar minha localização atual (GPS)
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lat" className="text-xs">Latitude</Label>
              <Input
                id="lat"
                placeholder="-23.550520"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lng" className="text-xs">Longitude</Label>
              <Input
                id="lng"
                placeholder="-46.633308"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="loc-name" className="text-xs">Nome do Local (opcional)</Label>
            <Input
              id="loc-name"
              placeholder="Ex: Escritório Central MIAnota"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="loc-addr" className="text-xs">Endereço (opcional)</Label>
            <Input
              id="loc-addr"
              placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={!lat.trim() || !lng.trim() || submitting}
            onClick={handleSend}
          >
            {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Enviar Localização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImageLightboxProps {
  url: string | null;
  onClose: () => void;
}

export function ImageLightbox({ url, onClose }: ImageLightboxProps) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt="Visualização ampliada"
          className="max-h-[85vh] max-w-[85vw] object-contain"
        />
        <Button
          variant="outline"
          size="sm"
          className="absolute top-3 right-3 bg-black/60 text-white border-white/20 hover:bg-black/80"
          onClick={onClose}
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
