# Gateway Global PTT Protocol — Diagrams

This document explains how the **Gateway Global PTT (Push-To-Talk) protocol** and **chat/voice interface** work, using Mermaid diagrams. Use these to explain the system to stakeholders, developers, or customers.

**Related:** [GATEWAY_PTT_PROTOCOL.md](./GATEWAY_PTT_PROTOCOL.md) (full protocol specification).

---

## 1. High-level: Session without constant connection

The protocol keeps a **conversation session** (history, context) on the server while using **media/transport only when needed** — not a constant WebRTC or websocket.

```mermaid
flowchart LR
  subgraph Client
    A[User] --> B[PTT / Chat / Realtime]
    B --> C[Send audio or text]
    D[Play AI response] --> A
  end
  subgraph Server
    S[Session store\nhistory + config]
    C --> T[Turn handler]
    T --> S
    S --> T
    T --> LLM[LLM + TTS]
    LLM --> D
  end
  style S fill:#1e3a5f,color:#fff
  style T fill:#2d5a87,color:#fff
```

**Takeaway:** Session lives on the server; connection is used for “user speaking” and “AI speaking,” not 24/7.

---

## 2. Conversation modes (one at a time, shared history)

The chat interface has **three views**; the user switches with a single control. All three share the **same conversation history**.

```mermaid
flowchart TB
  subgraph Header["Top 15% — Header"]
    Biz[Business name]
    Switcher[Mode: Chat | PTT | Realtime]
    Biz --> Switcher
  end

  subgraph Views["Rest — One view at a time"]
    direction TB
    Chat[Chat: Text history + input\nFull transcript visible]
    PTT[PTT: Visualizer + Hold to talk\nVoice only, no transcript in view]
    Realtime[Realtime: Visualizer + VAD\nContinuous listen, voice only]
  end

  History[(Shared conversation history)]
  Chat --> History
  PTT --> History
  Realtime --> History

  Switcher --> Chat
  Switcher --> PTT
  Switcher --> Realtime

  style History fill:#1e3a5f,color:#fff
  style Header fill:#0f172a,color:#e2e8f0
```

**Takeaway:** One mode active at a time; switching only changes the **view**. History is shared so switching to Chat shows everything said in PTT or Realtime.

---

## 3. PTT turn flow (from press to idle)

This is the **per-turn** flow when the user uses Push-To-Talk.

```mermaid
stateDiagram-v2
  [*] --> Idle: Session ready
  Idle --> Capturing: User presses PTT (mic on)
  Capturing --> Releasing: User releases PTT (mic off)
  Releasing --> EditWindow: ~1.2s buffer (trailing speech)
  EditWindow --> Submitting: 1s edit or "Send now"
  EditWindow --> Idle: User taps Callback (cancel)
  Submitting --> Responding: Backend: STT → LLM → TTS
  Responding --> Idle: Playback complete
  Idle --> Capturing: User presses PTT again

  note right of EditWindow
    User can: Edit, Delete, or + (new message)
    Callback within 3s returns to edit
  end note
  note right of Responding
    No listening during playback
    Single message in flight (Cursor-like)
  end note
```

**Takeaway:** Idle → hold PTT (capture) → release → short buffer → edit (1s) → submit → AI responds → back to idle. One message in flight; no new send until response is done.

---

## 4. Chat footer (transcription strip + PTT button)

The **bottom of the chat** in PTT mode: transcription strip (top) and PTT button (bottom). Timing is configurable (e.g. 1s edit, 3s callback).

```mermaid
flowchart TB
  subgraph Footer["Chat footer (PTT mode)"]
    direction TB
    subgraph Strip["Transcription strip (~25%)"]
      Draft[Live draft / transcribed text]
      Edit[Edit] 
      Delete[Delete] 
      NewMsg["+ New message"]
      CallbackBtn[Callback — cancel send]
      Draft --> Edit
      Draft --> Delete
      Draft --> NewMsg
      AfterSend[After send: 3s window] --> CallbackBtn
    end
    subgraph PTTArea["PTT button (~25%)"]
      Btn[Hold to talk]
    end
    Strip --> PTTArea
  end

  Timing[1s edit → auto-submit\n3s callback to cancel]
  Strip -.-> Timing
```

