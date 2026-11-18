/** Gráfico de novas assinantes no período. */
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DashboardData } from "./overview-types";
import { formatRangeDay } from "@/lib/master/overview-rules";

export function SignupsChartCard({
  from,
  to,
  total,
  series,
}: {
  from: string;
  to: string;
  total: number;
  series: DashboardData["series"];
}) {
  return (
  <Card className="p-5 sm:p-6">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="font-display text-lg font-black">Novas assinantes</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastros de {formatRangeDay(from)} até{" "}
          {formatRangeDay(to)}.
        </p>
      </div>
      <Badge variant="secondary">{total} cadastros</Badge>
    </div>
    <div className="mt-5 h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ left: -22, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,.12)" />
          <XAxis dataKey="label" fontSize={10} stroke="#8B7A9A" tickLine={false} />
          <YAxis allowDecimals={false} fontSize={10} stroke="#8B7A9A" tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#21122f",
              border: "1px solid rgba(167,139,250,.26)",
              borderRadius: 12,
              color: "#fff",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Assinantes"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ r: 3, fill: "#A855F7", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </Card>
  );
}
