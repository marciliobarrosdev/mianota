import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ companyId: z.string().uuid(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

/** Baixa o relatório do mês. Lê com a sessão do usuário, então só vê dados da própria conta. */
export const downloadMonthlyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { buildMonthlyReport, bytesToBase64 } = await import("@/lib/finance/monthly-report.server");
    const { bytes } = await buildMonthlyReport(context.supabase, data.companyId, data.month);
    return { base64: bytesToBase64(bytes), fileName: `MIAnota-relatorio-${data.month}.pdf` };
  });

/** Envia o relatório do mês para o WhatsApp vinculado do próprio usuário. */
export const sendMonthlyReportWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { buildMonthlyReport, bytesToBase64 } = await import("@/lib/finance/monthly-report.server");
    const { userWhatsappPhone, sendCentralDocument, sendCentralText } = await import("@/lib/finance/notification-whatsapp.server");
    const { monthLabel, reportCaption } = await import("@/lib/finance/monthly-report-rules");
    const phone = await userWhatsappPhone(context.supabase, data.companyId, context.userId);
    if (!phone) return { ok: false as const, error: "Vincule seu WhatsApp à MIA para receber o relatório." };
    const { bytes, summary } = await buildMonthlyReport(context.supabase, data.companyId, data.month);
    const caption = reportCaption(monthLabel(data.month), summary);
    const sent = await sendCentralDocument(phone, bytesToBase64(bytes), `MIAnota-relatorio-${data.month}.pdf`, caption);
    if (sent) return { ok: true as const, mode: "pdf" as const };
    const r = await sendCentralText(phone, `${caption}\n\nO PDF completo está em MIAnota › Notificações › Relatório mensal.`);
    return r.ok ? { ok: true as const, mode: "text" as const } : { ok: false as const, error: "Não foi possível enviar pelo WhatsApp agora." };
  });

