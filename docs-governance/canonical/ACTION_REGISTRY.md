---
status: canonical
truth_domain: runtime
enforced_by: view-and-action-registry.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---
# Action Registry

## Purpose
Define executable operations available from views and routes.

The Action Registry works closely with `docs-governance/ACTIONABLE_EVENTS_MODEL.md`, which classifies business/provider data into governed event types before they become executable routes or actions.
It also works with `docs-governance/UI_ELEMENT_REGISTRY.md` when inbound actions need to guide or focus the interface safely.
State-changing actions must additionally comply with `docs-governance/GOVERNED_STATE_MUTATION.md`.
Infrastructure-facing state changes must additionally comply with `docs-governance/RUNTIME_CONTROL_GOVERNANCE.md`.

## Action fields
Each action should declare:
- `actionId`
- `allowedEntities`
- `requiredContextKeys`
- `requiredPolicy`
- `mutationLevel`
- `domainHandler`
- `requiresConfirmation`
- `safeModeBehavior`

## Mutation levels
- `none`
- `read_only`
- `controlled`
- `sensitive`

## Example
`agent.updateBehavior`
- allowed entity: `agents`
- required keys: `siteConfigId`, `agentId`
- mutation level: `controlled`
- requires confirmation: optional depending on field group

## Site config — sales funnels (phased industry)

`siteConfig.patchSalesFunnels`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, authenticated session
- mutation level: `controlled`
- domain handler: `PATCH /api/site-configs/:id/funnels` (Zod-validated `sales_funnels` array)
- requires confirmation: no

`siteConfig.applyIndustryFunnelTemplate`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `templateId` (e.g. `nail_salon_v1`)
- mutation level: `controlled`
- domain handler: `POST /api/site-configs/:id/funnels/apply-template`
- requires confirmation: no (idempotent append; duplicate template skipped)

## Rules
- No executable mutation may exist only inside a UI file.
- Every action must map to a domain handler and policy expectation.
- Safe Mode must affect whether an action is available or requires promotion.
- Data-heavy provider fields should be normalized into actionable events before being exposed as routes, actions, or handoffs.
- UI-driving actions must resolve through the UI Element Registry rather than hardcoded DOM knowledge.
- AI-driven state mutation must be visible, policy-gated, and auditable.
