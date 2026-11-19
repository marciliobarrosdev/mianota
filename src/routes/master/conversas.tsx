import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SubscriberAvatar } from "@/components/master/subscriber-avatar";
import { dayLabel, isNearBottom, startsNewDay } from "@/lib/whatsapp/support-inbox-rules";
import { hasMore } from "@/lib/common/pagination-rules";

type CompanyInfo = {
  nome?: string;
  nome_fantasia?: string;
  email?: string | null;
  logo_url?: string | null;
};
function companyOf(item: { company: CompanyInfo | CompanyInfo[] | null }): CompanyInfo | null {
  return Array.isArray(item.company) ? (item.company[0] ?? null) : item.company;
}

import {
  ArrowDown,
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
  SUPPORT_MESSAGES_PAGE,
  SUPPORT_PAGE,
  getSupportInbox,
  sendSupportReply,
  updateSupportConversation,
} from "@/lib/whatsapp/master-whatsapp.functions";

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
  company: CompanyInfo | CompanyInfo[] | null;
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
  /** Total de conversas no filtro atual (no servidor, não só as carregadas). */
  totalConversations: number;
  counts: { all: number; unread: number; open: number };
  /** Conversa aberta, mesmo quando o filtro a tira da lista. */
  activeConversation: Conversation | null;
  messages: Message[];
  hasOlderMessages: boolean;
}
type Filter = "all" | "unread" | "open" | "resolved";
type InboxParams = { limit: number; messageLimit: number; filter: Filter; search: string };

