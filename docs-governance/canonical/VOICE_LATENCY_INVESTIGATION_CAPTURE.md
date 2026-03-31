---
status: canonical
truth_domain: operations
last_verified: 2026-03-28
---

# Voice Latency Investigation — Capture Guide

## Purpose

`POST /api/analytics/voice-latency-hint` records **client-measured** `msToFirstToken` (and optional `siteConfigId`, `sessionKind`). It does **not** replace a full network trace. Use this guide when investigating reports of slow PTT or long time-to-first-audio.

## What the hint endpoint proves

- The **browser believed** latency reached the reported milliseconds between session start and first token/audio-related milestone (see client instrumentation).
- It does **not** identify whether delay was: microphone permission, WebSocket handshake, Google Live setup, model generation, main-thread blocking, or UI minimum timers (e.g. processing banner minimum in `ConciergePanel`).

## What to capture for root-cause analysis

1. **Chrome DevTools → Network**
   - Enable **Preserve log**.
   - Filter or include **WS** (WebSocket) frames for `/ws/gemini-live` (or your active voice route).
   - Record from **before** first PTT until first assistant audio/text.

2. **HAR export limitations**
   - Default HAR often **omits WebSocket message bodies** or shows minimal metadata. Prefer **Performance** + **Network** screenshots and exported HAR with WS column expanded where supported.
   - Include **`/api/site-configs/...`** if the panel fetches config on connect.

3. **Client-side milestones** (correlate with server logs)
   - `[GeminiVoice] New client connected` → `Google WS opened` → `setupComplete` (see `server/geminiVoice.ts` logs).
   - `VoiceTurnOrchestrator` / `canvas-control` timings if the slow path involves canvas.

4. **Environment**
   - Doppler / `GEMINI_MODEL_ID`, region, and whether `localhost:7243` debug ingest is enabled (dev-only noise).

## Related

- Execution plane: `docs-governance/canonical/EXECUTION_PLANE_BOUNDARY_SPEC.md`
- Voice lockdown: `.cursor/rules/sovereign-voice-lockdown.mdc` — do not change voice routes for latency experiments without a voice governance task.
