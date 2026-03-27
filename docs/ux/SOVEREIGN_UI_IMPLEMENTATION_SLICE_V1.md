# Sovereign UI — implementation slice v1

**Purpose:** Record what shipped for the first execution slice of the MUI Foundation plan (deps + `ui-core` + one admin screen).

**Date:** 2026-03-25

## Dependencies

Installed at repo root (Vite client shares this `package.json`):

- `@mui/material`
- `@emotion/react`
- `@emotion/styled`

**Not installed:** `@mui/x-data-grid`, `@mui/x-charts`, MUI X Pro/Premium.

## `client/src/ui-core`

| Area | Files |
|------|--------|
| Theme | `theme/sovereignMuiTheme.ts`, `theme/SovereignThemeProvider.tsx` |
| Tokens | `tokens/sovereignMuiTokens.ts` (re-exports `brand.ts`) |
| Wrappers | `SovereignButton`, `SovereignCard`, `SovereignModal`, `SovereignFormField`, `SovereignAlert`, `SovereignStack`, `SovereignTypography` |
| Layout | `SovereignPageShell`, `SovereignSectionHeader` |
| API | `index.ts` — **only** approved import surface for MUI-backed primitives from feature code |

**Notes:**

- `SovereignThemeProvider` does **not** mount `CssBaseline` to avoid global style resets affecting legacy UI.
- Admin theme maps palette/typography from [`client/src/config/brand.ts`](../../client/src/config/brand.ts).

## Refactored screen

- **[`client/src/pages/admin/MeProfile.tsx`](../../client/src/pages/admin/MeProfile.tsx)** — `/me` and `/me/profile` via [`AdminShell`](../../client/src/pages/admin/AdminShell.tsx).
- **Imports:** `@/ui-core` and `@/config/brand` (icon color only). **No** direct `@mui/*` imports on this page.
- **Rationale:** Small, clearly admin-scoped, exercises alert, card, form fields, button, modal, layout — without touching health dashboards, DISC tools, or Concierge.

## Intentionally left alone

- **AdminShell** sidebar (Clear Voice AI logo, nav): unchanged.
- **PlatformOverview** and other platform routes: still Tailwind/shadcn/framer.
- **ConciergePanel**, voice visualizer, DISC assessment showcase, orchestration/custom canvases:** not modified.
- **ESLint** `no-restricted-imports` for `@mui/*`: not added (phase 2+).

## Next slices (suggested)

- `SovereignDataGrid` + `@mui/x-data-grid` when a real table appears.
- ESLint guard: forbid `@mui/*` outside `client/src/ui-core/**`.
- Refactor a second admin screen with real API wiring (e.g. settings subsection).
