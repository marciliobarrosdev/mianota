import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadCloneBrandServer } from "@/lib/brand.server";
import { LOVABLE_AI_MODEL, LOVABLE_AI_PROVIDER } from "./lovable-ai-config";

export type GeneratedAgentConfig = {
  nome_agente: string;
  nome_empresa: string;
  segmento: string;
  regiao_horario: string;
  descricao_negocio: string;
  diferenciais: string;
  publico_alvo: string;
  sobre_empresa: string;
  produtos_servicos: string;
  papel_objetivo: string;
  estilo_comunicacao: string;
  apresentacao: string;
  ofertas: string;
  como_vender: string;
  objecoes: string;
  formas_pagamento: string;
  faq: string;
  politicas: string;
  posvenda_msg: string;
  pode_fazer: string;
  nao_pode_fazer: string;
};

export type GeneratedOperationSetup = {
  services: Array<{
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
  }>;
  professionals: Array<{ name: string }>;
  availability: Array<{
    professionalName: string | null;
    weekdays: number[];
    startsAt: string;
    endsAt: string;
  }>;
};

const FIELDS: (keyof GeneratedAgentConfig)[] = [
  "nome_agente",
  "nome_empresa",
  "segmento",
  "regiao_horario",
  "descricao_negocio",
  "diferenciais",
  "publico_alvo",
  "sobre_empresa",
  "produtos_servicos",
  "papel_objetivo",
  "estilo_comunicacao",
  "apresentacao",
  "ofertas",
  "como_vender",
  "objecoes",
  "formas_pagamento",
  "faq",
  "politicas",
  "posvenda_msg",
  "pode_fazer",
  "nao_pode_fazer",
];

function extractJson(raw: string): any {
  const trimmed = (raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {}
  const m = trimmed.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  throw new Error("A IA não retornou JSON válido. Tente novamente.");
}

type BriefInput = {
  companyId: string;
  descricao: string;
  respostas: Record<string, string>;
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function answerFor(respostas: Record<string, string>, aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeKey);

  for (const [rawKey, rawValue] of Object.entries(respostas)) {
    const value = String(rawValue || "").trim();
    if (!value) continue;

    const key = normalizeKey(rawKey);
    if (normalizedAliases.some((alias) => key === alias || key.includes(alias))) {
      return value.slice(0, 4000);
    }
  }

  return "";
}

function allProvidedText(data: BriefInput): string {
  return [data.descricao, ...Object.values(data.respostas)]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

function containsProvidedInfo(data: BriefInput, pattern: RegExp): boolean {
  return pattern.test(normalizeKey(allProvidedText(data)).replace(/_/g, " "));
}

function extractProvidedStatements(descricao: string, pattern: RegExp): string {
  const statements = descricao
    .split(/(?:\r?\n)+|[.!?;]+(?=\s|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => pattern.test(normalizeKey(statement).replace(/_/g, " ")));

  return statements.join(". ").slice(0, 3000);
}

function extractCompanyName(data: BriefInput): string {
  const answered = answerFor(data.respostas, [
    "nome_empresa",
    "nome_negocio",
    "nome_do_negocio",
    "empresa_nome",
  ]);
  if (answered) return answered.slice(0, 160);

  const match = data.descricao.match(
    /(?:minha empresa|meu neg[oó]cio|minha cl[ií]nica|meu est[uú]dio|meu sal[aã]o)\s+(?:se chama|chama-se)\s+["']?([^,.;\n"']{2,80})/i,
  );
  return match?.[1]?.trim() || "";
}

async function requestLovableJson(
  messages: ChatMessage[],
  isUsable: (value: unknown) => boolean,
): Promise<any | null> {
  try {
    const { lovableAiChat } = await import("./lovable-ai.server");
    const raw = await lovableAiChat(messages, {
      model: LOVABLE_AI_MODEL,
    });
    const parsed = extractJson(raw);
    if (!isUsable(parsed)) throw new Error("A IA retornou uma estrutura incompleta.");
    return parsed;
  } catch (error) {
    // Implantação e configuração são ferramentas internas. O saldo do trial
    // representa respostas efetivamente enviadas pela IA no WhatsApp e só é
    // consumido no webhook de atendimento.
    console.warn("[agent-ai.fallback]", error instanceof Error ? error.message : error);
    return null;
  }
}

function isUsableBriefAnalysis(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  if (
    typeof parsed.pronto !== "boolean" ||
    typeof parsed.resumo !== "string" ||
    typeof parsed.cobertura !== "number" ||
    !Number.isFinite(parsed.cobertura) ||
    !Array.isArray(parsed.perguntas)
  ) {
    return false;
  }
  return parsed.perguntas.every(
    (question) =>
      !!question &&
      typeof question === "object" &&
      !Array.isArray(question) &&
      typeof (question as Record<string, unknown>).pergunta === "string",
  );
}

function isUsableGeneratedConfig(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as Record<string, unknown>;
  const config =
    parsed.config && typeof parsed.config === "object" && !Array.isArray(parsed.config)
      ? (parsed.config as Record<string, unknown>)
      : parsed;
  return FIELDS.every((field) => typeof config[field] === "string");
}

function sanitizeOperationSetup(value: unknown): GeneratedOperationSetup {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const services = Array.isArray(raw.services)
    ? raw.services.slice(0, 30).flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const row = item as Record<string, unknown>;
        const name = String(row.name || "").trim().slice(0, 160);
        const description = String(row.description || "").trim().slice(0, 3000);
        const durationMinutes = Number(row.durationMinutes);
        const priceCents = Number(row.priceCents);
        if (!name || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 1440) return [];
        return [{
          name,
          description,
          durationMinutes,
          priceCents: Number.isSafeInteger(priceCents) && priceCents >= 0 ? priceCents : 0,
        }];
      })
    : [];
  const professionals = Array.isArray(raw.professionals)
    ? raw.professionals.slice(0, 30).flatMap((item) => {
        const name = typeof item === "string"
          ? item.trim().slice(0, 160)
          : item && typeof item === "object" && !Array.isArray(item)
            ? String((item as Record<string, unknown>).name || "").trim().slice(0, 160)
            : "";
        return name ? [{ name }] : [];
      })
    : [];
  const availability = Array.isArray(raw.availability)
    ? raw.availability.slice(0, 30).flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const row = item as Record<string, unknown>;
        const weekdays = Array.isArray(row.weekdays)
          ? [...new Set(row.weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
          : [];
        const startsAt = String(row.startsAt || "").slice(0, 5);
        const endsAt = String(row.endsAt || "").slice(0, 5);
        if (!weekdays.length || !/^\d{2}:\d{2}$/.test(startsAt) || !/^\d{2}:\d{2}$/.test(endsAt) || startsAt >= endsAt) return [];
        return [{
          professionalName: row.professionalName ? String(row.professionalName).trim().slice(0, 160) : null,
          weekdays,
          startsAt,
          endsAt,
        }];
      })
    : [];
  return { services, professionals, availability };
}

function sanitizeAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 12)
      .map(([key, answer]) => [String(key).slice(0, 80), String(answer ?? "").slice(0, 1200)]),
  );
}

