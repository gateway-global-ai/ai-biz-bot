---
name: ""
overview: ""
todos: []
isProject: false
---

# PTT and Standardized Chat Interface Fix (updated)

## Problem summary (updated with home page)

The **home page** of the site (BusinessPage at `/` and `/business`) does **not** use the standardized chat interface. It currently:

1. **Injects the old embed script** (`/sdk/gateway-chat.js`) which renders a **generic floating chat widget** — the "same old BS" other sites have — with no resize (floating/fixed/fullscreen) and no real PTT.
2. The embed’s "voice" option shows a **broken LISTENING/SPEAKING** screen (blinking live voice) that is not the Hold-to-Record PTT interface.
3. The **real** interface (layout modes + PTT) exists only inside **WebsitePreview**, which is shown only after the user enters the business preview/full-access flow. So on our own home page, users never see our chat interface.

Additionally, the central **VoiceVisualizer** on the landing (big phone icon with LISTENING/SPEAKING) is a separate, broken voice UX that is not the PTT interface.

**User requirement:** The home page must use **our** chat interface — the one with single-click resize (floating / fixed / fullscreen) and integrated PTT — and it should be a simple include so we can use it on our own site and, eventually, on any site.

---

## Root cause

- **[client/src/pages/customer/BusinessPage.tsx](client/src/pages/customer/BusinessPage.tsx)** (lines 663–706): When `stage` is not `preview` or `full-access`, it injects `<script src="/sdk/gateway-chat.js">` and calls `GatewayChat.init({ ... voice: { enabled: true } })`. That loads the legacy widget. When `stage` is `preview` or `full-access`, it removes the script and the user sees the chat inside **WebsitePreview** (the good one).
- **[platform/chat/src/gateway-chat.js](platform/chat/src/gateway-chat.js)**: The embed is a single fixed-size chat window plus a voice view (orb + "End Voice"); it has **no** layout cycle and **no** Hold-to-Record PTT.
- The **standardized** UI (layout modes + PTT) is implemented only inside **[client/src/components/WebsitePreview.tsx](client/src/components/WebsitePreview.tsx)** and is not reused on the landing.

---

## Implementation plan (revised)

### 1. Home page: use the standardized chat interface, not the embed

**Goal:** On the home page (BusinessPage), **do not** load the old `gateway-chat.js` widget for the main chat. Instead, render the **same** standardized chat interface (resize + PTT) that WebsitePreview uses.

**Option A (recommended):** Extract the chat panel from WebsitePreview into a **reusable React component** (e.g. `StandardizedChatPanel` or `ConciergeChatPanel`) that accepts:

- Layout mode state (floating | fixed | fullscreen) and cycle callback
- Open/close state
- Initial view (chat | voice)
- PTT handlers and state
- Chat API (e.g. `/api/website-chat`, `/api/ptt/transcribe`)
- Agent name/role (e.g. "Ava", "CONCIERGE")
- Optional admin/open-dashboard callback

Then:

- **WebsitePreview** uses this component (no duplication of layout/PTT UI).
- **BusinessPage** uses this component on the landing: when the user is on the main landing (stage not preview/full-access), show a FAB that opens this panel instead of injecting the script. Remove the `useEffect` that injects `gateway-chat.js` for the landing stage.

**Option B (minimal change):** Without extracting a component, add a second code path on BusinessPage: when on landing, render a **clone** of the WebsitePreview chat panel (same layout modes, same PTT, same header/menu) as a React subtree, and do not load the embed script. This duplicates some UI code but unblocks quickly.

**Deliverable:** Visiting `/` or `/business` (landing) shows **one** chat entry (e.g. FAB or "Concierge" button) that opens the full interface with resize and PTT — not the old widget.

### 2. Remove or repurpose the broken central voice visual (VoiceVisualizer)

The large central phone icon with LISTENING/SPEAKING on the landing is the "blinking live voice screen" that is broken and disconnected from the real PTT. Either:

- **Remove** it from the landing so the only voice entry is inside the standardized chat panel, or
- **Repurpose** it to open the standardized chat panel in voice view (e.g. onClick opens chat with `initialView: 'voice'`) and remove its own WebSocket/greeting flow so it is not a second, broken voice UI.

### 3. Document non-negotiables (Cursor rules + README)

- Add a **Cursor rule** (e.g. `.cursor/rules/chat-ptt-requirements.mdc`) stating:
  - The **standardized chat interface** must support **single-click** switching between **floating**, **fixed**, and **fullscreen**.
  - **PTT** must be integrated (hold to record, release to transcribe/send) inside that interface.
  - The **home page and all pages that offer chat** must use this interface, not a legacy floating widget without resize or PTT.
- Update **README** with a short "Core product requirements" section and link to a small doc (e.g. `docs/mvp/CHAT_AND_PTT_REQUIREMENTS.md`) that describes the standardized interface and PTT as non-negotiable.

### 4. WebsitePreview alignment with reference (from original plan)

- Chat Concierge: open with `isVoiceMode = false`.
- Voice Concierge: open with `isVoiceMode = true`.
- Nav "Concierge" button: open chat (e.g. `setIsChatOpen(true)`).
- Header: configurable agent name + "CONCIERGE" (e.g. "Ava CONCIERGE").
- Hamburger menu: Text Concierge, Voice Concierge, Admin.
- Voice footer: add "Restart Connection" button.
- Chat placeholder: "Ask me anything...".
- PTT error feedback when transcribe fails.

### 5. Embed script (phase 2)

For "simple include on any website," the **embed** (`gateway-chat.js`) should eventually render the same full interface (resize + PTT). That likely means building the embed from the same React component (or a vanilla JS replica of its behavior). After the home page uses the React-based standardized interface, the next step is to update the embed build so external sites get the same UI. Out of scope for the first phase.

---

## Files to touch

- **BusinessPage.tsx:** Remove embed injection for landing; render standardized chat component (or inline panel) and FAB/open trigger; remove or repurpose VoiceVisualizer.
- **WebsitePreview.tsx:** Either refactor to use shared `StandardizedChatPanel` or keep as-is and duplicate panel behavior on BusinessPage (Option B); apply header/menu/placeholder/PTT feedback fixes.
- **New (optional):** `client/src/components/StandardizedChatPanel.tsx` — shared component used by WebsitePreview and BusinessPage (Option A).
- **New:** `.cursor/rules/chat-ptt-requirements.mdc` — non-negotiable chat/PTT rules.
- **New (optional):** `docs/mvp/CHAT_AND_PTT_REQUIREMENTS.md` — short spec.
- **Edit:** README.md — core requirements section.

---

## Order of work

1. **Home page fix:** Stop injecting gateway-chat.js on landing; render the standardized chat interface (resize + PTT) on BusinessPage (Option A or B). Remove or repurpose VoiceVisualizer.
2. **Verify:** On `/`, open chat from FAB/Concierge → see layout cycle and PTT; no old widget; no broken LISTENING/SPEAKING as the main experience.
3. Add Cursor rule + README/doc.
4. WebsitePreview refinements (header, menu, Restart Connection, placeholder, PTT feedback).
5. Later: embed script updated to match full interface for third-party includes.

