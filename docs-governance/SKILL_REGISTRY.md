# Skill Registry

## Purpose

Skills are named capability packs that a business activates one at a time through the AI Bot Builder.
Each skill unlocks a set of menu items, agent behaviors, and/or OS features once its preflight
steps are completed. No skill is active by default.

## Schema anchor

Skills are stored in `siteConfigs.config` as a JSONB map:

```json
{
  "skills": {
    "booking":  { "status": "active" },
    "sms":      { "status": "pending" },
    "payments": { "status": "off" }
  }
}
```

Valid statuses: `"off"` (default) | `"pending"` (steps started, not complete) | `"active"` (fully configured).

---

## Registered Skills

### `booking`
**Label:** Appointments & Calendar  
**Unlocks:** Appointments card in customer and employee menus, calendar-view, booking-view, reschedule-view.  
**Requires:**
- Calendar integration connected (`siteConfigs.config.calendarConnected = true`)  
- Booking engine URL set (`siteConfigs.bookingEngineUrl` is non-null)  

**Bot Builder steps:**
1. Connect Google Calendar (OAuth workspace integration)
2. Set available hours / booking rules
3. Set booking engine URL (or use built-in)
4. Test a booking end-to-end
5. Owner approves → status → `"active"`

---

### `sms`
**Label:** SMS & Text Notifications  
**Unlocks:** SMS opt-in flow, SMS notification delivery, Sovereign SMS Router pipes for this business.  
**Requires:**
- Twilio phone number provisioned for this business  
- A2P 10DLC campaign approved (or platform shared campaign)  
- Owner has accepted SMS compliance terms  

**Bot Builder steps:**
1. Verify phone number assignment
2. Confirm A2P compliance status
3. Review and accept SMS opt-in language
4. Send test message to owner's number
5. Owner approves → status → `"active"`

---

### `payments`
**Label:** Payments & Invoicing  
**Unlocks:** Order flow, payment link generation, invoice view in customer menu.  
**Requires:**
- Stripe account connected (`siteConfigs.stripeAccountId` is non-null)  
- At least one product or service defined in `platformProducts`  

**Bot Builder steps:**
1. Connect Stripe account
2. Add at least one service or product
3. Set pricing and tax rules
4. Run a test transaction (Stripe test mode)
5. Owner approves → status → `"active"`

---

### `reviews`
**Label:** Review Management  
**Unlocks:** Review request automation, review-view in manager menu, reputation signals in AI context.  
**Requires:**
- Google Business Profile verified  
- Review request SMS/email template set  

**Bot Builder steps:**
1. Connect Google Business Profile
2. Set review request template (voice or SMS)
3. Define trigger event (e.g. after checkout, after appointment)
4. Send test review request
5. Owner approves → status → `"active"`

---

### `loyalty`
**Label:** Loyalty & Rewards  
**Unlocks:** Customer loyalty card view, point balance in customer account.  
**Requires:**
- Loyalty program rules defined  
- Customer account skill active (prerequisite)  

**Bot Builder steps:**
1. Define points-per-dollar or visit-based rules
2. Set reward thresholds and redemption options
3. Test with a sample customer account
4. Owner approves → status → `"active"`

---

### `voice_ai`
**Label:** Voice AI Concierge (ClearVoice)  
**Unlocks:** Live PTT, voice transcription, AI voice agent for inbound calls.  
**Requires:**
- ClearVoice subscription active  
- Twilio phone number assigned  
- Agent system prompt compiled and approved  

**Bot Builder steps:**
1. Verify ClearVoice subscription
2. Set agent name and voice
3. Complete brand + system prompt (links to Brand Governance preflight)
4. Test live call
5. Owner approves → status → `"active"`

> Note: `voice_ai` is the foundational skill. It is also the entry point of the Bot Builder flow.
> All other skills are additive on top of it.

---

### `verification_guest_phone`
**Label:** Guest phone verification (PMS)  
**Unlocks:** Server-side gate for hospitality tools that require OTP before phone-based guest lookup (e.g. Cloudbeds journey); NovaGate `guest_phone` mode when triggered by UI or `nova-guest-verify` event.  
**Requires:**
- Twilio Verify configured (or dev bypass per environment)  
- `siteConfigs.config.skills.verification_guest_phone.status === "active"`