// ────────────────────────────────────────────────────────────────────────
// ANALISADOR PRD: olha o que o usuário escreveu, identifica lacunas críticas
// e gera perguntas guiadas (com exemplos) para o leigo conseguir responder.
// ────────────────────────────────────────────────────────────────────────

export type BriefQuestion = {
  id: string; // chave estável (ex: "produtos_precos")
  pergunta: string; // pergunta curta, linguagem leiga
  porque: string; // por que isso importa (1 frase)
  exemplo: string; // exemplo concreto pra destravar o usuário
  campo: keyof GeneratedAgentConfig | "extra";
  obrigatoria: boolean;
};

export type BriefAnalysis = {
  pronto: boolean; // true se já dá pra gerar com qualidade
  resumo: string; // resumo de 1-2 linhas do que entendeu
  cobertura: number; // 0-100
  perguntas: BriefQuestion[]; // perguntas críticas pendentes (máx 6)
};

function buildLocalBriefAnalysis(data: BriefInput, assistantName: string): BriefAnalysis {
  const hasServices =
    !!answerFor(data.respostas, [
      "servicos_duracoes",
      "produtos_servicos",
      "servicos",
      "procedimentos",
    ]) ||
    containsProvidedInfo(
      data,
      /\b(servico|servicos|procedimento|procedimentos|consulta|consultas|sessao|sessoes|aula|aulas|corte|barba|manicure|pedicure|massagem|terapia|limpeza|design|avaliacao|exame|agendavel|agendaveis)\b/,
    );
  const hasAvailabilitySource =
    !!answerFor(data.respostas, [
      "agenda_disponibilidade",
      "como_agendar",
      "fonte_agenda",
      "profissionais_agenda",
    ]) ||
    containsProvidedInfo(
      data,
      /\b(agenda interna|google calendar|calendario|horarios livres|disponibilidade real|profissional|profissionais|agenda do profissional)\b/,
    );
  const hasRegionAndHours =
    !!answerFor(data.respostas, [
      "regiao_horario",
      "dias_horarios",
      "local_horarios",
      "horarios_atendimento",
    ]) ||
    containsProvidedInfo(
      data,
      /\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|dias uteis|manha|tarde|noite|presencial|online|domicilio|cidade|bairro)\b|\b\d{1,2}(?::\d{2}|h(?:\d{2})?)\b/,
    );
  const hasPolicies =
    !!answerFor(data.respostas, [
      "politicas_agendamento",
      "politicas",
      "cancelamento",
      "remarcacao",
    ]) ||
    containsProvidedInfo(
      data,
      /\b(cancelar com|cancelamento em|remarcar com|remarcacao em|tolerancia de|atraso de|sinal de|nao comparecimento|falta sem aviso|preparo obrigatorio)\b/,
    );
  const hasBoundaries =
    !!answerFor(data.respostas, [
      "limites_transferencia",
      "nao_pode_fazer",
      "atendimento_humano",
    ]) ||
    containsProvidedInfo(
      data,
      /\b(chamar (?:uma pessoa|alguem|a equipe)|transferir para|atendimento humano|falar com (?:a equipe|uma pessoa)|nao pode|nao deve)\b/,
    );
  const hasPricesAndPayments =
    !!answerFor(data.respostas, ["precos_pagamentos", "formas_pagamento", "valores", "precos"]) ||
    containsProvidedInfo(
      data,
      /\b(pix|cartao|dinheiro|boleto|transferencia|parcelamento|preco|precos|valor|valores|custa|gratuito)\b|r\$\s*\d/,
    );

  const pending: BriefQuestion[] = [];

  if (!hasServices) {
    pending.push({
      id: "servicos_duracoes",
      pergunta: "Quais serviços podem ser agendados e quanto tempo dura cada um?",
      porque: `${assistantName} precisa identificar o serviço certo sem inventar duração ou encaixe.`,
      exemplo: "Corte feminino — 1 hora; design de sobrancelhas — 30 minutos.",
      campo: "produtos_servicos",
      obrigatoria: true,
    });
  }

  if (!hasAvailabilitySource) {
    pending.push({
      id: "agenda_disponibilidade",
      pergunta: `Onde ${assistantName} deve consultar os horários livres e como escolhe o profissional?`,
      porque: "Ela só pode oferecer disponibilidade real da agenda.",
      exemplo:
        "Na agenda interna; qualquer profissional livre, salvo quando o cliente escolher alguém.",
      campo: "como_vender",
      obrigatoria: true,
    });
  }

  if (!hasRegionAndHours) {
    pending.push({
      id: "regiao_horario",
      pergunta: "Em quais dias, horários e local vocês atendem?",
      porque: "Isso evita sugerir atendimento fora da operação real.",
      exemplo: "De segunda a sexta, das 9h às 18h, no bairro Centro de Campinas.",
      campo: "regiao_horario",
      obrigatoria: true,
    });
  }

  if (!hasPolicies) {
    pending.push({
      id: "politicas_agendamento",
      pergunta: "Quais são as regras para confirmar, remarcar, cancelar ou se atrasar?",
      porque: `${assistantName} não deve criar uma política por conta própria.`,
      exemplo: "Pode remarcar até 12 horas antes; depois disso, chamar a equipe.",
      campo: "politicas",
      obrigatoria: true,
    });
  }

  if (!hasBoundaries) {
    pending.push({
      id: "limites_transferencia",
      pergunta: `Em quais situações ${assistantName} deve parar e chamar uma pessoa da equipe?`,
      porque: "Casos sensíveis ou fora da agenda precisam de atendimento humano.",
      exemplo:
        "Reclamações, pedidos especiais, urgências e qualquer dúvida sem resposta cadastrada.",
      campo: "nao_pode_fazer",
      obrigatoria: false,
    });
  }

  if (!hasPricesAndPayments) {
    pending.push({
      id: "precos_pagamentos",
      pergunta: `${assistantName} pode informar valores e formas de pagamento? Quais?`,
      porque: "Se isso não estiver definido, ela deve consultar a equipe em vez de inventar.",
      exemplo:
        "Pode informar os valores da tabela; aceitamos Pix e cartão. Promoções, só com a equipe.",
      campo: "formas_pagamento",
      obrigatoria: false,
    });
  }

  const requiredPending = pending.filter((question) => question.obrigatoria);
  const ready = requiredPending.length === 0;
  const answeredCount = [
    hasServices,
    hasAvailabilitySource,
    hasRegionAndHours,
    hasPolicies,
    hasBoundaries,
    hasPricesAndPayments,
  ].filter(Boolean).length;
  const excerpt = data.descricao.replace(/\s+/g, " ").trim().slice(0, 220);

  return {
    pronto: ready,
    resumo: `Entendi o contexto informado: ${excerpt}${data.descricao.length > excerpt.length ? "…" : ""} O foco de ${assistantName} será atuar como secretária de agendamentos, usando apenas dados confirmados.`,
    cobertura: Math.round((answeredCount / 6) * 100),
    perguntas: ready ? [] : pending.slice(0, 6),
  };
}

