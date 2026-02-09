# Gateway Global PTT Protocol

**Owner:** Gateway Global AI  
**Status:** Core technology / proprietary protocol  
**Version:** 1.0  

This document defines the **Push-To-Talk (PTT) protocol** used by Gateway Global to maintain high-quality conversational AI sessions with **Gemini** (and compatible backends) **without** requiring a constant WebRTC or persistent websocket connection. PTT is the default interaction model for voice on mobile and an option on desktop; it reduces cost and complexity while preserving conversation context and quality.

---

## 1. Goals

- **Session without constant connection:** Maintain a conversational session with a Gemini (or compatible) conversational AI **without** holding a live WebRTC or long-lived websocket open for the full duration.
- **Efficiency:** Use media and connection resources only when the user is actually speaking (PTT active) or when the system is delivering a response. Avoid streaming silence and background noise.
- **Context and quality:** Preserve full conversation history and context across turns so the AI remains coherent and on-topic.
- **Controlled interruptions:** When the user presses PTT again while the AI is still responding, the system **analyzes the new input** and decides whether to **interrupt** the current response or **wait** for it to finish and then submit the new input—reducing unnecessary interruptions and improving UX.

---

## 2. Protocol overview

### 2.1 Modes

| Mode | Description | When connection is active | Default |
|------|-------------|---------------------------|--------|
| **PTT (Push-To-Talk)** | User holds a button to speak; release to end turn. System listens only while PTT is active. After release: brief edit window, then turn is submitted. | Only during user PTT (capture) and during AI playback (delivery). Session/context maintained server-side between turns. | **Yes (especially mobile)** |
| **VAD (Voice Activity Detection)** | Continuous listen; system detects end-of-speech. | Connection can be held open while listening. | Optional (e.g. desktop) |

### 2.2 Session model

- **Session:** A logical conversation session (identified by session ID, call ID, or user/device) is maintained on the **server** or in a **session store**. It holds:
  - Conversation history (user and assistant messages).
  - System prompt and any per-session config (voice, language, identity).
  - Turn state (idle, user speaking, processing, assistant speaking).
- **No requirement for constant WebRTC/websocket:** The client opens a media or data connection when:
  1. **User PTT down:** Start sending audio (or start a short-lived connection to stream that chunk).
  2. **User PTT up:** Stop sending; optionally keep connection briefly for final packets, then close or idle.
  3. **AI response delivery:** Open or reuse a connection to receive and play TTS (or streamed) audio; close when playback completes.

Between these phases, the **session** continues to exist (history, context); only the **media/transport** is released. The next PTT or the next response re-establishes transport as needed.

### 2.3 Turn flow (PTT)

1. **Idle** — No open voice connection. Session exists with history.
2. **User presses PTT** — Client opens capture (and optionally connection). Audio is streamed or buffered.
3. **User releases PTT** — Capture stops. Client may apply a short **release buffer** (e.g. 1–1.2 s) so trailing speech is included.
4. **Edit window** — Transcribed text is shown; user has a short window (e.g. 1 s, configurable) to edit before auto-submit. (Optional: immediate submit.)
5. **Submit** — Client sends the final text (and optionally the audio) to the backend. Backend runs STT (if needed), appends to session history, calls LLM, then TTS (or streams response).
6. **Response delivery** — Backend streams or returns audio; client plays it. **No listening** during playback (no PTT = no capture).
7. **Playback complete** — Back to **Idle**. Session still has full history for the next turn.

This keeps **websocket/RTC usage** limited to “user speaking” and “AI speaking” instead of “always on.”

---

## 3. Interrupt vs wait (PTT during AI response)

When the **user presses PTT again while the AI is still responding** (playback or stream in progress), the system should **not** blindly interrupt. It should:

1. **Capture** the new audio (and/or transcription) as usual.
2. **Analyze** the new input to decide:
   - **Interrupt:** New input is clearly a **correction, stop request, or urgent reply** (e.g. “stop,” “wait,” “no,” “actually,” “wrong number”). → Stop current playback/stream immediately; process the new turn.
   - **Wait:** New input is **continuation, filler, or low-urgency** (e.g. “uh,” “mm,” or a follow-up that can wait). → **Do not** interrupt; queue the new input and submit it **after** the current response finishes.

