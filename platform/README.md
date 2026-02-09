# Platform SDKs (deployable)

This directory is the **canonical** home for platform SDKs and components used by the app and embed script.

- **`chat/`** — Embed script (`gateway-chat.js`) and chat components. Served at `/sdk/*` by the server.
- **`website-builder/`** — Website builder components and templates used by the automated site generator and customer-facing preview.

Voice/PTT is implemented in the main **client** (e.g. `client/src/components/PushToTalkInterface.tsx`, `WebsitePreview.tsx`) and **server** (e.g. `server/pttService.ts`). The **sdk/voice-ai** package remains the reference SDK for multi-provider voice; platform behavior uses the client+server PTT flow.

See repo root **README.md** and **docs/architecture/** for how chat, PTT, and website builder fit together.
