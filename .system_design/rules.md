# .system_design/rules.md
# Sovereign AI OS — Commercial & Legal Governance Rules
# Source of Truth for all billing, routing, and onboarding code generation.

---

## Non-Negotiable Code Generation Constraints

Any component, route, service, or script generated for this platform MUST comply with all four rules below without exception. These rules are derived directly from the Master Service Agreement (`contracts/MSA_v1.0.0.md`).

---

### Rule 1 — 30-Day Grace Period Logic (MSA §2.3)

All subscription activation and cancellation code must:

- Persist a `trial_end` timestamp (Activation Date + 30 calendar days) on the customer record at the moment billing begins.
- Gate early-termination penalty logic behind a `current_day > 30` check. Any termination on or before Day 30 must result in zero penalty.
- Never calculate or charge early termination fees without first evaluating `trial_end`.

**Reference skill:** `handleEarlyTermination` in `skills/billing_engine.json`

---

### Rule 2 — Metered Usage Reporting (MSA §3.2)

All voice and SMS event handlers must:

- Call `increment_usage(customerId, eventType, quantity)` at the point of event completion (e.g., `Twilio.Call.Completed`, `Twilio.Message.Delivered`).
- Report usage to Stripe Metered Billing immediately; no buffering or batching that exceeds one billing cycle.
- Never provision an "unlimited" plan or bypass metered billing for any legacy route. All routes are metered, all the time.

**Reference skill:** `calculateOverage` in `skills/billing_engine.json`

---

### Rule 3 — Customer PII & Cross-Tenant Training Prohibition (MSA §5.3)

All AI pipeline code must:

- Treat customer prompts, business data, and training inputs as tenant-isolated artifacts.
- Never pass Customer data into foundational model fine-tuning workflows shared across tenants.
- Log a compliance audit event whenever Customer data is accessed for any purpose outside of serving that Customer's own session.

---

### Rule 4 — A2P 10DLC Compliance Guardrails (MSA §4)

All SMS-sending components must:

- Reject outbound messages at the service layer if the sending number is not associated with a registered A2P 10DLC campaign.
- Verify Prior Express Written Consent records exist for the recipient before dispatch.
- Hard-fail (not silently drop) on prohibited content categories; surface the rejection reason to the operator log.
- Never substitute, rotate, or replace a registered number without re-registering the campaign ("no snowshoeing").

**Reference skill:** `verifyCompliance` in `skills/billing_engine.json`
