# Sovereign UI — implementation slice v2

**Purpose:** Record the second execution slice: governance reinforcement + `PlatformBusinessManager` Overview via `ui-core` + onboarding pipeline skill artifacts.

**Date:** 2026-03-25

## Track A — Governance

- [`SOVEREIGN_UI_GOVERNANCE_RULES.md`](./SOVEREIGN_UI_GOVERNANCE_RULES.md): added **“New control-plane UI (mandatory)”** — `@/ui-core` only for **new** admin/operator panels, legacy grandfathering, **same-PR fix or block merge** for drift.
- [`SOVEREIGN_UI_FOUNDATION_PLAN.md`](./SOVEREIGN_UI_FOUNDATION_PLAN.md): pointer to that block.

## Track B — Platform business Overview

- **New file:** [`client/src/pages/admin/PlatformBusinessOverviewPanel.tsx`](../../client/src/pages/admin/PlatformBusinessOverviewPanel.tsx) — extracted boundary; **`SovereignThemeProvider`** wraps panel content; **no raw `@mui/*`** in this file (only `@/ui-core` + domain components + Lucide + hooks).
- **Updated:** [`PlatformBusinessManager.tsx`](../../client/src/pages/admin/PlatformBusinessManager.tsx) — Overview tab renders the panel; removed inline `OverviewTab`; tab chrome/header/other tabs unchanged (Tailwind/shadcn).
- **Intent:** Same layout and behavior as before (identity block, grid fields, plan select, save, governance card, voice pulse) — **no visual redesign goal**; primitives standardized through MUI behind ui-core.
- **New ui-core wrapper:** `SovereignSelect` — required for plan dropdown without shadcn `Select` in this panel; reusable for other control-plane forms.

**Intentionally unchanged:** Concierge, DISC tools, orchestration canvases, other `PlatformBusinessManager` tabs.

## Track C — Onboarding skill

- [`.cursor/skills/sovereign-onboarding-pipeline/SKILL.md`](../../.cursor/skills/sovereign-onboarding-pipeline/SKILL.md)
- [`docs/sdk/ONBOARDING_PIPELINE_SKILL.md`](../sdk/ONBOARDING_PIPELINE_SKILL.md)

## Deferred

- ESLint `no-restricted-imports` for `@mui/*` outside `ui-core`.
- `@mui/x-data-grid`, charts.
- Further admin migration until explicitly scoped.
