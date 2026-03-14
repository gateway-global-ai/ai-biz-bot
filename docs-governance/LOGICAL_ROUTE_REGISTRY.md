# Logical Route Registry

## Purpose
Define OS navigation in logical route ids before browser paths are introduced.

## Route fields
Each route definition should declare:
- `routeId`
- `domain`
- `requiredContextKeys`
- `requiredRoleScope`
- `requiredVerificationState`
- `policyGate`
- `renderMode`
- `linkedViewId`
- `allowedActions`
- `optionalBrowserPath`

## Example route ids
- `os.home`
- `admin.home`
- `admin.accounts.list`
- `admin.businesses.detail`
- `admin.agents.detail.behavior`
- `verification.sessions.detail`
- `billing.orders.detail`
- `support.entry`

## Rules
- No browser route may exist without a logical route id.
- Browser paths are adapters, not the source of truth.
- No route may bypass policy gates.
- No route may be created without declared context requirements.
- Route definitions must reference approved views and allowed actions.
