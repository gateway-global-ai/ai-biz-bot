# Standalone Clear Voice Phone + iPhone App Plan

## 1. Standalone `/phone` Page (Implemented)

### Purpose
- **QR-codeable entry point** for the Clear Voice AI chat/voice interface without the full app.
- Businesses get **two default QR codes**: (1) website entry, (2) direct Clear Voice chat.
- Lightweight, API-like: pass params in the URL and get a full-screen PTT interface.

### URL
- **Base:** `https://aibizbot-dev.gatewayglobal.ai/phone`
- **Query params:**
  - `siteConfigId` (UUID) — connect to this site’s agent.
  - `slug` — resolve via `GET /api/site-configs/by-slug/:slug`, then use returned config.
- If neither is provided, uses **platform_landing** (Gateway Global AI).

### Examples
- Platform (Gateway Global AI): `https://aibizbot-dev.gatewayglobal.ai/phone`
- Business by slug: `https://aibizbot-dev.gatewayglobal.ai/phone?slug=acme-co-a1b2`
- Business by UUID: `https://aibizbot-dev.gatewayglobal.ai/phone?siteConfigId=<uuid>`

### Implementation
- **Route:** `client/src/App.tsx` — `<Route path="/phone" component={PhonePage} />`
- **Page:** `client/src/pages/public/PhonePage.tsx`
  - Reads `siteConfigId` or `slug` from query; fetches site config (or uses platform_landing).
  - Builds `BusinessContext`, `VoiceConfig`, default `AgentConfig`.
  - Renders **ConciergePanel** in **fullscreen**, **voice-first**, sovereign variant.
  - Close (X) and “Full site” link navigate to `/business`.

### Two QR Codes by Default
1. **Website entry:** `https://<domain>/biz/<slug>` or `https://<domain>/business` — full site, hero, search, preview, then optional chat.
2. **Clear Voice direct:** `https://<domain>/phone?slug=<slug>` (or `siteConfigId=`) — only the PTT chat UI, no shell.

Both use the same backend (site config, Gemini Live, handover service). Only the entry surface differs.

---

## 2. iPhone App Plan (Clear Voice AI Native)

### Goal
- An **Apple iPhone app** that looks like the current Clear Voice AI interface (Hold to speak, READY, CONNECTED, Multimodal: Maps, Forms, Catalogs).
- Connects to the **same Clear Voice AI backend** (Gemini Live over WebSocket, existing auth/session).

### Options

#### Option A: WebView wrapper (recommended first)
- **What:** Native iOS app that is mostly a **WKWebView** loading `/phone?slug=...` or `/phone?siteConfigId=...`.
- **Pros:** Same UI and behavior as web; one codebase; fast to ship; uses existing `/phone` and backend.
- **Cons:** Not a “true” native phone UI (e.g. no CallKit incoming-call screen); depends on WebView and our web stack.
- **Steps:**
  1. Create an Xcode project (iOS App, Swift/SwiftUI).
  2. Add a single full-screen WKWebView; load `https://aibizbot-dev.gatewayglobal.ai/phone` (or prod) with optional query params (e.g. from app config or deep link).
  3. Configure App Transport Security and any required permissions (microphone, etc.).
  4. Optional: Universal Links or custom URL scheme so QR codes or links open the app and pass `slug`/`siteConfigId`.
  5. Submit to App Store (Apple Developer account required).

#### Option B: Native WebSocket + audio (later)
- **What:** Native Swift/SwiftUI UI that mirrors the current interface (Hold to speak, status, transcript) but uses a **native WebSocket client** to the same Gemini Live proxy and handles audio I/O natively.
- **Pros:** Full native UX; potential for CallKit/PushKit later (incoming “calls” from the AI); no WebView.
- **Cons:** Duplicates protocol and UI logic; more work; must keep in sync with backend changes.
- **Steps:**
  1. Document or export the current WebSocket URL, auth, and message format (from `GeminiStreamingClient` / server).
  2. Implement a minimal native client: WebSocket connect, send/receive audio, display transcript/status.
  3. Recreate the sovereign UI (header, READY, Hold to speak, CONNECTED) in SwiftUI.
  4. Optionally add CallKit for “incoming call” experience (see references below).

### Reference-first native build (Swift)
Use an open-source reference as the starting point and **take what we need**, then **tie it to our system** (Clear Voice WebSocket, session context, site config).

- **Reference:** [Whale](https://github.com/kurzdigital/Whale) — WebRTC + CallKit demo in Swift. Good for: project structure, CallKit integration pattern, real-time voice UI lifecycle.
- **What to take from the reference:**
  - Xcode project layout, entitlements, and CallKit/PushKit wiring.
  - Call flow (start/answer/end), native “phone” UI patterns, and audio session handling.
  - Patterns for background/foreground and incoming “call” presentation.
- **What to replace / plug in (our system):**
  - **Media path:** Swap WebRTC peer connection for our **WebSocket** to the Gemini Live proxy (`/ws/gemini-live` or equivalent; see `server/geminiVoice.ts` and `client/src/services/voice/GeminiStreamingClient.ts`).
  - **Session context:** Pass **siteConfigId** (or resolve **slug** via `GET /api/site-configs/by-slug/:slug`) and send the same `sessionContext` / handover payload the web client sends so the backend uses the correct site config and system prompt.
  - **Audio:** Align input/output with our pipeline (e.g. 16 kHz input, 24 kHz output if that’s what the server expects); reuse or mirror the web client’s message format for audio chunks and events.
  - **REST bootstrap:** Call `GET /api/site-configs/:id` (or by-slug) for config; use that to build the connection payload and optional system-prompt override.
- **Result:** A native app that looks and behaves like our Clear Voice interface but uses the reference for structure and CallKit, and our backend for all signaling and media.

### Apple / Open Source References
- **CallKit + WebRTC (use as reference; replace media with our WebSocket):**  
  - [Whale](https://github.com/kurzdigital/Whale) — WebRTC + CallKit demo (Swift). **Primary reference for native build.**  
  - [WebRTC-iOS](https://github.com/stasel/WebRTC-iOS) — Native WebRTC demo in Swift.  
  - [Build a VoIP Call App with CallKit in iOS (VideoSDK)](https://www.videosdk.live/blog/voip-call-app-with-callkit-on-ios) — CallKit + PushKit + backend.
- **Note:** Our stack uses **WebSocket + Gemini Live**, not peer-to-peer WebRTC. CallKit is used for native “call” UI and lifecycle; the actual media path is our WebSocket audio to the existing Clear Voice backend.

### Suggested order
1. **Ship `/phone`** and use it for the “Clear Voice” QR code (done).
2. **Ship iPhone app as WebView** of `/phone` with a deep link (e.g. `gatewayglobalai://phone?slug=...`) so the app looks like the current interface and connects to the same network.
3. **Later:** If you want native CallKit “incoming call” or fully native audio path, add Option B (native client) and optionally integrate CallKit using the patterns above.

---

## 3. Summary

| Deliverable              | Status   | URL / Notes                                      |
|--------------------------|----------|--------------------------------------------------|
| Standalone `/phone`     | Done     | `/phone`, `?siteConfigId=`, `?slug=`             |
| Two default QR codes    | Supported| (1) Website: `/biz/:slug` (2) Voice: `/phone?slug=` |
| iPhone app (WebView)    | Plan     | WKWebView → `/phone`, deep link for params      |
| iPhone app (native)     | Future   | Native WebSocket + UI; optional CallKit         |
