---
status: canonical
truth_domain: governance
enforced_by: canvas-os-tool-mandate.mdc, VISUAL_INTEGRITY_GOVERNANCE_V1.md (future: sovereign-guard SDK import rules)
backed_by:
  schema: partial
  service: false
  route: false
last_verified: 2026-03-30
---

# UI Component Approval Registry (v1)

## Purpose

**Positive governance:** the right thing is easy; the wrong thing is hard. This registry is the **approval plane** for UI building blocks that may appear on **governed surfaces** (canvas, auth, public shell). It complements negative rules (`VISUAL_INTEGRITY_GOVERNANCE_V1.md`, `CANVAS_OS_TOOL_MANDATE_V1.md`) with **typed, approved primitives** promoted through **`@gateway/canvas-sdk`** and **`@gateway/design-tokens`**.

**Forward-only:** This is **not** a catalog for restyling legacy dashboards or menu-driven apps. **`@gateway/canvas-sdk`** is an **OS surface SDK** for **future runtime-generated, approved interfaces** — see [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md). Engineering energy belongs on the **pipeline that produces new UI** (syscall, view registry, intent loop, SDK promotion), not on repairing deprecated shells unless they remain on a **contaminating** runtime path.

**Review question:** not “does this look okay?” but **“is `component_id` approved for this `surface` with this `variant`?”**

## Relationship to other artifacts

| Artifact | Role |
|----------|------|
| [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) | Runtime **view ids** and syscall-backed surfaces |
| [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) | Executable actions |
| `registry-yaml/ui-components/*.yaml` | **Machine-readable** rows for this registry (v1 examples) |
| [`packages/canvas-sdk`](../../packages/canvas-sdk/README.md) | **SDK export surface** — only approved ids ship here |
| [`STYLE_APPROVAL_POLICY_V1.md`](./STYLE_APPROVAL_POLICY_V1.md) | Style patterns (spacing, radius, motion) — orthogonal to component rows |

## Component record (normative fields)

Each approved component has:

| Field | Description |
|-------|-------------|
| `component_id` | Stable id, e.g. `canvas.system_card`, `auth.otp_form` |
| `status` | `proposed` \| `approved` \| `deprecated` \| `forbidden` |
| `source` | `shadcn_mcp` \| `ui_core_mui` \| `hand_authored_exception` (requires waiver id) |
| `allowed_surfaces` | e.g. `canvas`, `auth`, `app`, `public` |
| `allowed_variants` | e.g. `default`, `compact` |
| `tokens.required` | Semantic token names (see STYLE_APPROVAL_POLICY) |
| `inline_css` | `forbidden` for governed surfaces |
| `custom_tailwind` | `restricted` — only token-mapped utilities |
| `owner` | Owning team / role |
| `last_reviewed` | ISO date |
| `sdk_export` | Name exported from `@gateway/canvas-sdk` when promoted |

## Approval workflow

1. **Propose** — add `registry-yaml/ui-components/proposals/<component_id>.v1.yaml` (or PR with proposal section).
2. **Review harness** — Storybook/gallery or minimal page under `client/` (governance path) demonstrating component + variants.
3. **Token/style check** — passes `STYLE_APPROVAL_POLICY_V1.md` and Visual Integrity baseline.
4. **Approver** — named sign-off in PR or governance queue.
5. **Promote** — move to `registry-yaml/ui-components/approved/`; set `status: approved`.
6. **SDK** — add export to `packages/canvas-sdk/src/` and re-export in `index.ts`.
7. **CI** — future: Sovereign Guard allows imports only from approved SDK paths in governed directories.

**Forbidden:** using a **proposed** or unregistered component id in production canvas paths without an explicit **waiver** row in `CANVAS_OS_TOOL_MANDATE_V1.md` § Waivers.

## Initial approved ids (bootstrap)

These reflect **current** promoted or soon-to-be-wrapped implementations; tighten as SDK wrappers land.

| component_id | status | allowed_surfaces | sdk_export (target) | Notes |
|--------------|--------|------------------|---------------------|--------|
| `auth.unified_otp_form` | approved | auth, public | `UnifiedOtpForm` | Phone/OTP; wraps token-only presentation |
| `canvas.shell_host` | approved | canvas | *(Concierge host — not a leaf component)* | Pinned canvas host remains in `ConciergePanel` until split |

Further rows are added only through the workflow above.

## Related

- [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](./SHADCN_MCP_PLANE_BOUNDARY_V1.md) — Shadcn MCP is design-time discovery, not live runtime catalog for voice/swarm/skills
- [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](./VISUAL_INTEGRITY_GOVERNANCE_V1.md)
- [`CANVAS_OS_TOOL_MANDATE_V1.md`](./CANVAS_OS_TOOL_MANDATE_V1.md)
- [`AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`](./AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md)
- [`registry-yaml/ui-components/`](../../registry-yaml/ui-components/README.md)
