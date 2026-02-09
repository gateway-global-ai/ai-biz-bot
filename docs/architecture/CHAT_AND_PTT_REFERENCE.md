# Chat Interface & PTT Reference

This doc points to the **canonical** chat structure, PTT (Push-to-Talk) design, and where the “correct” experience lives so it isn’t lost in merges or confused with older UIs.

## What the correct experience is

- **One chat surface** (no duplicate SDK widget + inline chat).
- **Layout modes**: floating / fixed / fullscreen with a **resize/layout control** (the “right” chat has this).
- **Admin only from inside the chat** (e.g. “Admin Dashboard” button in the chat menu), **not** in the main site header.
- **Voice**: **PTT (Push-to-Talk)** — hold to capture, release to send; visualizer; optional History/Recall queue. Not “always listening” or a different voice stack.

## Where it’s implemented and documented

| What | Location |
|------|----------|
| **PTT protocol (spec)** | [GATEWAY_PTT_PROTOCOL.md](GATEWAY_PTT_PROTOCOL.md) |
| **PTT diagrams** | [GATEWAY_PTT_PROTOCOL_DIAGRAM.md](GATEWAY_PTT_PROTOCOL_DIAGRAM.md) |
| **PTT analysis & layout (merged-ui)** | [ai-biz-bot/merged-ui/docs/PUSH_TO_TALK_ANALYSIS.md](../ai-biz-bot/merged-ui/docs/PUSH_TO_TALK_ANALYSIS.md) |
| **Voice implementation summary (client PTT + backend)** | [VOICE_PTT_IMPLEMENTATION_SUMMARY.md](../summaries/VOICE_PTT_IMPLEMENTATION_SUMMARY.md) |
| **Reference UI (structure only)** | [ai-biz-bot/ai-voice-sdk-v1/user-ui-uploads/chat-sdk-template](../ai-biz-bot/ai-voice-sdk-v1/user-ui-uploads/chat-sdk-template) — one `StandardizedChatInterface`, layout modes, admin inside chat, no Admin in header |
| **Full chat + PTT + admin-in-chat** | **ai-biz-bot/merged-ui** — `StandardizedChatInterface` with layout modes (floating/fixed/fullscreen), PTT view (Hold to Record, visualizer), Admin Dashboard via OTP inside the chat |

## What was wrong (and what we fixed)

- **Two chat UIs**: The main client homepage (BusinessPage) loaded the platform SDK widget (`gateway-chat.js`) and also showed WebsitePreview’s own chat when in preview/full-access. **Fix**: SDK widget is only loaded on landing; when the user is in preview or full-access we don’t load it, so only one chat (WebsitePreview’s) is shown.
- **Admin in header**: WebsitePreview had an “Admin” button in the main nav. **Fix**: Admin was removed from the header; Admin is only reachable from inside the chat panel (button in the chat header).

## What’s still not the “full” experience on the client

The **client** app’s business-site flow (WebsitePreview) still uses a **custom inline chat** (no layout switcher, no real PTT, no OTP-gated admin). The **full** experience (layout modes, resizing, PTT, admin inside chat) is in **merged-ui**. To get that on the live site you can either:

1. **Serve merged-ui** for the generated business site (preview/full-access), or  
2. **Port** merged-ui’s `StandardizedChatInterface` (and its PTT + admin flow) into the client and use it inside WebsitePreview.

Until then, the client preview has a single chat and admin-from-chat only; it does not yet have the documented PTT layout or resizing behavior — those remain in merged-ui and in the docs above.

---

## New style interface and options (canonical UI)

The following is the **target** UI. Screenshots are in the repo under `assets/` (e.g. `Screenshot_2026-02-08_*`). Use this as the single source of truth so the right interface is not overwritten by an older version.

