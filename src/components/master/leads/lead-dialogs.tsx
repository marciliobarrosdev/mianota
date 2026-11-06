import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { SubscriberAvatar } from "@/components/master/subscriber-avatar";
import { formatCentsBRL } from "@/lib/common/money";
import { LEAD_STAGES, LOST_REASONS, whatsappLink, type LeadStage, type LeadTemp } from "@/lib/master/lead-pipeline-rules";
import { addLeadNote, getLeadDetail, saveLead, saveLeadTask, type LeadRow } from "@/lib/master/leads.functions";

export const ORIGENS = [
  { id: "plano_gratis", label: "Plano Grátis" },
  { id: "manual", label: "Manual" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "indicacao", label: "Indicação" },
  { id: "instagram", label: "Instagram" },
  { id: "site", label: "Site" },
];
export const origemLabel = (id: string) => ORIGENS.find((o) => o.id === id)?.label ?? id;

type Form = {
  nome: string; email: string; telefone: string; empresa: string; origem: string; temperatura: LeadTemp;
  valor_cents: number | null; responsavel: string; tags: string; observacoes: string; stage: LeadStage;
};
const empty: Form = { nome: "", email: "", telefone: "", empresa: "", origem: "manual", temperatura: "morno", valor_cents: 0, responsavel: "", tags: "", observacoes: "", stage: "novo" };

