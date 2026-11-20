import { describe, expect, test } from "vitest";
import {
  formatContactPhone,
  getStatusBadge,
  getMessageAuthor,
  isDeletionConfirmationValid,
  dayLabel,
  startsNewDay,
  resolveConversationRecipient,
} from "@/lib/whatsapp/support-inbox-rules";

describe("Support Inbox Rules", () => {
  test("formatContactPhone formata telefones válidos com código do país e DDD", () => {
    expect(formatContactPhone("5511999998888")).toBe("+55 (11) 99999-8888");
    expect(formatContactPhone("551133334444")).toBe("+55 (11) 3333-4444");
  });

  test("formatContactPhone retorna 'Número indisponível' quando phone é vazio ou indisponivel e há LID", () => {
    expect(formatContactPhone("indisponivel", "123456789@lid")).toBe("Número indisponível");
    expect(formatContactPhone(null, "123456789@lid")).toBe("Número indisponível");
    expect(formatContactPhone("", "123456789@lid")).toBe("Número indisponível");
    expect(formatContactPhone(null, null)).toBe("Sem número");
  });

  test("getStatusBadge retorna rótulo e classes corretas para cada situação", () => {
    expect(getStatusBadge("pending").label).toBe("Aguardando");
    expect(getStatusBadge("open").label).toBe("Em atendimento");
    expect(getStatusBadge("resolved").label).toBe("Resolvida");
  });

  test("getMessageAuthor identifica assinante, MIA (IA), celular vinculado e atendente", () => {
    const inbound = getMessageAuthor({
      direction: "inbound",
      sender_name: "João Silva",
    });
    expect(inbound.type).toBe("subscriber");
    expect(inbound.label).toBe("João Silva");

    const ai = getMessageAuthor({
      direction: "outbound",
      sender_type: "system",
    });
    expect(ai.type).toBe("ai");
    expect(ai.label).toBe("MIA (IA)");

    const linkedPhone = getMessageAuthor({
      direction: "outbound",
      sender_type: "owner",
      sender_name: "Celular vinculado",
    });
    expect(linkedPhone.type).toBe("linked_phone");
    expect(linkedPhone.label).toBe("Celular vinculado");

    const operator = getMessageAuthor({
      direction: "outbound",
      sender_type: "owner",
      sender_name: "Marcílio Santos",
    });
    expect(operator.type).toBe("operator");
    expect(operator.label).toBe("Marcílio Santos");
  });

  test("isDeletionConfirmationValid valida nome, telefone ou palavra-chave", () => {
    const contact = { name: "Maria Oliveira", phone: "5511987654321" };

    expect(isDeletionConfirmationValid("excluir", contact)).toBe(true);
    expect(isDeletionConfirmationValid("confirmar", contact)).toBe(true);
    expect(isDeletionConfirmationValid("Maria Oliveira", contact)).toBe(true);
    expect(isDeletionConfirmationValid("maria oliveira", contact)).toBe(true);
    expect(isDeletionConfirmationValid("5511987654321", contact)).toBe(true);
    expect(isDeletionConfirmationValid("(11) 98765-4321", contact)).toBe(false); // input sem 55 ou diferente dos dígitos
    expect(isDeletionConfirmationValid("+55 (11) 98765-4321", contact)).toBe(true);

    expect(isDeletionConfirmationValid("outro texto", contact)).toBe(false);
    expect(isDeletionConfirmationValid("", contact)).toBe(false);
  });

  test("dayLabel e startsNewDay agrupam corretamente datas", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const todayIso = "2026-11-20T10:00:00Z";
    const yesterdayIso = "2026-11-19T20:00:00Z";

    expect(dayLabel(todayIso, now)).toBe("Hoje");
    expect(dayLabel(yesterdayIso, now)).toBe("Ontem");

    expect(startsNewDay(yesterdayIso, todayIso)).toBe(true);
    expect(startsNewDay(todayIso, "2026-11-20T11:00:00Z")).toBe(false);
  });

  test("resolveConversationRecipient seleciona corretamente PN JID, telefone ou LID JID", () => {
    // Caso 1: Quando PN JID existe, usa o PN JID canônico
    expect(
      resolveConversationRecipient({
        phone_e164: "46832759623887",
        lid_jid: "46832759623887@lid",
        pn_jid: "558796316081@s.whatsapp.net",
      }),
    ).toBe("558796316081@s.whatsapp.net");

    // Caso 2: Quando só temos LID JID, envia com sufixo @lid para o WhatsApp rotear para o servidor de LIDs
    expect(
      resolveConversationRecipient({
        phone_e164: "indisponivel",
        lid_jid: "46832759623887@lid",
      }),
    ).toBe("46832759623887@lid");

    // Caso 3: Quando phone_e164 coincide com os dígitos do LID, NÃO envia como @s.whatsapp.net, mas como @lid
    expect(
      resolveConversationRecipient({
        phone_e164: "46832759623887",
        lid_jid: "46832759623887@lid",
      }),
    ).toBe("46832759623887@lid");

    // Caso 4: Telefone normal brasileiro
    expect(
      resolveConversationRecipient({
        phone_e164: "558781633477",
      }),
    ).toBe("558781633477");
  });
});
