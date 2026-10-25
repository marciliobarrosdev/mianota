type BookingMarker = { inicio: string; fim?: string; titulo: string; profissional?: string };

export type ReservedBooking = {
  appointment: any;
  customer: any;
  service: any;
  professional: any;
};

type BookingContext = {
  ready: boolean;
  services: any[];
  professionals: any[];
  links: any[];
  catalog: string;
};

export type WhatsappAvailabilitySuggestion = {
  startsAt: string;
  endsAt: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  timezone: string;
  label: string;
};

export type WhatsappAvailabilityResult = {
  relevant: boolean;
  status:
    | "not_requested"
    | "service_required"
    | "service_ambiguous"
    | "professional_ambiguous"
    | "availability_not_configured"
    | "no_slots"
    | "slots";
  serviceName?: string;
  professionalChoiceRequired?: boolean;
  suggestions: WhatsappAvailabilitySuggestion[];
  promptContext: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chooseService(services: any[], requestedTitle: string) {
  const wanted = normalize(requestedTitle);
  const exact = services.filter((service) => normalize(service.name) === wanted);
  return exact.length === 1 ? exact[0] : null;
}

function nameMatches(text: string, name: string) {
  const haystack = ` ${normalize(text)} `;
  const needle = ` ${normalize(name)} `;
  return needle.trim().length > 0 && haystack.includes(needle);
}

function uniqueMostSpecificMatch(rows: any[], text: string) {
  const matches = rows.filter((row) => nameMatches(text, row.name));
  if (matches.length <= 1) return { match: matches[0] || null, ambiguous: false };
  const maxLength = Math.max(...matches.map((row) => normalize(row.name).length));
  const longest = matches.filter((row) => normalize(row.name).length === maxLength);
  return longest.length === 1
    ? { match: longest[0], ambiguous: false }
    : { match: null, ambiguous: true };
}

function professionalCanPerform(links: any[], professionalId: string, serviceId: string) {
  const professionalLinks = links.filter((row) => row.professional_id === professionalId);
  return (
    professionalLinks.length === 0 ||
    professionalLinks.some((row) => row.service_id === serviceId && row.active !== false)
  );
}

export async function loadMarciaBookingContext(
  admin: any,
  companyId: string,
): Promise<BookingContext> {
  const [{ data: services }, { data: professionals }, { data: links }] = await Promise.all([
    admin
      .from("marcia_service")
      .select("id,name,description,duration_minutes,buffer_before_minutes,buffer_after_minutes,price_cents")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("marcia_professional")
      .select("id,name,timezone")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("name", { ascending: true }),
    admin
      .from("marcia_professional_service")
      .select("professional_id,service_id,active")
      .eq("company_id", companyId),
  ]);
  const serviceRows = services || [];
  const professionalRows = professionals || [];
  const linkRows = links || [];
  return {
    ready: serviceRows.length > 0 && professionalRows.length > 0,
    services: serviceRows,
    professionals: professionalRows,
    links: linkRows,
    catalog: serviceRows
      .map((service: any) => {
        const names = professionalRows
          .filter((professional: any) =>
            professionalCanPerform(linkRows, professional.id, service.id),
          )
          .map((professional: any) => professional.name);
        const details = String(service.description || "").trim();
        return `${service.name} (${service.duration_minutes} min)${details ? ` — ${details}` : ""} — profissionais: ${names.join(", ") || "nenhum"}`;
      })
      .join("; "),
  };
}

export function isWhatsappAvailabilityRequest(currentText: string, recentCustomerText = "") {
  const current = normalize(currentText);
  const recent = normalize(recentCustomerText);
  const schedulingWords = /\b(agend\w*|marc\w*|horarios?|dispon\w*|vagas?|quando|atendimento)\b/;
  const dateOrTimeReply =
    /\b(hoje|amanha|depois de amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|manha|tarde|noite|\d{1,2}h(?:\d{2})?)\b/.test(
      current,
    );
  return schedulingWords.test(current) || (dateOrTimeReply && schedulingWords.test(recent));
}

function localParts(date: Date, timezone: string) {
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

function localDateTimeToUtc(
  value: { year: number; month: number; day: number; hour: number; minute: number },
  timezone: string,
) {
  const target = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const seen = localParts(new Date(guess), timezone);
    const represented = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0, 0);
    const correction = target - represented;
    guess += correction;
    if (correction === 0) break;
  }
  const result = new Date(guess);
  const verified = localParts(result, timezone);
  if (
    verified.year !== value.year ||
    verified.month !== value.month ||
    verified.day !== value.day ||
    verified.hour !== value.hour ||
    verified.minute !== value.minute
  )
    return null;
  return result;
}

