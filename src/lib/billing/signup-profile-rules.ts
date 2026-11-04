/** Dados do formulário público de cadastro (mesmos campos do Novo Assinante do Master). */
export type SignupProfile = {
  responsavelNome: string;
  tipoPessoa: "pf" | "pj";
  cnpjCpf: string;
  nome: string;
  razaoSocial?: string;
  telefone: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  segmento?: string;
  logoUrl?: string | null;
};

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const txt = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** Retorna a mensagem do primeiro erro, ou null. */
export function signupProfileError(p: Partial<SignupProfile>): string | null {
  if (txt(p.responsavelNome).length < 3) return "Informe seu nome completo.";
  if (p.tipoPessoa !== "pf" && p.tipoPessoa !== "pj") return "Escolha pessoa física ou jurídica.";
  const doc = digits(p.cnpjCpf);
  const len = p.tipoPessoa === "pf" ? 11 : 14;
  if (doc.length !== len || /^(\d)\1+$/.test(doc))
    return p.tipoPessoa === "pf" ? "CPF inválido." : "CNPJ inválido.";
  if (txt(p.nome).length < 2) return "Informe o nome da conta ou empresa.";
  const phone = digits(p.telefone);
  if (phone.length < 10 || phone.length > 13) return "Informe um WhatsApp válido com DDD.";
  const cep = digits(p.cep);
  if (cep && cep.length !== 8) return "CEP inválido.";
  const uf = txt(p.estado, 2).toUpperCase();
  if (uf && !/^[A-Z]{2}$/.test(uf)) return "Estado inválido (use a sigla, ex.: SP).";
  if (p.logoUrl && !/^data:image\/(png|jpeg|webp);base64,/.test(p.logoUrl)) return "Foto inválida.";
  if (p.logoUrl && p.logoUrl.length > 400_000) return "Foto muito grande.";
  return null;
}

export function sanitizeSignupProfile(p: Partial<SignupProfile>): SignupProfile {
  return {
    responsavelNome: txt(p.responsavelNome, 120),
    tipoPessoa: p.tipoPessoa === "pj" ? "pj" : "pf",
    cnpjCpf: digits(p.cnpjCpf),
    nome: txt(p.nome, 120),
    razaoSocial: txt(p.razaoSocial),
    telefone: txt(p.telefone, 40),
    cep: digits(p.cep),
    rua: txt(p.rua),
    numero: txt(p.numero, 20),
    complemento: txt(p.complemento),
    bairro: txt(p.bairro),
    cidade: txt(p.cidade),
    estado: txt(p.estado, 2).toUpperCase(),
    segmento: txt(p.segmento, 80),
    logoUrl: p.logoUrl || null,
  };
}
