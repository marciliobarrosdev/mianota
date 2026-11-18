/** Cartão de progresso da configuração do SaaS, com atalho para o checklist. */
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SetupProgress } from "./overview-types";

export function SetupProgressCard({ setup }: { setup: SetupProgress }) {
  return (
    <Card
      className={`overflow-hidden p-0 ${setup.readyToLaunch ? "border-emerald-300/60" : "border-violet-300/60"}`}
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div
          className={`grid size-11 place-items-center rounded-2xl ${setup.readyToLaunch ? "bg-emerald-500/10 text-emerald-700" : "bg-violet-500/10 text-violet-600"}`}
        >
          {setup.readyToLaunch ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <ListChecks className="size-5" />
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display font-black">
              {setup.readyToLaunch
                ? "Configuração essencial concluída"
                : "Termine de preparar seu SaaS"}
            </h2>
            <Badge variant={setup.readyToLaunch ? "default" : "secondary"}>
              {setup.percent}% pronto
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {setup.readyToLaunch
              ? "Planos, cobrança, atendimento e acesso passaram pela conferência."
              : `${setup.completed} de ${setup.total} verificações concluídas. O checklist mostra a próxima ação.`}
          </p>
          <div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
              style={{ width: `${setup.percent}%` }}
            />
          </div>
        </div>
        <Button asChild variant={setup.readyToLaunch ? "outline" : "default"}>
          <Link to="/master/checklist">
            Abrir checklist <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