function isoLocalDate(value: { year: number; month: number; day: number }) {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function addLocalDays(value: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function parseTime(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return { hour, minute };
}

function weekdayOf(value: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(value.year, value.month - 1, value.day)).getUTCDay();
}

function overlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function requestedWeekdays(text: string) {
  const normalized = normalize(text);
  const names: Array<[RegExp, number]> = [
    [/\bdomingo\b/, 0],
    [/\bsegunda(?: feira)?\b/, 1],
    [/\bterca(?: feira)?\b/, 2],
    [/\bquarta(?: feira)?\b/, 3],
    [/\bquinta(?: feira)?\b/, 4],
    [/\bsexta(?: feira)?\b/, 5],
    [/\bsabado\b/, 6],
  ];
  return names.filter(([pattern]) => pattern.test(normalized)).map(([, weekday]) => weekday);
}

function requestedDayOffsets(
  text: string,
  today: { year: number; month: number; day: number },
  days: number,
) {
  const normalized = normalize(text);
  if (/\bdepois de amanha\b/.test(normalized)) return new Set([2]);
  if (/\bamanha\b/.test(normalized)) return new Set([1]);
  if (/\bhoje\b/.test(normalized)) return new Set([0]);

  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (dateMatch) {
    const year = dateMatch[3]
      ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
      : today.year;
    const wanted = `${year}-${String(Number(dateMatch[2])).padStart(2, "0")}-${String(Number(dateMatch[1])).padStart(2, "0")}`;
    for (let offset = 0; offset < days; offset++) {
      if (isoLocalDate(addLocalDays(today, offset)) === wanted) return new Set([offset]);
    }
    return new Set<number>();
  }

  const weekdays = requestedWeekdays(text);
  if (weekdays.length) {
    const matches = new Set<number>();
    for (let offset = 0; offset < days; offset++) {
      if (weekdays.includes(weekdayOf(addLocalDays(today, offset)))) matches.add(offset);
    }
    return matches;
  }
  return null;
}

function requestedMinuteOfDay(text: string) {
  return explicitTimes(text)[0] ?? null;
}

function requestedPeriod(text: string) {
  const normalized = normalize(text);
  if (/\bmanha\b/.test(normalized)) return { from: 6 * 60, to: 12 * 60 };
  if (/\btarde\b/.test(normalized)) return { from: 12 * 60, to: 18 * 60 };
  if (/\bnoite\b/.test(normalized)) return { from: 18 * 60, to: 24 * 60 };
  return null;
}

function formatSlotLabel(start: Date, professionalName: string, timezone: string) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(start);
  return `${date.replace(",", "")} com ${professionalName}`;
}

