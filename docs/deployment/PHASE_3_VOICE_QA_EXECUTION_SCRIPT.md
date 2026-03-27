# Phase 3 — Human voice QA execution script

**Goal:** Sign off `GOVERNANCE_EXECUTION_PLAN_V1.md` Phase 3 “Voice QA (narration + stability)” before treating Runtime Trust Parity **A** as closed.

**Scope:** Manual checks with **expected TwiML routing**, **WebSocket targets**, and **log lines** you can grep on the gateway. This is not a substitute for automated tests (`npm run test:guest-tool-phone-binding`, `npm run test:twilio-debugger-normalize`).

**Out of scope for this checklist:** Phase **10c+** policy engine; PSTN **tool execution** parity (Path **B**) — today `server/voiceStream.ts` bridges audio to Gemini Live and appends a telecom trust anchor to the system instruction; it does **not** run `handleToolCall` like `geminiVoice.ts`. See `SESSION_IDENTITY_BINDING_SPEC.md` and execution plan § “Required next (tool plane).”

---

## Prerequisites

| Item | Notes |
|------|--------|
| Environment | `doppler run -- npm run dev` (or production equivalent) with valid `GEMINI_MODEL_ID`, Twilio creds, `APP_URL` public hostname (not localhost for PSTN Media Streams). |
| DB: migrate (`0070`) | Run `npm run db:migrate` so **`migrations/0070_platform_landing_site_config.sql`** is applied and `site_configs.id = platform_landing` exists (`visitor_sessions.site_config_id` FK). Earlier files idempotently skip as already applied — normal. |
| DB: seed (optional) | `npm run db:seed-platform-landing` — richer stored prompt on `platform_landing` on top of the migration baseline (see `server/routes/visitorSessionRoutes.ts` header). |
| Gateway restart | After deploy, restart Node so **`server/geminiVoice.ts`** proxy logic matches the repo (migrations alone do not change the Live proxy). |
| Twilio | Inbound number(s) hit the correct Voice webhook URLs below; signature validation uses the same public URL Twilio sees (`TWILIO_WEBHOOK_SIGNATURE_BASE_URL` if TLS terminates before Node — see `docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md`). |
| Logs | Access to gateway stdout (PM2, Cloud Logging, or terminal). |

**Platform home vs tenant V-B1**

- **`siteConfigId=platform_landing`** (marketing home) is intentional **public Nova + 3 minimal tools** in `geminiVoice.ts` (marketing sentinel — no contextual snap). You will **not** see `canvas_grounding` there; **V-B1** expects a **real business** Concierge route with a resolved site config.
- Smoke (no FK): `GET /api/visitor-session/:visitorId/platform_landing` → **200** + `buyerJourney`; logs must **not** show `[visitorSessionRoutes] GET error` / `visitor_sessions_site_config_id_fkey`. Example: `curl -sS "http://127.0.0.1:${PORT}/api/visitor-session/$(uuidgen)/platform_landing"` (substitute host/port and a UUID).

**Reference code:**

- Standard PSTN → Gemini: `POST /webhook/voice/stream` → `resolvePublicVoiceStreamUrl` → `wss://{host}/ws/voice-stream` when `LOCAL_VOICE_TWILIO_STREAM` is **not** `true` (`server/routes/telephonyRoutes.ts`).
- Sovereign PSTN: `LOCAL_VOICE_TWILIO_STREAM=true` → `wss://{host}/ws/twilio-sovereign` (optional `?siteConfigId=`).
- Collect-call / jail: `POST /webhook/voice/jail?siteConfigId=…` → same `resolvePublicVoiceStreamUrl` (so sovereign flag applies to jail too).
- Media stream handler (Gemini cloud): `server/voiceStream.ts` — log line `[VoiceStream] Stream started – Call: …`.

---

## Test matrix (record Pass / Fail / N/A + notes)

### V-B1 — Browser Live: canvas narration (Phase 3 item)

**Use a tenant biz/agent URL with a real `siteConfigId`, not `platform_landing`.**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a site Concierge / voice surface that commits canvas state and triggers `canvas_grounding` to the Live proxy. | No proxy or client console errors. |
| 2 | Speak so the model describes or acknowledges the **committed** canvas (not stale inline-only tools). | Narration matches grounded payload; no silent failure after tool commit. |
| 3 | Optional: interrupt (barge-in) and confirm audio recovers. | Model stops and responds to new utterance without stuck “tool pending” silence. |

**Log hints:** `[GeminiVoice]` / proxy lines showing `canvas_grounding` forwarded as `clientContent` (see `server/geminiVoice.ts`).

