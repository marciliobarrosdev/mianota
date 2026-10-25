import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAYMENT_METHODS = new Set(["pix", "cartao", "dinheiro", "transferencia", "boleto", "outro"]);

export const completeWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    companyId: string;
    workOrderId: string;
    amountCents: number;
    costCents?: number;
    paymentStatus: "paid" | "pending";
    paymentMethod?: string | null;
    finalNotes?: string;
  }) => {
    const companyId = String(input?.companyId || "").trim();
    const workOrderId = String(input?.workOrderId || "").trim();
    const amountCents = Number(input?.amountCents);
    const costCents = Number(input?.costCents || 0);
    const paymentStatus = input?.paymentStatus === "pending" ? "pending" : "paid";
    const paymentMethod = input?.paymentMethod ? String(input.paymentMethod) : null;
    if (!companyId || !workOrderId) throw new Error("Ordem de serviço não informada.");
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error("Informe um valor válido.");
    if (!Number.isSafeInteger(costCents) || costCents < 0) throw new Error("Informe um custo válido.");
    if (paymentStatus === "paid" && (!paymentMethod || !PAYMENT_METHODS.has(paymentMethod))) {
      throw new Error("Informe como o cliente pagou.");
    }
    return {
      companyId,
      workOrderId,
      amountCents,
      costCents,
      paymentStatus,
      paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
      finalNotes: String(input?.finalNotes || "").trim().slice(0, 3000),
    };
  })
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(data.companyId, { superAdminBypass: access.isSuperAdmin });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: order, error: orderError } = await db
      .from("marcia_work_order")
      .select("id,number,status,summary,description,customer_id,marcia_customer(phone_e164)")
      .eq("company_id", data.companyId)
      .eq("id", data.workOrderId)
      .single();
    if (orderError) throw new Error(orderError.message);
    if (order.status === "completed") throw new Error(`A OS #${order.number} já está concluída.`);
    if (order.status === "cancelled") throw new Error("Uma OS cancelada não pode ser concluída.");

    const completedAt = new Date().toISOString();
    const description = [order.description, data.finalNotes ? `Fechamento: ${data.finalNotes}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const { error: updateError } = await db
      .from("marcia_work_order")
      .update({
        status: "completed",
        completed_at: completedAt,
        subtotal_cents: data.amountCents,
        total_cents: data.amountCents,
        description: description || null,
      })
      .eq("company_id", data.companyId)
      .eq("id", data.workOrderId);
    if (updateError) throw new Error(updateError.message);

    const { data: company, error: companyError } = await db
      .from("company")
      .select("financeiro_ativo")
      .eq("id", data.companyId)
      .single();
    if (companyError) throw new Error(companyError.message);
    let financeRecorded = false;
    if (company.financeiro_ativo && data.amountCents > 0) {
      await db.rpc("seed_fin_categorias", { _company_id: data.companyId });
      const { data: category } = await db
        .from("fin_categoria")
        .select("id")
        .eq("company_id", data.companyId)
        .eq("tipo", "receita")
        .eq("nome", "Serviços")
        .maybeSingle();
      const today = completedAt.slice(0, 10);
      const values = {
        company_id: data.companyId,
        tipo: "receita",
        descricao: `OS #${order.number} · ${order.summary}`,
        valor_cents: data.amountCents,
        categoria_id: category?.id || null,
        forma_pagamento: data.paymentMethod,
        status: data.paymentStatus === "pending" ? "pendente" : "pago",
        vencimento: today,
        pago_em: data.paymentStatus === "paid" ? today : null,
        competencia: today,
        contato_numero: order.marcia_customer?.phone_e164 || null,
        work_order_id: order.id,
        created_by: context.userId,
      };
      const { data: existing, error: lookupError } = await db
        .from("fin_lancamento")
        .select("id")
        .eq("company_id", data.companyId)
        .eq("work_order_id", order.id)
        .eq("tipo", "receita")
        .limit(1)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      const financeResult = existing
        ? await db.from("fin_lancamento").update(values).eq("id", existing.id)
        : await db.from("fin_lancamento").insert(values);
      if (financeResult.error) throw new Error(financeResult.error.message);
      financeRecorded = true;

      if (data.costCents > 0) {
        const { data: costCategory } = await db
          .from("fin_categoria")
          .select("id")
          .eq("company_id", data.companyId)
          .eq("tipo", "despesa")
          .eq("nome", "Operacional")
          .maybeSingle();
        const { error: costError } = await db.from("fin_lancamento").insert({
          company_id: data.companyId,
          tipo: "despesa",
          descricao: `Custo da OS #${order.number}`,
          valor_cents: data.costCents,
          categoria_id: costCategory?.id || null,
          forma_pagamento: data.paymentMethod || "outro",
          status: "pago",
          vencimento: today,
          pago_em: today,
          competencia: today,
          work_order_id: order.id,
          created_by: context.userId,
        });
        if (costError) throw new Error(costError.message);
      }
    }

    return { completed: true, financeRecorded };
  });

