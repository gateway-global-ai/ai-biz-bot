# Sovereign UI Foundation Plan (MUI Community + ui-core)

**Purpose:** Define how **new** admin and control-plane UI is built using **Material UI Community** behind **`client/src/ui-core`**, while **coexisting** with existing Tailwind/shadcn/Radix and **preserving** domain-specific visualizations.

**Scope:** New internal surfaces (orchestration dashboards, governance panels, provisioning state, meta-prompt tooling). **Out of scope v1:** marketing pages, Concierge/voice shell, full migration of `AdminShell` subtree unless explicitly tasked.

---

## Stack decision

| Layer | v1 choice |
|-------|-----------|
| Base kit (new control-plane) | **Material UI Community** — `@mui/material`, `@emotion/react`, `@emotion/styled` |
| Data tables | **Only when needed:** `@mui/x-data-grid` Community |
| Charts / advanced MUI X | **Deferred** — add only with concrete screen need; wrap under `ui-core` if adopted ([MUI X Charts](https://mui.com/x/react-charts/quickstart/#installation)) |
| Legacy surfaces | **Unchanged** unless a change touches that file and the task includes refactor |

**Coexistence:** Existing `client/src/components/ui/*` (shadcn-style) and Tailwind-heavy pages remain valid for **legacy** paths. **New** control-plane code uses **`ui-core` only** for primitives — see **[`SOVEREIGN_UI_GOVERNANCE_RULES.md`](./SOVEREIGN_UI_GOVERNANCE_RULES.md)** (mandatory block: new admin UI → `@/ui-core` only; legacy grandfathering; PR-level drift enforcement).

---

## Sovereign UI layer (`client/src/ui-core`)

**Recommended structure:**

```
client/src/ui-core/
  index.ts                 # barrel — re-export public API only
  theme/
    sovereignTheme.ts      # createTheme + palette/typography mapped from brand tokens
    ThemeProvider.tsx      # MUI ThemeProvider + optional CssBaseline (scoped if needed)
  tokens/
    sovereignTokens.ts     # re-exports / maps from @/config/brand (no duplicate hex law violations)
  components/              # thin wrappers (Sovereign*)
    SovereignButton.tsx
    SovereignCard.tsx
    SovereignModal.tsx
    SovereignFormField.tsx
    SovereignSelect.tsx
    SovereignAlert.tsx
    SovereignEmptyState.tsx
    SovereignTableShell.tsx
  layouts/
    SovereignPageShell.tsx
    SovereignSectionHeader.tsx
  patterns/                # composed blocks (still generic)
    ...
  domain/                  # control-plane widgets (orchestration, governance, agents)
    OrchestrationTimeline.tsx
    GovernanceViolationPanel.tsx
    AgentStatusCard.tsx
    SiteConfigSummaryCard.tsx
    ProvisioningStatePanel.tsx
    MetaPromptExecutionPanel.tsx
```

**Domain visualization policy:** Components such as **Gemini/voice visualizer**, **DISC/behavioral** (`DiscVisualizer` and similar), **orchestration graph/timeline** bespoke canvases live as **domain** or **co-located with their feature**; they **may** be wrapped in `SovereignCard` / `SovereignPageShell` for chrome but **must not** be deleted or replaced by generic MUI chart primitives unless explicitly approved.

---

## Minimum wrapped set (v1)

Implement first (all export from `ui-core`):

- `SovereignButton`, `SovereignCard`, `SovereignModal`, `SovereignFormField`, `SovereignSelect`, `SovereignAlert`, `SovereignEmptyState`, `SovereignTableShell`, `SovereignPageShell`, `SovereignSectionHeader`

**TableShell:** layout + toolbar slot; wire **DataGrid** inside only when `@mui/x-data-grid` is installed.

---

## Domain widgets (first pass)

Draft as **composition** over wrappers + existing APIs/types:

| Widget | Role |
|--------|------|
| `OrchestrationTimeline` | Run history / steps — may embed existing timeline or SVG; not a generic BarChart replacement |
| `GovernanceViolationPanel` | Lists policy/registry violations |
| `AgentStatusCard` | Agent row summary |
| `SiteConfigSummaryCard` | Site config id, name, tier hooks |
| `ProvisioningStatePanel` | Provision progress / symmetry hints |
| `MetaPromptExecutionPanel` | Envelope id, resolver outcome, telemetry links |

---

## Adoption plan (order)

1. **Lock policy** — merge [`SOVEREIGN_UI_GOVERNANCE_RULES.md`](./SOVEREIGN_UI_GOVERNANCE_RULES.md); optional `.cursor/rules` pointer.
2. **Produce component map first** — [`SOVEREIGN_UI_COMPONENT_MAP.yaml`](./SOVEREIGN_UI_COMPONENT_MAP.yaml) (single source for wrapper vs domain vs legacy).
3. **Install deps** — MUI + Emotion only.
4. **Scaffold `ui-core`** — theme + 2–3 wrappers + `ThemeProvider` boundary for admin subtree **or** per-route wrapper.
5. **One example refactor** — e.g. a single tab inside [`client/src/pages/admin/AdminShell.tsx`](../../client/src/pages/admin/AdminShell.tsx) or [`client/src/pages/owner/AiBizBotAdmin.tsx`](../../client/src/pages/owner/AiBizBotAdmin.tsx) (pick smallest high-signal panel).
6. **Data Grid** — add package + `SovereignDataGrid` wrapper only when a screen needs sortable/filterable tables.

**Explicitly out of scope v1:** ConciergePanel, StandardizedChatInterface, voice pipeline UI, public landing pages, wholesale replacement of shadcn forms.

---

## Failure prevention (risks)

| Risk | Mitigation |
|------|------------|
| Two visual systems | **Governed split:** legacy vs `ui-core`; document in component map |
| Wrapper drift | Single barrel export; code review rejects raw MUI in new paths |
| Uncontrolled imports | ESLint `no-restricted-imports` for `@mui/*` outside `ui-core` (later) |
| Overbuilding library | v1 = 10 wrappers + theme only |
| Full migration distraction | **Non-goal** in v1 |

---

## v1 vs later

| v1 | Later |
|----|--------|
| MUI Community + `ui-core` + one refactored panel | ESLint enforcement, Storybook |
| Optional DataGrid when needed | MUI X Charts if a KPI dashboard needs standard charts |
| Domain viz preserved | Deeper theme parity with Jason Standard glass (if desired) |

---

## Blocked / deferred

- MUI X Pro/Premium without license and governance approval.
- Replacing domain visualizers with generic MUI chart components.
- New routes in `server/routes.ts` (unchanged platform rule).
