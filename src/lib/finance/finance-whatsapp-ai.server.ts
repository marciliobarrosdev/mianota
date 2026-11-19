/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Leitura da mensagem (ou do comprovante em imagem/PDF) pela IA. Sempre passa
 * por `lovableAiChat`, que escolhe o provedor configurado no Master.
 */
import { LOVABLE_AI_MODEL } from "@/lib/ai/lovable-ai-config";
import {
  json,
  normalize,
  type Draft,
  type FinanceContext,
} from "@/lib/finance/finance-whatsapp-rules";

export async function interpret(
  message: string,
  previous: Draft | null,
  context: FinanceContext,
  imageDataUrl?: string | null,
  extraSystem = "",
) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const system =
    `Você é o cérebro financeiro da MIA. Transforme a mensagem ou o comprovante em UMA ação financeira estruturada.

REGRAS:
- Use somente dados realmente presentes. Nunca invente valor, data, pagamento, conta ou categoria.
- Preserve o rascunho anterior quando a mensagem responder à pergunta anterior.
- Valores são inteiros em centavos. Hoje é ${today}, fuso America/Sao_Paulo.
- gastei/paguei/comprei = record_expense pago. recebi/entrou = record_income pago.
- conta/boleto/vai vencer/tenho que pagar/me lembre = create_bill pendente.
- todo mês/semana/ano = create_recurring.
- pedido de saldo/resumo/quanto gastei = query_summary.
- Em imagem, leia estabelecimento, total e data quando estiverem legíveis. Se não estiver seguro, deixe null.
- categoryId/accountId só podem vir do CONTEXTO REAL.
- paymentMethod é obrigatório em gastos, receitas, contas e recorrências: use somente pix, cartao (cartão de crédito), dinheiro, transferencia, boleto, salario ou outro. Preencha apenas se a pessoa disser ou o comprovante mostrar; nunca invente — deixe null para a MIA perguntar.
- accountName só pode receber o nome exato de uma conta do CONTEXTO REAL. Marca de cartão ou banco citada apenas como meio de pagamento não é uma conta cadastrada: use paymentMethod e deixe accountName/accountId nulos.
- Se a pessoa pedir explicitamente uma conta que não existe no CONTEXTO REAL, preserve accountName e mantenha accountId nulo para o sistema perguntar antes de registrar.
- Responda SOMENTE JSON válido.

INTENTS: record_expense, record_income, create_bill, create_budget, create_goal, create_recurring, query_summary, unknown.
FORMATO: {"intent":"...","type":null,"summary":null,"amountCents":null,"categoryId":null,"categoryName":null,"accountId":null,"accountName":null,"paymentMethod":null,"paymentStatus":null,"date":null,"frequency":null,"targetCents":null,"deadline":null,"queryPeriod":null}` +
    extraSystem;
  const { lovableAiChat } = await import("@/lib/ai/lovable-ai.server");
  const prompt = `CONTEXTO REAL:\n${JSON.stringify(context)}\n\nRASCUNHO ANTERIOR:\n${JSON.stringify(previous)}\n\nNOVA MENSAGEM:\n${message}`;
  const content = imageDataUrl
    ? [
        { type: "text" as const, text: prompt },
        imageDataUrl.startsWith("data:application/pdf")
          ? ({
              type: "file" as const,
              file: { filename: "comprovante.pdf", file_data: imageDataUrl },
            } as any)
          : {
              type: "image_url" as const,
              image_url: { url: imageDataUrl, detail: "high" as const },
            },
      ]
    : prompt;
  const raw = await lovableAiChat(
    [
      { role: "system", content: system },
      { role: "user", content },
    ],
    { model: LOVABLE_AI_MODEL },
  );
  return normalize(json(raw));
}
