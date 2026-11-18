/* eslint-disable @typescript-eslint/no-explicit-any */
/** Rótulos e estilos fixos do extrato. */
import { type TxFilters, type TxSort } from "@/lib/finance/transactions-rules";

export const STATUS_STYLES: Record<string, string> = {
  Pago: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Recebido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  Previsto: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  Vencido: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

export const SORTS: { key: TxSort; label: string }[] = [
  { key: "date_desc", label: "Mais recentes" },
  { key: "date_asc", label: "Mais antigas" },
  { key: "amount_desc", label: "Maior valor" },
  { key: "amount_asc", label: "Menor valor" },
  { key: "category", label: "Categoria" },
];
export const STATUS_CHIPS: { key: TxFilters["status"]; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pago", label: "Pagas" },
  { key: "pendente", label: "Pendentes" },
  { key: "vencido", label: "Vencidas" },
];
export const SOURCE_CHIPS: { key: TxFilters["source"]; label: string }[] = [
  { key: "all", label: "Qualquer origem" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "ia", label: "Chat MIA" },
  { key: "manual", label: "Manual" },
  { key: "foto", label: "Foto/PDF" },
];
