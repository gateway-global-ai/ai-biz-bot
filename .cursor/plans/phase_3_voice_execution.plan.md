# Phase 3 execution — hot path + governance heartbeat (refined)

## Decisions locked in

### 1. AudioContext: local binding for `close()` (TS2531)

In `disconnect()`, use a **local `const`** for each context before `await ctx.close()` so:

- TypeScript narrows non-null correctly.
- The reference cannot change between check and `await` (async safety).

### 2. `BusinessContext.hours` for query strings

In `fetchEnrichedSystemInstruction`, normalize before `URLSearchParams.set`:

`Array.isArray(h) ? h.join('; ') : String(h)` (or equivalent) so the enriched-instruction route always receives a single parseable string.

### 3. `liveService.ts` — quarantine vs delete

**Grep result:** [`client/src/components/WebsitePreview.tsx`](client/src/components/WebsitePreview.tsx) still imports `LiveVoiceClient` from [`client/src/services/liveService.ts`](client/src/services/liveService.ts).

- **Do not delete** `liveService.ts` until `WebsitePreview` is migrated to `VoiceClientFactory` / `IVoiceClient` (or another supported path).
- **Minimal fix** to get `tsc` green: fix broken `../types` import, type `tools` as `unknown[]` or a minimal structural type, and align `AudioContext` checks (same patterns as `GeminiStreamingClient` or a one-line `as string` boundary for `state` only in deprecated code).

### 4. Verification “voice heartbeat” (governance link)

**Placement:** Fire **once** when the session is truly live: after handling `message.type === 'server_ready'` **and** `setupAudioProcessing()` succeeds (same block where `this.connected = true` today in [`GeminiStreamingClient.handleMessage`](client/src/services/voice/GeminiStreamingClient.ts)).

**Not** on raw WebSocket `onopen` alone — the code already waits for `server_ready` before marking connected.

**Payload note:** `VoiceConfig` does **not** include `siteConfigId`. Store `business.id` from `connect(business, …)` on a private field (e.g. `sessionSiteConfigId`) for the heartbeat body.

**Implementation pattern (fire-and-forget, non-blocking):**

```ts
void fetch('/api/v1/verification/session_heartbeat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    siteConfigId: this.sessionSiteConfigId,
    transport: 'websocket',
  }),
  keepalive: true,
}).catch(() => {});
```

**Governance:** Confirm route exists in modular routes + permit script; do not add secrets client-side. Silent failure is intentional so governance never blocks UX.

### 5. `AudioContextState` / `'interrupted'` (Safari)

**Option A — Global type widen (only if TS accepts it)**

Add a **new** declaration file under `client/src/types/` (e.g. `audioContextState-dom.d.ts`) and ensure it is covered by `client/src/**/*` in [`tsconfig.json`](tsconfig.json).

If your TypeScript version reports **duplicate identifier `AudioContextState`**, do not fight `lib.dom` — use Option B.

```ts
// client/src/types/audioContextState-dom.d.ts
export {};

// Widen for Safari and other engines that report "interrupted" before lib.dom catches up.
type AudioContextState =
  | 'suspended'
  | 'running'
  | 'closed'
  | 'interrupted';
```

**Option B — Boundary helper (always safe)**

Keep DOM types as-ship and use a tiny helper used by `resumeAudioContexts` / legacy `liveService`:

```ts
function audioContextNeedsResume(ctx: AudioContext): boolean {
  const s = ctx.state as string;
  return s === 'suspended' || s === 'interrupted';
}
```

**Optional:** add `client/src/vite-env.d.ts` with `/// <reference types="vite/client" />` if you want Vite client types co-located; augmentation can live in `types/*.d.ts` instead — same compiler effect.

---

## Priority table (execution)

