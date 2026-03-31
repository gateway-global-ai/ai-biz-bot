---
status: canonical
truth_domain: governance
enforced_by: view-and-action-registry.mdc
backed_by:
  service: server/routes/canvasControlRoutes.ts
  contract: shared/canvasViewContract.ts
last_verified: 2026-03-28
---

# Demo 0 — Governed Canvas Proof

This document defines **Demo 0**: the first production-safe vertical slice that proves the governed canvas operating model end-to-end. It is an **architecture / engineering gate**, not the hospitality or sales product demo.

**Scope:** Concierge Live → `VoiceTurnOrchestrator` → `POST /api/canvas-control` → `canvasIntentRouter` + `canvasDirectiveValidator` → pinned canvas → grounded voice. See [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) (canvas syscall views), [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) (`customer.concierge.live_canvas`).

**Non-goals for Demo 0:** Cloudbeds breadth, transactional hospitality, new browser routes as authority, or model-selected arbitrary URLs.

## Website-chat deferral (Phase 2)

**Canvas-synced interaction (pinned canvas + syscall truth) is supported only in Concierge Live** for Phase 0–1 unless a later governance task extends this.

The **`StandardizedChatInterface`** path (`POST /api/website-chat`) does **not** participate in the canvas syscall chain in Demo 0. It remains **text-oriented** for sites that use it; it **must not** be treated as an alternate source of canvas truth until explicitly bridged under the same `POST /api/canvas-control` contracts in a dedicated Phase 2 task.

Rationale: one boring, provable path first; avoids parallel implementation and split UI truth.

## Operator runbook

1. **Running API:** Start the app (e.g. `doppler run -- npm run dev`) so `POST /api/canvas-control` is available.
2. **Demo site:** Use a `site_config` with non-empty `faqs` / service menu data so `faq_list` / `service_menu` hydration is visibly distinct. Example: `npm run setup:boardwalk` / `provision:boardwalk` (see repo scripts) to seed a demo property.
3. **Voice:** In Concierge Live, speak a Tier-1 phrase (e.g. “what services do you offer”, “faq”) and confirm pinned canvas + assistant narration order.
4. **Automated gate:** `npm run demo0:canvas-proof` (calls the API; requires `DATABASE_URL` for site resolution).

## AC6 — Transition explainability artifact

For governance and audits, capture **two** traces: **one success** and **one failure** (HTTP validation failure or Tier-3 `noop`).

| Field | Success example source | Failure example source |
| ----- | ---------------------- | ---------------------- |
| Transcript / request | User phrase or `payload.transcript` | Same, or malformed envelope |
| Tier / rule | `result.reason` from `canvas.resolve` (e.g. `Tier 1 matched intent`) | `Tier 3 fallback` or N/A for `400`/`403` |
| `selectedViewId` | `result.selectedViewId` | undefined or error body |
| Entitlement / security | `canvasDirectiveValidator` + `siteRuntime.entitlements` | `403` body `error` code (e.g. `VIEW_NOT_ALLOWED`) |
| Hydration | Client `VoiceTurnOrchestrator.hydrateViewPayload` (not re-sent in HTTP resolve response) | N/A |
| Pinned canvas | `TypedCanvasView` / `setPinnedCanvas` after `canvasController.apply` | No pin / unchanged |
| Speech grounding | `SpeechGroundingContext` / `canvas_grounding` after commit | Error or ungrounded path |

**Template (copy per run):**

```
trace_id: <uuid>
outcome: success | noop | http_4xx
transcript: <string>
tier_rule: <string from result.reason or router>
selected_view_id: <string | null>
http_status: <number>
error_code: <string | null>
notes: <hydration + pin + grounding observed in browser or from script output>
```

The harness script prints JSON suitable for pasting into this template.

## Related

- [`server/services/canvasIntentRouter.ts`](../../server/services/canvasIntentRouter.ts) — Tier 1 patterns
- [`client/src/services/voiceTurnOrchestrator.ts`](../../client/src/services/voiceTurnOrchestrator.ts) — client orchestration
- [`client/src/components/chat/ConciergePanel.tsx`](../../client/src/components/chat/ConciergePanel.tsx) — pin path (governed)
