# Communication Engine Specification

Reference document for the **programmatic-sales-engine** skill. This specification defines how governed agents compose outbound communication in sales contexts across channels, and how those messages tie to intent, funnel state, and canvas views.

---

## 1. Core Rule

Every agent message in a sales context must carry **four components**:

1. **Intent classification** — One of: `capture` | `qualify` | `convert` | `followup` | `reactivate`
2. **Call to action (CTA)** — Explicit next step for the customer
3. **State update trigger** — What stage transition this message moves toward (or preserves, with justification)
4. **View pairing** — Which canvas **View** renders alongside the verbal message (or `N/A` only where the channel contract forbids paired UI)

**Invariants:**

- No message without intent.
- No interaction without a state update (log + phase evaluation).
- No message without CTA.

Messages that omit any component are non-compliant for production sales flows and must be blocked or repaired at compile/render time according to channel policy.

---

## 2. Intent Classification

| Intent | Definition | Example message | Typical CTA |
|--------|------------|-----------------|-------------|
| **capture** | First contact; collect basic context and permission to continue | "How can I help you today?" | Ask name, need, or preferred outcome |
| **qualify** | Assess fit, budget, timeline, urgency | "What are you trying to solve right now?" | Confirm problem scope or disqualify gently |
| **convert** | Present solution; move toward commitment or activation | "Let's get this set up for you." | Start activation, choose plan, or book |
| **followup** | Re-engage after pause or partial completion | "Just checking in — did you still want help?" | Confirm interest or offer a single clear option |
| **reactivate** | Win back stalled or lost lead | "We noticed you didn't move forward — want to revisit?" | Offer new angle, incentive, or simplified path |

Intent is **orthogonal** to channel: the same intent may be expressed on voice, SMS, email, or web chat with different surface constraints (length, ARCH, templates).

---

## 3. Communication Channels

| Channel | Mechanism | Notes |
|---------|-----------|--------|
| **voice_ai** | Gemini Native Audio via PTT or full duplex | Execution-plane latency constraints apply; see governance docs for frozen paths |
| **sms** | Sovereign SMS Router (A2P compliant, six-pipe intent dispatch) | All sends route through classified pipes; no ad hoc `messages.create` from routes |
| **email** | Gmail API via service account | Prefer structured templates over free-form model output |
| **web_chat** | `POST /api/chat` or website chat handler | Full text path; ARCH and grounding rules apply as documented |

### ARCH budget enforcement by channel

- **Voice** — `maxSentences` from `outputContract`; **non-blocking** ARCH relative to execution plane; validators must not block live audio paths.
- **Text chat** — Full ARCH envelope validation with fallback or replacement when invalid.
- **SMS** — Short-form, CTA-focused, A2P compliant; length and content must respect carrier and campaign rules.
- **Email** — Structured templates; body generation is not open-ended prose from the model unless explicitly allowed by policy.

---

## 4. Communication Governance Integration

Aligned with `docs-governance/COMMUNICATION_PLANE_CONTRACT.md` and related contracts:

- **CGR (Conversation Grounding Record)** — Mandatory per session where the communication plane is active; links utterances, tool outcomes, and policy snapshots.
- **ARCH validation** — Required on text paths (website chat, `POST /api/chat`) per project policy.
- **PPP shadow scoring** — Audit-only on chat; **non-blocking** for user-facing latency.
- **Voice / Gemini Live** — Async hints only; **no blocking validators** on the execution plane.
- **Disclosure** — Progressive, not maximal upfront; timing and depth are **policy decisions**, not model improvisation.

Implementers must read the live governance files for field names, endpoints, and enforcement hooks; this document states **behavioral** requirements only.

---

## 5. Message Templates Per Intent

Templates are **patterns**, not literal copy. Replace bracketed slots with governed fragments (industry, business name, agent name, approved links).

### capture

```
Voice: "[Bold claim about their industry]. How can I help you today?"
Canvas: OSMenuList with business-specific intent chips
SMS: "Hi [Name], this is [Agent] from [Business]. How can I help?"
```

### qualify

```
Voice: "What are you trying to solve right now? Is it [pain point A] or [pain point B]?"
Canvas: SharedCanvasPanel with problem/solution matrix
SMS: "Quick question — are you looking for [A] or [B]? Reply and I'll get you set up."
```

### convert

```
Voice: "Here's what I recommend. Let me show you the options."
Canvas: Pricing View with plan comparison table
SMS: "Your [product] is ready. Tap here to complete: [link]"
```

### followup

```
Voice: N/A (followup is async relative to real-time session)
Canvas: N/A
SMS: "Just checking in — did you still want help with [topic]?"
Email: Structured template with recap + CTA button
```

### reactivate

```
Voice: N/A
SMS: "We noticed you didn't move forward — we have a new [offer]. Want to revisit?"
Email: Re-engagement template with new value proposition
```

`N/A` for voice or canvas means the **default** delivery for that intent is not a live duplex turn or paired in-session view; other channels carry the intent unless product policy defines an exception.

---

## 6. State Update Rules

- Every outbound or assistant-visible message must **log the intent classification** (structured field, not inferred-only in logs).
- Every customer response must be evaluated against **requiredContextKeys** for the current phase.
- If all required keys for the phase are satisfied: advance via **`resolveCurrentPhase`** (or equivalent phase resolver in the sales state machine).
- If the lead is unresponsive: **time thresholds** trigger automation (see `STATE_MACHINE_SPEC.md` in this skill or repo governance for canonical thresholds and actions).

State updates are **not optional** side effects; they are part of the communication contract for measurable funnel integrity.

---

## 7. CTA Design Rules

- **Voice CTA** — End with a **question** or **binary choice** (ARCH H-budget requirement: customer must know how to respond in one breath).
- **Text CTA** — Include a **clickable** or **unmistakably actionable** step: link, button reference (client-rendered), or explicit instruction that maps to a single action.
- **SMS CTA** — Target **max 160 characters** per segment where possible; include a **short link** when the flow requires navigation.
- **Global** — No message may end without a **clear next step** for the customer.

---

## 8. Token Discipline Per Channel

- **Voice** — Respect `maxSentences` from `outputContract` (typical range **8–14** per phase unless policy overrides).
- **Text chat** — ARCH token budgets (illustrative: **A** 1–2 clauses, **R** 0–2, **C** required, **H** required); exact letters and limits follow the deployed ARCH schema.
- **Budget exceeded** — Prefer rendering a **View** (table, chooser, confirmation) instead of a prose dump.
- **SMS** — **Max 160** characters per segment; prefer **single-segment** messages when content allows.
- **Email** — **Structured templates**; avoid open-ended generation for compliance and brand control.

---

## 9. Cross-References

- `docs-governance/COMMUNICATION_PLANE_CONTRACT.md` — Plane contract, CGR, disclosure, validation placement.
- `docs-governance/COMMUNICATION_GOVERNANCE_SCORECARD.md` — Scoring and audit expectations where applicable.
- View and action registries — Pairing of **View** ids to intents and phases.
- `STATE_MACHINE_SPEC.md` — Phases, timeouts, and automation (path as defined by the skill or repo).

---

## Document control

- **Audience:** Implementers of sales swarms, prompt compilers, and channel adapters.
- **Style:** No emojis; no decorative Unicode. Prefer explicit enums and tables over narrative drift.
- **Versioning:** Update this file when intent enums, channel list, or ARCH integration changes; keep governance docs as the legal source for enforcement mechanics.
