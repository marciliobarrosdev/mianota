/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Master → Planos. Lista, cria, edita, ativa/desativa e exclui planos.
 * Toda escrita passa por `saveMasterPlan`/`deleteMasterPlan` (RPCs com checagem de super admin e auditoria).
 * Regras do formulário: `src/lib/billing/plan-form-rules.ts`. Peças visuais: `src/components/master/plans/*`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/auth/realm-supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brandedRouteHead } from "@/config/brand";
import { listPlansBasic, saveMasterPlan, deleteMasterPlan } from "@/lib/master/master.functions";
import { PlanCard } from "@/components/master/plans/plan-card";
import { PlanEditorDialog } from "@/components/master/plans/plan-editor-dialog";
import {
  buildPlanPayload,
  emptyPlanDraft,
  validatePlanDraft,
  type Plan,
  type PlanDraft,
} from "@/lib/billing/plan-form-rules";

export const Route = createFileRoute("/master/planos")({
  head: brandedRouteHead("Planos"),
  component: PlanosPage,
});

function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const ensureCanonicalPlans = useServerFn(listPlansBasic);
  const savePlanFn = useServerFn(saveMasterPlan);
  const deletePlanFn = useServerFn(deleteMasterPlan);

  async function load() {
    setLoading(true);
    try {
      // Fresh Lovable remixes can inherit the historical bootstrap function.
      // Normalize the offer before the owner can see or sell stale prices.
      await ensureCanonicalPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível conferir os planos.");
    }
    const { data, error } = await supabase
      .from("plan")
      .select("*")
      .neq("slug", "business")
      .order("ordem", { ascending: true });
    if (error) toast.error(error.message);
    setPlans((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(emptyPlanDraft(plans));
    setFeaturesText("");
  }

  function openEdit(p: Plan) {
    setEditing({ ...p });
    setFeaturesText((p.features || []).join("\n"));
  }

  async function save() {
    if (!editing) return;
    const invalid = validatePlanDraft(editing, plans);
    if (invalid) return toast.error(invalid);
    const payload = buildPlanPayload(editing, featuresText);
    if (payload.checkout_mode === "stripe" && !payload.stripe_price_id?.startsWith("price_"))
      return toast.error("Informe o Stripe Price ID (começa com price_) ou escolha link externo.");
    setSaving(true);
    try {
      await savePlanFn({ data: { id: editing.id ?? null, payload } });
    } catch (e) {
      setSaving(false);
      return toast.error(e instanceof Error ? e.message : "Não foi possível salvar o plano.");
    }
    setSaving(false);
    toast.success("Plano salvo");
    setEditing(null);
    load();
  }

  async function toggleAtivo(p: Plan) {
    if (
      p.ativo &&
      p.is_free &&
      !confirm("Desativar o plano grátis bloqueia novos cadastros grátis. Continuar?")
    )
      return;
    try {
      await savePlanFn({ data: { id: p.id, payload: { ativo: !p.ativo } } });
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Não foi possível alterar o plano.");
    }
    load();
  }

  async function removePlan(p: Plan) {
    if (!confirm(`Excluir o plano "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deletePlanFn({ data: { id: p.id } });
      toast.success("Plano excluído");
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Não foi possível excluir o plano.");
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e edite planos pagos ou gratuitos: preço, limite de dias, recursos e pagamento.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Adicionar Novo Plano
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum plano cadastrado.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onToggleActive={toggleAtivo}
              onEdit={openEdit}
              onRemove={removePlan}
            />
          ))}
        </div>
      )}

      <PlanEditorDialog
        editing={editing}
        setEditing={setEditing}
        featuresText={featuresText}
        setFeaturesText={setFeaturesText}
        saving={saving}
        onSave={save}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
