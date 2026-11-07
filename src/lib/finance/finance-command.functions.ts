/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Funções de servidor do chat financeiro da MIA no app (/app/mia e Planejamento).
 *
 * interpretar → (perguntas) → confirmar/executar → desfazer (janela curta) | cancelar.
 * Cada pedido vive em `marcia_ai_command` (nome histórico da tabela, mantido para não perder dados).
 * Regras puras: `finance-command-rules.ts`. Banco/IA: `finance-command.server.ts` (import dinâmico).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  actionMessage,
  applyDraftDefaults,
  commandsToChatHistory,
  mergeDraft,
  normalizeDraft,
  previewFor,
  questionFor,
  requiredFields,
  resolveEntities,
  todayInSaoPaulo,
  type FinanceCommandDraft,
  type FinanceCommandTurn,
  type FinanceChatHistoryMessage,
} from "@/lib/finance/finance-command-rules";

export type {
  FinanceCommandDraft,
  FinanceCommandIntent,
  FinanceCommandTurn,
  FinanceChatHistoryMessage,
} from "@/lib/finance/finance-command-rules";

const server = () => import("@/lib/finance/finance-command.server");

export const interpretFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      message: string;
      commandId?: string | null;
      imageDataUrl?: string | null;
      fileDataUrl?: string | null;
      fileName?: string | null;
    }) => {
      const companyId = String(input?.companyId || "").trim();
      const message = String(input?.message || "")
        .trim()
        .slice(0, 4000);
      const commandId = input?.commandId ? String(input.commandId).slice(0, 36) : null;
      const rawImage = input?.imageDataUrl ? String(input.imageDataUrl) : null;
      const imageDataUrl =
        rawImage && /^data:image\/(?:png|jpeg|webp);base64,/i.test(rawImage) ? rawImage : null;
      const rawFile = !imageDataUrl && input?.fileDataUrl ? String(input.fileDataUrl) : null;
      const pdfDataUrl =
        rawFile && /^data:application\/pdf;base64,/i.test(rawFile) ? rawFile : null;
      if (rawFile && !pdfDataUrl) throw new Error("Envie uma foto (PNG, JPG, WebP) ou um PDF.");
      const fileName =
        String(input?.fileName || "comprovante.pdf")
          .replace(/[^\p{L}\p{N} ._()-]/gu, "")
          .slice(0, 120) || "comprovante.pdf";
      if (!companyId) throw new Error("Conta não informada.");
      if (!imageDataUrl && !pdfDataUrl && message.length < 2)
        throw new Error("Diga, escreva ou envie um comprovante.");
      if (imageDataUrl && imageDataUrl.length > 8_000_000)
        throw new Error("A imagem é muito grande. Envie um arquivo de até 5 MB.");
      if (pdfDataUrl && pdfDataUrl.length > 8_000_000)
        throw new Error("O PDF é muito grande. Envie um arquivo de até 5 MB.");
      return {
        companyId,
        message: message || "Leia este comprovante e prepare o lançamento.",
        commandId,
        imageDataUrl,
        pdf: pdfDataUrl ? { name: fileName, dataUrl: pdfDataUrl } : null,
      };
    },
  )
  .handler(async ({ context, data }): Promise<FinanceCommandTurn> => {
    const {
      authorizeFinanceCommand,
      loadFinanceContext,
      requestFinanceDraft,
      answerFinanceSummary,
    } = await server();
    await authorizeFinanceCommand(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let command: any = null;
    if (data.commandId) {
      const stored = await db
        .from("marcia_ai_command")
        .select("*")
        .eq("company_id", data.companyId)
        .eq("id", data.commandId)
        .maybeSingle();
      if (stored.error) throw new Error(stored.error.message);
      if (!stored.data || ["executed", "cancelled"].includes(stored.data.status))
        throw new Error("Esse pedido já foi encerrado.");
      command = stored.data;
    }
    const financeContext = await loadFinanceContext(context, data.companyId);
    const previous = command ? normalizeDraft(command.draft) : null;
    // Um crédito por interpretação; devolvido se a IA falhar (ref única evita estorno duplo).
    const creditRef = `app-finance:${crypto.randomUUID()}`;
    const consumed = await db.rpc("consume_ai_credit", {
      _company_id: data.companyId,
      _ref: creditRef,
    });
    if (consumed.error) throw new Error(consumed.error.message);
    if (!consumed.data)
      throw new Error("Seus créditos de IA terminaram. Ative ou renove seu plano para continuar.");
    const rules = await import("@/lib/ai/assistant-profile-rules");
    const { data: comp } = await db
      .from("company")
      .select("finance_profile")
      .eq("id", data.companyId)
      .maybeSingle();
    const profile = rules.normalizeAssistantProfile(comp?.finance_profile);
    const names = new Map(financeContext.categories.map((c: any) => [c.id, c.name]));
    let interpreted: FinanceCommandDraft;
    try {
      interpreted = await requestFinanceDraft(
        data.message,
        previous,
        financeContext,
        data.imageDataUrl,
        data.pdf,
        rules.assistantProfilePrompt(profile, names),
      );
      const forced = rules.matchCategoryRule(data.message, profile.category_rules);
      if (forced && names.has(forced)) {
        interpreted.categoryId = forced;
        interpreted.categoryName = names.get(forced) || null;
      }
    } catch (error) {
      await db
        .rpc("refund_ai_credit", { _company_id: data.companyId, _ref: creditRef })
        .catch(() => undefined);
      throw error;
    }
    const draft = applyDraftDefaults(
      resolveEntities(mergeDraft(previous, interpreted), financeContext),
      data.message,
      previous,
      todayInSaoPaulo(),
    );
    const commandId = command?.id || crypto.randomUUID();
    const messages = [
      ...(Array.isArray(command?.messages) ? command.messages : []),
      {
        role: "user",
        content: data.imageDataUrl
          ? `${data.message} [comprovante anexado]`
          : data.pdf
            ? `${data.message} [PDF anexado: ${data.pdf.name}]`
            : data.message,
        at: new Date().toISOString(),
      },
    ];

    if (draft.intent === "query_summary") {
      const answer = rules.personalizeReply(
        await answerFinanceSummary(data.companyId, draft.queryPeriod || "month"),
        profile,
        { tail: false },
      );
      messages.push({ role: "assistant", content: answer, at: new Date().toISOString() });
      const result = { message: answer };
      const saved = await db.from("marcia_ai_command").upsert({
        id: commandId,
        company_id: data.companyId,
        user_id: context.userId,
        status: "executed",
        intent: draft.intent,
        messages,
        draft,
        result,
        executed_at: new Date().toISOString(),
      });
      if (saved.error) throw new Error(saved.error.message);
      return { commandId, mode: "answer", message: answer, quickReplies: [], preview: [], draft };
    }

    const question = draft.missing[0] ? questionFor(draft.missing[0], financeContext) : null;
    const assistantMessage = rules.personalizeReply(
      question?.message || actionMessage(draft.intent),
      profile,
      { tail: false },
    );
    messages.push({ role: "assistant", content: assistantMessage, at: new Date().toISOString() });
    const saved = await db.from("marcia_ai_command").upsert({
      id: commandId,
      company_id: data.companyId,
      user_id: context.userId,
      status: question ? "question" : "ready",
      intent: draft.intent,
      messages,
      draft,
      result: null,
      error_message: null,
    });
    if (saved.error) throw new Error(saved.error.message);
    return {
      commandId,
      mode: question ? "question" : "confirm",
      message: assistantMessage,
      quickReplies: question?.quickReplies || [],
      preview: previewFor(draft),
      draft,
    };
  });

export const executeFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    await (await server()).authorizeFinanceCommand(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const stored = await db
      .from("marcia_ai_command")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .maybeSingle();
    if (stored.error) throw new Error(stored.error.message);
    const command = stored.data;
    if (!command) throw new Error("Pedido não encontrado.");
    if (command.status === "executed") return command.result;
    if (command.status !== "ready") throw new Error("Ainda faltam informações para executar.");
    const draft = normalizeDraft(command.draft);
    if (requiredFields(draft).length) throw new Error("Ainda faltam informações para executar.");
    if (["create_goal", "create_recurring"].includes(draft.intent)) {
      const { assertCompanyPlanFeature } = await import("@/lib/billing/plan-limits.server");
      await assertCompanyPlanFeature(
        data.companyId,
        "automacoes",
        "Metas e recorrências estão disponíveis no plano Pro.",
      );
    }
    // Trava otimista: só um clique muda "ready" → "executing", evitando lançamento em dobro.
    const claim = await db
      .from("marcia_ai_command")
      .update({ status: "executing" })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data) throw new Error("Esse pedido já está sendo processado.");

    try {
      const { executeFinanceDraft } = await server();
      const result = await executeFinanceDraft({
        db,
        companyId: data.companyId,
        commandId: data.commandId,
        userId: context.userId,
        draft,
        firstUserMessage:
          command.messages?.find((entry: any) => entry.role === "user")?.content || null,
      });

      const done = await db
        .from("marcia_ai_command")
        .update({
          status: "executed",
          result,
          executed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("company_id", data.companyId)
        .eq("id", data.commandId);
      if (done.error) throw new Error(done.error.message);
      return result;
    } catch (error: any) {
      await db
        .from("marcia_ai_command")
        .update({
          status: "failed",
          error_message: String(error?.message || "Falha ao executar").slice(0, 500),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.commandId);
      throw error;
    }
  });

export const cancelFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    await (await server()).authorizeFinanceCommand(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("marcia_ai_command")
      .update({ status: "cancelled" })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .in("status", ["understanding", "question", "ready"]);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

/** Histórico recente das conversas do próprio usuário com a MIA (somente leitura). */
export const listFinanceChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!companyId) throw new Error("Conta não informada.");
    return { companyId };
  })
  .handler(async ({ context, data }): Promise<FinanceChatHistoryMessage[]> => {
    await (await server()).authorizeFinanceCommand(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("marcia_ai_command")
      .select("id,messages,status,result,created_at,executed_at")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return commandsToChatHistory(rows || []);
  });

/** Desfaz um lançamento criado pela MIA, só dentro da janela curta após a confirmação. */
export const undoFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    await (await server()).authorizeFinanceCommand(context, data.companyId);
    const { canUndo } = await import("@/lib/ai/mia-chat-rules");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const stored = await db
      .from("marcia_ai_command")
      .select("id,status,result,executed_at,user_id")
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .maybeSingle();
    if (stored.error) throw new Error(stored.error.message);
    const command = stored.data;
    if (!command || command.user_id !== context.userId) throw new Error("Pedido não encontrado.");
    if (command.status !== "executed" || command.result?.undone)
      throw new Error("Esse registro não pode mais ser desfeito.");
    if (!canUndo(command.executed_at)) throw new Error("O prazo para desfazer já passou.");
    const transactionId = command.result?.transactionId;
    if (!transactionId) throw new Error("Só lançamentos podem ser desfeitos por aqui.");
    const removed = await db
      .from("fin_lancamento")
      .delete()
      .eq("company_id", data.companyId)
      .eq("id", transactionId)
      .eq("ai_command_id", data.commandId);
    if (removed.error) throw new Error(removed.error.message);
    await db
      .from("marcia_ai_command")
      .update({ result: { ...command.result, undone: true } })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId);
    return { ok: true };
  });