function availabilityPrompt(
  result: Omit<WhatsappAvailabilityResult, "promptContext">,
  services: any[],
) {
  const catalogNames = services.map((service) => service.name).join(", ");
  if (!result.relevant) return "";
  if (result.status === "not_requested") {
    return "A agenda interna ainda não tem serviço e profissional suficientes para calcular horários. Não invente disponibilidade; diga que a equipe precisa confirmar.";
  }
  if (result.status === "service_required") {
    return `O cliente perguntou sobre agenda, mas não informou um serviço sem ambiguidade. Pergunte qual serviço deseja. Opções exatas: ${catalogNames}. Não invente horários nem emita [AGENDAR].`;
  }
  if (result.status === "service_ambiguous") {
    return `Mais de um serviço do catálogo aparece no pedido. Peça que o cliente escolha um nome exato entre: ${catalogNames}. Não invente horários nem emita [AGENDAR].`;
  }
  if (result.status === "professional_ambiguous") {
    return `O nome do profissional ficou ambíguo. Peça ao cliente que escolha o nome completo antes de oferecer ou confirmar um horário. Não emita [AGENDAR].`;
  }
  if (result.status === "availability_not_configured") {
    return `A agenda do serviço ${result.serviceName} ainda não tem janelas de atendimento configuradas. Diga que vai confirmar os horários com a equipe; não invente opções e não emita [AGENDAR].`;
  }
  if (result.status === "no_slots") {
    return `Não há horário livre encontrado para ${result.serviceName} no período pedido. Informe isso sem inventar disponibilidade e pergunte por outro dia ou período. Não emita [AGENDAR].`;
  }
  return [
    `DISPONIBILIDADE REAL CONSULTADA PARA ${result.serviceName} (fotografia da agenda; ainda não é reserva):`,
    ...result.suggestions.map(
      (slot, index) =>
        `${index + 1}. ${slot.label} — início ${slot.startsAt} — profissional exato: ${slot.professionalName}`,
    ),
    result.professionalChoiceRequired
      ? "Há mais de um profissional possível. Cada opção acima já está vinculada ao nome indicado; não troque nem omita esse nome."
      : "Use o profissional exato informado na opção.",
    "Ofereça somente as opções acima. Elas podem mudar até a reserva atômica.",
    "Se o cliente apenas perguntou disponibilidade, NÃO diga que está agendado e NÃO emita [AGENDAR].",
    "Só emita [AGENDAR] depois que o cliente escrever uma confirmação com dia e hora explícitos. Se ele disser apenas 'a primeira' ou 'pode ser', repita dia e hora e peça a confirmação explícita.",
  ].join("\n");
}

