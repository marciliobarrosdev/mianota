export const DEFAULT_OPERATION_TIMEZONE = "America/Sao_Paulo";

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function zonedParts(date: Date, timezone = DEFAULT_OPERATION_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function localDateTimeToUtc(
  value: LocalDateTimeParts,
  timezone = DEFAULT_OPERATION_TIMEZONE,
): Date | null {
  const target = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0);
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const seen = zonedParts(new Date(guess), timezone);
    const represented = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0, 0);
    const correction = target - represented;
    guess += correction;
    if (correction === 0) break;
  }
  const result = new Date(guess);
  const verified = zonedParts(result, timezone);
  if (
    verified.year !== value.year ||
    verified.month !== value.month ||
    verified.day !== value.day ||
    verified.hour !== value.hour ||
    verified.minute !== value.minute
  ) return null;
  return result;
}

export function operationLocalInputToIso(
  value: string,
  timezone = DEFAULT_OPERATION_TIMEZONE,
): string | null {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  return localDateTimeToUtc(
    {
      year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
      hour: Number(match[4]), minute: Number(match[5]),
    },
    timezone,
  )?.toISOString() || null;
}

export function isoToOperationLocalInput(
  value: string | Date,
  timezone = DEFAULT_OPERATION_TIMEZONE,
): string {
  const parts = zonedParts(value instanceof Date ? value : new Date(value), timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}
