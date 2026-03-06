/**
 * Shared agent profile charts: DiscRadar (D/I/S/C) and ArchBreakdown (A/R/Cx/H).
 * Used by investor demo and optionally AgentManager/TheLab.
 */
import React from "react";
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
import { DISC_COLORS, ARCH_COLORS } from "./agentChartColors";

export interface DiscRadarProps {
  data: DiscScores;
  className?: string;
}

export function DiscRadar({ data, className = "" }: DiscRadarProps) {
  const radarData = [
    { subject: "D", fullSubject: "Dominance", value: data.dominance, fullMark: 100 },
    { subject: "I", fullSubject: "Influence", value: data.influence, fullMark: 100 },
    { subject: "S", fullSubject: "Steadiness", value: data.steadiness, fullMark: 100 },
    { subject: "C", fullSubject: "Conscientiousness", value: data.conscientiousness, fullMark: 100 },
  ];

  return (
    <div className={`h-52 w-full ${className}`}>
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
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface ArchBreakdownProps {
  data: ArchProfile;
  className?: string;
}

export function ArchBreakdown({ data, className = "" }: ArchBreakdownProps) {
  const barData = [
    { name: "Acknowledge", short: "A", value: data.acknowledge, color: ARCH_COLORS.A },
    { name: "Reflect", short: "R", value: data.reflect, color: ARCH_COLORS.R },
    { name: "Context", short: "Cx", value: data.context, color: ARCH_COLORS.Cx },
    { name: "Handoff", short: "H", value: data.handoff, color: ARCH_COLORS.H },
  ];

  return (
    <div className={`h-40 w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={barData}
          layout="vertical"
          margin={{ left: -20, right: 10, top: 5, bottom: 0 }}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            dataKey="short"
            type="category"
            width={40}
            tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "10px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { DISC_COLORS, ARCH_COLORS };
