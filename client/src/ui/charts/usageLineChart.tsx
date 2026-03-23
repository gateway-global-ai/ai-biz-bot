import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BRAND } from "@/config/brand";

export interface UsageLineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  className?: string;
  height?: number;
}

/**
 * Approved platform line chart for usage / time-series analytics.
 * Recharts only — import from `@/ui/charts`, not `recharts` directly in product code.
 */
export function UsageLineChart({
  data,
  xKey,
  yKey,
  className = "",
  height = 240,
}: UsageLineChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis dataKey={xKey} tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={BRAND.green}
            strokeWidth={2}
            dot={{ fill: BRAND.green, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
