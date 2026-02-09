# Voice AI MVP Inspection — Gateway Global AI / AI Biz Bot

**Branch:** `main` (pulled and up to date)  
**Date:** Feb 7, 2025  
**Context:** Core Voice AI SDK for AI BizBot Voice — human-like sales calls at scale; Twilio telephony + **Gemini** real-time conversation.

**Voice stack:** **Gemini only** for voice. KIMI is not used for voice (reserved for research and other tasks).

---

## 1. Executive Summary

The MVP fine-tunes **three main layers**:

| Layer | Location | Purpose |
|-------|----------|---------|
| **Voice AI SDK** | `sdk/voice-ai/` | Unified TTS/STT/realtime across providers (Gemini, Deepgram, ElevenLabs, etc.); cost comparison; Twilio server reference |
| **Server voice pipeline** | `server/` | Twilio webhooks → Media Streams WebSocket → session management → **Gemini** (LLM + TTS); μ-law ↔ WAV codec. No KIMI in voice path. |
| **AI Biz Bot app** | `ai-biz-bot/ai-voice-sdk-v1/` | Browser-based Gemini Live API demo (real-time voice, transcription, mute, chat history) |

---

## 2. Voice AI SDK (`sdk/voice-ai/`)

### 2.1 Entry point: `src/voice-ai-sdk.ts`

- **`VoiceAI`** class: single API for multiple providers.
- **Operations:** `synthesize`, `synthesizeStreaming`, `transcribe`, `connectRealtime`, `cloneVoice`, `listVoices`.
- **Cost:** `estimateCost`, `compareCosts`, `getMostCostEffective`, `calculateVoiceAgentSession`, `projectMonthlyCost`.
- **Providers:** Selected via config; `createProvider()` in `providers/`.

### 2.2 Providers (`src/providers/`)

| Provider | TTS | STT | Realtime | Notes |
|----------|-----|-----|----------|--------|
| **Gemini** | ✅ | ✅ | ✅ | `gemini-2.5-flash-native-audio-preview`; Live API via `client.aio.live.connect()`; prebuilt voices (e.g. Puck). |
| OpenAI | ✅ | ✅ | ✅ | — |
| Deepgram | ✅ | ✅ | ✅ | — |
| ElevenLabs | ✅ | ✅ | ❌ | Voice cloning ✅ |
| Inworld | ✅ | ❌ | ❌ | Voice cloning ✅ |
| KIMI | ❌* | ❌* | ✅ | *Hybrid with external TTS/STT |

### 2.3 Twilio server reference (`twilio-server/index.ts`)

- **`TwilioVoiceServer`**: Express + WebSocket server.
- **Flow:** Incoming call → TwiML with `<Connect><Stream url="wss://..."/>` → WebSocket receives `start`/`media`/`stop` → `VoiceAI.connectRealtime()` (e.g. OpenAI/Gemini) → audio back to Twilio as base64.
- **Outbound:** `POST /voice/call` creates call with TwiML URL; greeting and system prompt passed as query params.
- **Config:** Twilio credentials + AI provider (e.g. `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_VOICE`).

### 2.4 Docs and examples

- `docs/`: research report, Gemini voices, sample rates, Twilio streaming (high-level telephony/SIP/TwiML).
- `examples/`: `basic-usage`, `streaming-tts`, `realtime-voice`, `twilio-integration`, `hybrid-kimi-tts`, `cost-comparison`.

---

## 3. Server Voice Pipeline (Production)

### 3.1 Twilio integration (`server/twilio.ts`)

- **Auth:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`; phone from `storage.getTelephonyConfig()` or env.
- **APIs:** `getTwilioClient`, `getTwilioFromPhoneNumber`, `searchAvailableNumbers`, `provisionPhoneNumber`, `releasePhoneNumber`, `updatePhoneNumberWebhooks`, `sendSms`, `makeCall`, `getCallLogs`, `getMessageLogs`, `updateCallerIdName`.

### 3.2 Voice webhooks (`server/routes.ts`)

- **`POST /webhook/voice/kimi`** (Gemini voice, Media Streams; URL kept for backwards compatibility):
  - Validates Twilio signature; logs call; optional firewall (allowed numbers).
  - TwiML: `<Say>` greeting → `<Connect><Stream url="wss://{host}/ws/voice-stream">` with `agentName`, `personality` params → post-connect `<Say>` goodbye.
- **`POST /webhook/voice`**: Legacy/fallback voice webhook (e.g. `<Gather input="speech">`).
- **Base URL:** `https://twilio.gatewayglobal.ai` in production; Replit/dev host for stream URL.