| Priority | File | Action |
|----------|------|--------|
| Critical | `GeminiStreamingClient.ts` | Local `ctx` for close; normalize `hours`; optional heartbeat after `server_ready` success; `sessionSiteConfigId` from `business.id` |
| High | `client/src/types/*.d.ts` | Option A or B for `interrupted` |
| Medium | `liveService.ts` | Minimal fix while `WebsitePreview` still imports it |
| Medium | `MapDisplay.tsx` | Library / Places typing (separate pass) |

---

## Todo linkage

- [x] voice-null-close — local binding + close
- [x] voice-hours — normalize for URLSearchParams
- [x] voice-audio-state — boundary helper `audioContextNeedsResume` (Option B)
- [x] liveService-minimal — `LegacyBusinessData`, `tools: unknown[]`, menu length guard
- [x] verification-heartbeat — `POST /api/v1/verification/session_heartbeat` + client after `setupAudioProcessing`
- [ ] maps-pass — MapDisplay / Places (Phase 3b)

---

## Final execution checklist (risk mitigation)

| Task | Implementation detail | Risk mitigation |
|------|------------------------|-----------------|
| Audio safety | `const ctx = this.inputAudioContext` (and output) before `await ctx.close()` | Prevents null dereference during async cleanup |
| Hours normalization | `formatHours(business.hours)` (see below) before `URLSearchParams.set` | Backend always receives a single string for prompt context |
| Heartbeat placement | Post-`server_ready` **and** post-`setupAudioProcessing()` success | “Passage” only when hardware pipeline actually initialized |
| Legacy support | Minimal fix for `liveService.ts` | Keeps `WebsitePreview.tsx` working without a full refactor |

---

## Reference implementation snippets (execute Phase 3 against this)

### `formatHours` (shared or file-local)

Place in [`client/src/services/voice/GeminiStreamingClient.ts`](client/src/services/voice/GeminiStreamingClient.ts) as a **module-private** function, or extract to `client/src/services/voice/formatBusinessHours.ts` if reused.

```ts
/** Normalize `BusinessContext.hours` for query strings and logging. */
function formatHours(hours: string | string[] | undefined): string | undefined {
  if (hours === undefined || hours === null) return undefined;
  if (Array.isArray(hours)) return hours.join('; ');
  return String(hours);
}
```

Use in `fetchEnrichedSystemInstruction` only where a **string** is required:

```ts
const fh = formatHours(business.hours);
if (fh !== undefined) params.set('hours', fh);
```

### `sessionSiteConfigId` + heartbeat guard (class fields)

Add private fields on `GeminiStreamingClient`:

```ts
private sessionSiteConfigId: string | null = null;
private verificationHeartbeatSent = false;
```

### `connect()` — bootstrap session id for the heartbeat

At the start of `connect(business, agent, config)` (after early returns), set:

```ts
this.sessionSiteConfigId = business.id ?? null;
this.verificationHeartbeatSent = false;
```

Also clear these in `disconnect()` (e.g. `this.sessionSiteConfigId = null`; `this.verificationHeartbeatSent = false`) so reconnects behave predictably.

### `handleMessage` — fire heartbeat once after live pipeline

Inside `if (message.type === 'server_ready')`, **after** `await this.setupAudioProcessing()` succeeds and **before** `return`:

```ts
if (!this.verificationHeartbeatSent && this.sessionSiteConfigId) {
  this.verificationHeartbeatSent = true;
  void fetch('/api/v1/verification/session_heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      siteConfigId: this.sessionSiteConfigId,
      transport: 'websocket',
    }),
    keepalive: true,
  }).catch(() => {});
}
```

If `setupAudioProcessing()` throws, **do not** send the heartbeat (metrics stay accurate).

---

## Answer to “generate formatHours + connect() for me?”

**Yes — the snippets above are the canonical spec** for `formatHours`, `connect()` session bootstrap, and heartbeat wiring. No need for a separate handoff: implement Phase 3 by copying these blocks into `GeminiStreamingClient.ts` and adding the server route + permit check separately.

---

## Next step (draft): Usage Dashboard — `voice_client_heartbeat` aggregates

