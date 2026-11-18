/** Atalhos para as tarefas mais comuns do Master. */
import { CreditCard, Headphones, MessagesSquare, Plug, Plus, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { QuickAction } from "./overview-parts";

export function QuickActionsCard() {
  return (
  <Card className="bg-[#160b22] p-5 text-white sm:p-6">
    <p className="text-xs font-black uppercase tracking-[.14em] text-violet-300">
      Ações rápidas
    </p>
    <h2 className="mt-2 font-display text-2xl font-black tracking-tight">
      Administre sem procurar.
    </h2>
    <div className="mt-5 space-y-2">
      <QuickAction to="/master/novo-assinante" icon={<Plus className="size-4" />}>
        Cadastrar assinante
      </QuickAction>
      <QuickAction to="/master/planos" icon={<CreditCard className="size-4" />}>
        Editar planos e trial
      </QuickAction>
      <QuickAction to="/master/whatsapp-qr" icon={<Plug className="size-4" />}>
        Conferir integrações
      </QuickAction>
      <QuickAction to="/master/whatsapp-qr" icon={<Headphones className="size-4" />}>
        Conectar WhatsApp do sistema
      </QuickAction>
      <QuickAction to="/master/conversas" icon={<MessagesSquare className="size-4" />}>
        Atender assinantes
      </QuickAction>
      <QuickAction to="/master/configuracoes" icon={<UsersRound className="size-4" />}>
        Gerenciar super admins
      </QuickAction>
    </div>
  </Card>
  );
}
