const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Label for a chat day separator: Hoje, Ontem or dd/mm(/yyyy). */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (dayKey(d) === dayKey(now)) return "Hoje";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (dayKey(d) === dayKey(y)) return "Ontem";
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("pt-BR", opts);
}

/** True when this message starts a new day compared with the previous one. */
export function startsNewDay(prev: string | undefined, current: string): boolean {
  return !prev || dayKey(new Date(prev)) !== dayKey(new Date(current));
}

/** Near the bottom of a scroll area (auto-scroll is safe). */
export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, slack = 80) {
  return scrollHeight - scrollTop - clientHeight <= slack;
}
