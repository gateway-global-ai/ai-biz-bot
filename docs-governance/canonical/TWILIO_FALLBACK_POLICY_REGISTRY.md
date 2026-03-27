---
status: canonical
truth_domain: governance
enforced_by: none
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-28
---

# Twilio Fallback Policy Registry (v0 — prose)

## Purpose

Defines **policy dimensions** and **fallback action vocabulary** for the Twilio reliability plane. Implementation is **Phase 10+**; this file is the **contract** so the policy engine does not become ad hoc.

**Principle:** Ingestion alone is insufficient. The platform must **decide** and **act** under governance.

## Policy dimensions (every rule row should declare)

| Dimension | Question |
|-----------|----------|
| **Retryable** | May the system automatically retry? With what backoff and max attempts? |
| **Fail mode** | Fail-open vs fail-closed for this class (and for which plane: voice vs SMS vs internal). |
| **Visibility** | Customer-visible summary vs operator-only detail (`TWILIO_ERROR_NORMALIZATION_SPEC.md`). |
| **Escalation** | Is Pager / Slack / ticket **required** for this class? |
| **Alarm linkage** | Optional mapping from [Twilio Alarms](https://www.twilio.com/docs/usage/monitor-alarms) thresholds to platform incident class. |
| **Side-effect hold** | Pause outbound sends, tool execution, or billing-sensitive actions until cleared? |

## Fallback action vocabulary (platform)

Examples of **governed** responses (not an exhaustive implementation checklist):

| Action | Description |
|--------|-------------|
| `twiml_safe_message` | Serve pre-approved TwiML (Say/Play) + graceful hangup or queue. |
| `degrade_voice_to_text` | Offer SMS or async text continuation per product policy. |
| `disable_webhook_dependent_feature` | Feature flag or route bypass for broken dependency. |
| `voice_safe_mode` | Constrained prompt / reduced tool surface per `SAFE_MODE_CONTRACT.md` alignment. |
| `suppress_duplicate` | Dedupe by idempotency key / `CallSid` to avoid retry storms. |
| `notify_operator` | Structured alert to on-call channel with correlation IDs. |
| `open_incident` | Create governed incident record with trace bundle pointer. |
| `no_automatic_retry` | Hard stop — human or playbook only. |

Concrete mapping **`class_id` → policy row** will move to machine-readable YAML in a later revision (`registry-yaml/twilio-fallback-policies.v0.yaml` or similar) once error-code mapping stabilizes.

## Placeholder policy table (to be filled during implementation)

| `class_id` | Retryable | Fail mode | Customer message (template id) | Escalation | Notes |
|------------|-----------|-----------|-------------------------------|------------|--------|
| *TBD* | | | | | Start with Debugger ERROR on voice webhooks |

## Validator / tests (future)

- Retryable vs non-retryable enforced in code paths.
- Fail-open vs fail-closed documented per surface (PSTN vs internal API).
- No tenant-supplied policy overrides for signature validation or Debugger URLs.

## Related

- `TWILIO_RELIABILITY_ARCHITECTURE.md`
- `TWILIO_ERROR_NORMALIZATION_SPEC.md`
- `registry-yaml/twilio-platform-failure-classes.v0.yaml`
- `SAFE_MODE_CONTRACT.md` — safe-mode alignment for voice degradation
- `GOVERNANCE_EXECUTION_PLAN_V1.md` — Phase 10
