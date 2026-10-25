import { useCallback, useRef, useState } from "react";
import {
  newId,
  type ChatAttachment,
  type ChatMessage,
  type ChatPendingTurn,
  type ChatPhase,
  type MarciaChatController,
} from "@/components/finance/marcia-chat-types";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/mercado|feira|padaria|supermercado/, "Mercado"],
  [/farm[aá]cia|rem[eé]dio|m[eé]dico|dentista|academia/, "Saúde"],
  [/uber|combust|gasolina|posto|[oô]nibus|ipva/, "Transporte"],
  [/almo[cç]o|jantar|restaurante|pizza|lanche|ifood/, "Restaurantes"],
  [/aluguel|luz|[aá]gua|internet|condom[ií]nio|energia/, "Moradia"],
  [/cinema|show|viagem|presente/, "Lazer"],
  [/sal[aá]rio/, "Salário"],
  [/projeto|freela|venda|cliente/, "Renda extra"],
];

function parseAmount(text: string): number | null {
  const match = text.replace(/r\$\s?/i, "").match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!match) return null;
  const value = Number(`${match[1].replace(/\./g, "")}.${match[2] || "0"}`);
  return value > 0 ? value : null;
}

type Draft = { preview: Array<{ label: string; value: string }>; success: string };

function buildDraft(text: string, amount: number, dateLabel?: string): Draft {
  const lower = text.toLowerCase();
  const income = /recebi|ganhei|sal[aá]rio|entrou|vendi/.test(lower);
  const bill = /vence|conta de|boleto|lembre|lembrete|dia \d{1,2}|\(data:/.test(lower);
  const category =
    CATEGORY_HINTS.find(([re]) => re.test(lower))?.[1] || (income ? "Renda extra" : "Outros");
  const payment = /pix/.test(lower)
    ? "Pix"
    : /cart[aã]o|cr[eé]dito|d[eé]bito/.test(lower)
      ? "Cartão"
      : /dinheiro/.test(lower)
        ? "Dinheiro"
        : bill
          ? "Boleto"
          : "Pix";
  const description =
    text
      .replace(/\(data:.*?\)/, "")
      .replace(/r\$\s?[\d.,]+|[\d.,]+\s?(reais)?/gi, "")
      .replace(
        /\b(gastei|paguei|recebi|ganhei|no|na|de|do|da|pelo|pela|com|hoje|pix|cart[aã]o|em|dinheiro|vence|dia)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (c) => c.toUpperCase()) || (income ? "Entrada" : "Despesa");
  const when = dateLabel || (bill ? "Próximo vencimento" : "Hoje");
  const kind = bill
    ? income
      ? "Entrada prevista"
      : "Conta a pagar"
    : income
      ? "Entrada"
      : "Saída";
  return {
    preview: [
      { label: "Tipo", value: kind },
      { label: "Descrição", value: description.slice(0, 40) },
      { label: "Valor", value: brl(amount) },
      { label: "Categoria", value: category },
      { label: "Pagamento", value: payment },
      { label: bill ? "Vencimento" : "Data", value: when },
    ],
    success: bill
      ? `Pronto. ${description.slice(0, 40)} de ${brl(amount)} está no calendário e eu aviso antes do vencimento.`
      : income
        ? `Pronto. A receita de ${brl(amount)} entrou na Visão do mês e no extrato.`
        : `Pronto. A despesa de ${brl(amount)} foi registrada e o mês foi atualizado.`,
  };
}

const SEED: ChatMessage[] = [
  {
    id: "s1",
    role: "user",
    text: "Gastei 87,40 na farmácia no Pix",
    at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "s2",
    role: "assistant",
    text: "Registrado: R$ 87,40 em Saúde, pago no Pix hoje. 💜",
    kind: "success",
    at: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
  },
  {
    id: "s3",
    role: "user",
    text: "Essa é a conta de luz",
    attachment: { name: "fatura-enel-outubro.pdf", size: 248_000, kind: "pdf" },
    at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "s4",
    role: "assistant",
    text: "Li a fatura: Enel, R$ 182,40, vencimento em 4 dias. Coloquei no calendário como conta a pagar.",
    kind: "success",
    at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
  },
];

/** Roteiro local da demonstração, com o mesmo contrato do chat real. */
export function useDemoMarciaChat(
  options: { seed?: boolean; dateLabel?: string } = {},
): MarciaChatController {
  const [messages, setMessages] = useState<ChatMessage[]>(options.seed === false ? [] : SEED);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [pending, setPending] = useState<ChatPendingTurn | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const waitingAmountRef = useRef<string | null>(null);

  const append = useCallback((m: Omit<ChatMessage, "id" | "at">) => {
    const id = newId();
    setMessages((c) => [...c, { ...m, id, at: new Date().toISOString() }]);
    return id;
  }, []);

  const confirm = useCallback(async () => {
    const draft = draftRef.current;
    if (!draft) return;
    setPhase("executing");
    await wait(700);
    append({ role: "assistant", text: draft.success, kind: "success" });
    draftRef.current = null;
    setPending(null);
    setPhase("idle");
  }, [append]);

  const cancel = useCallback(async () => {
    draftRef.current = null;
    waitingAmountRef.current = null;
    setPending(null);
    append({ role: "assistant", text: "Tudo bem, cancelei esse pedido.", kind: "answer" });
  }, [append]);

  const send = useCallback(
    async (raw: string, attachment?: ChatAttachment | null) => {
      const text = raw.trim();
      if (!text && !attachment) return;
      if (pending?.mode === "confirm" && /^(sim|confirmar|ok|pode)$/i.test(text) && !attachment) {
        append({ role: "user", text });
        await confirm();
        return;
      }
      append({
        role: "user",
        text: text || "Enviei um comprovante.",
        attachment: attachment
          ? {
              name: attachment.name,
              size: attachment.size,
              kind: attachment.kind,
              previewUrl: attachment.kind === "image" ? attachment.dataUrl : undefined,
            }
          : undefined,
      });
      setPending(null);
      setPhase("understanding");
      await wait(attachment ? 1500 : 1000);

      if (attachment) {
        const pdf = attachment.kind === "pdf";
        draftRef.current = {
          preview: pdf
            ? [
                { label: "Tipo", value: "Conta a pagar" },
                { label: "Descrição", value: "Conta de energia" },
                { label: "Valor", value: brl(196.8) },
                { label: "Categoria", value: "Moradia" },
                { label: "Pagamento", value: "Boleto" },
                { label: "Vencimento", value: "Em 8 dias" },
              ]
            : [
                { label: "Tipo", value: "Saída" },
                { label: "Estabelecimento", value: "Supermercado Bom Preço" },
                { label: "Valor", value: brl(213.47) },
                { label: "Categoria", value: "Mercado" },
                { label: "Pagamento", value: "Cartão •4821" },
                { label: "Data", value: "Hoje, 19:12" },
              ],
          success: pdf
            ? "Pronto. A conta de energia de R$ 196,80 está no calendário. Aviso 2 dias antes."
            : "Pronto. A despesa de R$ 213,47 no Supermercado Bom Preço foi registrada.",
        };
        const id = append({
          role: "assistant",
          text: pdf
            ? `Li o PDF “${attachment.name}”. Confere os dados?`
            : "Li o comprovante. Confere os dados antes de eu registrar?",
          kind: "confirm",
          preview: draftRef.current.preview,
        });
        setPending({ messageId: id, mode: "confirm", quickReplies: [] });
        setPhase("idle");
        return;
      }

      const lower = text.toLowerCase();
      if (/quanto|resumo|como est[aá]|sobrou/.test(lower) && !waitingAmountRef.current) {
        append({
          role: "assistant",
          text: "Neste mês entraram R$ 7.470,00 e saíram R$ 4.012,10. Mercado e Moradia somam 58% das saídas. Ainda há R$ 1.795,70 em contas para pagar — a sobra prevista é de R$ 2.862,20.",
          kind: "answer",
        });
        setPhase("idle");
        return;
      }

      const combined = waitingAmountRef.current ? `${waitingAmountRef.current} ${text}` : text;
      const amount = parseAmount(text) ?? (waitingAmountRef.current ? null : null);
      if (!amount) {
        waitingAmountRef.current = combined;
        const id = append({
          role: "assistant",
          text: "Entendi! Qual foi o valor?",
          kind: "question",
        });
        setPending({
          messageId: id,
          mode: "question",
          quickReplies: ["R$ 50", "R$ 100", "R$ 250"],
        });
        setPhase("idle");
        return;
      }
      waitingAmountRef.current = null;
      const draft = buildDraft(combined, amount, options.dateLabel);
      draftRef.current = draft;
      const id = append({
        role: "assistant",
        text: "Preparei assim. Posso registrar?",
        kind: "confirm",
        preview: draft.preview,
      });
      setPending({ messageId: id, mode: "confirm", quickReplies: [] });
      setPhase("idle");
    },
    [append, confirm, options.dateLabel, pending?.mode],
  );

  const setListening = useCallback((listening: boolean) => {
    setPhase((c) => (listening ? "listening" : c === "listening" ? "idle" : c));
  }, []);

  return {
    messages,
    phase,
    pending,
    send,
    confirm,
    cancel,
    setListening,
    voiceFallback: "Gastei 84,90 no mercado pelo Pix",
  };
}
