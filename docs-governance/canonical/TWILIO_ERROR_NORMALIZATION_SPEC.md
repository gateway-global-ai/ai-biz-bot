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

# Twilio → Platform Error Normalization (Spec v0)

## Purpose

Twilio publishes **telemetry** (Debugger webhook, Monitor Alerts, Events, Alarms). The platform must publish **meaning**: stable failure classes, severity, and routing to policy — analogous to how agent **capabilities** are declared in YAML, not inferred from prompts.

This document defines the **interpret** layer between `TWILIO_RELIABILITY_ARCHITECTURE.md` (pipeline) and `TWILIO_FALLBACK_POLICY_REGISTRY.md` (actions).

## Authoritative class list (v0)

Platform failure **`class_id`** values are enumerated in:

`registry-yaml/twilio-platform-failure-classes.v0.yaml`

New classes require a registry row and a short rationale; ad hoc string literals in application code are discouraged once the policy engine exists.

## Platform meanings (examples)

Normalization maps Twilio signals (and internal signals) into **platform** semantics, for example:

| Platform class (concept) | Typical sources (illustrative) |
|--------------------------|--------------------------------|
| Transport / connectivity failure | Timeouts, TLS, DNS, unreachable webhook URL |
| Webhook delivery / HTTP failure | 11200-class retrieval failures; non-2xx to status URL |
| Auth / configuration failure | Credential, signature, misconfigured URL, permission |
| Carrier / delivery issue | SMS/MMS delivery, filtering, geographic blocks |
| Voice runtime failure | Media Stream errors, audio bridge, Gemini/local path faults |
| Customer-actionable issue | Quota, registration, tenant misconfig surfaced safely |
| Platform-actionable issue | Internal bug, deploy regression, capacity |

**Phase 10b (partial):** Debugger `Payload.error_code` → platform `failure_class_id` uses `registry-yaml/twilio-debugger-error-code-hints.v0.yaml` (each `failure_class_id` must exist in `twilio-platform-failure-classes.v0.yaml`). Expand rows via [Error Dictionary](https://www.twilio.com/docs/api/errors). Monitor Alerts and full policy routing remain follow-on work.

## Correlation keys

Every normalized event should attach as many of the following as exist:

| Key | Use |
|-----|-----|
| `CallSid` | PSTN / voice trace into `call_logs` and voice sessions |
| `streamSid` | Media Stream correlation when present |
| `MessageSid` / `SmsSid` | Messaging trace (when applicable) |
| `error_code` | Twilio code for lookup and policy rules |
| `failure_class_id` | Platform class from hints registry when `error_code` is mapped (10b); else absent / null |
| `resource_sid` | Resource scope from Alert / Debugger payload |
| `AccountSid` | Twilio account (parent/subaccount discipline per ops) |
| Internal `session_id` / `site_config_id` | After resolver step — **never** trust tenant-supplied IDs for auth |

## Customer-visible vs platform-visible

| Layer | Content |
|-------|---------|
| **Customer-visible** | Outcome messages suitable for end users or business owners; no Twilio internals. |
| **Platform-visible** | Full normalized record + retained raw payload (with PII minimization policy), suitable for operators and postmortems. |

Tenants **must not** be required to interpret Debugger warnings or Monitor records.

## Single Alert fetch (forensics)

The [Monitor Alerts API](https://www.twilio.com/docs/usage/monitor-alert) returns richer **`request_*` / `response_*`** fields when **fetching one alert by SID**. Normalization should preserve a pointer to that SID and optionally hydrate detail on demand for RCA.

## Events API (audit / SIEM)

[Monitor Events](https://www.twilio.com/docs/usage/monitor-events) provide account-level change and activity history (actor, source, resource). Use for security-relevant trails (e.g. voice geographic permission changes) and long-horizon audit — not necessarily the same hot path as Debugger webhook.

## Related

- `TWILIO_RELIABILITY_ARCHITECTURE.md`
- `TWILIO_FALLBACK_POLICY_REGISTRY.md`
- `registry-yaml/twilio-platform-failure-classes.v0.yaml`
- `registry-yaml/twilio-debugger-error-code-hints.v0.yaml`
- `GOVERNANCE_EXECUTION_PLAN_V1.md` — Phase 10
