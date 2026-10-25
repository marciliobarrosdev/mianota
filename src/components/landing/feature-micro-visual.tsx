import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  Download,
  MessageCircle,
  Palette,
  RefreshCw,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useBrand } from "@/contexts/brand-context";

export type FeatureMicroVisualKind =
  | "whatsapp"
  | "agenda"
  | "os"
  | "clientes"
  | "notificacoes"
  | "pwa"
  | "google"
  | "ia"
  | "white-label";

type FeatureMicroVisualProps = {
  kind: FeatureMicroVisualKind;
  active: boolean;
};

const transition = "transition-all duration-700 ease-out motion-reduce:transition-none";

function MicroShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-[160px] w-full select-none overflow-hidden rounded-[22px] border border-violet-200/70 bg-gradient-to-br from-white via-[#faf7ff] to-violet-100/70 shadow-[0_18px_42px_-32px_rgba(91,33,182,.7)]"
    >
      <div className="absolute -right-8 -top-10 size-28 rounded-full bg-fuchsia-200/45 blur-2xl" />
      <div className="absolute -bottom-12 -left-8 size-28 rounded-full bg-violet-200/55 blur-2xl" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function WhatsappDemo({ active }: { active: boolean }) {
  return (
    <MicroShell>
      <div className="absolute inset-x-3 top-3 flex items-center gap-2 border-b border-violet-100 pb-2">
        <div className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
          <MessageCircle className="size-3" />
        </div>
        <div>
          <div className="text-[10px] font-black text-[#342443]">Conversa ativa</div>
          <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-600">
            <span className="size-1 rounded-full bg-emerald-500" /> respondendo agora
          </div>
        </div>
      </div>
      <div
        className={`${transition} absolute left-3 top-[52px] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-[9px] font-bold text-[#4f405c] shadow-sm ${active ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-40"}`}
      >
        Tem horário amanhã?
      </div>
      <div
        className={`${transition} absolute right-3 top-[84px] max-w-[78%] rounded-xl rounded-tr-sm bg-emerald-500 px-2.5 py-1.5 text-[9px] font-bold text-white shadow-sm ${active ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
      >
        Tenho 14:30 e 16:00. Qual prefere?
        <CheckCheck className="ml-auto mt-0.5 size-2.5 text-emerald-100" />
      </div>
      <div className="absolute bottom-2.5 left-3 flex gap-0.5 rounded-full bg-white px-2 py-1 shadow-sm">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={`size-1 rounded-full bg-violet-400 ${active ? "animate-pulse" : ""}`}
            style={{ animationDelay: `${dot * 140}ms` }}
          />
        ))}
      </div>
    </MicroShell>
  );
}

function AgendaDemo({ active }: { active: boolean }) {
  const times = ["09:00", "11:30", "14:30"];
  return (
    <MicroShell>
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-[#342443]">
          <span className="grid size-6 place-items-center rounded-lg bg-violet-100 text-violet-700">
            <CalendarDays className="size-3" />
          </span>
          Amanhã · 12 out
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-700">
          2 livres
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 px-3">
        {times.map((time, index) => {
          const selected = index === 2;
          return (
            <div
              key={time}
              className={`${transition} rounded-xl border px-1 py-2 text-center ${selected && active ? "scale-105 border-violet-600 bg-violet-600 text-white shadow-[0_8px_18px_-10px_rgba(91,33,182,.9)]" : "border-violet-100 bg-white text-[#4f405c]"}`}
            >
              <Clock3
                className={`mx-auto size-3 ${selected && active ? "text-violet-200" : "text-violet-500"}`}
              />
              <div className="mt-1 text-[10px] font-black">{time}</div>
              <div
                className={`mt-0.5 text-[7px] font-bold ${selected && active ? "text-violet-100" : "text-[#786785]"}`}
              >
                {selected && active ? "selecionado" : index === 1 ? "ocupado" : "disponível"}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className={`${transition} absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500 px-2.5 py-1 text-[8px] font-black text-white ${active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      >
        <Check className="size-2.5" /> Sem conflito
      </div>
    </MicroShell>
  );
}

function WorkOrderDemo({ active }: { active: boolean }) {
  return (
    <MicroShell>
      <div
        className={`${transition} absolute left-3 top-3 w-[64%] rounded-2xl border border-violet-100 bg-white p-3 shadow-sm ${active ? "-rotate-1" : "rotate-0"}`}
      >
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-violet-100 text-violet-700">
            <ClipboardCheck className="size-3" />
          </span>
          <div>
            <div className="text-[10px] font-black text-[#342443]">OS #0024</div>
            <div className="text-[8px] font-bold text-[#786785]">Limpeza de pele</div>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          {["Cliente vinculado", "Serviço definido", "Horário confirmado"].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-1.5 text-[8px] font-bold text-[#5f506b]"
            >
              <span
                className={`${transition} grid size-3 place-items-center rounded-full ${active || index === 0 ? "bg-emerald-500 text-white" : "bg-violet-100 text-transparent"}`}
              >
                <Check className="size-2" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
      <div
        className={`${transition} absolute right-2 top-[42px] grid size-[58px] place-items-center rounded-full border-2 border-dashed text-center ${active ? "rotate-[-9deg] scale-100 border-emerald-500 bg-emerald-50 text-emerald-700 opacity-100" : "rotate-12 scale-75 border-violet-200 text-violet-300 opacity-45"}`}
      >
        <div>
          <BadgeCheck className="mx-auto size-4" />
          <div className="mt-0.5 text-[8px] font-black uppercase">Pronta</div>
        </div>
      </div>
    </MicroShell>
  );
}

function CustomersDemo({ active }: { active: boolean }) {
  const people = [
    ["AM", "Ana Martins", "2 agendamentos"],
    ["BC", "Bia Costa", "Último: hoje"],
    ["CM", "Caio Melo", "Cliente novo"],
  ];
  return (
    <MicroShell>
      <div className="flex items-center justify-between px-3 pt-3 text-[10px] font-black text-[#342443]">
        <span className="flex items-center gap-2">
          <UserRound className="size-3.5 text-violet-700" /> Clientes
        </span>
        <span className="text-[8px] font-bold text-violet-600">128 contatos</span>
      </div>
      <div className="mt-2 space-y-1.5 px-3">
        {people.map(([initials, name, detail], index) => (
          <div
            key={name}
            className={`${transition} flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-2 py-1.5 shadow-sm ${active ? "translate-x-0 opacity-100" : "translate-x-5 opacity-35"}`}
            style={{ transitionDelay: `${index * 80}ms` }}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-400 text-[8px] font-black text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[9px] font-black text-[#342443]">{name}</span>
              <span className="block text-[7px] font-bold text-[#786785]">{detail}</span>
            </span>
            {index === 0 && active && <ArrowRight className="size-3 text-violet-500" />}
          </div>
        ))}
      </div>
    </MicroShell>
  );
}

function NotificationsDemo({ active }: { active: boolean }) {
  return (
    <MicroShell>
      <div className="absolute left-3 top-3 grid size-10 place-items-center rounded-2xl bg-violet-700 text-white shadow-[0_12px_24px_-14px_rgba(91,33,182,.9)]">
        <BellRing className={`size-4 ${active ? "animate-bounce" : ""}`} />
        <span
          className={`${transition} absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border-2 border-white bg-fuchsia-500 text-[8px] font-black ${active ? "scale-100" : "scale-0"}`}
        >
          3
        </span>
      </div>
      <div className="absolute inset-y-3 left-[62px] right-3 space-y-1.5">
        {[
          ["Agendamento confirmado", "Ana · 14:30", "bg-emerald-500"],
          ["OS pronta para iniciar", "#0024", "bg-violet-500"],
          ["Cliente respondeu", "há 1 min", "bg-fuchsia-500"],
        ].map(([title, detail, color], index) => (
          <div
            key={title}
            className={`${transition} flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-2 py-2 shadow-sm ${active ? "translate-x-0 opacity-100" : "translate-x-6 opacity-20"}`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${color} ${active && index === 0 ? "animate-pulse" : ""}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[8px] font-black text-[#342443]">{title}</span>
              <span className="block text-[7px] font-bold text-[#786785]">{detail}</span>
            </span>
          </div>
        ))}
      </div>
    </MicroShell>
  );
}

function PwaDemo({ active, assistantName }: { active: boolean; assistantName: string }) {
  return (
    <MicroShell>
      <div
        className={`${transition} absolute -bottom-5 left-5 h-[126px] w-[76px] rounded-[20px] border-[4px] border-[#30203e] bg-white p-1.5 shadow-[0_18px_34px_-18px_rgba(50,20,79,.8)] ${active ? "translate-y-0 rotate-[-3deg]" : "translate-y-4 rotate-3"}`}
      >
        <div className="mx-auto mb-2 h-1 w-5 rounded-full bg-[#30203e]/20" />
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white">
          <span className="text-xs font-black italic">M</span>
        </div>
        <div className="mt-2 h-1.5 w-10 rounded-full bg-violet-100" />
        <div className="mt-1 h-1.5 w-7 rounded-full bg-violet-100" />
        <div className="mt-3 grid grid-cols-2 gap-1">
          <span className="h-5 rounded bg-violet-100" />
          <span className="h-5 rounded bg-emerald-100" />
        </div>
      </div>
      <div className="absolute left-[104px] right-3 top-5">
        <div className="flex items-center gap-2 text-[10px] font-black text-[#342443]">
          <Smartphone className="size-3.5 text-violet-700" /> No seu celular
        </div>
        <p className="mt-2 text-[8px] font-bold leading-3.5 text-[#655571]">
          Ícone na tela inicial e acesso em tela cheia.
        </p>
        <div
          className={`${transition} mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-2 py-2 text-[9px] font-black text-white shadow-lg ${active ? "scale-100 opacity-100" : "scale-90 opacity-45"}`}
        >
          <Download className={`size-3 ${active ? "animate-bounce" : ""}`} /> Instalar{" "}
          {assistantName}
        </div>
      </div>
    </MicroShell>
  );
}

function GoogleDemo({ active }: { active: boolean }) {
  return (
    <MicroShell>
      <div className="absolute left-3 top-3 w-[100px] rounded-2xl border border-violet-100 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-1 text-[8px] font-black text-[#342443]">
          <CalendarDays className="size-3 text-violet-600" /> Agenda interna
        </div>
        <div className="mt-2 space-y-1">
          <div className="rounded-md bg-violet-600 px-1.5 py-1 text-[7px] font-bold text-white">
            14:30 · Ana
          </div>
          <div className="rounded-md bg-violet-100 px-1.5 py-1 text-[7px] font-bold text-violet-700">
            16:00 · Livre
          </div>
        </div>
      </div>
      <div
        className={`${transition} absolute left-1/2 top-1/2 z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#faf7ff] bg-emerald-500 text-white shadow-lg ${active ? "rotate-180 scale-100" : "rotate-0 scale-75"}`}
      >
        <RefreshCw className="size-3.5" />
      </div>
      <div className="absolute right-3 top-3 w-[100px] rounded-2xl border border-violet-100 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-1 text-[8px] font-black text-[#342443]">
          <span className="grid size-3 place-items-center rounded-sm bg-blue-500 text-[7px] text-white">
            G
          </span>{" "}
          Google
        </div>
        <div className="mt-2 space-y-1">
          <div
            className={`${transition} rounded-md bg-blue-500 px-1.5 py-1 text-[7px] font-bold text-white ${active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          >
            14:30 · Ana
          </div>
          <div className="rounded-md bg-blue-50 px-1.5 py-1 text-[7px] font-bold text-blue-600">
            Sincronizado
          </div>
        </div>
      </div>
      <div
        className={`${transition} absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-700 ${active ? "opacity-100" : "opacity-0"}`}
      >
        Atualizado agora
      </div>
    </MicroShell>
  );
}

function AiDemo({ active, assistantName }: { active: boolean; assistantName: string }) {
  return (
    <MicroShell>
      <div className="absolute left-3 top-3 grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-lg">
        <Bot className="size-4" />
        <Sparkles
          className={`absolute -right-1 -top-1 size-3 text-amber-400 ${active ? "animate-pulse" : ""}`}
        />
      </div>
      <div className="absolute left-[60px] right-3 top-3">
        <div className="text-[10px] font-black text-[#342443]">{assistantName} entendeu</div>
        <div className="mt-1 text-[8px] font-bold text-[#786785]">
          “Quero limpeza amanhã à tarde”
        </div>
      </div>
      <div className="absolute inset-x-3 top-[57px] flex gap-1.5">
        {["Serviço", "Data", "Período"].map((item, index) => (
          <span
            key={item}
            className={`${transition} flex-1 rounded-lg border border-violet-100 bg-white px-1 py-2 text-center text-[8px] font-black text-violet-700 shadow-sm ${active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-25"}`}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <Check className="mx-auto mb-0.5 size-2.5 text-emerald-500" /> {item}
          </span>
        ))}
      </div>
      <div
        className={`${transition} absolute bottom-2.5 left-3 right-3 flex items-center justify-between rounded-xl bg-[#30203e] px-2.5 py-2 text-[8px] font-black text-white ${active ? "scale-100 opacity-100" : "scale-95 opacity-40"}`}
      >
        Próxima ação: oferecer horários <ArrowRight className="size-3 text-violet-300" />
      </div>
    </MicroShell>
  );
}

function WhiteLabelDemo({ active, assistantName }: { active: boolean; assistantName: string }) {
  return (
    <MicroShell>
      <div className="absolute left-3 top-3 bottom-3 w-[58px] rounded-2xl bg-[#30203e] p-2 text-white shadow-lg">
        <Palette className="size-3.5 text-violet-300" />
        <div className="mt-3 space-y-2">
          {["bg-violet-500", "bg-fuchsia-500", "bg-emerald-500"].map((color, index) => (
            <span
              key={color}
              className={`${transition} block size-5 rounded-full border-2 ${color} ${active && index === 1 ? "scale-110 border-white" : "border-transparent opacity-60"}`}
            />
          ))}
        </div>
      </div>
      <div
        className={`${transition} absolute bottom-3 left-[80px] right-3 top-3 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm ${active ? "translate-x-0" : "translate-x-2"}`}
      >
        <div className={`${transition} h-8 ${active ? "bg-fuchsia-500" : "bg-violet-600"}`} />
        <div className="px-3">
          <div
            className={`${transition} -mt-3 grid size-8 place-items-center rounded-xl border-2 border-white text-[10px] font-black italic text-white shadow ${active ? "rotate-0 bg-fuchsia-500" : "-rotate-6 bg-violet-600"}`}
          >
            {active ? "A" : "M"}
          </div>
          <div className="mt-2 text-[10px] font-black text-[#342443]">
            {active ? "Studio Aurora" : assistantName}
          </div>
          <div className="mt-1 h-1.5 w-16 rounded-full bg-violet-100" />
          <div className={`mt-2 h-5 rounded-lg ${active ? "bg-fuchsia-100" : "bg-violet-100"}`} />
        </div>
      </div>
      <span
        className={`${transition} absolute bottom-2 right-2 rounded-full bg-white px-1.5 py-1 text-[7px] font-black text-fuchsia-600 shadow ${active ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
      >
        Sua marca
      </span>
    </MicroShell>
  );
}

export function FeatureMicroVisual({ kind, active }: FeatureMicroVisualProps) {
  const branding = useBrand();
  switch (kind) {
    case "whatsapp":
      return <WhatsappDemo active={active} />;
    case "agenda":
      return <AgendaDemo active={active} />;
    case "os":
      return <WorkOrderDemo active={active} />;
    case "clientes":
      return <CustomersDemo active={active} />;
    case "notificacoes":
      return <NotificationsDemo active={active} />;
    case "pwa":
      return <PwaDemo active={active} assistantName={branding.assistantName} />;
    case "google":
      return <GoogleDemo active={active} />;
    case "ia":
      return <AiDemo active={active} assistantName={branding.assistantName} />;
    case "white-label":
      return <WhiteLabelDemo active={active} assistantName={branding.assistantName} />;
  }
}