**What this table measures:** Functional voice sessions where the client reported a post–audio-pipeline heartbeat (not raw socket opens). It is **not** token usage; pair with billing/metering tables for cost. Use it for **reliability / adoption / site-level intensity**.

**Base filter**

- `passage_kind = 'voice_client_heartbeat'`
- Optional: `http_status IN (200, 204)` and `rate_limited = false` to exclude abuse throttles.

**SQL sketch (PostgreSQL)**

```sql
-- Heartbeats per site, last 7 days (daily buckets)
SELECT
  date_trunc('day', created_at AT TIME ZONE 'UTC') AS day_utc,
  site_config_id,
  COUNT(*) AS heartbeat_count
FROM verification_gate_passage_events
WHERE passage_kind = 'voice_client_heartbeat'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY heartbeat_count DESC;
```

**Top sites (simple)**

```sql
SELECT site_config_id, COUNT(*) AS sessions
FROM verification_gate_passage_events
WHERE passage_kind = 'voice_client_heartbeat'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY site_config_id
ORDER BY sessions DESC
LIMIT 25;
```

**“Which agents” (indirect):** `verification_gate_passage_events` only has `site_config_id`. Join `site_configs` → `agents` (same `site_config_id`) to label rows with concierge / team agent names for admin display. Assigned primary agent: `site_configs.assigned_agent_id` → `agents.name`.

**Suggested admin API (read-only, later)**

- `GET /api/platform/metrics/voice-heartbeats?from=&to=&siteConfigId=` returning `{ buckets: [...], bySite: [...] }` with auth + policy gate (`platform` / `metrics.read` or equivalent per governance).

**Implementation note:** Add a small route module under `server/routes/` (not `routes.ts` bulk), reuse Drizzle `verificationGatePassageEvents`, and register in the permit-check script when the endpoint exists.

---

## Voice activation analytics — implementation hook (pending “Implement Analytics”)

**Separation of concerns (pinpoint distinction)**

| Signal | Question | Source |
|--------|----------|--------|
| **Usage / activation** | Is the AI OS actually being used (hardware-ready voice)? | `verification_gate_passage_events` where `passage_kind = 'voice_client_heartbeat'` |
| **Consumption** | How much did it cost (tokens, minutes, $)? | Billing / metering tables — **do not** mix into heartbeat aggregates |

**Proposed route (canonical for execution)**

- `GET /api/v1/admin/analytics/voice-activation?days=7` (or `from` / `to` ISO query params)
- **Auth:** admin / platform policy only — register in [`docs-governance/LOGICAL_ROUTE_REGISTRY.md`](docs-governance/LOGICAL_ROUTE_REGISTRY.md) before shipping browser path.
- **Handler file:** [`server/routes/adminAnalyticsRoutes.ts`](server/routes/adminAnalyticsRoutes.ts) (new), mounted from [`server/routes.ts`](server/routes.ts) with a single `app.use(...)` line per modular-routing rules.

**Service layer**

- `getVoiceActivationStats(days: number)` (or date range): aggregates `verification_gate_passage_events` for `voice_client_heartbeat`, optional filters `http_status`, `rate_limited = false`.
- Join **`site_configs`** for **`business_name` / display label** (and **`assigned_agent_id` → `agents.name`**) so admins see names, not raw UUIDs.

**Response shape (time-series friendly)**

```ts
// Example — adjust field names to match VIEW_REGISTRY when implemented
{ series: Array<{ date: string; count: number; siteConfigId: string; siteName: string }> }
```

Grouped by **day + site** for charts; optional second endpoint or query param for “top sites” only.

**Session quality / ops nuance**

- High **`nova_guest_http`** (or related guest passage kinds) **but** low **`voice_client_heartbeat`** for the same `site_config_id` → flags **config, permissions, or UX** issues (guest funnel works; voice never reaches “hardware ready”).
- Document this as a **future composite dashboard** row, not required for v1.

