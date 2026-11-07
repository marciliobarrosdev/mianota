/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Formulário de criar/editar plano. Só edita o rascunho; validar e salvar fica na página
 * (`validatePlanDraft` + `buildPlanPayload` → `saveMasterPlan`). Preço via MoneyInput (centavos).
 */
import type { Dispatch, SetStateAction } from "react";
import { Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/money-input";
import { isInfinitePayLink } from "@/lib/billing/infinitepay-rules";
import type { PlanDraft } from "@/lib/billing/plan-form-rules";
import { PlanField as Field } from "@/components/master/plans/plan-field";
import { PlanStripeCatalog } from "@/components/master/plans/plan-stripe-catalog";

type Props = {
  editing: PlanDraft | null;
  setEditing: Dispatch<SetStateAction<PlanDraft | null>>;
  featuresText: string;
  setFeaturesText: (value: string) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
};

export function PlanEditorDialog({
  editing,
  setEditing,
  featuresText,
  setFeaturesText,
  saving,
  onSave,
  onClose,
}: Props) {
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing?.id ? "Editar plano" : "Novo plano"}</DialogTitle>
        </DialogHeader>
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome">
              <Input
                value={editing.nome ?? ""}
                onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
              />
            </Field>
            <Field label="Slug">
              <Input
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="starter"
              />
            </Field>
            <Field label="Descrição" full>
              <Textarea
                rows={2}
                value={editing.descricao ?? ""}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </Field>
            <Field label="Plano Gratuito" full>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <label className="flex items-start justify-between gap-4">
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Gift className="size-4" /> Plano Gratuito
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Sem pagamento. O acesso dura o Limite de Dias e depois o assinante precisa
                      escolher um plano pago. Use os limites abaixo para restringir os recursos.
                    </span>
                  </span>
                  <Switch
                    aria-label="Plano Gratuito"
                    checked={!!editing.is_free}
                    onCheckedChange={(checked) =>
                      setEditing({
                        ...editing,
                        is_free: checked,
                        free_days: checked ? Math.max(1, Number(editing.free_days || 7)) : null,
                        preco_cents: checked ? 0 : editing.preco_cents,
                        creditos_trial: checked
                          ? Math.max(1, Number(editing.creditos_trial || 50))
                          : editing.creditos_trial,
                      })
                    }
                  />
                </label>
                {editing.is_free && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Limite de Dias</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={editing.free_days ?? 7}
                        onChange={(e) =>
                          setEditing({ ...editing, free_days: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Créditos de IA no período</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editing.creditos_trial ?? 50}
                        onChange={(e) =>
                          setEditing({ ...editing, creditos_trial: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </Field>
            {!editing.is_free && (
              <Field label="Preço">
                <MoneyInput
                  aria-label="Preço"
                  required
                  cents={editing.preco_cents ?? null}
                  onChange={(cents) =>
                    setEditing((current) =>
                      current ? { ...current, preco_cents: cents ?? undefined } : current,
                    )
                  }
                />
              </Field>
            )}
            <Field label="Intervalo">
              <select
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={editing.intervalo ?? "month"}
                onChange={(e) => setEditing({ ...editing, intervalo: e.target.value as any })}
              >
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </Field>
            <Field label="Ordem">
              <Input
                type="number"
                value={editing.ordem ?? 0}
                onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })}
              />
            </Field>
            <Field label="Créditos de IA por mês">
              <Input
                type="number"
                min={0}
                value={editing.creditos_mensais ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, creditos_mensais: Number(e.target.value) })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Cada resposta enviada pela IA consome 1 crédito.
              </p>
            </Field>
            {!editing.is_free && (
              <Field label="Período de teste" full>
                <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                  <label className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block text-sm font-semibold">
                        Oferecer trial neste plano
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        O cliente testa por alguns dias com uma quantidade controlada de respostas
                        da IA.
                      </span>
                    </span>
                    <Switch
                      checked={Number(editing.trial_days ?? 0) > 0}
                      onCheckedChange={(checked) =>
                        setEditing({
                          ...editing,
                          trial_days: checked ? Math.max(1, Number(editing.trial_days || 3)) : 0,
                          creditos_trial: checked
                            ? Math.max(1, Number(editing.creditos_trial || 100))
                            : 0,
                        })
                      }
                    />
                  </label>
                  {Number(editing.trial_days ?? 0) > 0 && (
                    <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Dias liberados</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={editing.trial_days ?? 3}
                          onChange={(e) =>
                            setEditing({ ...editing, trial_days: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Créditos liberados no trial</Label>
                        <Input
                          type="number"
                          min={1}
                          value={editing.creditos_trial ?? 100}
                          onChange={(e) =>
                            setEditing({ ...editing, creditos_trial: Number(e.target.value) })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground sm:col-span-2">
                        1 crédito = 1 resposta enviada pela IA no WhatsApp. Se o envio falhar, o
                        crédito é devolvido automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </Field>
            )}
            <Field label="Créditos de IA/mês">
              <Input
                type="number"
                value={editing.limite_mensagens ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, limite_mensagens: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Números de WhatsApp">
              <Input
                type="number"
                min={1}
                value={editing.limite_instancias ?? 1}
                onChange={(e) =>
                  setEditing({ ...editing, limite_instancias: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Limite usuários">
              <Input
                type="number"
                value={editing.limite_usuarios ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, limite_usuarios: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Limite contatos">
              <Input
                type="number"
                value={editing.limite_contatos ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, limite_contatos: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Features (uma por linha)" full>
              <Textarea
                rows={5}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder="Comandos por voz e texto&#10;Foto de comprovantes&#10;Dashboard financeiro&#10;1 número de WhatsApp"
              />
            </Field>
            {!editing.is_free && (
              <>
                <Field label="Como o cliente paga este plano?" full>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        [
                          "stripe",
                          "Stripe integrado",
                          "Cartão direto no sistema, liberação automática.",
                        ],
                        ["external", "Link externo", "Kiwify, Cakto, Perfectpay ou outro link."],
                      ] as const
                    ).map(([value, title, hint]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setEditing({ ...editing, checkout_mode: value })}
                        className={`rounded-xl border p-3 text-left text-sm transition ${
                          (editing.checkout_mode ?? "external") === value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div className="font-semibold">{title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
                      </button>
                    ))}
                  </div>
                </Field>
                {editing.checkout_mode === "stripe" && (
                  <PlanStripeCatalog editing={editing} setEditing={setEditing} />
                )}
                {editing.checkout_mode !== "stripe" && (
                  <Field label="Link de Checkout InfinitePay" full>
                    <Input
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      spellCheck={false}
                      value={editing.checkout_url ?? ""}
                      onChange={(e) => setEditing({ ...editing, checkout_url: e.target.value })}
                      placeholder="https://checkout.infinitepay.io/sua-tag/abc123"
                    />
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[11px] text-muted-foreground">
                        Plano Basic → Link 1 · Plano Pro → Link 2. Crie na InfinitePay um link com o
                        mesmo valor deste plano. O cliente deve pagar com o mesmo e-mail da conta.
                      </p>
                      {isInfinitePayLink(editing.checkout_url) && (
                        <Button asChild type="button" variant="outline" size="sm">
                          <a href={editing.checkout_url!.trim()} target="_blank" rel="noreferrer">
                            Testar link
                          </a>
                        </Button>
                      )}
                    </div>
                    {(editing.checkout_url ?? "").trim() &&
                      !isInfinitePayLink(editing.checkout_url) && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          Este não parece um link da InfinitePay
                          (https://checkout.infinitepay.io/…).
                        </p>
                      )}
                  </Field>
                )}
              </>
            )}
            <div className="col-span-2 flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!editing.destaque}
                  onCheckedChange={(v) => setEditing({ ...editing, destaque: v })}
                />{" "}
                Destaque (mais popular)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!editing.ativo}
                  onCheckedChange={(v) => setEditing({ ...editing, ativo: v })}
                />{" "}
                Ativo
              </label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
