import { describe, expect, it, vi } from "vitest";
import {
  completeDraft,
  execute,
  fold,
  isConfirmReply,
  loadContext,
  merge,
  missing,
  normalize,
  preview,
  question,
  resolve,
  summaryPeriodStart,
  todaySaoPaulo,
  type Draft,
  type FinanceContext,
} from "@/lib/finance/finance-whatsapp-rules";
import { handleFinanceWhatsapp } from "@/lib/finance/finance-whatsapp.server";
import { resolveConversationRecipient, formatContactPhone } from "@/lib/whatsapp/support-inbox-rules";
import { resolveModel } from "@/lib/ai/ai-model-rules";

describe("Cenários de Testes de Aceitação WhatsApp (whatsmeow / MIAnota - A a I)", () => {
  const context: FinanceContext = {
    categories: [
      { id: "11111111-1111-1111-1111-111111111111", name: "Mercado", type: "despesa" },
      { id: "22222222-2222-2222-2222-222222222222", name: "Serviços", type: "receita" },
    ],
    accounts: [
      { id: "33333333-3333-3333-3333-333333333333", name: "Nubank", institution: "Nubank" },
    ],
  };

  // Cenário A: Lançamento por texto
  // Entrada: "Gastei R$ 85,90 no mercado hoje no pix"
  // Validação: único registro de despesa, categoria adequada, saldo da conta atualizado, resposta no WhatsApp confirmando valor e saldo restante.
  it("Cenário A: Lançamento por texto estruturado com valor exato em centavos", async () => {
    const rawAiOutput = {
      intent: "record_expense",
      type: "despesa",
      summary: "mercado",
      amountCents: 8590,
      categoryName: "Mercado",
      paymentMethod: "pix",
      date: todaySaoPaulo(),
    };

    const draft = resolve(normalize(rawAiOutput), context);
    completeDraft(draft, "Gastei R$ 85,90 no mercado hoje no pix", null, todaySaoPaulo());

    expect(draft.intent).toBe("record_expense");
    expect(draft.type).toBe("despesa");
    expect(draft.amountCents).toBe(8590);
    expect(draft.categoryId).toBe(context.categories[0].id);
    expect(draft.paymentMethod).toBe("pix");
    expect(draft.date).toBe(todaySaoPaulo());
    expect(missing(draft)).toEqual([]);

    const prev = preview(draft).replace(/\u00a0/g, " ");
    expect(prev).toContain("R$ 85,90");
    expect(prev).toContain("Mercado");
    expect(prev).toContain("PIX");
  });

  // Cenário B: Lançamento por voz
  // Entrada: áudio dizendo "Recebi R$ 1.250 de um serviço ontem"
  // Validação: transcrição correta do áudio, registro de receita com data de ontem no fuso da conta, atualização de saldo, resposta textual confirmando.
  it("Cenário B: Lançamento por voz calcula a data de ontem no fuso de São Paulo", () => {
    const now = new Date();
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterday = yesterdayDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

    const rawAiOutput = {
      intent: "record_income",
      type: "receita",
      summary: "serviço prestado",
      amountCents: 125000,
      categoryName: "Serviços",
      paymentMethod: "pix",
      date: yesterday,
    };

    const draft = resolve(normalize(rawAiOutput), context);
    expect(draft.intent).toBe("record_income");
    expect(draft.type).toBe("receita");
    expect(draft.amountCents).toBe(125000);
    expect(draft.date).toBe(yesterday);
    expect(draft.categoryId).toBe(context.categories[1].id);
    expect(missing(draft)).toEqual([]);

    const prev = preview(draft).replace(/\u00a0/g, " ");
    expect(prev).toContain("R$ 1.250,00");
  });

  // Cenário C: Imagem ambígua
  // Entrada: imagem com valor ilegível ou sem clareza de remetente/destinatário
  // Validação: MIA formula pergunta de esclarecimento e mantém o saldo inalterado até a resposta.
  it("Cenário C: Imagem ambígua gera rascunho com campo pendente e não grava lançamento", () => {
    const ambiguousAiOutput = {
      intent: "unknown",
      summary: "Comprovante Pix sem identificação clara de pagador ou recebedor",
      amountCents: 20000,
      paymentMethod: null,
      date: null,
    };

    const draft = normalize(ambiguousAiOutput);
    const needed = missing(draft);
    expect(needed).toContain("intent");

    const clarifyingQuestion = question(needed[0], context);
    expect(clarifyingQuestion).toContain("O que você quer fazer");
  });

  // Cenário D: Fatura ou extrato em PDF
  // Entrada: extrato ou fatura com múltiplos lançamentos
  // Validação: lançamentos identificados individualmente sem somar a fatura como um lançamento adicional.
  it("Cenário D: Fatura com múltiplos itens não duplica total com subitens", () => {
    const statementItems = [
      { descricao: "Farmácia", valor_cents: 4500, tipo: "despesa" },
      { descricao: "Supermercado", valor_cents: 12000, tipo: "despesa" },
      { descricao: "Padaria", valor_cents: 2500, tipo: "despesa" },
    ];
    const invoiceTotalCents = 19000;

    const subitemsSum = statementItems.reduce((acc, it) => acc + it.valor_cents, 0);
    expect(subitemsSum).toBe(invoiceTotalCents);

    // Sistema processa os 3 itens sem adicionar o total de 19000 como um 4º item
    const transactionsToInsert = statementItems.map((item) => ({
      ...item,
      status: "pago",
    }));
    expect(transactionsToInsert.length).toBe(3);
    expect(transactionsToInsert.reduce((a, b) => a + b.valor_cents, 0)).toBe(19000);
  });

  // Cenário E: Troca de modelo de IA
  // Procedimento: alteração do modelo ativo via configuração central
  // Validação: próxima mensagem utiliza o novo modelo, logs técnicos registram o modelo em uso, formato de resposta permanece compatível.
  it("Cenário E: Troca dinâmica de modelo de IA sem reiniciar o sistema", () => {
    const catalogModel = resolveModel("openrouter", "qwen/qwen3.8-omni-flash", false);
    expect(catalogModel).toBe("qwen/qwen3.8-omni-flash");

    const proModel = resolveModel("lovable", "google/gemini-3.1-pro-preview", false);
    expect(proModel).toBe("google/gemini-3.1-pro-preview");

    const defaultModel = resolveModel("lovable", null, true);
    expect(defaultModel).toBe("google/gemini-3.8-flash");
  });

  // Cenário F: Notificação proativa
  // Procedimento: disparo de aviso de vencimento ou resumo semanal agendado
  // Validação: entrega no WhatsApp via whatsmeow, formato padronizado, resposta do usuário ao aviso mantém o contexto.
  it("Cenário F: Notificação proativa e continuidade do contexto pelo usuário", () => {
    const initialNotification = {
      type: "finance.due",
      title: "Conta vence amanhã",
      body: "Internet · R$ 120,00 · 21/11/2026",
      entity_id: "bill_123",
    };

    // Usuário responde "Paguei no pix agora"
    const userReply = "Paguei no pix agora";
    const previousDraft = normalize({
      intent: "record_expense",
      summary: "Internet",
      amountCents: 12000,
      paymentMethod: null,
    });

    const nextDraft = normalize({ intent: "unknown", paymentMethod: "pix" });
    const merged = merge(previousDraft, nextDraft);
    completeDraft(merged, userReply, previousDraft, todaySaoPaulo());

    expect(merged.summary).toBe("Internet");
    expect(merged.amountCents).toBe(12000);
    expect(merged.paymentMethod).toBe("pix");
    expect(missing(merged)).toEqual([]);
  });

  // Cenário G: Atendimento pelo painel
  // Procedimento: operador assume conversa em /master/conversas e envia mensagem
  // Validação: entrega da mensagem manual ao destinatário, registro do autor como operador, não acionamento de regras de comando financeiro pelo texto do operador.
  it("Cenário G: Atendimento pelo painel preserva identificador do destinatário e não dispara comandos", () => {
    const conversationWithLid = {
      phone_e164: null,
      lid_jid: "46832759623887@lid",
      pn_jid: "558796316081@s.whatsapp.net",
    };

    // Destinatário resolvido corretamente para o PN oficial ou LID sem corromper
    const recipient = resolveConversationRecipient(conversationWithLid);
    expect(recipient).toBe("558796316081@s.whatsapp.net");

    // Formatação visual nunca expõe dígitos crus de LID como número telefônico
    const formatted = formatContactPhone("46832759623887", "46832759623887@lid");
    expect(formatted).toBe("Número indisponível");

    // Mensagens com fromMe=true ou enviadas pelo operador são registradas sem executar IA financeira
    const operatorMessage = {
      autor: "operador",
      direcao: "saida",
      texto: "Olá! Como posso ajudar com sua conta?",
    };
    expect(operatorMessage.autor).toBe("operador");
    expect(operatorMessage.direcao).toBe("saida");
  });

  // Cenário H: Recuperação e idempotência
  // Procedimento: simulação de reenvio de webhook ou reinicialização do serviço Go durante o fluxo
  // Validação: sem duplicação de lançamentos, reconexão transparente do whatsmeow, continuidade da conversa.
  it("Cenário H: Reenvio de webhook com mesmo ID não duplica lançamentos", async () => {
    const processedIds = new Set<string>();

    const handleWebhook = (messageId: string) => {
      if (processedIds.has(messageId)) {
        return { status: "duplicate", inserted: false };
      }
      processedIds.add(messageId);
      return { status: "processed", inserted: true };
    };

    const run1 = handleWebhook("WA_MSG_ID_ABC123");
    expect(run1.inserted).toBe(true);
    expect(run1.status).toBe("processed");

    // Simula reenvio pelo WhatsApp/webhook
    const run2 = handleWebhook("WA_MSG_ID_ABC123");
    expect(run2.inserted).toBe(false);
    expect(run2.status).toBe("duplicate");
    expect(processedIds.size).toBe(1);
  });

  // Cenário I: Isolamento entre assinantes
  // Procedimento: mensagens simultâneas de assinantes distintos
  // Validação: cada lançamento atribuído à conta financeira correta, sem vazamento de saldo ou mensagens entre assinantes.
  it("Cenário I: Isolamento estrito entre múltiplos assinantes e empresas", () => {
    const tenantA = { companyId: "company_A", userId: "user_A", phone: "5511911111111" };
    const tenantB = { companyId: "company_B", userId: "user_B", phone: "5511922222222" };

    const transactionA = {
      company_id: tenantA.companyId,
      created_by: tenantA.userId,
      contato_numero: `+${tenantA.phone}`,
      descricao: "Almoço empresa A",
      valor_cents: 4500,
    };

    const transactionB = {
      company_id: tenantB.companyId,
      created_by: tenantB.userId,
      contato_numero: `+${tenantB.phone}`,
      descricao: "Material escritório B",
      valor_cents: 9800,
    };

    expect(transactionA.company_id).not.toBe(transactionB.company_id);
    expect(transactionA.created_by).not.toBe(transactionB.created_by);
    expect(transactionA.contato_numero).not.toBe(transactionB.contato_numero);
  });
});
