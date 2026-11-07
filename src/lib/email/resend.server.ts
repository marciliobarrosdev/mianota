// Server-only: sends e-mail through the Resend connector gateway.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export async function sendResendEmail(input: { from: string; to: string[]; subject: string; html: string; replyTo?: string | null }) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada.");
  if (!resendKey) throw new Error("Resend não conectado.");
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Resend falhou [${res.status}]: ${text}`);
    throw new Error(`Resend recusou o envio [${res.status}]: ${text}`);
  }
  return JSON.parse(text) as { id: string };
}
