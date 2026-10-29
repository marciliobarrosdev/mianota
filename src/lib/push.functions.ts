import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: (process.env["VAPID_PUBLIC_KEY"] || "").trim() };
});

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS confirms the caller owns at least one device in this company.
    const { data: own } = await (context.supabase as any)
      .from("marcia_push_subscription")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .eq("active", true)
      .limit(1);
    if (!own?.length) return { ok: false, error: "Nenhum aparelho ativo cadastrado." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUser } = await import("./web-push.server");
    const r = await sendPushToUser(supabaseAdmin, data.companyId, context.userId, {
      title: "Teste de notificação",
      body: "Tudo certo! Você vai receber os avisos da MárcIA neste aparelho.",
      url: "/app/notificacoes",
      tag: "teste",
    });
    if (!r.sent) return { ok: false, error: "O envio falhou. Cadastre o aparelho novamente." };
    return { ok: true, sent: r.sent };
  });
