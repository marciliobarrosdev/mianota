import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/20261018120000_marcia_finance_foundation.sql");
const command = read("src/lib/finance-command.functions.ts");
const shell = read("src/components/app-shell.tsx");
const onboarding = read("src/routes/app/onboarding.tsx");
const dashboard = read("src/routes/app/inicio.tsx");
const commandRoute = read("src/routes/app/marcia.tsx");
const planner = read("src/routes/app/planejamento.tsx");
const overview = read("src/components/finance/finance-overview.tsx");
const chat = read("src/components/finance/marcia-chat.tsx");
const chatHook = read("src/hooks/use-marcia-finance-chat.ts");
const transactions = read("src/components/finance/transactions-view.tsx");
const plannerView = read("src/components/finance/planner-view.tsx");
const demoApp = read("src/components/demo/finance-demo-app.tsx");
const reminders = read("src/lib/finance-reminders.functions.ts");
const settings = read("src/routes/app/configuracoes.tsx");
const landing = read("src/components/landing/finance-landing.tsx");
const styles = read("src/styles.css");
const demoShell = read("src/routes/demo.tsx");
const demoPages = read("src/components/demo/finance-demo-pages.tsx");
const whatsappMigration = read("supabase/migrations/20261018150000_finance_whatsapp_identity.sql");
const whatsappServer = read("src/lib/finance-whatsapp.server.ts");
const webhook = read("src/routes/api/public/whatsapp-webhook.ts");
const masterSetup = read("src/routes/master/implantacao.tsx");
const masterServer = read("src/lib/master.functions.ts");
const offerMigration = read("supabase/migrations/20261019193000_basic_pro_offer.sql");
const landingRoute = read("src/routes/index.tsx");
const balanceMigration = read("supabase/migrations/20261019213000_fin_account_balance_rpc.sql");
const cloneOfferBootstrap = read("drizzle/migrations/0005_basic_pro_clone_bootstrap.sql");
const masterPlans = read("src/routes/master/planos.tsx");
const dashboardFunctions = read("src/lib/finance-dashboard.functions.ts");
const oldCalendar = read("src/routes/app/calendario.tsx");

