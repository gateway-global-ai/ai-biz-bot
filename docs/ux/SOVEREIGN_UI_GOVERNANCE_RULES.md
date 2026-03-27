# Sovereign UI Governance Rules (MUI + ui-core)

**Purpose:** Law for **new** admin and control-plane UI so the platform does not accumulate **uncontrolled** MUI imports, **parallel** design systems, or **accidental** replacement of **domain visualizations**.

**Scope:** `client/src/**` for UI. Does not change server governance, voice lockdown, or route registry rules.

---

## New control-plane UI (mandatory)

Once [`client/src/ui-core`](../../client/src/ui-core) exists:

- **All new admin/control-plane screens** and **new panels** added under `/platform`, `/me` (admin shell), or equivalent **operator** surfaces must import **UI primitives only from `@/ui-core`**, not from `@mui/*`.
- **Legacy files** (existing shadcn/Tailwind pages) **remain valid until explicitly refactored** — no panic migration of untouched screens.
- **Enforcement:** Violating the `@/ui-core`-only rule for **new** control-plane UI is **UI governance drift**. It must be **corrected in the same pull request** or the change **blocked from merge** (no “just this once” raw `@mui/*` imports in product paths).

---

## Required rules

### R1 — Approved stack for new control-plane UI

- **Base:** Material UI **Community** — `@mui/material`, `@emotion/react`, `@emotion/styled`.
- **Tables (optional):** `@mui/x-data-grid` **Community** only when a concrete screen requires a data grid.
- **Charts (optional, deferred):** `@mui/x-charts` only with explicit need and **wrapper** in `ui-core` ([quickstart](https://mui.com/x/react-charts/quickstart/#installation)).

### R2 — Single import surface

After `client/src/ui-core` exists:

- **Product and feature code** under admin/control-plane paths MUST import UI primitives from `@/ui-core` (barrel), **not** from `@mui/*`.
- **Only** files under `client/src/ui-core/**` may import `@mui/*` directly.

### R3 — Layering

```
Domain widgets (orchestration, governance, meta-prompt panels)
    → compose Sovereign* wrappers + data hooks
Sovereign* wrappers
    → wrap MUI primitives + map tokens
MUI + Emotion
```

### R4 — Brand and shell alignment

- Map **colors and typography** from [`client/src/config/brand.ts`](../../client/src/config/brand.ts) into the MUI theme where applicable.
- **Concierge / voice shell** remains under **sovereign-chat-lockdown** and **brand-tokens** — not overridden by MUI global CssBaseline in those routes unless scoped.

### R5 — Domain visualizations (non-negotiable)

The following classes of UI **must not** be rewritten into generic MUI “chart” or “dashboard” equivalents as part of this initiative:

- **Gemini / voice** visualizer and related live session UX.
- **Behavioral / DISC** and similar **IS** visualizations.
- **Orchestration / system-state** bespoke timelines, graphs, or canvases that encode operational semantics.

**Allowed:** Wrap in `SovereignCard` / `SovereignPageShell`, align spacing/typography tokens, add adjacent MUI **non-visual** chrome (tabs, toolbars).

### R6 — No full migration

- Legacy **shadcn/Tailwind** components remain valid.
- Refactor **only** screens explicitly in task scope.

### R7 — New primary stack prohibition

Introducing **another** component library as the default for new control-plane work requires **explicit** governance amendment (update this doc + component map + Cursor rules).

---

## Recommended enforcement (later)

- ESLint `no-restricted-imports`: forbid `@mui/*` outside `client/src/ui-core`.
- PR checklist: “New admin UI uses `ui-core` only.”

---

## Blocked items

| Item | Reason |
|------|--------|
| Raw `@mui/*` in feature pages | Causes drift; bypasses theme |
| MUI X Pro/Premium without license | Commercial + compliance |
| Replacing DiscVisualizer / Concierge visualizer with MUI Chart | Loses domain semantics |
| CssBaseline resetting sovereign shell zones | Violates brand-tokens law |

---

## Deferred items

- `SovereignDataGrid` wrapper + ESLint rule.
- Storybook or visual regression for `ui-core`.
- Deep “Jason Standard” glass parity on MUI cards (optional aesthetic pass).

---

## v1 vs later

| v1 | Later |
|----|--------|
| Docs + skill + `ui-core` scaffold + 1 refactored panel | ESLint, DataGrid wrapper |
| Preserve all domain visualizations | Shared form/RHF patterns under `ui-core/patterns` |

---

## Related governance

- [`.cursor/rules/brand-tokens.mdc`](../../.cursor/rules/brand-tokens.mdc)
- [`.cursor/rules/sovereign-chat-lockdown.mdc`](../../.cursor/rules/sovereign-chat-lockdown.mdc)
- [`.cursor/rules/view-and-action-registry.mdc`](../../.cursor/rules/view-and-action-registry.mdc)
- [`docs/ux/SOVEREIGN_UI_FOUNDATION_PLAN.md`](./SOVEREIGN_UI_FOUNDATION_PLAN.md)
- [`docs/ux/SOVEREIGN_UI_COMPONENT_MAP.yaml`](./SOVEREIGN_UI_COMPONENT_MAP.yaml)
