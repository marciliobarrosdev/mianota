import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubscriberAvatarInput } from "@/components/master/subscriber-avatar";
import { maskCep, maskCnpj, maskCpf } from "@/lib/common/masks";
import { maskBrazilianPhoneInput } from "@/lib/common/phone";
import type { SignupProfile } from "@/lib/billing/signup-profile-rules";

export const EMPTY_SIGNUP_PROFILE: SignupProfile = {
  responsavelNome: "",
  tipoPessoa: "pf",
  cnpjCpf: "",
  nome: "",
  razaoSocial: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  segmento: "",
  logoUrl: null,
};

/** Mesmos campos do Novo Assinante do Master, preenchidos pelo próprio cliente. */
export function SignupProfileFields({
  value,
  onChange,
}: {
  value: SignupProfile;
  onChange: (v: SignupProfile) => void;
}) {
  const set = <K extends keyof SignupProfile>(k: K, v: SignupProfile[K]) =>
    onChange({ ...value, [k]: v });
  const field = (
    id: keyof SignupProfile,
    label: string,
    opts: { placeholder?: string; mask?: (v: string) => string; required?: boolean; className?: string } = {},
  ) => (
    <div className={`space-y-1.5 ${opts.className ?? ""}`}>
      <Label htmlFor={`sp-${id}`}>
        {label}
        {opts.required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={`sp-${id}`}
        value={String(value[id] ?? "")}
        placeholder={opts.placeholder}
        required={opts.required}
        onChange={(e) => set(id, (opts.mask ? opts.mask(e.target.value) : e.target.value) as never)}
        className="h-11"
      />
    </div>
  );
  const pj = value.tipoPessoa === "pj";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Sua foto (opcional)</Label>
        <SubscriberAvatarInput
          value={value.logoUrl ?? null}
          onChange={(v) => set("logoUrl", v)}
          name={value.responsavelNome}
        />
      </div>
      {field("responsavelNome", "Nome completo", { required: true, placeholder: "Seu nome" })}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pessoa">
        {(["pf", "pj"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value.tipoPessoa === t}
            onClick={() => onChange({ ...value, tipoPessoa: t, cnpjCpf: "" })}
            className={`h-10 rounded-lg border text-sm font-semibold transition ${value.tipoPessoa === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {t === "pf" ? "Pessoa física" : "Pessoa jurídica"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("cnpjCpf", pj ? "CNPJ" : "CPF", {
          required: true,
          mask: pj ? maskCnpj : maskCpf,
          placeholder: pj ? "00.000.000/0000-00" : "000.000.000-00",
        })}
        {field("telefone", "WhatsApp", {
          required: true,
          mask: maskBrazilianPhoneInput,
          placeholder: "(11) 99999-9999",
        })}
      </div>
      {field("nome", pj ? "Nome fantasia" : "Nome da conta", {
        required: true,
        placeholder: pj ? "Nome da empresa" : "Ex.: Finanças da Ana",
      })}
      {pj && field("razaoSocial", "Razão social")}
      {field("segmento", "Profissão ou segmento", { placeholder: "Opcional" })}
      <div className="grid gap-4 sm:grid-cols-3">
        {field("cep", "CEP", { mask: maskCep, placeholder: "00000-000" })}
        {field("rua", "Rua", { className: "sm:col-span-2" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("numero", "Número")}
        {field("complemento", "Complemento", { className: "sm:col-span-2" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_80px]">
        {field("bairro", "Bairro")}
        {field("cidade", "Cidade")}
        {field("estado", "UF", { mask: (v) => v.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase() })}
      </div>
    </div>
  );
}
