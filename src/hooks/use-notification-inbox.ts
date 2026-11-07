/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Estado da Caixa de entrada de avisos do assinante.
 *
 * - Carrega 50 por vez (paginação por `created_at`), sempre do próprio usuário e sem arquivados.
 * - Escuta mudanças em tempo real para refletir avisos novos, lidos ou arquivados em outro aparelho.
 * - Ações (ler, arquivar, excluir, pagar, adiar) gravam primeiro no banco e só então atualizam a tela;
 *   em erro, a tela não muda e o usuário vê um aviso.
 *
 * Tabela `marcia_notification`: nome histórico mantido para preservar os dados existentes.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/auth/realm-supabase";
import {
  NOTICE_COLUMNS,
  NOTICE_PAGE_SIZE,
  postponedDueDate,
  type Notice,
} from "@/lib/finance/notification-center-rules";

const nowIso = () => new Date().toISOString();

export function useNotificationInbox(companyId: string | undefined, userId: string, today: string) {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const query = useCallback(
    () =>
      (supabase as any)
        .from("marcia_notification")
        .select(NOTICE_COLUMNS)
        .eq("company_id", companyId)
        .eq("recipient_user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
    [companyId, userId],
  );

  const load = useCallback(async () => {
    if (!companyId || !userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    const { data, error } = await query().limit(NOTICE_PAGE_SIZE);
    if (error) setLoadError(error.message || "Não foi possível carregar as notificações.");
    else {
      setItems((data || []) as Notice[]);
      setHasMore((data || []).length === NOTICE_PAGE_SIZE);
    }
    setLoading(false);
  }, [companyId, userId, query]);

  const loadMore = useCallback(async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const { data, error } = await query().lt("created_at", last.created_at).limit(NOTICE_PAGE_SIZE);
    if (error) toast.error("Não foi possível carregar mais avisos.");
    else {
      setItems((cur) => [...cur, ...((data || []) as Notice[])]);
      setHasMore((data || []).length === NOTICE_PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [items, query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Tempo real: o filtro do canal é por empresa; avisos de outros membros são ignorados aqui.
  useEffect(() => {
    if (!companyId || !userId) return;
    const channel = supabase
      .channel(`mia:notifications:${companyId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marcia_notification",
          filter: `company_id=eq.${companyId}`,
        },
        (payload: any) => {
          const next = payload.new as Notice | undefined;
          const prev = payload.old as Notice | undefined;
          const row = next?.id ? next : prev;
          if (!row?.id) return;
          if (next?.id && next.recipient_user_id !== userId) return;
          setItems((cur) => {
            if (payload.eventType === "DELETE" || next?.archived_at)
              return cur.filter((i) => i.id !== row.id);
            if (cur.some((i) => i.id === row.id))
              return cur.map((i) => (i.id === row.id ? next! : i));
            return [next!, ...cur];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, userId]);

  const patch = useCallback(
    async (ids: string[], values: Partial<Notice>, okMsg?: string) => {
      if (!companyId || !ids.length) return false;
      const { error } = await (supabase as any)
        .from("marcia_notification")
        .update(values)
        .in("id", ids)
        .eq("company_id", companyId)
        .eq("recipient_user_id", userId);
      if (error) {
        toast.error("Não foi possível atualizar o aviso.");
        return false;
      }
      setItems((cur) =>
        values.archived_at
          ? cur.filter((i) => !ids.includes(i.id))
          : cur.map((i) => (ids.includes(i.id) ? { ...i, ...values } : i)),
      );
      if (okMsg) toast.success(okMsg);
      return true;
    },
    [companyId, userId],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from("marcia_notification")
        .delete()
        .eq("id", id)
        .eq("recipient_user_id", userId);
      if (error) toast.error("Não foi possível excluir o aviso.");
      else setItems((cur) => cur.filter((i) => i.id !== id));
    },
    [userId],
  );

  const markRead = (ids: string[], okMsg?: string) => patch(ids, { read_at: nowIso() }, okMsg);
  const archive = (ids: string[], okMsg?: string) => patch(ids, { archived_at: nowIso() }, okMsg);

  /** Marca a conta do aviso como paga hoje e arquiva o aviso. */
  async function markPaid(n: Notice) {
    if (n.entity_type !== "fin_lancamento" || !n.entity_id) return;
    const { error } = await (supabase as any)
      .from("fin_lancamento")
      .update({ status: "pago", pago_em: today })
      .eq("id", n.entity_id)
      .eq("company_id", companyId);
    if (error) return toast.error("Não foi possível marcar a conta como paga.");
    await patch(
      [n.id],
      { archived_at: nowIso(), read_at: n.read_at || nowIso() },
      "Conta marcada como paga.",
    );
  }

  /** Adia o vencimento em 1 dia (ver `postponedDueDate`) e arquiva o aviso. */
  async function postpone(n: Notice) {
    const due = String(n.data?.dueDate || "");
    if (n.entity_type !== "fin_lancamento" || !n.entity_id || !due) return;
    const next = postponedDueDate(due, today);
    const { error } = await (supabase as any)
      .from("fin_lancamento")
      .update({ vencimento: next, status: "pendente" })
      .eq("id", n.entity_id)
      .eq("company_id", companyId);
    if (error) return toast.error("Não foi possível adiar a conta.");
    await patch(
      [n.id],
      { archived_at: nowIso(), read_at: n.read_at || nowIso() },
      `Vencimento adiado para ${new Date(`${next}T12:00:00`).toLocaleDateString("pt-BR")}.`,
    );
  }

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadError,
    load,
    loadMore,
    markRead,
    archive,
    remove,
    markPaid,
    postpone,
  };
}
