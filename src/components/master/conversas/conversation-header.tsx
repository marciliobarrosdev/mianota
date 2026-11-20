import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MoreVertical,
  RotateCcw,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { Conversation, Operator } from "./chat-types";
import { formatContactPhone, getStatusBadge } from "@/lib/whatsapp/support-inbox-rules";
import { SubscriberAvatar } from "@/components/master/subscriber-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationHeaderProps {
  conversation: Conversation;
  currentOperator?: Operator | null;
  onBack: () => void;
  onTake: () => Promise<void>;
  onReturnToQueue: () => Promise<void>;
  onResolve: () => Promise<void>;
  onDeleteClick: () => void;
  busy?: boolean;
}

export function ConversationHeader({
  conversation,
  currentOperator,
  onBack,
  onTake,
  onReturnToQueue,
  onResolve,
  onDeleteClick,
  busy = false,
}: ConversationHeaderProps) {
  const company = Array.isArray(conversation.company)
    ? conversation.company[0]
    : conversation.company;
  const companyName = company?.nome_fantasia || company?.nome || "";
  const phoneFormatted = formatContactPhone(conversation.phone_e164, conversation.lid_jid);
  const statusInfo = getStatusBadge(conversation.status);
  const isAssigned = Boolean(conversation.assigned_to);

  return (
    <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5 md:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden size-9 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"
          title="Voltar para a lista"
        >
          <ArrowLeft className="size-5" />
        </button>

        <SubscriberAvatar
          name={companyName || conversation.contact_name || conversation.phone_e164}
          src={conversation.avatar_url || company?.logo_url}
          size={42}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <strong className="block truncate text-sm font-semibold text-foreground">
              {conversation.contact_name || phoneFormatted}
            </strong>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold ${statusInfo.className}`}
            >
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{phoneFormatted}</span>
            {companyName && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <Building2 className="size-3 shrink-0" /> {companyName}
                </span>
              </>
            )}
            {isAssigned && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <User className="size-3" /> {conversation.assigned_name || "Atendente"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ações de Atendimento */}
      <div className="flex items-center gap-1.5 shrink-0">
        {conversation.status === "pending" && (
          <Button
            size="sm"
            onClick={onTake}
            disabled={busy}
            className="h-8 gap-1.5 bg-primary font-semibold text-xs shadow-xs"
          >
            <UserCheck className="size-3.5" /> Assumir atendimento
          </Button>
        )}

        {conversation.status === "open" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onReturnToQueue}
              disabled={busy}
              className="h-8 gap-1.5 text-xs hover:bg-amber-50 hover:text-amber-900 border-amber-200"
              title="Voltar para a fila de espera geral"
            >
              <RotateCcw className="size-3.5" /> Devolver à fila
            </Button>
            <Button
              size="sm"
              onClick={onResolve}
              disabled={busy}
              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              <CheckCircle2 className="size-3.5" /> Resolver
            </Button>
          </>
        )}

        {conversation.status === "resolved" && (
          <Button
            size="sm"
            variant="outline"
            onClick={onTake}
            disabled={busy}
            className="h-8 gap-1.5 text-xs hover:bg-primary/5"
          >
            <UserCheck className="size-3.5" /> Reabrir atendimento
          </Button>
        )}

        {/* Menu de opções adicionais */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={onDeleteClick}
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" /> Excluir conversa…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
