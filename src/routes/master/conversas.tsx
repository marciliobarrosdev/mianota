import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SubscriberAvatar } from "@/components/master/subscriber-avatar";
import {
  dayLabel,
  formatContactPhone,
  getStatusBadge,
  isNearBottom,
  startsNewDay,
} from "@/lib/whatsapp/support-inbox-rules";
import { hasMore } from "@/lib/common/pagination-rules";
import {
  ArrowDown,
  Building2,
  CheckCircle2,
  Inbox,
  Loader2,
  MessageCircleMore,
  RadioTower,
  RefreshCw,
  Search,
  Settings2,
  User,
  UserRound,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORT_MESSAGES_PAGE,
  SUPPORT_PAGE,
  deleteSupportConversation,
  getSupportInbox,
  resolveSupportConversation,
  returnSupportConversationToQueue,
  sendSupportLocationReply,
  sendSupportMediaReply,
  sendSupportReply,
  takeSupportConversation,
} from "@/lib/whatsapp/master-whatsapp.functions";
import {
  CompanyInfo,
  Conversation,
  Message,
  Operator,
} from "@/components/master/conversas/chat-types";
import { ChatBubble } from "@/components/master/conversas/chat-bubble";
import { ChatInput } from "@/components/master/conversas/chat-input";
import { ConversationHeader } from "@/components/master/conversas/conversation-header";
import {
  ImageLightbox,
  MediaPayload,
  SendLocationDialog,
  SendMediaDialog,
} from "@/components/master/conversas/media-dialogs";
import { DeleteConversationDialog } from "@/components/master/conversas/delete-conversation-dialog";

function companyOf(item: { company: CompanyInfo | CompanyInfo[] | null }): CompanyInfo | null {
  return Array.isArray(item.company) ? (item.company[0] ?? null) : item.company;
}

function companyName(item: Conversation) {
  const comp = companyOf(item);
  return comp?.nome_fantasia || comp?.nome || "";
}

export const Route = createFileRoute("/master/conversas")({
  head: brandedRouteHead("Central de Atendimento WhatsApp"),
  component: SupportInboxPage,
});

interface InboxData {
  channel: {
    provider: "evolution" | "meta";
    activeProvider?: "evolution" | "meta" | null;
    status: string;
    phone: string | null;
    isWhatsmeow?: boolean;
    whatsmeowOnline?: boolean;
    whatsmeowPort?: number;
  };
  conversations: Conversation[];
  totalConversations: number;
  counts: {
    all: number;
    pending: number;
    open: number;
    resolved: number;
    unread: number;
  };
  activeConversation: Conversation | null;
  messages: Message[];
  hasOlderMessages: boolean;
  operator?: Operator;
}

type Filter = "all" | "pending" | "open" | "resolved" | "unread";
type InboxParams = { limit: number; messageLimit: number; filter: Filter; search: string };

