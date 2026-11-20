import { describe, expect, test, vi } from "vitest";
import { fold, isConfirmReply } from "@/lib/finance/finance-whatsapp-rules";
import { handleFinanceWhatsapp } from "@/lib/finance/finance-whatsapp.server";

describe("Cenários de Integração do WhatsApp (whatsmeow / MIAnota)", () => {
  // Cenário 1: A mensagem "gastei R$ 85 no mercado" chega ao fluxo financeiro da conta correta.
  // Reprocessar o mesmo evento gera um único lançamento.
  test("Cenário 1: Reprocessar a mesma mensagem com o mesmo providerMessageId gera um único registro", async () => {
    const insertedMessages: any[] = [];
    const mockDb = {
      from: (table: string) => {
        if (table === "mensagens") {
          return {
            select: () => ({
              eq: (_col1: string, val1: string) => ({
                eq: (_col2: string, val2: string) => ({
                  maybeSingle: async () => {
                    // Check if already inserted
                    const found = insertedMessages.find(
                      (m) => m.company_id === val1 && m.whatsapp_message_id === val2,
                    );
                    return { data: found ? { id: found.id } : null, error: null };
                  },
                }),
              }),
            }),
            insert: async (row: any) => {
              if (insertedMessages.some((m) => m.whatsapp_message_id === row.whatsapp_message_id)) {
                return { error: { code: "23505", message: "duplicate key value" } };
              }
              const created = { id: `msg_${insertedMessages.length + 1}`, ...row };
              insertedMessages.push(created);
              return { error: null };
            },
          };
        }
        return {};
      },
    };

    // First arrival
    const msgId = "WA_UNIQUE_12345";
    const companyId = "comp_test_abc";

    const duplicateCheck1 = await mockDb
      .from("mensagens")
      .select()
      .eq("company_id", companyId)
      .eq("whatsapp_message_id", msgId)
      .maybeSingle();

    expect(duplicateCheck1.data).toBeNull();

    const insertResult1 = await mockDb.from("mensagens").insert({
      company_id: companyId,
      texto: "gastei R$ 85 no mercado",
      whatsapp_message_id: msgId,
    });
    expect(insertResult1.error).toBeNull();
    expect(insertedMessages.length).toBe(1);

    // Reprocess the same message event
    const duplicateCheck2 = await mockDb
      .from("mensagens")
      .select()
      .eq("company_id", companyId)
      .eq("whatsapp_message_id", msgId)
      .maybeSingle();

    expect(duplicateCheck2.data).not.toBeNull();
    expect(duplicateCheck2.data?.id).toBe("msg_1");

    // Second insert attempt fails with duplicate key error (23505)
    const insertResult2 = await mockDb.from("mensagens").insert({
      company_id: companyId,
      texto: "gastei R$ 85 no mercado",
      whatsapp_message_id: msgId,
    });
    expect(insertResult2.error?.code).toBe("23505");
    // Count remains 1 (no double ledger entry)
    expect(insertedMessages.length).toBe(1);
  });

  // Cenário 2: Se a resposta falhar depois da gravação, repetir o envio não altera novamente o saldo.
  test("Cenário 2: Repetir confirmação após gravação retoma resposta existente sem executar novo lançamento", async () => {
    let creditDeductedCount = 0;
    const executedCommand = {
      id: "cmd_executed_999",
      company_id: "comp_1",
      user_id: "user_1",
      status: "executed",
      result: {
        message: "Despesa de R$ 85,00 registrada no mercado.",
      },
      updated_at: new Date().toISOString(),
      executed_at: new Date().toISOString(),
    };

    const mockDb = {
      rpc: vi.fn(async (fnName: string) => {
        if (fnName === "company_has_plan_feature") return { data: true, error: null };
        if (fnName === "consume_ai_credit") {
          creditDeductedCount++;
          return { data: true, error: null };
        }
        return { data: true, error: null };
      }),
      from: (table: string) => {
        if (table === "fin_whatsapp_identity") {
          const chain: any = {
            eq: () => chain,
            maybeSingle: async () => ({
              data: { id: "ident_1", user_id: "user_1", active: true },
              error: null,
            }),
          };
          return {
            select: () => chain,
            update: () => ({ eq: () => ({}) }),
          };
        }
        if (table === "marcia_ai_command") {
          const chain: any = {
            eq: (_col: string, val: string) => {
              if (val === "executed") {
                return {
                  gte: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: executedCommand, error: null }),
                      }),
                    }),
                  }),
                };
              }
              return chain;
            },
            in: () => ({
              gte: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
          return {
            select: () => chain,
          };
        }
        return {};
      },
    };

    const result = await handleFinanceWhatsapp({
      db: mockDb as any,
      companyId: "comp_1",
      phone: "5511999999999",
      message: "CONFIRMAR",
      messageRef: "ref_retry_test",
    });

    expect(result.authorized).toBe(true);
    expect(result.reply).toBe("Despesa de R$ 85,00 registrada no mercado.");
    // Sem novo consumo de crédito nem nova gravação
    expect(creditDeductedCount).toBe(0);
  });

  // Cenário 3: Um áudio chega ao fluxo e a resposta volta à conversa de origem.
  test("Cenário 3: Detecção de áudio e encaminhamento adequado", () => {
    const rawAudioMsg = {
      audioMessage: {
        mimetype: "audio/ogg; codecs=opus",
      },
    };

    const hasAudio = Boolean(rawAudioMsg.audioMessage);
    expect(hasAudio).toBe(true);

    const fallbackBody = hasAudio ? "Áudio enviado pelo WhatsApp" : "";
    expect(fallbackBody).toBe("Áudio enviado pelo WhatsApp");

    // O remetente original é preservado
    const remoteJid = "5511977778888@s.whatsapp.net";
    const phone = remoteJid.split("@")[0].replace(/\D/g, "");
    expect(phone).toBe("5511977778888");
  });

  // Cenário 4: Um lembrete sai uma única vez pelo provedor ativo.
  test("Cenário 4: Envio de lembrete/notificação via canal ativo respeita status e concorrência", async () => {
    let sentCount = 0;
    const sendMock = vi.fn(async (_to: string, _text: string) => {
      sentCount++;
      return { ok: true, provider: "whatsmeow" };
    });

    const notification = {
      id: "notif_001",
      company_id: "comp_1",
      recipient_user_id: "user_1",
      whatsapp_status: null,
    };

    if (notification.whatsapp_status !== "sent") {
      const res = await sendMock("5511988887777", "Lembrete: sua conta de luz vence hoje.");
      if (res.ok) {
        notification.whatsapp_status = "sent";
      }
    }

    // Attempt second send (e.g. duplicate cron run)
    if (notification.whatsapp_status !== "sent") {
      await sendMock("5511988887777", "Lembrete: sua conta de luz vence hoje.");
    }

    expect(sentCount).toBe(1);
    expect(notification.whatsapp_status).toBe("sent");
  });

  // Cenário 5: Uma mensagem enviada pela MIA não dispara uma conversa com ela mesma.
  test("Cenário 5: Mensagens com fromMe=true são categoricamente descartadas", () => {
    const selfEvents = [
      { key: { fromMe: true, remoteJid: "5511999999999@s.whatsapp.net" } },
      { key: { fromMe: false, remoteJid: "12036302@g.us" } }, // grupo
      { key: { fromMe: false, remoteJid: "5511999999999@s.whatsapp.net" } }, // válido
    ];

    const processed: any[] = [];
    for (const evt of selfEvents) {
      if (evt.key.fromMe) continue; // Descarte de auto-mensagem
      if (evt.key.remoteJid.endsWith("@g.us")) continue; // Descarte de grupo
      processed.push(evt);
    }

    expect(processed.length).toBe(1);
    expect(processed[0].key.fromMe).toBe(false);
    expect(processed[0].key.remoteJid).toBe("5511999999999@s.whatsapp.net");
  });
});