for (const table of [
  "fin_bank_connection",
  "fin_conta",
  "fin_cartao",
  "fin_fatura",
  "fin_orcamento",
  "fin_meta",
  "fin_recorrencia",
]) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`));
  assert.match(migration, new RegExp(`'${table}'`));
}

assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /has_company_access\(company_id\)/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.seed_finance_personal_categories/);
assert.match(command, /Nunca invente valor, conta, categoria, data, meta ou pagamento/);
assert.match(command, /status: "executing"/);
assert.match(command, /eq\("ai_command_id", data\.commandId\)/);
assert.match(command, /fonte: "ia"/);
assert.match(command, /consume_ai_credit/);
assert.match(command, /refund_ai_credit/);
assert.match(command, /Metas e recorrências estão disponíveis no plano Pro/);
assert.match(command, /mode: question \? "question" : "confirm"/);
assert.match(command, /image_url/);
assert.match(command, /leia somente dados legíveis/);
assert.match(command, /Não encontrei essa conta no seu cadastro/);
assert.match(command, /draft\.intent === "create_goal" && draft\.targetCents != null/);
assert.match(
  balanceMigration,
  /AFTER INSERT OR UPDATE OF conta_id, status, tipo, valor_cents OR DELETE/,
);
assert.match(balanceMigration, /saldo_cents = saldo_cents \+ _new_delta/);
assert.match(balanceMigration, /saldo_cents = saldo_cents - _old_delta/);
assert.match(balanceMigration, /NEW\.status = 'pago'/);
assert.match(dashboardFunctions, /finishFinanceOnboarding/);
assert.match(dashboardFunctions, /supabaseAdmin/);
assert.match(dashboardFunctions, /getFinancePlanner/);
assert.match(dashboardFunctions, /listFinanceTransactions/);
assert.match(dashboardFunctions, /sanitizeRange\(input\?\.from, input\?\.to\)/);
assert.match(planner, /useServerFn\(getFinancePlanner\)/);
assert.doesNotMatch(planner, /from\("fin_lancamento"\)/);
assert.match(oldCalendar, /redirect\(\{ to: "\/app\/planejamento"/);
assert.match(cloneOfferBootstrap, /bootstrap_remix_instance_legacy_20261019/);
assert.match(cloneOfferBootstrap, /nome = 'Basic'/);
assert.match(cloneOfferBootstrap, /preco_cents = 4900/);
assert.match(cloneOfferBootstrap, /preco_cents = 6900/);
assert.match(cloneOfferBootstrap, /selected_plan_slug = 'pro'/);
assert.match(cloneOfferBootstrap, /subscription\.company_id = _company_id/);
assert.match(cloneOfferBootstrap, /WHERE slug NOT IN \('starter', 'pro'\)/);
assert.match(masterPlans, /useServerFn\(listPlansBasic\)/);
assert.match(masterPlans, /await ensureCanonicalPlans\(\)/);
assert.match(commandRoute, /useMarciaFinanceChat/);
assert.match(chatHook, /interpretFinanceCommand/);
assert.match(chatHook, /executeFinanceCommand/);
assert.match(chatHook, /fileDataUrl/);
assert.match(chat, /application\/pdf/);
assert.match(chat, /Remover anexo/);
assert.match(chat, /está analisando/);
assert.match(chat, /Confira antes de registrar/);
assert.match(onboarding, /Pronto\. Agora é só contar\./);
assert.doesNotMatch(onboarding, /conecte o WhatsApp e seu banco/i);
assert.doesNotMatch(onboarding, /serviço|agenda|profissional/i);
assert.match(dashboard, /FinanceOverview/);
assert.match(dashboard, /useFinanceDashboard\(ctx\.company\?\.id, period\)/);
for (const label of [
  "Saldo do período",
  "Entrou",
  "Saiu",
  "Sobra prevista",
  "Evolução",
  "Maiores categorias",
]) {
  assert.match(overview, new RegExp(`"${label}"|>${label}<|${label}`));
}
assert.ok(
  overview.indexOf("Saldo do período") < overview.indexOf("insight.title"),
  "Os indicadores financeiros precisam aparecer antes da leitura da IA.",
);
assert.match(transactions, /Forma de pagamento/);
assert.match(transactions, /Observação/);
assert.match(transactions, /md:hidden/);
assert.match(plannerView, /Saldo do dia/);
assert.match(plannerView, /Linha do tempo/);
for (const path of [
  "/app/inicio",
  "/app/movimentacoes",
  "/app/planejamento",
  "/app/marcia",
  "/app/configuracoes",
]) {
  assert.match(shell, new RegExp(`to: "${path.replaceAll("/", "\\/")}"`));
}
assert.match(shell, /Visão do mês/);
assert.match(shell, /Planejamento e calendário/);
assert.match(shell, /Falar com \$\{assistantName\}/);
assert.doesNotMatch(shell, /Contas e cartões/);
assert.doesNotMatch(shell, /label: "Relatórios"/);
assert.doesNotMatch(shell, /label: "Conversas do WhatsApp"/);
assert.doesNotMatch(shell, /to: "\/app\/agenda"/);
assert.doesNotMatch(shell, /to: "\/app\/ordens"/);
assert.match(settings, /Controlar gastos/);
assert.match(settings, /Sair das dívidas/);
assert.match(settings, /Neste aplicativo/);
assert.match(settings, /Ativar meu celular/);
assert.doesNotMatch(settings, /Conectar por QR Code/);
assert.match(landing, /Comandos por voz e texto/i);
assert.match(landing, /Áudio, texto e foto/i);
assert.match(landing, /Comprovante/i);
assert.match(landing, /dashboard/i);
assert.match(landing, /Entrar na demonstração/);
assert.match(landing, /Explorar o sistema completo/);
assert.match(landing, /data-demo-entry="header"/);
assert.match(landing, /data-demo-entry="hero"/);
assert.match(landing, /Ver a demo/);
assert.match(landing, /sm:grid-cols-2/);
assert.match(landing, /Você fala\. Ela organiza\. O painel muda\./);
assert.match(landing, /Você fala\./);
assert.match(landing, /organiza seu dinheiro\./);
assert.match(landing, /cl-avatar/);
assert.match(landing, /cl-halo/);
assert.match(landing, /data-workflow-core/);
assert.match(landing, /marcia-core-orbit/);
assert.doesNotMatch(landing, /size-\[155px\] overflow-hidden rounded-full/);
assert.match(landing, /data-reveal/);
assert.match(landing, /data-stagger/);
assert.match(landing, /IntersectionObserver/);
assert.match(styles, /@keyframes finance-hero-avatar/);
assert.match(styles, /@keyframes finance-hero-orbit/);
assert.match(styles, /@keyframes finance-hero-aurora/);
assert.match(styles, /@keyframes finance-dashboard-float/);
assert.match(styles, /\[data-reveal\]\.cl-visible/);
assert.match(styles, /\[data-stagger\]\.cl-visible/);
assert.match(styles, /prefers-reduced-motion: reduce/);
assert.match(landing, /Abra e entenda/);
assert.match(landing, /01 · A rotina real/);
assert.match(landing, /03 · Cabe no seu dia/);
assert.match(landing, /05 · O sistema completo/);
assert.match(landing, /06 · A diferença na prática/);
assert.match(landing, /07 · Você continua no controle/);
assert.match(landing, /09 · Do primeiro acesso à clareza/);
assert.match(landing, /10 · Perguntas diretas/);
assert.match(landing, /Sem acesso ao seu banco/);
assert.match(landing, /id="por-dentro"/);
assert.match(landing, /id="recursos"/);
assert.match(landing, /Controle financeiro sem virar operador de planilha/);
assert.doesNotMatch(landing, /id="demonstracao"/);
assert.doesNotMatch(landing, /Troque o exemplo/);
assert.doesNotMatch(landing, /O sistema inteiro no bolso/);
assert.doesNotMatch(landing, /APP_SCREENS|const DEMOS/);
assert.doesNotMatch(landing, /Feito para virar produto|A marca vira sua/);
assert.doesNotMatch(landing, /depoimento|mais de [0-9]+ clientes/i);
assert.match(demoShell, /Demonstração ao vivo/);
assert.match(demoShell, /5 áreas essenciais/);
assert.doesNotMatch(demoShell, /label: "Sistema"/);
assert.doesNotMatch(demoShell, /Contas e cartões/);
for (const path of [
  "/demo/dashboard",
  "/demo/movimentacoes",
  "/demo/planejamento",
  "/demo/marcia",
  "/demo/configuracoes",
]) {
  assert.ok(demoShell.includes(path), `demo navigation missing ${path}`);
}
assert.match(demoApp, /<FinanceOverview/);
assert.match(demoApp, /<TransactionsView/);
assert.match(demoApp, /<PlannerView/);
assert.match(demoApp, /<MarciaChat/);
assert.match(demoApp, /Criar meu acesso/);
assert.match(reminders, /finance\.due/);
assert.match(reminders, /fin_recorrencia/);
assert.match(whatsappMigration, /CREATE TABLE IF NOT EXISTS public\.fin_whatsapp_identity/);
assert.match(whatsappMigration, /CREATE TABLE IF NOT EXISTS public\.fin_whatsapp_pairing/);
assert.match(whatsappServer, /fin_whatsapp_identity/);
assert.match(whatsappServer, /O WhatsApp financeiro está disponível no plano Pro/);
assert.match(whatsappServer, /Responda \*CONFIRMAR\*/);
assert.match(whatsappServer, /Não encontrei essa conta no seu cadastro/);
assert.match(webhook, /fin_whatsapp_identity/);
assert.match(webhook, /imageDataUrl/);
assert.match(masterSetup, /TurboSaaS Academy/i);
assert.match(masterSetup, /prompt no projeto da Lovable/i);
assert.match(masterSetup, /Identidade não é editada no superadmin/i);
assert.doesNotMatch(masterSetup, /CloneBrandForm|setCloneBrandConfig|CNPJ/i);
assert.match(offerMigration, /nome = 'Basic'/);
assert.match(offerMigration, /preco_cents = 4900/);
assert.match(offerMigration, /preco_cents = 6900/);
assert.match(offerMigration, /WHERE slug NOT IN \('starter', 'pro'\)/);
assert.match(offerMigration, /WHEN 'financeiro' THEN _slug IN \('starter', 'pro', 'business'\)/);
assert.match(masterServer, /const canonicalPlans = \[/);
assert.match(masterServer, /preco_cents: 4900/);
assert.match(masterServer, /preco_cents: 6900/);
assert.match(masterServer, /\.in\("slug", \["starter", "pro"\]\)/);
assert.doesNotMatch(
  read("supabase/migrations/20261009121000_clone_ownership_hardening.sql"),
  /'starter', 'Starter'|'business', 'Business'|19700|49700/,
);
assert.match(landingRoute, /name: "Basic"/);
assert.match(landingRoute, /price: "49"/);
assert.match(landingRoute, /price: "69"/);
assert.doesNotMatch(landingRoute, /name: "Business"/);

console.log("Finance rebuild verification passed.");
