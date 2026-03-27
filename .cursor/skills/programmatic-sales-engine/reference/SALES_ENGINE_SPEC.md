# Programmatic Sales Engine — Reference Specification

Reference document for the **Programmatic Sales Engine** skill. The engine runs on the Gateway Global AI OS under Sovereign governance (registries, compilers, policy, audit).

---

## 1. Sales Engine Overview

The sales engine converts strangers into customers through **controlled state transitions**: each touchpoint advances or branches the funnel according to declared rules, not ad hoc prompting.

| Principle | Meaning |
|-----------|---------|
| Every interaction = state change | Treat dialogue as transitions on a defined model (funnel phases, workflow steps, terminal actions). |
| Every message = conversion attempt | Copy and structure should advance objective, capture signal, or recover toward a route. |
| Every delay = revenue loss | Latency and idle gaps are first-class risks; automation and first-responder discipline are non-optional. |

The engine is **industry-agnostic**: vertical behavior is expressed via funnel templates, workflows, and governance config—not hardcoded routes. It operates **inside** the Sovereign OS stack (schema anchors, prompt compiler, execution-plane boundaries, Safe Mode, and audit artifacts).

---

## 2. Sales Funnel Data Model

### Storage

Funnels are persisted on the site configuration as a JSONB array:

- **Column:** `site_configs.sales_funnels` (JSONB array of funnel objects)

### Funnel object (conceptual schema)

```json
{
  "id": "string",
  "name": "string",
  "terminalAction": "book | buy | signup | support | lead",
  "entryPoints": [],
  "digitalTree": {
    "L0": {},
    "L1": {},
    "L2": {},
    "L3": {},
    "L4": {}
  },
  "conversionObjective": "string",
  "fallbackRoutes": [],
  "conversationWorkflow": null
}
```

| Field | Description |
|-------|-------------|
| `id` | Stable identifier for routing and compiler references. |
| `name` | Human-readable label. |
| `terminalAction` | Intended end-state for this funnel instance. |
| `entryPoints` | Declared ingress (e.g. QR, web, voice, campaign) tying traffic to this funnel. |
| `digitalTree` | Layered menu / drill-down structure (L0–L4) for governed navigation. |
| `conversionObjective` | Single-line objective used in compiled prompts and metrics alignment. |
| `fallbackRoutes` | Alternate paths when primary branch fails or user refuses. |
| `conversationWorkflow` | Optional structured phase machine (see prompt compiler integration). |

### Terminal actions

| Action | Semantics |
|--------|-----------|
| `book` | Appointment or reservation committed or strongly intent-locked. |
| `buy` | Purchase path (cart, checkout, or equivalent). |
| `signup` | Account, program, or subscription enrollment. |
| `support` | Issue triage resolved or escalated per policy. |
| `lead` | Contact and qualification data captured for follow-up. |

### Safe Mode (Phase 1)

Without a paid plan / entitlement, **only `lead`** is available as a terminal action for outbound conversion claims; other terminal actions require appropriate licensing and pre-flight gates.

---

## 3. Revenue Event Taxonomy

Events are **billing- and analytics-grade** signals. They should be logged consistently (e.g. `chatLogs`, `callLogs`) so downstream pipelines can attribute revenue and funnel performance.

| Event | Strength | Typical use |
|-------|----------|-------------|
| `lead_captured` | Weak | Form fill, partial identity, low-commitment handoff. |
| `intent_expressed` | Moderate | Explicit product/service interest without completion. |
| `appointment_booked` | Strong | Calendar or booking system confirmation. |
| `purchase_initiated` | Strong | Checkout started, payment method presented. |
| `verification_completed` | Strong | IDV or policy gate satisfied (e.g. Nova IDV level met). |
| `purchase_completed` | Conversion | Paid or fully closed transaction per business rules. |

**Rule:** Prefer **one primary event** per milestone; correlate weaker signals for funnel analytics rather than double-counting conversions.

---

## 4. Sales Operating Principles (Laws)

| Law | Statement |
|-----|-----------|
| `first_responder_wins` | Speed of first meaningful response dominates conversion; queueing and human delay are explicit failure modes. |
| `speed_beats_perfection` | Target **~60 seconds** (or better) to first response; good-enough structured reply beats delayed polish. |
| `ownership_beats_access` | The business **owns** the relationship and data paths; the platform provides rails, not a rented audience. |
| `automation_beats_manual_followup` | Next steps, reminders, and stage transitions come from **state machines and triggers**, not operator memory. |
| `data_capture_is_mandatory` | No interaction without capturing **customer context** (identity slice, intent, constraints) within policy and consent. |

These laws inform skill design: funnels, workflows, views (canvas handoff), and metrics—not optional “tone” guidelines.

---

## 5. ARCH Token Budget Enforcement

**ARCH** (Acknowledge / Reflect / Context / Handoff) constrains **how much** the model may say per section before it must change shape (e.g. render a View).

| Segment | Budget | Requirements |
|---------|--------|----------------|
| **A** (Acknowledge) | 1–2 clauses | Acknowledge the customer’s input; no derailing. |
| **R** (Reflect) | 0 clauses (transactional); 1–2 (support/complaints) | **Forbidden** for regulated or uncited factual claims. |
| **C** (Context) | As needed within cap | Must include **next action**, **constraints**, and **evidence references** when stating facts. |
| **H** (Handoff) | Tight | Exactly **one** explicit question **or** **one** explicit option set. |

### Over-budget behavior

If a candidate response **exceeds** the envelope budget, the agent **must** render a **View** (server-driven / canvas layout) instead of streaming long prose.

### Enforcement surfaces

| Surface | Mechanism |
|---------|-----------|
| Text paths | `server/services/archEnvelopeValidator.ts` (envelope validation on structured text output). |
| Voice phases | `outputContract.maxSentences` (and related phase contracts) to cap spoken length. |

