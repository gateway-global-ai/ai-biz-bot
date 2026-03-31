---
status: canonical
truth_domain: governance
enforced_by: shadcn-ui-agent skill, UI_COMPONENT_APPROVAL_REGISTRY, canvas syscall validators (runtime)
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
---

# Shadcn MCP — Design-Time vs Runtime Plane (v1)

## One-sentence truth

**Shadcn MCP is part of the governed design-time / tooling plane (Cursor, local coding-agent workflows), not a first-class dependency of the live voice-first customer runtime.**

Do not describe it as if Gemini voice agents, swarm provisioning, or skill deployment automatically query MCP to compose production UI.

## What exists today

| Plane | Role of Shadcn MCP |
|-------|---------------------|
| **Design-time** | **Discovery / normalization** — browse components via MCP (see [`.cursor/skills/shadcn-ui-agent/SKILL.md`](../../.cursor/skills/shadcn-ui-agent/SKILL.md)); evaluate against SDK manifest and `@/ui-core`; **human-gated promotion** into Sovereign wrappers, [`@gateway/canvas-sdk`](../../packages/canvas-sdk/README.md), registry YAML. |
| **Runtime (customer OS)** | **No MCP catalog calls.** Governed behavior uses **registered `CanvasViewId`s**, **typed payloads**, **`canvas.*` syscalls**, **validators**, and restricted `dynamic` paths — see [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md). |

## What does **not** exist today (production runtime)

- No path where **Gemini / voice** queries Shadcn MCP for a component list per view.
- No **swarm provisioning** (`provisionAgentsForBusiness`, templates, schematics) that composes interfaces from MCP-discovered components.
- No **skill deployment** route that selects UI from an MCP catalog at runtime.
- No **aptitude** gate that asserts “this surface originated from Shadcn MCP” — aptitude today checks **jurisdiction / allowed domains** for coding agents where applicable, not MCP provenance.
- No end-to-end automated pipeline: *generate surface → resolve catalog → promote → bind view contract → enforce at render* **driven by MCP at runtime**.

## Forward-safe framing (runtime customization)

**Runtime customization is not “the agent picks components from MCP.”**

**Runtime customization is:** the agent (and orchestration) **select among already-approved, registered, typed OS surfaces** — [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md), [`shared/canvasViewContract.ts`](../../shared/canvasViewContract.ts), entitlements — with syscall validation.

## If product behavior needs “catalog-driven” UI later

Introduce a **new governed integration layer** — likely **build-time** or **admin-approved** — that still:

1. Promotes through [`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md)
2. Never bypasses registered view contracts
3. Never bypasses syscall / validator rules
4. Never allows **freeform** MCP output at live render time

## Related

- [`WORKSPACE_MCP_PLANE_BOUNDARY_V1.md`](./WORKSPACE_MCP_PLANE_BOUNDARY_V1.md) — Google Workspace MCP is API/tooling, **not** UI generation; do not conflate MCP servers
- [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md)
- [`AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`](./AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md)
- [`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md)
