import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Coins, Cpu, KeyRound, Loader2, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  deleteByokKey,
  getAiOverview,
  saveAiMode,
  saveByokKey,
  testAiProvider,
} from "@/lib/ai/ai-config.functions";

export const Route = createFileRoute("/master/ia-creditos")({
  head: brandedRouteHead("IA e créditos"),
  component: AiCreditsPage,
});

type Overview = Awaited<ReturnType<typeof getAiOverview>>;
type Mode = "lovable" | "openai" | "anthropic" | "openrouter" | "gemini";
type Byok = Exclude<Mode, "lovable">;
const MODES: Mode[] = ["lovable", "openai", "anthropic", "openrouter", "gemini"];
const MODE_LABEL: Record<Mode, string> = {
  lovable: "Lovable AI (gerenciada)",
  openai: "OpenAI (chave própria)",
  anthropic: "Anthropic (chave própria)",
  openrouter: "OpenRouter (chave própria)",
  gemini: "Google Gemini — API direta",
};
const KEY_NAME: Record<Byok, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  gemini: "Google Gemini",
};

function AiCreditsPage() {
  const load = useServerFn(getAiOverview);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await load({ data: { days } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar.");
    }
  }, [load, days]);
  useEffect(() => void refresh(), [refresh]);

  if (!data) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  const m = data.metrics;
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">IA e créditos</h1>
        <p className="text-sm text-muted-foreground">
          Duas contas diferentes: os <strong>créditos</strong> que você vende ao assinante e o{" "}
          <strong>custo real de IA</strong> que você paga.
        </p>
      </div>

      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
          >
            {d} dias
          </Button>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <SectionTitle icon={Coins} title="1. Créditos dos assinantes" />
        <p className="text-sm text-muted-foreground">
          1 crédito = 1 resposta ou ação da IA para o assinante (lançamento, leitura de comprovante,
          pergunta). Se a IA falhar, o crédito é devolvido automaticamente. Dias grátis e créditos
          por plano/trial continuam em{" "}
          <Link to="/master/planos" className="underline">
            Planos
          </Link>
          .
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Ações de IA" value={m.aiActions} />
          <Stat label="Créditos consumidos" value={m.creditsConsumed} />
          <Stat label="Reembolsos por falha" value={m.refunds} />
          <Stat label="Créditos concedidos" value={m.creditsGranted} />
          <Stat label="Saldo total hoje" value={m.totalBalance} />
          <Stat label="Assinantes em trial" value={m.subscribersInTrial} />
        </div>
        {m.top.length > 0 && (
          <div className="text-sm">
            <p className="font-semibold mb-1">Quem mais usou no período</p>
            <ul className="divide-y rounded-lg border">
              {m.top.map((item) => (
                <li key={item.id} className="flex justify-between px-3 py-1.5">
                  <span className="truncate">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.used} usados · saldo {item.balance}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <SectionTitle icon={Wallet} title="2. Seu custo real de IA" />
        <p className="text-sm text-muted-foreground">
          Com a Lovable AI gerenciada, o uso de IA é cobrado no seu workspace da Lovable. Este
          painel não consegue ler esse saldo — confira em <strong>Cloud → Usage</strong> no editor
          da Lovable. Aqui mostramos só o que o app conta de verdade: {m.aiActions} chamadas de IA
          cobradas em créditos nos últimos {m.days} dias.
        </p>
        <p className="text-xs text-muted-foreground">
          Dica de custo: o modo otimizado usa o modelo Flash, mais barato, em todas as rotinas.
          Desligue só se precisar de mais qualidade em textos longos.
        </p>
      </Card>

      <ProviderCard data={data} onChanged={refresh} />
    </main>
  );
}

function ProviderCard({ data, onChanged }: { data: Overview; onChanged: () => void }) {
  const saveMode = useServerFn(saveAiMode);
  const [mode, setMode] = useState<Mode>(data.config.mode);
  const [model, setModel] = useState<string>(
    data.config.model || data.models[data.config.mode][0]?.id || "",
  );
  const test = useServerFn(testAiProvider);
  const [testResult, setTestResult] = useState<{ ok: boolean; ms: number; message: string } | null>(null);
  const activeModelLabel =
    data.models[data.config.mode].find((m) => m.id === data.config.model)?.label ||
    data.config.model ||
    "modelo padrão";
  const [optimized, setOptimized] = useState(data.config.optimized);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(kind: string, fn: () => Promise<any>) {
    setBusy(kind);
    try {
      const result = await fn();
      if (result && result.ok === false) toast.error(result.message);
      else toast.success(result?.message || "Salvo.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={Cpu} title="3. Provedor de IA (um por vez)" />
        <Badge>Ativo: {MODE_LABEL[data.config.mode]}</Badge>
      </div>
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
        <p className="font-semibold">
          Ativo agora: {MODE_LABEL[data.config.mode]} · {activeModelLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          Último teste:{" "}
          {data.config.testOk === null
            ? "ainda não testado"
            : `${data.config.testOk ? "ok" : "falhou"}${data.config.testedAt ? ` em ${new Date(data.config.testedAt).toLocaleString("pt-BR")}` : ""}${data.config.lastTestMs ? ` · ${data.config.lastTestMs} ms` : ""}`}
          . A MIA usa este modelo no app e no WhatsApp.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {MODES.map((item) => {
          const byok = item === "lovable" ? null : data.byok[item];
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setModel(
                  item === data.config.mode && data.config.model
                    ? data.config.model
                    : data.models[item][0]?.id || "",
                );
                setTestResult(null);
              }}
              className={`rounded-xl border p-3 text-left text-sm ${mode === item ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <p className="font-semibold">{MODE_LABEL[item]}</p>
              <p className="text-xs text-muted-foreground">
                {item === "lovable"
                  ? "Pronto automaticamente em cada clone. Sem chave para configurar."
                  : byok?.configured
                    ? `Chave salva (…${byok.last4}) · ${byok.testOk ? "validada" : "validação automática pendente"}`
                    : "Nenhuma chave salva — insira a API Key abaixo"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
        <div className="space-y-1">
          <Label htmlFor="ai-model">Modelo</Label>
          <select
            id="ai-model"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {data.models[mode].map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </div>
        {(mode === "lovable" || mode === "openai" || mode === "anthropic") && (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={optimized} onCheckedChange={setOptimized} /> Modo otimizado (usa o modelo econômico)
        </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={busy !== null}
          onClick={() => run("save", () => saveMode({ data: { mode, model, optimized } }))}
        >
          {busy === "save" && <Loader2 className="size-4 animate-spin" />} Ativar modelo
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("test");
            try {
              setTestResult(await test({ data: { provider: mode, model } }));
            } catch (error) {
              setTestResult({ ok: false, ms: 0, message: error instanceof Error ? error.message : "Falha." });
            } finally {
              setBusy(null);
            }
          }}
        >
          {busy === "test" && <Loader2 className="size-4 animate-spin" />} Testar conexão
        </Button>
        <span className="text-xs text-muted-foreground">
          {mode === "lovable"
            ? "Nenhum teste ou chave é necessário."
            : "A disponibilidade é validada automaticamente ao salvar e ativar."}
        </span>
      </div>

      {testResult && (
        <p
          className={`rounded-md border p-2 text-xs ${testResult.ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
        >
          {testResult.ok ? "Conexão ok" : "Teste falhou"} ({testResult.ms} ms): {testResult.message}
        </p>
      )}

      {data.config.lastError && data.config.mode !== "lovable" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          Último erro do provedor (a IA respondeu pela Lovable AI): {data.config.lastError}
        </p>
      )}

      {mode !== "lovable" && (
        <ByokForm key={mode} provider={mode} model={model} data={data} onChanged={onChanged} />
      )}

      <p className="flex gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" /> Chaves próprias ficam criptografadas no servidor
        e nunca são exibidas de novo — só os 4 últimos caracteres. Cada chave é validada com uma chamada real
        ao salvar, e um modelo só é ativado depois de responder ao teste.
      </p>
    </Card>
  );
}

function ByokForm({
  provider,
  model,
  data,
  onChanged,
}: {
  provider: Byok;
  model: string;
  data: Overview;
  onChanged: () => void;
}) {
  const save = useServerFn(saveByokKey);
  const remove = useServerFn(deleteByokKey);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const item = data.byok[provider];
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="size-4" /> Chave {KEY_NAME[provider]}
        {item.configured && <Badge variant="secondary">…{item.last4}</Badge>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          type="password"
          autoComplete="off"
          className="h-8 max-w-sm"
          placeholder={
            item.configured ? "Substituir chave salva" : "Cole a chave quando decidir usar"
          }
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy || key.trim().length < 20}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await save({ data: { provider, apiKey: key, model } });
              setKey("");
              toast.success(result?.message || "Chave validada e salva com segurança.");
              onChanged();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Salvar configuração
        </Button>
        {item.configured && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              try {
                await remove({ data: { provider } });
                toast.success("Chave removida.");
                onChanged();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Falha ao remover.");
              }
            }}
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Sparkles; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-display font-bold">
      <Icon className="size-5 text-primary" /> {title}
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <strong className="block text-lg">{value.toLocaleString("pt-BR")}</strong>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
