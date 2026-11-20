import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { isDeletionConfirmationValid } from "@/lib/whatsapp/support-inbox-rules";
import { Conversation } from "./chat-types";

interface DeleteConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  onConfirm: (confirmation: string) => Promise<void>;
}

export function DeleteConversationDialog({
  open,
  onOpenChange,
  conversation,
  onConfirm,
}: DeleteConversationDialogProps) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!conversation) return null;

  const contactName = conversation.contact_name || "";
  const contactPhone = conversation.phone_e164 || "";
  const isValid = isDeletionConfirmationValid(input, {
    name: contactName,
    phone: contactPhone,
  });

  async function handleConfirm() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(input);
      setInput("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setInput("");
    setSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg">Excluir conversa do painel</DialogTitle>
              <DialogDescription className="text-xs">
                Ação restrita a super-administradores com auditoria.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive-foreground">
            <p className="font-semibold text-destructive">Atenção sobre esta exclusão:</p>
            <ul className="mt-1.5 list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Esta conversa será removida do painel de atendimento (soft-delete).</li>
              <li>O cadastro do assinante e os lançamentos financeiros <strong>não</strong> são afetados.</li>
              <li>As mensagens no aparelho celular do WhatsApp são preservadas.</li>
              <li>Se este contato enviar uma nova mensagem no futuro, ela abrirá um novo atendimento limpo.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-conf" className="text-xs">
              Para confirmar, digite <strong>{contactName || contactPhone || "excluir"}</strong>:
            </Label>
            <Input
              id="delete-conf"
              placeholder={contactName || contactPhone || "excluir"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-mono text-sm"
              disabled={submitting}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!isValid || submitting}
            onClick={handleConfirm}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Excluir conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
