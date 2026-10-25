import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  LogIn,
  Pause,
  Play,
  CalendarClock,
  Loader2,
  KeyRound,
  Eye,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import {
  listCompanies,
  suspendCompany,
  setCompanyTrial,
  resetCompanyOwnerPassword,
  getCompanyDetails,
} from "@/lib/master.functions";
import { adminGrantCredits } from "@/lib/credits.functions";

export const Route = createFileRoute("/master/assinantes")({
  head: brandedRouteHead("Assinantes"),
  component: EmpresasPage,
});

function EmpresasPage() {
  const navigate = useNavigate();
  const list = useServerFn(listCompanies);
  const suspend = useServerFn(suspendCompany);
  const saveTrial = useServerFn(setCompanyTrial);
  const resetPwd = useServerFn(resetCompanyOwnerPassword);
  const details = useServerFn(getCompanyDetails);
  const grantCredits = useServerFn(adminGrantCredits);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, suspended: 0, attention: 0 });
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [tipoPessoa, setTipoPessoa] = useState<"" | "pf" | "pj">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [trialCompany, setTrialCompany] = useState<any | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [trialCredits, setTrialCredits] = useState(100);
  const [trialSaving, setTrialSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const r = await list({ data: { search, page, tipoPessoa } });
      setRows(r.rows);
      setTotal(r.total);
      setPageSize(r.pageSize);
      setStats(r.stats);
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [page, tipoPessoa]);

  function impersonate(companyId: string) {
    try {
      sessionStorage.setItem("master_impersonate_company", companyId);
      toast.success("Entrando na conta do assinante…");
      navigate({ to: "/app/inicio" });
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function toggleSuspend(c: any) {
    const next = c.status_cobranca !== "suspenso";
    await suspend({ data: { companyId: c.id, suspend: next } });
    toast.success(next ? "Assinante suspenso" : "Assinante reativado");
    reload();
  }

  function openTrial(c: any) {
    setTrialCompany(c);
    setTrialDays(7);
    setTrialCredits(Math.max(0, Number(c.creditos_saldo ?? 100)));
  }

  async function confirmTrial() {
    if (!trialCompany) return;
    if (!Number.isFinite(trialDays) || trialDays < 1) {
      return toast.error("Informe ao menos 1 dia de trial.");
    }
    if (!Number.isFinite(trialCredits) || trialCredits < 0) {
      return toast.error("Informe uma quantidade válida de créditos.");
    }
    setTrialSaving(true);
    try {
      const result = await saveTrial({
        data: {
          companyId: trialCompany.id,
          days: trialDays,
          credits: trialCredits,
        },
      });
      toast.success(
        `Trial liberado até ${new Date(result.trial_ate).toLocaleDateString("pt-BR")} com ${result.creditos_saldo.toLocaleString("pt-BR")} créditos.`,
      );
      setTrialCompany(null);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível liberar o trial.");
    } finally {
      setTrialSaving(false);
    }
  }

  async function doResetPassword(c: any) {
    const custom = prompt(
      `Definir senha do responsável de "${c.nome}".\n\nDeixe em branco para gerar uma senha temporária (forçará troca no próximo login).\nOu digite uma senha (mín. 8 caracteres):`,
      "",
    );
    if (custom === null) return;
    const newPassword = custom.trim();
    if (newPassword && newPassword.length < 8) return toast.error("Mínimo 8 caracteres");
    try {
      const r: any = await resetPwd({
        data: { companyId: c.id, newPassword: newPassword || undefined },
      });
      if (r.tempPassword) {
        try {
          await navigator.clipboard.writeText(r.tempPassword);
        } catch {}
        toast.success(
          `Senha temporária para ${r.ownerEmail ?? "responsável"}: ${r.tempPassword} (copiada)`,
          { duration: 20000 },
        );
      } else {
        toast.success(`Senha atualizada para ${r.ownerEmail ?? "responsável"}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao redefinir senha");
    }
  }

  async function doGrantCredits(c: any) {
    const raw = prompt(
      `Créditos de IA para "${c.nome}".\n\nDigite quantidade (positivo adiciona, negativo remove):`,
      "100",
    );
    if (raw === null) return;
    const qtd = Number(raw);
    if (!qtd || isNaN(qtd)) return toast.error("Quantidade inválida");
    try {
      const r: any = await grantCredits({ data: { companyId: c.id, qtd, motivo: "ajuste_admin" } });
      toast.success(`Saldo agora: ${r.saldo} créditos`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao ajustar créditos");
    }
  }

  async function openDetails(companyId: string) {
    setDetail({ loading: true });
    setDetailLoading(true);
    try {
      const r = await details({ data: { companyId } });
      setDetail(r);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar detalhes");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  const pages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
            sua base de clientes
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Assinantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre, libere trial, acompanhe atividade e entre na conta para prestar suporte.
          </p>
        </div>
        <Button asChild>
          <Link to="/master/novo-assinante">
            <Plus className="size-4" /> Novo assinante
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CompanyStat icon={<Building2 />} label="Total" value={stats.total} />
        <CompanyStat icon={<UsersRound />} label="Ativas" value={stats.active} tone="green" />
        <CompanyStat icon={<Sparkles />} label="Em trial" value={stats.trial} tone="violet" />
        <CompanyStat icon={<Pause />} label="Suspensas" value={stats.suspended} />
        <CompanyStat
          icon={<CircleAlert />}
          label="Pedem atenção"
          value={stats.attention}
          tone="amber"
        />
      </div>

      <Card className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-bold">Fluxo recomendado para cada novo assinante</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            1. Cadastre o assinante e o responsável · 2. Defina plano ou trial · 3. Entre na conta do assinante
            e confira a primeira experiência.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/master/checklist">
            Ver checklist geral <ArrowRight className="size-4" />
          </Link>
        </Button>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-black">Lista de assinantes</h2>
          <p className="text-xs text-muted-foreground">{total} resultado(s) para a busca atual</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            reload();
          }}
        >
          <select aria-label="Tipo de pessoa" className="rounded-md border bg-background p-2" value={tipoPessoa} onChange={e => {setTipoPessoa(e.target.value as "" | "pf" | "pj");setPage(0);}}><option value="">Todos os tipos</option><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select>
          <Input
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground bg-muted/50 px-4 py-2">
          <div className="col-span-3">Nome</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Trial até</div>
          <div className="col-span-2">Criada</div>
          <div className="col-span-1">Atividade</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {loading ? (
          <div className="p-8 grid place-items-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum assinante.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm">
                <div className="col-span-3 min-w-0">
                  <div className="font-medium truncate">{c.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.slug}</div>
                </div>
                <div className="col-span-2">
                  <StatusBadge s={c.status_cobranca} />
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {c.trial_ate ? new Date(c.trial_ate).toLocaleDateString("pt-BR") : "—"}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="col-span-1 text-xs text-muted-foreground">
                  {c.ultima_atividade
                    ? new Date(c.ultima_atividade).toLocaleDateString("pt-BR")
                    : "—"}
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetails(c.id)}
                    title="Ver detalhes"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => doResetPassword(c)}
                    title="Redefinir senha do responsável"
                  >
                    <KeyRound className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => doGrantCredits(c)}
                    title="Créditos de IA"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openTrial(c)}
                    title="Dar ou renovar trial"
                  >
                    <CalendarClock className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleSuspend(c)}
                    title={c.status_cobranca === "suspenso" ? "Reativar" : "Suspender"}
                  >
                    {c.status_cobranca === "suspenso" ? (
                      <Play className="size-3.5" />
                    ) : (
                      <Pause className="size-3.5" />
                    )}
                  </Button>
                  <Button size="sm" onClick={() => impersonate(c.id)} title="Entrar como">
                    <LogIn className="size-3.5 mr-1" /> Entrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!trialCompany} onOpenChange={(open) => !open && setTrialCompany(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar trial para {trialCompany?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina o tempo de teste e quantas respostas da IA esto assinante poderá enviar.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trial-days">Dias de trial</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(event) => setTrialDays(Number(event.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trial-credits">Créditos de IA</Label>
                <Input
                  id="trial-credits"
                  type="number"
                  min={0}
                  max={1_000_000}
                  value={trialCredits}
                  onChange={(event) => setTrialCredits(Number(event.target.value))}
                />
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
              1 crédito = 1 resposta enviada pela IA no WhatsApp. Este valor substitui o saldo atual
              durante o trial.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTrialCompany(null)} disabled={trialSaving}>
              Cancelar
            </Button>
            <Button onClick={confirmTrial} disabled={trialSaving}>
              {trialSaving && <Loader2 className="size-4 animate-spin" />}
              Liberar trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {page + 1} de {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(pages - 1, page + 1))}
            disabled={page >= pages - 1}
          >
            Próxima
          </Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do assinante</DialogTitle>
          </DialogHeader>
          {detailLoading || detail?.loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : detail?.company ? (
            <div className="space-y-5 text-sm">
              <Section title="Assinante">
                <Field k={detail.company.tipo_pessoa === "pj" ? "Nome do negócio" : "Nome"} v={detail.company.nome} />
                <Field k="Tipo de pessoa" v={detail.company.tipo_pessoa === "pj" ? "Pessoa jurídica" : "Pessoa física"} />
                <Field k="Razão social" v={detail.company.razao_social} />
                <Field k="Slug" v={detail.company.slug} />
                <Field k="Status" v={detail.company.status_cobranca} />
                <Field k="Email corporativo" v={detail.company.email_corporativo} />
                <Field k="Telefone" v={detail.company.telefone} />
                <Field k={detail.company.tipo_pessoa === "pj" ? "CNPJ" : "CPF"} v={detail.company.cnpj_cpf} />
                <Field k="Endereço" v={detail.company.endereco} />
                <Field
                  k="Cidade/UF"
                  v={[detail.company.cidade, detail.company.uf].filter(Boolean).join(" / ")}
                />
                <Field k="Segmento" v={detail.company.segmento} />
                <Field
                  k="Créditos de IA"
                  v={Number(detail.company.creditos_saldo ?? 0).toLocaleString("pt-BR")}
                />
                <Field
                  k="Trial até"
                  v={
                    detail.company.trial_ate
                      ? new Date(detail.company.trial_ate).toLocaleString("pt-BR")
                      : "—"
                  }
                />
                <Field k="Criada" v={new Date(detail.company.created_at).toLocaleString("pt-BR")} />
              </Section>

              <Section title="Assinatura">
                {detail.subscription ? (
                  <>
                    <Field k="Plano" v={detail.subscription.plan?.nome ?? "—"} />
                    <Field k="Status" v={detail.subscription.status} />
                    <Field k="Provider" v={detail.subscription.provider ?? "—"} />
                    <Field k="ID externo" v={detail.subscription.external_subscription_id ?? "—"} />
                    <Field k="Email do comprador" v={detail.subscription.buyer_email ?? "—"} />
                    <Field
                      k="Período atual até"
                      v={
                        detail.subscription.current_period_end
                          ? new Date(detail.subscription.current_period_end).toLocaleString("pt-BR")
                          : "—"
                      }
                    />
                  </>
                ) : (
                  <div className="text-muted-foreground col-span-2">Sem assinatura.</div>
                )}
              </Section>

              <Section title="Usuários">
                <div className="col-span-2 space-y-1">
                  {detail.members?.length ? (
                    detail.members.map((m: any) => (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between border rounded-md px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {m.profile?.nome || m.profile?.email || m.user_id}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.profile?.email}
                            {m.profile?.telefone ? ` · ${m.profile.telefone}` : ""}
                          </div>
                        </div>
                        <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                          {m.role}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">Nenhum usuário.</div>
                  )}
                </div>
              </Section>

              <Section title="Uso">
                <Field k="Movimentações" v={String(detail.stats.movimentacoes)} />
                <Field k="Contas financeiras" v={String(detail.stats.contas)} />
                <Field k="Comandos de IA" v={String(detail.stats.comandosIa)} />
              </Section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "green" | "violet" | "amber";
}) {
  const colors = {
    default: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/10 text-emerald-700",
    violet: "bg-violet-500/10 text-violet-600",
    amber: "bg-amber-500/10 text-amber-700",
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={`grid size-9 shrink-0 place-items-center rounded-xl [&>svg]:size-4 ${colors[tone]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-black">{value}</p>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="truncate">{v || "—"}</span>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === "ativo") return <Badge className="bg-primary">Ativa</Badge>;
  if (s === "trial") return <Badge variant="secondary">Trial</Badge>;
  return <Badge variant="destructive">Suspensa</Badge>;
}
