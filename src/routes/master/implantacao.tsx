import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Circle, Copy, ExternalLink, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { MiaAvatar } from "@/components/finance/mia-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { getMasterSetupProgress, type MasterSetupCheck } from "@/lib/master/master-setup.functions";

export const Route = createFileRoute("/master/implantacao")({
  head: brandedRouteHead(
    "Sua marca",
    "Veja a identidade atual do MIAnota e gere o prompt para personalizá-la na Lovable.",
  ),
  component: BrandPage,
});

const SITE_URL = "https://mianota.lovable.app";

const WHERE = [
  { place: "Site e página de planos", to: "/" },
  { place: "App do assinante (menu, telas, chat)", to: "/app/inicio" },
  { place: "Mensagens da MIA no WhatsApp", to: "/master/conversas" },
  { place: "Relatório mensal em PDF", to: "/master/painel" },
  { place: "Notificações no celular", to: "/master/painel" },
] as const;

const AFTER_IDS: MasterSetupCheck["id"][] = ["plans", "payments", "support", "first_company"];

function buildBrandPrompt(input: { name: string; tagline: string; color: string; audience: string; notes: string }) {
  return [
    `Atualize a identidade do sistema em todo o projeto, sem alterar regras, preços ou dados:`,
    `- Nome do sistema: "${input.name}"`,
    `- Slogan: "${input.tagline}"`,
    `- Cor principal: ${input.color} (use como token do tema, funcionando no modo claro e escuro)`,
    input.audience ? `- Público: ${input.audience}` : "",
    `- Mantenha a assistente com o nome "MIA".`,
    `- Aplique no site, app do assinante, mensagens do WhatsApp, notificações, PDF mensal e títulos das páginas.`,
    input.notes ? `- Observações: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function BrandPage() {
  const brand = useBrand();
  const getProgress = useServerFn(getMasterSetupProgress);
  const [checks, setChecks] = useState<MasterSetupCheck[] | null>(null);
  const [form, setForm] = useState({
    name: brand.name,
    tagline: brand.tagline,
    color: brand.primary,
    audience: "",
    notes: "",
  });
  const prompt = useMemo(() => buildBrandPrompt(form), [form]);

  useEffect(() => {
    getProgress()
      .then((d) => setChecks(d.checks))
      .catch(() => setChecks([]));
  }, [getProgress]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado. Cole no chat do projeto na Lovable.");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <MiaAvatar className="size-20" />
          <div className="flex-1">
            <Badge variant="secondary" className="gap-1">
              <Palette className="size-3.5" /> identidade atual
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight">{brand.name}</h1>
            <p className="text-muted-foreground">{brand.tagline}</p>
            <p className="mt-1 text-sm">
              Assistente: <strong>{brand.assistantName}</strong>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="size-6 rounded-md border bg-primary" /> Principal {brand.primary}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="size-6 rounded-md border bg-accent" /> Destaque {brand.accent}
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={SITE_URL} target="_blank" rel="noreferrer">
                Ver site <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h2 className="font-display text-lg font-black">Gerar prompt de marca</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A marca muda pelo projeto na Lovable, não por este painel. Ajuste os campos, copie e cole no chat do projeto.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="b-name">Nome do sistema</Label>
              <Input id="b-name" value={form.name} onChange={set("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-tag">Slogan</Label>
              <Input id="b-tag" value={form.tagline} onChange={set("tagline")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-color">Cor principal</Label>
              <div className="flex gap-2">
                <Input id="b-color" type="color" value={form.color} onChange={set("color")} className="w-14 p-1" />
                <Input value={form.color} onChange={set("color")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-aud">Público (opcional)</Label>
              <Input id="b-aud" placeholder="Ex.: autônomos e famílias" value={form.audience} onChange={set("audience")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-notes">Observações (opcional)</Label>
              <Textarea id="b-notes" rows={2} value={form.notes} onChange={set("notes")} />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <h2 className="font-display text-lg font-black">Prompt pronto</h2>
          <pre className="mt-3 flex-1 whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 text-xs leading-5">{prompt}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void copy()}>
              <Copy className="size-4" /> Copiar prompt
            </Button>
            <Button asChild variant="outline">
              <a href="https://lovable.dev/projects" target="_blank" rel="noreferrer">
                Abrir meus projetos <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-black">Onde a marca aparece</h2>
          <ul className="mt-3 divide-y">
            {WHERE.map((w) => (
              <li key={w.place} className="flex items-center justify-between py-2.5 text-sm">
                {w.place}
                <Link to={w.to} className="text-primary hover:underline">
                  ver
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-black">Depois da marca</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/master/checklist">
                Checklist completo <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="mt-3 grid gap-2">
            {(checks ?? []).filter((c) => AFTER_IDS.includes(c.id)).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                {c.ready ? <Check className="size-4 text-success" /> : <Circle className="size-4 text-primary" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.detail}</p>
                </div>
                <Button asChild size="sm" variant={c.ready ? "ghost" : "outline"}>
                  <Link to={c.to as never}>{c.action}</Link>
                </Button>
              </li>
            ))}
            {checks === null ? <li className="text-sm text-muted-foreground">Conferindo…</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
