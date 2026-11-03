import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMAIL_INPUT_PROPS, maskCnpj, maskCpf } from "@/lib/common/masks";
import { maskBrazilianPhoneInput, PHONE_INPUT_PROPS } from "@/lib/common/phone";
import { getCompanyDetails, updateCompanyProfile } from "@/lib/master/master.functions";
import { SubscriberAvatarInput } from "./subscriber-avatar";

const EMPTY = {
  nome: "", tipoPessoa: "pf" as "pf" | "pj", cnpjCpf: "", razaoSocial: "", responsavelNome: "",
  telefone: "", inscricaoEstadual: "", emailCorporativo: "", site: "", cep: "", rua: "", numero: "",
  complemento: "", bairro: "", cidade: "", estado: "", segmento: "", logoUrl: null as string | null,
};

function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function SubscriberEditDialog({
  companyId,
  onClose,
  onSaved,
}: {
  companyId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const details = useServerFn(getCompanyDetails);
  const save = useServerFn(updateCompanyProfile);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setForm(EMPTY);
    details({ data: { companyId } })
      .then((r: any) => {
        const c = r.company;
        const owner = (r.members ?? []).find((m: any) => m.role === "owner");
        const tipo = c.tipo_pessoa === "pj" ? "pj" : "pf";
        const doc = String(c.cnpj_cpf ?? "");
        const phone = String(c.telefone ?? owner?.profile?.telefone ?? "").replace(/^\+?55/, "");
        setForm({
          nome: c.nome ?? "", tipoPessoa: tipo, cnpjCpf: doc ? (tipo === "pf" ? maskCpf : maskCnpj)(doc) : "",
          razaoSocial: c.razao_social ?? "", responsavelNome: owner?.profile?.nome ?? "",
          telefone: phone ? maskBrazilianPhoneInput(phone) : "", inscricaoEstadual: c.inscricao_estadual ?? "",
          emailCorporativo: c.email_corporativo ?? "", site: c.site ?? "", cep: c.cep ? maskCep(c.cep) : "",
          rua: c.rua ?? "", numero: c.numero ?? "", complemento: c.complemento ?? "", bairro: c.bairro ?? "",
          cidade: c.cidade ?? "", estado: c.estado ?? "", segmento: c.segmento ?? "", logoUrl: c.logo_url ?? null,
        });
      })
      .catch((e: any) => { toast.error(e?.message ?? "Falha ao carregar"); onClose(); })
      .finally(() => setLoading(false));
  }, [companyId]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    try {
      await save({ data: { companyId, ...form } });
      toast.success("Assinante atualizado");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!companyId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar assinante</DialogTitle></DialogHeader>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <SubscriberAvatarInput value={form.logoUrl} onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))} name={form.nome} />
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Tipo de pessoa</Label>
                <select className="w-full rounded-md border p-2 bg-background" value={form.tipoPessoa}
                  onChange={(e) => setForm((f) => ({ ...f, tipoPessoa: e.target.value as "pf" | "pj", cnpjCpf: "" }))}>
                  <option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option>
                </select></div>
              <div><Label>{form.tipoPessoa === "pf" ? "CPF" : "CNPJ"}</Label>
                <Input value={form.cnpjCpf} onChange={(e) => setForm((f) => ({ ...f, cnpjCpf: (f.tipoPessoa === "pf" ? maskCpf : maskCnpj)(e.target.value) }))} /></div>
              <div><Label>{form.tipoPessoa === "pf" ? "Nome" : "Nome do negócio"}</Label><Input required value={form.nome} onChange={set("nome")} /></div>
              {form.tipoPessoa === "pj" && <div><Label>Razão social</Label><Input value={form.razaoSocial} onChange={set("razaoSocial")} /></div>}
              <div><Label>Nome do responsável</Label><Input value={form.responsavelNome} onChange={set("responsavelNome")} /></div>
              <div><Label>WhatsApp</Label><Input {...PHONE_INPUT_PROPS} value={form.telefone} placeholder="(11) 91234-5678"
                onChange={(e) => setForm((f) => ({ ...f, telefone: maskBrazilianPhoneInput(e.target.value) }))} /></div>
              <div><Label>E-mail de contato</Label><Input {...EMAIL_INPUT_PROPS} value={form.emailCorporativo} onChange={set("emailCorporativo")} /></div>
              <div><Label>Segmento</Label><Input value={form.segmento} onChange={set("segmento")} placeholder="Ex.: Pessoal, Comércio" /></div>
              {form.tipoPessoa === "pj" && <>
                <div><Label>Inscrição estadual</Label><Input value={form.inscricaoEstadual} onChange={set("inscricaoEstadual")} /></div>
                <div><Label>Site</Label><Input value={form.site} onChange={set("site")} placeholder="https://" /></div>
              </>}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Endereço</h3>
              <div className="grid md:grid-cols-6 gap-4">
                <div className="md:col-span-2"><Label>CEP</Label><Input inputMode="numeric" value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: maskCep(e.target.value) }))} placeholder="00000-000" /></div>
                <div className="md:col-span-4"><Label>Rua</Label><Input value={form.rua} onChange={set("rua")} /></div>
                <div className="md:col-span-2"><Label>Número</Label><Input value={form.numero} onChange={set("numero")} /></div>
                <div className="md:col-span-4"><Label>Complemento</Label><Input value={form.complemento} onChange={set("complemento")} /></div>
                <div className="md:col-span-2"><Label>Bairro</Label><Input value={form.bairro} onChange={set("bairro")} /></div>
                <div className="md:col-span-3"><Label>Cidade</Label><Input value={form.cidade} onChange={set("cidade")} /></div>
                <div className="md:col-span-1"><Label>UF</Label><Input maxLength={2} value={form.estado} placeholder="SP"
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
