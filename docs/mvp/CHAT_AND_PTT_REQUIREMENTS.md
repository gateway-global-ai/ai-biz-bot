# Chat and PTT Requirements (Non-Negotiable)

This document defines the **non-negotiable** customer-facing chat and voice experience. These requirements apply to the website preview, landing page, and any embed that offers chat.

## 1. Standardized chat interface

- **Layout modes:** The chat panel must support three modes, switchable with a **single click** (one button cycles):
  - **Floating** — Card-style panel (e.g. bottom-right, fixed size).
  - **Fixed** — Sidebar attached to one edge (e.g. right, full height).
  - **Fullscreen** — Full viewport.
- Cycle order: floating → fixed → fullscreen → floating. No removal of this control.

## 2. PTT (Push-To-Talk)

- **Behavior:** User holds a button to record; on release, audio is sent for transcription and the transcript is used as the next user message (and optionally sent to the chat API).
- **Voice view must include:**
  - A clear "Secure PTT Mode" / "Voice Engine" style header.
  - Transcription preview area ("Hold the button below to capture audio" when idle).
  - A prominent **Hold to Record** (or equivalent) button; visual feedback when recording (e.g. "Capturing...").
  - Optional: Review queue (Send Now / Discard) before sending to chat.
- **Restart Connection** (or equivalent) in the voice view footer so users can recover from a stuck voice state.

## 3. Entry points and header

- **Entry points:**
  - **Voice Concierge** — Opens the chat panel in **voice/PTT view**.
  - **Chat Concierge** — Opens the chat panel in **text view**.
  - **FAB** (or single "Concierge" button) — Opens the chat panel (default to text or last view).
- **Header:** Show **agent name** and **role** (e.g. "Ava" and "CONCIERGE"), not only a generic "AI" or "Chat" label. Values may be configurable (e.g. from business/agent config).

## 4. In-panel menu

- A menu (e.g. hamburger in the header) must provide:
  - **Text Concierge** — Switch to text chat view.
  - **Voice Concierge** — Switch to voice/PTT view.
  - **Admin Dashboard** — Open admin/settings when applicable (e.g. in preview/demo).
- Optional: Interface Theme / customizer link.

## 5. Chat input

- Placeholder text for the text input must be **"Ask me anything..."** (or equivalent) to match the reference design.

## 6. PTT reliability

- If transcription fails or returns empty, show a short user-visible message (e.g. "Couldn't hear that. Try again.") in the voice view or as an assistant message.
- Voice Concierge entry must open the panel in voice view with PTT available; no code path should leave the user in text view when they explicitly chose Voice Concierge.

---

**References:** [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md), [SCOPE.md](SCOPE.md), [../architecture/](../architecture/) for architecture docs.
