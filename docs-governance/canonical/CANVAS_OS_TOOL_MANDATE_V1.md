---
status: canonical
truth_domain: governance
enforced_by: canvas-os-tool-mandate.mdc, brand-tokens.mdc, view-and-action-registry.mdc
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-30
---

# Canvas OS Tool Mandate (v1)

## Why this document exists

Reviews repeatedly collapse **three different questions** into one binary “compliant / not compliant” verdict. That stops here. This file states **non‑negotiable rules** for what the **canvas** is, how it may be extended, and how work must be classified.

**Forward-only:** Legacy menu/dashboard UIs are **not** the optimization target. Canvas governance applies to the **runtime OS surface** and the **pipeline** that may render new UI — see [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md).

## Definitions (use in every PR / review)

| Term | Meaning |
|------|---------|
| **Canvas** | The **white content zone** inside the Concierge shell (40% window / message area). Host for pinned views, idle chrome, and syscall-backed UI. **Not** the whole app and **not** every route. |
| **OS tool** | A **deterministic, policy-bound instrument**: registry ids, validated `canvas.*` syscalls, finite renderers, audit hooks. The canvas is an OS tool — **not** an artboard, sketchpad, or “whatever the model drew.” |
| **Agent-authored canvas UI** | Any **new** or **materially changed** UI that **ships inside the canvas zone** or **expands the canvas component palette** (including work done by coding agents, local LLMs, or humans acting without MCP/token discipline). |
| **Design tokens** | Canonical sources: `client/src/config/brand.ts` (`SHELL`, `CANVAS`, `BRAND`, **`CANVAS_BG_CLASSNAME`**, …), `client/src/ui-core/**` wrappers, theme contracts, and **Tailwind classes that derive from imported tokens** (prefer **`CANVAS_BG_CLASSNAME`** for canvas backgrounds — not `style={{ backgroundColor: CANVAS.bg }}`). |
| **Shadcn MCP pipeline** | Discovery and promotion path described in `AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md` and `.cursor/skills/shadcn-ui-agent/SKILL.md`: components are **discovered/promoted** through governed steps, not pasted as one-off trees. |

## Absolute rules (canvas + palette)

1. **The canvas is not a generative artboard.** Models and agents **do not** invent layouts, “marketing pages,” or arbitrary component trees as the **primary** delivery mechanism for customer-visible canvas content. Composition flows through **views, actions, validators, and syscalls** per `GOVERNED_GENERATIVE_UI_SPEC.md` and `INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`.

2. **Agent-authored canvas UI** (see definition above) **MUST**:
   - Use the **Shadcn MCP** (or governance-explicit equivalent) for **component discovery and promotion** before new primitives land in the palette; and  
   - Use **design tokens only** for presentation — **no `style={{ ... }}`** for color, spacing, typography, or layout on canvas-hosted surfaces or new palette components.

3. **Forbidden without explicit governance waiver** (tracked in § Waivers below):
   - Inline React `style` props for presentation on canvas / palette code paths.
   - Ad hoc hex / RGB in feature JSX **except** via **imported** token constants from `brand.ts` or registered theme maps.
   - Shipping new canvas blocks as “just Tailwind + framer-motion” **without** MCP/token discipline when the work is **agent-authored canvas UI**.

4. **Classification matrix (mandatory in reviews).** Do **not** answer “was shadcn MCP used?” alone. Record all three:

   | Axis | Record |
   |------|--------|
   | **Surface type** | OS canvas / syscall-backed view vs full-page product route vs Design Studio / experiment |
   | **Styling mode** | Token-bound `className` vs `style={{}}` vs ad hoc literals |
   | **Governance gate** | This mandate + `GOVERNED_GENERATIVE_UI_SPEC.md` vs `AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md` vs `brand-tokens.mdc` only |

   A **first-party auth page** is not a “generated canvas surface,” but it **still** must follow **token + no-inline-style** rules for a consistent OS. A **canvas overlay** or **pinned view** is in scope for **both** syscall policy **and** this mandate.

## Relationship to other docs

| Document | Role |
|----------|------|
| `INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md` | Intent/registry-first authoring; no bespoke canvas as default. |
| `GOVERNED_GENERATIVE_UI_SPEC.md` | Syscalls, palette, `dynamic` restrictions. |
| `AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md` | Shadcn MCP, promotion, inline_css tracking for Design Studio. |
| `brand-tokens.mdc` | Shell vs canvas zones, logo, footer slots. |

This mandate **does not** replace syscall validation or the view registry; it **tightens** how **agents and humans** may **author** what appears in the canvas so the product stays one consistent OS.

## Waivers

| ID | Scope | Allowed exception | Expires |
|----|-------|-------------------|---------|
| — | — | *None registered.* | — |

To add a waiver: governance PR + update this table + link to technical justification (e.g. third-party embed constraint).

## Verification checklist (PRs touching `ConciergePanel`, pinned canvas, `TypedCanvasView`, `SharedCanvasPanel`, or new `CanvasViewId`)

- [ ] Surface type + styling mode + governance gate filled in (comment or PR template).
- [ ] No new presentation `style={{}}` on canvas paths unless listed in § Waivers.
- [ ] New or moved UI blocks in the palette go through Shadcn MCP / promotion doc path when agent-authored.
- [ ] Tokens from `brand.ts` or `ui-core` — no stray hex in feature files for zone backgrounds.

## Related

- `docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md` — platform-wide **No-Inline** rule + Phase 2 hard gate (integration plan + inventory)
- `.cursor/rules/canvas-os-tool-mandate.mdc`
- `docs-governance/canonical/INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`
- `docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md`
- `docs-governance/canonical/AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`
