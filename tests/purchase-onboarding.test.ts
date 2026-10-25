/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createFakeDb } from "./helpers/fake-db";
import {
  decideOnboarding,
  generateActivationCode,
  mapEvolutionAck,
  maskPhone,
  mergeDeliveryStatus,
  normalizeBuyerName,
  normalizeBuyerPhone,
  parseActivationReply,
  redactSecrets,
  shouldProcessInbound,
  buildMetaTemplatePayload,
  isActiveChannelConnected,
  activationPhoneMatches,
  buildEvolutionActivationText,
  respondingPhoneE164,
} from "../src/lib/purchase-onboarding-rules";
import { normalize } from "../src/lib/billing/normalize";

// ---------- Simulação de backend e provedores (nenhuma mensagem real) ----------
let fake = createFakeDb();
const sent: { provider: string; to: string; body: any }[] = [];
let evolutionFails = false;

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => fake.client.from(table),
    rpc: (...args: any[]) => (fake.client.rpc as any)(...args),
  },
}));
mock.module("../src/lib/evolution.server", () => ({
  evoSendText: async (_instance: string, to: string, text: string) => {
    if (evolutionFails) throw new Error("Evolution API indisponível token=abcdef123456");
    sent.push({ provider: "evolution", to, body: text });
    return { key: { id: `evo-${sent.length}` } };
  },
}));
mock.module("../src/lib/master-whatsapp.server", () => ({
  sendMetaPayload: async (payload: any) => {
    sent.push({ provider: "meta", to: payload.to, body: payload });
    return `wamid-${sent.length}`;
  },
}));

const realFetch = globalThis.fetch;
const COMPANY = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function seed(channel: Record<string, unknown>, extra: Record<string, any[]> = {}) {
  fake = createFakeDb({
    platform_support_channel: [
      { id: true, status: "connected", instance_name: "inst", provider: channel.active_provider, ...channel },
    ],
    company_user: [{ company_id: COMPANY, user_id: USER, role: "owner", ativo: true }],
    company: [{ id: COMPANY, telefone: null, creditos_saldo: 50, trial_ate: "2026-11-01" }],
    clone_brand_config: [{ product_name: "MárcIA" }],
    ...extra,
  });
}

