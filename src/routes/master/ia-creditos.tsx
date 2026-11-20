/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Cpu,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
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
  reindexAllEmbeddings,
  saveAiMode,
  saveByokKey,
  testAiEmbedding,
  testAiProvider,
} from "@/lib/ai/ai-config.functions";

export const Route = createFileRoute("/master/ia-creditos")({
  head: brandedRouteHead("IA e créditos"),
  component: AiCreditsPage,
});

type Overview = Awaited<ReturnType<typeof getAiOverview>>;
type ProviderKey = "gemini" | "openrouter" | "deepseek" | "xai" | "openai" | "anthropic";

const PROVIDERS: { key: ProviderKey; name: string; desc: string; defaultModel: string; envVar: string }[] = [
  {
    key: "gemini",
    name: "Google Gemini",
    desc: "API direta Google AI. Modelo principal da MIA e embeddings nativos.",
    defaultModel: "gemini-3.8-flash",
    envVar: "GEMINI_API_KEY",
  },
  {
    key: "openrouter",
    name: "OpenRouter",
    desc: "Roteador multi-provedor unificado (DeepSeek, Llama, Qwen, Claude, etc).",
    defaultModel: "google/gemini-2.5-flash",
    envVar: "OPENROUTER_API_KEY",
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    desc: "DeepSeek API direta para raciocínio e alta performance econômica.",
    defaultModel: "deepseek-chat",
    envVar: "DEEPSEEK_API_KEY",
  },
  {
    key: "xai",
    name: "xAI (Grok)",
    desc: "API oficial xAI Grok direta com baixa latência.",
    defaultModel: "grok-2-latest",
    envVar: "XAI_API_KEY",
  },
  {
    key: "openai",
    name: "OpenAI",
    desc: "GPT-4o, GPT-4o-mini e text-embedding-3 nativos.",
    defaultModel: "gpt-4o-mini",
    envVar: "OPENAI_API_KEY",
  },
  {
    key: "anthropic",
    name: "Anthropic",
    desc: "Claude 3.5 Sonnet e Haiku para precisão analítica.",
    defaultModel: "claude-3-5-haiku-latest",
    envVar: "ANTHROPIC_API_KEY",
  },
];

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
          Gestão centralizada do motor de IA da MIA: Google Gemini direto (padrão), 6 provedores homologados,
          fallback automático de LLM e busca semântica vetorial com <strong>pgvector</strong>.
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

      {/* Seção 1: Créditos */}
      <Card className="p-4 space-y-3">
        <SectionTitle icon={Coins} title="1. Créditos dos assinantes" />
        <p className="text-sm text-muted-foreground">
          1 crédito = 1 resposta ou ação da IA para o assinante (lançamento, leitura de comprovante,
          resumo de saldo). Se a chamada falhar ou for cancelada, o crédito é estornado automaticamente.
          Gerencie planos em{" "}
          <Link to="/master/planos" className="underline">
            Planos
          </Link>
          .
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Ações de IA" value={m.aiActions} />
          <Stat label="Créditos consumidos" value={m.creditsConsumed} />
          <Stat label="Estornos automáticos" value={m.refunds} />
          <Stat label="Créditos concedidos" value={m.creditsGranted} />
          <Stat label="Saldo total assinantes" value={m.totalBalance} />
          <Stat label="Assinantes em teste" value={m.subscribersInTrial} />
        </div>
      </Card>

      {/* Seção 2: Custo real e métricas */}
      <Card className="p-4 space-y-2">
        <SectionTitle icon={Wallet} title="2. Custo real e eficiência" />
        <p className="text-sm text-muted-foreground">
          O MIAnota opera diretamente via API keys de backend sem intermediários ou sobretaxas.
          Total de {m.aiActions} requisições processadas nos últimos {m.days} dias.
        </p>
      </Card>

      {/* Seção 3: Configuração do Motor de IA */}
      <AiOrchestratorCard data={data} onChanged={refresh} />
    </main>
  );
}