export async function findWhatsappAvailabilitySuggestions(
  admin: any,
  input: {
    companyId: string;
    currentText: string;
    recentCustomerText?: string;
    bookingContext?: BookingContext;
    now?: Date;
    days?: number;
    minimumLeadMinutes?: number;
  },
): Promise<WhatsappAvailabilityResult> {
  const relevant = isWhatsappAvailabilityRequest(input.currentText, input.recentCustomerText || "");
  if (!relevant) {
    return { relevant: false, status: "not_requested", suggestions: [], promptContext: "" };
  }
  const context = input.bookingContext || (await loadMarciaBookingContext(admin, input.companyId));
  const empty = (
    status: WhatsappAvailabilityResult["status"],
    extra: Partial<WhatsappAvailabilityResult> = {},
  ) => {
    const base = { relevant, status, suggestions: [], ...extra } as Omit<
      WhatsappAvailabilityResult,
      "promptContext"
    >;
    return { ...base, promptContext: availabilityPrompt(base, context.services) };
  };
  if (!context.ready) return empty("not_requested");

  const currentServiceSelection = uniqueMostSpecificMatch(context.services, input.currentText);
  const serviceSelection =
    currentServiceSelection.match || currentServiceSelection.ambiguous
      ? currentServiceSelection
      : uniqueMostSpecificMatch(context.services, input.recentCustomerText || "");
  if (serviceSelection.ambiguous) return empty("service_ambiguous");
  const service =
    serviceSelection.match || (context.services.length === 1 ? context.services[0] : null);
  if (!service) return empty("service_required");

  const eligibleProfessionals = context.professionals.filter((professional) =>
    professionalCanPerform(context.links, professional.id, service.id),
  );
  const currentProfessionalSelection = uniqueMostSpecificMatch(
    eligibleProfessionals,
    input.currentText,
  );
  const professionalSelection =
    currentProfessionalSelection.match || currentProfessionalSelection.ambiguous
      ? currentProfessionalSelection
      : uniqueMostSpecificMatch(eligibleProfessionals, input.recentCustomerText || "");
  if (professionalSelection.ambiguous)
    return empty("professional_ambiguous", { serviceName: service.name });
  const professionals = professionalSelection.match
    ? [professionalSelection.match]
    : eligibleProfessionals;
  if (!professionals.length) return empty("no_slots", { serviceName: service.name });

  const now = input.now || new Date();
  const days = Math.max(1, Math.min(30, input.days || 14));
  const rangeStart = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const rangeEnd = new Date(now.getTime() + (days + 2) * 24 * 60 * 60_000).toISOString();
  const professionalIds = professionals.map((professional) => professional.id);
  const [
    { data: rules, error: rulesError },
    { data: blocks, error: blocksError },
    { data: appointments, error: appointmentsError },
  ] = await Promise.all([
    admin
      .from("marcia_availability_rule")
      .select("professional_id,weekday,starts_at,ends_at,valid_from,valid_until")
      .eq("company_id", input.companyId)
      .eq("active", true)
      .in("professional_id", professionalIds),
    admin
      .from("marcia_schedule_block")
      .select("professional_id,starts_at,ends_at")
      .eq("company_id", input.companyId)
      .eq("active", true)
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart),
    admin
      .from("marcia_appointment")
      .select("professional_id,blocked_starts_at,blocked_ends_at,status,hold_expires_at")
      .eq("company_id", input.companyId)
      .eq("occupies_slot", true)
      .lt("blocked_starts_at", rangeEnd)
      .gt("blocked_ends_at", rangeStart),
  ]);
  if (rulesError) throw rulesError;
  if (blocksError) throw blocksError;
  if (appointmentsError) throw appointmentsError;

  const professionalsWithRules = professionals.filter((professional) =>
    (rules || []).some((rule: any) => rule.professional_id === professional.id),
  );
  if (!professionalsWithRules.length) {
    return empty("availability_not_configured", { serviceName: service.name });
  }

  const leadMs = Math.max(0, Math.min(30 * 24 * 60, input.minimumLeadMinutes ?? 120)) * 60_000;
  const notBefore = now.getTime() + leadMs;
  const explicitMinute = requestedMinuteOfDay(input.currentText);
  const period = requestedPeriod(input.currentText);
  const candidates: Array<
    WhatsappAvailabilitySuggestion & { dayOffset: number; minuteOfDay: number }
  > = [];

  for (const professional of professionalsWithRules) {
    const timezone = professional.timezone || "America/Sao_Paulo";
    let today: { year: number; month: number; day: number };
    try {
      today = localParts(now, timezone);
    } catch {
      continue;
    }
    const allowedOffsets = requestedDayOffsets(input.currentText, today, days);
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      if (allowedOffsets && !allowedOffsets.has(dayOffset)) continue;
      const localDate = addLocalDays(today, dayOffset);
      const localDateIso = isoLocalDate(localDate);
      const dayRules = (rules || []).filter(
        (rule: any) =>
          rule.professional_id === professional.id &&
          Number(rule.weekday) === weekdayOf(localDate) &&
          (!rule.valid_from || rule.valid_from <= localDateIso) &&
          (!rule.valid_until || rule.valid_until >= localDateIso),
      );
      for (const rule of dayRules) {
        const ruleStart = parseTime(rule.starts_at);
        const ruleEnd = parseTime(rule.ends_at);
        const ruleStartMinute = ruleStart.hour * 60 + ruleStart.minute;
        const ruleEndMinute = ruleEnd.hour * 60 + ruleEnd.minute;
        for (
          let minute = ruleStartMinute;
          minute + Number(service.duration_minutes) <= ruleEndMinute;
          minute += 30
        ) {
          if (period && (minute < period.from || minute >= period.to)) continue;
          const start = localDateTimeToUtc(
            { ...localDate, hour: Math.floor(minute / 60), minute: minute % 60 },
            timezone,
          );
          if (!start || start.getTime() < notBefore) continue;
          const end = new Date(start.getTime() + Number(service.duration_minutes) * 60_000);
          const blockedStart =
            start.getTime() - Number(service.buffer_before_minutes || 0) * 60_000;
          const blockedEnd = end.getTime() + Number(service.buffer_after_minutes || 0) * 60_000;
          const hasBlock = (blocks || []).some(
            (block: any) =>
              (!block.professional_id || block.professional_id === professional.id) &&
              overlap(
                blockedStart,
                blockedEnd,
                new Date(block.starts_at).getTime(),
                new Date(block.ends_at).getTime(),
              ),
          );
          if (hasBlock) continue;
          const hasAppointment = (appointments || []).some(
            (appointment: any) =>
              appointment.professional_id === professional.id &&
              !(
                appointment.status === "hold" &&
                appointment.hold_expires_at &&
                new Date(appointment.hold_expires_at).getTime() <= now.getTime()
              ) &&
              overlap(
                blockedStart,
                blockedEnd,
                new Date(appointment.blocked_starts_at).getTime(),
                new Date(appointment.blocked_ends_at).getTime(),
              ),
          );
          if (hasAppointment) continue;
          candidates.push({
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            serviceId: service.id,
            serviceName: service.name,
            professionalId: professional.id,
            professionalName: professional.name,
            timezone,
            label: formatSlotLabel(start, professional.name, timezone),
            dayOffset,
            minuteOfDay: minute,
          });
        }
      }
    }
  }

  candidates.sort((a, b) => {
    if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
    if (explicitMinute !== null) {
      const preference =
        Math.abs(a.minuteOfDay - explicitMinute) - Math.abs(b.minuteOfDay - explicitMinute);
      if (preference !== 0) return preference;
    }
    return (
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
      a.professionalName.localeCompare(b.professionalName, "pt-BR")
    );
  });
  const selected: WhatsappAvailabilitySuggestion[] = [];
  const usedStarts = new Set<string>();
  const selectedCandidateKeys = new Set<string>();
  const professionalChoiceRequired =
    !professionalSelection.match && professionalsWithRules.length > 1;
  const orderedCandidates: typeof candidates = [];
  if (professionalChoiceRequired) {
    const rotationUsedStarts = new Set<string>();
    const professionalOrder = professionalsWithRules
      .map((professional) => professional.id)
      .sort((a, b) => {
        const aName =
          professionalsWithRules.find((professional) => professional.id === a)?.name || "";
        const bName =
          professionalsWithRules.find((professional) => professional.id === b)?.name || "";
        return aName.localeCompare(bName, "pt-BR");
      });
    let cursor = 0;
    while (orderedCandidates.length < candidates.length) {
      const professionalId = professionalOrder[cursor % professionalOrder.length];
      const candidate = candidates.find(
        (item) =>
          item.professionalId === professionalId &&
          !selectedCandidateKeys.has(`${item.professionalId}:${item.startsAt}`) &&
          !rotationUsedStarts.has(item.startsAt),
      );
      if (candidate) {
        orderedCandidates.push(candidate);
        selectedCandidateKeys.add(`${candidate.professionalId}:${candidate.startsAt}`);
        rotationUsedStarts.add(candidate.startsAt);
      }
      cursor++;
      if (orderedCandidates.length === 3 || cursor > candidates.length * professionalOrder.length)
        break;
    }
  } else {
    orderedCandidates.push(...candidates);
  }
  for (const candidate of orderedCandidates) {
    if (usedStarts.has(candidate.startsAt)) continue;
    usedStarts.add(candidate.startsAt);
    selected.push({
      startsAt: candidate.startsAt,
      endsAt: candidate.endsAt,
      serviceId: candidate.serviceId,
      serviceName: candidate.serviceName,
      professionalId: candidate.professionalId,
      professionalName: candidate.professionalName,
      timezone: candidate.timezone,
      label: candidate.label,
    });
    if (selected.length === 3) break;
  }
  if (!selected.length) return empty("no_slots", { serviceName: service.name });
  const base: Omit<WhatsappAvailabilityResult, "promptContext"> = {
    relevant: true,
    status: "slots",
    serviceName: service.name,
    professionalChoiceRequired,
    suggestions: selected,
  };
  return { ...base, promptContext: availabilityPrompt(base, context.services) };
}

