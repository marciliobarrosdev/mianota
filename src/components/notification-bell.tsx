import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/lib/auth/realm-supabase";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

export function NotificationBell({ companyId, className }: { companyId?: string | null; className?: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  const { unread, latest } = useUnreadNotifications(companyId, userId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative grid size-9 place-items-center rounded-xl text-muted-foreground hover:text-foreground ${className || ""}`}
          aria-label={unread ? `Notificações: ${unread} não lidas` : "Abrir notificações"}
        >
          <Bell className="size-[17px]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-black leading-[18px] text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-extrabold">
          Avisos {unread > 0 && <span className="text-muted-foreground">· {unread} não lidos</span>}
        </div>
        {latest.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-auto">
            {latest.map((n) => (
              <li key={n.id} className="flex items-start gap-2 px-4 py-3 text-sm">
                {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                <span className={n.read_at ? "text-muted-foreground" : "font-bold"}>{n.title}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/app/notificacoes"
          className="block border-t border-border px-4 py-3 text-center text-sm font-extrabold text-primary hover:bg-muted"
        >
          Ver todos os avisos
        </Link>
      </PopoverContent>
    </Popover>
  );
}
