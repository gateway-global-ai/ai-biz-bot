---
status: canonical
truth_domain: governance
enforced_by: legacy-ui-reference-governance.mdc, view-and-action-registry.mdc, prompt-runtime-governance.mdc, canvas-os-tool-mandate.mdc
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-29
---

# Intent-Generated Surface Governance (v1)

## Purpose

Lock the product direction: **voice-first**, **intent-driven** customer experience. The **canvas** (the white content zone in the Concierge shell) must not be a gallery of hand-maintained marketing layouts. **Renderable content is produced by the governed system** — intent resolution, view ids, tool metadata, and templates — not ad hoc JSX product pages.

### Voice-first pipeline (forward-only)

New customer surfaces are produced by the **governed voice/canvas runtime** — not by refurbishing deprecated pre-intent dashboards. Read [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md). Skills, journey phases, and **registered views** must stay aligned.

### Absolute: canvas = OS tool (not an artboard)

The canvas is **not** a place for agents or models to “design whatever.” It is an **operating-system instrument** with syscall-backed, registry-bound surfaces. **Mandatory companion:** [`CANVAS_OS_TOOL_MANDATE_V1.md`](./CANVAS_OS_TOOL_MANDATE_V1.md) — Shadcn MCP + design tokens for agent-authored canvas UI; **no presentation `style={{}}`** on canvas paths without a listed waiver.

## Non-goals

- Replacing execution-plane voice machinery (Gemini Live, WebSockets) — see voice lockdown rules.
- Deleting `site_configs` or tenant identity — businesses remain rows; this governs **how UI is authored**.

## Definitions

| Term | Meaning |
|------|---------|
| **Canvas** | The customer-visible content region inside the shell (see `APP_SHELL_CONTRACT.md` / brand tokens). |
| **Generated surface** | UI described by **logical view id**, **action id**, **tool/canvas events**, or **registry-backed template** — assembled by routers and renderers that consume structured data. |
| **Legacy UI reference** | Deprecated static layouts kept under `client/legacy-ui-reference/` for human reference only — **not** runtime. |

## Rules

1. **No bespoke canvas product pages as the default path** — New customer-facing flows must map to declared **views** and **actions** (`VIEW_REGISTRY.md`, `ACTION_REGISTRY.md`) and/or tool-driven panels (e.g. shared canvas, manual input) with structured payloads.
2. **Templates are control-plane artifacts** — Reusable presentation blocks (including shadcn-based building blocks) are defined under governance (e.g. registry YAML, design-system contracts, skills) and **compiled or selected** at runtime — not copied as one-off component trees in feature folders without registry linkage.
3. **Skills encode procedure** — Agent- or operator-facing “how to build/validate intent surfaces” lives in `.cursor/skills/` (e.g. intent-driven canvas, view registry design). Skills are **not** the runtime renderer; they instruct humans and tools.
4. **Legacy layouts are quarantined** — Historical JSX/layout work that predates intent-generated surfaces is moved to `client/legacy-ui-reference/` when retired. See that folder’s README.
5. **Prompts stay out of UI** — Compiled prompts and policy come from prompt runtime / site config (see `PROMPT_RUNTIME_GOVERNANCE.md`).

## Browser entry plane (cross-cutting)

Canvas **content** is governed by intent, views, and `/api/canvas-control` syscalls. **Browser navigation** into the AI OS is a separate concern: today multiple client routes can still act as entry authorities. The **hard direction** is that **only API-resolved navigation** may define allowed OS entry; a **single browser gateway** (planned: `/canvas/*`) will become the sole entry, with legacy paths as transitional adapters. See **`LOGICAL_ROUTE_REGISTRY.md` § Two planes: syscall authority vs browser entry authority** and **`BROWSER_GATEWAY_CONTRACT_V1.md`** (invariant: gateway valid only after server resolution; entry audit).

## Relationship to archived specs

`docs-governance/archive/INTENT_DRIVEN_CANVAS_SPEC.md` remains a **historical** description of intent-first idle + menu synergy. This document **supersedes** it for **authoring policy** (what may ship on the canvas). Update code references to prefer this file for new work.

## Verification (for PRs)

- [ ] No new imports from `client/legacy-ui-reference/` into `client/src/` production paths.
- [ ] New routes/views reference logical ids where applicable.
- [ ] Voice hot paths unchanged without voice governance review.

## Related

- `docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md` — syscall vs browser entry plane; planned `/canvas/*` gateway
- `docs-governance/canonical/BROWSER_GATEWAY_CONTRACT_V1.md` — gateway inputs, authoritative state, audit, anti-patterns
- `docs-governance/canonical/PLATFORM_CAPABILITY_MILESTONE_V1.md` — M1 vs M2 milestone split
- `docs-governance/canonical/VIEW_REGISTRY.md`
- `docs-governance/canonical/ACTION_REGISTRY.md`
- `docs-governance/canonical/APP_SHELL_CONTRACT.md`
- `docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md` — syscall-backed generative UI (palette, patch/action contracts, `dynamic` / `show_canvas` policy); **§ Intent-to-surface derivation** — UI from actor × lifecycle × domain journey × swarm role × entitlements (utterance refines only)
- `docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md` — formal intent-as-loop spec, merge order, phased resolver (A–D), Cursor skill/rule pointers
- `docs-governance/canonical/COMMAND_CENTER_SURFACE_SPEC_V1.md` — first composed canvas surface (slots, component classes, patch/action by slot, narration, operator trace)
- `docs-governance/canonical/PROMPT_RUNTIME_GOVERNANCE.md`
- `.cursor/skills/intent-driven-canvas/SKILL.md`
- `.cursor/skills/shadcn-ui-agent/SKILL.md`
- `docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md` — canvas is an OS tool; MCP + tokens; classification matrix for reviews