function explicitTimes(text: string) {
  const result: number[] = [];
  const searchable = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const pattern =
    /\b(?:as|às|pelas?)\s*(\d{1,2})(?:(?:\s*[:h]\s*)([0-5]\d)?)?\b|\b(\d{1,2})\s*h(?:\s*([0-5]\d))?\b|\b(\d{1,2}):([0-5]\d)\b/gi;
  for (const match of searchable.matchAll(pattern)) {
    const hour = Number(match[1] ?? match[3] ?? match[5]);
    const minute = Number(match[2] ?? match[4] ?? match[6] ?? 0);
    if (hour <= 23) result.push(hour * 60 + minute);
  }
  return result;
}

export function bookingMarkerIsExplicitlyConfirmed(
  text: string,
  marker: BookingMarker,
  now = new Date(),
) {
  const normalized = normalize(text);
  const hasIntent =
    /\b(?:quero|gostaria de|pode|vamos)\b.{0,32}\b(?:agend\w*|marc\w*|reserv\w*)\b/.test(
      normalized,
    ) ||
    /\b(?:agende|marque|reserve|confirm\w*|fech\w*|pode ser|sim)\b/.test(normalized) ||
    /\bquero\b.{0,24}\b(?:hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}[/-]\d{1,2})\b/.test(
      normalized,
    );
  if (!hasIntent) return false;

  const start = new Date(marker.inicio);
  if (!Number.isFinite(start.getTime())) return false;
  const markerLocal = localParts(start, "America/Sao_Paulo");
  const markerMinute = markerLocal.hour * 60 + markerLocal.minute;
  if (!explicitTimes(text).includes(markerMinute)) return false;

  const currentLocal = localParts(now, "America/Sao_Paulo");
  const markerDate = isoLocalDate(markerLocal);
  if (/\bdepois de amanha\b/.test(normalized))
    return markerDate === isoLocalDate(addLocalDays(currentLocal, 2));
  if (/\bamanha\b/.test(normalized))
    return markerDate === isoLocalDate(addLocalDays(currentLocal, 1));
  if (/\bhoje\b/.test(normalized)) return markerDate === isoLocalDate(currentLocal);

  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (dateMatch) {
    const year = dateMatch[3]
      ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
      : markerLocal.year;
    return (
      markerDate ===
      `${year}-${String(Number(dateMatch[2])).padStart(2, "0")}-${String(Number(dateMatch[1])).padStart(2, "0")}`
    );
  }
  const weekdays = requestedWeekdays(text);
  return weekdays.length === 1 && weekdays[0] === weekdayOf(markerLocal);
}

