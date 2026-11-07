import { canSendWelcome, welcomeEmailContent, welcomeIdempotencyKey } from "./welcome-email-rules";
import { sendResendEmail } from "./resend.server";

// Called only by completed registration flows; never by page loads or payments.
export async function sendRegistrationWelcome(companyId: string, ownerId: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: company, error: companyError } = await admin.from("company")
      .select("nome,status_cobranca,welcome_email_eligible,welcome_email_claimed_at,welcome_email_sent_at").eq("id", companyId).single();
    if (companyError) throw new Error(companyError.message);
    if (!canSendWelcome({ eligible: company.welcome_email_eligible, claimedAt: company.welcome_email_claimed_at, sentAt: company.welcome_email_sent_at })) return;
    const [{ data: settings, error: settingsError }, { data: subscription, error: subscriptionError }, { data: auth, error: authError }] = await Promise.all([
      admin.from("email_settings").select("from_name,from_email,reply_to").eq("id", true).single(),
      admin.from("subscription").select("plan:plan(nome)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(ownerId),
    ]);
    if (settingsError || subscriptionError || authError) throw new Error("Não foi possível preparar as boas-vindas.");
    if (!settings?.from_email || !auth?.user?.email || !auth.user.email_confirmed_at || !subscription?.plan?.nome) return;
    // Atomic claim excludes concurrency and indefinite retries, including old registrations.
    const { data: claimed, error: claimError } = await admin.from("company")
      .update({ welcome_email_claimed_at: new Date().toISOString() })
      .eq("id", companyId).eq("welcome_email_eligible", true)
      .is("welcome_email_claimed_at", null).is("welcome_email_sent_at", null).select("id").maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) return;
    const result = await sendResendEmail({
      from: `${settings.from_name} <${settings.from_email}>`, to: [auth.user.email], replyTo: settings.reply_to,
      ...welcomeEmailContent({ name: company.nome, planName: subscription.plan.nome, paymentPending: company.status_cobranca === "checkout_pending" }),
      idempotencyKey: welcomeIdempotencyKey(companyId),
    });
    const { error: sentError } = await admin.from("company").update({ welcome_email_sent_at: new Date().toISOString() }).eq("id", companyId);
    if (sentError) console.error("[welcome-email.sent-marker]", companyId, sentError.message);
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({ actorId: ownerId, action: "email.welcome_sent", target: companyId, details: { message_id: result.id } });
  } catch (error) {
    // Delivery failure never rolls back registration; do not resend an ambiguous accepted send.
    console.error("[welcome-email]", companyId, error instanceof Error ? error.message : "Falha de envio");
  }
}