/** Cartão de um plano na lista do Master: preço, limites, ativar/desativar, editar, excluir e status do checkout. */
import { AlertTriangle, CheckCircle2, Edit3, Gift, Package, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { isInfinitePayLink } from "@/lib/billing/infinitepay-rules";
import { formatPlanPrice as formatBRL, type Plan } from "@/lib/billing/plan-form-rules";

type Props = {
  plan: Plan;
  onToggleActive: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onRemove: (plan: Plan) => void;
};

export function PlanCard({ plan: p, onToggleActive, onEdit, onRemove }: Props) {
  return (
    <Card className={`p-5 flex h-full flex-col gap-3 relative ${!p.ativo ? "opacity-60" : ""}`}>
      {p.destaque && (
        <div className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
          <Star className="size-3" /> Destaque
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.slug}</div>
          <div className="text-lg font-bold truncate">{p.nome}</div>
        </div>
        <div className="text-right">
          {p.is_free ? (
            <>
              <div className="text-2xl font-bold">Grátis</div>
              <div className="text-[11px] text-muted-foreground">
                {p.free_days ?? p.trial_days} dias · {p.creditos_trial.toLocaleString("pt-BR")}{" "}
                créditos
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {formatBRL(p.preco_cents, p.moeda)}
                <span className="text-xs text-muted-foreground font-normal">
                  /{p.intervalo === "month" ? "mês" : "ano"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {p.trial_days > 0
                  ? `${p.trial_days}d trial · ${p.creditos_trial.toLocaleString("pt-BR")} créditos`
                  : "Sem trial"}
              </div>
            </>
          )}
        </div>
      </div>
      {p.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>}
      <div className="grid grid-cols-2 gap-2 text-[11px] mt-1">
        <Limit label="Msgs" v={p.limite_mensagens} />
        <Limit label="WhatsApp" v={1} />
        <Limit label="Usuários" v={p.limite_usuarios} />
        <Limit label="Contatos" v={p.limite_contatos} />
        <Limit label="Créditos IA/mês" v={p.creditos_mensais} />
      </div>
      <div className="flex items-center justify-between pt-2 mt-auto border-t">
        <div className="flex items-center gap-2">
          <Switch checked={p.ativo} onCheckedChange={() => onToggleActive(p)} />
          <span className="text-xs text-muted-foreground">{p.ativo ? "Ativo" : "Inativo"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Editar plano ${p.nome}`}
            onClick={() => onEdit(p)}
          >
            <Edit3 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Excluir plano ${p.nome}`}
            onClick={() => onRemove(p)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <CheckoutStatus plan={p} />
    </Card>
  );
}

function Limit({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-muted/50 rounded-md px-2 py-1.5 flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{v.toLocaleString("pt-BR")}</span>
    </div>
  );
}

// Resumo do checkout no card do plano: o estado depende do modo escolhido.
function CheckoutStatus({ plan }: { plan: Plan }) {
  const url = (plan.checkout_url ?? "").trim();

  if (plan.is_free) {
    return (
      <div className="flex items-center gap-1.5 -mt-1">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          <Gift className="size-3" /> Gratuito · {plan.free_days ?? plan.trial_days} dias
        </span>
      </div>
    );
  }

  if (isInfinitePayLink(url)) {
    return (
      <div className="flex items-center gap-1.5 -mt-1 min-w-0">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-3" /> InfinitePay configurado
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-[10px] text-muted-foreground hover:underline"
        >
          {url}
        </a>
      </div>
    );
  }

  if (url) {
    return (
      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 -mt-1 truncate">
        <Package className="size-3 shrink-0" />
        <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">
          {url}
        </a>
      </div>
    );
  }

  return (
    <div className="-mt-1 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      <span>Sem link de checkout</span>
    </div>
  );
}
