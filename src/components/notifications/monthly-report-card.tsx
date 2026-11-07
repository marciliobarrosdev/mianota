/** Relatório mensal em PDF: baixar no aparelho ou receber no WhatsApp vinculado. Padrão: mês anterior. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadMonthlyReport,
  sendMonthlyReportWhatsapp,
} from "@/lib/finance/monthly-report.functions";
import { monthLabel, previousMonth } from "@/lib/finance/monthly-report-rules";
import { todayInSaoPaulo } from "@/lib/finance/notification-center-rules";

export function MonthlyReportCard({ companyId }: { companyId: string }) {
  const today = todayInSaoPaulo();
  const months = Array.from({ length: 12 }, (_, i) => {
    let m = today.slice(0, 7);
    for (let k = 0; k < i; k++) m = previousMonth(`${m}-15`);
    return m;
  });
  const [month, setMonth] = useState(months[1]);
  const [busy, setBusy] = useState<"" | "pdf" | "wa">("");
  const download = useServerFn(downloadMonthlyReport);
  const sendWa = useServerFn(sendMonthlyReportWhatsapp);

  async function onDownload() {
    setBusy("pdf");
    try {
      const r = await download({ data: { companyId, month } });
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bin], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error("Não foi possível gerar o relatório.");
    }
    setBusy("");
  }

  async function onWhatsapp() {
    setBusy("wa");
    try {
      const r = await sendWa({ data: { companyId, month } });
      if (r.ok)
        toast.success(
          r.mode === "pdf" ? "Relatório enviado no seu WhatsApp." : "Resumo enviado no WhatsApp.",
        );
      else toast.error(r.error);
    } catch {
      toast.error("Não foi possível enviar agora.");
    }
    setBusy("");
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-[20px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="size-5" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="font-display text-base font-extrabold">Relatório mensal</p>
        <p className="text-xs text-muted-foreground">
          Receitas, despesas, gastos por categoria e todos os lançamentos em PDF.
        </p>
      </div>
      <select
        aria-label="Mês do relatório"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => void onWhatsapp()}
          disabled={!!busy}
        >
          {busy === "wa" ? <Loader2 className="animate-spin" /> : <MessageCircle />} WhatsApp
        </Button>
        <Button className="rounded-xl" onClick={() => void onDownload()} disabled={!!busy}>
          {busy === "pdf" ? <Loader2 className="animate-spin" /> : <Download />} Baixar PDF
        </Button>
      </div>
    </section>
  );
}
