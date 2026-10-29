import type { ReactNode } from "react";
import { MiaAvatar } from "./mia-avatar";

/** Moldura de altura fixa para o chat: histórico rola, composer fica no rodapé. */
export function MarciaChatShell({
  assistantName,
  children,
  subtitle = "Assessora financeira · responde na hora",
  actions,
  aside,
}: {
  assistantName: string;
  children: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  /** Painel lateral (ex.: resumo do mês) exibido ao lado do chat em telas largas. */
  aside?: ReactNode;
}) {
  const chat = (
    <section className="mx-auto flex h-[calc(100dvh-15rem)] min-h-[420px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:h-[calc(100dvh-12.5rem)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-gradient-to-r from-[color:var(--brand-soft)] to-transparent px-4 py-2.5">
        <div className="relative size-9 shrink-0">
          <MiaAvatar className="size-9" />
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-[color:var(--brand)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-black">{assistantName}</h1>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
  if (!aside) return chat;
  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {chat}
      <aside className="hidden lg:block">{aside}</aside>
    </div>
  );
}
