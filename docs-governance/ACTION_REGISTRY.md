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

## Rules
- No executable mutation may exist only inside a UI file.
- Every action must map to a domain handler and policy expectation.
- Safe Mode must affect whether an action is available or requires promotion.
- Data-heavy provider fields should be normalized into actionable events before being exposed as routes, actions, or handoffs.
- UI-driving actions must resolve through the UI Element Registry rather than hardcoded DOM knowledge.
- AI-driven state mutation must be visible, policy-gated, and auditable.
