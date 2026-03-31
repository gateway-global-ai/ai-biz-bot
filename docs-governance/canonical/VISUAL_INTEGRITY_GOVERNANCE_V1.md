---
status: canonical
truth_domain: governance
enforced_by: canvas-os-tool-mandate.mdc, brand-tokens.mdc, peer_review_alignment Phase 2 gate (integration + canvas PRs)
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
---

# Visual Integrity Governance (v1)

## Purpose

**Uniform policy across the platform:** customer-visible UI — especially anything that renders in the **Concierge canvas layer** and adjacent OS chrome — must look like **one operating system**, not a collage of one-off experiments.

This document is the **Visual Integrity** contract referenced by:

- [`INTEGRATION_GOVERNANCE_INVENTORY_V1.md`](../artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md) — Phase 2 **hard gate**
- [`.cursor/plans/peer_review_alignment_0e2c46c4.plan.md`](../../.cursor/plans/peer_review_alignment_0e2c46c4.plan.md) — Phase 2 **No-Inline** rule
- [`CANVAS_OS_TOOL_MANDATE_V1.md`](./CANVAS_OS_TOOL_MANDATE_V1.md) — canvas is an OS tool (not an artboard)

## The “No-Inline” rule (visual governance)

| | |
|--|--|
| **Requirement** | Canvas-layer and OS-pattern UI components are **authored** through **Shadcn MCP** (discovery/promotion per `AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md` — **design-time only**; see [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](./SHADCN_MCP_PLANE_BOUNDARY_V1.md)) and **global design tokens** — either **`client/src/config/brand.ts`** (`SHELL`, `CANVAS`, `BRAND`, `CANVAS_BG_CLASSNAME`, …), **`client/src/ui-core/**`** wrappers, or **CSS variables** scoped in `client/src/index.css` (e.g. `.telephony-canvas` `--background`, `--foreground`, `--primary`, …). |
| **Forbidden** | **`style={{ ... }}`** for **presentation** (colors, typography, spacing that should be tokenized), **ad-hoc hex** in feature JSX for zone/surface colors, and **non-tokenized Tailwind** that bypasses the theme (e.g. random `bg-purple-500` on canvas — see `brand-tokens.mdc`). |
| **Enforcement (Phase 2 gate)** | Any PR that introduces **speculative UI**, **artboard-style** layouts, or **non-OS** styling in canvas-scope paths **without** a recorded waiver in [`CANVAS_OS_TOOL_MANDATE_V1.md`](./CANVAS_OS_TOOL_MANDATE_V1.md) § Waivers is **rejected** at Phase 2 review. Integration-lane PRs must satisfy the same gate when they touch `client/` canvas or admin surfaces listed in the inventory. |

### Clarification: three axes (do not collapse)

| Axis | Question |
|------|----------|
| **Surface type** | Full-page route vs Concierge **canvas** vs telephony embed (`.telephony-canvas` tokens) vs admin card |
| **Styling mode** | Token / MCP-promoted component vs **inline `style`** vs ad-hoc hex |
| **Governance doc** | This file + `CANVAS_OS_TOOL_MANDATE_V1.md` vs `GOVERNED_GENERATIVE_UI_SPEC.md` vs `brand-tokens.mdc` only |

First-party routes (e.g. `/login`) are not syscall-backed canvas, but **still** must match **token-only** presentation discipline for a consistent OS.

### Grandfathered / engine exceptions

Some **existing** shell files (e.g. `ConciergePanel.tsx`) retain **layout/engine** `style` usage (fixed flex basis per chat lockdown, `zIndex` prop injection, dynamic bar widths). These are **not** a license to add new presentation inline styles in the canvas zone. **New** canvas UI must use tokens + MCP path. Migrating legacy lines is a **scheduled** cleanup, not a blocker for this rule’s **forward** enforcement.

## OS standard (Phase 2 repairs — target state)

| Pillar | Rule |
|--------|------|
| **Component generation** | **Shadcn-first** for new primitives: use registry / MCP discovery; do not “hallucinate” unstructured `div` stacks for canvas surfaces. |
| **Styling** | **Token-only:** `brand.ts`, `ui-core`, or `index.css` variables (`--background`, `--foreground`, `--primary`, … where the surface is wrapped in a tokenized scope). Prefer **`CANVAS_BG_CLASSNAME`** over `style={{ backgroundColor: CANVAS.bg }}`. |
| **Canvas architecture** | **Standard layouts:** new views inherit documented OS layout patterns (`APP_SHELL_CONTRACT.md`, `COMMAND_CENTER_SURFACE_SPEC_V1.md`, view registry render hints). |

## Audit (continuous)

1. Run **`npm run governance:visual-integrity`** — report-only listing of per-file `style={{` counts in scoped paths.
2. Run **`npm run governance:visual-integrity:strict`** (or `--strict`) — **fails (exit 1)** on **regression** vs [`visual-integrity-inline-style-baseline.json`](../artifacts/visual-integrity-inline-style-baseline.json):
   - **v2 (current):** only **grandfathered** repo-relative paths may contain `style={{`; each path has a **max cap**; unlisted files must have **zero**; actual count must not exceed cap (reductions allowed without editing the baseline).
   - **New** TSX under scoped trees with any inline style → fail until removed or an explicit baseline bump PR adds the path + cap (governance waiver in `CANVAS_OS_TOOL_MANDATE_V1.md` § Waivers when applicable).
3. **GitHub Sovereign Guard** (`.github/workflows/sovereign-guard.yml`) runs **`sovereign-gate-governance.ts`**, which applies the **same strict v2** checks as (2), plus inventory **TBD**, **Option C** SMS, and **anti-artboard** patterns on changed `client/**/*.tsx`.
4. Run **`npm run governance:ui`** — **canvas-scope hard gate** (`scripts/check-ui-governance.ts`): `client/src/components/canvas/**`, `SharedCanvasPanel.tsx` — no new presentation `style={{`, banned hex/rgb patterns, Command Center slot label anchors; `canvas/` tree expects Shadcn/ui-core/`@gateway/*` composition. CI runs this step every workflow.
5. Before claiming **Phase 2 complete** for the integration lane, record in [`INTEGRATION_GOVERNANCE_INVENTORY_V1.md`](../artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md) that the Visual Integrity gate was applied to touched `client/` paths.

## Related

- [`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md)
- [`STYLE_APPROVAL_POLICY_V1.md`](./STYLE_APPROVAL_POLICY_V1.md)
- `packages/canvas-sdk`, `packages/design-tokens` (`@gateway/*`)
- `.cursor/rules/canvas-os-tool-mandate.mdc`
- `.cursor/rules/governed-ui-sdk.mdc`
- `.cursor/rules/brand-tokens.mdc`
- `docs-governance/canonical/AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`
- `.cursor/skills/shadcn-ui-agent/SKILL.md`