function AiOrchestratorCard({ data, onChanged }: { data: Overview; onChanged: () => void }) {
  const saveMode = useServerFn(saveAiMode);
  const testLlm = useServerFn(testAiProvider);
  const testEmbed = useServerFn(testAiEmbedding);
  const reindex = useServerFn(reindexAllEmbeddings);

  const [mode, setMode] = useState<string>(data.config.mode || "gemini");
  const [model, setModel] = useState<string>(
    data.config.model || data.models[data.config.mode]?.[0]?.id || "gemini-3.8-flash",
  );
  const [optimized, setOptimized] = useState(data.config.optimized);

  // Fallback LLM state
  const [fallbackEnabled, setFallbackEnabled] = useState(data.config.fallbackEnabled);
  const [fallbackMode, setFallbackMode] = useState<string>(data.config.fallbackMode || "openrouter");
  const [fallbackModel, setFallbackModel] = useState<string>(
    data.config.fallbackModel || data.models[data.config.fallbackMode || "openrouter"]?.[0]?.id || "",
  );

  // Embeddings state
  const [embeddingProvider, setEmbeddingProvider] = useState<string>(data.config.embeddingProvider || "gemini");
  const [embeddingModel, setEmbeddingModel] = useState<string>(data.config.embeddingModel || "gemini-embedding-2");
  const [embeddingDimension, setEmbeddingDimension] = useState<number>(data.config.embeddingDimension || 768);

  const [testResult, setTestResult] = useState<{ ok: boolean; ms: number; message: string } | null>(null);
  const [embedResult, setEmbedResult] = useState<{ ok: boolean; ms: number; dimension: number; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Sincroniza seletor de modelos ao trocar de provedor
  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    const available = data.models[newMode] || [];
    setModel(available[0]?.id || "");
    setTestResult(null);
  };

  const handleFallbackModeChange = (newMode: string) => {
    setFallbackMode(newMode);
    const available = data.models[newMode] || [];
    setFallbackModel(available[0]?.id || "");
  };

  async function handleSave() {
    setBusy("save");
    try {
      const res = await saveMode({
        data: {
          mode,
          model,
          optimized,
          fallbackEnabled,
          fallbackMode: fallbackEnabled ? fallbackMode : null,
          fallbackModel: fallbackEnabled ? fallbackModel : null,
          embeddingProvider,
          embeddingModel,
          embeddingDimension,
        },
      });
      toast.success(res?.message || "Configurações salvas.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleTestLlm() {
    setBusy("test-llm");
    try {
      const res = await testLlm({ data: { provider: mode, model } });
      setTestResult(res);
      if (res.ok) toast.success(`Conexão OK com ${mode} (${res.ms}ms)`);
      else toast.error(res.message);
    } catch (err) {
      setTestResult({ ok: false, ms: 0, message: err instanceof Error ? err.message : "Erro desconhecido" });
      toast.error("Falha ao testar LLM.");
    } finally {
      setBusy(null);
    }
  }

  async function handleTestEmbed() {
    setBusy("test-embed");
    try {
      const res = await testEmbed({
        data: {
          provider: embeddingProvider,
          model: embeddingModel,
          dimension: embeddingDimension,
        },
      });
      setEmbedResult(res);
      if (res.ok) toast.success(`Embedding gerado com sucesso! Dimensão ${res.dimension} (${res.ms}ms)`);
      else toast.error(res.message);
    } catch (err) {
      setEmbedResult({ ok: false, ms: 0, dimension: 0, message: err instanceof Error ? err.message : "Erro desconhecido" });
      toast.error("Falha ao testar Embedding.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReindex() {
    setBusy("reindex");
    try {
      const res = await reindex({});
      toast.success(res.message);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reindexar.");
    } finally {
      setBusy(null);
    }
  }

  const activeProvider = PROVIDERS.find((p) => p.key === mode) || PROVIDERS[0];
  const activeMeta = (data.providers as any)?.[mode];

  return (
    <Card className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <SectionTitle icon={Cpu} title="3. Provedor Principal de IA (MIA)" />
        <Badge variant="default" className="text-xs">
          Ativo: {activeProvider.name} ({data.config.model})
        </Badge>
      </div>

      {/* Grid de seleção dos 6 provedores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((item) => {
          const provMeta = (data.providers as any)?.[item.key];
          const isSelected = mode === item.key;
          const isConfigured = provMeta?.configured;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleModeChange(item.key)}
              className={`rounded-xl border p-3 text-left transition-all relative ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{item.name}</span>
                {isConfigured ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50/50">
                    <CheckCircle2 className="size-3 mr-1" /> {provMeta.source === "env" ? "Ambiente" : "Salva"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    <AlertTriangle className="size-3 mr-1" /> Sem chave
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.desc}</p>
              <div className="mt-2 text-[11px] font-mono text-muted-foreground/80 flex items-center gap-1">
                <KeyRound className="size-3" /> {item.envVar}
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuração do Modelo Principal */}
      <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> Modelo do Provedor Selecionado ({activeProvider.name})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 items-center">
          <div className="space-y-1">
            <Label htmlFor="main-model">Modelo de Linguagem (LLM)</Label>
            <select
              id="main-model"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {(data.models[mode] || []).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={optimized} onCheckedChange={setOptimized} id="switch-opt" />
            <Label htmlFor="switch-opt" className="text-sm cursor-pointer">
              Modo Econômico Otimizado (usa modelo Flash para rotinas secundárias)
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={handleTestLlm}
          >
            {busy === "test-llm" ? <Loader2 className="size-4 animate-spin mr-1" /> : <RefreshCw className="size-4 mr-1" />}
            Testar Conexão LLM
          </Button>
          {activeMeta && (
            <span className="text-xs text-muted-foreground">
              Status da chave: {activeMeta.configured ? `Configurada (${activeMeta.source === "env" ? "Via variável de ambiente .env" : `Salva: …${activeMeta.last4}`})` : "Ausente nas variáveis de ambiente"}
            </span>
          )}
        </div>

        {testResult && (
          <div
            className={`rounded-lg border p-3 text-xs ${
              testResult.ok ? "border-emerald-500/30 bg-emerald-50/40 text-emerald-900 dark:text-emerald-300" : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
            <strong>{testResult.ok ? "Teste Aprovado" : "Teste Falhou"} ({testResult.ms}ms):</strong> {testResult.message}
          </div>
        )}
      </div>

      {/* Fallback Automático */}
      <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Fallback Automático de Provedor
            </h3>
            <p className="text-xs text-muted-foreground">
              Se o provedor principal sofrer timeout ou instabilidade (código 429/500/503), a MIA comuta instantaneamente para o fallback.
            </p>
          </div>
          <Switch checked={fallbackEnabled} onCheckedChange={setFallbackEnabled} />
        </div>

        {fallbackEnabled && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
            <div className="space-y-1">
              <Label>Provedor de Fallback</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={fallbackMode}
                onChange={(e) => handleFallbackModeChange(e.target.value)}
              >
                {PROVIDERS.filter((p) => p.key !== mode).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Modelo de Fallback</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={fallbackModel}
                onChange={(e) => setFallbackModel(e.target.value)}
              >
                {(data.models[fallbackMode] || []).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} — {opt.hint}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Seção 4: Busca Semântica e Embeddings (pgvector) */}
      <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Database className="size-4 text-primary" /> Busca Semântica Vetorial (pgvector)
            </h3>
            <p className="text-xs text-muted-foreground">
              Gera representações matemáticas dos lançamentos para busca inteligente na MIA pelo WhatsApp e aplicativo.
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
            pgvector v0.8.2 ativo
          </Badge>
        </div>

        {/* Estatísticas de cobertura de indexação */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border bg-background p-3 text-center">
            <span className="text-xs text-muted-foreground block">Cobertura de Busca</span>
            <strong className="text-xl font-bold text-primary">{data.coverage.coveragePct}%</strong>
          </div>
          <div className="rounded-lg border bg-background p-3 text-center">
            <span className="text-xs text-muted-foreground block">Lançamentos Indexados</span>
            <strong className="text-xl font-bold">{data.coverage.totalIndexed}</strong>
          </div>
          <div className="rounded-lg border bg-background p-3 text-center">
            <span className="text-xs text-muted-foreground block">Total de Lançamentos</span>
            <strong className="text-xl font-bold">{data.coverage.totalLancamentos}</strong>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          <div className="space-y-1">
            <Label>Provedor de Embedding</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={embeddingProvider}
              onChange={(e) => setEmbeddingProvider(e.target.value)}
            >
              <option value="gemini">Google Gemini (Recomendado)</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Modelo de Embedding</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
            >
              {embeddingProvider === "gemini" && (
                <>
                  <option value="gemini-embedding-2">gemini-embedding-2 (Padrão · 768 dim)</option>
                  <option value="text-embedding-004">text-embedding-004 (768 dim)</option>
                </>
              )}
              {embeddingProvider === "openai" && (
                <>
                  <option value="text-embedding-3-small">text-embedding-3-small (1536 dim)</option>
                  <option value="text-embedding-3-large">text-embedding-3-large (3072 dim)</option>
                </>
              )}
              {embeddingProvider === "openrouter" && (
                <option value="openai/text-embedding-3-small">openai/text-embedding-3-small</option>
              )}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Dimensão Vetorial</Label>
            <Input
              type="number"
              value={embeddingDimension}
              onChange={(e) => setEmbeddingDimension(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={handleTestEmbed}
          >
            {busy === "test-embed" ? <Loader2 className="size-4 animate-spin mr-1" /> : <RefreshCw className="size-4 mr-1" />}
            Testar Geração de Embedding
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={handleReindex}
          >
            {busy === "reindex" ? <Loader2 className="size-4 animate-spin mr-1" /> : <Database className="size-4 mr-1" />}
            Reindexar Lançamentos
          </Button>
        </div>

        {embedResult && (
          <div
            className={`rounded-lg border p-3 text-xs ${
              embedResult.ok ? "border-emerald-500/30 bg-emerald-50/40 text-emerald-900 dark:text-emerald-300" : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
            <strong>{embedResult.ok ? "Embedding Gerado" : "Falha"}:</strong> {embedResult.message}
          </div>
        )}
      </div>

      {/* Chave de Sobrescrita Local (BYOK) */}
      <ByokForm provider={mode as ProviderKey} data={data} onChanged={onChanged} />

      {/* Salvar Toda a Configuração */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          Credenciais seguras em .env do backend. Nenhuma chave secreta é exposta ao navegador.
        </p>
        <Button
          size="default"
          disabled={busy !== null}
          onClick={handleSave}
          className="font-semibold"
        >
          {busy === "save" && <Loader2 className="size-4 animate-spin mr-1.5" />}
          Salvar Configurações de IA
        </Button>
      </div>
    </Card>
  );
}

function ByokForm({
  provider,
  data,
  onChanged,
}: {
  provider: ProviderKey;
  data: Overview;
  onChanged: () => void;
}) {
  const save = useServerFn(saveByokKey);
  const remove = useServerFn(deleteByokKey);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const item = (data.providers as any)?.[provider];
  const provMeta = PROVIDERS.find((p) => p.key === provider);

  return (
    <div className="rounded-xl border p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Credencial {provMeta?.name}
          {item?.configured && (
            <Badge variant="secondary" className="text-xs">
              {item.source === "env" ? "Definida no .env do servidor" : `Salva no banco (…${item.last4})`}
            </Badge>
          )}
        </p>
        <span className="text-[11px] font-mono text-muted-foreground">{provMeta?.envVar}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Por padrão, o MIAnota lê a chave configurada no <code>.env</code> do servidor. Caso queira
        sobrescrever temporariamente via banco de dados sem reiniciar o servidor, insira abaixo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          type="password"
          autoComplete="off"
          className="h-8 max-w-sm"
          placeholder={item?.configured ? "Inserir nova chave para sobrescrever" : "Cole a chave de API"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy || key.trim().length < 10}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await save({ data: { provider, apiKey: key } });
              setKey("");
              toast.success(result?.message || "Chave salva com sucesso.");
              onChanged();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="size-3 animate-spin mr-1" />}
          Salvar Chave
        </Button>
        {item?.source === "panel" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              try {
                await remove({ data: { provider } });
                toast.success("Chave removida do banco. Voltando para .env.");
                onChanged();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Falha ao remover.");
              }
            }}
          >
            Remover do banco
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
    <div className="rounded-xl border px-3 py-2 bg-card">
      <strong className="block text-lg font-bold">{value.toLocaleString("pt-BR")}</strong>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
