import { EMAIL_INPUT_PROPS, emailError, maskCpf, maskCnpj, normalizeEmail } from "@/lib/masks";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { maskBrazilianPhoneInput, PHONE_INPUT_PROPS } from "@/lib/phone";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Copy, Check } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { createCompanyWithOwner, listPlansBasic } from "@/lib/master.functions";

export const Route = createFileRoute("/master/novo-assinante")({
  head: brandedRouteHead("Novo assinante"),
  component: NovaEmpresa,
});

type Plan = {
  id: string;
  nome: string;
  preco_cents: number;
  moeda: string;
  intervalo: string;
  trial_days: number;
  is_free?: boolean | null;
  free_days?: number | null;
  limite_mensagens?: number | null;
  limite_usuarios?: number | null;
  creditos_mensais?: number | null;
  creditos_trial?: number | null;
};

const EMPTY_EXTRA = {
  telefone: "", responsavelNome: "", inscricaoEstadual: "", emailCorporativo: "", site: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
};

function fmt(cents: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
}

function NovaEmpresa() {
  const create = useServerFn(createCompanyWithOwner);
  const fetchPlans = useServerFn(listPlansBasic);
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">("pf");
  const [documento, setDocumento] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nome, setNome] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [trialDays, setTrialDays] = useState<number>(3);
  const [extra, setExtra] = useState(EMPTY_EXTRA);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const setX = (k: keyof typeof EMPTY_EXTRA) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setExtra((x) => ({ ...x, [k]: e.target.value }));
  const selectedPlan = plans.find((p) => p.id === planId);
  const isFree = !!selectedPlan?.is_free;
  function choosePlan(p: Plan) {
    setPlanId(p.id);
    setTrialDays(p.is_free ? (p.free_days ?? 1) : (p.trial_days ?? 0));
  }
  const [created, setCreated] = useState<{ email: string; password: string | null } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchPlans();
        setPlans(r.plans as any);
        const mid =
          r.plans?.find((p: any) => p.nome?.toLowerCase().includes("pro")) ?? r.plans?.[0];
        if (mid) setPlanId(mid.id);
        if (mid) setTrialDays(mid.is_free ? (mid.free_days ?? 1) : (mid.trial_days ?? 0));
      } catch (e: any) {
        toast.error(e?.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalidEmail = emailError(ownerEmail);
    if (invalidEmail) return toast.error(invalidEmail);
    const cleanEmail = normalizeEmail(ownerEmail);
    setOwnerEmail(cleanEmail);
    setBusy(true);
    setCreated(null);
    try {
      const r = await create({
        data: { nome, tipoPessoa, cnpjCpf: documento, razaoSocial, nomeFantasia: tipoPessoa === "pj" ? nome : "", ownerEmail: cleanEmail, planId: planId || null, trialDays, password: password || null, ...extra },
      });
      if (r.warning) toast.warning(r.warning, { duration: 12000 });
      else toast.success("Assinante criado e liberada com trial");
      setCreated({
        email: cleanEmail,
        password: r.passwordReady === false ? null : (r.tempPassword ?? (password || null)),
      });
      setNome("");
      setOwnerEmail("");
      setPassword("");
      setDocumento("");
      setRazaoSocial("");
      setExtra(EMPTY_EXTRA);
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo assinante</h1>
        <p className="text-sm text-muted-foreground">
          Cria o assinante, o usuário responsável e libera o plano com período de teste. Ao fim do
          trial o cliente precisa cadastrar o cartão para continuar.
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Tipo de pessoa</Label><select className="w-full rounded-md border p-2 bg-background" value={tipoPessoa} onChange={e => {setTipoPessoa(e.target.value as "pf" | "pj"); setDocumento("");}}><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select></div>
            <div><Label>{tipoPessoa === "pf" ? "CPF (opcional)" : "CNPJ (opcional)"}</Label><Input value={documento} onChange={e => setDocumento((tipoPessoa === "pf" ? maskCpf : maskCnpj)(e.target.value))} /></div>
            {tipoPessoa === "pj" && <div><Label>Razão social (opcional)</Label><Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} /></div>}

            <div>
              <Label>{tipoPessoa === "pf" ? "Nome" : "Nome do negócio"}</Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Padaria do Bairro"
              />
            </div>
            <div>
              <Label>Email do responsável</Label>
              <Input
                required
                {...EMAIL_INPUT_PROPS}
                autoComplete="off"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                onBlur={() => setOwnerEmail((current) => normalizeEmail(current))}
                placeholder="dono@assinante.com"
              />
            </div>
            <div>
              <Label>Senha (opcional)</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para gerar automática"
                autoComplete="new-password"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Se preencher, esta será a senha de acesso.
              </p>
            </div>
            <div>
              <Label>{isFree ? "Dias de acesso grátis" : "Dias de teste grátis"}</Label>
              <Input
                type="number"
                min={0}
                max={90}
                disabled={isFree}
                value={trialDays}
                onChange={(e) =>
                  setTrialDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))
                }
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isFree
                  ? "Definido pelo limite de dias do plano gratuito."
                  : "Após esse prazo o cliente precisa pagar pra continuar."}
              </p>
            </div>
            <div><Label>Nome do responsável (opcional)</Label><Input value={extra.responsavelNome} onChange={setX("responsavelNome")} /></div>
            <div><Label>WhatsApp do responsável (opcional)</Label><Input {...PHONE_INPUT_PROPS} value={extra.telefone} onChange={(e) => setExtra((x) => ({ ...x, telefone: maskBrazilianPhoneInput(e.target.value) }))} placeholder="(11) 91234-5678" /></div>
          </div>

          {tipoPessoa === "pj" && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Empresa</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Inscrição estadual (opcional)</Label><Input value={extra.inscricaoEstadual} onChange={setX("inscricaoEstadual")} /></div>
                <div><Label>E-mail da empresa (opcional)</Label><Input {...EMAIL_INPUT_PROPS} value={extra.emailCorporativo} onChange={setX("emailCorporativo")} /></div>
                <div><Label>Site (opcional)</Label><Input value={extra.site} onChange={setX("site")} placeholder="https://" /></div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold mb-2">Endereço (opcional)</h2>
            <div className="grid md:grid-cols-6 gap-4">
              <div className="md:col-span-2"><Label>CEP</Label><Input inputMode="numeric" value={extra.cep} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 8); setExtra((x) => ({ ...x, cep: d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d })); }} placeholder="00000-000" /></div>
              <div className="md:col-span-4"><Label>Rua</Label><Input value={extra.rua} onChange={setX("rua")} /></div>
              <div className="md:col-span-2"><Label>Número</Label><Input value={extra.numero} onChange={setX("numero")} /></div>
              <div className="md:col-span-4"><Label>Complemento</Label><Input value={extra.complemento} onChange={setX("complemento")} /></div>
              <div className="md:col-span-2"><Label>Bairro</Label><Input value={extra.bairro} onChange={setX("bairro")} /></div>
              <div className="md:col-span-3"><Label>Cidade</Label><Input value={extra.cidade} onChange={setX("cidade")} /></div>
              <div className="md:col-span-1"><Label>UF</Label><Input maxLength={2} value={extra.estado} onChange={(e) => setExtra((x) => ({ ...x, estado: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))} placeholder="SP" /></div>
            </div>
          </div>

          <div>
            <Label>Plano</Label>
            <div className="grid sm:grid-cols-3 gap-2 mt-2">
              {plans.map((p) => {
                const sel = planId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => choosePlan(p)}
                    className={`text-left rounded-xl border p-3 transition ${
                      sel
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{p.nome}</div>
                      {sel && <Check className="size-4 text-primary" />}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.is_free ? (
                        <>Grátis · {p.free_days ?? 0} dias</>
                      ) : (
                        <>
                          {fmt(p.preco_cents, p.moeda)}
                          <span className="text-xs">/{p.intervalo === "month" ? "mês" : "ano"}</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {p.limite_mensagens ?? "∞"} msgs · {p.limite_usuarios ?? "∞"} usuário(s) ·{" "}
                      {(p.is_free ? p.creditos_trial : p.creditos_mensais) ?? 0} créditos IA
                    </div>
                  </button>
                );
              })}
            </div>
            {loaded && plans.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Nenhum plano ativo. <Link to="/master/planos" className="text-primary underline">Cadastre um plano</Link>.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !planId}>
              {busy ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="size-4 mr-1.5" />
              )}
              Criar e liberar acesso
            </Button>
          </div>
        </form>

        {created && (
          <div className="mt-5 rounded-xl border bg-emerald-500/10 p-4 space-y-2">
            <div className="font-semibold text-sm">Acesso criado ✅</div>
            <div className="text-xs text-muted-foreground">
              Envie estes dados para o cliente. Ele entra em{" "}
              <code className="bg-background px-1 rounded">/entrar</code>.
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Email" value={created.email} />
              {created.password && <Field label="Senha" value={created.password} />}
            </div>
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: "/master/assinantes" })}
              >
                Ir paro assinantes
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <code className="text-xs flex-1 break-all">{value}</code>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copiado");
          }}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