beforeEach(() => {
  sent.length = 0;
  evolutionFails = false;
  globalThis.fetch = (async () => {
    throw new Error("Rede bloqueada nos testes");
  }) as any;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

async function service() {
  return import("../src/lib/purchase-onboarding.server");
}

describe("canal central exclusivo", () => {
  test("só o provedor ativo processa mensagens recebidas", () => {
    expect(shouldProcessInbound("meta", "meta")).toBe(true);
    expect(shouldProcessInbound("meta", "evolution")).toBe(false);
    expect(shouldProcessInbound("evolution", "meta")).toBe(false);
    expect(shouldProcessInbound(null, "evolution")).toBe(false);
  });
});

describe("canal ativo coerente com o registro compartilhado", () => {
  test("só conta como conectado quando provider = active_provider e status connected", () => {
    expect(isActiveChannelConnected({ active_provider: "evolution", provider: "evolution", status: "connected", instance_name: "i" })).toBe(true);
    expect(isActiveChannelConnected({ active_provider: "meta", provider: "meta", status: "connected" })).toBe(true);
    // Configuração da Meta sobrescreveu o registro enquanto a Evolution é a ativa.
    expect(isActiveChannelConnected({ active_provider: "evolution", provider: "meta", status: "connected", instance_name: "i" })).toBe(false);
    // Configuração da Evolution sobrescreveu o registro enquanto a Meta é a ativa.
    expect(isActiveChannelConnected({ active_provider: "meta", provider: "evolution", status: "connected", instance_name: "i" })).toBe(false);
    expect(isActiveChannelConnected({ active_provider: "evolution", provider: "evolution", status: "connecting", instance_name: "i" })).toBe(false);
    expect(isActiveChannelConnected({ active_provider: "evolution", provider: "evolution", status: "connected", instance_name: " " })).toBe(false);
    expect(isActiveChannelConnected({ active_provider: null, provider: "evolution", status: "connected", instance_name: "i" })).toBe(false);
    expect(isActiveChannelConnected(null)).toBe(false);
  });
  test("telefone que responde precisa ser exatamente o do comprador", () => {
    expect(activationPhoneMatches("+5511987654321", respondingPhoneE164("5511987654321"))).toBe(true);
    expect(activationPhoneMatches("+5511987654321", respondingPhoneE164("5511900000000"))).toBe(false);
    expect(activationPhoneMatches(null, respondingPhoneE164("5511987654321"))).toBe(false);
    expect(activationPhoneMatches("+5511987654321", respondingPhoneE164("15551234567"))).toBe(false);
  });
});

describe("normalização de nome e telefone", () => {
  test("telefones brasileiros viram E.164", () => {
    expect(normalizeBuyerPhone("(11) 98765-4321")).toBe("+5511987654321");
    expect(normalizeBuyerPhone("+55 11 98765-4321")).toBe("+5511987654321");
    expect(normalizeBuyerPhone("1133334444")).toBe("+551133334444");
    expect(normalizeBuyerPhone("12345")).toBeNull();
    expect(normalizeBuyerPhone("")).toBeNull();
  });
  test("nome é limpo e capitalizado; e-mail não vira nome", () => {
    expect(normalizeBuyerName("  ana   DA silva ")).toBe("Ana da Silva");
    expect(normalizeBuyerName("ana@x.com")).toBeNull();
    expect(normalizeBuyerName("")).toBeNull();
  });
  test("máscara nunca mostra o número inteiro", () => {
    expect(maskPhone("+5511987654321")).toBe("+5511•••••21");
  });
  test("plataformas entregam nome e telefone", () => {
    const kiwify = normalize("kiwify", {
      webhook_event_type: "order_approved",
      Customer: { email: "A@X.COM", full_name: "Ana Souza", mobile: "11987654321" },
    });
    expect([kiwify.buyerName, kiwify.buyerPhone]).toEqual(["Ana Souza", "11987654321"]);
    const cakto = normalize("cakto", {
      event: "purchase_approved",
      data: { customer: { email: "b@x.com", name: "Bia", phone: "5521999998888" } },
    });
    expect(cakto.buyerPhone).toBe("5521999998888");
    const pp = normalize("perfectpay", {
      sale_status_enum_key: "approved",
      customer: { email: "c@x.com", full_name: "Caio", phone_area_code: "31", phone_number: "988887777" },
    });
    expect(pp.buyerPhone).toBe("31988887777");
  });
});

describe("decisão do onboarding", () => {
  const base = {
    hasCompany: true,
    phone: "+5511987654321",
    activeProvider: "evolution" as const,
    channelConnected: true,
    metaTemplateName: null,
    metaTemplateApproved: false,
    existingIdentityCompanyId: null,
    companyId: COMPANY,
  };
  test("sem telefone aguarda telefone", () => {
    expect(decideOnboarding({ ...base, phone: null })).toMatchObject({ status: "awaiting_phone" });
  });
  test("Meta sem template aprovado aguarda template", () => {
    expect(decideOnboarding({ ...base, activeProvider: "meta" })).toMatchObject({
      status: "awaiting_template",
    });
    expect(
      decideOnboarding({ ...base, activeProvider: "meta", metaTemplateName: "t", metaTemplateApproved: true }),
    ).toEqual({ action: "send", provider: "meta", mode: "template" });
  });
  test("Evolution envia texto livre", () => {
    expect(decideOnboarding(base)).toEqual({ action: "send", provider: "evolution", mode: "text" });
  });
  test("telefone de outro assinante é conflito; do mesmo é renovação", () => {
    expect(decideOnboarding({ ...base, existingIdentityCompanyId: OTHER }).action).toBe("conflict");
    expect(decideOnboarding({ ...base, existingIdentityCompanyId: COMPANY }).action).toBe("renewal");
  });
});

describe("resposta de ativação", () => {
  test("mensagem QR personalizada substitui tokens e preserva o código", () => {
    expect(
      buildEvolutionActivationText({
        name: "Ana Souza",
        product: "MárcIA",
        code: "K7P2QX",
        template: "Oi, {{nome}}! {{produto}} liberada. Responda COMEÇAR {{codigo}} em {{validade_horas}}h.",
      }),
    ).toBe("Oi, Ana! MárcIA liberada. Responda COMEÇAR K7P2QX em 48h.");
    expect(
      buildEvolutionActivationText({
        name: "Ana Souza",
        product: "MárcIA",
        code: "K7P2QX",
        template: "Mensagem inválida sem token",
      }),
    ).toContain("COMEÇAR K7P2QX");
  });

  test("aceita COMEÇAR com código, com ou sem acento", () => {
    expect(parseActivationReply("COMEÇAR K7P2QX")).toEqual({ kind: "code", code: "K7P2QX" });
    expect(parseActivationReply("começar k7p2qx")).toEqual({ kind: "code", code: "K7P2QX" });
    expect(parseActivationReply("Começar")).toEqual({ kind: "bare_start" });
    expect(parseActivationReply("oi")).toBeNull();
    expect(parseActivationReply("COMEÇAR 0O1IL0")).toBeNull();
  });
  test("payload do botão Meta é reconhecido", () => {
    expect(parseActivationReply("Começar", "mo1:abcdefghijklmnopqrstuvwxyz")).toEqual({
      kind: "token",
      token: "abcdefghijklmnopqrstuvwxyz",
    });
  });
  test("código tem 6 caracteres sem ambiguidade", () => {
    const code = generateActivationCode(new Uint8Array([0, 1, 2, 3, 4, 250]));
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
  });
  test("segredos são ocultados em erros", () => {
    expect(redactSecrets("x mo1:abcDEF_123 COMEÇAR K7P2QX token=abcdef123456")).not.toMatch(
      /abcDEF|K7P2QX|abcdef123456/,
    );
  });
  test("template Meta leva código e botão com token", () => {
    const p = buildMetaTemplatePayload({
      to: "+5511987654321",
      name: "compra",
      language: "pt_BR",
      buyerName: "Ana Souza",
      code: "K7P2QX",
      token: "tok",
      hasButton: true,
    });
    expect(p.to).toBe("5511987654321");
    expect(p.template.components[0].parameters.map((x: any) => x.text)).toEqual(["Ana", "K7P2QX"]);
    expect(p.template.components[1].parameters[0].payload).toBe("mo1:tok");
  });
});

describe("status de entrega", () => {
  test("não regride e preserva vínculo", () => {
    expect(mergeDeliveryStatus("read", "sent")).toBe("read");
    expect(mergeDeliveryStatus("sent", "delivered")).toBe("delivered");
    expect(mergeDeliveryStatus("paired", "read")).toBe("paired");
    expect(mergeDeliveryStatus("delivered", "failed")).toBe("delivered");
    expect(mergeDeliveryStatus("sent", "failed")).toBe("failed");
    expect(mapEvolutionAck("DELIVERY_ACK")).toBe("delivered");
    expect(mapEvolutionAck("READ")).toBe("read");
  });
});

describe("fluxo completo com backend simulado", () => {
  test("mesmo evento duas vezes = uma linha e um envio (idempotência)", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding } = await service();
    const input = {
      source: "kiwify" as const,
      eventKey: "kiwify:evt-1",
      companyId: COMPANY,
      buyerName: "ana souza",
      buyerPhone: "11987654321",
    };
    const first = await enqueuePurchaseOnboarding(input);
    const second = await enqueuePurchaseOnboarding(input);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(fake.tables.purchase_onboarding.length).toBe(1);
    expect(sent.length).toBe(1);
    expect(sent[0].body).toMatch(/COMEÇAR [2-9A-HJ-NP-Z]{6}/);
    expect(fake.tables.purchase_onboarding[0].status).toBe("sent");
    // O código em texto puro nunca é salvo, só o hash.
    expect(JSON.stringify(fake.tables.purchase_onboarding[0])).not.toContain(
      sent[0].body.match(/COMEÇAR ([A-Z0-9]{6})/)[1],
    );
  });

  test("envio Evolution usa a mensagem de compra aprovada salva no superadmin", async () => {
    seed({
      active_provider: "evolution",
      evolution_purchase_message:
        "Bem-vinda, {{nome}}! {{produto}} está pronta. Confirme com COMEÇAR {{codigo}}.",
    });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:custom-message",
      companyId: COMPANY,
      buyerName: "ana souza",
      buyerPhone: "11987654321",
    });
    expect(sent[0].body).toMatch(
      /^Bem-vinda, Ana! MárcIA está pronta\. Confirme com COMEÇAR [2-9A-HJ-NP-Z]{6}\.$/,
    );
  });

  test("compra sem telefone fica aguardando e não altera créditos/trial", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({ source: "cakto", eventKey: "cakto:1", companyId: COMPANY });
    expect(fake.tables.purchase_onboarding[0].status).toBe("awaiting_phone");
    expect(sent.length).toBe(0);
    expect(fake.tables.company[0]).toMatchObject({ creditos_saldo: 50, trial_ate: "2026-11-01" });
  });

  test("Meta sem template não envia nada", async () => {
    seed({ active_provider: "meta" });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "stripe",
      eventKey: "stripe:evt_1",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(fake.tables.purchase_onboarding[0].status).toBe("awaiting_template");
    expect(sent.length).toBe(0);
  });

  test("Meta com template aprovado envia template", async () => {
    seed({
      active_provider: "meta",
      meta_template_name: "compra_aprovada",
      meta_template_language: "pt_BR",
      meta_template_status: "APPROVED",
      meta_template_has_button: true,
    });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "stripe",
      eventKey: "stripe:evt_2",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(sent[0].provider).toBe("meta");
    expect(sent[0].body.type).toBe("template");
    expect(fake.tables.purchase_onboarding[0].provider_message_id).toBe("wamid-1");
  });

  test("falha no WhatsApp vira 'failed' sem lançar erro e sem vazar segredo", async () => {
    seed({ active_provider: "evolution" });
    evolutionFails = true;
    const { enqueuePurchaseOnboarding } = await service();
    const result = await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:fail",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(result.id).toBeTruthy();
    const row = fake.tables.purchase_onboarding[0];
    expect(row.status).toBe("failed");
    expect(row.last_error).not.toContain("abcdef123456");
  });

  test("dry-run não envia nem muda o status", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding, processPurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({ source: "cakto", eventKey: "cakto:dry", companyId: COMPANY });
    const id = fake.tables.purchase_onboarding[0].id;
    fake.tables.purchase_onboarding[0].buyer_phone_e164 = "+5511987654321";
    const result: any = await processPurchaseOnboarding(id, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(sent.length).toBe(0);
    expect(fake.tables.purchase_onboarding[0].status).toBe("awaiting_phone");
    expect(JSON.stringify(result.preview)).toContain("••••••");
  });

  test("pareamento: código certo vincula ao assinante, uso único", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding, tryActivatePurchase } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:pair",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    const code = sent[0].body.match(/COMEÇAR ([A-Z0-9]{6})/)[1];
    const wrong = await tryActivatePurchase({ phone: "5511987654321", message: "COMEÇAR ZZZZZZ" });
    expect(wrong).toMatchObject({ handled: true, ok: false });
    const ok: any = await tryActivatePurchase({ phone: "5511987654321", message: `começar ${code}` });
    expect(ok).toMatchObject({ handled: true, ok: true, companyId: COMPANY, userId: USER });
    expect(fake.tables.fin_whatsapp_identity[0]).toMatchObject({
      company_id: COMPANY,
      phone_e164: "+5511987654321",
      active: true,
    });
    expect(fake.tables.purchase_onboarding[0].status).toBe("paired");
    const again = await tryActivatePurchase({ phone: "5511987654321", message: `COMEÇAR ${code}` });
    expect(again).toMatchObject({ handled: true, ok: false });
  });

  test("telefone do comprador ativo em outro assinante gera conflito e não vincula", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding, tryActivatePurchase } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:conf",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    const code = sent[0].body.match(/COMEÇAR ([A-Z0-9]{6})/)[1];
    // O mesmo número passou a ficar ativo em outra assinatura depois do envio.
    fake.tables.fin_whatsapp_identity = [
      { company_id: OTHER, user_id: "x", phone_e164: "+5511987654321", active: true },
    ];
    const result = await tryActivatePurchase({ phone: "5511987654321", message: `COMEÇAR ${code}` });
    expect(result).toMatchObject({ handled: true, ok: false });
    expect(fake.tables.fin_whatsapp_identity.length).toBe(1);
    expect(fake.tables.purchase_onboarding[0].status).toBe("conflict");
  });

  test("código válido usado por outro telefone é recusado sem consumir nem alterar nada", async () => {
    seed(
      { active_provider: "evolution" },
      { fin_whatsapp_identity: [{ company_id: OTHER, user_id: "x", phone_e164: "+5511900000000", active: true }] },
    );
    const { enqueuePurchaseOnboarding, tryActivatePurchase } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:wrong-phone",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    const code = sent[0].body.match(/COMEÇAR ([A-Z0-9]{6})/)[1];
    const before = { ...fake.tables.purchase_onboarding[0] };
    const identitiesBefore = JSON.stringify(fake.tables.fin_whatsapp_identity);

    for (const intruder of ["5511900000000", "5521988887777"]) {
      const result: any = await tryActivatePurchase({ phone: intruder, message: `COMEÇAR ${code}` });
      expect(result).toMatchObject({ handled: true, ok: false });
      // Mesma resposta de código inválido: não revela que o código existe nem de quem é.
      expect(result.reply).toMatch(/venceu, já foi usado ou não existe/);
      expect(result.reply).not.toMatch(/9876|4321|Ana|vinculado/);
      expect(result.companyId).toBeUndefined();
    }
    const row = fake.tables.purchase_onboarding[0];
    expect(row.status).toBe(before.status);
    expect(row.activation_used_at ?? null).toBeNull();
    expect(row.paired_phone_e164 ?? null).toBeNull();
    expect(row.paired_at ?? null).toBeNull();
    expect(JSON.stringify(fake.tables.fin_whatsapp_identity)).toBe(identitiesBefore);
    // Evento registrado é redigido: sem telefone e sem código.
    const events = JSON.stringify(fake.tables.purchase_onboarding_event ?? []);
    expect(events).not.toContain("5511900000000");
    expect(events).not.toContain("5521988887777");
    expect(events).not.toContain(code);

    // O telefone correto continua conseguindo usar o mesmo código.
    const ok: any = await tryActivatePurchase({ phone: "5511987654321", message: `COMEÇAR ${code}` });
    expect(ok).toMatchObject({ handled: true, ok: true, companyId: COMPANY, userId: USER });
    expect(fake.tables.purchase_onboarding[0].status).toBe("paired");
    expect(
      fake.tables.fin_whatsapp_identity.find((i: any) => i.company_id === COMPANY)?.phone_e164,
    ).toBe("+5511987654321");
  });

  test("botão Começar (token) de outro telefone é recusado; do telefone certo vincula", async () => {
    seed({
      active_provider: "meta",
      meta_template_name: "compra_aprovada",
      meta_template_language: "pt_BR",
      meta_template_status: "APPROVED",
      meta_template_has_button: true,
    });
    const { enqueuePurchaseOnboarding, tryActivatePurchase } = await service();
    await enqueuePurchaseOnboarding({
      source: "stripe",
      eventKey: "stripe:token-phone",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    const payload = sent[0].body.template.components[1].parameters[0].payload as string;
    const intruder = await tryActivatePurchase({
      phone: "5521988887777",
      message: "Começar",
      buttonPayload: payload,
    });
    expect(intruder).toMatchObject({ handled: true, ok: false });
    expect(fake.tables.purchase_onboarding[0].activation_used_at ?? null).toBeNull();
    expect(fake.tables.fin_whatsapp_identity ?? []).toHaveLength(0);
    const ok = await tryActivatePurchase({ phone: "5511987654321", message: "Começar", buttonPayload: payload });
    expect(ok).toMatchObject({ handled: true, ok: true, companyId: COMPANY });
  });

  test("'Começar' sem código de outro telefone não encontra o pendente", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding, tryActivatePurchase } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:bare-other",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    const result = await tryActivatePurchase({ phone: "5521988887777", message: "Começar" });
    expect(result).toMatchObject({ handled: true, ok: false });
    expect(fake.tables.purchase_onboarding[0].activation_used_at ?? null).toBeNull();
    const ok = await tryActivatePurchase({ phone: "5511987654321", message: "Começar" });
    expect(ok).toMatchObject({ handled: true, ok: true });
  });

  test("dois pendentes no mesmo telefone: 'Começar' sozinho exige o código", async () => {
    seed({ active_provider: "evolution" });
    const { enqueuePurchaseOnboarding, tryActivatePurchase } = await service();
    for (const key of ["a", "b"]) {
      await enqueuePurchaseOnboarding({
        source: "kiwify",
        eventKey: `kiwify:${key}`,
        companyId: COMPANY,
        buyerPhone: "11987654321",
      });
    }
    const result: any = await tryActivatePurchase({ phone: "5511987654321", message: "Começar" });
    expect(result).toMatchObject({ handled: true, ok: false });
    expect(result.reply).toMatch(/código exato/);
    expect(fake.tables.fin_whatsapp_identity ?? []).toHaveLength(0);
  });

  test("renovação de número já vinculado não pede novo código", async () => {
    seed(
      { active_provider: "evolution" },
      { fin_whatsapp_identity: [{ company_id: COMPANY, user_id: USER, phone_e164: "+5511987654321", active: true }] },
    );
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:renew",
      kind: "renewal",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(sent[0].body).not.toMatch(/COMEÇAR/);
    expect(fake.tables.purchase_onboarding[0].activation_code_hash ?? null).toBeNull();
  });

  test("status que chega antes do envio é reconciliado depois", async () => {
    seed({ active_provider: "evolution" });
    const { applyDeliveryStatus, enqueuePurchaseOnboarding } = await service();
    await applyDeliveryStatus("evolution", "evo-1", "delivered", null, null);
    expect(fake.tables.whatsapp_status_inbox.length).toBe(1);
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:race",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(fake.tables.purchase_onboarding[0].status).toBe("delivered");
  });
});

