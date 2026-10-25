import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpTip } from "@/components/help-tip";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/auth/realm-supabase";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { brandedRouteHead } from "@/config/brand";
import {
  ArrowLeft,
  ReceiptText,
  LayoutDashboard,
  Hand,
  MessageSquareText,
  Send,
  User,
  Search,
  Bot,
  Star,
} from "lucide-react";
import { sendCsat } from "@/lib/csat.functions";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { sendWhatsappText, setContactIaActive } from "@/lib/evolution.functions";

export const Route = createFileRoute("/app/conversas")({
  head: brandedRouteHead("Conversas"),
  component: ConversasPage,
});

interface Msg {
  id: string;
  numero: string;
  contato_nome: string | null;
  direcao: "entrada" | "saida";
  autor: "ia" | "humano" | "contato";
  texto: string;
  created_at: string;
  user_id: string | null;
}

type Filter = "todas" | "nao_lidas" | "ia_ativa";

const QUICK_REPLIES = [
  "Qual foi o valor?",
  "Isso foi pago no Pix, cartão ou dinheiro?",
  "Quer que eu registre como despesa ou deixe como conta a pagar?",
  "Confira os dados e responda CONFIRMAR para salvar.",
];

function ConversasPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const readOnly = ctx.impersonating === true;

  const sendFn = useServerFn(sendWhatsappText);
  const sendCsatFn = useServerFn(sendCsat);
  const toggleIaFn = useServerFn(setContactIaActive);
  const composerRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<string | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pauses, setPauses] = useState<Record<string, boolean>>({}); // numero → pausado?
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(() => {
    if (typeof window === "undefined") return "todas";
    return (localStorage.getItem("conv:filter") as Filter) || "todas";
  });
  const [active, setActive] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!companyId) return;
    void load(companyId);
    const ch = supabase
      .channel(`tenant:${companyId}:mensagens`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((p) => [m, ...p].slice(0, 500));
          if (m.direcao === "entrada" && m.numero !== activeRef.current) {
            setUnread((u) => ({ ...u, [m.numero]: (u[m.numero] ?? 0) + 1 }));
            try {
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted" &&
                document.visibilityState !== "visible"
              ) {
                new Notification(m.contato_nome ?? m.numero, {
                  body: m.texto?.slice(0, 140) ?? "Nova mensagem",
                  tag: m.numero,
                });
              }
            } catch {}
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_pause",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          void loadPauses(companyId);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [companyId]);

  useEffect(() => {
    if (active) setUnread((u) => ({ ...u, [active]: 0 }));
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    });
  }, [active, msgs.length]);

  useEffect(() => {
    try {
      localStorage.setItem("conv:filter", filter);
    } catch {}
  }, [filter]);

  // Keyboard shortcuts attached after `conversations` is declared (see below).

  async function loadPauses(cid: string) {
    const { data } = await supabase
      .from("contact_pause")
      .select("numero,pausado")
      .eq("company_id", cid);
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => {
      map[r.numero] = !!r.pausado;
    });
    setPauses(map);
  }

  async function load(cid: string) {
    const [{ data: m }, { data: pauseRows }] = await Promise.all([
      supabase
        .from("mensagens")
        .select("*")
        .eq("company_id", cid)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("contact_pause").select("numero,pausado").eq("company_id", cid),
    ]);
    setMsgs((m ?? []) as Msg[]);
    const nextPauses: Record<string, boolean> = {};
    (pauseRows ?? []).forEach((row: any) => {
      nextPauses[row.numero] = !!row.pausado;
    });
    setPauses(nextPauses);
  }

  const conversations = useMemo(() => {
    const map = new Map<string, { numero: string; nome: string | null; last: Msg }>();
    for (const m of msgs) {
      const cur = map.get(m.numero);
      if (!cur) map.set(m.numero, { numero: m.numero, nome: m.contato_nome, last: m });
    }
    let list = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.nome ?? "").toLowerCase().includes(q) || c.numero.includes(q));
    }
    // Filtros
    list = list.filter((c) => {
      const iaAtiva = !(pauses[c.numero] ?? false);
      switch (filter) {
        case "nao_lidas":
          return (unread[c.numero] ?? 0) > 0;
        case "ia_ativa":
          return iaAtiva;
        default:
          return true;
      }
    });
    return list.sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
  }, [msgs, search, filter, unread, pauses]);

  const thread = useMemo(
    () =>
      [...msgs]
        .filter((m) => m.numero === active)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    [msgs, active],
  );

  const activeConv =
    conversations.find((c) => c.numero === active) ??
    (active ? { numero: active, nome: null, last: thread[thread.length - 1] } : null);
  const iaAtivaAqui = active ? !(pauses[active] ?? false) : true;

  // Keyboard shortcuts (after conversations is declared)
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const t = ev.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any).isContentEditable);
      if (typing) return;
      if (ev.key === "j" || ev.key === "k") {
        ev.preventDefault();
        const idx = conversations.findIndex((c) => c.numero === active);
        const next =
          ev.key === "j" ? Math.min(conversations.length - 1, idx + 1) : Math.max(0, idx - 1);
        const target = conversations[next];
        if (target) setActive(target.numero);
      } else if (ev.key === "r" && active) {
        ev.preventDefault();
        composerRef.current?.focus();
      } else if (ev.key === "e" && active) {
        ev.preventDefault();
        void toggleIa(false);
      } else if (ev.key === "/") {
        ev.preventDefault();
        composerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [active, conversations.length]);

  async function toggleIa(v: boolean) {
    if (readOnly) return toast.info("Na implantação, as conversas ficam em modo somente leitura.");
    if (!active) return;
    setPauses((p) => ({ ...p, [active]: !v })); // optimistic
    try {
      await toggleIaFn({ data: { numero: active, ativa: v } });
    } catch (e: any) {
      toast.error(e?.message);
      setPauses((p) => ({ ...p, [active]: v }));
    }
  }

  async function assumir() {
    if (readOnly) return toast.info("Na implantação, as conversas ficam em modo somente leitura.");
    if (!active) return;
    await toggleIa(false);
    toast.success("Você assumiu este atendimento. IA pausada.");
  }

  async function sendMsg(text?: string) {
    if (readOnly) return toast.info("Na implantação, as conversas ficam em modo somente leitura.");
    const txt = (text ?? composer).trim();
    if (!txt || !active || !companyId) return;
    setSending(true);
    try {
      await sendFn({ data: { numero: active, texto: txt, contatoNome: activeConv?.nome ?? null } });
      setComposer("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            Conversas{" "}
            <HelpTip text="Acompanhe as conversas do WhatsApp financeiro e intervenha quando a pessoa precisar de ajuda." />
          </h1>
          <p className="text-sm text-muted-foreground">
            Seu canal financeiro, em tempo real
            {readOnly ? " · visualização segura do master" : ""}
          </p>
        </div>
        <FilterTabs
          value={filter}
          onChange={setFilter}
          counts={{
            nao_lidas: Object.values(unread).reduce((a, b) => a + b, 0),
          }}
        />
      </header>

      <div className="grid md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px] border border-[color:var(--hairline)] rounded-2xl overflow-hidden h-[calc(100vh-200px)] min-h-[500px] bg-[color:var(--panel)]">
        {/* LISTA */}
        <aside
          className={`${active ? "hidden md:flex" : "flex"} border-r border-[color:var(--hairline)] flex-col min-h-0 bg-[color:var(--panel)]`}
        >
          <div className="p-3 border-b border-[color:var(--hairline)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-auto">
            {conversations.length === 0 && (
              <li className="p-8 text-sm text-muted-foreground text-center">
                Nenhuma conversa neste filtro.
              </li>
            )}
            {conversations.map((c) => {
              const on = c.numero === active;
              const u = unread[c.numero] ?? 0;
              const iaAtiva = !(pauses[c.numero] ?? false);
              return (
                <li key={c.numero}>
                  <button
                    onClick={() => setActive(c.numero)}
                    className={`relative w-full text-left flex gap-3 p-3 border-b border-[color:var(--hairline)] transition-colors ${
                      on ? "bg-[color:var(--brand-soft)]" : "hover:bg-[color:var(--panel-2)]"
                    }`}
                  >
                    {on && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--brand)]" />
                    )}
                    <InitialsAvatar name={c.nome || c.numero} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <b className="text-[13.5px] truncate">{c.nome || c.numero}</b>
                        <span className="ml-auto text-[10.5px] text-muted-foreground whitespace-nowrap">
                          {new Date(c.last.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[12.5px] text-muted-foreground truncate flex-1">
                          {c.last.texto}
                        </p>
                        {iaAtiva && (
                          <span title="IA ativa" className="text-[color:var(--brand-text)]">
                            <Bot className="size-3" />
                          </span>
                        )}
                        {u > 0 && (
                          <span className="bg-[color:var(--brand)] text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full grid place-items-center px-1">
                            {u}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* THREAD */}
        <section
          className={`${active ? "flex" : "hidden md:flex"} flex-col min-h-0 bg-[color:var(--panel-2)]`}
        >
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              <div className="text-center">
                <MessageSquareText className="mx-auto mb-2 size-6" />
                Selecione uma conversa
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--hairline)] bg-[color:var(--panel)]">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-[color:var(--panel-2)] md:hidden"
                  aria-label="Voltar para conversas"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <InitialsAvatar name={activeConv?.nome || active} size={38} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{activeConv?.nome || active}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate font-mono">
                    {active}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground font-medium">
                    <Bot className="size-3.5" /> IA ativa
                    <Switch
                      checked={iaAtivaAqui}
                      onCheckedChange={(v) => void toggleIa(v)}
                      disabled={readOnly}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void assumir()}
                    disabled={readOnly}
                  >
                    <Hand className="size-3.5 mr-1" /> Assumir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={readOnly}
                    onClick={async () => {
                      if (!active) return;
                      try {
                        await sendCsatFn({
                          data: { numero: active, contatoNome: activeConv?.nome ?? null },
                        });
                        toast.success("Pesquisa de satisfação enviada");
                      } catch (e: any) {
                        toast.error(e?.message ?? "Erro ao enviar");
                      }
                    }}
                  >
                    <Star className="size-3.5 mr-1" /> CSAT
                  </Button>
                </div>
              </header>

              <div ref={threadRef} className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
                {thread.map((m) => (
                  <Bubble key={m.id} m={m} />
                ))}
              </div>

              {/* Quick replies */}
              <div className="px-4 pt-2 border-t border-[color:var(--hairline)] bg-[color:var(--panel)] flex gap-2 overflow-x-auto">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => void sendMsg(q)}
                    className="shrink-0 text-[12px] px-3 py-1.5 rounded-full bg-[color:var(--panel-2)] hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand-text)] text-muted-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMsg();
                }}
                className="px-4 py-3 border-t border-[color:var(--hairline)] bg-[color:var(--panel)] flex gap-2 items-center relative"
              >
                <input
                  ref={composerRef}
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Digite uma mensagem…"
                  disabled={sending || readOnly}
                  className="flex-1 bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[color:var(--brand)]/60"
                />
                <button
                  type="submit"
                  disabled={sending || readOnly || !composer.trim()}
                  className="size-10 rounded-full grid place-items-center text-primary-foreground bg-[color:var(--brand)] hover:brightness-110 transition disabled:opacity-50"
                  aria-label="Enviar"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </>
          )}
        </section>

        {/* INFO */}
        <aside className="hidden xl:flex flex-col gap-4 border-l border-[color:var(--hairline)] p-5 bg-[color:var(--panel)] overflow-auto">
          {!active ? (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Selecione uma conversa para ver os detalhes.
            </p>
          ) : (
            <>
              <div className="flex flex-col items-center text-center gap-2 pb-4 border-b border-[color:var(--hairline)]">
                <InitialsAvatar name={activeConv?.nome || active} size={72} />
                <div>
                  <div className="font-semibold text-sm">{activeConv?.nome || active}</div>
                  <div className="text-[11.5px] text-muted-foreground font-mono">{active}</div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Próximo passo
                </div>
                <div className="space-y-2">
                  <Link
                    to="/app/movimentacoes"
                    className="flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-violet-50"
                  >
                    <ReceiptText className="size-4 text-violet-700" /> Ver movimentações
                  </Link>
                  <Link
                    to="/app/inicio"
                    className="flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-violet-50"
                  >
                    <LayoutDashboard className="size-4 text-violet-700" /> Abrir visão geral
                  </Link>
                </div>
              </div>
              <div className="mt-auto pt-3 border-t border-[color:var(--hairline)] text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                <User className="size-3" /> {thread.length} mensagens nesta conversa
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: { nao_lidas: number };
}) {
  const opts: { v: Filter; label: string; badge?: number }[] = [
    { v: "todas", label: "Todas" },
    { v: "nao_lidas", label: "Não lidas", badge: counts.nao_lidas },
    { v: "ia_ativa", label: "IA ativa" },
  ];
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-[color:var(--hairline)] bg-[color:var(--panel)] p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            value === o.v
              ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
          {o.badge ? (
            <span className="bg-[color:var(--brand)] text-primary-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] grid place-items-center">
              {o.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  const isOut = m.direcao === "saida";
  const ia = m.autor === "ia";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] sm:max-w-[62%] px-3.5 py-2.5 text-[13.5px] ${
          isOut
            ? "bg-[color:var(--brand)] text-primary-foreground rounded-2xl rounded-br-md font-medium"
            : "bg-[color:var(--panel)] text-foreground rounded-2xl rounded-bl-md border border-[color:var(--hairline)]"
        }`}
      >
        {isOut && (
          <span className="block text-[9.5px] font-bold opacity-80 mb-1 uppercase tracking-wider">
            {ia ? "⚡ Agente IA" : "Atendente"}
          </span>
        )}
        <div className="whitespace-pre-wrap break-words">{m.texto}</div>
        <div className={`text-[10.5px] mt-1 ${isOut ? "opacity-70" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
