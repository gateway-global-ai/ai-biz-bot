# AI Biz Bot MVP — Architecture

This document describes how **Gemini Voice AI** standardizes deployments into the chat interface and websites, and how the **MCP server** and **website builder** fit together.

**Voice stack:** Voice uses **Gemini only**. KIMI is not used for voice (it is used for research, analysis, and other non-voice tasks).

**Integration order:** **1) AI Voice first** → **2) Chat second** → **3) Website builder third** (the website builder uses the components defined by the MCP and inserts voice + chat into site templates).

---

## 1. Gemini Voice AI (ai-voice-sdk-v1)

The **ai-voice-sdk-v1** app is the reference implementation for voice behavior. It uses the Gemini Live API and defines the interaction model that all deployments should follow.

### 1.1 Push-to-talk (PTT) — default for mobile

- **Walkie-talkie style**: User holds a button to talk; release to stop. The system does **not** continuously listen to the mic.
- **Real-time transcription**: While the user holds PTT, speech is transcribed in real time and shown in the chat window.
- **Edit window**: After release, the user has **~1 second** (configurable, e.g. 1000 ms) to edit the transcribed text before it is **automatically submitted** for processing.
- **No listen during AI response**: When the AI is speaking or delivering a response, the mic is **not** active. The system only listens when the user pushes PTT again.

This avoids background noise and accidental triggers, and keeps turns clear.

### 1.2 Modes

| Mode | Description | Default |
|------|-------------|---------|
| **PTT** | Hold to talk → transcribe → edit → auto-submit; AI responds then stops; listen again only on next PTT | **Default on mobile** |
| **VAD** | Voice activity detection: continuous listen, auto-detect end of speech | Optional, e.g. desktop |

### 1.3 Fixed-window chat + voice module

The voice system has a **module** that integrates with the **fixed-window** chat model:

- **Same window**: Chat messages and voice UI (PTT button, transcript, visualizer) live in one fixed chat window.
- **User interface**: Focused on **communication with the business** — sending messages, using PTT, seeing transcript and replies.
- **Admin interface**: Focused on **control of the voice and communication with website visitors** — system prompt, voice model, language, identity (company, position, task), and any visitor-facing settings.

So:

- **User side** = What the visitor sees and uses to talk to the business (chat + PTT + transcript).
- **Admin side** = What the business owner uses to configure the agent and manage how it talks to visitors.

---

## 2. Chat interface (chat/) — second in the flow

Chat is the **second** layer: it provides the fixed-window and floating chat UI that uses the same PTT and component model as the voice SDK.

The **chat** folder contains the Gateway Chat SDK and reference apps:

- **gateway-chat.js**: Embeddable widget (Shadow DOM) — FAB, chat window, messages, optional voice visualizer, input + send + optional mic. Connects to platform APIs (`/api/bots/:id/public`, `/api/website-chat`).
- **Reference apps**: Floating widget, split panel, bottom nav, etc., showing patterns (Icon Toolbar, Voice Visualizer inside chat body, etc.).

The chat interface will be integrated with the **Gemini Voice AI** behavior: PTT by default on mobile, transcript in chat, 1s edit, auto-submit, and no listen while AI speaks. The **MCP server** defines which components (message list, PTT button, transcript_editor, admin_controls) are in the chat window for each deployment.

---

## 3. MCP server (mcp-server/)

The **MCP server** is the foundation for standardizing deployments. It provides:

### 3.1 Tools

- **Chat window**: `add_component_to_chat_window`, `remove_component_from_chat_window`, `list_chat_components`. Components include: `message_list`, `input_row`, `voice_ptt_button`, `transcript_editor`, `voice_visualizer`, `typing_indicator`, `header`, `admin_controls`, `user_greeting`.
- **Websites**: `add_component_to_website`, `remove_component_from_website`, `list_website_components`. Components include: `floating_widget`, `fixed_window`, `embed_script`, `fullscreen_chat`, `floating_fab`.
- **Voice PTT**: `get_voice_ptt_config`, `set_voice_ptt_config` — single config for edit window, mobile default PTT, listen-only-on-PTT, release buffer.
- **Voice modules**: `register_voice_module`, `list_voice_modules` — register user vs admin interface with the fixed-window layout and which chat components they use.
- **Deployment manifest**: `get_deployment_manifest` — for a given deployment, returns chat components, website components, and voice PTT config so the chat interface and websites can render the same behavior everywhere.

