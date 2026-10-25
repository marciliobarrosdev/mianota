import { createHash } from "node:crypto";

async function googleCreds() {
  const { resolveIntegration } = await import("./integration-secrets.server");
  return resolveIntegration("google");
}

export function hashGoogleOAuthState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

// Espelha um agendamento interno no Google Agenda usando os tokens da empresa.
// A agenda interna continua sendo a autoridade mesmo quando o Google falha.
export async function createCalendarEventForCompany(
  admin: any,
  companyId: string,
  data: { appointmentId: string; titulo: string; inicio: string; fim: string; descricao?: string },
) {
  const { data: existingSync, error: syncReadError } = await admin
    .from("marcia_sync_record")
    .select("external_id,status")
    .eq("company_id", companyId)
    .eq("provider", "google_calendar")
    .eq("resource_type", "appointment")
    .eq("internal_id", data.appointmentId)
    .maybeSingle();
  if (syncReadError) throw syncReadError;
  const { data: gi, error: integrationError } = await admin
    .from("google_integration")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (integrationError) throw integrationError;
  if (!gi?.conectado) throw new Error("Google Agenda não conectado");

  let accessToken = gi.access_token as string;
  if (gi.expiry && new Date(gi.expiry).getTime() < Date.now() + 60_000 && gi.refresh_token) {
    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: (await googleCreds()).client_id,
        client_secret: (await googleCreds()).client_secret,
        refresh_token: gi.refresh_token as string,
        grant_type: "refresh_token",
      }),
    });
    const tok = await tokRes.json();
    if (!tokRes.ok || !tok.access_token)
      throw new Error("Não foi possível renovar o acesso ao Google Agenda.");
    accessToken = tok.access_token;
    const { error: tokenError } = await admin
      .from("google_integration")
      .update({
        access_token: accessToken,
        expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      })
      .eq("company_id", companyId);
    if (tokenError) throw tokenError;
  }
  if (!accessToken) throw new Error("Google Agenda conectado sem token de acesso válido.");

  const calendarId = gi.calendar_id || "primary";
  const deterministicEventId = data.appointmentId.replace(/-/g, "").toLowerCase();
  const existingEventId = existingSync?.external_id as string | undefined;
  let resolvedEventId = existingEventId || deterministicEventId;
  const eventBody = {
    ...(existingEventId ? {} : { id: deterministicEventId }),
    summary: data.titulo,
    description: data.descricao || "",
    start: { dateTime: data.inicio },
    end: { dateTime: data.fim },
  };
  const endpoint = existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  let res = await fetch(endpoint, {
    method: existingEventId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody),
  });
  if (existingEventId && res.status === 404) {
    resolvedEventId = deterministicEventId;
    res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...eventBody, id: deterministicEventId }),
      },
    );
  }
  if (!res.ok && res.status !== 409) {
    const detail = await res.text().catch(() => "");
    await admin.from("marcia_sync_record").upsert(
      {
        company_id: companyId,
        provider: "google_calendar",
        resource_type: "appointment",
        internal_id: data.appointmentId,
        status: "error",
        last_error: `Google API: ${res.status} ${detail.slice(0, 300)}`,
      },
      { onConflict: "company_id,provider,resource_type,internal_id" },
    );
    throw new Error(`Google API: ${res.status}`);
  }
  const ev =
    res.status === 409 ? { id: resolvedEventId, etag: null, htmlLink: null } : await res.json();

  const { error: syncError } = await admin.from("marcia_sync_record").upsert(
    {
      company_id: companyId,
      provider: "google_calendar",
      resource_type: "appointment",
      internal_id: data.appointmentId,
      external_id: ev.id,
      status: "synced",
      etag: ev.etag || null,
      last_synced_at: new Date().toISOString(),
      last_error: null,
      metadata: { htmlLink: ev.htmlLink || null, calendarId },
    },
    { onConflict: "company_id,provider,resource_type,internal_id" },
  );
  if (syncError) throw syncError;
  return { eventId: ev.id };
}

