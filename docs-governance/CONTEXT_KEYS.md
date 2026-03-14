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
