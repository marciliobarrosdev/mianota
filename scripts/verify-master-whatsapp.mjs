import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(file, pattern, message) {
  const content = read(file);
  if (!pattern.test(content)) failures.push(`${message} (${file})`);
}

expect(
  "src/routes/master.tsx",
  /\/master\/whatsapp/,
  "Menu Master precisa expor o canal de suporte",
);
expect(
  "src/routes/master.tsx",
  /\/master\/conversas/,
  "Menu Master precisa expor a caixa de entrada",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /QR Code/,
  "Tela deve oferecer conexão por QR Code",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /Um canal, contas sempre separadas/,
  "Tela deve explicar que o canal é único para todos os assinantes",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /API oficial Meta/,
  "Tela deve oferecer Meta Cloud API",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /whatsapp_business_management/,
  "Guia deve explicar permissões da Meta",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /Usuários do sistema/,
  "Guia deve explicar token permanente",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /Callback URL/,
  "Guia deve exibir o callback do webhook",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /janela de 24 horas/,
  "Guia deve explicar a janela de atendimento da Meta",
);
expect(
  "src/lib/integration-secrets.server.ts",
  /whatsapp_meta:[\s\S]*access_token[\s\S]*app_secret/,
  "Credenciais Meta devem usar o cofre criptografado",
);
expect(
  "src/lib/master-whatsapp.server.ts",
  /AES|resolveIntegration\("whatsapp_meta"\)/,
  "Runtime Meta deve resolver credenciais apenas no servidor",
);
expect(
  "src/routes/api/public/support-whatsapp-webhook.ts",
  /x-hub-signature-256/,
  "Webhook Meta deve validar a assinatura HMAC",
);
expect(
  "src/routes/api/public/support-whatsapp-webhook.ts",
  /hub\.verify_token/,
  "Webhook deve validar o token de verificação",
);
expect(
  "src/routes/api/public/support-whatsapp-webhook.ts",
  /providerMessageId/,
  "Webhook deve deduplicar mensagens do provedor",
);
expect(
  "src/routes/api/public/support-whatsapp-webhook.ts",
  /processCentralFinanceWhatsapp/,
  "Webhook central deve rotear comandos financeiros para o assinante correto",
);
expect(
  "src/lib/central-finance-whatsapp.server.ts",
  /fin_whatsapp_identity[\s\S]*phone_e164/,
  "Roteamento central deve identificar o tenant pelo celular ativo",
);
expect(
  "drizzle/migrations/0006_central_finance_whatsapp.sql",
  /fin_whatsapp_identity_one_active_phone_idx/,
  "Banco deve impedir um celular ativo em mais de um tenant",
);
expect(
  "src/lib/master-whatsapp.functions.ts",
  /24 \* 60 \* 60 \* 1000/,
  "Respostas Meta devem respeitar a janela de 24 horas",
);
expect(
  "src/lib/master-whatsapp.functions.ts",
  /is_super_admin/,
  "Funções da caixa de entrada devem exigir superadmin",
);
expect(
  "drizzle/migrations/0004_platform_support_whatsapp.sql",
  /REVOKE ALL[\s\S]*platform_support_channel/,
  "Tabelas globais não podem ficar expostas ao cliente",
);
expect(
  "drizzle/migrations/0004_platform_support_whatsapp.sql",
  /ENABLE ROW LEVEL SECURITY/g,
  "Tabelas de suporte devem ter RLS",
);
expect(
  "src/routes/master/conversas.tsx",
  /Assinante não identificado/,
  "Inbox deve sinalizar quando não localizar a empresa",
);
expect("src/routes/master/conversas.tsx", /Não lidas/, "Inbox deve ter filtro de não lidas");
expect(
  "src/routes/master/conversas.tsx",
  /Resolvida/,
  "Inbox deve controlar o status do atendimento",
);

expect("src/routes/master.tsx", /\/master\/whatsapp-qr/, "Menu deve conter QR");
expect("src/routes/master.tsx", /\/master\/whatsapp-meta/, "Menu deve conter Meta");
expect("src/routes/master.tsx", /Assinantes/, "Menu deve conter Assinantes");
if (/Infraestrutura|\/master\/empresas/.test(read("src/routes/master.tsx")))
  failures.push("Menu contém conceitos antigos");
expect(
  "src/routes/master/whatsapp-qr.tsx",
  /MasterWhatsappPage.*initialMode="evolution"/,
  "QR deve montar configuração conjunta",
);
expect(
  "src/components/master/whatsapp-setup.tsx",
  /IntegrationCard provider="evolution"[\s\S]*QrSetup/,
  "Servidor e QR devem estar na mesma página",
);
expect(
  "src/components/master/integration-card.tsx",
  /field: "api_url"[\s\S]*field: "api_key"/,
  "Formulário deve conter URL e API Key",
);
expect(
  "src/lib/integrations.functions.ts",
  /fetchInstances\?instanceName=__marcia_credentials_test__[\s\S]*AbortSignal\.timeout\(15_000\)/,
  "Teste da Evolution deve validar a chave sem listar todas as instâncias",
);
expect(
  "src/lib/integrations.functions.ts",
  /res\.status === 401 \|\| res\.status === 403[\s\S]*res\.status !== 404/,
  "Probe deve aceitar instância inexistente sem aceitar chave inválida",
);
if (failures.length) {
  console.error("\nFalhas no WhatsApp do superadmin:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("WhatsApp do superadmin: QR, Meta, webhook seguro e inbox verificados.");
