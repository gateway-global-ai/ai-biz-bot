import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { DiscScores, ArchProfile } from "@shared/schema";
import { ARCH_COLORS, BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export interface DiscRadarChartProps {
  data: DiscScores;
  className?: string;
}

/**
 * DiSC behavioral radar — Recharts. Stroke/fill use platform accent from `brand.ts`.
 */
export function DiscRadarChart({ data, className = "" }: DiscRadarChartProps) {
  const radarData = [
    { subject: "D", fullSubject: "Dominance", value: data.dominance, fullMark: 100 },
    { subject: "I", fullSubject: "Influence", value: data.influence, fullMark: 100 },
    { subject: "S", fullSubject: "Steadiness", value: data.steadiness, fullMark: 100 },
    { subject: "C", fullSubject: "Conscientiousness", value: data.conscientiousness, fullMark: 100 },
  ];

  const accent = BRAND.blueLight;

  return (
    <div className={cn("h-52 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: "bold" }}
          />
          <Radar
            name="Profile"
            dataKey="value"
            stroke={accent}
            fill={accent}
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface ArchBarChartProps {
  data: ArchProfile;
  className?: string;
  /** `compact` matches agent manager (wider name column); `default` matches legacy mini charts */
  variant?: "default" | "compact";
}

/**
 * ARCH horizontal bars — Acknowledge, Reflect, Context, Handoff. Colors from `brand.ts` `ARCH_COLORS`.
 */
export function ArchBarChart({ data, className = "", variant = "default" }: ArchBarChartProps) {
  const barData = [
    { name: "Acknowledge", short: "A", value: data.acknowledge, color: ARCH_COLORS.A },
    { name: "Reflect", short: "R", value: data.reflect, color: ARCH_COLORS.R },
    { name: "Context", short: "Cx", value: data.context, color: ARCH_COLORS.C },
    { name: "Handoff", short: "H", value: data.handoff, color: ARCH_COLORS.H },
  ];

  const isCompact = variant === "compact";
  const margin = isCompact
    ? { left: 0, right: 20, top: 5, bottom: 0 }
    : { left: -20, right: 10, top: 5, bottom: 0 };

  return (
    <div className={cn(isCompact ? "h-32" : "h-40", "w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={margin}>
          <XAxis type="number" hide domain={[0, 100]} />
          {isCompact ? (
            <YAxis
              dataKey="name"
              type="category"
              width={80}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "500" }}
            />
          ) : (
            <YAxis
              dataKey="short"
              type="category"
              width={40}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
            />
          )}
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: isCompact ? "11px" : "10px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={isCompact ? 14 : 16}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** @deprecated Use `DiscRadarChart` — alias for migration */
export const DiscRadar = DiscRadarChart;
/** @deprecated Use `ArchBarChart` — alias for migration */
export const ArchBreakdown = ArchBarChart;
