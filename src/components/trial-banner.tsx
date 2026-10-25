import { AlertTriangle } from "lucide-react";
import { trialDaysLeft, type CompanyRow } from "@/lib/tenant";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyCredits } from "@/lib/credits.functions";

export function TrialBanner({ company }: { company: CompanyRow }) {
  const fetchCredits = useServerFn(getMyCredits);
  const [credits, setCredits] = useState<number | null>(company.creditos_saldo ?? null);

  useEffect(() => {
    if (company.status_cobranca !== "trial") return;
    let active = true;
    const load = () =>
      void fetchCredits({ data: { companyId: company.id } })
        .then((result) => active && setCredits(result.saldo))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [company.id, company.status_cobranca, fetchCredits]);

  if (company.status_cobranca !== "trial") return null;
  const days = trialDaysLeft(company.trial_ate);
  const creditLabel =
    credits === null ? "carregando saldo" : `${credits.toLocaleString("pt-BR")} créditos`;

  return (
    <div className="flex flex-col items-center justify-center gap-2 border-b border-red-800 bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white sm:flex-row sm:text-left">
      <AlertTriangle className="hidden size-4 shrink-0 sm:block" />
      <div>
        <span className="font-extrabold uppercase tracking-wide">Trial</span>
        {days > 0 ? (
          <>
            {" · "}restam{" "}
            <b>
              {days} {days === 1 ? "dia" : "dias"}
            </b>
            {" · "}
            <b>{creditLabel}</b> disponíveis
          </>
        ) : (
          <> · período encerrado</>
        )}
        <span className="block text-[11px] font-normal text-red-50 sm:ml-2 sm:inline">
          1 crédito = 1 resposta enviada pela IA no WhatsApp.
          {credits === 0 ? " A IA está pausada até a ativação do plano." : ""}
        </span>
      </div>
      <Link
        to="/app/checkout"
        className="inline-flex shrink-0 items-center rounded-md bg-white px-3 py-1 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-50 sm:ml-2"
      >
        Ativar plano
      </Link>
    </div>
  );
}
