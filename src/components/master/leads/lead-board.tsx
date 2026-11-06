import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarClock, Eye, MoreVertical, Pencil, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscriberAvatar } from "@/components/master/subscriber-avatar";
import { formatCentsBRL } from "@/lib/common/money";
import {
  LEAD_STAGES,
  daysInStage,
  positionBetween,
  trialDaysLeft,
  type LeadStage,
} from "@/lib/master/lead-pipeline-rules";
import type { LeadRow } from "@/lib/master/leads.functions";
import { cn } from "@/lib/utils";

const TEMP: Record<string, { label: string; cls: string }> = {
  frio: { label: "Frio", cls: "bg-muted text-muted-foreground" },
  morno: { label: "Morno", cls: "bg-accent text-accent-foreground" },
  quente: { label: "Quente", cls: "bg-destructive/15 text-destructive" },
};

export type LeadActions = {
  onView: (l: LeadRow) => void;
  onEdit: (l: LeadRow) => void;
  onDelete: (l: LeadRow) => void;
};

export function LeadBoard({
  leads,
  onMove,
  actions,
  mobileStage,
}: {
  leads: LeadRow[];
  onMove: (id: string, stage: LeadStage, position: number) => void;
  actions: LeadActions;
  mobileStage: LeadStage;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const byStage = (s: LeadStage) => leads.filter((l) => l.stage === s).sort((a, b) => a.position - b.position);
  const active = leads.find((l) => l.id === activeId) ?? null;

  function handleEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const lead = leads.find((l) => l.id === e.active.id);
    if (!lead) return;
    const overId = String(e.over.id);
    let stage: LeadStage;
    let position: number;
    if (overId.startsWith("col:")) {
      stage = overId.slice(4) as LeadStage;
      const col = byStage(stage).filter((l) => l.id !== lead.id);
      position = positionBetween(col.at(-1)?.position ?? null, null);
    } else {
      const target = leads.find((l) => l.id === overId);
      if (!target || target.id === lead.id) return;
      stage = target.stage;
      const col = byStage(stage).filter((l) => l.id !== lead.id);
      const idx = col.findIndex((l) => l.id === target.id);
      position = positionBetween(col[idx - 1]?.position ?? null, target.position);
    }
    if (stage === lead.stage && position === lead.position) return;
    onMove(lead.id, stage, position);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {LEAD_STAGES.map((s) => {
          const items = byStage(s.id);
          return (
            <Column
              key={s.id}
              id={s.id}
              label={s.label}
              color={s.color}
              count={items.length}
              total={items.reduce((t, l) => t + l.valor_cents, 0)}
              hiddenOnMobile={s.id !== mobileStage}
            >
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Arraste um lead para cá
                </p>
              ) : (
                items.map((l) => <LeadCard key={l.id} lead={l} actions={actions} dragging={l.id === activeId} />)
              )}
            </Column>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 200 }}>
        {active ? <LeadCardBody lead={active} actions={actions} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  id, label, color, count, total, hiddenOnMobile, children,
}: {
  id: string; label: string; color: string; count: number; total: number; hiddenOnMobile: boolean; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-full shrink-0 snap-start flex-col rounded-xl border bg-muted/40 transition-colors md:w-72",
        hiddenOnMobile && "hidden md:flex",
        isOver && "bg-primary/10 ring-2 ring-primary",
      )}
    >
      <header className="rounded-t-xl border-b bg-card p-3" style={{ borderTop: `3px solid ${color}` }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{label}</h3>
          <Badge variant="secondary" aria-label={`${count} leads`}>{count}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{formatCentsBRL(total)} potencial</p>
      </header>
      <div className="flex min-h-[160px] flex-col gap-2 p-2">{children}</div>
    </section>
  );
}

function LeadCard({ lead, actions, dragging }: { lead: LeadRow; actions: LeadActions; dragging: boolean }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: lead.id });
  const drop = useDroppable({ id: lead.id });
  return (
    <div
      ref={(n) => { setNodeRef(n); drop.setNodeRef(n); }}
      {...attributes}
      {...listeners}
      className={cn("touch-none outline-none", dragging && "opacity-30", drop.isOver && !dragging && "border-t-2 border-primary pt-1")}
    >
      <LeadCardBody lead={lead} actions={actions} />
    </div>
  );
}

function LeadCardBody({ lead, actions, overlay }: { lead: LeadRow; actions: LeadActions; overlay?: boolean }) {
  const left = trialDaysLeft(lead.trial_ate);
  const days = daysInStage(lead.stage_changed_at);
  const temp = TEMP[lead.temperatura] ?? TEMP.morno;
  return (
    <article
      className={cn(
        lead.needs_upgrade && "border-destructive/60",
        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        overlay && "rotate-2 shadow-xl ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <SubscriberAvatar name={lead.nome} src={lead.logo_url} size={32} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => actions.onView(lead)}
            className="block truncate text-left text-sm font-medium hover:underline"
          >
            {lead.nome}
          </button>
          <p className="truncate text-xs text-muted-foreground">{lead.email || lead.telefone || "Sem contato"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onPointerDown={(e) => e.stopPropagation()} aria-label="Ações do lead">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onView(lead)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onEdit(lead)}><Pencil className="mr-2 h-4 w-4" />Editar Lead</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => actions.onDelete(lead)}><Trash2 className="mr-2 h-4 w-4" />Excluir Lead</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", temp.cls)}>{temp.label}</span>
        {lead.plano && <Badge variant="outline" className="text-[10px]">{lead.plano}</Badge>}
        {lead.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {left !== null && lead.stage !== "convertido" && (
          <span className={cn(left <= 2 && "font-medium text-destructive")}>
            {left >= 0 ? `Grátis: ${left}d restantes` : `Grátis expirou há ${-left}d`}
          </span>
        )}
        {lead.creditos_saldo !== null && <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{lead.creditos_saldo}</span>}
        <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{days}d na etapa</span>
        {lead.open_tasks_overdue > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-destructive"><AlertTriangle className="h-3 w-3" />{lead.open_tasks_overdue} atrasada(s)</span>
        )}
        {lead.valor_cents > 0 && <span className="font-medium text-foreground">{formatCentsBRL(lead.valor_cents)}</span>}
      </div>
      {lead.needs_upgrade && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
          <Sparkles className="h-3 w-3" />Créditos IA esgotados · precisa de upgrade
        </p>
      )}
      {lead.auto_moved && <p className="mt-1 text-[10px] italic text-muted-foreground">Movido automaticamente</p>}
    </article>
  );
}
