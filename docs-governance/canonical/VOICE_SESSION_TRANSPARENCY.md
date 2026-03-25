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
# Voice session transparency (execution-plane safe)

## Purpose

Record **`voice_session_connect`** events for **audit and statistics** when a browser opens a **Gemini Live** WebSocket with a resolved **site identity anchor**, **without** synchronous database writes on the audio or streaming hot path.

This aligns with [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](EXECUTION_PLANE_BOUNDARY_SPEC.md): observability must be **low-overhead**; **no** `await db.insert` inside per-frame handlers.

## Event shape (`passage_kind = voice_session_connect`)

Rows are stored in the same append-only table as HTTP gate events: **`verification_gate_passage_events`**.

| Field | Value |
|-------|--------|
| `passage_kind` | `voice_session_connect` |
| `route` | `/ws/gemini-live` (canonical browser voice entry) |
| `http_method` | `WEBSOCKET` |
| `site_config_id` | From client `setup.sessionContext.siteConfigId` |
| `auth_state` | `unknown` until JWT/guest token is plumbed into the WS (future) |
| `client_fingerprint_hash` | Same peppered contract as HTTP — [`server/utils/clientFingerprint.ts`](../server/utils/clientFingerprint.ts) |
| `metadata` | `{ "voiceSessionId": "<uuid>", "transport": "websocket" }` — **no** audio, **no** prompts |

## Async pipeline

1. **Enqueue** once per connection when identity anchor + `sessionId` are first set — [`server/geminiVoice.ts`](../server/geminiVoice.ts) (setup message only, not audio loop).
2. **Flush** via [`server/services/gatePassageAsyncQueue.ts`](../server/services/gatePassageAsyncQueue.ts): batched / interval `recordVerificationGatePassage` calls.

## Related

- HTTP gate: [`VERIFICATION_GATE_TRANSPARENCY.md`](VERIFICATION_GATE_TRANSPARENCY.md)
- Fingerprint + pepper: `CLIENT_FINGERPRINT_PEPPER` in environment (see verification gate doc)
