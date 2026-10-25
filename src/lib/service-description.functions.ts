import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const polishServiceDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; serviceName: string; description: string }) => {
    const companyId = String(input?.companyId || "").trim();
    const serviceName = String(input?.serviceName || "")
      .trim()
      .slice(0, 160);
    const description = String(input?.description || "")
      .trim()
      .slice(0, 3000);
    if (!companyId) throw new Error("Empresa não informada.");
    if (!serviceName) throw new Error("Informe o nome do serviço.");
    if (description.length < 10) {
      throw new Error("Escreva ao menos uma frase sobre o serviço antes de organizar com IA.");
    }
    return { companyId, serviceName, description };
  })
  .handler(async ({ context, data }) => {
    await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);

    const { lovableAiChat } = await import("./lovable-ai.server");
    const organized = await lovableAiChat([
      {
        role: "system",
        content: `Você organiza descrições de serviços para uma secretária de agendamentos por WhatsApp.

Reescreva o texto do dono em português do Brasil, com linguagem clara, objetiva e fácil para uma IA consultar durante o atendimento.
- Preserve rigorosamente os fatos informados.
- Não invente preço, duração, material, prazo, garantia, política, preparo, endereço ou resultado.
- Explique o que o serviço é, o que inclui e observações úteis somente quando esses dados existirem no texto.
- Use de 2 a 4 frases curtas, sem título, lista, markdown, aspas ou comentário adicional.
- Se o texto estiver incompleto, apenas o torne mais claro; não complete lacunas por conta própria.`,
      },
      {
        role: "user",
        content: `Serviço: ${data.serviceName}\nTexto escrito pelo dono: ${data.description}`,
      },
    ]);

    const description = organized
      .replace(/^```(?:text)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .replace(/^['\"]|['\"]$/g, "")
      .trim()
      .slice(0, 3000);
    if (description.length < 10) throw new Error("A IA não conseguiu organizar este texto.");
    return { description };
  });
