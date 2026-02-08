# Telephony + Gemini: Architecture and Best Route for Traditional Voice Lines

This doc summarizes your current telephony setup, how it relates to the PTT protocol, and the recommended path for "traditional voice line" (phone calls) using Gemini—including the self-hosted webhooks vs Replicate question.

---

## 1. What You Have Today

### Web (merged-ui)

- **Gemini Multimodal Live API** (WebSocket) in the browser.
- **PTT protocol**: User holds button → audio streamed to Gemini only while held → release → 800 ms trailing buffer → Gemini returns audio automatically. No listening during TTS.
- **Cost and noise**: Input is gated; you only pay for and process speech, and background noise is excluded.

### Phone (server/)

- **Twilio** receives the call and hits your **voice webhook** (e.g. `POST /webhook/voice/kimi`).
- Webhook returns **TwiML** that connects the call to a **Media Stream**: `<Stream url="wss://yourserver/ws/voice-stream">`.
- Your **WebSocket server** (`/ws/voice-stream`) receives Twilio’s audio (μ-law 8 kHz), buffers it in an `AudioBuffer`, and uses **turn detection**:
  - Either `audioBuffer.isEndOfSpeech()` (VAD-style), or
  - A **2 s timeout** when no new speech: then treat the buffer as one “turn.”
- For each turn you call **Gemini request/response** (not Live API):
  1. **STT**: `transcribeWithGemini(wavBuffer)` (e.g. `gemini-2.0-flash`).
  2. **LLM**: `generateVoiceResponseGemini(systemPrompt, history, userMessage)` → text.
  3. **TTS**: `synthesizeGeminiTTS(text, voiceName)` → audio.
- You convert that audio to μ-law and send it back to Twilio over the same WebSocket.

So today: **phone = Twilio Media Streams ↔ your server (WebSocket bridge) ↔ Gemini (STT + generateContent + TTS)**. No Gemini Live on the server; it’s per-turn request/response.

---

## 2. Best Route for “Traditional Voice Line” with Gemini

Given your PTT architecture and goals (reliability, cost, noise), the best route is:

### A. Keep the bridge on your own server (self-hosted webhooks + stream)

- **Twilio** → **your server** (HTTP webhook + WebSocket `/ws/voice-stream`) → **Gemini**.
- Your server is the only place that can hold a long-lived WebSocket to Twilio and coordinate per-turn (or future streaming) calls to Gemini. This is the right place for the “middleman.”
- **Recommendation**: Keep self-hosting this. Run it on Replit, Fly.io, Railway, or your own box so the process is long-lived and can hold many concurrent call streams.

### B. Align phone behavior with PTT where possible (optional but valuable)

On the web, PTT gives you:

- Clear turn boundaries (no VAD in noisy environments).
- You only send “speech” to Gemini (cost and noise).

On a **traditional phone line** there’s no physical PTT button, but you can approximate it:

- **Option 1 – DTMF**: “Press 1 when you’re ready to speak, press 1 again when you’re done.” Your server only forwards audio to Gemini while “1” is active. Same idea as PTT: gate input by user intent.
- **Option 2 – Voice trigger**: “Say ‘agent’ when you want to talk.” Server detects the keyword and opens a window (e.g. 10 s or until silence); only that window is sent to Gemini.
- **Option 3 – Keep VAD/timeout**: Your current 2 s timeout is already “chunked” turns. It’s simpler but pays for and processes more silence/noise than true PTT-style gating.

If you want the same benefits as web PTT (cost, noise), Option 1 or 2 is the best route on the phone.

### C. Gemini on the server: request/response vs Live

- **Current (recommended to keep for now)**: Per-turn **generateContent** (STT → LLM text → TTS). Simple, works, and you already have it. Latency is acceptable for many use cases.
- **Future upgrade**: A **Gemini Live** bridge on the server: one process holds both (1) Twilio Media Stream WebSocket and (2) Gemini Live WebSocket, and forwards audio both ways. That would match the web’s streaming behavior and can use the same “PTT-like” gating (e.g. only forward to Gemini when DTMF or voice trigger says “user is talking”). More work; consider after the rest of telephony is stable.

---

## 3. Replicate vs Self-Hosted Webhooks

**Replicate** is built for running models (or Cog containers) in a **request/response** or **batch** way. You send an input (e.g. audio), you get an output (e.g. transcript or audio). It is **not** built to hold long-lived **WebSocket** connections.

Your telephony flow needs:

1. An **HTTP webhook** Twilio can call (returns TwiML with the stream URL).
2. A **WebSocket server** that stays open for the duration of the call and:
   - Receives Twilio’s media events.
   - Buffers and/or gates audio (e.g. PTT-style).
   - Calls Gemini (today: STT + LLM + TTS per turn; later: optionally Live).
   - Sends audio back to Twilio.

That WebSocket process must be a **long-lived server**, not a short-lived Replicate run. So:

- **Best route**: **Self-host the webhooks and the stream** (your current design). Keep Twilio pointing at your server; your server runs the WebSocket and talks to Gemini.
- **Replicate** can still be useful for **side tasks** (e.g. a custom STT/TTS model, or a one-off “analyze this recording” job), but it should not replace the Twilio↔Gemini bridge. Using Replicate “as a wrapper” for the whole call would mean either (a) no real-time stream (only batch), or (b) your server calling Replicate per chunk, which adds latency and complexity without solving the need for a persistent connection to Twilio.

**Summary**: Use **self-hosted webhooks + WebSocket bridge** for telephony. Use Replicate only for optional, stateless steps if you need them.

---

## 4. High-Level Architecture (Phone + Gemini)

```
Caller (phone)
    → PSTN / carrier
    → Twilio (voice webhook)
    → Your server: POST /webhook/voice → TwiML with <Stream url="wss://.../ws/voice-stream">
    → Twilio opens WebSocket to your server
    → Your server: WSS /ws/voice-stream
        - Receives Twilio "media" (μ-law 8 kHz)
        - Buffers and detects end-of-turn (VAD or timeout; optional: DTMF or keyword for PTT-like)
        - Per turn: STT (Gemini) → LLM (Gemini) → TTS (Gemini)
        - Sends back μ-law audio to Twilio
    → Twilio plays audio to caller
```

Your **platform** (agent ID, config ID, system prompt, voice) stays the source of truth; the server loads that config and passes it into the Gemini calls (and, when you add it, into any future Live session).

---

## 5. Recommendation Summary

| Question | Recommendation |
|----------|----------------|
| Where should the Twilio↔Gemini bridge run? | **Your server** (self-hosted webhooks + WebSocket). |
| Use Replicate for the bridge? | **No.** Replicate is for request/response/batch, not long-lived WebSocket. |
| Use Replicate for anything? | Optional: extra STT/TTS or one-off jobs. Not for the live call path. |
| How to get PTT-like behavior on the phone? | **DTMF** (“press 1 to talk, press 1 to send”) or **voice trigger** (“say ‘agent’ to talk”); only forward audio to Gemini in that window. |
| Gemini on server: Live or request/response? | **Keep request/response (STT + LLM + TTS) for now.** Add a Live bridge later if you want streaming parity with the web. |

This keeps your PTT protocol’s benefits (clear turns, cost control, noise tolerance) and fits traditional voice lines without changing where you host the webhooks.

---

## 6. Strategy: Get Off the Phone in 30 Seconds (Push to Internet)

The phone is answered because **it rings**—but the goal is not to keep the caller on a long SIP/trunk call. Real-time voice streaming over the telephone network is fragile; the experience that actually works is **PTT in the browser**. So the design is: **use the first 30 seconds of the call to get the caller onto the internet**, then serve them over SMS and the web interface (with PTT) where you can verify identity, go multimodal, and deliver a voice experience that works.

### Why push off the phone?

- **Realtime voice on PSTN/SIP** is expensive, prone to latency and dropouts, and hard to make reliable at scale.
- **SMS + web** gives you: verified phone number (ID), multimodal UI (forms, links, images, carts), and a **real voice path that works** (PTT in the browser with Gemini Live).
- The customer is not always right about *how* they want to talk to the agent; the goal is to give them an **AI agent that works and is better than a human**. That happens on the internet, not on a long trunk call.

### Target flow (first 30 seconds)

1. **Answer the call** (obligation: it rang).
2. **Immediate message** (TwiML / pre-recorded or TTS):  
   *"Thank you for calling. We see you're on a cell phone—we're going to send you an SMS so you can continue with our AI assistant. You'll get a link to talk with voice that actually works. Reply YES to receive the text."*
3. **If they're on a cell** and accept (e.g. say "yes" or press 1):  
   - **Send the SMS** (link to your site + optional short code or deep link that opens the chat/PTT interface).
4. **If they're on a traditional landline**:  
   - *"To get the same experience, enter your cell phone number using your keypad so we can text you the link."*  
   - **Gather digits** (DTMF) → send SMS to that number.
5. **Hang up or keep a minimal "we've sent the text" message**, then end the call. You are off the phone.

### After the SMS (transfer agent + PTT)

- A **transfer agent** (SMS thread with the same business context) handles the handoff:
  - Communicates by SMS.
  - Tries to **resolve via SMS** (answers, links, forms).
  - When voice is needed: *"Open this link to talk with our voice AI—hold the button to speak and you'll get a real conversation that works."*
- User opens the **merged-ui** (or embedded chat) with **PTT**: they get a real-time voice conversation with Gemini Live that is reliable, works in noisy environments, and avoids the limitations of a long trunk call.

### Why this is the right design

| On the phone (long call) | Off the phone (SMS + web PTT) |
|--------------------------|-------------------------------|
| SIP/trunk cost and fragility | Internet: one SMS, then data |
| No verified ID | SMS = verified phone number |
| Voice-only, no UI | Multimodal: UI, forms, links, media |
| Realtime voice on PSTN is unreliable | PTT in browser works (Clear Conversation Protocol) |
| "Customer wants to stay on the line" | Better outcome: agent that works and is better than a human |

So: **we know better than to optimize for long phone calls**. Use the first 30 seconds to get the caller onto the internet; then use SMS + the PTT interface to deliver the experience that actually works.