describe("provedor ativo diferente do registro configurado", () => {
  test("Evolution ativa com registro sobrescrito pela Meta: aguarda e não envia", async () => {
    seed({ active_provider: "evolution", provider: "meta", status: "connected" });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "kiwify",
      eventKey: "kiwify:mismatch-evo",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(sent.length).toBe(0);
    expect(fake.tables.purchase_onboarding[0].status).toBe("awaiting_channel");
    expect(fake.tables.purchase_onboarding[0].activation_code_hash ?? null).toBeNull();
  });

  test("Meta ativa com registro sobrescrito pela Evolution: aguarda e não envia texto livre", async () => {
    seed({
      active_provider: "meta",
      provider: "evolution",
      status: "connected",
      meta_template_name: "compra_aprovada",
      meta_template_status: "APPROVED",
      meta_template_has_button: true,
    });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "stripe",
      eventKey: "stripe:mismatch-meta",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(sent.length).toBe(0);
    expect(fake.tables.purchase_onboarding[0].status).toBe("awaiting_channel");
  });

  test("canal ativo correto mas desconectado também aguarda", async () => {
    seed({ active_provider: "evolution", provider: "evolution", status: "error" });
    const { enqueuePurchaseOnboarding } = await service();
    await enqueuePurchaseOnboarding({
      source: "cakto",
      eventKey: "cakto:disconnected",
      companyId: COMPANY,
      buyerPhone: "11987654321",
    });
    expect(sent.length).toBe(0);
    expect(fake.tables.purchase_onboarding[0].status).toBe("awaiting_channel");
  });
});