function buildLocalAgentConfig(data: BriefInput, assistantName: string): GeneratedAgentConfig {
  const nomeEmpresa = extractCompanyName(data);
  const servicosInformados = answerFor(data.respostas, [
    "servicos_duracoes",
    "produtos_servicos",
    "servicos",
    "procedimentos",
  ]);
  const fluxoInformado = answerFor(data.respostas, [
    "agenda_disponibilidade",
    "como_agendar",
    "fonte_agenda",
    "profissionais_agenda",
  ]);
  const regiaoHorario =
    answerFor(data.respostas, [
      "regiao_horario",
      "dias_horarios",
      "local_horarios",
      "horarios_atendimento",
    ]) ||
    extractProvidedStatements(
      data.descricao,
      /\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|dias uteis|manha|tarde|noite|presencial|online|domicilio|cidade|bairro)\b|\b\d{1,2}(?::\d{2}|h(?:\d{2})?)\b/,
    );
  const politicas =
    answerFor(data.respostas, [
      "politicas_agendamento",
      "politicas",
      "cancelamento",
      "remarcacao",
    ]) ||
    extractProvidedStatements(
      data.descricao,
      /\b(cancelar com|cancelamento em|remarcar com|remarcacao em|tolerancia de|atraso de|sinal de|nao comparecimento|falta sem aviso|preparo obrigatorio)\b/,
    );
  const formasPagamento =
    answerFor(data.respostas, ["precos_pagamentos", "formas_pagamento", "pagamentos"]) ||
    extractProvidedStatements(
      data.descricao,
      /\b(pix|cartao|dinheiro|boleto|transferencia|parcelamento|formas? de pagamento)\b/,
    );
  const ofertas =
    answerFor(data.respostas, ["ofertas", "promocoes", "cupons"]) ||
    extractProvidedStatements(
      data.descricao,
      /\b(promocao|promocoes|cupom|desconto informado|oferta vigente)\b/,
    );
  const limites = answerFor(data.respostas, [
    "limites_transferencia",
    "nao_pode_fazer",
    "atendimento_humano",
  ]);
  const segmento = answerFor(data.respostas, ["segmento", "tipo_negocio", "ramo"]);
  const diferenciais = answerFor(data.respostas, ["diferenciais", "diferencial"]);
  const publicoAlvo = answerFor(data.respostas, ["publico_alvo", "clientes", "perfil_clientes"]);
  const faq = answerFor(data.respostas, ["faq", "duvidas_frequentes"]);
  const posAtendimento = answerFor(data.respostas, [
    "posvenda_msg",
    "pos_atendimento",
    "mensagem_confirmacao",
  ]);

  const fluxo = [
    "1. Identificar o serviço que o cliente deseja, fazendo uma pergunta por vez.",
    "2. Perguntar a preferência de dia ou período sem prometer disponibilidade.",
    "3. Consultar a agenda real antes de sugerir qualquer horário.",
    "4. Repetir serviço, profissional, data e hora e pedir confirmação explícita.",
    "5. Registrar, remarcar ou cancelar somente depois da confirmação e do retorno bem-sucedido do sistema.",
    fluxoInformado ? `Orientação adicional do responsável: ${fluxoInformado}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const naoPode = [
    "Não inventar preço, horário, duração, profissional, endereço ou política.",
    "Não afirmar que há vaga sem consultar a disponibilidade real.",
    "Não confirmar, remarcar ou cancelar antes de o sistema concluir a operação.",
    "Não agir como vendedora nem criar ofertas, descontos ou condições comerciais.",
    "Não tratar o cliente como lead nem conduzir etapas de CRM.",
    limites
      ? `Limites informados pelo responsável: ${limites}`
      : "Em caso de dúvida ou situação sensível, chamar uma pessoa da equipe.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    nome_agente: assistantName,
    nome_empresa: nomeEmpresa,
    segmento,
    regiao_horario: regiaoHorario,
    descricao_negocio: data.descricao,
    diferenciais,
    publico_alvo: publicoAlvo,
    sobre_empresa: data.descricao,
    produtos_servicos:
      servicosInformados || `Descrição fornecida pelo responsável:\n${data.descricao}`,
    papel_objetivo:
      "Atuar como secretária de agendamentos: orientar com informações confirmadas, consultar horários reais e ajudar a agendar, remarcar ou cancelar.",
    estilo_comunicacao:
      "Cordial, claro e objetivo, com mensagens curtas de WhatsApp e uma pergunta por vez.",
    apresentacao: `Olá! Sou ${assistantName}, secretária virtual${nomeEmpresa ? ` da ${nomeEmpresa}` : ""}. Posso ajudar com informações e agendamentos. Qual serviço você procura?`,
    ofertas,
    como_vender: fluxo,
    objecoes: "",
    formas_pagamento: formasPagamento,
    faq,
    politicas,
    posvenda_msg: posAtendimento,
    pode_fazer: [
      "Informar somente o que estiver cadastrado ou tiver sido confirmado pela equipe.",
      "Consultar a agenda real e apresentar horários efetivamente livres.",
      "Ajudar a agendar, remarcar ou cancelar conforme as regras informadas.",
      "Chamar uma pessoa da equipe quando faltar informação ou o caso exigir decisão humana.",
    ].join("\n"),
    nao_pode_fazer: naoPode,
  };
}

export const analyzeBusinessBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { companyId: string; descricao: string; respostas?: Record<string, string> }) => {
      const companyId = String(d?.companyId || "").trim();
      if (!companyId) throw new Error("Empresa não informada.");
      const desc = (d?.descricao || "").trim();
      if (desc.length < 10) throw new Error("Conte um pouco mais sobre o negócio.");
      return {
        companyId,
        descricao: desc.slice(0, 8000),
        respostas: sanitizeAnswers(d?.respostas),
      };
    },
  )
  .handler(async ({ context, data }) => {
    const access = await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(data.companyId, { superAdminBypass: access.isSuperAdmin });
    const { assistantName } = await loadCloneBrandServer();
    const respostasTxt = Object.entries(data.respostas)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const system = `Você é especialista em operações de agenda e atendimento por WhatsApp para pequenos negócios brasileiros.

Sua tarefa é analisar a descrição e identificar o que falta para ${assistantName} atuar como SECRETÁRIA DE AGENDAMENTOS com segurança.
Ela não é vendedora, não qualifica leads e não conduz funil ou etapas de CRM.

Para trabalhar bem, ela precisa saber NO MÍNIMO:
1) Quais serviços são agendáveis e, quando informado, a duração de cada um
2) Onde consultar horários realmente livres e como escolher o profissional
3) Dias, horários, região e modalidade de atendimento
4) Como confirmar, remarcar e cancelar um agendamento
5) Políticas e preparos que o responsável informou explicitamente
6) Quando deve parar e chamar uma pessoa da equipe
7) Valores e formas de pagamento apenas se o responsável quiser que ela os informe

