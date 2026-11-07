/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Preferências por usuário (`notification_preference`): categorias no celular e no WhatsApp,
 * horário de silêncio, antecedência dos lembretes, resumo diário e relatório mensal.
 * O envio de push/WhatsApp lê essas mesmas preferências no servidor.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/auth/realm-supabase";
import {
  CATEGORY_LABEL,
  DEFAULT_PREFERENCE,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationPreference,
} from "@/lib/finance/notification-rules";

export function PreferencesDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [pref, setPref] = useState<NotificationPreference>(DEFAULT_PREFERENCE);
  const [quiet, setQuiet] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (supabase as any)
      .from("notification_preference")
      .select(
        "push_categories,quiet_start,quiet_end,reminder_lead_days,daily_summary,whatsapp_enabled,whatsapp_categories,monthly_report",
      )
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        const p = { ...DEFAULT_PREFERENCE, ...(data || {}) };
        setPref(p);
        setQuiet(p.quiet_start != null && p.quiet_end != null);
      });
  }, [open, userId]);

  function toggleCat(c: NotificationCategory, on: boolean) {
    setPref((p) => ({
      ...p,
      push_categories: on
        ? [...new Set([...p.push_categories, c])]
        : p.push_categories.filter((x) => x !== c),
    }));
  }

  async function save() {
    setSaving(true);
    const row = {
      user_id: userId,
      push_categories: pref.push_categories,
      quiet_start: quiet ? (pref.quiet_start ?? 22) : null,
      quiet_end: quiet ? (pref.quiet_end ?? 7) : null,
      reminder_lead_days: pref.reminder_lead_days,
      daily_summary: pref.daily_summary,
      whatsapp_enabled: pref.whatsapp_enabled ?? true,
      whatsapp_categories: pref.whatsapp_categories ?? [],
      monthly_report: pref.monthly_report ?? true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any)
      .from("notification_preference")
      .upsert(row, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar as preferências.");
    toast.success("Preferências salvas.");
    onOpenChange(false);
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de notificação</DialogTitle>
          <DialogDescription>
            Todos os avisos ficam na Central. Escolha quais também chegam no celular e no WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              No celular
            </p>
            {NOTIFICATION_CATEGORIES.map((c) => (
              <label
                key={c}
                className="flex items-center justify-between gap-3 text-sm font-semibold"
              >
                {CATEGORY_LABEL[c]}
                <Switch
                  checked={pref.push_categories.includes(c)}
                  onCheckedChange={(v) => toggleCat(c, v)}
                />
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
              No WhatsApp
              <Switch
                checked={pref.whatsapp_enabled ?? true}
                onCheckedChange={(v) => setPref({ ...pref, whatsapp_enabled: v })}
              />
            </label>
            {(pref.whatsapp_enabled ?? true) &&
              NOTIFICATION_CATEGORIES.map((c) => (
                <label
                  key={c}
                  className="flex items-center justify-between gap-3 text-sm font-semibold"
                >
                  {CATEGORY_LABEL[c]}
                  <Switch
                    checked={(pref.whatsapp_categories ?? []).includes(c)}
                    onCheckedChange={(v) =>
                      setPref((p) => {
                        const cur = p.whatsapp_categories ?? [];
                        return {
                          ...p,
                          whatsapp_categories: v
                            ? [...new Set([...cur, c])]
                            : cur.filter((x) => x !== c),
                        };
                      })
                    }
                  />
                </label>
              ))}
            <p className="text-xs text-muted-foreground">
              Chega no número que você vinculou à MIA. O horário de silêncio também vale aqui.
            </p>
          </div>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Horário de silêncio
              <Switch checked={quiet} onCheckedChange={setQuiet} />
            </label>
            {quiet && (
              <div className="flex items-center gap-2 text-sm">
                das
                <select
                  className={selectCls}
                  value={pref.quiet_start ?? 22}
                  onChange={(e) => setPref({ ...pref, quiet_start: Number(e.target.value) })}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{`${h}h`}</option>
                  ))}
                </select>
                às
                <select
                  className={selectCls}
                  value={pref.quiet_end ?? 7}
                  onChange={(e) => setPref({ ...pref, quiet_end: Number(e.target.value) })}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>{`${h}h`}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Avisar sobre contas</p>
            <select
              className={`${selectCls} w-full`}
              value={pref.reminder_lead_days}
              onChange={(e) => setPref({ ...pref, reminder_lead_days: Number(e.target.value) })}
            >
              <option value={0}>Só no dia do vencimento</option>
              <option value={1}>1 dia antes</option>
              <option value={3}>3 dias antes</option>
            </select>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>
              Resumo diário da MIA
              <span className="block text-xs font-normal text-muted-foreground">
                Gastos do dia e próximas contas, às 20h.
              </span>
            </span>
            <Switch
              checked={pref.daily_summary}
              onCheckedChange={(v) => setPref({ ...pref, daily_summary: v })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>
              Relatório mensal em PDF
              <span className="block text-xs font-normal text-muted-foreground">
                Todo dia 1, com o resumo do mês anterior.
              </span>
            </span>
            <Switch
              checked={pref.monthly_report ?? true}
              onCheckedChange={(v) => setPref({ ...pref, monthly_report: v })}
            />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
