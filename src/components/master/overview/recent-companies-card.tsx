/** Lista das últimas assinantes criadas. */
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./overview-parts";
import type { CompanySummary } from "./overview-types";

export function RecentCompaniesCard({ companies }: { companies: CompanySummary[] }) {
  return (
  <Card className="p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-lg font-black">Assinantes recentes</h2>
        <p className="mt-1 text-xs text-muted-foreground">As últimas contas criadas.</p>
      </div>
      <Button asChild size="sm" variant="ghost">
        <Link to="/master/assinantes">Ver todas</Link>
      </Button>
    </div>
    <div className="mt-4 divide-y">
      {companies.map((company) => (
        <Link
          key={company.id}
          to="/master/assinantes"
          className="flex items-center gap-3 py-3 transition hover:opacity-75"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 font-bold text-violet-500">
            {company.nome.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{company.nome}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {company.email_corporativo || "Sem e-mail corporativo"}
            </div>
          </div>
          <StatusBadge status={company.status_cobranca} />
          <div className="hidden text-right text-[10px] text-muted-foreground sm:block">
            {new Date(company.created_at).toLocaleDateString("pt-BR")}
          </div>
        </Link>
      ))}
    </div>
  </Card>
  );
}
