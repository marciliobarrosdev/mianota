import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileCheck2,
  Loader2,
  MessageCircleMore,
  Power,
  RadioTower,
  Send,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createSuggestedTemplate,
  getCentralChannelState,
  saveEvolutionPurchaseMessage,
  saveMetaTemplateConfig,
  switchCentralChannel,
} from "@/lib/master-onboarding.functions";
import {
  SUGGESTED_EVOLUTION_PURCHASE_MESSAGE,
  SUGGESTED_META_TEMPLATE_BODY,
  buildEvolutionActivationText,
} from "@/lib/purchase-onboarding-rules";

type Mode = "evolution" | "meta";
type State = Awaited<ReturnType<typeof getCentralChannelState>>;
const LABEL: Record<Mode, string> = { evolution: "QR Code (Evolution)", meta: "API oficial Meta" };

export function CentralChannelCard({ mode, onChanged }: { mode: Mode; onChanged?: () => void }) {
  const load = useServerFn(getCentralChannelState);
  const switchFn = useServerFn(switchCentralChannel);
  const [state, setState] = useState<State | null>(null);
  const [open, setOpen] = useState<null | Mode | "off">(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await load());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao ler o canal ativo.");
    }
  }, [load]);
  useEffect(() => void refresh(), [refresh]);

  async function runSwitch() {
    if (!open) return;
    setBusy(true);
    try {
      await switchFn({ data: { to: open === "off" ? null : open, confirm } });
      toast.success(
        open === "off" ? "Canal central desativado." : `${LABEL[open]} agora é o canal ativo.`,
      );
      setOpen(null);
      setConfirm("");
      await refresh();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar o canal.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <Card className="p-4">
        <Loader2 className="size-5 animate-spin text-primary" />
      </Card>
    );
  }
  const isActive = state.activeProvider === mode;
  const other: Mode = mode === "meta" ? "evolution" : "meta";

  return (
    <>
      <Card className={`p-4 space-y-3 ${isActive ? "border-primary/50" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <RadioTower className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Canal central ativo (um por vez)</p>
              <p className="font-display font-bold">
                {state.activeProvider ? LABEL[state.activeProvider] : "Nenhum canal ativo"}
              </p>
            </div>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Esta página é o canal ativo" : "Esta página está inativa"}
          </Badge>
        </div>
        {isActive ? (
          <p className="text-sm text-muted-foreground">
            Todas as mensagens dos assinantes e os avisos de compra aprovada saem por aqui. O{" "}
            {LABEL[other]} fica desligado: mensagens recebidas nele são ignoradas.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground flex gap-2">
            <TriangleAlert className="size-4 shrink-0 mt-0.5 text-amber-600" />
            Você pode configurar e testar este canal, mas ele só responde depois de ativado. Ativar{" "}
            {LABEL[mode]} desliga{" "}
            {state.activeProvider ? LABEL[state.activeProvider] : "qualquer outro"}.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!isActive && (
            <Button size="sm" onClick={() => setOpen(mode)} disabled={!state.readiness[mode]}>
              <CheckCircle2 className="size-4" /> Ativar {LABEL[mode]}
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="outline" onClick={() => setOpen("off")}>
              <Power className="size-4" /> Desativar canal central
            </Button>
          )}
          {!isActive && !state.readiness[mode] && (
            <span className="text-xs text-muted-foreground self-center">
              {mode === "meta"
                ? "Salve e teste as credenciais da Meta abaixo para liberar a ativação."
                : "Configure o servidor e gere o QR Code abaixo para liberar a ativação."}
            </span>
          )}
        </div>
        {state.log.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Histórico de trocas</summary>
            <ul className="mt-2 space-y-1">
              {state.log.map((item: State["log"][number]) => (
                <li key={item.id}>
                  {new Date(item.at).toLocaleString("pt-BR")} · {item.from ?? "nenhum"} →{" "}
                  {item.to ?? "nenhum"} {item.note && `· ${item.note}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
      {mode === "evolution" ? (
        <EvolutionMessageCard state={state} onSaved={refresh} />
      ) : (
        <MetaTemplateCard state={state} onSaved={refresh} />
      )}

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "off"
                ? "Desativar canal central"
                : `Ativar ${open ? LABEL[open as Mode] : ""}`}
            </DialogTitle>
            <DialogDescription>
              {open === "off"
                ? "Os assinantes deixarão de receber respostas no WhatsApp até outro canal ser ativado."
                : "Antes da troca o sistema testa a conexão de verdade. O canal anterior para de responder imediatamente e a troca fica registrada."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-switch">Digite ATIVAR para confirmar</Label>
            <Input
              id="confirm-switch"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>
              Cancelar
            </Button>
            <Button
              onClick={runSwitch}
              disabled={busy || confirm.trim().toUpperCase() !== "ATIVAR"}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EvolutionMessageCard({ state, onSaved }: { state: State; onSaved: () => void }) {
  const save = useServerFn(saveEvolutionPurchaseMessage);
  const [message, setMessage] = useState(
    state.evolutionMessage || SUGGESTED_EVOLUTION_PURCHASE_MESSAGE,
  );
  const [busy, setBusy] = useState(false);
  const hasCode = /\{\{codigo\}\}/i.test(message);
  const preview = buildEvolutionActivationText({
    name: "Ana Souza",
    product: "MárcIA",
    code: "K7P2QX",
    template: message,
  });

  async function runSave() {
    setBusy(true);
    try {
      const result = await save({ data: { message } });
      setMessage(result.message);
      toast.success("Mensagem de compra aprovada salva.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a mensagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <MessageCircleMore className="size-5" />
        </span>
        <div>
          <h2 className="font-display font-bold">Mensagem automática de compra aprovada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Este é o primeiro texto que o novo assinante recebe. Ao responder com o código, o
            sistema confirma o telefone e conecta a conversa ao dashboard correto.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="evolution-purchase-message">Personalize a mensagem</Label>
            <Textarea
              id="evolution-purchase-message"
              className="min-h-52 resize-y"
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              ["{{nome}}", "primeiro nome"],
              ["{{produto}}", "nome do sistema"],
              ["{{codigo}}", "código obrigatório"],
              ["{{validade_horas}}", "prazo"],
            ].map(([token, label]) => (
              <span key={token} className="rounded-full border bg-muted/50 px-2.5 py-1">
                <strong>{token}</strong> · {label}
              </span>
            ))}
          </div>
          {!hasCode && (
            <p className="flex gap-2 text-xs text-destructive">
              <TriangleAlert className="size-4 shrink-0" /> O token {"{{codigo}}"} é obrigatório:
              sem ele não há como vincular o WhatsApp ao assinante.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={runSave} disabled={busy || !hasCode} size="sm">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileCheck2 className="size-4" />
              )}
              Salvar mensagem
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Prévia no WhatsApp
          </p>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-950 whitespace-pre-wrap">
            {preview}
          </div>
          <div className="mt-3 rounded-xl border bg-background p-3">
            <p className="text-xs font-semibold text-primary">Sugestão de mensagem de compra aprovada</p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {SUGGESTED_EVOLUTION_PURCHASE_MESSAGE}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setMessage(SUGGESTED_EVOLUTION_PURCHASE_MESSAGE)}
              disabled={busy}
            >
              Usar esta sugestão
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Depois do envio, acompanhe a resposta e o vínculo em{" "}
        <Link to="/master/onboarding" className="underline">
          Ativação pós-compra
        </Link>
        .
      </p>
    </Card>
  );
}

function MetaTemplateCard({ state, onSaved }: { state: State; onSaved: () => void }) {
  const save = useServerFn(saveMetaTemplateConfig);
  const create = useServerFn(createSuggestedTemplate);
  const [name, setName] = useState(state.template.name || "compra_aprovada_marcia");
  const [language, setLanguage] = useState(state.template.language || "pt_BR");
  const [body, setBody] = useState(state.template.body || SUGGESTED_META_TEMPLATE_BODY);
  const [busy, setBusy] = useState<null | "save" | "create">(null);
  const status = state.template.status;
  const approved = String(status || "").toUpperCase() === "APPROVED";
  const variables = body.match(/\{\{\d+\}\}/g) || [];
  const validBody = variables.length === 2 && variables[0] === "{{1}}" && variables[1] === "{{2}}";

  async function run(kind: "save" | "create") {
    setBusy(kind);
    try {
      if (kind === "save") {
        const result = await save({ data: { name, language, body } });
        setBody(result.body);
        if (result.warning) toast.warning(result.warning);
        else toast.success(`Template verificado: ${result.status}.`);
      } else {
        const result = await create({ data: { name, language, body } });
        toast.success(
          `Template enviado para aprovação da Meta (${result.status}). Pode levar até 48h.`,
        );
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao falar com a Meta.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" />
          </span>
          <div>
            <h2 className="font-display font-bold">Template automático de compra aprovada</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              É a primeira mensagem enviada pela API oficial para iniciar a conversa com o novo
              assinante.
            </p>
          </div>
        </div>
        <Badge variant={approved ? "default" : "secondary"}>
          {status ? templateLabel(status) : "Não configurado"}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {[
          ["1", "Personalize", "Ajuste nome, idioma e texto."],
          ["2", "Envie à Meta", "O sistema sobe o template para aprovação."],
          ["3", "Aguarde", "A Meta analisa o conteúdo."],
          ["4", "Ative", "Após aprovado, o envio fica automático."],
        ].map(([step, title, description]) => (
          <div key={step} className="rounded-xl border p-3">
            <p className="text-xs font-bold text-primary">{step}</p>
            <p className="mt-1 text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <div className="space-y-1">
          <Label htmlFor="tpl-name">Nome do template</Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tpl-lang">Idioma</Label>
          <Input id="tpl-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-2">
          <Label htmlFor="tpl-body">Texto enviado para aprovação</Label>
          <Textarea
            id="tpl-body"
            className="min-h-44 resize-y"
            maxLength={1024}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use exatamente {"{{1}}"} para o primeiro nome e {"{{2}}"} para o código. O sistema
            também inclui o botão rápido “Começar”. Para mudar um template já aprovado, use um novo
            nome e envie novamente à Meta.
          </p>
          {!validBody && (
            <p className="flex gap-2 text-xs text-destructive">
              <TriangleAlert className="size-4 shrink-0" /> O texto precisa conter {"{{1}}"} e{" "}
              {"{{2}}"}, uma vez cada e nessa ordem.
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-muted/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Sugestão pronta
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {SUGGESTED_META_TEMPLATE_BODY}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setBody(SUGGESTED_META_TEMPLATE_BODY)}
          >
            Usar esta sugestão
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Button size="sm" onClick={() => run("create")} disabled={busy !== null || !validBody}>
          {busy === "create" && <Loader2 className="size-4 animate-spin" />} Enviar template para
          aprovação
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("save")}
          disabled={busy !== null || !validBody}
        >
          {busy === "save" && <Loader2 className="size-4 animate-spin" />} Salvar e verificar status
        </Button>
        <span className="self-center text-xs text-muted-foreground">
          Botão Começar: {state.template.hasButton ? "sim" : "não (usa o código como alternativa)"}
          {state.template.checkedAt &&
            ` · verificado ${new Date(state.template.checkedAt).toLocaleString("pt-BR")}`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Acompanhe os envios em{" "}
        <Link to="/master/onboarding" className="underline">
          Ativação pós-compra
        </Link>
        .
      </p>
    </Card>
  );
}

function templateLabel(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") return "Aprovado";
  if (s === "PENDING") return "Em análise na Meta";
  if (s === "REJECTED") return "Rejeitado";
  if (s === "MISSING") return "Não encontrado na Meta";
  if (s === "INVALID") return "Formato incompatível";
  return "Não verificado";
}
