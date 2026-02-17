# Dev Server – Test Links for Management

**Base URL:** https://aibizbot-dev.gatewayglobal.ai

Use these links to test services on the dev server. No developer setup required.

---

## B2B / Hotel & Map Demos

| Description | Link |
|-------------|------|
| **Agent Portal** – Map, hotel search, flight search, event search | https://aibizbot-dev.gatewayglobal.ai/test-b2b |
| **Olympic B2B** – Itinerary + map view | https://aibizbot-dev.gatewayglobal.ai/test-b2b-olympic |
| **B2B Wireframe** – Wireframe-style B2B UI | https://aibizbot-dev.gatewayglobal.ai/test-b2b-wireframe |

---

## SDK & Chat

| Description | Link |
|-------------|------|
| **SDK Showcase** – SDK and integration demos | https://aibizbot-dev.gatewayglobal.ai/sdk |
| **Chat Showcase** – Chat embed demos | https://aibizbot-dev.gatewayglobal.ai/chat-showcase |

---

## Public / Demo

| Description | Link |
|-------------|------|
| **Main site** | https://aibizbot-dev.gatewayglobal.ai/ |

---

---

## Server requirements (for Event Search & full B2B)

- **Event search (Get dates & venue):** `GEMINI_API_KEY` must be set on the server. Optional: `GOOGLE_CLOUD_API_KEY` or `GOOGLE_PLACES_API_KEY` for venue coordinates and nearest airport.
- **Hotel MCP / voice:** `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, and GRN/DB env vars as in `user_uploads/new/mcp_travel_server/README.md`.

*Last updated: 2025. Hotel MCP backend: `https://aibizbot-dev.gatewayglobal.ai/mcp/hotels` (used by voice/chat; not a browser page).*
