---
status: draft
truth_domain: governance
enforced_by: logical-route-registry.mdc
backed_by:
  schema: false
  service: false
  route: true
last_verified: 2026-03-28
---

# Browser Gateway Contract (v1)

## Purpose

Specify the **browser entry plane** for the governed AI OS: the planned single gateway (e.g. `/canvas/*`) must not become “a nicer URL.” It is the **sole browser ingress** where **authority** is **API-resolved**, not client-reconstructed.

This document is the **contract skeleton** before implementation. **`POST /api/canvas-control`** remains the syscall authority; **entry resolution** is a separate API concern (see [LOGICAL_ROUTE_REGISTRY.md](./LOGICAL_ROUTE_REGISTRY.md) § Two planes).

## Core invariant (non-negotiable)

> **A gateway browser path is only valid when the server has resolved it.** The client may render from an **authoritative server response**; it must not infer OS routing authority from URL shape, local state, or parallel route trees alone.

Renaming routes to `/canvas/*` **without** server-side resolution **renames the problem**; it does **not** fix parallel routing power.

## Anti-patterns

- **Decorative gateway** — `/canvas/*` loads a shell that still decides logical route, tenant, or allowed views from client-only heuristics.
- **URL as authority** — Treating path segments as sufficient to know `routeId` / policy without a resolver response.
- **Duplicate resolution** — Client “rehydrates” entry state differently than the API that admitted the session.

## Contract outline (to be finalized in implementation)

### 1. What the gateway URL carries (inputs)

Examples only; exact names are implementation details:

- **Opaque entry token** (preferred for some flows) and/or
- **Public identifiers** (e.g. business slug, agent scope) and/or
- **Query parameters** (campaign, QR provenance, `from=` — must feed resolver, not client shortcuts)

**Rule:** Raw URL data are **hints** to the resolver, not proof of authority.

### 2. What the API resolves (authoritative)

The resolver (dedicated `GET`/`POST` or composed calls) must return at minimum:

| Field | Role |
|--------|------|
| **logicalRouteId** | Registered id per LOGICAL_ROUTE_REGISTRY |
| **allowedSurface** / **linkedViewId** | Permitted view contract |
| **siteConfigId** / **tenant context** | As required by policy |
| **initialCanvasState** (or pointer) | What the shell may show first, syscall-compatible |
| **policy gates satisfied** | Verification, readiness, admission as applicable |
| **session binding** | Visitor/session correlation for audit |

Until this response exists, the client must not treat the OS as **entered** for governance purposes.

### 3. What the client may infer (minimal)

- **Presentation only:** layout, loading states, non-authoritative UI chrome.
- **Not allowed:** choosing a different logical route, bypassing denied views, or fabricating tenant context not present in the response.

### 4. Legacy adapters

When `/biz/:slug` or `/agent/:slug` redirects or forwards into the gateway, the **resolver** must record **adapter source** (see audit). Adapters do not grant extra authority.

## Entry-resolution audit & provenance (required when implemented)

When a session is admitted through the gateway, log (or structured audit row):

- Requested raw path / query / token (hashed or truncated per PII policy)
- **resolvedLogicalRouteId**
- **siteConfigId** / tenant identifiers as allowed
- **allowed views** or surface id set
- **adapterSource** — `direct_gateway` | `legacy_biz_slug` | `legacy_agent_slug` | other registered enum
- **correlation id** — align with canvas syscall and voice turn logs where applicable

This supports later compliance and debugging (“who entered how, under what resolution”).

## Implementation sequence (narrow)

1. **Freeze this contract** — Adjust fields only via governance review.
2. **Thin loader** — One route, one resolver call, one authoritative bootstrap payload; no full migration.
3. **Wire audit** — Entry events as above.
4. **Legacy adapters** — Redirect/translate; preserve `adapterSource`.
5. **Remove parallel client authority** — After parity.

## Related

- [PLATFORM_CAPABILITY_MILESTONE_V1.md](./PLATFORM_CAPABILITY_MILESTONE_V1.md) — **M2** milestone; resolver artifact tests required from day one
- [LOGICAL_ROUTE_REGISTRY.md](./LOGICAL_ROUTE_REGISTRY.md)
- [INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md](./INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md)
- `POST /api/canvas-control` — [canvasControlRoutes.ts](../../server/routes/canvasControlRoutes.ts) (syscall plane; distinct from entry resolution)
