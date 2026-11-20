// Server-only: sends e-mail through Resend (direct official API or connector gateway).
const DIRECT_API_URL = "https://api.resend.com/emails";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";

export async function sendResendEmail(input: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string | null;
  idempotencyKey?: string;
}) {
  const resendKey = process.env["RESEND_API_KEY"];
  if (!resendKey) throw new Error("Resend não conectado. Configure a RESEND_API_KEY.");
  const lovableKey = process.env["LOVABLE_API_KEY"];

  // Se o remetente usar um domínio público não verificado (como @gmail.com),
  // o Resend recusa com HTTP 403. Usamos o domínio de teste do Resend com reply_to.
  let from = input.from;
  let replyTo = input.replyTo;
  const fromMatch = from.match(/<([^>]+)>/) || [null, from];
  const fromEmail = (fromMatch[1] || "").trim().toLowerCase();
  if (
    fromEmail.endsWith("@gmail.com") ||
    fromEmail.endsWith("@hotmail.com") ||
    fromEmail.endsWith("@yahoo.com") ||
    fromEmail.endsWith("@outlook.com")
  ) {
    if (!replyTo) replyTo = fromEmail;
    const fromName = from.includes("<") ? from.split("<")[0].trim() : "MIAnota";
    from = `${fromName} <onboarding@resend.dev>`;
  }

  const payload: Record<string, unknown> = {
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  const useDirect = resendKey.startsWith("re_") || !lovableKey;
  const endpoint = useDirect ? DIRECT_API_URL : GATEWAY_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: useDirect ? `Bearer ${resendKey}` : `Bearer ${lovableKey}`,
    ...(useDirect ? {} : { "X-Connection-Api-Key": resendKey }),
    ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Resend falhou [${res.status}]: ${text}`);
    throw new Error(`Resend recusou o envio [${res.status}]: ${text}`);
  }
  return JSON.parse(text) as { id: string };
}
