import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CalendarDays,
  Check,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/marcia/page-kit";

function DemoCta({ label = "Criar meu acesso" }: { label?: string }) {
  return (
    <Link
      to="/"
      hash="planos"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 text-sm font-extrabold text-white shadow-[0_14px_28px_-16px_rgba(109,40,217,.9)] transition hover:-translate-y-0.5"
    >
      {label} <ArrowUpRight className="size-4" />
    </Link>
  );
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function WhatsappFinanceDemoView() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="No canal que já faz parte do dia"
        title="WhatsApp financeiro"
        description="Um número da assistente, um celular autorizado e uma conversa simples."
        action={<DemoCta />}
      />
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Surface>
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black">Conexão protegida</h2>
              <p className="text-xs text-muted-foreground">
                Só o celular vinculado acessa seus dados.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              [ShieldCheck, "Código temporário de 8 dígitos"],
              [BadgeCheck, "Identidade confirmada por usuário"],
              [BellRing, "Resumos e alertas autorizados"],
            ].map(([Icon, label]) => {
              const I = Icon as LucideIcon;
              return (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"
                >
                  <I className="size-4 text-violet-700" />
                  <span className="text-sm font-bold">{String(label)}</span>
                  <Check className="ml-auto size-4 text-emerald-600" />
                </div>
              );
            })}
          </div>
        </Surface>
        <Surface className="bg-[#efeae2]">
          <div className="mx-auto max-w-xl overflow-hidden rounded-[24px] border bg-[#0b141a] shadow-xl">
            <div className="flex items-center gap-3 bg-[#202c33] p-4 text-white">
              <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
                M
              </div>
              <div>
                <div className="font-bold">Márcia Finance</div>
                <div className="text-[10px] text-emerald-300">online agora</div>
              </div>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <Bubble side="right">Gastei 120 de internet hoje.</Bubble>
              <Bubble>Foi no Pix, cartão ou boleto?</Bubble>
              <Bubble side="right">Pix.</Bubble>
              <Bubble>Despesa de R$ 120,00 em Moradia pronta. Posso confirmar?</Bubble>
              <Bubble side="right">Sim</Bubble>
              <div className="mx-auto w-fit rounded-full bg-[#182229] px-3 py-1 text-[10px] text-emerald-300">
                ✓ Registrado e refletido no dashboard
              </div>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function Bubble({ children, side = "left" }: { children: ReactNode; side?: "left" | "right" }) {
  return (
    <div
      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-white shadow ${side === "right" ? "ml-auto rounded-tr-sm bg-[#005c4b]" : "rounded-tl-sm bg-[#202c33]"}`}
    >
      {children}
    </div>
  );
}

export function SettingsFinanceDemoView() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Do seu jeito"
        title="Configurações"
        description="Personalize a ajuda, escolha onde falar com a MárcIA e cuide da sua conta."
        action={<DemoCta />}
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Surface>
          <div className="flex items-center gap-3">
            <Settings2 className="size-5 text-violet-700" />
            <h2 className="font-display text-lg font-black">Que ajuda você quer receber?</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Controlar gastos", "Entender para onde o dinheiro vai"],
              ["Economizar", "Criar sobra e formar reserva"],
              ["Sair das dívidas", "Priorizar contas e reduzir juros"],
              ["Realizar planos", "Transformar metas em valor mensal"],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`rounded-2xl border p-4 ${index === 0 ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-border"}`}
              >
                <span className="flex items-center justify-between text-sm font-black">
                  {label}
                  {index === 0 && <Check className="size-4 text-violet-600" />}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="!border-violet-950 !bg-[#21112f] text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-violet-300" />
            <h2 className="font-display text-lg font-black">Do jeito que você pediu</h2>
          </div>
          <p className="mt-5 font-display text-xl font-black leading-snug">
            Nathalia, você já usou 80% do limite de alimentação.
          </p>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Quer que eu mostre o que mais pesou e sugira um ajuste para esta semana?
          </p>
        </Surface>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [
            Smartphone,
            "Neste aplicativo",
            "Já está pronto",
            "Texto, áudio e foto direto no painel.",
          ],
          [MessageCircle, "WhatsApp", "Opcional", "Registre e pergunte pelo celular."],
          [CalendarDays, "Calendário", "Já está pronto", "Contas futuras e lembretes em ordem."],
        ].map(([Icon, title, status, text], index) => {
          const ItemIcon = Icon as LucideIcon;
          return (
            <Surface key={String(title)}>
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                  <ItemIcon className="size-5" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[9px] font-black ${index === 0 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                >
                  {String(status)}
                </span>
              </div>
              <h2 className="mt-5 font-display text-lg font-black">{String(title)}</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{String(text)}</p>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}