export function LeadFormDialog({ open, onOpenChange, lead }: { open: boolean; onOpenChange: (o: boolean) => void; lead: LeadRow | null }) {
  const qc = useQueryClient();
  const save = useServerFn(saveLead);
  const [f, setF] = useState<Form>(empty);
  useEffect(() => {
    if (!open) return;
    setF(lead ? {
      nome: lead.nome, email: lead.email ?? "", telefone: lead.telefone ?? "", empresa: lead.empresa ?? "", origem: lead.origem,
      temperatura: lead.temperatura, valor_cents: lead.valor_cents, responsavel: lead.responsavel ?? "", tags: lead.tags.join(", "),
      observacoes: lead.observacoes ?? "", stage: lead.stage,
    } : empty);
  }, [open, lead]);
  const m = useMutation({
    mutationFn: () => save({ data: {
      id: lead?.id, nome: f.nome, email: f.email || null, telefone: f.telefone || null, empresa: f.empresa || null, origem: f.origem,
      temperatura: f.temperatura, valor_cents: f.valor_cents ?? 0, responsavel: f.responsavel || null,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), observacoes: f.observacoes || null, stage: f.stage,
    } }),
    onSuccess: () => {
      toast.success(lead ? "Lead atualizado" : "Lead criado");
      qc.invalidateQueries({ queryKey: ["master-leads"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Nome *" className="sm:col-span-2"><Input required value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
          <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input inputMode="tel" placeholder="(11) 99999-9999" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
          <Field label="Empresa"><Input value={f.empresa} onChange={(e) => set("empresa", e.target.value)} /></Field>
          <Field label="Origem">
            <Select value={f.origem} onValueChange={(v) => set("origem", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORIGENS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {!lead && (
            <Field label="Etapa">
              <Select value={f.stage} onValueChange={(v) => set("stage", v as LeadStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Temperatura">
            <Select value={f.temperatura} onValueChange={(v) => set("temperatura", v as LeadTemp)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="frio">Frio</SelectItem><SelectItem value="morno">Morno</SelectItem><SelectItem value="quente">Quente</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor potencial"><MoneyInput cents={f.valor_cents} onChange={(c) => set("valor_cents", c)} allowZero /></Field>
          <Field label="Responsável"><Input value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></Field>
          <Field label="Etiquetas (separadas por vírgula)" className="sm:col-span-2"><Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="vip, retornar" /></Field>
          <Field label="Observações" className="sm:col-span-2"><Textarea rows={3} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`grid gap-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}</div>;
}

export function LostReasonDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: (r: string) => void }) {
  const [r, setR] = useState<string>(LOST_REASONS[0]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Motivo da perda</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          {LOST_REASONS.map((x) => (
            <Button key={x} variant={r === x ? "default" : "outline"} onClick={() => setR(x)} className="justify-start">{x}</Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm(r)}>Mover para Perdidos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadDetailSheet({ lead, onOpenChange, onEdit }: { lead: LeadRow | null; onOpenChange: (o: boolean) => void; onEdit: (l: LeadRow) => void }) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getLeadDetail);
  const noteFn = useServerFn(addLeadNote);
  const taskFn = useServerFn(saveLeadTask);
  const key = ["master-lead-detail", lead?.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => detailFn({ data: { id: lead!.id } }), enabled: !!lead });
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [due, setDue] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["master-leads"] }); };
  const noteM = useMutation({
    mutationFn: (kind: string) => noteFn({ data: { leadId: lead!.id, body: note, kind } }),
    onSuccess: () => { setNote(""); refresh(); toast.success("Registrado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const taskM = useMutation({
    mutationFn: (d: Parameters<typeof taskFn>[0]["data"]) => taskFn({ data: d }),
    onSuccess: () => { setTask(""); setDue(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!lead) return null;
  const wa = whatsappLink(lead.telefone, lead.nome);
  const stage = LEAD_STAGES.find((s) => s.id === lead.stage);
  const now = Date.now();
  return (
    <Sheet open={!!lead} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SubscriberAvatar name={lead.nome} src={lead.logo_url} size={48} />
            <div className="min-w-0">
              <SheetTitle className="truncate">{lead.nome}</SheetTitle>
              <Badge variant="secondary">{stage?.label}</Badge>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-4 flex flex-wrap gap-2">
          {wa && <Button size="sm" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</a></Button>}
          {lead.email && <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(lead.email!); toast.success("E-mail copiado"); }}><Copy className="mr-1 h-4 w-4" />Copiar e-mail</Button>}
          {lead.company_id && <Button size="sm" variant="outline" asChild><Link to="/master/assinantes"><ExternalLink className="mr-1 h-4 w-4" />Ver assinante</Link></Button>}
          <Button size="sm" variant="ghost" onClick={() => onEdit(lead)}>Editar</Button>
        </div>
        <Tabs defaultValue="resumo" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="timeline">Histórico</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          </TabsList>
          <TabsContent value="resumo">
            {lead.needs_upgrade && (
              <p className="mb-3 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                Os créditos IA do Plano Grátis acabaram. Ofereça o upgrade para Basic ou Pro.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["E-mail", lead.email], ["WhatsApp", lead.telefone], ["Empresa", lead.empresa], ["Origem", origemLabel(lead.origem)],
                ["Temperatura", lead.temperatura], ["Valor potencial", formatCentsBRL(lead.valor_cents)], ["Responsável", lead.responsavel],
                ["Plano atual", lead.plano], ["Créditos IA", lead.creditos_saldo], ["Grátis até", lead.trial_ate ? new Date(lead.trial_ate).toLocaleDateString("pt-BR") : null],
                ["Plano convertido", lead.plano_convertido], ["Motivo da perda", lead.motivo_perda],
                ["Criado em", new Date(lead.created_at).toLocaleDateString("pt-BR")],
              ].filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={String(k)}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words font-medium">{String(v)}</dd></div>
              ))}
            </dl>
            {lead.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{lead.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>}
            {lead.observacoes && <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{lead.observacoes}</p>}
          </TabsContent>
          <TabsContent value="timeline">
            {isLoading ? <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin" /> : (
              <ol className="relative ml-2 space-y-4 border-l pl-4">
                {(data?.activities ?? []).map((a) => (
                  <li key={a.id}>
                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary" />
                    <p className="text-sm">{a.body}</p>
                    <p className="text-xs text-muted-foreground">{a.kind} · {new Date(a.created_at).toLocaleString("pt-BR")}</p>
                  </li>
                ))}
                {!data?.activities.length && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}
              </ol>
            )}
          </TabsContent>
          <TabsContent value="notas" className="space-y-3">
            <Textarea rows={3} placeholder="Escreva uma nota ou registre um contato…" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" disabled={!note.trim() || noteM.isPending} onClick={() => noteM.mutate("nota")}>Salvar nota</Button>
              <Button size="sm" variant="outline" disabled={!note.trim() || noteM.isPending} onClick={() => noteM.mutate("contato")}>Registrar contato</Button>
            </div>
            {(data?.activities ?? []).filter((a) => a.kind === "nota" || a.kind === "contato").map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <p className="whitespace-pre-wrap">{a.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.kind === "contato" ? "Contato" : "Nota"} · {new Date(a.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="tarefas" className="space-y-3">
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); taskM.mutate({ leadId: lead.id, titulo: task, due_at: due ? new Date(due).toISOString() : null }); }}>
              <Input placeholder="Ex.: Ligar para oferecer o Pro" value={task} onChange={(e) => setTask(e.target.value)} />
              <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-52" />
              <Button type="submit" size="sm" disabled={!task.trim()}>Adicionar</Button>
            </form>
            {(data?.tasks ?? []).map((t) => {
              const late = !t.done && t.due_at && new Date(t.due_at).getTime() < now;
              return (
                <div key={t.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox checked={t.done} onCheckedChange={(v) => taskM.mutate({ leadId: lead.id, id: t.id, done: !!v })} />
                  <div className="min-w-0 flex-1">
                    <p className={t.done ? "text-muted-foreground line-through" : ""}>{t.titulo}</p>
                    {t.due_at && <p className={`text-xs ${late ? "font-medium text-destructive" : "text-muted-foreground"}`}>{late ? "Atrasada · " : ""}{new Date(t.due_at).toLocaleString("pt-BR")}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remover tarefa" onClick={() => taskM.mutate({ leadId: lead.id, id: t.id, remove: true })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
            {!data?.tasks.length && <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
