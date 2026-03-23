/**
 * Approved chart types and canonical wrapper names for Gateway Global AI analytics.
 * Product code should use these wrappers under `client/src/ui/charts/` — not ad-hoc Recharts imports.
 *
 * See docs-governance/UI_ARCHITECTURE_AUDIT.md and UI_COMPONENT_REGISTRY.md.
 */
export const APPROVED_CHART_WRAPPERS = [
  "KpiStatCard",
  "UsageLineChart",
  "CallVolumeBarChart",
  "StackedBarChart",
  "DonutMetricChart",
  "ConversionFunnelChart",
  "TimelineChart",
  "AnalyticsTable",
  "DiscRadarChart",
  "ArchBarChart",
] as const;

export type ApprovedChartWrapper = (typeof APPROVED_CHART_WRAPPERS)[number];
