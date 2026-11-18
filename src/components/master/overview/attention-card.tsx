/** Cartão "Atenção agora": trials vencendo, suspensas e pendentes. */
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Clock3, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AttentionItem } from "./overview-parts";
import type { DashboardStats } from "./overview-types";

export function AttentionCard({ stats }: { stats: DashboardStats }) {
  return (
  <Card className="overflow-hidden p-5 sm:p-6">
    <h2 className="font-display text-lg font-black">Atenção agora</h2>
    <p className="mt-1 text-xs text-muted-foreground">O que vale conferir primeiro.</p>
    <div className="mt-5 space-y-3">
      <AttentionItem
        icon={<CalendarClock className="size-4" />}
        value={stats.trialsVencendo}
        title="Trials vencendo"
        description="nos próximos 7 dias"
        tone="amber"
      />
      <AttentionItem
        icon={<Pause className="size-4" />}
        value={stats.suspensas}
        title="Assinantes suspensas"
        description="aguardando ação ou pagamento"
        tone="red"
      />
      <AttentionItem
        icon={<Clock3 className="size-4" />}
        value={stats.pendentes}
        title="Cadastros pendentes"
        description="sem ativação concluída"
        tone="violet"
      />
    </div>
    <Button asChild variant="outline" className="mt-5 w-full justify-between">
      <Link to="/master/assinantes">
        Gerenciar assinantes <ArrowRight className="size-4" />
      </Link>
    </Button>
  </Card>
  );
}