export async function reserveWhatsappBooking(
  admin: any,
  input: {
    companyId: string;
    number: string;
    contactName?: string | null;
    whatsappMessageId?: string | null;
    marker: BookingMarker;
  },
): Promise<ReservedBooking> {
  const start = new Date(input.marker.inicio);
  if (!Number.isFinite(start.getTime())) throw new Error("Horário de agendamento inválido.");
  if (start.getTime() < Date.now() - 5 * 60_000) throw new Error("O horário informado já passou.");
  if (start.getTime() > Date.now() + 370 * 24 * 60 * 60_000)
    throw new Error("O horário está distante demais para confirmação automática.");

  const { data: services, error: serviceError } = await admin
    .from("marcia_service")
    .select("id,name,duration_minutes,buffer_before_minutes,buffer_after_minutes,price_cents")
    .eq("company_id", input.companyId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (serviceError) throw serviceError;
  const service = chooseService(services || [], input.marker.titulo);
  if (!service)
    throw new Error("Não consegui identificar com segurança qual serviço deve ser agendado.");

  const digits = input.number.replace(/\D/g, "");
  const phone = digits.startsWith("+") ? digits : `+${digits}`;
  const customerName = input.contactName?.trim() || `Cliente ${digits.slice(-4)}`;
  const { data: existingCustomer, error: existingCustomerError } = await admin
    .from("marcia_customer")
    .select("*")
    .eq("company_id", input.companyId)
    .eq("phone_e164", phone)
    .maybeSingle();
  if (existingCustomerError) throw existingCustomerError;
  let customer = existingCustomer;
  if (!customer) {
    const { data: createdCustomer, error: customerError } = await admin
      .from("marcia_customer")
      .insert({ company_id: input.companyId, phone_e164: phone, name: customerName })
      .select("*")
      .single();
    if (customerError) throw customerError;
    customer = createdCustomer;
  }

  const { data: links, error: linkError } = await admin
    .from("marcia_professional_service")
    .select("professional_id,service_id,active")
    .eq("company_id", input.companyId);
  if (linkError) throw linkError;

  const { data: allProfessionals, error: professionalError } = await admin
    .from("marcia_professional")
    .select("id,name,timezone")
    .eq("company_id", input.companyId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (professionalError) throw professionalError;
  const professionals = (allProfessionals || []).filter((professional: any) =>
    professionalCanPerform(links || [], professional.id, service.id),
  );
  if (!professionals?.length) throw new Error("Nenhum profissional ativo executa esse serviço.");
  let candidates = professionals;
  if (input.marker.profissional) {
    const requestedProfessional = normalize(input.marker.profissional);
    candidates = professionals.filter(
      (professional: any) => normalize(professional.name) === requestedProfessional,
    );
    if (candidates.length !== 1)
      throw new Error("Não consegui identificar o profissional confirmado.");
  } else if (professionals.length !== 1) {
    throw new Error("É necessário confirmar qual profissional fará o atendimento.");
  }

  const idempotencyBase =
    input.whatsappMessageId || `${digits}:${service.id}:${start.toISOString()}`;
  let lastError: any = null;
  for (const professional of candidates) {
    const { data, error } = await admin.rpc("marcia_reserve_appointment", {
      p_company_id: input.companyId,
      p_professional_id: professional.id,
      p_customer_id: customer.id,
      p_service_id: service.id,
      p_starts_at: start.toISOString(),
      p_status: "confirmed",
      p_hold_minutes: 10,
      p_source: "whatsapp",
      p_title: `${service.name} · ${customer.name}`,
      p_notes: `Confirmado automaticamente pelo WhatsApp (${phone}).`,
      p_idempotency_key: `whatsapp:${idempotencyBase}:${professional.id}`.slice(0, 200),
    });
    if (!error) {
      const appointment = Array.isArray(data) ? data[0] : data;
      return { appointment, customer, service, professional };
    }
    lastError = error;
  }
  const detail = String(lastError?.message || "Nenhum profissional está disponível nesse horário.");
  if (/conflito|bloqueado|disponibilidade|overlap/i.test(detail))
    throw new Error("Esse horário não está disponível na agenda.");
  throw lastError || new Error("Nenhum profissional está disponível nesse horário.");
}

export async function notifyWhatsappBookingConfirmed(admin: any, booking: ReservedBooking) {
  try {
    const companyId = booking.appointment.company_id;
    const { data: members } = await admin
      .from("company_user")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("ativo", true);
    if (!members?.length) return;
    const timezone = booking.professional.timezone || "America/Sao_Paulo";
    const when = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(booking.appointment.starts_at));
    const { error } = await admin.from("marcia_notification").insert(
      members.map((member: any) => ({
        company_id: companyId,
        recipient_user_id: member.user_id,
        type: "appointment.confirmed",
        title: "Novo agendamento pelo WhatsApp",
        body: `${booking.customer.name} · ${booking.service.name} · ${when}`,
        entity_type: "appointment",
        entity_id: booking.appointment.id,
        data: { source: "whatsapp" },
      })),
    );
    if (error) throw error;
  } catch (error: any) {
    console.error("[marcia.notification]", error?.message);
  }
}
