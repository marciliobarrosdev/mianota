import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

/** Moldura de altura fixa para o chat: histórico rola, composer fica no rodapé. */
export function MarciaChatShell({
  assistantName,
  children,
  subtitle = "Assessora financeira · responde na hora",
}: {
  assistantName: string;
  children: ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="mx-auto flex h-[calc(100dvh-15rem)] min-h-[420px] max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:h-[calc(100dvh-12.5rem)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="relative grid size-9 place-items-center rounded-full bg-[color:var(--brand)] text-white">
          <Sparkles className="size-4" />
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-black">{assistantName}</h1>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