function SupportInboxPage() {
  const fetchInbox = useServerFn(getSupportInbox);
  const sendReply = useServerFn(sendSupportReply);
  const sendMedia = useServerFn(sendSupportMediaReply);
  const sendLocation = useServerFn(sendSupportLocationReply);
  const takeConversation = useServerFn(takeSupportConversation);
  const returnToQueue = useServerFn(returnSupportConversationToQueue);
  const resolveConversation = useServerFn(resolveSupportConversation);
  const deleteConversation = useServerFn(deleteSupportConversation);

  const [data, setData] = useState<InboxData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(SUPPORT_PAGE);
  const [messageLimit, setMessageLimit] = useState(SUPPORT_MESSAGES_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  // Mensagem sendo respondida / citada
  const [quotingMessage, setQuotingMessage] = useState<Message | null>(null);

  // Modais de Anexo e Exclusão
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const params = useRef<InboxParams>({ limit, messageLimit, filter, search: debouncedSearch });
  params.current = { limit, messageLimit, filter, search: debouncedSearch };
  const olderAnchor = useRef<{ height: number; top: number } | null>(null);
  const autoOpened = useRef(false);
  const reqSeqRef = useRef(0);

  const load = useCallback(
    async (conversationId = activeId, quiet = false, override: Partial<InboxParams> = {}) => {
      const seq = ++reqSeqRef.current;
      try {
        const query = { ...params.current, ...override };
        const result = (await fetchInbox({
          data: { conversationId, ...query },
        })) as unknown as InboxData;
        if (seq !== reqSeqRef.current) return;
        setData(result);

        if (!autoOpened.current && !conversationId && result.conversations.length && !activeId) {
          autoOpened.current = true;
          setActiveId(result.conversations[0].id);
          const first = (await fetchInbox({
            data: { ...query, conversationId: result.conversations[0].id },
          })) as unknown as InboxData;
          if (seq === reqSeqRef.current) {
            setData(first);
          }
        }
      } catch (error) {
        if (!quiet && seq === reqSeqRef.current)
          toast.error(
            error instanceof Error ? error.message : "Não foi possível sincronizar as conversas.",
          );
      }
    },
    [activeId, fetchInbox],
  );

  useEffect(() => void load(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling em segundo plano a cada 6 segundos para atualização em tempo real
  useEffect(() => {
    const timer = window.setInterval(() => void load(activeId, true), 6000);
    return () => window.clearInterval(timer);
  }, [activeId, load]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

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
  const threadConversationId = messages[0]?.conversation_id ?? null;

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) {
      lastActive.current = null;
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

  const conversations = data?.conversations ?? [];
  const active =
    (data?.activeConversation?.id === activeId ? data?.activeConversation : null) ??
    data?.conversations.find((item) => item.id === activeId) ??
    null;

  async function selectConversation(item: Conversation) {
    const seq = ++reqSeqRef.current;
    setActiveId(item.id);
    setQuotingMessage(null);
    setMessageLimit(SUPPORT_MESSAGES_PAGE);
    try {
      const result = (await fetchInbox({
        data: { ...params.current, messageLimit: SUPPORT_MESSAGES_PAGE, conversationId: item.id },
      })) as unknown as InboxData;
      if (seq === reqSeqRef.current) {
        setData(result);
      }
    } catch (err) {
      if (seq === reqSeqRef.current) {
        toast.error("Erro ao carregar mensagens da conversa.");
      }
    }
  }

  // --- Handlers de Envio ---
  async function handleSendText(body: string, quotedMessageId?: string) {
    if (!activeId) return;
    await sendReply({ data: { conversationId: activeId, body, quotedMessageId } });
    await load(activeId, true);
  }

  async function handleSendVoice(base64Data: string, mimeType: string, quotedMessageId?: string) {
    if (!activeId) return;
    await sendMedia({
      data: {
        conversationId: activeId,
        mediaType: "audio",
        base64Data,
        mimeType,
        quotedMessageId,
      },
    });
    toast.success("Mensagem de voz enviada.");
    await load(activeId, true);
  }

  async function handleSendMedia(payload: MediaPayload) {
    if (!activeId) return;
    await sendMedia({
      data: {
        conversationId: activeId,
        mediaType: payload.mediaType,
        base64Data: payload.base64Data,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
        caption: payload.caption,
        quotedMessageId: quotingMessage?.id,
      },
    });
    setQuotingMessage(null);
    toast.success("Arquivo enviado pelo WhatsApp.");
    await load(activeId, true);
  }

  async function handleSendLocation(loc: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) {
    if (!activeId) return;
    await sendLocation({
      data: {
        conversationId: activeId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name,
        address: loc.address,
        quotedMessageId: quotingMessage?.id,
      },
    });
    setQuotingMessage(null);
    toast.success("Localização enviada.");
    await load(activeId, true);
  }

  // --- Ações de Atendimento ---
  async function handleTake() {
    if (!activeId) return;
    setBusyAction(true);
    try {
      await takeConversation({ data: { conversationId: activeId } });
      toast.success("Você assumiu este atendimento.");
      await load(activeId, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível assumir o atendimento.");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleReturnToQueue() {
    if (!activeId) return;
    setBusyAction(true);
    try {
      await returnToQueue({ data: { conversationId: activeId } });
      toast.success("Conversa devolvida à fila (Aguardando).");
      await load(activeId, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao devolver à fila.");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleResolve() {
    if (!activeId) return;
    setBusyAction(true);
    try {
      await resolveConversation({ data: { conversationId: activeId } });
      toast.success("Atendimento marcado como resolvido.");
      await load(activeId, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao resolver atendimento.");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleDeleteConfirm(confirmation: string) {
    if (!activeId) return;
    try {
      await deleteConversation({ data: { conversationId: activeId, confirmation } });
      toast.success("Conversa excluída do painel.");
      setActiveId(null);
      await load(null, false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir conversa.");
      throw err;
    }
  }

  if (!data)
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );

  const connected =
    data.channel.status === "connected" ||
    Boolean(data.channel.isWhatsmeow && data.channel.whatsmeowOnline);

  return (
    <main className="mx-auto w-full max-w-[1540px] px-3 py-4 md:px-6 md:py-6">
      {/* Top Header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary">
            <Inbox className="size-4" /> Atendimento central WhatsApp
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Conversas dos seus assinantes.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central de atendimento unificada conectada ao microserviço Go nativo (whatsmeow).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Stat label="Todas" value={data.counts.all} />
          <Stat label="Aguardando" value={data.counts.pending} color="amber" />
          <Stat label="Em atendimento" value={data.counts.open} color="blue" />
          <Stat label="Resolvidas" value={data.counts.resolved} color="emerald" />
          <Stat label="Não lidas" value={data.counts.unread} accent />
          <Button variant="outline" size="sm" onClick={() => load(activeId)}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Banner de Status do Microserviço Whatsmeow */}
      {data.channel.isWhatsmeow ? (
        <div className="mb-4 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50/70 via-white to-fuchsia-50/40 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-violet-600 text-white shadow-sm">
                <RadioTower className="size-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">
                    WhatsApp Go (whatsmeow)
                  </h2>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                    <CheckCircle2 className="mr-1 size-3.5" /> Serviço Ativo (Porta 8085)
                  </Badge>
                  {data.channel.phone && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                      +{data.channel.phone}
                    </span>
                  )}
                  {connected && (
                    <Badge
                      variant="outline"
                      className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px]"
                    >
                      Conectado & Sincronizado
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Atendimento em tempo real com suporte a mensagens de voz, imagens, localização,
                  respostas citadas e identificação de LID/PN.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-violet-200 hover:bg-violet-50"
              >
                <Link to="/master/whatsapp-qr">
                  <Settings2 className="size-4" /> Gerenciar Conexão
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Grid Principal do Chat */}
      <section className="grid h-[calc(100dvh-7.5rem)] min-h-[520px] grid-cols-1 grid-rows-1 overflow-hidden rounded-[24px] border bg-card shadow-sm lg:grid-cols-[400px_1fr]">
        {/* Painel Lateral: Lista de Conversas & Filtros */}
        <aside
          className={`${activeId ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-col border-r bg-card`}
        >
          <div className="border-b p-3.5 space-y-2.5 bg-muted/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, número ou atendente…"
                className="pl-9 text-xs"
              />
            </div>
            {/* Abas / Filtros com Contadores */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {(
                [
                  ["all", "Todas", data.counts.all],
                  ["pending", "Aguardando", data.counts.pending],
                  ["open", "Em atendimento", data.counts.open],
                  ["resolved", "Resolvidas", data.counts.resolved],
                  ["unread", "Não lidas", data.counts.unread],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    filter === value
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      filter === value
                        ? "bg-white/20 text-white"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Contatos */}
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/60">
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
              <EmptyList filter={filter} />
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

        {/* Painel Direito: Thread da Conversa Aberta */}
        <div className={`${activeId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col bg-muted/15`}>
          {active ? (
            <>
              {/* Header da conversa ativa */}
              <ConversationHeader
                conversation={active}
                currentOperator={data.operator}
                onBack={() => setActiveId(null)}
                onTake={handleTake}
                onReturnToQueue={handleReturnToQueue}
                onResolve={handleResolve}
                onDeleteClick={() => setDeleteModalOpen(true)}
                busy={busyAction}
              />

              {/* Mensagens do chat */}
              <div className="relative min-h-0 flex-1">
                <div
                  ref={threadRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight))
                      setHasNew(false);
                  }}
                  className="absolute inset-0 overflow-y-auto overscroll-contain p-4 md:p-6"
                >
                  <div className="mx-auto max-w-3xl space-y-3.5">
                    {data.hasOlderMessages && (
                      <div className="flex justify-center pb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingOlder}
                          onClick={() => void loadOlder()}
                          className="h-8 text-xs gap-1.5 rounded-full shadow-xs"
                        >
                          {loadingOlder && <Loader2 className="size-3.5 animate-spin" />} Mensagens
                          anteriores
                        </Button>
                      </div>
                    )}
                    {messages.length ? (
                      messages.map((message, index) => (
                        <div key={message.id} className="space-y-3">
                          {startsNewDay(messages[index - 1]?.created_at, message.created_at) && (
                            <div className="flex justify-center pt-2">
                              <span className="rounded-full bg-card border px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-xs">
                                {dayLabel(message.created_at)}
                              </span>
                            </div>
                          )}
                          <ChatBubble
                            message={message}
                            allMessages={messages}
                            onQuote={(msg) => setQuotingMessage(msg)}
                            onPreviewImage={(url) => setPreviewImageUrl(url)}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center text-sm text-muted-foreground">
                        Nenhuma mensagem encontrada nesta conversa.
                      </div>
                    )}
                  </div>
                </div>

                {hasNew && (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:brightness-110 cursor-pointer transition-all"
                  >
                    Novas mensagens <ArrowDown className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Barra de Envio e Microfone */}
              <ChatInput
                conversationId={active.id}
                connected={connected}
                isMetaProvider={data.channel.provider === "meta"}
                quotingMessage={quotingMessage}
                onClearQuote={() => setQuotingMessage(null)}
                onSendText={handleSendText}
                onSendVoice={handleSendVoice}
                onOpenMediaModal={() => setMediaModalOpen(true)}
                onOpenLocationModal={() => setLocationModalOpen(true)}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-card">
              <div className="size-20 rounded-3xl bg-primary/10 text-primary grid place-items-center">
                <MessageCircleMore className="size-10" />
              </div>
              <h2 className="font-display text-xl font-bold mt-4">Central de Atendimento</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Selecione uma conversa ao lado para responder mensagens, acompanhar o status e
                prestar suporte direto via WhatsApp.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modais de Envio de Arquivos, Localização, Lightbox e Exclusão */}
      <SendMediaDialog
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        onSend={handleSendMedia}
      />

      <SendLocationDialog
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        onSend={handleSendLocation}
      />

      <ImageLightbox
        url={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      <DeleteConversationDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        conversation={active}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  );
}

function Stat({
  label,
  value,
  accent = false,
  color,
}: {
  label: string;
  value: number;
  accent?: boolean;
  color?: "amber" | "blue" | "emerald";
}) {
  const colorClass =
    color === "amber"
      ? "border-amber-300 bg-amber-50/60 text-amber-900"
      : color === "blue"
        ? "border-blue-300 bg-blue-50/60 text-blue-900"
        : color === "emerald"
          ? "border-emerald-300 bg-emerald-50/60 text-emerald-900"
          : accent && value
            ? "border-primary/30 bg-primary/5 text-primary"
            : "bg-card";

  return (
    <div className={`rounded-xl border px-3 py-1.5 shadow-2xs ${colorClass}`}>
      <strong className="text-base leading-none font-bold">{value}</strong>
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
  const company = companyOf(item);
  const compName = companyName(item);
  const statusInfo = getStatusBadge(item.status);
  const phoneFormatted = formatContactPhone(item.phone_e164, item.lid_jid);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-3.5 text-left transition-colors cursor-pointer ${
        active ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/40"
      }`}
    >
      <div className="flex gap-3">
        <SubscriberAvatar
          name={compName || item.contact_name || item.phone_e164}
          src={item.avatar_url || company?.logo_url}
          size={42}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 justify-between">
            <strong className="truncate text-sm font-semibold text-foreground">
              {item.contact_name || phoneFormatted}
            </strong>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {relativeDate(item.last_message_at)}
            </span>
          </div>

          <div className="mt-0.5 text-xs text-muted-foreground truncate">
            {phoneFormatted}
          </div>

          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {item.last_message_preview || "Nenhuma mensagem ainda"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`h-4.5 px-1.5 text-[9px] font-semibold ${statusInfo.className}`}
            >
              {statusInfo.label}
            </Badge>

            {item.assigned_name && (
              <Badge
                variant="secondary"
                className="h-4.5 px-1.5 text-[9px] font-medium text-foreground/80 max-w-[130px] truncate"
              >
                <User className="mr-0.5 size-2.5" /> {item.assigned_name}
              </Badge>
            )}

            {compName && (
              <Badge
                variant="outline"
                className="h-4.5 px-1.5 text-[9px] font-medium max-w-[120px] truncate border-border/80"
              >
                <Building2 className="mr-0.5 size-2.5" /> {compName}
              </Badge>
            )}

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

function EmptyList({ filter }: { filter: string }) {
  const msg =
    filter === "pending"
      ? "Nenhuma conversa aguardando atendimento."
      : filter === "open"
        ? "Nenhuma conversa em atendimento no momento."
        : filter === "resolved"
          ? "Nenhuma conversa resolvida recentemente."
          : filter === "unread"
            ? "Nenhuma conversa com mensagens não lidas."
            : "Nenhuma conversa encontrada.";

  return (
    <div className="px-6 py-20 text-center">
      <UserRound className="mx-auto size-9 text-muted-foreground/35" />
      <p className="mt-3 text-sm font-semibold">{msg}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Quando um cliente entrar em contato pelo WhatsApp, ele aparecerá aqui.
      </p>
    </div>
  );
}

function relativeDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
