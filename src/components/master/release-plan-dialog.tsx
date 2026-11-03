import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { listPlansBasic, releaseCompanyPlan } from "@/lib/master/master.functions";
import { releaseDays } from "@/lib/master/manual-release-rules";

type Plan = { id: string; nome: string; preco_cents: number; is_free: boolean; free_days: number | null };

export function ReleasePlanDialog({ company, onClose, onDone }: { company: any | null; onClose: () => void; onDone: () => void }) {
  const loadPlans = useServerFn(listPlansBasic);
  const release = useServerFn(releaseCompanyPlan);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [days, setDays] = useState(30);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setConfirmed(false); setNote(""); setDays(30);
    loadPlans().then((r: any) => {
      const list = (r?.plans ?? []) as Plan[];
      setPlans(list);
      setPlanId(list.find((p) => !p.is_free)?.id ?? list[0]?.id ?? "");
    }).catch((e) => toast.error(e?.message ?? "Não foi possível carregar os planos."));
  }, [company]);

  const plan = plans.find((p) => p.id === planId);
  const effectiveDays = plan ? releaseDays(plan, days) : days;
  const until = useMemo(() => new Date(Date.now() + effectiveDays * 86_400_000).toLocaleDateString("pt-BR"), [effectiveDays]);

  async function submit() {
    if (!company || !plan) return;
    setSaving(true);
    try {
      const r = await release({ data: { companyId: company.id, planId: plan.id, days, confirmed, note } });
      toast.success(`Plano ${r.plan} liberado até ${new Date(r.until).toLocaleDateString("pt-BR")}.`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível liberar o plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!company} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liberar pagamento</DialogTitle>
          <DialogDescription>{company?.nome} — o plano fica ativo na hora, sem cobrança.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plano</Label>
            <div className="grid gap-2">
              {plans.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${p.id === planId ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">
                    {p.is_free ? `Gratuito · ${p.free_days ?? 1} dias` : `${(p.preco_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`}
                  </span>
                </button>
              ))}
              {!plans.length && <p className="text-sm text-muted-foreground">Carregando planos…</p>}
            </div>
          </div>
          {plan && !plan.is_free && (
            <div className="space-y-2">
              <Label htmlFor="release-days">Período (dias)</Label>
              <Input id="release-days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="release-note">Observação (opcional)</Label>
            <Textarea id="release-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: pagou via Pix" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            Liberação do Super Administrador
          </label>
          {plan && <p className="rounded-md bg-muted px-3 py-2 text-sm">Plano <b>{plan.nome}</b> liberado até <b>{until}</b>. Os créditos do plano serão recarregados.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={!confirmed || !plan || saving}>{saving ? "Liberando…" : "Liberar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
