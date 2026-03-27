---
name: mui-foundation
description: Adopt Material UI Community behind client/src/ui-core for new admin/control-plane surfaces; governance artifacts in docs/ux and docs/sdk.
---

# MUI Foundation (Sovereign UI layer)

## When to use

- Adding **new** admin or control-plane screens (orchestration, violations, provisioning, meta-prompt debug).
- Choosing components for **dashboard-style** internal tools.
- Before importing `@mui/material` directly in feature code.

## Source of truth

1. [`docs/sdk/MUI_FOUNDATION_SKILL.md`](../../../docs/sdk/MUI_FOUNDATION_SKILL.md) — skill spec + spawn prompt.
2. [`docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md`](../../../docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md) — import law, stack approval.
3. [`docs/ux/SOVEREIGN_UI_FOUNDATION_PLAN.md`](../../../docs/ux/SOVEREIGN_UI_FOUNDATION_PLAN.md) — phases, adoption.
4. [`docs/ux/SOVEREIGN_UI_COMPONENT_MAP.yaml`](../../../docs/ux/SOVEREIGN_UI_COMPONENT_MAP.yaml) — wrappers vs domain vs legacy.

## Hard rules

- **v1 base:** `@mui/material` + `@emotion/react` + `@emotion/styled` (Community). Optional `@mui/x-data-grid` when a real grid need exists.
- **No raw MUI** in product/control-plane files once `client/src/ui-core` exists — import from `@/ui-core/...` only (per governance doc).
- **Do not** replace **domain visualizations** (Concierge visualizer, Gemini Live shell band, DISC/behavioral visualizers, orchestration/system-state visuals) with generic MUI equivalents — **compose** or re-skin in place.
- **Do not** migrate legacy shadcn/Tailwind screens unless the task explicitly includes that screen.
- Respect **brand/shell** rules for zones that share chrome with sovereign shell ([`brand-tokens.mdc`](../../rules/brand-tokens.mdc)).

## Blocked

- Pro/Premium MUI X without commercial approval and proven need.
- A second primary stack (e.g. another component library) for new control-plane work without governance amendment.
- Full-repo MUI migration as a “side effect” of one feature.
