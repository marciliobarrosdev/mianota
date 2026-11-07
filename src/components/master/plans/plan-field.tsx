import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Rótulo + campo do formulário de planos; `full` ocupa as duas colunas. */
export function PlanField({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
