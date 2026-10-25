import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guide = read("src/routes/app/guia.tsx");
const shell = read("src/components/app-shell.tsx");
const onboarding = read("src/routes/app/onboarding.tsx");
const connections = read("src/components/finance/finance-connections.tsx");
const whatsappConnection = read("src/routes/app/conexao.tsx");

for (const required of [
  "Conte para",
  "WhatsApp no seu ritmo",
  "Agende as próximas contas",
  "getFinanceDashboard",
]) {
  if (!guide.includes(required)) throw new Error(`guided setup missing: ${required}`);
}
for (const route of [
  'to: "/app/guia"',
  'to: "/app/movimentacoes"',
  'to: "/app/planejamento"',
  'to: "/app/marcia"',
  'to: "/app/configuracoes"',
]) {
  if (!shell.includes(route)) throw new Error(`subscriber navigation missing: ${route}`);
}
for (const removed of ['label: "Contas e cartões"', 'label: "Calendário"']) {
  if (shell.includes(removed)) throw new Error(`removed area still in subscriber menu: ${removed}`);
}
if (!shell.includes('matches: ["/app/calendario", "/app/orcamentos", "/app/recorrencias"]')) {
  throw new Error("old calendar, budget and recurrence links must resolve inside planning");
}
if (!onboarding.includes('window.location.href = "/app/marcia"')) {
  throw new Error("onboarding does not continue into the financial assistant");
}
if (!connections.includes("WhatsApp financeiro") || connections.includes("API Key")) {
  throw new Error("subscriber connections are not simple or expose technical setup");
}
if (
  !whatsappConnection.includes("Ative seu celular. Sem QR Code.") ||
  !whatsappConnection.includes("getFinanceWhatsappChannel") ||
  !whatsappConnection.includes("código temporário") ||
  whatsappConnection.includes("connectWhatsapp") ||
  whatsappConnection.includes("startSupportQr")
) {
  throw new Error(
    "subscriber WhatsApp must pair with the single central channel, without QR setup",
  );
}

console.log("subscriber financial setup verified");
