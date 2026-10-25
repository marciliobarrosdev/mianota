import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CheckCheck,
  Circle,
  Clock3,
  Inbox,
  Loader2,
  MessageCircleMore,
  RefreshCw,
  Search,
  Send,
  Settings2,
  UserRound,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getSupportInbox,
  sendSupportReply,
  updateSupportConversation,
} from "@/lib/master-whatsapp.functions";

export const Route = createFileRoute("/master/conversas")({
  head: brandedRouteHead("Conversas dos assinantes"),
  component: SupportInboxPage,
});

interface Conversation {
  id: string;
  phone_e164: string;
  contact_name: string | null;
  subscriber_company_id: string | null;
  status: "open" | "pending" | "resolved";
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  company:
    { nome?: string; nome_fantasia?: string } | { nome?: string; nome_fantasia?: string }[] | null;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  sender_type: "subscriber" | "owner" | "system";
  message_type: string;
  body: string;
  delivery_status: string;
  created_at: string;
}

interface InboxData {
  channel: { provider: "evolution" | "meta"; status: string; phone: string | null };
  conversations: Conversation[];
  messages: Message[];
}
type Filter = "all" | "unread" | "open" | "resolved";

function SupportInboxPage() {
  const fetchInbox = useServerFn(getSupportInbox);
  const sendReply = useServerFn(sendSupportReply);
  const changeStatus = useServerFn(updateSupportConversation);
  const [data, setData] = useState<InboxData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (conversationId = activeId, quiet = false) => {
      try {
        const result = await fetchInbox({ data: { conversationId } });
        setData(result);
        if (!conversationId && result.conversations.length && !activeId) {
          setActiveId(result.conversations[0].id);
          const first = await fetchInbox({ data: { conversationId: result.conversations[0].id } });
          setData(first);
        }
      } catch (error) {
        if (!quiet)
          toast.error(
            error instanceof Error ? error.message : "Não foi possível sincronizar as conversas.",
          );
      }
    },
    [activeId, fetchInbox],
  );

  useEffect(() => void load(null), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setInterval(() => void load(activeId, true), 8000);
    return () => window.clearInterval(timer);
  }, [activeId, load]);
  useEffect(() => {
    requestAnimationFrame(() =>
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }),
    );
  }, [data?.messages.length, activeId]);

  const conversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.conversations ?? []).filter((item) => {
      const company = companyName(item);
      if (
        query &&
        !`${item.contact_name || ""} ${item.phone_e164} ${company}`.toLowerCase().includes(query)
      )
        return false;
      if (filter === "unread") return Number(item.unread_count) > 0;
      if (filter === "open") return item.status !== "resolved";
      if (filter === "resolved") return item.status === "resolved";
      return true;
    });
  }, [data?.conversations, filter, search]);

  const active = data?.conversations.find((item) => item.id === activeId) ?? null;
  const messages = (data?.messages ?? []) as Message[];

  async function selectConversation(item: Conversation) {
    setActiveId(item.id);
    const result = await fetchInbox({ data: { conversationId: item.id } });
    setData(result);
  }

  async function send() {
    const message = body.trim();
    if (!activeId || !message) return;
    setBusy(true);
    try {
      await sendReply({ data: { conversationId: activeId, body: message } });
      setBody("");
      await load(activeId, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "open" | "pending" | "resolved") {
    if (!activeId) return;
    await changeStatus({ data: { conversationId: activeId, status } });
    toast.success(status === "resolved" ? "Conversa resolvida" : "Status atualizado");
    await load(activeId, true);
  }

  if (!data)
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );

  const connected = data.channel.status === "connected";
  const unread = data.conversations.filter((item) => Number(item.unread_count) > 0).length;
  const open = data.conversations.filter((item) => item.status !== "resolved").length;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 py-4 md:px-6 md:py-7">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary">
            <Inbox className="size-4" /> Atendimento central
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Conversas dos seus assinantes.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mensagens sincronizadas do número oficial do seu SaaS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat label="Conversas" value={data.conversations.length} />
          <Stat label="Não lidas" value={unread} accent />
          <Stat label="Em aberto" value={open} />
          <Button variant="outline" size="sm" onClick={() => load(activeId)}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
      </div>

      {!connected && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center gap-3 text-amber-950">
          <Circle className="size-3 fill-amber-500 text-amber-500" />
          <div className="min-w-0 flex-1">
            <strong className="block text-sm">WhatsApp do sistema desconectado</strong>
            <span className="text-xs opacity-75">
              Conecte por QR Code ou Meta oficial para receber e responder.
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/master/whatsapp-qr">
              <Settings2 className="size-4" /> Configurar canal
            </Link>
          </Button>
        </div>
      )}

      <section className="grid min-h-[690px] overflow-hidden rounded-[24px] border bg-card shadow-sm lg:grid-cols-[380px_1fr]">
        <aside className={`${activeId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r`}>
          <div className="border-b p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, assinante ou telefone"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(
                [
                  ["all", "Todas"],
                  ["unread", "Não lidas"],
                  ["open", "Abertas"],
                  ["resolved", "Resolvidas"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.length ? (
              conversations.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onClick={() => selectConversation(item)}
                />
              ))
            ) : (
              <EmptyList />
            )}
          </div>
        </aside>

        <div className={`${activeId ? "flex" : "hidden lg:flex"} min-w-0 flex-col`}>
          {active ? (
            <>
              <header className="flex min-h-[76px] items-center gap-3 border-b px-4 md:px-5">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="lg:hidden size-9 grid place-items-center rounded-lg hover:bg-muted"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div className="size-10 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">
                  {initials(active.contact_name || active.phone_e164)}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {active.contact_name || formatPhone(active.phone_e164)}
                  </strong>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{formatPhone(active.phone_e164)}</span>
                    {companyName(active) && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" /> {companyName(active)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <StatusPicker status={active.status} onChange={setStatus} />
              </header>
              <div
                ref={threadRef}
                className="min-h-0 flex-1 overflow-y-auto bg-muted/25 p-4 md:p-6"
              >
                <div className="mx-auto max-w-3xl space-y-3">
                  {messages.length ? (
                    messages.map((message) => <Bubble key={message.id} message={message} />)
                  ) : (
                    <div className="py-20 text-center text-sm text-muted-foreground">
                      As mensagens desta conversa aparecerão aqui.
                    </div>
                  )}
                </div>
              </div>
              <footer className="border-t bg-card p-3 md:p-4">
                <div className="mx-auto max-w-3xl">
                  {data.channel.provider === "meta" && (
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Na API oficial, respostas livres respeitam a janela de 24 horas da Meta.
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      placeholder="Escreva sua resposta…"
                      rows={2}
                      className="min-h-[48px] max-h-32 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                    />
                    <Button
                      size="icon"
                      className="size-12 shrink-0 rounded-xl"
                      onClick={send}
                      disabled={busy || !body.trim() || !connected}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="size-20 rounded-3xl bg-primary/10 text-primary grid place-items-center">
                <MessageCircleMore className="size-9" />
              </div>
              <h2 className="font-display text-xl font-bold mt-4">Escolha uma conversa</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Veja o histórico, identifique o assinante assinante, responda e marque o atendimento
                como resolvido.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${accent && value ? "border-primary/30 bg-primary/5" : "bg-card"}`}
    >
      <strong className="text-lg leading-none">{value}</strong>
      <span className="ml-1.5 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ConversationRow({
  item,
  active,
  onClick,
}: {
  item: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-b p-4 text-left transition-colors ${active ? "bg-primary/7" : "hover:bg-muted/50"}`}
    >
      <div className="flex gap-3">
        <div className="size-10 shrink-0 rounded-full bg-muted grid place-items-center text-sm font-bold">
          {initials(item.contact_name || item.phone_e164)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="truncate text-sm">
              {item.contact_name || formatPhone(item.phone_e164)}
            </strong>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {relativeDate(item.last_message_at)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.last_message_preview || "Sem mensagem"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="max-w-[190px] truncate text-[10px] font-medium">
              {companyName(item) || "Assinante não identificado"}
            </Badge>
            {Number(item.unread_count) > 0 && (
              <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                {item.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function Bubble({ message }: { message: Message }) {
  const outgoing = message.direction === "outbound";
  return (
    <div className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${outgoing ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"}`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
        <div
          className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${outgoing ? "text-primary-foreground/65" : "text-muted-foreground"}`}
        >
          <span>
            {new Date(message.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {outgoing && <CheckCheck className="size-3" />}
        </div>
      </div>
    </div>
  );
}

function StatusPicker({
  status,
  onChange,
}: {
  status: string;
  onChange: (status: "open" | "pending" | "resolved") => void;
}) {
  return (
    <select
      value={status}
      onChange={(event) => onChange(event.target.value as "open" | "pending" | "resolved")}
      className="h-9 rounded-lg border bg-background px-2 text-xs font-semibold outline-none"
    >
      <option value="open">Em atendimento</option>
      <option value="pending">Aguardando</option>
      <option value="resolved">Resolvida</option>
    </select>
  );
}

function EmptyList() {
  return (
    <div className="px-6 py-20 text-center">
      <UserRound className="mx-auto size-8 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-semibold">Nenhuma conversa aqui</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Quando um assinante chamar, ele aparece automaticamente.
      </p>
    </div>
  );
}
function companyName(item: Conversation) {
  const company = item.company as unknown as
    { nome?: string; nome_fantasia?: string } | { nome?: string; nome_fantasia?: string }[] | null;
  const row = Array.isArray(company) ? company[0] : company;
  return row?.nome_fantasia || row?.nome || "";
}
function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}
function formatPhone(value: string) {
  const phone = value.replace(/\D/g, "");
  if (phone.length === 13)
    return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
  return `+${phone}`;
}
function relativeDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