REGRAS DAS PERGUNTAS:
- Faça NO MÁXIMO 6 perguntas — só as CRÍTICAS que faltam.
- Linguagem de gente, não de formulário. O dono é leigo, topo de funil.
- Cada pergunta tem um EXEMPLO concreto, plausível pro segmento dele, pra destravar.
- NUNCA pergunte coisa que já está clara na descrição ou nas respostas anteriores.
- Exemplos servem apenas para ajudar o dono a responder; nunca os trate como fatos do negócio.
- Não peça estratégia de vendas, objeções comerciais, etapas de CRM, promoção ou argumento de fechamento.
- Se serviços, disponibilidade, operação e regras de agenda já estiverem claros, marque "pronto: true" e devolva perguntas: [].
- Se faltar informação crítica, marque "pronto: false".
- NUNCA invente preço, duração, profissional, endereço, horário, disponibilidade ou política.

Responda APENAS JSON válido neste formato:
{
  "pronto": boolean,
  "resumo": "string curta do que entendeu do negócio",
  "cobertura": number,   // 0-100, quanto da info essencial já temos
  "perguntas": [
    {
      "id": "snake_case_estavel",
      "pergunta": "pergunta curta em PT-BR",
      "porque": "1 frase de por que isso importa pro atendimento",
      "exemplo": "exemplo concreto e específico pro segmento",
      "campo": "uma das chaves: nome_empresa|segmento|regiao_horario|produtos_servicos|formas_pagamento|politicas|diferenciais|publico_alvo|como_vender|nao_pode_fazer|ofertas|extra",
      "obrigatoria": boolean
    }
  ]
}`;

    const user = `DESCRIÇÃO DO NEGÓCIO:
