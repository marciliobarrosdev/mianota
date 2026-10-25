import { supabase } from "@/lib/auth/realm-supabase";

const db = supabase as any;

export type MarciaCustomer = {
  id: string;
  company_id: string;
  name: string;
  phone_e164: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  created_at?: string;
};

export type MarciaProfessional = {
  id: string;
  company_id: string;
  name: string;
  avatar_url?: string | null;
  color?: string | null;
  active: boolean;
};

export type MarciaService = {
  id: string;
  company_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color?: string | null;
  active: boolean;
};

export type AppointmentStatus =
  | "hold"
  | "pending_confirmation"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type MarciaAppointment = {
  id: string;
  company_id: string;
  professional_id: string;
  service_id: string;
  customer_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: string;
  notes?: string | null;
  price_cents?: number | null;
  marcia_customer?: MarciaCustomer | null;
  marcia_professional?: MarciaProfessional | null;
  marcia_service?: MarciaService | null;
};

export type WorkOrderStatus = "draft" | "open" | "in_progress" | "waiting_customer" | "completed" | "cancelled";

export type MarciaWorkOrder = {
  id: string;
  number: number;
  company_id: string;
  appointment_id?: string | null;
  customer_id: string;
  professional_id?: string | null;
  status: WorkOrderStatus;
  summary: string;
  description?: string | null;
  scheduled_at?: string | null;
  total_cents: number;
  created_at: string;
  marcia_customer?: MarciaCustomer | null;
  marcia_professional?: MarciaProfessional | null;
};

