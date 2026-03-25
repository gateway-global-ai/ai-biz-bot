# UI Component Registry — Platform Wrappers

**Purpose:** Index of **approved** platform component names, implementation paths, and underlying vendors.

**Comprehensive matrix (status, ownership, wrap targets, PTT/QR/onboarding/SMS):** [UI_SDK_MATRIX.md](./UI_SDK_MATRIX.md).

**Rule:** New product code imports from `@/ui/...` where a wrapper exists; shadcn paths are implementation details.

| Wrapper | File | Underlying | Kit preview | Notes |
|---------|------|------------|---------------|-------|
| `UIButton` | `client/src/ui/foundation/UIButton.tsx` | `components/ui/button` | [/dev/ui-kit#foundation-uibutton](/dev/ui-kit#foundation-uibutton) | Re-exports shadcn `Button`; use for new code |
| `DiscRadarChart` | `client/src/ui/charts/agentProfileCharts.tsx` | Recharts `RadarChart` | [/dev/ui-kit#charts-disc-radar](/dev/ui-kit#charts-disc-radar) | Colors from `brand.ts` |
| `ArchBarChart` | `client/src/ui/charts/agentProfileCharts.tsx` | Recharts `BarChart` | [/dev/ui-kit#charts-arch-bar](/dev/ui-kit#charts-arch-bar) | `ARCH_COLORS` from `brand.ts` |
| `DiscRadar` | alias → `DiscRadarChart` | same | same | Back-compat name |
| `ArchBreakdown` | alias → `ArchBarChart` | same | same | Back-compat name |
| `UsageLineChart` | `client/src/ui/charts/usageLineChart.tsx` | Recharts `LineChart` | [/dev/ui-kit#charts-usage-line](/dev/ui-kit#charts-usage-line) | Default axis/tooltip styling |

**UI Kit:** See [UI_KIT.md](./UI_KIT.md) — full page lists curated shadcn primitives (Input, Card, Dialog, Tabs, Toast, Calendar, Form, Table, Accordion) with anchors on `/dev/ui-kit`.

**Legacy barrel:** `client/src/components/agent-charts/AgentProfileCharts.tsx` re-exports from `@/ui/charts` for existing imports.

**Charts governance:** See `client/src/ui/charts/chartGovernance.ts` and [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md) §2.2.

**Cross-links:** [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md) (shell/canvas), [VIEW_REGISTRY.md](./VIEW_REGISTRY.md) (views use canvas-safe components in customer surfaces).