**Bot Builder steps:**
1. Confirm Twilio / messaging compliance for the business
2. Enable skill → status `"active"`
3. Test OTP send + verify on a concierge demo

---

### `verification_check_in`
**Label:** Check-in verification  
**Unlocks:** Same tool gate as guest phone, with `guest_checkin` flow type for check-in-specific copy and session labeling.  
**Requires:**
- Same as `verification_guest_phone` — Twilio Verify (or dev bypass)  
- `siteConfigs.config.skills.verification_check_in.status === "active"`

**Bot Builder steps:**
1. Align with property PMS / front-desk workflow
2. Enable skill → `"active"`
3. Test OTP path on kiosk or concierge

---

### `customer_intake`
**Label:** New customer field capture  
**Unlocks:** Owner-defined checklist for **first name, last name, cell phone, email, address** when creating net-new customers or leads; injected into compiled voice/chat instructions from `agentConfig.intakePolicy.newCustomerIntakeFields`.  
**Requires:**
- At least one field **enabled** in Platform Settings → Intake Governance (stored in `site_configs.agent_config.intakePolicy`).

**Bot Builder steps:**
1. Open Platform Settings → Intake Governance → **New customer capture**
2. Toggle fields on/off and mark **Required** where appropriate
3. Save — prompts gain a **NEW CUSTOMER CAPTURE** block automatically

---

### `caller_id_lookup`
**Label:** Twilio inbound Caller ID / CNAM (policy tool)  
**Unlocks:** Server tool `get_inbound_caller_identity` (policy + disclosure). Does **not** stream raw PSTN identity into browser voice; PSTN Caller Name depends on Twilio account settings and may incur **per-lookup** fees (verify Twilio pricing; stakeholder estimate ~$0.01/call).  
**Requires:**
- Skill enabled + **pricing acknowledged** in Platform Settings → Intake Governance (`agentConfig.intakePolicy.callerIdLookup`)
- Twilio number configured for inbound Caller Name in Twilio Console (operational prerequisite)

**Bot Builder steps:**
1. Confirm Twilio inbound number and Caller Name / CNAM product availability
2. Enable skill and acknowledge pricing disclosure
3. Test on **PSTN** inbound — browser voice receives policy text only via the tool

---

## Capability derivation

The `siteCapabilities` object passed to the OS shell is derived from the enabled skill set:

```typescript
const siteCapabilities = {
  booking:  skills.booking?.status  === 'active',
  sms:      skills.sms?.status      === 'active',
  payments: skills.payments?.status === 'active',
  reviews:  skills.reviews?.status  === 'active',
  loyalty:  skills.loyalty?.status  === 'active',
  voice_ai: skills.voice_ai?.status === 'active',
};
```

This object is computed in `ConciergePanel` from `siteConfigs.config.skills` and passed down to
`useOSMenu` and any other feature-gated shell component.

---

## Bot Builder protocol

Each skill activation is guided by the **AI Bot Builder** agent (`/agents` route). The Bot Builder:

1. Presents the skill's description and what it unlocks.
2. Walks through each preflight step conversationally (voice-first).
3. On each step completion, PATCH-es `siteConfigs.config.skills.<skillId>.status` to `"pending"`.
4. When all steps pass, proposes owner approval.
5. On approval, PATCH-es status to `"active"`, which immediately unlocks the menu card.

The Bot Builder must not skip steps. Steps are ordered and each depends on the previous.

---

## Execution-plane spatial skills

Map choreography, boundary-locked search, and itinerary playback are **not** fully described in this registry until productized as Bot Builder skills. Their **tool contracts, state machines, and refusal text** are defined in [`SKILLS_GOVERNANCE.md`](./SKILLS_GOVERNANCE.md) (`spatial_transition`, `boundary_lock`, `temporal_itinerary`). Add rows here when those capabilities get `siteConfigs.config.skills.*` entries.

---

## Rules

- NEVER activate a skill by directly setting `status = "active"` in code without all steps passing.
- NEVER show a skill's menu card when `status !== "active"`.
- NEVER hardcode a skill's feature gate in a UI component — always derive from `siteCapabilities`.
- Adding a new skill requires an entry in this registry before any code is written.
- Removing a skill requires migrating existing `"active"` records before removing the menu item.
