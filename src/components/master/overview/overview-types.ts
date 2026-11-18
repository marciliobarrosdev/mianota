/** Formato dos dados da Visão geral do Master (retorno de `masterKpis`). */
import type { getMasterSetupProgress } from "@/lib/master/master-setup.functions";

export type CompanySummary = {
  id: string;
  nome: string;
  email_corporativo: string | null;
  status_cobranca: string;
  trial_ate: string | null;
  creditos_saldo: number | null;
  created_at: string;
};


export type DashboardStats = {
    total: number;
    ativas: number;
    trial: number;
    suspensas: number;
    pendentes: number;
    novasPeriodo: number;
    movimentacoes: number;
    contas: number;
    comandosIa: number;
    assinaturasAtivas: number;
    assinaturasTrial: number;
    mrr: number;
    trialsVencendo: number;
  };

export type DashboardData = {
  range: { from: string; to: string };
  stats: DashboardStats;
  series: { label: string; total: number }[];
  recentCompanies: CompanySummary[];
};

export type SetupProgress = Awaited<ReturnType<typeof getMasterSetupProgress>>;