### 3.1 Implementation guidance

- **Interrupt triggers (examples):** Explicit stop/cancel phrases, strong negation, “wrong number,” “I have to go,” “hold on.”
- **Wait (queue) triggers (examples):** Filler, incomplete words, or content that is not time-sensitive.
- **Classification:** Use a small classifier or rules (keyword/phrase list + optional lightweight LLM or intent call) to label the new input as `interrupt` vs `queue`. Default to **queue** when unsure to avoid unnecessary interruptions.
- **Config:** Allow product/config to tune thresholds and phrase lists (e.g. per locale or use case).

This behavior is part of the **Gateway Global PTT protocol**: same session, efficient transport, and **smart interrupt vs wait** so the system does not cut off the AI unnecessarily and does not ignore clear user stop/correction signals.

---

## 4. Configuration (MCP / server)

The following are exposed and standardized (e.g. via MCP or server config) so all clients and backends behave consistently:

| Parameter | Description | Typical default |
|-----------|-------------|-----------------|
| `defaultMode` | `ptt` \| `vad` | `ptt` |
| `editWindowMs` | Time for user to edit transcript before auto-submit (ms) | `1000` |
| `mobileDefaultPtt` | Use PTT as default on mobile | `true` |
| `listenOnlyOnPtt` | Mic active only while PTT held (and not during AI playback) | `true` |
| `pttReleaseBufferMs` | Buffer after PTT release before finalizing (ms) | `1200` |
| `interruptPolicy` | `always` \| `never` \| `smart` (analyze and decide) | `smart` |

---

## 5. Client responsibilities

- **PTT capture:** Send audio (or buffered audio) only while PTT is held; apply release buffer.
- **Transcription display:** Show real-time or post-PTT transcript; apply edit window and submit.
- **No capture during playback:** Do not send voice when the AI is responding unless the product explicitly allows barge-in and the backend supports it under this protocol.
- **Interrupt vs wait:** If the client supports PTT-while-AI-speaking, send the new input to the backend; the backend (or client, if specified) applies the interrupt-vs-wait logic and returns either “interrupt” (stop playback, process new turn) or “queue” (playback continues, new turn processed after).

---

## 6. Backend responsibilities

- **Session store:** Persist conversation history and session config between turns.
- **STT:** Transcribe user audio to text when a new turn is submitted (e.g. Gemini multimodal or dedicated STT).
- **LLM:** Generate assistant reply from session history + new user turn (e.g. Gemini).
- **TTS:** Produce audio for the assistant reply (e.g. Gemini TTS); stream or return to client.
- **Interrupt vs wait:** If the protocol is `smart`, classify incoming PTT-during-response and return interrupt or queue; on interrupt, stop current TTS/stream and process the new turn.

---

## 7. References

- **Diagrams (Mermaid):** [GATEWAY_PTT_PROTOCOL_DIAGRAM.md](./GATEWAY_PTT_PROTOCOL_DIAGRAM.md) — visual explainer of session model, PTT turn flow, chat modes, footer timing, and interrupt-vs-wait.
- **Voice pipeline:** `server/voiceStream.ts`, `server/voiceGemini.ts` (phone/Twilio); `ai-biz-bot/ai-voice-sdk-v1` (browser Gemini Live + PTT).
- **MCP config:** `ai-biz-bot/mcp-server` — `get_voice_ptt_config`, `set_voice_ptt_config`, and deployment manifest.
- **Architecture:** `ai-biz-bot/ARCHITECTURE.md` — Voice first, Chat second, Website builder third; PTT as default.

---

## 8. Summary

The **Gateway Global PTT Protocol** is a core part of Gateway Global’s technology. It allows:

1. **Session with Gemini (or compatible) conversational AI without constant WebRTC/websocket.**
2. **Efficient use of connections and media** by activating them only for PTT capture and response delivery.
3. **Full conversation context and quality** via server-side session and history.
4. **Controlled interruptions:** when the user PTTs again during an AI response, the system analyzes the new input and either **interrupts** (stop and handle new turn) or **waits** (queue until response ends), reducing unnecessary interruptions and optimizing resource use.

All clients and backends that implement “Gateway PTT” should follow this session model, turn flow, and interrupt-vs-wait behavior so the experience is consistent across phone, web, and embedded surfaces.
