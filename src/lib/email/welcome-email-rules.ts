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
  // Email clients require inline styles; keep the palette in one semantic set.
  const theme = { background: "#f4f5f8", surface: "#ffffff", ink: "#202332", muted: "#646b7d", brand: "#7c3aed", line: "#e6e8ef", soft: "#f5f0ff" };
  const name = escapeHtml(input.name);
  const plan = escapeHtml(input.planName);
  const accessUrl = "https://mianota.lovable.app/entrar";
  const status = input.paymentPending
    ? "O acesso aos recursos será liberado após a confirmação do pagamento."
    : "Entre com seu e-mail e senha para acessar sua conta.";
  return {
    subject: "Boas-vindas ao MIAnota!",
    html: `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Boas-vindas ao MIAnota</title></head>
<body style="margin:0;padding:0;background:${theme.background};font-family:Arial,Helvetica,sans-serif;color:${theme.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Seu cadastro está concluído. Conheça seu plano e acesse o MIAnota.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.background};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${theme.surface};border:1px solid ${theme.line};border-radius:8px;">
<tr><td style="padding:30px 32px;border-bottom:1px solid ${theme.line};"><span style="font-size:26px;font-weight:700;color:${theme.brand};">MIAnota<span style="color:${theme.ink};">.</span></span><p style="margin:8px 0 0;font-size:12px;line-height:20px;color:${theme.muted};">Sua assistente financeira na palma da mão.</p></td></tr>
<tr><td style="padding:36px 32px 24px;"><p style="margin:0 0 14px;font-size:12px;font-weight:700;color:${theme.brand};">UM NOVO COMEÇO PARA SUAS FINANÇAS</p><h1 style="margin:0 0 20px;font-size:32px;line-height:40px;">Boas-vindas.<br>Que bom ter você aqui!</h1><p style="margin:0 0 12px;font-size:16px;line-height:26px;overflow-wrap:anywhere;">Olá, <strong>${name}</strong>!</p><p style="margin:0;font-size:16px;line-height:26px;color:${theme.muted};">Seu cadastro no MIAnota foi concluído. A MIA está pronta para ajudar você a organizar o dinheiro e acompanhar sua vida financeira com mais clareza.</p></td></tr>
<tr><td style="padding:0 32px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.soft};border-radius:6px;"><tr><td style="padding:22px;"><p style="margin:0 0 8px;font-size:12px;color:${theme.muted};">SEU PLANO</p><p style="margin:0 0 10px;font-size:22px;font-weight:700;color:${theme.brand};overflow-wrap:anywhere;">${plan}</p><p style="margin:0;font-size:14px;line-height:22px;">${status}</p></td></tr></table></td></tr>
<tr><td style="padding:0 32px 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${theme.brand}" style="border-radius:6px;"><a href="${accessUrl}" style="display:inline-block;padding:16px 26px;color:${theme.surface};font-size:15px;font-weight:700;text-decoration:none;">Acessar o MIAnota &rarr;</a></td></tr></table><p style="margin:16px 0 0;font-size:12px;line-height:20px;color:${theme.muted};">Use o e-mail e a senha do seu cadastro. Nunca compartilhe sua senha.</p></td></tr>
<tr><td style="padding:26px 32px;border-top:1px solid ${theme.line};"><h2 style="margin:0 0 18px;font-size:18px;">Seu primeiro passo, sem complicação.</h2><p style="margin:0 0 12px;font-size:14px;line-height:23px;"><strong style="color:${theme.brand};">01</strong> &nbsp; Acesse sua conta e confira seu perfil.</p><p style="margin:0 0 12px;font-size:14px;line-height:23px;"><strong style="color:${theme.brand};">02</strong> &nbsp; Registre suas entradas e despesas.</p><p style="margin:0;font-size:14px;line-height:23px;"><strong style="color:${theme.brand};">03</strong> &nbsp; Converse com a MIA e acompanhe o seu mês.</p><p style="margin:18px 0 0;font-size:12px;line-height:20px;color:${theme.muted};">Recursos e limites seguem o plano contratado e a situação de acesso da sua conta.</p></td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid ${theme.line};"><p style="margin:0;font-size:14px;line-height:23px;">Até já,<br><strong>Equipe MIAnota &amp; MIA</strong></p></td></tr>
</table><p style="max-width:540px;margin:22px 0 0;font-size:11px;line-height:19px;color:${theme.muted};">Você recebeu este e-mail porque concluiu um cadastro no MIAnota.<br>Se o botão não abrir, acesse <a href="${accessUrl}" style="color:${theme.brand};text-decoration:underline;">mianota.lovable.app/entrar</a>.</p>
</td></tr></table></body></html>`,
  };
}