// Dados mockados para a prévia pública de conversas. NÃO toca no banco.
export type DemoMsg = {
  id: string; numero: string; nome: string;
  direcao: "entrada" | "saida"; autor: "ia" | "humano" | "contato";
  texto: string; quando: Date;
};

// Timestamp FIXO para evitar hydration mismatch entre SSR e client.
const NOW = new Date("2026-06-16T14:30:00.000Z").getTime();
const m = (min: number) => new Date(NOW - min * 60000);

const seedContatos = [
  { numero: "5511987651001", nome: "Mariana Costa" },
  { numero: "5511987651002", nome: "Juliana Almeida" },
  { numero: "5521987651003", nome: "Rafael Tavares" },
  { numero: "5531987651004", nome: "Camila Ribeiro" },
  { numero: "5541987651005", nome: "Beatriz Souza" },
  { numero: "5511987651006", nome: "Patrícia Rocha" },
  { numero: "5511987651007", nome: "Letícia Moreira" },
];

export const demoMensagens: DemoMsg[] = [
  // Mariana — agendou
  { id: "1", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "entrada", autor: "contato", texto: "Oi! Gostaria de agendar uma limpeza de pele profunda.", quando: m(50) },
  { id: "2", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "saida", autor: "ia", texto: "Olá, Mariana! 👋 Posso te encaixar. Prefere manhã ou tarde?", quando: m(49) },
  { id: "3", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "entrada", autor: "contato", texto: "Tarde, pode ser quinta.", quando: m(45) },
  { id: "4", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "saida", autor: "ia", texto: "Quinta 19/06 às 15h com a Dra. Helena, R$ 280. Confirmo?", quando: m(44) },
  { id: "5", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "entrada", autor: "contato", texto: "Confirmado! 💜", quando: m(8) },
  // Juliana — pacote de drenagem
  { id: "6", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "entrada", autor: "contato", texto: "Bom dia! Quanto custa o pacote de drenagem linfática?", quando: m(180) },
  { id: "7", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "saida", autor: "ia", texto: "Oi, Juliana! Pacote de 10 sessões R$ 1.890 (R$ 189 cada). Quer agendar avaliação?", quando: m(178) },
  { id: "8", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "entrada", autor: "contato", texto: "Quero, tem sábado de manhã?", quando: m(170) },
  { id: "9", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "saida", autor: "humano", texto: "Tem sim! Sáb 21/06 às 10h fechado. Te mando o endereço.", quando: m(160) },
  // Rafael — pensando
  { id: "10", numero: seedContatos[2].numero, nome: seedContatos[2].nome, direcao: "entrada", autor: "contato", texto: "Vocês fazem botox masculino?", quando: m(300) },
  { id: "11", numero: seedContatos[2].numero, nome: seedContatos[2].nome, direcao: "saida", autor: "ia", texto: "Fazemos sim, Rafael! Aplicação a partir de R$ 1.200 com a Dra. Helena (dermato). Quer marcar avaliação grátis?", quando: m(298) },
  { id: "12", numero: seedContatos[2].numero, nome: seedContatos[2].nome, direcao: "entrada", autor: "contato", texto: "Vou pensar e retorno, obrigado.", quando: m(290) },
  // Camila — perda
  { id: "13", numero: seedContatos[3].numero, nome: seedContatos[3].nome, direcao: "entrada", autor: "contato", texto: "Vocês fazem cirurgia plástica?", quando: m(1440) },
  { id: "14", numero: seedContatos[3].numero, nome: seedContatos[3].nome, direcao: "saida", autor: "ia", texto: "Não trabalhamos com cirurgia, só procedimentos estéticos não invasivos. Posso te indicar um parceiro?", quando: m(1438) },
  { id: "15", numero: seedContatos[3].numero, nome: seedContatos[3].nome, direcao: "entrada", autor: "contato", texto: "Não, obrigada.", quando: m(1430) },
  // Beatriz — negociando pacote laser
  { id: "16", numero: seedContatos[4].numero, nome: seedContatos[4].nome, direcao: "entrada", autor: "contato", texto: "Quero depilação a laser axilas + virilha. Tem combo?", quando: m(120) },
  { id: "17", numero: seedContatos[4].numero, nome: seedContatos[4].nome, direcao: "saida", autor: "ia", texto: "Tem! Pacote 8 sessões R$ 2.400 (12x no cartão). Posso reservar avaliação?", quando: m(118) },
  { id: "18", numero: seedContatos[4].numero, nome: seedContatos[4].nome, direcao: "entrada", autor: "contato", texto: "Me passa as condições de pagamento.", quando: m(60) },
  // Patrícia
  { id: "19", numero: seedContatos[5].numero, nome: seedContatos[5].nome, direcao: "entrada", autor: "contato", texto: "Aceita Pix com desconto?", quando: m(25) },
  { id: "20", numero: seedContatos[5].numero, nome: seedContatos[5].nome, direcao: "saida", autor: "ia", texto: "Aceitamos! 5% off à vista no Pix 💳", quando: m(24) },
  // Letícia
  { id: "21", numero: seedContatos[6].numero, nome: seedContatos[6].nome, direcao: "entrada", autor: "contato", texto: "Quero agendar avaliação de harmonização facial.", quando: m(12) },
];

export type DemoCard = {
  id: string; numero: string; nome: string;
  status: "conversas" | "negociando" | "ganho" | "perda";
  ultima_mensagem: string; ultima_em: Date;
  valor?: number; observacao?: string; tags?: string[];
};

export const demoCards: DemoCard[] = [
  { id: "c1", numero: seedContatos[0].numero, nome: seedContatos[0].nome, status: "ganho", ultima_mensagem: "Confirmado! 💜", ultima_em: m(8), valor: 280, observacao: "Limpeza de pele profunda agendada 19/06 15h — Dra. Helena.", tags: ["vip", "facial"] },
  { id: "c2", numero: seedContatos[1].numero, nome: seedContatos[1].nome, status: "ganho", ultima_mensagem: "Sáb 21/06 às 10h fechado.", ultima_em: m(160), valor: 1890, observacao: "Pacote 10 sessões drenagem. Avaliação sáb 21/06 10h.", tags: ["pacote", "corporal"] },
  { id: "c3", numero: seedContatos[2].numero, nome: seedContatos[2].nome, status: "conversas", ultima_mensagem: "Vou pensar e retorno, obrigado.", ultima_em: m(290), tags: ["botox", "lead-quente"] },
  { id: "c4", numero: seedContatos[3].numero, nome: seedContatos[3].nome, status: "perda", ultima_mensagem: "Não, obrigada.", ultima_em: m(1430), observacao: "Procurava cirurgia plástica (não atendemos).", tags: ["fora-escopo"] },
  { id: "c5", numero: seedContatos[4].numero, nome: seedContatos[4].nome, status: "negociando", ultima_mensagem: "Me passa as condições de pagamento.", ultima_em: m(60), valor: 2400, observacao: "Combo depilação laser axilas + virilha — 8 sessões.", tags: ["laser", "pacote"] },
  { id: "c6", numero: seedContatos[5].numero, nome: seedContatos[5].nome, status: "conversas", ultima_mensagem: "Aceita Pix com desconto?", ultima_em: m(25), tags: ["lead"] },
  { id: "c7", numero: seedContatos[6].numero, nome: seedContatos[6].nome, status: "negociando", ultima_mensagem: "Quero agendar avaliação de harmonização facial.", ultima_em: m(12), valor: 1500, observacao: "Avaliação de harmonização — interessada em preenchimento labial.", tags: ["harmonizacao", "lead-quente"] },
];
