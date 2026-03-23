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
- `admin.analytics.voice_activation` — read-only aggregates from `verification_gate_passage_events` (`voice_client_heartbeat`); API `GET /api/v1/admin/analytics/voice-activation`; requires platform admin session; optional browser adapter on `/platform/businesses/:id` (Overview tab widget).
- `dev.ui_kit` — developer UI component kit (`/dev/ui-kit`); optional browser path; requires dev or `VITE_UI_KIT`; see [UI_KIT.md](./UI_KIT.md)
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