### 3.3 Voice stream WebSocket (`server/voiceStream.ts`)

- **Path:** `GET /ws/voice-stream` (WebSocket).
- **Twilio message types:** `connected`, `start`, `media`, `mark`, `stop`.
- **On `start`:** Reads `callSid`, `streamSid`, `agentName`, `personality`; creates/gets session via `voiceSessionManager`; greeting via TwiML only.
- **On `media`:** Pushes base64 μ-law into `AudioBuffer`; end-of-speech (silence) or 2s timeout triggers `processUserAudio`.
- **`processUserAudio`:** Uses **Gemini only** (no KIMI). Calls `processWithGeminiVoice`: Gemini LLM for response text → Gemini TTS → `convertWavToTwilioAudio` → send μ-law chunks + mark to Twilio. STT (user audio → text) is TODO for full conversation.
- **Audio temp route:** `GET /api/audio-temp/:filename` still available for future STT or other use.

### 3.4 Session and codec

- **`server/voiceSession.ts`:** `VoiceSessionManager` — per-`callSid` session with `conversationHistory`, `agentName`, `personality`, `isProcessing`, `turnCount`; `getSystemPrompt(session)` builds Gateway Global AI assistant prompt; 30 min idle cleanup.
- **`server/audioCodec.ts`:** μ-law ↔ PCM16; 8 kHz ↔ 16 kHz resampling; `AudioBuffer` aggregates Twilio chunks, VAD-style silence detection (`isEndOfSpeech`), `getWavBuffer()`; `convertWavToTwilioAudio()` for Gemini TTS output → Twilio.

### 3.5 Gemini voice (`server/kimiAudioReplicate.ts`)

- **Role:** Twilio phone voice only (browser uses `kimiAudioDirect`).
- **Model:** Replicate `zsxkib/kimi-audio-7b-instruct`.
- **Flow:** `processAudioWithKimi(audioUrl, conversationHistory, systemPrompt)` → prompt = system + recent history + “respond naturally”; returns `{ audioUrl, transcript, success }`; `extractOutput()` handles various Replicate response shapes.

### 3.6 Server bootstrap (`server/index.ts`)

- `setupVoiceStreamWebSocket(httpServer)` and `setupAudioTempRoute(app)` are called so `/ws/voice-stream` and `/api/audio-temp/:filename` are active.

---

## 4. Outbound / VLM Calling

- **`server/services/vlm-outbound-caller.ts`:** `VlmOutboundCallerService`.
  - **`initiateCall(prospect, campaign, options)`:** Twilio `calls.create` with `twimlUrl`, `statusCallback`, optional `machineDetection`.
  - **Scripts:** `generateKnowledgeEnhancedScript` (knowledge base + industry value props), `generateTwiml` (personalized `<Say>` + `<Gather numDigits="1">`), `generateGatherResponse` (digit 1 = send link via SMS, else goodbye).
- **Flow:** Campaign TwiML uses **Polly.Matthew** and DTMF (press 1/2); no bidirectional AI voice in this path — it’s scripted IVR.

---

## 5. AI Biz Bot App (`ai-biz-bot/ai-voice-sdk-v1/`)

- **Stack:** React, Vite, `@google/genai` (Gemini Live).
- **Entry:** `index.tsx` → `App.tsx`; components: `ControlPanel`, `SetupPanel`, `TelephonyView`, `ArchitectureView`, `Visualizer`, `ChatHistory`, `Logger`, `VoiceSelector`, `ModelSelector`, `LanguageSelector`, `AudioPulseSettings`.
- **`hooks/useLiveApi.ts`:**
  - **Model/voice/config:** `model`, `voice`, `systemInstruction`, `LiveConfig` (temperature, topP, topK).
  - **Audio:** 16 kHz input (mic), 24 kHz output (Gemini); `ScriptProcessorNode` for capture; `decode`/`decodeAudioData` in `utils/audioUtils.ts`.
  - **Session:** `GoogleGenAI` → `ai.live.connect()` with `responseModalities: [Modality.AUDIO]`, `inputAudioTranscription`, `outputAudioTranscription`, `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`, `systemInstruction`, `generationConfig`.
  - **State:** `isConnected`, `volume`, `logs`, `chatHistory`, `isMuted`; `sendText()` for committed turns; interrupt handling (stop scheduled output on `serverContent.interrupted`).
- **Types:** `VoiceName` (Puck, Charon, Kore, Fenrir, Zephyr), `ChatMessage`, `LogEntry`, `AudioConfig`.

This app is a **browser-only Gemini Live** showcase; it does not drive the Twilio phone pipeline.

---

## 6. Client (main app) voice-related surfaces