| Screen / element | What it is | Where it lives in code |
|------------------|------------|-------------------------|
| **Single chat with “System Options”** | One chat window (e.g. “Ava Concierge”) with **resize** (four-arrows) and **hamburger** in header; **Voice Concierge (Push to Talk)** and **Text Concierge (Standard Chat)**; under SETTINGS: **Admin Dashboard** (padlock); Interface Theme. | **merged-ui** `StandardizedChatInterface.tsx` — “System Options” panel, layout cycle (resize), Text/Voice Concierge, Admin Dashboard button, theme. |
| **AI Biz Bot Voice** | Config UI: START LIVE SESSION, OFFLINE; tabs **1. VOICE, 2. IDENTITY, 3. VISUALIZER, 4. ARCHITECTURE, 5. TEL**; Signal Analyzer (BARS/WAVE/ORB); **PTT SYSTEM**, “Start a session above to enable Walkie-Talkie mode”, ENABLE PTT MODE; Transcription Canvas; Input 16kHz / Output 24kHz. | **chat-ai-biz-bot-voice** (`ai-biz-bot/ai-voice-sdk-v1/user-ui-uploads/chat-ai-biz-bot-voice`) — voice/session config, visualizer, PTT. Merged-ui uses `LiveVoiceClient` + PTT in the chat panel. |
| **Admin Dashboard overlay** | Overlay (e.g. on Nora’s Italian Cuisine): **Business Data**, **Reviews (5)**, **AI Biz Bot**, **Agent Settings**; Reviews: min rating filter, per-review toggles; Done. | **merged-ui** `AdminPanel.tsx`; client `WebsitePreview` has a simpler admin overlay (Business Data, Reviews, AI Biz Bot, Agent Settings). |
| **Admin – AI Biz Bot tab** | “AI Business Assistant”, Integration & Setup, **Chat with AI Biz Bot** button. | **merged-ui** `AdminPanel.tsx` (AI Biz Bot / integrations section). |
| **AI Business Mode panel** | Side panel: **Chat**, **Contacts**, **Leads**, **Tasks**, **Reports**; e.g. Leads list with company, contact, value, status. | **merged-ui** `StandardizedChatInterface` owner mode — sidebar views (dashboard, CRM, tasks, etc.). |
| **Google Workspace** | “Manage your connected Google Apps”, Connected Apps (Gmail, Calendar, Drive, Meet, Chat, Sheets, Docs, Tasks, My Business), toggles and Configure. | **merged-ui** `AdminPanel.tsx` — integrations / Google Workspace section. |
| **Generated site (e.g. Nora’s)** | Clean page; **single blue chat FAB** bottom-right; **no** Admin in main header; back + business name only. | **chat-sdk-template** and **merged-ui** nav (no Admin in header). Client `WebsitePreview` after our fix: one chat, Admin only from inside chat. |

**Summary:** The “new style” is: **one** chat surface, **resize + layout** control, **Voice (PTT) + Text** in the chat, **Admin Dashboard and settings only from inside the chat** (System Options / SETTINGS), Admin Dashboard overlay with Business Data / Reviews / AI Biz Bot / Agent Settings, optional AI Business Mode (Leads, Tasks, etc.) and Google Workspace in admin. The implementation that matches this is **ai-biz-bot/merged-ui** plus the voice/visualizer patterns in **chat-ai-biz-bot-voice**. Do not replace this with the old client-only flow (two chats, header Admin, no PTT).

---

## Menu and services generation (demo)

The **demo that generated the menu and services** for businesses is in **ai-biz-bot/merged-ui**:

| What | Where |
|------|--------|
| **Enrichment that generates menu/services** | **merged-ui** `services/geminiService.ts` → `enrichBusinessData()`. Task 6 in the Gemini prompt: generate a full **inventory** — **restaurant** → structured **menu** (categories + items with name, description, price), **salon/service** → **services** list, **retail** → **product catalog**. Returns `menu: generated.inventory` and `categoryType: 'menu' \| 'services' \| 'catalog'`. |
| **UI that displays it** | **merged-ui** `components/MenuSection.tsx` — "Explore Our Menu" / "Our Services" / "Product Catalog" with section headings, items, prices, and "Add to Order" (or "Book a Table" / "Book Appointment" / "Inquire Now"). |
| **Types** | **merged-ui** `types.ts` — `MenuSection`, `MenuItem`, `InventoryType`, `BusinessData.menu`, `BusinessData.categoryType`. |

The **client** flow (BusinessPage → WebsitePreview) uses raw `placeData` from the demo lead and does **not** run this enrichment, so it does not show a generated menu or services. To get menu/services on the main site: use **merged-ui** as the generated-site experience (it already enriches with menu/services and renders `MenuSection`), or add an API that runs the same enrichment and have the client use that data.
