---
status: canonical
truth_domain: runtime
enforced_by: none
backed_by:
  schema: false
  service: true
  route: false
last_verified: 2026-03-25
---
# Verification gate transparency (governing rule)

## Purpose

**Transparency** requires that we can account for **who touched verification surfaces**, including **failed or anonymous** attempts. The verification **gate** is therefore not only an OTP wall: it is the **instrumented boundary** where we:

1. **Record** every HTTP passage (success, failure, missing auth, rate limit) in an **append-only** log.
2. **Enforce** baseline **rate limits** at that boundary (expandable to Redis in multi-instance deployments).
3. **Avoid** storing raw IP addresses — we persist **SHA-256(pepper + normalized IP + User-Agent + optional site scope)** (`server/utils/clientFingerprint.ts`). **Pepper:** set `CLIENT_FINGERPRINT_PEPPER` in Doppler (rotate by changing pepper; mixed generations may coexist briefly in analytics). **IPv6:** normalized to RFC 5952 canonical form; IPv4-mapped IPv6 collapsed to IPv4.

This document is the **control-plane rule** that complements product knobs (skills, `verificationPolicy` steps) in [`NOVA_VERIFICATION_GOVERNANCE.md`](NOVA_VERIFICATION_GOVERNANCE.md).

## Always-on gate (HTTP)

For **governed verification routes**, the gate middleware is **always applied**:

| Surface | Routes | Passage kind |
|--------|--------|----------------|
| Remote / installation API | `POST /api/v1/verification/guest/*` | `api_v1_verification` |
| Browser / Nova guest | `POST /api/nova/guest/verify/*` | `nova_guest_http` |
| Voice (Gemini Live WS) | WebSocket `/ws/gemini-live` (identity anchor set) | `voice_session_connect` |

Every HTTP response above, including **401**, **403**, **429**, and **400**, completes a row in **`verification_gate_passage_events`**. Voice connect events are **queued and flushed asynchronously** (see [`VOICE_SESSION_TRANSPARENCY.md`](VOICE_SESSION_TRANSPARENCY.md)).

**Broader scope:** Concierge shell, chat, or other non-verification routes may add further passage kinds later.

## Data model

- **Table:** `verification_gate_passage_events` (see [`SCHEMA_ANCHOR_REGISTRY.md`](SCHEMA_ANCHOR_REGISTRY.md) anchor `verificationGatePassageEvents`).
- **Fields (conceptual):** `site_config_id` (nullable if unknown), `route`, `http_method`, `passage_kind`, `auth_state`, `installation_key_id` (nullable), `http_status`, `client_fingerprint_hash`, `duration_ms`, `rate_limited`, `metadata`, `created_at`.

## Rate limiting

- **Without Redis:** in-memory sliding window per composite key — **per Node process** (per replica in K8s).
- **With Redis:** set `VERIFICATION_GATE_REDIS_URL` — fixed **60s** window using **INCR + EXPIRE** (global across pods). Falls back to memory if Redis errors.
- **Default cap:** `VERIFICATION_GATE_MAX_PER_WINDOW` per window per bucket (default **120**).

## Configuration

| Variable | Meaning |
|----------|---------|
| `CLIENT_FINGERPRINT_PEPPER` | Secret mixed into fingerprint hashes (recommended in production). |
| `VERIFICATION_GATE_MAX_PER_WINDOW` | Max verification gate requests per fingerprint bucket per 60s window (default `120`). |
| `VERIFICATION_GATE_REDIS_URL` | Optional Redis URL for **global** rate limits across instances. |

## Related code

| Piece | Path |
|-------|------|
| Middleware | `server/middleware/verificationGateTransparency.ts` |
| Recording | `server/services/verificationGateTransparency.ts` |
| Fingerprint | `server/utils/clientFingerprint.ts` |
| Rate limit | `server/utils/verificationGateRateLimit.ts` |
| Voice async queue | `server/services/gatePassageAsyncQueue.ts` |

## Policy vs gate

- **`verificationPolicy`** (owner / agent config): declares **how strict** identity should be (steps, level) for product flows.
- **Skills** (`verification_guest_phone`, etc.): turn **tool-level** OTP requirements on for PMS and related paths.
- **Gate transparency** (this doc): ensures **measurement and abuse resistance** on verification **HTTP** endpoints regardless of those knobs — so statistics and limits stay **complete** at the boundary.