export const appointmentLabels: Record<AppointmentStatus, string> = {
  hold: "Reserva temporária",
  pending_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  checked_in: "Cliente chegou",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export const workOrderLabels: Record<WorkOrderStatus, string> = {
  draft: "Rascunho",
  open: "Aberta",
  in_progress: "Em execução",
  waiting_customer: "Aguardando cliente",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export function money(cents?: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

export function shortTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

export function longDate(value: Date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(value);
}

export async function listAppointments(companyId: string, from: Date, to: Date) {
  const { data, error } = await db
    .from("marcia_appointment")
    .select("*, marcia_customer(*), marcia_professional(*), marcia_service(*)")
    .eq("company_id", companyId)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data || []) as MarciaAppointment[];
}

export async function listCustomers(companyId: string) {
  const { data, error } = await db
    .from("marcia_customer")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as MarciaCustomer[];
}

export async function listProfessionals(companyId: string) {
  const { data, error } = await db
    .from("marcia_professional")
    .select("*")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as MarciaProfessional[];
}

export async function listServices(companyId: string) {
  const { data, error } = await db
    .from("marcia_service")
    .select("*")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as MarciaService[];
}

export async function listWorkOrders(companyId: string) {
  const { data, error } = await db
    .from("marcia_work_order")
    .select("*, marcia_customer(*), marcia_professional(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as MarciaWorkOrder[];
}

export async function createCustomer(input: Omit<MarciaCustomer, "id">) {
  const { data, error } = await db.from("marcia_customer").insert(input).select("*").single();
  if (error) throw error;
  return data as MarciaCustomer;
}

export async function reserveAppointment(input: {
  companyId: string;
  professionalId: string;
  customerId: string;
  serviceId: string;
  startsAt: string;
  status?: AppointmentStatus;
  source?: string;
  title?: string;
  notes?: string;
}) {
  const { data, error } = await db.rpc("marcia_reserve_appointment", {
    p_company_id: input.companyId,
    p_professional_id: input.professionalId,
    p_customer_id: input.customerId,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_status: input.status || "confirmed",
    p_hold_minutes: 10,
    p_source: input.source || "manual",
    p_title: input.title || null,
    p_notes: input.notes || null,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) throw error;
  return data as MarciaAppointment;
}

export async function updateAppointmentStatus(companyId: string, id: string, status: AppointmentStatus) {
  const { error } = await db.rpc("marcia_update_appointment_status", {
    p_company_id: companyId,
    p_appointment_id: id,
    p_status: status,
  });
  if (error) throw error;
}

export async function rescheduleAppointment(companyId: string, id: string, startsAt: string) {
  const { data, error } = await db.rpc("marcia_reschedule_appointment", {
    p_company_id: companyId,
    p_appointment_id: id,
    p_starts_at: startsAt,
    p_hold_minutes: null,
  });
  if (error) throw error;
  return data as MarciaAppointment;
}

export async function cancelAppointment(companyId: string, id: string, reason?: string) {
  const { data, error } = await db.rpc("marcia_cancel_appointment", {
    p_company_id: companyId,
    p_appointment_id: id,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
  return data as MarciaAppointment;
}

export async function createWorkOrder(input: {
  companyId: string;
  appointmentId?: string;
  customerId: string;
  professionalId?: string | null;
  summary: string;
  description?: string;
  scheduledAt?: string;
  totalCents?: number;
}) {
  const summary = input.summary.trim();
  if (!summary) throw new Error("Informe o serviço executado.");
  if (summary.length > 240) throw new Error("O resumo da ordem de serviço deve ter até 240 caracteres.");
  if (input.totalCents !== undefined && (!Number.isSafeInteger(input.totalCents) || input.totalCents < 0)) {
    throw new Error("Informe um valor válido para a ordem de serviço.");
  }

  if (input.appointmentId) {
    const { data, error } = await db.rpc("marcia_create_work_order_from_appointment", {
      p_company_id: input.companyId,
      p_appointment_id: input.appointmentId,
    });
    if (error) throw error;
    if (!data?.id) throw new Error("A ordem de serviço não foi criada.");

    // A RPC cria o vínculo e o item-base de forma transacional. Os campos
    // editáveis do formulário precisam ser persistidos em seguida; sem este
    // patch a RPC devolveria silenciosamente os valores do agendamento.
    const patch: Record<string, unknown> = {
      summary,
      description: input.description?.trim() || null,
    };
    if (input.professionalId !== undefined) patch.professional_id = input.professionalId;
    if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt || null;

    const { data: updated, error: updateError } = await db
      .from("marcia_work_order")
      .update(patch)
      .eq("company_id", input.companyId)
      .eq("id", data.id)
      .eq("appointment_id", input.appointmentId)
      .select("*")
      .single();
    if (updateError) throw updateError;
    if (!updated) throw new Error("A ordem de serviço criada não pôde ser atualizada.");

    if (input.totalCents !== undefined) {
      const { data: baseItem, error: itemLookupError } = await db
        .from("marcia_work_order_item")
        .select("id")
        .eq("company_id", input.companyId)
        .eq("work_order_id", data.id)
        .eq("kind", "service")
        .eq("position", 0)
        .limit(1)
        .maybeSingle();
      if (itemLookupError) throw itemLookupError;
      if (!baseItem) throw new Error("O item principal da ordem de serviço não foi encontrado.");

      const { data: pricedItem, error: itemUpdateError } = await db
        .from("marcia_work_order_item")
        .update({ unit_price_cents: input.totalCents })
        .eq("company_id", input.companyId)
        .eq("work_order_id", data.id)
        .eq("id", baseItem.id)
        .select("id")
        .single();
      if (itemUpdateError) throw itemUpdateError;
      if (!pricedItem) throw new Error("O valor da ordem de serviço não foi atualizado.");
    }

    const { data: refreshed, error: refreshError } = await db
      .from("marcia_work_order")
      .select("*")
      .eq("company_id", input.companyId)
      .eq("id", data.id)
      .single();
    if (refreshError) throw refreshError;
    return refreshed as MarciaWorkOrder;
  }
  const { data, error } = await db.from("marcia_work_order").insert({
    company_id: input.companyId,
    appointment_id: input.appointmentId || null,
    customer_id: input.customerId,
    professional_id: input.professionalId || null,
    status: "open",
    summary,
    description: input.description || null,
    scheduled_at: input.scheduledAt || null,
    subtotal_cents: input.totalCents || 0,
    total_cents: input.totalCents || 0,
  }).select("*").single();
  if (error) throw error;
  return data as MarciaWorkOrder;
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "in_progress") patch.started_at = new Date().toISOString();
  if (status === "completed") patch.completed_at = new Date().toISOString();
  const { error } = await db.from("marcia_work_order").update(patch).eq("id", id);
  if (error) throw error;
}

export function friendlyError(error: any) {
  const message = String(error?.message || error || "Não foi possível concluir a ação.");
  if (/overlap|conflit|exclusion|slot/i.test(message)) return "Esse horário acabou de ficar ocupado. Escolha outro horário.";
  if (/row-level security|permission|policy/i.test(message)) return "Você não tem permissão para alterar este item.";
  return message;
}
