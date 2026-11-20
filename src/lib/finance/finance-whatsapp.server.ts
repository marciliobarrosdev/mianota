/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WhatsApp financeiro da MIA (número do próprio assinante e canal central).
 *
 * Fluxo de cada mensagem recebida:
 *  1. "VINCULAR 12345678" liga o celular a quem gerou o código (`pairFinanceWhatsapp`).
 *  2. Celular vinculado + plano com o recurso → CANCELAR / CONFIRMAR resolvem o
 *     pedido em andamento sem gastar crédito.
 *  3. Qualquer outra mensagem gasta 1 crédito de IA (devolvido se algo falhar),
 *     vira um rascunho e a MIA pergunta o que falta ou pede confirmação.
 *     Resumos são respondidos na hora.
 *
 * Regras puras: `finance-whatsapp-rules.ts`; IA: `finance-whatsapp-ai.server.ts`;
 * banco: `finance-whatsapp-actions.server.ts`.
 */
import {
  execute,
  loadContext,
  summary,
  whatsappFinanceEnabled,
} from "@/lib/finance/finance-whatsapp-actions.server";
import { interpret } from "@/lib/finance/finance-whatsapp-ai.server";
import {
  completeDraft,
  fold,
  isCancelReply,
  isConfirmReply,
  merge,
  normalize,
  pairingCode,
  preview,
  question,
  resolve,
  todaySaoPaulo,
  type Draft,
} from "@/lib/finance/finance-whatsapp-rules";

export async function pairFinanceWhatsapp(input: {
  db: any;
  companyId: string;
  phone: string;
  displayName?: string | null;
  message: string;
}) {
  const code = pairingCode(input.message);
  if (!code) return null;
  if (!(await whatsappFinanceEnabled(input.db, input.companyId))) {
    return {
      ok: false,
      reply: "O WhatsApp financeiro está disponível no plano Pro. Faça o upgrade no aplicativo.",
    };
  }
  const pairing = await input.db
    .from("fin_whatsapp_pairing")
    .select("id,user_id,expires_at,used_at")
    .eq("company_id", input.companyId)
    .eq("code", code)
    .maybeSingle();
  if (pairing.error) throw new Error(pairing.error.message);
  if (
    !pairing.data ||
    pairing.data.used_at ||
    new Date(pairing.data.expires_at).getTime() < Date.now()
  ) {
    return {
      ok: false,
      reply: "Esse código venceu ou não existe. Gere outro na área WhatsApp do aplicativo.",
    };
  }
  const phoneE164 = `+${input.phone.replace(/\D/g, "")}`;
  const deactivated = await input.db
    .from("fin_whatsapp_identity")
    .update({ active: false })
    .eq("phone_e164", phoneE164)
    .neq("company_id", input.companyId);
  if (deactivated.error) throw new Error(deactivated.error.message);
  const saved = await input.db.from("fin_whatsapp_identity").upsert(
    {
      company_id: input.companyId,
      user_id: pairing.data.user_id,
      phone_e164: phoneE164,
      display_name: input.displayName || null,
      active: true,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "company_id,user_id" },
  );
  if (saved.error) throw new Error(saved.error.message);
  await input.db
    .from("fin_whatsapp_pairing")
    .update({ used_at: new Date().toISOString() })
    .eq("company_id", input.companyId)
    .eq("id", pairing.data.id);
  return {
    ok: true,
    userId: pairing.data.user_id as string,
    reply:
      "Celular vinculado com segurança. Agora você pode mandar um gasto, receita, conta, meta ou perguntar pelo seu mês.",
  };
}