---

## 6. PPP Scoring and Enforcement

**PPP** structures conversation as **Purpose / Plan / Pressure** (clarity of outcome, specificity of plan, time pressure or deadline honesty).

### Effectiveness score (conceptual)

```
PPP_Effectiveness_Score = f(
  outcome_clarity,
  plan_specificity,
  deadline_defined,
  alignment_detected,
  user_confirmation
)
```

| Mode | Behavior |
|------|----------|
| **strict** | Block or refuse to proceed if PPP structure is incomplete per policy. |
| **soft** | Allow continuation; log gaps for review. |
| **disabled** | No gating on PPP completeness. |

### Shadow scoring (audit-only)

- **`pppShadowValidator.ts`**: computes shadow scores and diagnostics **without blocking** runtime (audit, tuning, governance review).

### Sales emphasis

- **`sales_emphasis`**: when composite PPP-related score **≥ 75** (configurable threshold in deployment), treat dialogue as high-stakes sales emphasis (stricter disclosure, stronger view fallback, or logging—per site policy).

### CGR linkage

PPP and sales emphasis align with **CGR** fields such as:

- `prioritizedNeeds`
- Supporting vs conflicting activities (qualitative alignment signals for grounding and review)

---

## 7. Governance Controls

| Control | Role |
|---------|------|
| **CGR** (Conversation Grounding Record) | Per-session grounding: **identity, ability, space, focus, time** — machine-validated where possible. |
| **Trust-weighted data** | Qualitative claims with citations: **Wt ≥ 0.85**; numeric / market claims: **Wt ≥ 0.95** unless disallowed. |
| **Zero-LLM paths** | Sensitive data via **authenticated routes** only; never placed in model context as raw payload. |
| **TTT** (Technical Truth Tokens) | Audit artifact tying **action envelope hash**, `task_id`, `principal_id`, and **policy decision log** for traceability. |
| **Nova IDV** | Verification **levels per agent** set by business owner; gates tools, payouts, and certain terminal actions. |

---

## 8. Pre-Flight Gate Requirements

Before treating a site as **sales-engine live** (beyond Safe Mode demo), the following should pass:

| Gate | Requirement |
|------|-------------|
| Business data | **placeData** or **manual profile** confirmed and bound to `site_configs`. |
| Fallback coverage | **At least one** `fallbackRoutes` entry on active funnel(s). |
| Brand | **Brand profile score ≥ 80** (internal rubric / certification). |
| Voice | **Agent voice** configured for primary concierge (and swarm where applicable). |
| Owner | **Owner approved** activation (explicit consent to governed sales behavior). |
| Paid plans (additional) | **Voice plan active**, **phone provisioned**, **≥ one knowledge document** ingested for grounded answers. |

Gates are enforced by policy, UI, and routes—not by prompt text alone.

---

## 9. Prompt Compiler Integration

When `sales_funnels` is defined, the **prompt compiler** injects a **SALES OBJECTIVE** block:

- Terminal action
- Active entry point(s)
- Fallback routes summary

When `conversationWorkflow` is present:

- Append **CURRENT CONVERSATION PHASE** using `resolveCurrentPhase` and `formatPhasePromptFragment` (or equivalent governed helpers).

Additional injections (site-scoped):

| Input | Injection |
|-------|-----------|
| `communication_governance.pppEngagement.enabled` | PPP engagement fragment (structured, reviewable). |
| Stability | **Stability dials** (caps, safe defaults). |
| Disclosure | **Disclosure policy** (regulated language, limits). |
| Brand | **Brand context** (voice, claims boundaries). |

**Rule:** No raw sales scripts in UI components; behavior flows through **templates / fragments / compiler** per prompt runtime governance.

---

## 10. Metrics Pipeline

### Revenue

| Metric | Definition (typical) |
|--------|---------------------|
| `leads_generated` | Count of `lead_captured` (deduped per session/policy). |
| `leads_contacted` | Leads with outbound or inbound follow-up logged. |
| `leads_qualified` | Meets qualification rubric (score, BANT, or industry template). |
| `demos_booked` | Appointments tied to demo outcome. |
| `close_rate` | `purchase_completed` / qualified leads (windowed). |

### Speed

| Metric | Definition (typical) |
|--------|---------------------|
| `time_to_first_response` | Elapsed from customer first message to first agent/system reply. |
| `time_in_stage` | Dwell time per funnel phase / workflow step. |

### Efficiency

| Metric | Definition (typical) |
|--------|---------------------|
| `missed_call_rate` | Inbound voice missed / abandoned vs offered. |
| `automation_success_rate` | Stages completed without human intervention. |
| `human_intervention_rate` | Escalations / handovers / overrides. |

### Ownership

| Metric | Definition (typical) |
|--------|---------------------|
| `direct_lead_percentage` | Leads owned in business CRM vs platform-only lists. |
| `platform_dependency_ratio` | Share of journeys that cannot complete without platform-only assets. |

---

## Cross-References (implementation anchors)

| Topic | Typical location |
|-------|------------------|
| Sales funnel contract / types | `server/contracts/salesFunnels.ts`, `shared/schema.ts` |
| ARCH enforcement | `server/services/archEnvelopeValidator.ts` |
| PPP shadow | `server/services/pppShadowValidator.ts`, `server/services/pppShadowAnalytics.ts` |
| CGR | `server/services/conversationGrounding.ts`, `shared/conversationGrounding.ts` |
| Compiler | `server/services/promptCompiler.ts` |
| Stability / disclosure | `server/services/stabilityDials.ts`, `server/services/disclosurePolicy.ts` |

This document is **normative for skill authors** and **descriptive for implementers**; runtime truth remains code + governance registries in-repo.