${data.descricao}

${respostasTxt ? `RESPOSTAS JÁ DADAS PELO DONO:\n${respostasTxt}` : ""}

Analise e devolva o JSON.`;

    const parsed = await requestLovableJson(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      isUsableBriefAnalysis,
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return buildLocalBriefAnalysis(data, assistantName);
    }

    const perguntas: BriefQuestion[] = Array.isArray(parsed?.perguntas)
      ? parsed.perguntas
          .slice(0, 6)
          .map((q: any, i: number) => ({
            id: String(q?.id || `q_${i}`).slice(0, 60),
            pergunta: String(q?.pergunta || "").slice(0, 240),
            porque: String(q?.porque || "").slice(0, 240),
            exemplo: String(q?.exemplo || "").slice(0, 320),
            campo: (typeof q?.campo === "string" ? q.campo : "extra") as any,
            obrigatoria: !!q?.obrigatoria,
          }))
          .filter((q: BriefQuestion) => q.pergunta)
      : [];

    const analysis: BriefAnalysis = {
      pronto: !!parsed?.pronto && perguntas.filter((p) => p.obrigatoria).length === 0,
      resumo: String(parsed?.resumo || "").slice(0, 400),
      cobertura: Math.max(0, Math.min(100, Number(parsed?.cobertura) || 0)),
      perguntas,
    };

    return analysis;
  });

// ────────────────────────────────────────────────────────────────────────
// GERAÇÃO DA CONFIG: agora aceita respostas do "interview" e gera PRD completo
// ────────────────────────────────────────────────────────────────────────

export const generateAgentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { companyId: string; descricao: string; respostas?: Record<string, string> }) => {
      const companyId = String(d?.companyId || "").trim();
      if (!companyId) throw new Error("Empresa não informada.");
      if (!d?.descricao || d.descricao.trim().length < 20) {
        throw new Error("Descreva seu negócio com pelo menos algumas frases (mín. 20 caracteres).");
      }
      return {
        companyId,
        descricao: d.descricao.trim().slice(0, 8000),
        respostas: sanitizeAnswers(d?.respostas),
      };
    },
  )
  .handler(async ({ context, data }) => {
    const access = await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(data.companyId, { superAdminBypass: access.isSuperAdmin });
    const { buildSystemPrompt } = await import("./ai-prompt");
    const { assistantName } = await loadCloneBrandServer();

    const respostasTxt = Object.entries(data.respostas)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const system = `Você é especialista em operações de agenda e atendimento por WhatsApp para pequenos negócios brasileiros.