/** Transcreve um áudio gravado no chat do app. Só devolve o texto; nada é registrado aqui. */
export const transcribeChatAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; audioDataUrl: string }) => {
    const companyId = String(input?.companyId || "").trim();
    const audioDataUrl = String(input?.audioDataUrl || "");
    if (!companyId) throw new Error("Conta não informada.");
    if (!audioDataUrl.startsWith("data:audio/")) throw new Error("Áudio inválido.");
    if (audioDataUrl.length > 14_000_000)
      throw new Error("Áudio longo demais. Grave até 2 minutos.");
    return { companyId, audioDataUrl };
  })
  .handler(async ({ context, data }) => {
    await (await server()).authorizeFinanceCommand(context, data.companyId);
    const { transcribeAudioBase64, dataUrlParts } =
      await import("@/lib/ai/audio-transcribe.server");
    const parts = dataUrlParts(data.audioDataUrl);
    if (!parts) throw new Error("Áudio inválido.");
    try {
      const text = await transcribeAudioBase64(parts.base64, parts.mime);
      return { text };
    } catch (error: any) {
      console.error("transcribeChatAudio", error?.message);
      const status = /\[(\d{3})\]/.exec(String(error?.message))?.[1];
      if (status === "402")
        throw new Error("Os créditos de IA acabaram. Tente novamente mais tarde.");
      if (status === "429")
        throw new Error("Muitos pedidos agora. Aguarde um pouco e grave de novo.");
      throw new Error("Não consegui entender o áudio. Tente gravar de novo.");
    }
  });
