---
status: canonical
truth_domain: governance
enforced_by: logical-route-registry.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-29
---

# Logical Route Registry

## Purpose
Define OS navigation in logical route ids before browser paths are introduced.

## Two planes: syscall authority vs browser entry authority (normative)

The governed AI OS distinguishes **two** routing layers. Both must eventually be API-authoritative; today only the first is fully enforced.

### Already governed: canvas syscall plane

- **`POST /api/canvas-control`** — Canvas Control syscall layer (`server/routes/canvasControlRoutes.ts`, `shared/canvasViewContract.ts`, `canvasDirectiveValidator`, `canvasIntentRouter`, audit).
- **Authority:** Only this endpoint may validate and commit canvas mutations and syscall-shaped navigation (`canvas.resolve`, `canvas.render`, etc.) per policy.

### Not yet governed: browser entry plane

- **Today:** Multiple browser entries (`wouter` routes in `client/src/App.tsx`, e.g. `/biz/:slug`, `/agent/:slug`, and many others) behave as **parallel authorities** for “what screen loads.” Deep links can bypass the same resolver logic the API would use for a single gateway.
- **Gap:** Client-side route trees must **not** remain the long-term source of truth for **which OS surface, state, and logical route** the user is allowed to enter.

### Hard architectural rule (future-enforced)

> **Only the governed API may resolve what surface, state, and route the AI OS is allowed to enter.** Client-side paths may not independently define OS routing authority. Legacy browser paths may exist **only** as transitional **adapters** into the governed gateway, not as authorities.

### Planned: single browser gateway (`/canvas/*`)

- **`/canvas/*`** is the **planned sole browser entry** into the governed AI OS customer/operator shell (exact path prefix may be finalized in implementation; the invariant is **one gateway**, not the literal string).
- **API-resolved navigation:** The browser must not be the authority for valid page, shell, or authoritative state. The server (or a dedicated resolver API) must return: logical route id, allowed surface/view contract, tenant/site context, and initial canvas state as applicable.
- **Logical routes remain primary:** Logical `routeId` and registry-linked `viewId` / actions remain the contract; the browser gateway is the **adapter** that loads only after server resolution.

### Legacy routes as adapters (transition)

- Paths such as **`/biz/:slug`** and **`/agent/:slug`** may **redirect or translate** into the governed gateway until parity is proven; they must **not** remain primary authorities for OS entry behavior indefinitely.

### Implementation sequence (non-blocking documentation)

1. **Document** — This section + cross-link in `INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md` (syscall vs browser plane).
2. **Define browser gateway contract** — See [`BROWSER_GATEWAY_CONTRACT_V1.md`](./BROWSER_GATEWAY_CONTRACT_V1.md): inputs, authoritative response, client inference limits, entry audit. **Invariant:** gateway path valid only after server resolution (not client-reconstructed authority).
3. **Thin `/canvas/*` loader** — Prove server-resolved entry without a full client rewrite.
4. **Adapter legacy routes** — Redirect or translate into `/canvas/*` (or final gateway path); log `adapterSource` per contract.
5. **Deprecate parallel client authority** — Remove or narrow direct shell entry from arbitrary routes once parity holds.

**Related runtime today:** `POST /api/canvas-control` (syscall); site/business context often via `GET /api/site-configs/...` — gateway resolution may compose these and new resolver endpoints.

**Milestone split:** [`PLATFORM_CAPABILITY_MILESTONE_V1.md`](./PLATFORM_CAPABILITY_MILESTONE_V1.md) — **M1** proves governed execution in a verified environment; **M2** implements browser gateway + resolver (law in code).

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
- `dev.shadcn_io_catalog` — unofficial merged shadcn.io component + blocks directory (`/dev/shadcn-io-catalog`); static JSON from `client/public/shadcn-io/merged_catalog.v1.json`; design-time reference only; see [`SHADCN_IO_COMMUNITY_MIRROR_V1.md`](../artifacts/SHADCN_IO_COMMUNITY_MIRROR_V1.md)
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
- `admin.platform.readiness` — `GET /api/platform/readiness`; operator Bearer session (`requireAuth`); returns governed system readiness JSON (`schemaVersion: 4`, provenance, tri-state catalog, `criticalBlockers`, `executionReadiness`); same builder as `npm run system:check -- --json`; see [`SYSTEM_READINESS_CHECK_V1.md`](./SYSTEM_READINESS_CHECK_V1.md).
- `operator.integration.connect` — SMS deep-link → signed connect token → narrow owner web surface (`/connect/:vendor` adapter) → Cloudbeds OAuth and/or API key submission; **not** general login; see [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md).
- `customer.concierge.live_canvas` — **logical** customer canvas plane for **Concierge Live** (PTT → transcription → `VoiceTurnOrchestrator` → `POST /api/canvas-control`). **Authority:** syscall envelope + `canvasIntentRouter` + `canvasDirectiveValidator`; **not** `wouter` paths. Linked `viewId`s include `welcome`, `service_menu`, `faq_list`, and other `CanvasViewId` values allowed for the site plan. Demo 0 proof: [`DEMO0_GOVERNED_CANVAS_PROOF.md`](./DEMO0_GOVERNED_CANVAS_PROOF.md).

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
