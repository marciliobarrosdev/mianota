import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, KanbanSquare, List, Plus, RefreshCw, Search, Target, TrendingUp, Users, Clock, AlertTriangle, Wallet } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LeadBoard } from "@/components/master/leads/lead-board";
import { LeadDetailSheet, LeadFormDialog, LostReasonDialog, ORIGENS, origemLabel } from "@/components/master/leads/lead-dialogs";
import { deleteLead, listLeads, moveLead, type LeadRow } from "@/lib/master/leads.functions";
import { LEAD_STAGES, filterLeads, leadsCsv, pipelineMetrics, type LeadStage } from "@/lib/master/lead-pipeline-rules";
import { formatCentsBRL } from "@/lib/common/money";

export const Route = createFileRoute("/master/leads")({
  head: brandedRouteHead("Leads"),
  component: LeadsPage,
});

const ALL = "__all";

function LeadsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeads);
  const moveFn = useServerFn(moveLead);
  const deleteFn = useServerFn(deleteLead);
  const { data: leads = [], isLoading, isFetching, refetch } = useQuery({ queryKey: ["master-leads"], queryFn: () => listFn() });

  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState(ALL);
  const [origem, setOrigem] = useState(ALL);
  const [temp, setTemp] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mobileStage, setMobileStage] = useState<LeadStage>("novo");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [viewing, setViewing] = useState<LeadRow | null>(null);
  const [deleting, setDeleting] = useState<LeadRow | null>(null);
  const [pendingLost, setPendingLost] = useState<{ id: string; position: number } | null>(null);

  const allTags = useMemo(() => Array.from(new Set(leads.flatMap((l) => l.tags))).sort(), [leads]);
  const filtered = useMemo(
    () => filterLeads(leads, { q, tag: tag === ALL ? "" : tag, origem: origem === ALL ? "" : origem, temperatura: temp === ALL ? "" : temp, from, to }),
    [leads, q, tag, origem, temp, from, to],
  );
  const metrics = useMemo(() => pipelineMetrics(leads), [leads]);

  const move = useMutation({
    mutationFn: (v: { id: string; stage: LeadStage; position: number; motivo?: string }) => moveFn({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["master-leads"] });
      const prev = qc.getQueryData<LeadRow[]>(["master-leads"]);
      qc.setQueryData<LeadRow[]>(["master-leads"], (old = []) =>
        old.map((l) => (l.id === v.id ? { ...l, stage: v.stage, position: v.position, ...(l.stage !== v.stage ? { stage_changed_at: new Date().toISOString(), auto_moved: false } : {}) } : l)),
      );
      return { prev, from: prev?.find((l) => l.id === v.id) };
    },
    onError: (e: Error, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["master-leads"], ctx.prev); toast.error(e.message); },
    onSuccess: (_d, v, ctx) => {
      const f = ctx?.from;
      if (f && f.stage !== v.stage) {
        toast.success(`Movido para ${LEAD_STAGES.find((s) => s.id === v.stage)?.label}`, {
          action: { label: "Desfazer", onClick: () => move.mutate({ id: f.id, stage: f.stage, position: f.position }) },
        });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["master-leads"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Lead excluído"); qc.invalidateQueries({ queryKey: ["master-leads"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleMove(id: string, stage: LeadStage, position: number) {
    const cur = leads.find((l) => l.id === id);
    if (stage === "perdido" && cur?.stage !== "perdido") { setPendingLost({ id, position }); return; }
    move.mutate({ id, stage, position });
  }

  function exportCsv() {
    const blob = new Blob(["\ufeff" + leadsCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const actions = {
    onView: (l: LeadRow) => setViewing(l),
    onEdit: (l: LeadRow) => { setEditing(l); setFormOpen(true); },
    onDelete: (l: LeadRow) => setDeleting(l),
  };

  const kpis = [
    { label: "Total de leads", value: metrics.total, icon: Users },
    { label: "Novos no mês", value: metrics.newThisMonth, icon: TrendingUp },
    { label: "Taxa de conversão", value: `${metrics.conversionRate.toLocaleString("pt-BR")}%`, icon: Target },
    { label: "Grátis vencendo (2 dias)", value: metrics.expiringSoon, icon: Clock },
    { label: "Tarefas atrasadas", value: metrics.overdueTasks, icon: AlertTriangle },
    { label: "Receita convertida", value: formatCentsBRL(metrics.convertedCents), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestão de Leads</p>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">Funil de vendas: arraste os cards entre as etapas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-1 h-4 w-4" />CSV</Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-1 h-4 w-4" />Novo Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{k.label}<k.icon className="h-4 w-4" /></div>
            <p className="mt-1 text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-16" /> : k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar nome, e-mail, WhatsApp…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={origem} onValueChange={setOrigem}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Todas origens</SelectItem>{ORIGENS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={temp} onValueChange={setTemp}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Temperatura</SelectItem><SelectItem value="frio">Frio</SelectItem><SelectItem value="morno">Morno</SelectItem><SelectItem value="quente">Quente</SelectItem>
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Etiquetas</SelectItem>{allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Input type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
        <Input type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
        <div className="ml-auto flex rounded-md border p-0.5">
          <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} onClick={() => setView("kanban")}><KanbanSquare className="mr-1 h-4 w-4" />Kanban</Button>
          <Button size="sm" variant={view === "lista" ? "secondary" : "ghost"} onClick={() => setView("lista")}><List className="mr-1 h-4 w-4" />Lista</Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">{LEAD_STAGES.map((s) => <Skeleton key={s.id} className="h-80 w-72 shrink-0" />)}</div>
      ) : view === "kanban" ? (
        <>
          <div className="flex gap-1 overflow-x-auto md:hidden">
            {LEAD_STAGES.map((s) => (
              <Button key={s.id} size="sm" variant={mobileStage === s.id ? "default" : "outline"} onClick={() => setMobileStage(s.id)} className="shrink-0">
                {s.label} <Badge variant="secondary" className="ml-1">{filtered.filter((l) => l.stage === s.id).length}</Badge>
              </Button>
            ))}
          </div>
          <LeadBoard leads={filtered} onMove={handleMove} actions={actions} mobileStage={mobileStage} />
        </>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Contato</TableHead><TableHead>Etapa</TableHead><TableHead>Origem</TableHead><TableHead>Valor</TableHead><TableHead>Criado</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setViewing(l)}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-xs">{l.email}<br />{l.telefone}</TableCell>
                  <TableCell><Badge variant="secondary">{LEAD_STAGES.find((s) => s.id === l.stage)?.label}</Badge></TableCell>
                  <TableCell>{origemLabel(l.origem)}</TableCell>
                  <TableCell>{formatCentsBRL(l.valor_cents)}</TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
              {!filtered.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} />
      <LeadDetailSheet
        lead={viewing ? leads.find((l) => l.id === viewing.id) ?? viewing : null}
        onOpenChange={(o) => !o && setViewing(null)}
        onEdit={(l) => { setViewing(null); setEditing(l); setFormOpen(true); }}
      />
      <LostReasonDialog
        open={!!pendingLost}
        onCancel={() => setPendingLost(null)}
        onConfirm={(motivo) => { if (pendingLost) move.mutate({ ...pendingLost, stage: "perdido", motivo }); setPendingLost(null); }}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>"{deleting?.nome}" e todo o histórico, notas e tarefas serão removidos. O assinante (se existir) não é afetado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