Você recebe: (1) descrição livre do dono (leigo) e (2) respostas dele para perguntas específicas.
Sua tarefa é gerar a configuração de ${assistantName}, uma SECRETÁRIA DE AGENDAMENTOS. Ela informa, consulta a agenda real, agenda, remarca, cancela e chama a equipe quando necessário. Ela NÃO é vendedora, NÃO qualifica leads e NÃO conduz funil ou etapas de CRM.

Responda APENAS com JSON válido (sem markdown) neste formato:
{
  "config": { ${FIELDS.map((f) => `"${f}": "string"`).join(", ")} },
  "setup": {
    "services": [{ "name": "string", "description": "string", "durationMinutes": 60, "priceCents": 15000 }],
    "professionals": [{ "name": "string" }],
    "availability": [{ "professionalName": "string ou null", "weekdays": [1,2,3,4,5], "startsAt": "09:00", "endsAt": "18:00" }]
  }
}

DIRETRIZES (siga à risca):
- "nome_agente": use EXATAMENTE "${assistantName}".
- "papel_objetivo": 1-2 frases sobre atendimento e organização da agenda, sem metas comerciais.
- "estilo_comunicacao": cordial, claro, seguro, com mensagens curtas e uma pergunta por vez.
- "apresentacao": primeira mensagem curta e humana, apresentando ${assistantName} como secretária virtual.
- "sobre_empresa" e "descricao_negocio": use somente fatos presentes na descrição ou respostas.
- "produtos_servicos": liste apenas serviços, duração e valores que o dono informou. Se não houver informação suficiente, use "". NUNCA invente item, duração ou preço.
- "como_vender": apesar do nome legado do campo, preencha com o FLUXO DE ATENDIMENTO E AGENDAMENTO: entender serviço, pedir preferência, consultar disponibilidade real, confirmar os dados e só então registrar. Não inclua técnica de venda.
- "objecoes": use apenas para dúvidas ou impedimentos operacionais mencionados pelo dono; nunca crie persuasão comercial. Se não houver, use "".
- "faq": inclua somente perguntas cujas respostas estejam sustentadas pela descrição ou respostas. Se não houver base, use "".
- "politicas": somente regras de confirmação, atraso, preparo, remarcação ou cancelamento ditas pelo dono. Se ele não falou, use "". NUNCA crie política padrão.
- "posvenda_msg": somente uma mensagem operacional de confirmação ou acompanhamento, sem oferta comercial.
- "pode_fazer": lista (1 por linha) de ações seguras de secretaria e agenda.
- "nao_pode_fazer": inclua sempre que não pode inventar preço, horário, duração, profissional, endereço ou política; não pode prometer vaga sem consultar a agenda; não pode confirmar uma operação que o sistema não concluiu; e deve chamar a equipe em caso de dúvida.
- "ofertas": só preencha se o dono mencionou promoção/cupom. Senão, "".
- "formas_pagamento": só o que o dono disse. Se não disse, "".
- "regiao_horario": só local, modalidade, dias e horários explicitamente informados. Se não disse, "".
- Use "" (string vazia) quando faltar info — NUNCA omita chaves.
- NÃO invente nem deduza: preço, endereço, duração, dia, horário, profissional, disponibilidade, telefone, prazo, política, promoção ou forma de pagamento. Se faltar, deixe vazio.
- Não use linguagem de vendedor, lead, conversão, fechamento, pipeline ou CRM.
- Em "setup", transforme somente dados explícitos do dono em registros operacionais.
- durationMinutes e priceCents são números inteiros. Converta R$ 150 para 15000 centavos.
- weekdays usa 0=domingo, 1=segunda, ..., 6=sábado.
- Se serviço, profissional ou horário não foi informado com segurança, use lista vazia. Nunca invente.

