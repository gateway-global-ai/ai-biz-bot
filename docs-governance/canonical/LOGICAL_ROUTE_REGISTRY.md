---
status: canonical
truth_domain: governance
enforced_by: logical-route-registry.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---

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
- `public.demo.redirect` — short URL `/demo` → browser redirect to `/biz/:slug`; `requiredContextKeys`: none; `optionalBrowserPath`: `/demo`; canonical public business chrome (see [`DEMO_SURFACE_V1_SLICE.md`](../../docs/product/DEMO_SURFACE_V1_SLICE.md)).
- `public.business.by_slug` — customer entry `/biz/:slug`; `GET /api/site-configs/by-slug/:slug`; attaches soft `readiness_gate_v1`; `requiredContextKeys`: `slug`.
- `public.agent.by_slug` — owner/operator entry `/agent/:slug` (same `business` contract as `/biz` via `buildConciergeBusinessFromSite`); `requiredContextKeys`: `slug`.
- `admin.tools.readiness_gate_v1` — `GET /api/v1/admin/readiness-gate-v1/metrics`; platform admin session; optional browser path `/platform/tools/readiness-gate`.

## Retired HTTP surfaces (v1 discipline)

These are **not** logical customer routes; documented so agents do not “repair” dead contracts.

- **`GET /api/admin/sites/leads`** — **410 Gone** (2026-03-25). VLM prospect merge removed from v1; client [`SitesAndLeads`](../../client/src/pages/owner/SitesAndLeads.tsx) handles 410. Prefer site summaries + governed operator tooling.
- **`POST /api/mcp/code`** — **410 Gone** (2026-03-25), same policy as `/api/mcp/tools` and `/api/mcp/tools/:toolName`.

## Rules
- No browser route may exist without a logical route id.
- Browser paths are adapters, not the source of truth.
- No route may bypass policy gates.
- No route may be created without declared context requirements.
- Route definitions must reference approved views and allowed actions.
