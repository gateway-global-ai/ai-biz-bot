# 07 — Routing & Telephony

Routing and Telephony are the **distribution layer** of the agent. This is how people find the agent, how they reach it by phone, and how the agent's presence is extended into the physical and digital world.

A perfectly built agent that nobody can reach is worthless. Routing and Telephony are what make the agent discoverable and operational at scale.

---

## Part 1: Routing

Routing covers three channels: QR codes, sharing URLs, and external links.

---

### QR Codes

QR codes are the fastest way to put an agent in front of a customer in a physical environment. Every agent on the platform gets a unique QR code tied to its slug URL. Scanning it opens the agent's full voice + chat interface in any browser, no app required.

#### What the QR code links to
The QR code links to `/biz/[slug]` — the business's public agent page. This page loads the voice concierge immediately, optionally with a hero image and business branding.

#### Where QR codes go
Physical placements that consistently perform:
- **Table tents and menus** (restaurants, cafés) — "Talk to our AI concierge"
- **Reception desk signage** (salons, medical offices, hotels)
- **Lobby displays** (airports, convention centers, retail)
- **Business cards** — the agent as a 24/7 representative
- **Packaging and receipts** — post-purchase support or re-order flow
- **Window clings** — after-hours access to FAQs and booking
- **Event badges and handouts** — instant agent access at trade shows

#### QR Network Manager
The platform includes a full QR Network Manager that allows the owner to:
- Generate new QR codes for different destinations
- Track scan counts and analytics
- Route different QR codes to different agents or pages
- Create campaign-specific QR codes

**What you tell owners:** _"Every QR code is a front door to your agent. Put one at your checkout counter, one on your menu, one on your website — everywhere a customer might want to ask a question or book something. Each scan is a potential conversation, a potential sale."_

---

### Sharing URL

The sharing URL is the web-accessible link to the agent. Format: `https://[platform-domain]/biz/[slug]`

#### Uses for the sharing URL
- Linktree and social media bios ("Chat with our AI Concierge")
- Website chatbot replacement — embed or link directly
- Email signatures and campaigns
- Google Business Profile
- SMS campaigns ("Reply TALK to get our AI on the phone")
- Digital advertising call-to-action

#### Slug best practices
- Keep it short and memorable
- Use the business name, not a UUID
- Lowercase, hyphen-separated: `lovely-lashes-salon-las-vegas`
- Include city if the business has multiple locations

---

### External Links

External links in the Routing panel let the owner surface the business website, online store, booking platform, or delivery service alongside the agent.

Examples:
- "Visit our website" → `[businessname].com`
- "Book online" → Calendly, Mindbody, OpenTable, Square Appointments
- "Order online" → DoorDash, Uber Eats, business's own store
- "Shop our products" → Shopify, WooCommerce, Etsy

These links appear in the Routing panel UI and can be referenced by the agent in voice: *"I've pulled up our booking page on screen — you can pick your time right there."*

---

## Part 2: Telephony

Telephony is what turns a web-only agent into a **true phone presence**. With a provisioned phone number, the agent answers inbound calls, handles them with voice AI, and routes to humans when needed.

This is the core of the platform's value for local businesses — a real phone number that never misses a call, never puts a customer on hold without reason, and operates 24/7.

---

### Phone Number Provisioning

The platform provisions real Twilio phone numbers. When a number is provisioned:
- Voice calls to that number are answered by the Gemini Native Audio pipeline
- SMS to that number is routed through the Sovereign SMS Router
- The number becomes the business's "AI trunk line"

#### Area code selection
The owner can search for numbers by area code. Best practices:
- Match the business's local area code for trust and familiarity
- For national businesses, choose a neutral area code (800, 888, or a major metro)
- Avoid shared or recycled numbers when possible

#### What provisioning does automatically
1. Assigns the phone number to the agent's site config
2. Configures Twilio voice webhooks → voice AI pipeline
3. Configures Twilio SMS webhooks → Sovereign SMS Router
4. Sets the maximum call duration (default: 60 minutes)
5. Sets the connection timeout (default: 30 seconds)

---

### Telephony Configuration

After provisioning, the Configuration tab allows the owner to customize:

| Setting | What it controls | Recommended default |
|---------|-----------------|---------------------|
| Friendly Name | Label for the number in Twilio | Business name |
| Voice URL | Webhook for incoming calls | Set automatically |
| Voice Fallback URL | Backup if primary fails | Platform fallback |
| Status Callback URL | Call status events | Platform analytics |
| SMS URL | Webhook for incoming SMS | Sovereign SMS Router |
| Max Call Duration | Maximum call length in minutes | 60 |
| Timeout | Seconds before call is abandoned | 30 |