Retorne SÓ o JSON.`;

    const user = `DESCRIÇÃO DO DONO:
${data.descricao}

${respostasTxt ? `RESPOSTAS ESPECÍFICAS DO DONO:\n${respostasTxt}` : ""}

Gere o JSON de ${assistantName}.`;

    const parsed = await requestLovableJson(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      isUsableGeneratedConfig,
    );

    let config: GeneratedAgentConfig;
    let setup: GeneratedOperationSetup = { services: [], professionals: [], availability: [] };
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      config = buildLocalAgentConfig(data, assistantName);
    } else {
      const configSource = parsed.config && typeof parsed.config === "object" ? parsed.config : parsed;
      config = {} as GeneratedAgentConfig;
      for (const k of FIELDS) {
        const v = configSource?.[k];
        (config as any)[k] = typeof v === "string" ? v : v == null ? "" : String(v);
      }
      config.nome_agente = assistantName;
      setup = sanitizeOperationSetup(parsed.setup);
    }

    const promptPreview = buildSystemPrompt(config as any, {
      responderEmPartes: true,
      produtos: [],
    });

    return { config, promptPreview, setup };
  });

export const saveGeneratedAgentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; config: GeneratedAgentConfig; setup?: GeneratedOperationSetup }) => {
    const companyId = String(d?.companyId || "").trim();
    if (!companyId) throw new Error("Empresa não informada.");
    if (!d?.config || typeof d.config !== "object" || Array.isArray(d.config)) {
      throw new Error("Configuração da assistente inválida.");
    }

    const config = {} as GeneratedAgentConfig;
    for (const field of FIELDS) {
      const value = d.config[field];
      (config as Record<string, string>)[field] = String(value ?? "")
        .trim()
        .slice(0, 20_000);
    }
    if (!config.nome_agente || !config.papel_objetivo || !config.sobre_empresa) {
      throw new Error("A conversa ainda não reuniu contexto suficiente para salvar.");
    }
    return { companyId, config, setup: sanitizeOperationSetup(d.setup) };
  })
  .handler(async ({ context, data }) => {
    const access = await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(data.companyId, { superAdminBypass: access.isSuperAdmin });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current, error: currentError } = await supabaseAdmin
      .from("agent_config")
      .select("user_id")
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);

    const { error } = await supabaseAdmin.from("agent_config").upsert(
      {
        company_id: data.companyId,
        user_id: current?.user_id || context.userId,
        ...data.config,
        ai_provider: LOVABLE_AI_PROVIDER,
        ai_model: LOVABLE_AI_MODEL,
        perguntar_uma_por_vez: true,
        responder_em_partes: true,
        tamanho_resposta: "curtas",
      },
      { onConflict: "company_id" },
    );
    if (error) throw new Error(error.message);

    const db = supabaseAdmin as any;
    const serviceIds: string[] = [];
    for (const [index, service] of data.setup.services.entries()) {
      const { data: matches, error: lookupError } = await db
        .from("marcia_service")
        .select("id")
        .eq("company_id", data.companyId)
        .ilike("name", service.name)
        .limit(2);
      if (lookupError) throw new Error(lookupError.message);
      let id = matches?.length === 1 ? matches[0].id : null;
      const values = {
        name: service.name,
        description: service.description || null,
        duration_minutes: service.durationMinutes,
        price_cents: service.priceCents,
        active: true,
        sort_order: index,
      };
      if (id) {
        const { error: updateError } = await db
          .from("marcia_service")
          .update(values)
          .eq("company_id", data.companyId)
          .eq("id", id);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { data: created, error: createError } = await db
          .from("marcia_service")
          .insert({ company_id: data.companyId, ...values })
          .select("id")
          .single();
        if (createError) throw new Error(createError.message);
        id = created.id;
      }
      serviceIds.push(id);
    }

    const professionalRows: Array<{ id: string; name: string }> = [];
    for (const professional of data.setup.professionals) {
      const { data: matches, error: lookupError } = await db
        .from("marcia_professional")
        .select("id,name")
        .eq("company_id", data.companyId)
        .ilike("name", professional.name)
        .limit(2);
      if (lookupError) throw new Error(lookupError.message);
      let row = matches?.length === 1 ? matches[0] : null;
      if (!row) {
        const { data: created, error: createError } = await db
          .from("marcia_professional")
          .insert({
            company_id: data.companyId,
            name: professional.name,
            timezone: "America/Sao_Paulo",
            active: true,
          })
          .select("id,name")
          .single();
        if (createError) throw new Error(createError.message);
        row = created;
      }
      professionalRows.push(row);
    }

    if (serviceIds.length && professionalRows.length) {
      const { error: linkError } = await db.from("marcia_professional_service").upsert(
        professionalRows.flatMap((professional) =>
          serviceIds.map((serviceId) => ({
            company_id: data.companyId,
            professional_id: professional.id,
            service_id: serviceId,
            active: true,
          })),
        ),
      );
      if (linkError) throw new Error(linkError.message);
    }

    for (const schedule of data.setup.availability) {
      const targets = schedule.professionalName
        ? professionalRows.filter(
            (row) => row.name.localeCompare(schedule.professionalName!, "pt-BR", { sensitivity: "base" }) === 0,
          )
        : professionalRows;
      for (const professional of targets) {
        const { error: removeError } = await db
          .from("marcia_availability_rule")
          .delete()
          .eq("company_id", data.companyId)
          .eq("professional_id", professional.id)
          .in("weekday", schedule.weekdays);
        if (removeError) throw new Error(removeError.message);
        const { error: insertError } = await db.from("marcia_availability_rule").insert(
          schedule.weekdays.map((weekday) => ({
            company_id: data.companyId,
            professional_id: professional.id,
            weekday,
            starts_at: schedule.startsAt,
            ends_at: schedule.endsAt,
            active: true,
          })),
        );
        if (insertError) throw new Error(insertError.message);
      }
    }

    if (data.config.nome_empresa) {
      const { error: companyError } = await db
        .from("company")
        .update({ nome: data.config.nome_empresa })
        .eq("id", data.companyId);
      if (companyError) throw new Error(companyError.message);
    }

    return {
      saved: true,
      servicesCreated: serviceIds.length,
      professionalsCreated: professionalRows.length,
      schedulesCreated: data.setup.availability.reduce((total, row) => total + row.weekdays.length, 0),
    };
  });
