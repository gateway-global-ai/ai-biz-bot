# Sales State Machine Specification

Reference document for the programmatic sales engine skill. Defines lead stages, transition rules, time thresholds, automation triggers, workflow integration, revenue events, reactivation, and human escalation.

---

## 1. Lead Stage Definitions

| Stage | Description | Entry Condition | Exit Condition |
|-------|-------------|-----------------|----------------|
| `unaware` | Lead does not know about the business | N/A (pre-system) | First contact event |
| `problem_aware` | Lead recognizes a problem | First interaction | Expresses specific need |
| `solution_aware` | Lead knows a solution exists | Need articulated | Engages with offering |
| `engaged` | Lead is actively interacting | Responds to agent | Provides qualifying info |
| `qualified` | Lead meets criteria for offer | Budget/timeline/authority confirmed | Agrees to demo/meeting |
| `demo_booked` | Demo/meeting scheduled | Calendar event created | Demo completed |
| `demo_completed` | Demo/meeting finished | Attended demo | Offer presented |
| `offer_presented` | Pricing/proposal shown | Pricing View rendered | Accept or reject |
| `won` | Deal closed | Payment/signup confirmed | N/A (terminal) |
| `lost` | Deal rejected or abandoned | Explicit rejection or timeout | Moved to reactivation |
| `reactivation_pool` | Lost leads for re-engagement | 7+ days since lost | Re-engaged or permanently closed |

---

## 2. State Rules (Non-Negotiable)

- **No lead without a state** — Every persisted lead record must have exactly one current stage at all times.
- **No state without a next action** — Each stage must declare at least one valid outbound transition or terminal handling (won, permanent closed).
- **No action without automation or human assignment** — Every transition or follow-up must be owned by an automated rule, a scheduled job, or an explicit human task; no orphan actions.
- **Time-bounded movement** — Every lead must either advance, receive a defined automation, or escalate within the applicable `time_threshold`; stale states without resolution are a governance violation.

---

## 3. Time Threshold Enforcement

| Threshold | Window | Trigger |
|-----------|--------|---------|
| `first_response` | 60 seconds | Auto-respond via voice, chat, or SMS |
| `followup_1` | 24 hours | Send first follow-up message |
| `followup_2` | 72 hours | Send second follow-up (different angle) |
| `followup_3` | 7 days | Final attempt before reactivation pool |
| `reactivation_check` | 30 days | Batch re-engagement campaign |

Parallel timers may apply by stage; the strictest applicable threshold wins for escalation and logging.

---

## 4. Automation Triggers Per Stage

### `lead_captured` (unaware → problem_aware)

- Send SMS acknowledgment.
- Send email welcome.
- Assign state: `engaged` (when capture flow completes and interaction is active).
- Log revenue event: `lead_captured`.

### `engaged` (interacting)

- Qualify lead via PPP discovery questions.
- Schedule demo if qualified.
- Log revenue event: `intent_expressed`.

### `qualified` (ready for offer)

- Trigger offer generation.
- Render pricing View on canvas.
- Log revenue event: `appointment_booked` when a demo is scheduled (if applicable to the funnel).

### `no_response` (any stage)

- Send follow-up sequence (SMS + email).
- Escalate to human if automation fails (per human escalation rules).
- Move to `lost` if all follow-ups in the sequence are exhausted without response.

### `won` (terminal)

- Log revenue event: `purchase_completed`.
- Trigger onboarding workflow.
- Notify business owner.

### `lost` → `reactivation_pool`

- Remove from active pipeline views (retain record for compliance and analytics).
- Schedule reactivation check at 30 days (`reactivation_check`).
- Use a different messaging angle on re-contact than the original pitch.

---

## 5. Integration with Conversation Workflow

The sales state machine maps to `conversationWorkflow` phases:

| Workflow phase | Typical stage span |
|----------------|-------------------|
| `capture_snapshot` | `unaware` → `problem_aware` → `engaged` |
| `demo_value` | `engaged` → `qualified` → `demo_booked` |
| `activation_and_offer` | `demo_completed` → `offer_presented` → `won` / `lost` |

**Context keys** in `conversationWorkflow` drive phase transitions:

- `resolveCurrentPhase()` returns the first phase whose `requiredContextKeys` are not yet satisfied.
- As context keys are collected and validated, phases advance automatically according to the workflow definition.
- **Time thresholds** run in parallel: if required keys are not collected within the configured window, automation (follow-up, escalation, or move to `lost` / `reactivation_pool`) must run regardless of partial context.

---

## 6. Revenue Event Emission

At each material stage transition, emit a revenue event for analytics and billing alignment.

```typescript
type RevenueEvent = {
  eventType:
    | 'lead_captured'
    | 'intent_expressed'
    | 'appointment_booked'
    | 'purchase_initiated'
    | 'verification_completed'
    | 'purchase_completed';
  siteConfigId: string;
  agentId: string;
  customerId?: string;
  entryPoint: string;
  funnelId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};
```

Map `eventType` to transitions explicitly in implementation; do not infer from UI alone without a persisted state change.

---

## 7. Lost / Reactivation Cycling

- **`lost` is not permanent** until the lead is explicitly marked `permanent_closed`.
- **Reactivation pool** is evaluated on a 30-day cycle (`reactivation_check`).
- **Reactivation copy** must use a different angle than the original pitch (channel and template variants should be registered, not improvised per send).
- **After three reactivation attempts** with no response: mark `permanent_closed` and stop automated outreach unless legally required or re-consented.
- **Reactivated leads** re-enter at `problem_aware`, not `unaware`, to reflect prior exposure.

---

## 8. Human Escalation Rules

- **Automation failure** — If automation fails three times on a `qualified` lead, escalate to a human owner with full context bundle (stage, keys, channel history).
- **Explicit request** — If the lead asks for a human, escalate immediately; do not block on additional qualification unless policy requires a single verification step.
- **High-value flag** — If the lead matches business-defined high-value criteria, flag for human review even when automation succeeds.
- **State machine continuity** — Escalation does not remove the lead from the state machine; human actions (notes, manual stage updates, manual sends) still produce valid state transitions and must emit the same revenue and audit events as automated paths.

---

## Cross-References

- Implementations should align with `shared/conversationWorkflow.ts`, context keys in `docs-governance/CONTEXT_KEYS.md`, and view/action contracts in `docs-governance/VIEW_REGISTRY.md` and `docs-governance/ACTION_REGISTRY.md`.
- Pricing and offer presentation must use governed Views on the canvas, not ad hoc copy in execution-plane handlers.
