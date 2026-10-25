import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Clock3,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { MarciaAiWorking, PageHeader } from "@/components/marcia/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/auth/realm-supabase";
import { EMAIL_INPUT_PROPS, emailError, normalizeEmail } from "@/lib/masks";
import {
  PHONE_INPUT_PROPS,
  brazilianPhoneError,
  maskBrazilianPhoneInput,
  normalizeValidBrazilianPhone,
} from "@/lib/phone";
import { polishServiceDescription } from "@/lib/service-description.functions";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_cents: number;
  deposit_cents: number;
  color: string;
  active: boolean;
  sort_order: number;
};

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone_e164: string | null;
  color: string;
  timezone: string;
  active: boolean;
};

type ProfessionalService = {
  professional_id: string;
  service_id: string;
  active: boolean;
};

type AvailabilityRule = {
  id: string;
  professional_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
};

type ScheduleRow = AvailabilityRule & { isNew?: boolean };

type ServiceForm = {
  id?: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bufferBefore: string;
  bufferAfter: string;
  color: string;
};

type ProfessionalForm = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  color: string;
  serviceIds: string[];
};

const db = supabase as any;
const control =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const DAYS = [
  { value: 1, short: "SEG", label: "Segunda-feira" },
  { value: 2, short: "TER", label: "Terça-feira" },
  { value: 3, short: "QUA", label: "Quarta-feira" },
  { value: 4, short: "QUI", label: "Quinta-feira" },
  { value: 5, short: "SEX", label: "Sexta-feira" },
  { value: 6, short: "SÁB", label: "Sábado" },
  { value: 0, short: "DOM", label: "Domingo" },
];
const EMPTY_SERVICE: ServiceForm = {
  name: "",
  description: "",
  duration: "60",
  price: "",
  bufferBefore: "0",
  bufferAfter: "0",
  color: "#7C3AED",
};
const EMPTY_PROFESSIONAL: ProfessionalForm = {
  name: "",
  email: "",
  phone: "",
  color: "#7C3AED",
  serviceIds: [],
};

export const Route = createFileRoute("/app/operacao")({
  beforeLoad: () => {
    throw redirect({ to: "/app/agente" });
  },
  head: brandedRouteHead("Operação"),
  component: OperationPage,
});

function OperationPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const companyId = ctx.company!.id;
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [links, setLinks] = useState<ProfessionalService[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);
  const [professionalForm, setProfessionalForm] = useState<ProfessionalForm | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [removedScheduleIds, setRemovedScheduleIds] = useState<string[]>([]);
  const [scheduleDirty, setScheduleDirty] = useState(false);

  const load = useCallback(
    async (notify = false) => {
      setLoading(true);
      setLoadError("");
      try {
        const [serviceResult, professionalResult, linkResult, availabilityResult] =
          await Promise.all([
            db
              .from("marcia_service")
              .select("*")
              .eq("company_id", companyId)
              .order("sort_order")
              .order("name"),
            db
              .from("marcia_professional")
              .select("*")
              .eq("company_id", companyId)
              .order("active", { ascending: false })
              .order("name"),
            db
              .from("marcia_professional_service")
              .select("professional_id,service_id,active")
              .eq("company_id", companyId),
            db
              .from("marcia_availability_rule")
              .select("id,professional_id,weekday,starts_at,ends_at,active")
              .eq("company_id", companyId)
              .order("weekday")
              .order("starts_at"),
          ]);
        const failure = [serviceResult, professionalResult, linkResult, availabilityResult].find(
          (result) => result.error,
        )?.error;
        if (failure) throw failure;

        const nextProfessionals = (professionalResult.data ?? []) as Professional[];
        setServices((serviceResult.data ?? []) as Service[]);
        setProfessionals(nextProfessionals);
        setLinks((linkResult.data ?? []) as ProfessionalService[]);
        setAvailability((availabilityResult.data ?? []) as AvailabilityRule[]);
        setSelectedProfessionalId((current) => {
          if (current && nextProfessionals.some((item) => item.id === current)) return current;
          return (
            nextProfessionals.find((item) => item.active)?.id ?? nextProfessionals[0]?.id ?? ""
          );
        });
        if (notify) toast.success("Operação atualizada.");
      } catch (error) {
        const message = errorMessage(error);
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setScheduleRows(
      availability
        .filter((rule) => rule.professional_id === selectedProfessionalId)
        .map((rule) => ({
          ...rule,
          starts_at: shortTime(rule.starts_at),
          ends_at: shortTime(rule.ends_at),
        })),
    );
    setRemovedScheduleIds([]);
    setScheduleDirty(false);
  }, [availability, selectedProfessionalId]);

  const activeServices = services.filter((item) => item.active).length;
  const activeProfessionals = professionals.filter((item) => item.active).length;
  const selectedProfessional = professionals.find((item) => item.id === selectedProfessionalId);

  async function saveService(form: ServiceForm) {
    if (!form.name.trim()) return toast.error("Informe o nome do serviço.");
    const duration = positiveInt(form.duration, 5);
    const before = positiveInt(form.bufferBefore, 0);
    const after = positiveInt(form.bufferAfter, 0);
    if (duration < 5 || duration > 1440)
      return toast.error("A duração deve ficar entre 5 e 1.440 minutos.");
    if (before > 720 || after > 720)
      return toast.error("O intervalo deve ter no máximo 720 minutos.");

    setBusyKey("service-form");
    try {
      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_minutes: duration,
        buffer_before_minutes: before,
        buffer_after_minutes: after,
        price_cents: moneyToCents(form.price),
        color: form.color,
      };
      const result = form.id
        ? await db
            .from("marcia_service")
            .update(payload)
            .eq("company_id", companyId)
            .eq("id", form.id)
            .select("*")
            .single()
        : await db.from("marcia_service").insert(payload).select("*").single();
      if (result.error) throw result.error;
      const saved = result.data as Service;
      setServices((current) => {
        const next = form.id
          ? current.map((service) => (service.id === saved.id ? saved : service))
          : [...current, saved];
        return next.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      });
      toast.success(form.id ? "Serviço atualizado." : "Serviço criado.");
      setServiceForm(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyKey("");
    }
  }

  async function toggleService(service: Service) {
    setBusyKey(`service-${service.id}`);
    try {
      const { error } = await db
        .from("marcia_service")
        .update({ active: !service.active })
        .eq("company_id", companyId)
        .eq("id", service.id);
      if (error) throw error;
      setServices((current) =>
        current.map((item) =>
          item.id === service.id ? { ...item, active: !service.active } : item,
        ),
      );
      toast.success(service.active ? "Serviço pausado." : "Serviço ativado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyKey("");
    }
  }

  async function saveProfessional(form: ProfessionalForm) {
    if (!form.name.trim()) return toast.error("Informe o nome do profissional.");
    const emailProblem = emailError(form.email, { required: false });
    if (emailProblem) return toast.error(emailProblem);
    const phoneProblem = brazilianPhoneError(form.phone, { required: false });
    if (phoneProblem) return toast.error(phoneProblem);
    setBusyKey("professional-form");
    try {
      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        email: normalizeEmail(form.email) || null,
        phone_e164: normalizeValidBrazilianPhone(form.phone),
        color: form.color,
        timezone: "America/Sao_Paulo",
      };
      let professionalId = form.id;
      let savedProfessional: Professional;
      if (professionalId) {
        const { data, error } = await db
          .from("marcia_professional")
          .update(payload)
          .eq("company_id", companyId)
          .eq("id", professionalId)
          .select("*")
          .single();
        if (error) throw error;
        savedProfessional = data as Professional;
      } else {
        const { data, error } = await db
          .from("marcia_professional")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        professionalId = data.id;
        savedProfessional = data as Professional;
      }

      const resolvedProfessionalId = professionalId!;
      const selected = new Set(form.serviceIds);
      const rows = services.map((service) => ({
        company_id: companyId,
        professional_id: resolvedProfessionalId,
        service_id: service.id,
        active: selected.has(service.id),
      }));
      if (rows.length) {
        const { error } = await db
          .from("marcia_professional_service")
          .upsert(rows, { onConflict: "company_id,professional_id,service_id" });
        if (error) throw error;
      }

      setProfessionals((current) => {
        const next = form.id
          ? current.map((item) => (item.id === resolvedProfessionalId ? savedProfessional : item))
          : [...current, savedProfessional];
        return next.sort(
          (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
        );
      });
      setLinks((current) => [
        ...current.filter((item) => item.professional_id !== resolvedProfessionalId),
        ...rows,
      ]);
      toast.success(form.id ? "Profissional atualizado." : "Profissional adicionado.");
      setProfessionalForm(null);
      setSelectedProfessionalId(resolvedProfessionalId);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyKey("");
    }
  }

  async function toggleProfessional(professional: Professional) {
    setBusyKey(`professional-${professional.id}`);
    try {
      const { error } = await db
        .from("marcia_professional")
        .update({ active: !professional.active })
        .eq("company_id", companyId)
        .eq("id", professional.id);
      if (error) throw error;
      setProfessionals((current) =>
        current.map((item) =>
          item.id === professional.id ? { ...item, active: !professional.active } : item,
        ),
      );
      toast.success(professional.active ? "Profissional pausado." : "Profissional ativado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyKey("");
    }
  }

  function addScheduleRow(weekday: number) {
    const dayRows = scheduleRows.filter((row) => row.weekday === weekday);
    const lastEnd = dayRows.sort((a, b) => a.starts_at.localeCompare(b.starts_at)).at(-1)?.ends_at;
    const startsAt = lastEnd && lastEnd < "22:00" ? lastEnd : "08:00";
    const endsAt = startsAt === "08:00" ? "18:00" : addHour(startsAt);
    setScheduleRows((current) => [
      ...current,
      {
        id: `new-${crypto.randomUUID()}`,
        professional_id: selectedProfessionalId,
        weekday,
        starts_at: startsAt,
        ends_at: endsAt,
        active: true,
        isNew: true,
      },
    ]);
    setScheduleDirty(true);
  }

  function patchScheduleRow(id: string, patch: Partial<ScheduleRow>) {
    setScheduleRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setScheduleDirty(true);
  }

  function removeScheduleRow(row: ScheduleRow) {
    setScheduleRows((current) => current.filter((item) => item.id !== row.id));
    if (!row.isNew) setRemovedScheduleIds((current) => [...current, row.id]);
    setScheduleDirty(true);
  }

  async function saveSchedule() {
    if (!selectedProfessionalId) return toast.error("Selecione um profissional.");
    const validation = validateSchedule(scheduleRows);
    if (validation) return toast.error(validation);
    setBusyKey("schedule");
    try {
      const existing = scheduleRows.filter((row) => !row.isNew);
      const created = scheduleRows.filter((row) => row.isNew);

      const updates = existing.map((row) =>
        db
          .from("marcia_availability_rule")
          .update({
            weekday: row.weekday,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            active: row.active,
          })
          .eq("company_id", companyId)
          .eq("professional_id", selectedProfessionalId)
          .eq("id", row.id),
      );
      const createdMutation = created.length
        ? db.from("marcia_availability_rule").insert(
            created.map((row) => ({
              company_id: companyId,
              professional_id: selectedProfessionalId,
              weekday: row.weekday,
              starts_at: row.starts_at,
              ends_at: row.ends_at,
              active: row.active,
            })),
          )
        : Promise.resolve({ error: null });
      const removedMutation = removedScheduleIds.length
        ? db
            .from("marcia_availability_rule")
            .delete()
            .eq("company_id", companyId)
            .eq("professional_id", selectedProfessionalId)
            .in("id", removedScheduleIds)
        : Promise.resolve({ error: null });

      const mutationResults = await Promise.all([...updates, createdMutation, removedMutation]);
      const mutationError = mutationResults.find((result) => result.error)?.error;
      if (mutationError) throw mutationError;

      const { data: refreshed, error: refreshError } = await db
        .from("marcia_availability_rule")
        .select("id,professional_id,weekday,starts_at,ends_at,active")
        .eq("company_id", companyId)
        .eq("professional_id", selectedProfessionalId)
        .order("weekday")
        .order("starts_at");
      if (refreshError) throw refreshError;
      setAvailability((current) => [
        ...current.filter((row) => row.professional_id !== selectedProfessionalId),
        ...((refreshed ?? []) as AvailabilityRule[]),
      ]);

      toast.success("Horários da semana salvos.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyKey("");
    }
  }

  if (loading && !services.length && !professionals.length) return <OperationSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuração da agenda"
        title="Operação"
        description={`Defina o que você atende, quem realiza cada serviço e em quais horários ${branding.assistantName} pode agendar.`}
        action={
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => void load(true)}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        }
      />

      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Não foi possível carregar a operação.</strong> {loadError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={BriefcaseBusiness}
          value={activeServices}
          label="serviços ativos"
          color="violet"
        />
        <SummaryCard
          icon={UsersRound}
          value={activeProfessionals}
          label="profissionais ativos"
          color="fuchsia"
        />
        <SummaryCard
          icon={CalendarClock}
          value={availability.filter((item) => item.active).length}
          label="turnos configurados"
          color="emerald"
        />
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-1.5 sm:w-[570px]">
          <TabsTrigger
            value="services"
            className="h-10 rounded-xl gap-2 data-[state=active]:text-violet-800"
          >
            <BriefcaseBusiness className="size-4" />{" "}
            <span className="hidden sm:inline">Serviços</span>
          </TabsTrigger>
          <TabsTrigger
            value="professionals"
            className="h-10 rounded-xl gap-2 data-[state=active]:text-violet-800"
          >
            <UsersRound className="size-4" />{" "}
            <span className="hidden sm:inline">Profissionais</span>
          </TabsTrigger>
          <TabsTrigger
            value="availability"
            className="h-10 rounded-xl gap-2 data-[state=active]:text-violet-800"
          >
            <Clock3 className="size-4" /> <span className="hidden sm:inline">Horários</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-0">
          <Panel
            title="Serviços"
            description="Duração, valor e intervalos usados para montar cada horário disponível."
            action={
              <Button
                onClick={() => setServiceForm({ ...EMPTY_SERVICE })}
                className="h-11 rounded-xl bg-violet-700 hover:bg-violet-800"
              >
                <Plus /> Novo serviço
              </Button>
            }
          >
            {services.length === 0 ? (
              <EmptyPanel
                icon={BriefcaseBusiness}
                title="Cadastre o primeiro serviço"
                text={`${branding.assistantName} usa a duração para oferecer horários sem conflito.`}
                action="Criar serviço"
                onAction={() => setServiceForm({ ...EMPTY_SERVICE })}
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {services.map((service) => (
                  <article
                    key={service.id}
                    className={`group rounded-2xl border bg-background/70 p-4 transition hover:border-violet-200 ${service.active ? "border-border" : "border-border opacity-60"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 size-3 shrink-0 rounded-full ring-4 ring-offset-2"
                        style={{ backgroundColor: service.color, color: service.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-display font-extrabold">{service.name}</h3>
                          {!service.active && <Badge variant="secondary">Pausado</Badge>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {service.description || "Sem descrição"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                          <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-violet-700">
                            {service.duration_minutes} min
                          </span>
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
                            {formatMoney(service.price_cents)}
                          </span>
                          {(service.buffer_before_minutes > 0 ||
                            service.buffer_after_minutes > 0) && (
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">
                              {service.buffer_before_minutes + service.buffer_after_minutes} min de
                              intervalo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch
                          checked={service.active}
                          disabled={busyKey === `service-${service.id}`}
                          onCheckedChange={() => void toggleService(service)}
                          aria-label={
                            service.active ? `Pausar ${service.name}` : `Ativar ${service.name}`
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-xl"
                          onClick={() => setServiceForm(serviceToForm(service))}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Editar {service.name}</span>
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="professionals" className="mt-0">
          <Panel
            title="Profissionais"
            description="Vincule os serviços de cada pessoa e pause quem não deve receber novos agendamentos."
            action={
              <Button
                onClick={() => setProfessionalForm({ ...EMPTY_PROFESSIONAL })}
                className="h-11 rounded-xl bg-violet-700 hover:bg-violet-800"
              >
                <Plus /> Novo profissional
              </Button>
            }
          >
            {professionals.length === 0 ? (
              <EmptyPanel
                icon={UserRound}
                title="Adicione quem atende"
                text="Pode ser você ou cada pessoa da sua equipe."
                action="Adicionar profissional"
                onAction={() => setProfessionalForm({ ...EMPTY_PROFESSIONAL })}
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {professionals.map((professional) => {
                  const serviceIds = links
                    .filter((link) => link.professional_id === professional.id && link.active)
                    .map((link) => link.service_id);
                  const linked = services.filter((service) => serviceIds.includes(service.id));
                  return (
                    <article
                      key={professional.id}
                      className={`rounded-2xl border bg-background/70 p-4 transition hover:border-violet-200 ${professional.active ? "border-border" : "border-border opacity-60"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="grid size-11 shrink-0 place-items-center rounded-2xl font-display font-black text-white"
                          style={{ backgroundColor: professional.color }}
                        >
                          {initials(professional.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-display font-extrabold">
                              {professional.name}
                            </h3>
                            {!professional.active && <Badge variant="secondary">Pausado</Badge>}
                          </div>
                          {professional.email && (
                            <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                              <Mail className="size-3" /> {professional.email}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {linked.length ? (
                              linked.map((service) => (
                                <span
                                  key={service.id}
                                  className="rounded-lg border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700"
                                >
                                  {service.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Nenhum serviço vinculado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Switch
                            checked={professional.active}
                            disabled={busyKey === `professional-${professional.id}`}
                            onCheckedChange={() => void toggleProfessional(professional)}
                            aria-label={
                              professional.active
                                ? `Pausar ${professional.name}`
                                : `Ativar ${professional.name}`
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl"
                            onClick={() =>
                              setProfessionalForm(professionalToForm(professional, serviceIds))
                            }
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Editar {professional.name}</span>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="availability" className="mt-0">
          <Panel
            title="Disponibilidade semanal"
            description="Crie um ou mais turnos por dia. Só horários ativos serão oferecidos aos clientes."
          >
            {professionals.length === 0 ? (
              <EmptyPanel
                icon={CalendarClock}
                title="Primeiro, adicione um profissional"
                text="Os horários pertencem à agenda de cada pessoa."
                action="Adicionar profissional"
                onAction={() => setProfessionalForm({ ...EMPTY_PROFESSIONAL })}
              />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4 sm:flex-row sm:items-end sm:justify-between">
                  <label className="block min-w-0 flex-1 space-y-1.5 text-xs font-extrabold uppercase tracking-[.1em] text-violet-700">
                    Agenda de
                    <select
                      className={`${control} max-w-xl normal-case tracking-normal text-foreground`}
                      value={selectedProfessionalId}
                      onChange={(event) => setSelectedProfessionalId(event.target.value)}
                    >
                      {professionals.map((professional) => (
                        <option key={professional.id} value={professional.id}>
                          {professional.name}
                          {professional.active ? "" : " (pausado)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    onClick={() => void saveSchedule()}
                    disabled={!scheduleDirty || busyKey === "schedule"}
                    className="h-11 rounded-xl bg-violet-700 hover:bg-violet-800"
                  >
                    {busyKey === "schedule" ? <Loader2 className="animate-spin" /> : <Save />}{" "}
                    Salvar semana
                  </Button>
                </div>

                {selectedProfessional && !selectedProfessional.active && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    Este profissional está pausado. Os horários ficam salvos, mas não recebem novos
                    agendamentos enquanto ele estiver inativo.
                  </div>
                )}

                <div className="space-y-3">
                  {DAYS.map((day) => {
                    const rows = scheduleRows
                      .filter((row) => row.weekday === day.value)
                      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                    return (
                      <div
                        key={day.value}
                        className="grid gap-3 rounded-2xl border border-border bg-background/65 p-4 lg:grid-cols-[145px_1fr_auto] lg:items-start"
                      >
                        <div className="flex items-center gap-3 lg:pt-2">
                          <div
                            className={`grid size-10 place-items-center rounded-xl text-[11px] font-black ${rows.some((row) => row.active) ? "bg-violet-700 text-white" : "bg-muted text-muted-foreground"}`}
                          >
                            {day.short}
                          </div>
                          <div className="hidden lg:block">
                            <div className="text-xs font-bold">{day.label}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {rows.length
                                ? `${rows.length} turno${rows.length > 1 ? "s" : ""}`
                                : "Fechado"}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {rows.length === 0 ? (
                            <div className="flex min-h-11 items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
                              Nenhum horário neste dia
                            </div>
                          ) : (
                            rows.map((row) => (
                              <div
                                key={row.id}
                                className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 ${row.active ? "border-violet-100 bg-violet-50/50" : "border-border bg-muted/30 opacity-70"}`}
                              >
                                <Switch
                                  checked={row.active}
                                  onCheckedChange={(active) => patchScheduleRow(row.id, { active })}
                                  aria-label={`Ativar turno de ${day.label}`}
                                />
                                <input
                                  type="time"
                                  value={row.starts_at}
                                  onChange={(event) =>
                                    patchScheduleRow(row.id, { starts_at: event.target.value })
                                  }
                                  className="h-9 rounded-lg border border-input bg-white px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-200"
                                  aria-label={`Início em ${day.label}`}
                                />
                                <span className="text-xs text-muted-foreground">até</span>
                                <input
                                  type="time"
                                  value={row.ends_at}
                                  onChange={(event) =>
                                    patchScheduleRow(row.id, { ends_at: event.target.value })
                                  }
                                  className="h-9 rounded-lg border border-input bg-white px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-200"
                                  aria-label={`Fim em ${day.label}`}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="ml-auto size-9 rounded-lg text-muted-foreground hover:text-rose-600"
                                  onClick={() => removeScheduleRow(row)}
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Remover turno</span>
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl lg:mt-1"
                          onClick={() => addScheduleRow(day.value)}
                        >
                          <Plus className="size-3.5" /> Turno
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 rounded-2xl bg-violet-50 p-4 text-xs text-violet-950 sm:flex-row sm:items-center">
                  <Sparkles className="size-4 shrink-0 text-violet-700" />
                  <span>
                    <strong>Dica:</strong> para almoço, crie dois turnos — por exemplo, 08:00–12:00
                    e 13:00–18:00.
                  </span>
                  {scheduleDirty && (
                    <Badge className="sm:ml-auto bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Alterações não salvas
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <ServiceDialog
        companyId={companyId}
        form={serviceForm}
        onChange={setServiceForm}
        onSave={saveService}
        saving={busyKey === "service-form"}
      />
      <ProfessionalDialog
        form={professionalForm}
        services={services}
        onChange={setProfessionalForm}
        onSave={saveProfessional}
        saving={busyKey === "professional-form"}
      />
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-border bg-card shadow-[var(--shadow-card)]">
      <header className="flex flex-col gap-3 border-b border-border bg-gradient-to-r from-white via-white to-violet-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-black tracking-[-.03em]">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof BriefcaseBusiness;
  value: number;
  label: string;
  color: "violet" | "fuchsia" | "emerald";
}) {
  const styles = {
    violet: "from-violet-600 to-violet-500 shadow-violet-200",
    fuchsia: "from-fuchsia-600 to-violet-500 shadow-fuchsia-200",
    emerald: "from-emerald-600 to-teal-500 shadow-emerald-200",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div
        className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${styles[color]}`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-display text-2xl font-black leading-none">{value}</div>
        <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: typeof BriefcaseBusiness;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
          <Icon className="size-5" />
        </div>
        <h3 className="mt-4 font-display text-lg font-black">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        <Button onClick={onAction} className="mt-5 rounded-xl bg-violet-700 hover:bg-violet-800">
          <Plus /> {action}
        </Button>
      </div>
    </div>
  );
}

function ServiceDialog({
  companyId,
  form,
  onChange,
  onSave,
  saving,
}: {
  companyId: string;
  form: ServiceForm | null;
  onChange: (value: ServiceForm | null) => void;
  onSave: (value: ServiceForm) => void;
  saving: boolean;
}) {
  const organizeDescription = useServerFn(polishServiceDescription);
  const [organizing, setOrganizing] = useState(false);
  if (!form) return null;
  const patch = (next: Partial<ServiceForm>) => onChange({ ...form, ...next });

  async function organizeWithAi() {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Informe o nome do serviço.");
    if (form.description.trim().length < 10) {
      return toast.error("Escreva ao menos uma frase sobre o serviço.");
    }
    setOrganizing(true);
    try {
      const result = await organizeDescription({
        data: {
          companyId,
          serviceName: form.name,
          description: form.description,
        },
      });
      patch({ description: result.description });
      toast.success("Descrição organizada para a IA entender o serviço.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setOrganizing(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onChange(null);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] border-violet-200 bg-white p-6 text-[#1d1530] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black">
            {form.id ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>Esses dados definem o espaço reservado na agenda.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
          className="space-y-4"
        >
          <label className="block space-y-1.5 text-sm font-bold">
            Nome
            <Input
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Ex.: Consulta inicial"
              className="h-11 rounded-xl"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5 text-sm font-bold">
            Descrição completa
            <Textarea
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder="Escreva do seu jeito: o que é, o que inclui, para quem serve, preparo necessário e observações importantes. Não invente nada; a IA só vai organizar."
              className="min-h-28 rounded-xl"
            />
          </label>
          <div className="-mt-2 flex flex-col gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-violet-950">
              Esta descrição vira conhecimento da IA durante o atendimento no WhatsApp.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-xl border-violet-200 bg-white text-violet-700"
              onClick={organizeWithAi}
              disabled={organizing || saving}
            >
              {organizing ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {organizing ? "Organizando…" : "Organizar com IA"}
            </Button>
          </div>
          <MarciaAiWorking active={organizing} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-bold">
              Duração (min)
              <Input
                type="number"
                min={5}
                max={1440}
                step={5}
                value={form.duration}
                onChange={(event) => patch({ duration: event.target.value })}
                className="h-11 rounded-xl"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-bold">
              Valor <span className="font-normal text-muted-foreground">(opcional)</span>
              <Input
                value={form.price}
                onChange={(event) => patch({ price: event.target.value })}
                placeholder="0,00"
                inputMode="decimal"
                className="h-11 rounded-xl"
              />
            </label>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[.1em] text-violet-700">
              Intervalo da agenda
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5 text-xs font-bold">
                Antes (min)
                <Input
                  type="number"
                  min={0}
                  max={720}
                  step={5}
                  value={form.bufferBefore}
                  onChange={(event) => patch({ bufferBefore: event.target.value })}
                  className="h-10 rounded-xl bg-white"
                />
              </label>
              <label className="block space-y-1.5 text-xs font-bold">
                Depois (min)
                <Input
                  type="number"
                  min={0}
                  max={720}
                  step={5}
                  value={form.bufferAfter}
                  onChange={(event) => patch({ bufferAfter: event.target.value })}
                  className="h-10 rounded-xl bg-white"
                />
              </label>
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4 text-sm font-bold">
            Cor na agenda
            <input
              type="color"
              value={form.color}
              onChange={(event) => patch({ color: event.target.value })}
              className="size-10 cursor-pointer rounded-lg border-0 bg-transparent"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onChange(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-700 hover:bg-violet-800"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Check />} Salvar serviço
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfessionalDialog({
  form,
  services,
  onChange,
  onSave,
  saving,
}: {
  form: ProfessionalForm | null;
  services: Service[];
  onChange: (value: ProfessionalForm | null) => void;
  onSave: (value: ProfessionalForm) => void;
  saving: boolean;
}) {
  if (!form) return null;
  const currentForm = form;
  const patch = (next: Partial<ProfessionalForm>) => onChange({ ...currentForm, ...next });
  function toggleService(id: string) {
    patch({
      serviceIds: currentForm.serviceIds.includes(id)
        ? currentForm.serviceIds.filter((item) => item !== id)
        : [...currentForm.serviceIds, id],
    });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onChange(null);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] border-violet-200 bg-white p-6 text-[#1d1530] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black">
            {form.id ? "Editar profissional" : "Novo profissional"}
          </DialogTitle>
          <DialogDescription>
            Cadastre quem atende e os serviços que essa pessoa realiza.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
          className="space-y-4"
        >
          <label className="block space-y-1.5 text-sm font-bold">
            Nome
            <Input
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Nome do profissional"
              className="h-11 rounded-xl"
              autoFocus
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-bold">
              E-mail <span className="font-normal text-muted-foreground">(opcional)</span>
              <Input
                {...EMAIL_INPUT_PROPS}
                value={form.email}
                onChange={(event) => patch({ email: event.target.value })}
                onBlur={() => patch({ email: normalizeEmail(form.email) })}
                autoComplete="email"
                placeholder="nome@empresa.com"
                className="h-11 rounded-xl"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-bold">
              WhatsApp <span className="font-normal text-muted-foreground">(opcional)</span>
              <Input
                {...PHONE_INPUT_PROPS}
                value={form.phone}
                onChange={(event) => patch({ phone: maskBrazilianPhoneInput(event.target.value) })}
                className="h-11 rounded-xl"
              />
            </label>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4 text-sm font-bold">
            Cor na agenda
            <input
              type="color"
              value={form.color}
              onChange={(event) => patch({ color: event.target.value })}
              className="size-10 cursor-pointer rounded-lg border-0 bg-transparent"
            />
          </label>
          <fieldset className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
            <legend className="px-1 text-xs font-black uppercase tracking-[.1em] text-violet-700">
              Serviços realizados
            </legend>
            {services.length === 0 ? (
              <p className="py-3 text-xs text-muted-foreground">
                Cadastre serviços para poder vinculá-los.
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {services.map((service) => {
                  const selected = form.serviceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition ${selected ? "border-violet-300 bg-white text-violet-800 shadow-sm" : "border-transparent bg-white/50 text-muted-foreground hover:border-violet-200"}`}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md ${selected ? "bg-violet-700 text-white" : "bg-muted"}`}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="truncate">{service.name}</span>
                      {!service.active && (
                        <span className="ml-auto text-[9px] font-normal">pausado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onChange(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-700 hover:bg-violet-800"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Check />} Salvar profissional
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OperationSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando operação">
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-[430px] animate-pulse rounded-[26px] bg-muted" />
    </div>
  );
}

function serviceToForm(service: Service): ServiceForm {
  return {
    id: service.id,
    name: service.name,
    description: service.description ?? "",
    duration: String(service.duration_minutes),
    price: centsToInput(service.price_cents),
    bufferBefore: String(service.buffer_before_minutes),
    bufferAfter: String(service.buffer_after_minutes),
    color: service.color,
  };
}

function professionalToForm(professional: Professional, serviceIds: string[]): ProfessionalForm {
  return {
    id: professional.id,
    name: professional.name,
    email: professional.email ?? "",
    phone: maskBrazilianPhoneInput(professional.phone_e164),
    color: professional.color,
    serviceIds,
  };
}

function validateSchedule(rows: ScheduleRow[]): string | null {
  for (const row of rows) {
    if (!row.starts_at || !row.ends_at || row.ends_at <= row.starts_at)
      return "O fim de cada turno precisa ser posterior ao início.";
  }
  for (const day of DAYS) {
    const active = rows
      .filter((row) => row.weekday === day.value && row.active)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    for (let index = 1; index < active.length; index += 1) {
      if (active[index].starts_at < active[index - 1].ends_at)
        return `Existem horários sobrepostos em ${day.label.toLowerCase()}.`;
    }
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error)
    return String((error as { message: unknown }).message);
  return "Não foi possível concluir. Tente novamente.";
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function moneyToCents(value: string): number {
  const clean = value.trim().replace(/[^\d,.-]/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function centsToInput(cents: number): string {
  if (!cents) return "";
  return (Number(cents) / 100).toFixed(2).replace(".", ",");
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(cents) / 100,
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function shortTime(value: string): string {
  return value.slice(0, 5);
}

function addHour(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  return `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}`;
}
