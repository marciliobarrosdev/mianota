export function canSendWelcome(input: { eligible: boolean; claimedAt: string | null; sentAt: string | null }) {
  return input.eligible && !input.claimedAt && !input.sentAt;
}

export function welcomeIdempotencyKey(companyId: string) {
  return `registration-welcome/${companyId}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function welcomeEmailContent(input: { name: string; planName: string; paymentPending: boolean }) {
  return {
    subject: "Boas-vindas ao MIAnota!",
    html: `<h1>Boas-vindas ao MIAnota!</h1><p>Olá, ${escapeHtml(input.name)}!</p><p>Seu cadastro foi concluído no plano <strong>${escapeHtml(input.planName)}</strong>.</p>${input.paymentPending ? "<p>O acesso aos recursos do plano será liberado após a confirmação do pagamento.</p>" : "<p>Entre com seu e-mail e senha para acessar sua conta.</p>"}<p><a href="https://mianota.lovable.app/entrar">Acessar o MIAnota</a></p><p>Sua assistente financeira na palma da mão.</p>`,
  };
}