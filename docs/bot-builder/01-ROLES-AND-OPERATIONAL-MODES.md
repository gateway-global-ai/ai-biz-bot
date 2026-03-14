# 01 — Roles & Operational Modes

Operational Modes are the **governance layer** of an agent. They control what the agent is allowed to do, which tools it can access, and how it must behave at runtime. The mode is injected as an absolute, non-negotiable directive — the agent cannot talk its way out of it.

Think of modes as job descriptions with enforced permissions, not just personality suggestions.

---

## The 10 modes at a glance

| Mode | Label | Core permission | Best for |
|------|-------|----------------|----------|
| `SAFE` | Safe Mode | Discussion only | FAQ bots, public kiosks, trade show demos |
| `CONCIERGE` | Concierge Mode | Routing only | Airport lobbies, hotel front desks, multi-department businesses |
| `RECEPTIONIST` | Receptionist Mode | Intake & data collection | Medical offices, law firms, service businesses |
| `SALES` | Sales Mode | Commerce generation (no payment) | Retail, e-commerce, service catalogs |
| `CASHIER` | Cashier Mode | Payment capture | Point-of-sale, checkout flows |
| `CUSTOMER_SUPPORT` | Customer Support Mode | Account access & resolution | Post-purchase support, membership businesses |
| `MANAGER` | Manager Mode | Oversight & approval | Franchise oversight, operations review |
| `RESEARCH` | Research Mode | Read-only discovery | Competitive intelligence, knowledge mining |
| `CODING` | Coding Mode | Write/execute access | Developer tools, AI OS configuration |
| `REVIEW` | Review Mode | Read/annotate only | Quality review, audit workflows |

---

## Mode deep-dives

### SAFE MODE
**What it does:** The agent answers questions only from its knowledge base. It cannot offer to perform any task, collect PII, or call any tools.

**When to recommend it:**
- Public kiosks where anyone might interact (no account context)
- Trade show demos where you don't want live data exposed
- Any agent where the owner is not yet ready to turn on intake

**What you say to the owner:** _"Safe Mode is like a read-only librarian. The agent can answer anything in its knowledge base but won't take any actions. It's perfect for a demo or a FAQ-only setup. No intake, no forms, just answers."_

---

### CONCIERGE MODE
**What it does:** The agent's sole job is to determine the caller's intent and route them to the right place. It does not solve problems — it gets them to the right person or resource fast.

**Tools available:** `request_manual_input`, `confirm_location_selection`, `get_business_details`

**When to recommend it:**
- Businesses with multiple departments (sales, support, reservations)
- Airports, hotels, large venues
- Any business where the front-door agent should triage, not resolve

**DISC recommendation:** High-S (Steadiness) for patience, moderate-I (Influence) for warmth. Avoid high-D as the agent should guide, not push.

**ARCH recommendation:** Keep Acknowledge high (70+), Context low (20–30) — acknowledge the caller quickly, don't over-explain, hand off fast.

**What you say to the owner:** _"Concierge Mode turns the agent into a smart switchboard. It listens, figures out what the caller needs, and points them in the right direction. It won't try to handle complex questions — that's by design."_

---

### RECEPTIONIST MODE
**What it does:** The agent can collect customer information, save inquiries and tickets, and schedule intake. It cannot resolve complex issues — it captures them for human follow-up.

**Tools available:** `request_manual_input`, `get_business_details`, `get_booking_and_pricing_info`, `query_knowledge_library`

**When to recommend it:**
- Medical, dental, legal, accounting offices
- Any service business where appointments or consultations are the first step
- Businesses with staff who handle follow-up

**DISC recommendation:** High-S (Steadiness), moderate-C (Conscientiousness) for accuracy. The receptionist should feel calm and thorough.

**ARCH recommendation:** High Acknowledge (75+), moderate Reflect (60), low Context (30) — validate the caller, confirm what you heard, don't over-explain.

**Response Window:** 15–20 seconds. Receptionist turns should be efficient.

---

### SALES MODE
**What it does:** The agent can present products and services, generate quotes, and add items to a cart. Payment is handed off to the Cashier agent or a secure link.

**Tools available:** All Receptionist tools plus `generate_quote`, `apply_discount`, `search_local_business`

**When to recommend it:**
- Retail stores, service menus, subscription products
- Any business where the agent should upsell or cross-sell
- Businesses with a product catalog in the knowledge base

**DISC recommendation:** High-I (Influence) for enthusiasm, moderate-D (Dominance) to close. The sales agent should be energetic but not pushy.

**ARCH recommendation:** Moderate Acknowledge (50), lower Reflect (40), higher Context (60) for product details, high Handoff (70) to move toward decision.

---

### CASHIER MODE
**What it does:** The agent has access to cart data and can provide secure payment links. It handles the final purchase step.

**Tools available:** `request_manual_input`, `get_booking_and_pricing_info`, `query_knowledge_library`, `stripe_checkout`, `send_onboarding_email`

**Critical rule:** The agent must confirm before any financial action. Never process payment without explicit customer confirmation.

**DISC recommendation:** Moderate all dimensions. The cashier should feel reliable and calm — not exciting, not boring.

**ARCH recommendation:** Confirm-heavy. High Reflect (70+) to confirm the order back to the customer before charging.

---

### CUSTOMER SUPPORT MODE
**What it does:** The agent can access customer account data — but only after the customer's identity has been verified via OTP or Magic Link. Identity verification is non-negotiable.

**When to recommend it:**
- Subscription or membership businesses
- Any business where customers have account data, order history, or loyalty points
- Post-purchase support and returns

**Important:** This mode requires NOVA Sovereign IDV to be configured. Do not recommend this mode without it.

---

### MANAGER MODE
**What it does:** An oversight agent with access to chat logs, cross-agent data, and approval rights. Used by franchise operators, district managers, or business owners reviewing AI performance.

**When to recommend it:**
- Multi-location businesses
- Owner-facing internal agents (not customer-facing)
- Quality assurance workflows

---

### RESEARCH, CODING, REVIEW MODES
These are developer and operator modes — not customer-facing. They are used for internal agent workflows and AI OS configuration tasks.

---

## Choosing the right mode — decision guide

Ask the owner these three questions:

1. **Will the agent collect any customer information?** → If no, use SAFE. If yes, continue.
2. **Will the agent need to take any actions** (book, quote, pay, route)? → If it routes only, use CONCIERGE. If it collects and saves, use RECEPTIONIST. If it creates orders, use SALES.
3. **Will the agent handle payments or access accounts?** → CASHIER for payments, CUSTOMER_SUPPORT for accounts.

---

## Mode and DISC interaction

The mode sets what the agent *can* do. DISC sets *how* it does it.

A SALES mode agent with high-I feels enthusiastic and warm.  
A SALES mode agent with high-D feels assertive and closing-focused.  
Both are in Sales Mode — the tool access is identical. The personality is different.

Always configure Mode first, then DISC.

---

## Common mistakes to catch

- Owner uses SAFE mode but wonders why the agent won't take bookings → Switch to RECEPTIONIST
- Owner uses SALES mode but has no product catalog in the knowledge base → Upload catalog first
- Owner uses CUSTOMER_SUPPORT mode without identity verification configured → Verify IDV is set up
- Owner leaves mode at default (SAFE) after onboarding → Walk them through selecting the correct mode
