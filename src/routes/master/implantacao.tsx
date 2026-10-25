import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Palette,
  Plug,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/master/implantacao")({
  head: brandedRouteHead(
    "Personalizar o clone",
    "Orientação direta para criar sua marca na Academy e aplicar no projeto da Lovable.",
  ),
  component: CloneSetupGuide,
});

const operationalSteps = [
  {
    icon: Plug,
    title: "Conecte as integrações",
    description: "Configure IA, WhatsApp, Google e cobrança global.",
    to: "/master/whatsapp-qr" as const,
    action: "Abrir integrações",
  },
  {
    icon: CreditCard,
    title: "Defina planos e trial",
    description: "Escolha preço, limites, créditos e dias de teste.",
    to: "/master/planos" as const,
    action: "Configurar planos",
  },
  {
    icon: Building2,
    title: "Cadastre a primeiro assinante",
    description: "Crie o assinante, libere o acesso e acompanhe a operação.",
    to: "/master/novo-assinante" as const,
    action: "Cadastrar assinante",
  },
];

function CloneSetupGuide() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#170c25] px-6 py-8 text-white shadow-[0_32px_90px_-44px_rgba(124,58,237,.95)] sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(217,70,239,.34),transparent_30%),radial-gradient(circle_at_18%_85%,rgba(124,58,237,.28),transparent_38%)]" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-violet-200">
            <Palette className="size-3.5" /> sua marca vive no projeto
          </div>
          <h1 className="mt-5 font-display text-4xl font-black leading-[.98] tracking-[-.05em] sm:text-5xl">
            O clone é a base.
            <br />
            <span className="text-violet-400">A identidade é sua.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/64 sm:text-base">
            Nome, cores, logo, personagem, copy e dados legais da landing page são alterados por
            prompt no projeto da Lovable — nunca neste painel.
          </p>
        </div>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-3">
          <GuideStep
            number="1"
            icon={<Bot className="size-5" />}
            title="Converse com o agente"
            description="Entre na TurboSaaS Academy e peça ao agente para criar sua marca completa."
          >
            <Button asChild className="mt-5 w-full bg-violet-600 text-white hover:bg-violet-700">
              <a href="https://turbosaas.pro/AlunoLogin" target="_blank" rel="noreferrer">
                Abrir Academy <ExternalLink className="size-4" />
              </a>
            </Button>
          </GuideStep>

          <GuideStep
            number="2"
            icon={<Rocket className="size-5" />}
            title="Copie o prompt pronto"
            description="O agente reúne nome, visual, público e textos em uma instrução segura para o clone."
          >
            <div className="mt-5 rounded-xl border border-violet-200/60 bg-violet-500/5 p-3 text-xs leading-5 text-muted-foreground">
              Não edite código nem preencha campos de marca aqui. Copie exatamente o prompt entregue
              pelo agente.
            </div>
          </GuideStep>

          <GuideStep
            number="3"
            icon={<ShieldCheck className="size-5" />}
            title="Cole na Lovable"
            description="Abra o projeto clonado, envie o prompt, revise a prévia e publique sua marca."
          >
            <Button asChild variant="outline" className="mt-5 w-full">
              <a href="https://lovable.dev/projects" target="_blank" rel="noreferrer">
                Abrir meus projetos <ExternalLink className="size-4" />
              </a>
            </Button>
          </GuideStep>
        </div>
      </Card>

      <div className="rounded-2xl border border-emerald-300/35 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
        <span className="inline-flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-4" /> Identidade não é editada no superadmin.
        </span>{" "}
        Aqui você administra o negócio: assinantes, planos, cobranças, liberações e integrações.
      </div>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
              Depois da marca
            </p>
            <h2 className="mt-1 font-display text-2xl font-black tracking-tight">
              Prepare a operação para vender
            </h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/master/painel">
              Ir para visão geral <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {operationalSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="flex flex-col p-5">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-black">{step.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
                <Button asChild variant="outline" className="mt-5 w-full justify-between">
                  <Link to={step.to}>
                    {step.action} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GuideStep({
  number,
  icon,
  title,
  description,
  children,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col border-b p-6 last:border-0 lg:border-b-0 lg:border-r lg:last:border-r-0 sm:p-7">
      <div className="flex items-center justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-500">
          {icon}
        </div>
        <span className="font-display text-4xl font-black text-violet-500/12">0{number}</span>
      </div>
      <h2 className="mt-6 font-display text-xl font-black">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
