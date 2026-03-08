# Home Page & Hamburger Menu System

## Overview

- **Home page**: Fixed header with chat button; no floating FAB. Share and My Account are not in the header—they live inside the chat window’s hamburger menu. Below autocomplete: MANIFESTO and AI BIZ BOT buttons (dark blue, white text). Marketing paragraph removed.
- **Hamburger menu**: Single entry point for all navigation. Admin vs User sections; nested categories; agents (Manifesto, AI Biz Bot) with telephony; Referral Program with Dashboard, Affiliates, etc.

---

## 1. Home Page

### Header (fixed)
- **Position**: `fixed top-0 left-0 right-0 z-50` so it stays on scroll.
- **Contents**: Logo (left) | **Chat** button (opens ConciergePanel) | (Share and My Account removed from header; available in hamburger menu).
- **Chat button**: Modern dark blue with white text, e.g. “Chat” or “Chat with AI Biz Bot”, opens the panel (voice/chat + menu).

### Hero
- Headline + “Request Your QR Code”.
- **Place autocomplete** (unchanged).
- **Removed**: “Gateway Global currently offers AI voice for businesses…” paragraph.
- **Below autocomplete**: Two buttons in a row:
  - **MANIFESTO** – dark blue, white text. Opens chat/voice with Manifesto agent (platform economy, small business struggles, hope, “you’re in the right place”).
  - **AI BIZ BOT** – dark blue, white text. Opens chat/voice with AI Biz Bot agent (product-market fit, knowledge base, product expert).

### No floating FAB
- The previous floating “Hold to speak” / Gateway icon button is removed; the only way to open the panel is the header Chat button (and the two agent buttons can open the panel with the right agent pre-selected).

---

## 2. Hamburger Menu Structure (inside ConciergePanel)

When the user opens the chat panel and taps the hamburger (or equivalent), they see a one-to-many menu: pick a category and only that category’s content is shown.

### Admin Section

| Item | Sub-items | Behavior |
|------|-----------|----------|
| **Account** | Profile, A2P Compliance, Globals | Profile → existing ProfileContent. A2P Compliance → compliance-gateway or embedded. Globals → TBD (settings/globals). |
| **Agents** | Manifesto (Telephony), AI BIZ BOT (Telephony) | Manifesto → switch to Manifesto agent (voice/chat). AI BIZ BOT → switch to AI Biz Bot agent. Telephony = voice/phone for that agent. |
| **Referral Program** | Dashboard, Affiliates, Customers, Commissions, Invite Tool | Dashboard → summarize + activity. Affiliates/Customers → contact manager. Commissions → levels & %. Invite Tool → SMB owners, team members. |

### User Section

| Item | Sub-items | Behavior |
|------|-----------|----------|
| **Profile** | — | Same as current Profile (account info). |
| **Compliance** | — | A2P / compliance. |
| **Telephony** | — | Voice/phone settings or status. |
| **Referral Program** | Dashboard, Referrals, Team Members, Invite Tool, Commission Level, Payouts | Dashboard → summary + activity. Referrals / Team Members → contact manager. Invite Tool → SMB owners, team members. Commission Level → status, progress. Payouts → payout history. |

---

## 3. Agents

### Manifesto agent
- **Role**: Speaks to challenges in the Platform Economy and small business struggles; mirrors the manifesto and instills hope.
- **Message**: Technology can be complicated but is necessary; if you want to deploy the latest technology, you’re in the right place.
- **Entry**: MANIFESTO button on home page; also under Hamburger → Admin → Agents → Manifesto (and Telephony for voice).

### AI Biz Bot agent
- **Role**: Product and market-fit expert; solid knowledge base and understanding of the business.
- **Entry**: AI BIZ BOT button on home page; also under Hamburger → Admin → Agents → AI BIZ BOT (and Telephony for voice).

Both agents appear in the hamburger menu under Agents so users can switch context without leaving the panel.

---

## 4. Implementation Notes

- **Header**: Use `fixed` and add padding to the main content (e.g. `pt-16` or similar) so content is not hidden under the header.
- **Chat open state**: Lifted in BusinessPage; header “Chat” button sets `setIsChatOpen(true)` (and optionally `setInitialView('voice')` or agent).
- **MANIFESTO / AI BIZ BOT**: Can pass an `agentMode` or `agentId` into ConciergePanel so it loads the right system prompt / knowledge (when those are configured in backend).
- **Menu**: ConciergePanel’s Command Center menu is restructured to the Admin/User tree above. Existing embedded views (profile, billing, my-businesses, reseller) map to the new labels; new items either open new embedded views or navigate to existing routes (e.g. `/compliance-gateway`, `/mixing-board`).

---

## 5. File Touchpoints

- `client/src/pages/customer/BusinessPage.tsx` – Header (fixed, chat button), remove paragraph, add MANIFESTO + AI BIZ BOT, remove FAB.
- `client/src/components/chat/ConciergePanel.tsx` – Hamburger/Command Center menu: Admin (Account, Agents, Referral Program) and User (Profile, Compliance, Telephony, Referral Program) with nested items and one-to-many display.