**UI widget (v1)**

- Simple **bar or sparkline** (Lucide + existing chart primitives if present) in [`client/src/pages/admin/PlatformBusinessManager.tsx`](client/src/pages/admin/PlatformBusinessManager.tsx) or the governed admin shell view that already lists businesses.

**Execution trigger:** Say **“Implement Analytics”** to implement server handler + SQL/Drizzle aggregation first, then registry + widget.

**Status (implemented):** `getVoiceActivationStats` in [`server/services/voiceActivationAnalytics.ts`](server/services/voiceActivationAnalytics.ts), [`server/routes/adminAnalyticsRoutes.ts`](server/routes/adminAnalyticsRoutes.ts) (`GET /api/v1/admin/analytics/voice-activation`), logical id `admin.analytics.voice_activation` in [`docs-governance/LOGICAL_ROUTE_REGISTRY.md`](docs-governance/LOGICAL_ROUTE_REGISTRY.md), [`VoiceActivationPulse`](client/src/components/admin/VoiceActivationPulse.tsx) on Platform Business Manager Overview.

---

## Follow-up (not implemented): funnel signal — “activation rate”

**Idea:** Compare guest verification passages to voice heartbeats for the **same** `site_config_id` and **same time window** to flag silent drop-offs (mic/SSL/UX).

**Ratio (refine before production):**

`activation_rate ≈ count(voice_client_heartbeat) / count(nova_guest_http)` per site per window.

**Caveats:**

- `nova_guest_http` is **NOVA guest verification** HTTP traffic, not generic marketing traffic or “Call” clicks. If the product needs “button taps,” add a dedicated passage kind or event source; do not overload this ratio without redefining the denominator.
- Use the **same UTC window** for numerator and denominator; exclude `rate_limited` rows if you want “clean” intent.
- A threshold such as **&lt; 10%** is a **heuristic** — calibrate per tenant/vertical after baseline data.

**Deliverable:** extend dashboard or add `GET .../voice-funnel` returning `{ siteConfigId, guestCount, heartbeatCount, activationRate }` for admin.

---

## Follow-up (not implemented): “Health Alert” worker (0 heartbeats in 24h on previously active sites)

**Goal:** Notify ops (Slack and/or email) when a site that **had** voice heartbeats recently **stops** reporting them for **24+ hours** — possible mic permission regression, SSL, embed breakage, or routing.

**Suggested design (draft only):**

| Piece | Detail |
|----------|--------|
| **Scheduler** | Reuse or extend [`server/taskScheduler.ts`](server/taskScheduler.ts) (or cron) — **not** on the voice hot path. |
| **Definition of “previously active”** | ≥ N heartbeats in rolling **7d** (or **14d**) before the quiet window; N configurable (e.g. 3). |
| **Quiet rule** | 0 `voice_client_heartbeat` rows in last **24h** (`http_status` 200/204, `rate_limited = false`). |
| **Deduping** | One alert per `site_config_id` per **cooldown** (e.g. 72h) via DB flag or `notification_events` table — avoid Slack spam. |
| **Channels** | Slack webhook + email via existing platform notification path (Doppler secrets; no secrets in repo). |
| **Governance** | Register logical action `ops.alert.voice_activation_stall` (or equivalent) in ACTION_REGISTRY; log outbound alerts append-only if required. |

**Execution trigger:** Say **“Implement Health Alerts”** (or similar) when ready to ship this worker; until then this remains backlog spec.

---

## Phase 3 closure

Voice execution plan items for **hot path + transparency + admin analytics** are done. Remaining **third-party** TypeScript debt (Maps, R3F, etc.) is tracked separately from this file.

**Next:** Spatial / Maps workstream — see [`.cursor/plans/phase_4_spatial_maps_skills.plan.md`](phase_4_spatial_maps_skills.plan.md) (Phase 4A–4C, Internal Mode, Olympic itinerary, Multi-Scalar Navigation).
