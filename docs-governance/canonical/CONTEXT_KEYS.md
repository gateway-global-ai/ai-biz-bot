---
status: canonical
truth_domain: schema
enforced_by: schema-anchor-registry.mdc
backed_by:
  schema: true
  service: false
  route: false
last_verified: 2026-03-25
---
# Context Keys

## Purpose
Context keys define the currently active scope for routing, view selection, policy evaluation, and action execution.

## Core context keys
- `customerAccountId`
- `siteConfigId`
- `agentId`
- `customerId`
- `sessionId`
- `orderId`
- `inquiryId`
- `chatLogId`

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