function SupportInboxPage() {
  const fetchInbox = useServerFn(getSupportInbox);
  const sendReply = useServerFn(sendSupportReply);
  const changeStatus = useServerFn(updateSupportConversation);
  const [data, setData] = useState<InboxData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(SUPPORT_PAGE);
  const [messageLimit, setMessageLimit] = useState(SUPPORT_MESSAGES_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  // Parâmetros atuais da janela: o polling de 8s recarrega exatamente o que está na tela.
  const params = useRef<InboxParams>({ limit, messageLimit, filter, search: debouncedSearch });
  params.current = { limit, messageLimit, filter, search: debouncedSearch };
  // Posição do histórico antes de "Mensagens anteriores", para a tela não pular.
  const olderAnchor = useRef<{ height: number; top: number } | null>(null);
  const autoOpened = useRef(false);

  const load = useCallback(
    async (conversationId = activeId, quiet = false, override: Partial<InboxParams> = {}) => {
      try {
        const query = { ...params.current, ...override };
        const result = await fetchInbox({ data: { conversationId, ...query } });
        setData(result);
        // Abre a primeira conversa só na primeira carga; depois, "voltar" no celular
        // (sem conversa aberta) não pode ser desfeito pelo polling ou por "Carregar mais".
        if (!autoOpened.current && !conversationId && result.conversations.length && !activeId) {
          autoOpened.current = true;
          setActiveId(result.conversations[0].id);
          const first = await fetchInbox({
            data: { ...query, conversationId: result.conversations[0].id },
          });
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
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  // Filtro ou busca novos voltam para a primeira página.
  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    setLimit(SUPPORT_PAGE);
    void load(activeId, true, { limit: SUPPORT_PAGE });
  }, [filter, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    const next = limit + SUPPORT_PAGE;
    setLimit(next);
    setLoadingMore(true);
    await load(activeId, false, { limit: next });
    setLoadingMore(false);
  }

  async function loadOlder() {
    const el = threadRef.current;
    if (el) olderAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
    const next = messageLimit + SUPPORT_MESSAGES_PAGE;
    setMessageLimit(next);
    setLoadingOlder(true);
    await load(activeId, false, { messageLimit: next });
    setLoadingOlder(false);
  }

  const [hasNew, setHasNew] = useState(false);
  const lastActive = useRef<string | null>(null);
  function scrollToBottom() {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    setHasNew(false);
  }
  const messages = (data?.messages ?? []) as Message[];
  const firstMessageId = messages[0]?.id;
  const lastMessageId = messages[messages.length - 1]?.id;
  // Conversa a que as mensagens carregadas pertencem: troca só conta quando elas chegam.
  const threadConversationId = messages[0]?.conversation_id ?? null;
  // Observa a primeira e a última mensagem (não a quantidade): com a janela cheia,
  // uma mensagem nova mantém o total igual, mas muda a última.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) {
      lastActive.current = null; // histórico fechado (celular): reabrir desce até o fim
      return;
    }
    const anchor = olderAnchor.current;
    if (anchor) {
      olderAnchor.current = null;
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
      return;
    }
    const switched = lastActive.current !== threadConversationId;
    lastActive.current = threadConversationId;
    if (switched || isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight, 200)) {
      requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight }));
      setHasNew(false);
    } else setHasNew(true);
  }, [firstMessageId, lastMessageId, threadConversationId, activeId]);

  // A lista já chega filtrada e buscada pelo servidor.
  const conversations = data?.conversations ?? [];
  const active =
    (data?.activeConversation?.id === activeId ? data?.activeConversation : null) ??
    data?.conversations.find((item) => item.id === activeId) ??
    null;

  async function selectConversation(item: Conversation) {
    setActiveId(item.id);
    setMessageLimit(SUPPORT_MESSAGES_PAGE);
    const result = await fetchInbox({
      data: { ...params.current, messageLimit: SUPPORT_MESSAGES_PAGE, conversationId: item.id },
    });
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
          <Stat label="Conversas" value={data.counts.all} />
          <Stat label="Não lidas" value={data.counts.unread} accent />
          <Stat label="Em aberto" value={data.counts.open} />
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

      <section className="grid h-[calc(100dvh-7rem)] min-h-[480px] grid-rows-1 overflow-hidden rounded-[24px] border bg-card shadow-sm lg:grid-cols-[380px_1fr]">
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
            {conversations.length > 0 && (
              <LoadMoreFooter
                shown={conversations.length}
                total={data.totalConversations}
                loading={loadingMore}
                onClick={() => void loadMore()}
              />
            )}
          </div>
        </aside>

        <div className={`${activeId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>
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
                <SubscriberAvatar
                  name={companyName(active) || active.contact_name || active.phone_e164}
                  src={companyOf(active)?.logo_url}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {active.contact_name || formatPhone(active.phone_e164)}
                  </strong>
                  {companyOf(active)?.email && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {companyOf(active)?.email}
                    </span>
                  )}
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
              <div className="relative min-h-0 flex-1">
                <div
                  ref={threadRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight))
                      setHasNew(false);
                  }}
                  className="absolute inset-0 overflow-y-auto overscroll-contain bg-muted/25 p-4 md:p-6"
                >
                  <div className="mx-auto max-w-3xl space-y-3">
                    {data.hasOlderMessages && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingOlder}
                          onClick={() => void loadOlder()}
                        >
                          {loadingOlder && <Loader2 className="size-4 animate-spin" />} Mensagens
                          anteriores
                        </Button>
                      </div>
                    )}
                    {messages.length ? (
                      messages.map((message, index) => (
                        <div key={message.id} className="space-y-3">
                          {startsNewDay(messages[index - 1]?.created_at, message.created_at) && (
                            <div className="flex justify-center pt-2">
                              <span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">
                                {dayLabel(message.created_at)}
                              </span>
                            </div>
                          )}
                          <Bubble message={message} />
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-sm text-muted-foreground">
                        As mensagens desta conversa aparecerão aqui.
                      </div>
                    )}
                  </div>
                </div>
                {hasNew && (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg"
                  >
                    Novas mensagens <ArrowDown className="size-3.5" />
                  </button>
                )}
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
        <SubscriberAvatar
          name={companyName(item) || item.contact_name || item.phone_e164}
          src={companyOf(item)?.logo_url}
          size={40}
        />
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

/** Rodapé da lista: quantas aparecem do total e o botão "Carregar mais". */
function LoadMoreFooter({
  shown,
  total,
  loading,
  onClick,
}: {
  shown: number;
  total: number;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 text-xs text-muted-foreground">
      <span>
        Mostrando {shown} de {total}
      </span>
      {hasMore(shown, total) && (
        <Button variant="outline" size="sm" disabled={loading} onClick={onClick}>
          {loading && <Loader2 className="size-4 animate-spin" />} Carregar mais
        </Button>
      )}
    </div>
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