export async function deleteCalendarEventForCompany(
  admin: any,
  companyId: string,
  appointmentId: string,
) {
  const { data: sync, error: syncReadError } = await admin
    .from("marcia_sync_record")
    .select("id,external_id,status,metadata")
    .eq("company_id", companyId)
    .eq("provider", "google_calendar")
    .eq("resource_type", "appointment")
    .eq("internal_id", appointmentId)
    .maybeSingle();
  if (syncReadError) throw syncReadError;
  if (!sync?.external_id || sync.status === "deleted") return { deleted: false, skipped: true };

  const { data: gi, error: integrationError } = await admin
    .from("google_integration")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (integrationError) throw integrationError;
  if (!gi?.conectado) return { deleted: false, skipped: true };

  let accessToken = gi.access_token as string;
  if (gi.expiry && new Date(gi.expiry).getTime() < Date.now() + 60_000 && gi.refresh_token) {
    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: (await googleCreds()).client_id,
        client_secret: (await googleCreds()).client_secret,
        refresh_token: gi.refresh_token as string,
        grant_type: "refresh_token",
      }),
    });
    const token = await tokRes.json();
    if (!token.access_token) throw new Error("Não foi possível renovar o acesso ao Google Agenda.");
    accessToken = token.access_token;
    const { error: tokenError } = await admin
      .from("google_integration")
      .update({
        access_token: accessToken,
        expiry: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(),
      })
      .eq("company_id", companyId);
    if (tokenError) throw tokenError;
  }

  const calendarId = gi.calendar_id || "primary";
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(sync.external_id)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const detail = await response.text().catch(() => "");
    await admin
      .from("marcia_sync_record")
      .update({
        status: "error",
        last_error: `Google API: ${response.status} ${detail.slice(0, 300)}`,
      })
      .eq("id", sync.id);
    throw new Error(`Google API: ${response.status}`);
  }

  const { error: updateError } = await admin
    .from("marcia_sync_record")
    .update({
      status: "deleted",
      last_synced_at: new Date().toISOString(),
      last_error: null,
      metadata: { ...(sync.metadata || {}), deletedAt: new Date().toISOString() },
    })
    .eq("id", sync.id);
  if (updateError) throw updateError;
  return { deleted: true, skipped: false };
}

// Importa intervalos ocupados do Google como bloqueios globais. Isso mantém a
// agenda local como autoridade sem oferecer horários já ocupados externamente.
export async function syncGoogleBusyBlocks(
  admin: any,
  companyId: string,
  range?: { from: string; to: string },
) {
  const { data: gi, error: integrationError } = await admin
    .from("google_integration")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (integrationError) throw integrationError;
  if (!gi?.conectado) return { synced: 0, skipped: true };

  let accessToken = gi.access_token as string;
  if (gi.expiry && new Date(gi.expiry).getTime() < Date.now() + 60_000 && gi.refresh_token) {
    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: (await googleCreds()).client_id,
        client_secret: (await googleCreds()).client_secret,
        refresh_token: gi.refresh_token as string,
        grant_type: "refresh_token",
      }),
    });
    const tok = await tokRes.json();
    if (!tok.access_token) throw new Error("Não foi possível renovar o acesso ao Google Agenda.");
    accessToken = tok.access_token;
    const { error: tokenError } = await admin
      .from("google_integration")
      .update({
        access_token: accessToken,
        expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      })
      .eq("company_id", companyId);
    if (tokenError) throw tokenError;
  }
  if (!accessToken) throw new Error("Google Agenda conectado sem token de acesso válido.");

  const from = range?.from || new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const to = range?.to || new Date(Date.now() + 90 * 24 * 60 * 60_000).toISOString();
  const calendarId = gi.calendar_id || "primary";
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: from,
      timeMax: to,
      timeZone: "America/Sao_Paulo",
      items: [{ id: calendarId }],
    }),
  });
  if (!response.ok) throw new Error(`Google FreeBusy: ${response.status}`);
  const payload = await response.json();
  const busy = payload?.calendars?.[calendarId]?.busy || payload?.calendars?.primary?.busy || [];

  const intervals = busy
    .filter((interval: any) => interval?.start && interval?.end)
    .map((interval: any) => ({
      start: interval.start,
      end: interval.end,
      key: createHash("sha256")
        .update(`${calendarId}|${interval.start}|${interval.end}`)
        .digest("hex"),
    }));
  const { data: synced, error } = await admin.rpc("marcia_replace_google_busy_blocks", {
    p_company_id: companyId,
    p_range_start: from,
    p_range_end: to,
    p_intervals: intervals,
  });
  if (error) throw error;
  return { synced: Number(synced || 0), skipped: false };
}