Most owners should leave webhooks on auto-configure. The URLs point to the platform's voice AI and SMS routing infrastructure.

---

### Firewall (Call Screening)

The firewall panel allows the owner to:
- **Allowlist specific numbers** — these always get through, regardless of spam scoring
- **Block known spam numbers** — incoming spam callers are rejected before reaching the AI
- **Set owner phone** — the owner's personal number for call routing and notifications
- **Set owner email** — for call summaries, transcripts, and missed-call notifications

#### When to use the firewall
- High-volume businesses that get spam calls (use blocking rules)
- Businesses with VIP clients who should always reach a live agent (use allowlist)
- Multi-owner businesses where different numbers route to different staff

---

### Diagnostics

The Diagnostics panel is for testing and monitoring.

**Test outbound calls:** Dial any number from the provisioned trunk line to confirm outbound is working.

**Test inbound simulation:** Simulate an inbound call to verify the voice AI pipeline responds correctly.

**Webhook simulation:** Send test webhook payloads to confirm the SMS and voice routing infrastructure is live.

**Event log tail:** Watch real-time webhook events as they arrive — useful for debugging routing issues.

---

### Call History

Call History shows every inbound and outbound call on the provisioned number:
- Date, time, duration
- Caller ID
- Call status (completed, missed, busy)
- Whether the call was handled by AI or transferred

This is the **Revenue Event log** — every call is a potential conversion. Owners should review call history weekly to understand:
- Peak call times (for staffing and AI availability planning)
- Missed call patterns (opportunity to improve)
- Common call reasons (inform the knowledge base)

---

### SMS Configuration

The Sovereign SMS Router handles all inbound and outbound SMS on the provisioned number. It classifies every message by intent and routes it through one of six compliance-registered pipes:

| Pipe | Use |
|------|-----|
| `PLATFORM_OTP` | Platform authentication codes |
| `PLATFORM_CARE` | Platform support messages |
| `PLATFORM_MKTG` | Platform marketing messages |
| `CUSTOMER_OTP` | Business customer verification codes |
| `CUSTOMER_CARE` | Business customer service messages |
| `CUSTOMER_MKTG` | Business marketing and promotional messages |

**Why this matters:** A2P 10DLC compliance. Every business SMS message must be sent through a registered campaign. The platform handles this automatically — the owner never has to register campaigns manually.

**What you tell owners:** _"Every text message from your number goes through a compliance router. This keeps you off carrier blacklists, off TCPA violation lists, and ensures your messages actually get delivered. It's infrastructure that most businesses never think about until something goes wrong — and then it's expensive."_

---

### Telephony pricing

The platform's telephony is built on top of Twilio. The owner's plan determines:
- **$49/mo Platform Fee** — base access
- **$50/mo Voice AI Package** — includes the AI voice pipeline on the phone number
- **$0.25/min overage** — billed per minute after the included allocation

A provisioned phone number without the Voice AI Package answers calls but does not route to AI — it connects to voicemail or forwards to a human number.

---

### Telephony setup checklist

```
[ ] 1. Provision phone number (search by area code)
[ ] 2. Confirm webhooks are set (auto-configured on provisioning)
[ ] 3. Set owner phone and email in Firewall
[ ] 4. Run a test inbound call from Diagnostics
[ ] 5. Run a test outbound call from Diagnostics
[ ] 6. Review Call History after first day of operation
[ ] 7. Configure SMS pipe for marketing if needed
```

---

### Common telephony questions from owners

**"Can I keep my existing number?"**  
Yes — Twilio supports number porting. The process takes 2–4 weeks and requires a Letter of Authorization from the current carrier. The AI Bot Builder cannot initiate porting — this requires a platform support request.

**"What happens if the AI can't answer the question?"**  
The agent can transfer the call to the owner's number (configured in Firewall settings) or offer a callback. The handoff is handled gracefully via the ARCH Handoff protocol.

**"Does the agent work after business hours?"**  
Yes — the agent operates 24/7. After-hours calls can follow a different script (configured in the task order) and may take messages or route to an emergency contact.

**"Can I see what people are saying in calls?"**  
Transcripts are logged per session in the Chat Log. With the Voice AI Package active, every call produces a searchable transcript.

**"What if I get a lot of spam calls?"**  
Use the Firewall blocking rules. The platform also has carrier-level spam detection on inbound numbers.
