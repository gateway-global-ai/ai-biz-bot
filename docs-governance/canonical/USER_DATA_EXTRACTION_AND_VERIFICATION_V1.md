---
status: canonical
truth_domain: governance
enforced_by: implementation (product + routes; prompt compiler for agent behavior)
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-28
spec_id: user_data_extraction_and_verification
spec_version: "1.0.0"
---

# User data extraction and verification (V1)

## Purpose

Define a **governed pattern** for collecting information from users (customers or operators) so the platform does not “save first, validate later” in ways that create rework, silent failures, or unsafe echo of secrets.

This applies to onboarding fields, intake forms, **integration connect** flows, and any agent-assisted task that gathers structured data.

## Universal phases (reference model)

All extraction flows map to explicit phases. Not every flow uses every phase; **sensitivity tier** (below) decides which phases apply.

| Phase | Meaning |
|-------|---------|
| **Request** | System or agent asks for a specific field or action (clear scope). |
| **Receive** | User submits input (form, OAuth redirect return, paste). |
| **Verify** | Platform checks **syntactic** validity +, where allowed, **echo** for human confirmation. |
| **Confirm** | User explicitly confirms (or OAuth success is treated as provider-side confirmation). |
| **End task** | Persisted state + audit + user-visible completion (or structured failure with next step). |

Abbreviation: **RRVCCE** — Request → Receive → Verify → Confirm → End task (Confirm may collapse with Verify for some tiers).

## Sensitivity tiers

### Tier 1 — Non-sensitive operational data

Examples: business name, timezone, room preferences, non-secret configuration labels.

- **Request → Receive → Verify → Confirm → End task**
- After **Receive**, the UI **may display** normalized values back to the user (“You entered: …”) before final submit.
- **Logging / audit:** Allowed at field level (no secret material); align with retention policy.

### Tier 2 — Sensitive personal or high-impact data

Examples: government IDs, full payment card numbers, health details, secrets-adjacent identifiers.

- **Do not** show full echo in chat or logs in ways that increase exposure.
- **Receive** may be followed by **masked** display or **attestation only** (“I confirm this is correct”) without repeating the full value in the model or persistent logs.
- **Verify** is **server-side** policy (format, checksum, vendor rules), not “read it back aloud in Gemini.”

### Tier 3 — API credentials and vendor logins (integration keys, OAuth tokens)

**Requirement:** **Never** treat “stored in DB” as “works.”

- After **Receive** (or OAuth callback), the platform MUST run an **immediate** **smoke test** against the vendor (minimal, read-only or health call appropriate to the integration) **before** marking the connection **verified** or `install_posture = connected`.
- **Success path:** User sees **explicit confirmation** — e.g. “Connected to Cloudbeds — property reachable” with a structured success code.
- **Failure path:** Do **not** defer. Return **actionable** error to the UI and, if an agent is present, **immediate troubleshooting** guidance (wrong property ID, revoked key, wrong environment, scope missing — using [`IntegrationExecutionBlock`](../../shared/integrationExecution.ts) codes and broker vocabulary, not ad hoc strings).
- **Logging:** Never log raw API keys or tokens. Log **hash / prefix**, `vendor_id`, `site_config_id`, success/fail, and error **code** only.

**Agent role on failure:** Debug with **documented** failure modes and user-visible steps; do **not** ask the user to paste secrets again into chat unless the flow explicitly re-opens a secure capture surface.

## Anti-patterns (normative)

- **Save first, check later** for Tier 3 — forbidden.
- **“We’ll validate your key overnight”** — forbidden for integration credentials.
- **Echoing full secrets** in model context, chat logs, or analytics — forbidden.
- **Claiming success** without a successful smoke test or OAuth token exchange — forbidden.

## Relation to integration auth

- Broker and posture: [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](./INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md)
- Operator connect loop (SMS, token, surface): [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md)

## Implementation notes

- **Smoke test** implementation must live in **server** integration services, not in the client or Gemini tool layer for Tier 3.
- **UI** should show deterministic states: `pending`, `verifying`, `verified`, `failed` (with retry), aligned with operator connect success/error tables where applicable.
- **Task-specific agents** may guide the user **conversation** on the same page as the form, but **authority** for persistence and vendor proof remains server-side.