**Takeaway:** User sees draft, has 1 second to edit (or “Send now”), then submit. Within 3 seconds they can hit “Callback” to cancel and return to editing. Edit / Delete / + control the draft.

---

## 5. Interrupt vs wait (PTT during AI response)

When the user **presses PTT again while the AI is still speaking**, the system does **not** always interrupt. It analyzes the new input and either interrupts or queues.

```mermaid
flowchart LR
  User[User presses PTT\nwhile AI is speaking] --> Capture[Capture new audio]
  Capture --> Analyze[Analyze new input]
  Analyze --> Interrupt{Interrupt?}
  Interrupt -->|Yes: stop, wrong number, etc.| Stop[Stop playback\nProcess new turn]
  Interrupt -->|No: filler, continuation| Queue[Queue new input\nProcess after response ends]
  Stop --> Idle[Idle]
  Queue --> Idle
```

**Examples:**
- **Interrupt:** “Stop,” “Wait,” “No,” “Wrong number,” “I have to go.”
- **Wait (queue):** “Uh,” “Mm,” or a follow-up that can wait.

**Takeaway:** Reduces accidental cut-offs and avoids ignoring clear stop/correction signals.

---

## 6. End-to-end: from config to response

How **owner config** and **client** connect to the **backend** and back.

```mermaid
sequenceDiagram
  participant Owner
  participant Identity as Identity / Config
  participant Client as Chat / Visualizer
  participant Backend as Session + LLM + TTS

  Owner->>Identity: Set business name, default mode, hero image
  Identity->>Client: Load config (e.g. PTT default, edit 1s, callback 3s)

  Note over Client: User in PTT mode
  Client->>Client: PTT down → mic on, stream audio
  Client->>Client: PTT up → mic off, 1.2s buffer
  Client->>Client: Show draft, 1s edit window
  Client->>Backend: Submit final text (single in-flight)
  Backend->>Backend: Append to session, LLM, TTS
  Backend->>Client: Stream/return audio
  Client->>Client: Play response (no listening)
  Client->>Client: Back to idle; history updated
```

**Takeaway:** Config drives default mode and timing; client follows the PTT turn flow and single in-flight rule; backend keeps session and does STT/LLM/TTS.

---

## 7. Visual summary: what lives where

```mermaid
flowchart TB
  subgraph Client_UI["Client UI"]
    H[Header: business name + Chat|PTT|Realtime]
    V[View: Chat list OR Visualizer + footer]
    BG[Background: hero image @ 25% opacity]
    H --> V
    BG -.-> V
  end

  subgraph Server["Server"]
    Session[Session: history + system prompt]
    STT[STT]
    LLM[LLM]
    TTS[TTS]
    Session --> STT
    STT --> LLM
    LLM --> TTS
  end

  V -->|Submit text / audio| Session
  TTS -->|Audio stream| V
```

---

## Quick reference

| Concept | Description |
|--------|-------------|
| **Session** | Server-side conversation (history + config). No constant connection. |
| **PTT** | Push-to-talk: hold to speak, release → buffer → edit → submit. |
| **Edit window** | ~1 s to edit transcript before auto-submit (configurable). |
| **Callback** | ~3 s after send to cancel and return to edit. |
| **Single in-flight** | No new message sent until current AI response is done. |
| **Interrupt vs wait** | When user PTTs during AI reply: analyze → interrupt or queue. |
| **Shared history** | Chat, PTT, and Realtime all use the same conversation log. |
| **Branded background** | Optional hero image (e.g. Google Places) at ~25% opacity in visualizer/chat. |

These diagrams can be exported to PNG/SVG using Mermaid Live Editor or your docs pipeline and used in presentations or docs.
