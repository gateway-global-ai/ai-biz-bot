/**
 * Legacy barrel — re-exports platform charts from `@/ui/charts`.
 * Prefer: `import { DiscRadarChart, ArchBarChart } from '@/ui/charts'`
 */
export {
  DiscRadarChart,
  ArchBarChart,
  DiscRadar,
  ArchBreakdown,
  type DiscRadarChartProps,
  type ArchBarChartProps,
} from "@/ui/charts";

export { DISC_COLORS, ARCH_COLORS } from "@/config/brand";
