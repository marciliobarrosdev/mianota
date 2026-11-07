/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuper(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) throw new Error(`Não foi possível validar o acesso: ${error.message}`);
  if (data !== true) throw new Error("Acesso negado");
}

export const getEmailOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const [{ data: settings }, { data: events }] = await Promise.all([
      sb.from("email_settings").select("from_name,from_email,reply_to,updated_at").eq("id", true).maybeSingle(),
      sb.from("email_event").select("id,event_type,message_id,recipient,subject,occurred_at,received_at").order("received_at", { ascending: false }).limit(100),
    ]);
    return {
      resendConnected: Boolean(process.env["RESEND_API_KEY"]),
      webhookSecretConfigured: Boolean(process.env["RESEND_WEBHOOK_SECRET"]),
      settings: settings ?? { from_name: "MIAnota", from_email: null, reply_to: null, updated_at: null },
      events: (events ?? []) as Array<{ id: string; event_type: string; message_id: string | null; recipient: string | null; subject: string | null; occurred_at: string | null; received_at: string }>,
    };
  });

const settingsSchema = z.object({
  from_name: z.string().trim().min(1).max(80),
  from_email: z.string().trim().toLowerCase().email().max(320),
  reply_to: z.string().trim().toLowerCase().email().max(320).nullable().or(z.literal("").transform(() => null)),
});

export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const { error } = await sb.from("email_settings").upsert({ id: true, ...data, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({ actorId: context.userId, action: "email.settings_saved", target: data.from_email, details: { from_name: data.from_name } });
    return { ok: true };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().trim().toLowerCase().email().max(320) }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const { data: s } = await sb.from("email_settings").select("from_name,from_email,reply_to").eq("id", true).maybeSingle();
    if (!s?.from_email) throw new Error("Configure o e-mail remetente antes de testar.");
    const { sendResendEmail } = await import("@/lib/email/resend.server");
    const result = await sendResendEmail({
      from: `${s.from_name} <${s.from_email}>`,
      to: [data.to],
      replyTo: s.reply_to,
      subject: "Teste de e-mail — MIAnota",
      html: "<p>Olá! Este é um e-mail de teste do <strong>MIAnota</strong>.</p><p>Sua assistente financeira na palma da mão.</p>",
    });
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({ actorId: context.userId, action: "email.test_sent", target: data.to, details: { message_id: result.id } });
    return { id: result.id };
  });
