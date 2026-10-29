/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/auth/realm-supabase";

export type BellNotification = { id: string; title: string; created_at: string; read_at: string | null };

/** Contador de não lidas + últimos 5 avisos, ao vivo, para o sininho do menu. */
export function useUnreadNotifications(companyId?: string | null, userId?: string | null) {
  const [unread, setUnread] = useState(0);
  const [latest, setLatest] = useState<BellNotification[]>([]);

  const load = useCallback(async () => {
    if (!companyId || !userId) return;
    const base = () =>
      (supabase as any)
        .from("marcia_notification")
        .eq("company_id", companyId)
        .eq("recipient_user_id", userId)
        .is("archived_at", null);
    const [count, list] = await Promise.all([
      base().select("id", { count: "exact", head: true }).is("read_at", null),
      base().select("id,title,created_at,read_at").order("created_at", { ascending: false }).limit(5),
    ]);
    setUnread(count.count || 0);
    setLatest((list.data || []) as BellNotification[]);
  }, [companyId, userId]);

  useEffect(() => {
    void load();
    if (!companyId || !userId) return;
    const channel = supabase
      .channel(`bell:${companyId}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marcia_notification", filter: `company_id=eq.${companyId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, userId, load]);

  return { unread, latest, reload: load };
}
