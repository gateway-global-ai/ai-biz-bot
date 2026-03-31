---
status: canonical
truth_domain: schema
enforced_by: schema-anchor-registry.mdc
backed_by:
  schema: true
  service: false
  route: false
last_verified: 2026-03-30
---
# Context Keys

## Purpose
Context keys define the currently active scope for routing, view selection, policy evaluation, and action execution.

## Core context keys
- `customerAccountId`
- `siteConfigId` — **sole authoritative internal scope** for a business/site (`site_configs.id`, UUID). Full contract: [`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`](./SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md). Google `place_id`, vendor property IDs, and other foreign keys are **reference attributes only** — never substitutes for `siteConfigId` in routing, auth, joins, or runbooks.
- `agentId`
- `customerId`
- `sessionId`
- `orderId`
- `inquiryId`
- `chatLogId`

## AI Design Studio (Chad pipeline)

See [`AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`](./AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md). Additional keys used by `design_studio.*` actions:

- `designProjectId` — active studio project (create via `design_studio.new_project`)
- `design_handoff` — payload shape [`DesignHandoffPayload`](../../shared/designStudioHandoff.ts) on entry
- `nextPhaseKey` — 8-phase engine transition (`design_studio.advance_phase`)
- `planVersion` — approved plan revision (`design_studio.approve_plan`)
- `themeProfileId` — token bundle id only, never raw hex (`design_studio.commit_theme`)

## Phased industry funnel (sales_funnels.conversationWorkflow)
- `owner_salon_name` — salon business name (owner acquisition flows)
- `owner_city` — city / state for localized demo
- `demo_ready` — owner acknowledged or requested personalized demo (`1` / `true`)

Resolved server-side with `resolveCurrentPhase` — see [PHASED_INDUSTRY_FUNNEL_SPEC.md](./PHASED_INDUSTRY_FUNNEL_SPEC.md).

## Usage rules
- A logical route must declare the context keys it requires.
- A view must not render actions that require unavailable context keys.
- Safe Mode restricts navigation and mutation to the current context scope.
- The Menu Resolver uses context keys to derive valid child routes and suggested actions.
- Execution handlers must validate required context keys before mutating state.

## Examples
- Editing behavior for an agent requires at minimum: `siteConfigId`, `agentId`
- Reviewing a verification session requires at minimum: `sessionId`
- Rendering a business workspace requires at minimum: `siteConfigId`

## Related
- [`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`](./SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md) — canonical identity vs external references; forbidden patterns; migration shim rules; repo checks
