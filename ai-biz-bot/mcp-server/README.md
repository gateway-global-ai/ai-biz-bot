# AI Biz Bot MCP Server

MCP server that **standardizes deployments** of Gemini Voice AI into the chat interface and websites. It exposes tools to add components to the chat window and to websites, and to manage voice/PTT configuration so all deployments behave consistently.

## Purpose

- **Chat window**: Define which UI parts (message list, PTT button, transcript editor, admin controls) appear in the chat interface.
- **Websites**: Define how the chat/voice UI is embedded (floating widget, fixed window, embed script).
- **Voice PTT**: Single source of truth for push-to-talk behavior (edit window, mobile default, listen-only-on-PTT).
- **Voice modules**: Register user interface (visitor communication) vs admin interface (voice controls, system prompt, visitor management) with the fixed-window chat model.

Once this foundation is in place, the chat interface and website builder can call the MCP (or its REST endpoints) to render the standardized UI.

## Run

```bash
cd ai-biz-bot/mcp-server
npm install
npm run build
npm start
```

Default port: **3020** (set `MCP_PORT` to override).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/mcp/tools` | List MCP tools |
| POST | `/mcp/message` | MCP JSON-RPC 2.0 (tools/list, tools/call, initialize) |
| GET | `/api/chat-components` | List available chat window component types |
| GET | `/api/website-components` | List available website component types |
| GET | `/api/voice-ptt-config` | Get current PTT config |
| GET | `/api/deployments/:id/manifest` | Full deployment manifest (chat + website components + PTT config) |

## MCP Tools

| Tool | Description |
|------|-------------|
| `add_component_to_chat_window` | Add a component (e.g. `voice_ptt_button`, `transcript_editor`) to a deployment's chat window |
| `remove_component_from_chat_window` | Remove a chat component from a deployment |
| `list_chat_components` | List components for a deployment or list all available chat component types |
| `add_component_to_website` | Add a website component (e.g. `floating_widget`, `fixed_window`) to a deployment |
| `remove_component_from_website` | Remove a website component from a deployment |
| `list_website_components` | List website components for a deployment or all types |
| `get_voice_ptt_config` | Get standard PTT config (edit window, mobile default, listen-only-on-PTT) |
| `set_voice_ptt_config` | Set PTT config for all deployments |
| `register_voice_module` | Register a voice module: user (communication) or admin (controls, system prompt) |
| `list_voice_modules` | List registered voice modules |
| `get_deployment_manifest` | Get full manifest for a deployment (chat + website + PTT) |

## Chat window component IDs

- `header` – Chat header (bot name, close)
- `message_list` – Scrollable messages
- `transcript_editor` – Real-time transcription + 1s edit window (PTT)
- `voice_visualizer` – Orb/bars/waveform
- `typing_indicator` – While assistant is generating
- `input_row` – Text input + send
- `voice_ptt_button` – Push-to-talk button
- `admin_controls` – Voice model, system prompt (admin interface)
- `user_greeting` – Initial assistant message

## Website component IDs

- `floating_fab` – Floating action button
- `floating_widget` – FAB + popup chat (e.g. gateway-chat.js)
- `fixed_window` – Fixed panel chat
- `fullscreen_chat` – Full viewport (e.g. mobile)
- `embed_script` – Script tag embed

## Voice PTT config (defaults)

- `defaultMode`: `ptt` (push-to-talk)
- `editWindowMs`: `1000` (1 second to edit transcript before auto-submit)
- `mobileDefaultPtt`: `true`
- `listenOnlyOnPtt`: `true` (mic only when user holds PTT; when AI speaks, no listening)
- `pttReleaseBufferMs`: `1200` (buffer after release to capture final STT)

These values align with the **Gateway Global PTT Protocol** (see `docs/GATEWAY_PTT_PROTOCOL.md`): session with Gemini without constant WebRTC/websocket; PTT capture and response delivery only; interrupt-vs-wait when user PTTs during AI response.