---

### V-P1 — PSTN standard stream (Gemini path)

**Configure:** Number Voice URL → `POST https://{APP_HOST}/webhook/voice/stream` (signed).

| ID | Check | Expected |
|----|--------|----------|
| V-P1a | Place inbound call. | TwiML contains `<Connect><Stream url="wss://{public_host}/ws/voice-stream">` (not localhost). |
| V-P1b | Inspect TwiML parameters (Twilio debugger or TwilioML trace). | `callerId` ≈ Twilio `From`, `callSid` set, `dialedNumber` ≈ `To`, optional `siteConfigId` when linked on telephony config. |
| V-P1c | Gateway logs right after connect. | `[Voice] From: …, To: …` then `[Voice] Stream URL: wss://…/ws/voice-stream …` then `[VoiceStream] Stream started – Call: {CallSid}, Site: …, ANI: {From}`. |
| V-P1d | Speak after connect. | **No** AI greeting before you speak (runtime rule in TwiML-injected `systemPrompt`). |
| V-P1e | Hold conversation for ~60s; hang up. | No WebSocket 1006 storm; `[Voice Status]` completed if status callback configured; billing not double-counted (see comments in `/webhook/voice/status`). |

**Failure triage:** If Stream URL is wrong host → `APP_URL` / proxy. If signature fails → `TWILIO_WEBHOOK_SIGNATURE_BASE_URL`. If Debugger shows 11200-class errors → `docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md`.

---

### V-S1 — PSTN sovereign stream (local Ollama path)

**Configure:** `LOCAL_VOICE_TWILIO_STREAM=true` on the gateway; same `/webhook/voice/stream` URL on the number.

| ID | Check | Expected |
|----|--------|----------|
| V-S1a | Inbound call. | TwiML Stream URL is `wss://{host}/ws/twilio-sovereign` (with `?siteConfigId=` when applicable). |
| V-S1b | Logs | Sovereign session line from `server/twilioSovereignStream.ts` (stream start, site context). |
| V-S1c | Audio | Bidirectional audio acceptable for smoke (quality/latency per ops bar). |

---

### V-J1 — Jail / collect-call handshake (if this number is in use)

**Configure:** Voice URL → `POST https://{APP_HOST}/webhook/voice/jail?siteConfigId={uuid}`.

| ID | Check | Expected |
|----|--------|----------|
| V-J1a | TwiML order | `<Pause/>` then `<Play digits="1"/>` then `<Connect><Stream …>` with `ptt=1` and jail `systemPrompt`. |
| V-J1b | Stream URL | Same rule as V-P1 vs V-S1: `voice-stream` vs `twilio-sovereign` per `LOCAL_VOICE_TWILIO_STREAM`. |
| V-J1c | Caller experience | Collect prompt plays; charge acceptance; then PTT behavior (press 1 to open mic per `voiceStream` PTT mode). |

---

### V-X1 — Regression quickies

| ID | Check | Expected |
|----|--------|----------|
| V-X1a | Energy guard | Site with no balance → TwiML Say + Hangup on `/webhook/voice` or stream path per existing logic (see telephony routes). |
| V-X1b | Firewall | If enabled and caller not allowed → authorization Say + Hangup on stream path. |

---

## Sign-off block

- **Tester:** _______________ **Date:** _______________ **Environment:** _______________
- **V-B1 (browser canvas):** ☐ Pass ☐ Fail ☐ N/A  
- **V-P1 (PSTN Gemini):** ☐ Pass ☐ Fail ☐ N/A  
- **V-S1 (PSTN sovereign):** ☐ Pass ☐ Fail ☐ N/A  
- **V-J1 (jail):** ☐ Pass ☐ Fail ☐ N/A  

**Notes / anomalies (CallSids, timestamps):**

---

## After QA — next engineering gate (do not reorder per peer review)

1. **Path B:** Governed PSTN tool parity — follow **`docs-governance/canonical/PSTN_VOICE_TOOL_PARITY_PATH_B.md`** (minimal two-tool allowlist, mirror `geminiVoice.ts` tool loop + audio gating). Code changes to `server/voiceStream.ts` only under an **explicit voice governance task** (lockdown).
2. **Phase 10:** Alerts polling, policy engine, persistence — only after A + B confidence as planned.

## Related

- `docs-governance/canonical/GOVERNANCE_EXECUTION_PLAN_V1.md` — Phase 3, Runtime Trust Parity
- `docs-governance/canonical/SESSION_IDENTITY_BINDING_SPEC.md` — tool binding
- `docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md` — Debugger + signature base URL