export async function handleFinanceWhatsapp(input: {
  db: any;
  companyId: string;
  phone: string;
  message: string;
  imageDataUrl?: string | null;
  /** Id estável da mensagem recebida: reenvios do webhook não cobram crédito de novo. */
  messageRef?: string | null;
}) {
  if (!(await whatsappFinanceEnabled(input.db, input.companyId))) {
    return {
      authorized: false,
      reply: "O WhatsApp financeiro está disponível no plano Pro. Faça o upgrade no aplicativo.",
    };
  }
  const phoneE164 = `+${input.phone.replace(/\D/g, "")}`;
  const identity = await input.db
    .from("fin_whatsapp_identity")
    .select("id,user_id,active")
    .eq("company_id", input.companyId)
    .eq("phone_e164", phoneE164)
    .eq("active", true)
    .maybeSingle();
  if (identity.error) throw new Error(identity.error.message);
  if (!identity.data)
    return {
      authorized: false,
      reply:
        "Este celular ainda não está vinculado. Abra o aplicativo, entre em WhatsApp e gere seu código de segurança.",
    };
  const userId = identity.data.user_id as string;
  await input.db
    .from("fin_whatsapp_identity")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", identity.data.id);
  const lower = fold(input.message);
  const active = await input.db
    .from("marcia_ai_command")
    .select("*")
    .eq("company_id", input.companyId)
    .eq("user_id", userId)
    .in("status", ["question", "ready"])
    .gte("updated_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active.error) throw new Error(active.error.message);
  if (active.data && isCancelReply(lower)) {
    await input.db
      .from("marcia_ai_command")
      .update({ status: "cancelled" })
      .eq("company_id", input.companyId)
      .eq("id", active.data.id);
    return { authorized: true, userId, reply: "Tudo bem. Cancelei essa ação." };
  }

  // Se o envio da resposta falhou após a gravação da despesa e o usuário ou webhook
  // repete "CONFIRMAR", recupera o resultado já gravado sem alterar o saldo novamente.
  if (!active.data && isConfirmReply(lower)) {
    const recentlyExecuted = await input.db
      .from("marcia_ai_command")
      .select("*")
      .eq("company_id", input.companyId)
      .eq("user_id", userId)
      .eq("status", "executed")
      .gte("updated_at", new Date(Date.now() - 5 * 60_000).toISOString())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentlyExecuted.data?.result?.message) {
      return {
        authorized: true,
        userId,
        reply: recentlyExecuted.data.result.message,
      };
    }
  }
  if (active.data?.status === "ready" && isConfirmReply(lower)) {
    try {
      return {
        authorized: true,
        userId,
        reply: await (async () => {
          const done = await execute(input.db, input.companyId, userId, active.data);
          const rules = await import("@/lib/ai/assistant-profile-rules");
          const { data: comp } = await input.db
            .from("company")
            .select("finance_profile")
            .eq("id", input.companyId)
            .maybeSingle();
          return rules.personalizeReply(
            done,
            rules.normalizeAssistantProfile(comp?.finance_profile),
            { tail: true },
          );
        })(),
      };
    } catch (error: any) {
      await input.db
        .from("marcia_ai_command")
        .update({
          status: "failed",
          error_message: String(error?.message || "Falha ao executar").slice(0, 500),
        })
        .eq("company_id", input.companyId)
        .eq("id", active.data.id);
      throw error;
    }
  }

  const creditRef = `whatsapp-finance:${input.messageRef || crypto.randomUUID()}`;
  const consumed = await input.db.rpc("consume_ai_credit", {
    _company_id: input.companyId,
    _ref: creditRef,
  });
  if (consumed.error) throw new Error(consumed.error.message);
  if (!consumed.data)
    return {
      authorized: true,
      userId,
      reply:
        "Seus créditos de IA terminaram. Ative ou renove seu plano no aplicativo para continuar.",
    };
  let draft: Draft;
  let profile: import("@/lib/ai/assistant-profile-rules").AssistantProfile | null = null;
  const personal = async (t: string, tail = false) => {
    const { personalizeReply } = await import("@/lib/ai/assistant-profile-rules");
    return profile ? personalizeReply(t, profile, { tail }) : t;
  };
  try {
    const context = await loadContext(input.db, input.companyId);
    const previous = active.data ? normalize(active.data.draft) : null;
    const rules = await import("@/lib/ai/assistant-profile-rules");
    const { data: comp } = await input.db
      .from("company")
      .select("finance_profile")
      .eq("id", input.companyId)
      .maybeSingle();
    profile = rules.normalizeAssistantProfile(comp?.finance_profile);
    const names = new Map(context.categories.map((c: any) => [c.id, c.name]));
    const interpreted = await interpret(
      input.message,
      previous,
      context,
      input.imageDataUrl,
      rules.assistantProfilePrompt(profile, names),
    );
    const forced = rules.matchCategoryRule(input.message, profile.category_rules);
    if (forced && names.has(forced)) {
      interpreted.categoryId = forced;
      interpreted.categoryName = names.get(forced) || null;
    }
    draft = resolve(merge(previous, interpreted), context);
    completeDraft(draft, input.message, previous, todaySaoPaulo());
    (draft as any).whatsappNumber = phoneE164;
    const commandId = active.data?.id || crypto.randomUUID();
    const messages = [
      ...(Array.isArray(active.data?.messages) ? active.data.messages : []),
      {
        role: "user",
        content: input.message,
        at: new Date().toISOString(),
        source: input.imageDataUrl ? "receipt" : "text",
      },
    ];
    if (draft.intent === "query_summary") {
      const answer = await personal(
        await summary(input.db, input.companyId, draft.queryPeriod || "month"),
      );
      messages.push({ role: "assistant", content: answer, at: new Date().toISOString() });
      const saved = await input.db.from("marcia_ai_command").upsert({
        id: commandId,
        company_id: input.companyId,
        user_id: userId,
        status: "executed",
        intent: draft.intent,
        messages,
        draft,
        result: { message: answer },
        executed_at: new Date().toISOString(),
      });
      if (saved.error) throw new Error(saved.error.message);
      return { authorized: true, userId, reply: answer, creditRef };
    }
    const field = draft.missing?.[0]; // sempre preenchido por completeDraft
    const reply = await personal(
      field
        ? question(field, context)
        : `Entendi. Confira antes de eu registrar:\n\n${preview(draft)}\n\nResponda *CONFIRMAR* para salvar ou *CANCELAR*.`,
    );
    messages.push({ role: "assistant", content: reply, at: new Date().toISOString() });
    const saved = await input.db.from("marcia_ai_command").upsert({
      id: commandId,
      company_id: input.companyId,
      user_id: userId,
      status: field ? "question" : "ready",
      intent: draft.intent,
      messages,
      draft,
      result: null,
      error_message: null,
    });
    if (saved.error) throw new Error(saved.error.message);
    return { authorized: true, userId, reply, creditRef };
  } catch (error) {
    await input.db.rpc("refund_ai_credit", { _company_id: input.companyId, _ref: creditRef });
    throw error;
  }
}