### 3.2 Flow

1. **Configure once**: Set voice PTT config and register voice modules (user + admin).
2. **Per deployment**: Add chat components (e.g. message_list + voice_ptt_button + transcript_editor) and website components (e.g. floating_widget).
3. **Render**: Chat interface and website builder call MCP (or REST: `/api/deployments/:id/manifest`, `/api/voice-ptt-config`) to get the manifest and render the standardized UI.

---

## 4. Website builder (website-builder/) — third in the flow

The **website builder** is the **third** piece of the integration. It:

- **Creates base websites** for small businesses by inserting the platform’s technology into website templates.
- **Uses Google Places profiles** to pull real business data (hours, reviews, location, photos).
- **Runs SWOT analysis** and other business analysis to tailor content and positioning.
- **Trains on the customer’s business** so the AI (voice + chat) can act as an expert on that business when talking to visitors.
- **Inserts voice + chat components** (from the MCP component catalog) into the generated sites — e.g. floating widget, fixed-window chat, voice concierge — so every generated site gets the same standardized AI Voice and chat behavior.

So the flow is: **Voice (Gemini) first** → **Chat (components + PTT) second** → **Website builder (templates + Places + SWOT + training + components) third.**

---

## 5. Integration path

1. **Foundation (current)**: MCP server with chat/website component tools and voice PTT config; architecture doc (this file).
2. **Next**: Wire the **chat interface** (e.g. gateway-chat.js or React chat) to:
   - Use the MCP (or REST) to load the deployment manifest and PTT config.
   - Render the chat window with the requested components (message list, PTT button, transcript editor, etc.).
   - Implement the same PTT behavior as ai-voice-sdk-v1 (real-time transcript, 1s edit, auto-submit, no listen during AI response).
3. **Then**: Website builder uses the same manifest and components so every generated site gets the same Gemini Voice AI and chat behavior (Voice first, Chat second, components from MCP).

---

## 6. File map

| Path | Role |
|------|------|
| `ai-biz-bot/ai-voice-sdk-v1/` | Gemini Voice AI reference: PTT, VAD, transcript, identity, visualizer |
| `ai-biz-bot/ai-voice-sdk-v1/hooks/useLiveApi.ts` | Gemini Live session; PTT logic (mute = hold, release + buffer → finalize) |
| `ai-biz-bot/chat/` | Chat SDK (gateway-chat.js) + reference apps |
| `ai-biz-bot/chat/src/gateway-chat.js` | Embeddable widget; voice visualizer placeholder |
| `ai-biz-bot/mcp-server/` | MCP server: add components to chat/websites, voice PTT config, manifests |
| `ai-biz-bot/website-builder/` | Website builder: Places, SWOT, business training; inserts voice + chat into templates |
| `ai-biz-bot/ARCHITECTURE.md` | This document |

---

## 7. Summary

- **Voice = Gemini only.** KIMI is not used for voice (reserved for research and other tasks).
- **Order:** Voice first → Chat second → Website builder third. The website builder creates base sites (Google Places, SWOT, business training) and inserts voice + chat components into templates.
- **PTT is a core protocol:** See **`docs/GATEWAY_PTT_PROTOCOL.md`** (Gateway Global PTT Protocol). Sessions with Gemini are maintained **without** constant WebRTC/websocket; connection is used only during PTT capture and response delivery. When the user PTTs again while the AI is responding, the system **analyzes** the new input and decides whether to **interrupt** or **wait** (queue until response ends) to avoid unnecessary interruptions and optimize resources.
- **Gemini Voice AI** in ai-voice-sdk-v1 implements **PTT-first** behavior: real-time transcription, ~1s edit, auto-submit, no listening while the AI speaks.
- **User interface** = communication with the business; **admin interface** = control of voice and communication with visitors.
- The **MCP server** standardizes which components go into the chat window and which into websites; the **website builder** uses those components when generating sites.