- **Pages:** `VoiceLeadMachine.tsx`, `AgentTelephony.tsx`, `TelephonyPanel.tsx`, `TwilioAccountManager.tsx`, `TwilioHealthCheck.tsx`, `VoiceAdminPanel.tsx`.
- **Widgets:** `ChatVoiceWidget.tsx`, `VoiceIndicatorWidget.tsx`, `VoiceVisualizerWidget.tsx`.
- **Components:** `PushToTalkInterface.tsx`.
- **Lib:** `twilioApi.ts` for API calls to server Twilio/voice endpoints.

---

## 7. Data flow (fine-tuned paths)

### Inbound call (Gemini voice)

1. Twilio → `POST /webhook/voice/kimi` → TwiML with `<Stream url="wss://host/ws/voice-stream">`.
2. Twilio opens WebSocket → server receives `start` (callSid, streamSid, agentName, personality) → creates session.
3. Twilio sends `media` (μ-law base64) → `AudioBuffer` → on end-of-speech/timeout → `processWithGeminiVoice`: Gemini LLM for response text → Gemini TTS → WAV → μ-law → `media` + `mark` to Twilio. (STT for user speech is TODO.)
4. Session holds history and system prompt for next turn.

### Browser (AI Biz Bot app)

1. User clicks connect → `useLiveApi` gets mic (16 kHz) → `ai.live.connect()` with voice and system instruction.
2. Mic → `sendRealtimeInput({ media: pcmBlob })`; server messages → `modelTurn.parts[0].inlineData.data` (base64) → decode → play at 24 kHz; transcriptions update `chatHistory`.

### Outbound (VLM)

1. `VlmOutboundCallerService.initiateCall()` → Twilio outbound with campaign TwiML URL.
2. TwiML: `<Say>` script + `<Gather>` DTMF → `generateGatherResponse(digit)` → Say + Hangup (no WebSocket).

---

## 8. Gaps and recommendations

| Area | Observation | Suggestion |
|------|-------------|------------|
| **STT for phone** | Implemented: caller WAV is transcribed via `voiceGemini.transcribeWithGemini()` (Gemini multimodal) before LLM + TTS. | — |
| **Twilio server in SDK** | `sdk/voice-ai/twilio-server/index.ts` is a standalone reference; production uses `server/voiceStream.ts` + Gemini. | Either align production with SDK’s TwilioVoiceServer pattern (e.g. pluggable AI backend) or document that SDK twilio-server is reference-only. |
| **Auth / webhook URL** | Voice webhook uses `validateTwilioSignature` and config (e.g. allowed numbers). Base URL is hardcoded for production. | Ensure `WEBHOOK_BASE_URL` / Replit/Twilio base URL is correct per environment. |
| **AI Biz Bot env** | `useLiveApi` uses `process.env.API_KEY` for Gemini. | Use `GEMINI_API_KEY` or a single documented env name for AI Studio / production. |

---

## 9. File reference (core voice)

| File | Role |
|------|------|
| `sdk/voice-ai/src/voice-ai-sdk.ts` | Unified VoiceAI SDK entry |
| `sdk/voice-ai/src/providers/gemini-provider.ts` | Gemini TTS/realtime (Live API) |
| `sdk/voice-ai/twilio-server/index.ts` | Reference Twilio + VoiceAI server |
| `server/twilio.ts` | Twilio client and number/SMS/call APIs |
| `server/voiceStream.ts` | Twilio Media Streams WebSocket + Gemini STT → LLM → TTS |
| `server/voiceSession.ts` | Per-call session and system prompt |
| `server/audioCodec.ts` | μ-law ↔ WAV; AudioBuffer |
| `server/voiceGemini.ts` | Gemini STT (transcribeWithGemini) + LLM + TTS for phone voice |
| `server/routes.ts` | `/webhook/voice/kimi`, `/webhook/voice`, Twilio number/webhook config |
| `server/services/vlm-outbound-caller.ts` | Outbound campaigns and TwiML |
| `server/index.ts` | Mounts voice WebSocket and audio temp route |
| `ai-biz-bot/ai-voice-sdk-v1/hooks/useLiveApi.ts` | Browser Gemini Live session |
| `ai-biz-bot/ai-voice-sdk-v1/types.ts` | Voice names and chat types |

---

**PTT protocol:** Gateway Global PTT protocol (session without constant WebRTC/websocket; interrupt vs wait when user PTTs during AI response) is documented in **`docs/GATEWAY_PTT_PROTOCOL.md`**.

This inspection reflects the current `main` branch and the fine-tuned core components for Gateway Global AI’s Voice AI SDK and AI Biz Bot product.
