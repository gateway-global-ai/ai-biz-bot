---
name: sovereign-onboarding-pipeline
description: Map business onboarding spine (identity, siteConfigId, first customer touch) by researching client + modular server routes; classify prod vs deprecated vs archive — never assume every path is live.
---

# Sovereign onboarding pipeline (research & reconstruction)

## When to use

- Rebuilding or extending **business signup / site creation / QR / public routing** flows.
- Answering “where is `siteConfigId` born?” or “when can a customer first hit chat?”
- Auditing **Places / Serp / grounding** usage vs **compliance** gates (different tracks).

## Source of truth

- [`docs/sdk/ONBOARDING_PIPELINE_SKILL.md`](../../../docs/sdk/ONBOARDING_PIPELINE_SKILL.md) — full spec, spawn prompt, output schema.
- [`docs/product/ONBOARDING_PIPELINE_MAP_V1.md`](../../../docs/product/ONBOARDING_PIPELINE_MAP_V1.md) — as-built spine.
- [`docs/product/ONBOARDING_PIPELINE_TARGET_V1.md`](../../../docs/product/ONBOARDING_PIPELINE_TARGET_V1.md) — system target.
- [`docs/product/CUSTOMER_READY_V1.md`](../../../docs/product/CUSTOMER_READY_V1.md) — `customer_ready_v1` (LOCKED).
- [`docs/product/ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](../../../docs/product/ONBOARDING_GO_LIVE_TRANSITIONS_V1.md) — go-live graduation (LOCKED).
- Governance: [`SOVEREIGN_UI_GOVERNANCE_RULES.md`](../../../docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md) (UI drift), modular routing rules, voice/Twilio lockdown where relevant.

## Hard rules

1. **Classify every path:** label as **current production**, **deprecated but still referenced**, or **legacy archive context** only. **Do not** assume a file or route string in docs is mounted and correct — verify against [`App.tsx`](../../../client/src/App.tsx) (or route table) and live handlers.
2. **Onboarding spine** (required in every pipeline map output):
   - **Business identity creation** — first persisted business/site representation.
   - **`siteConfigId` (UUID) assignment** — server insert + client handoff.
   - **First customer interaction possible** — e.g. `/biz/{slug}`, `/agent/{slug}`, QR deep link, direct chat entry.
3. **`_legacy_archive/`** — **read-for-summary only**; never import or treat as runtime truth ([`legacy-archive-governance.mdc`](../../rules/legacy-archive-governance.mdc)).
4. **Forbidden:** changing voice WebSocket paths, Twilio webhooks, or Gemini live config as part of “onboarding research” unless the task is explicitly voice-governed.

## Blocked

- Recreating pipelines from dead code without prod classification.
- Full UI migration to MUI as a side effect of mapping.

## Output

Produce a structured **pipeline map** (see SDK doc): steps, APIs, files, schema anchors (`siteConfigs`, etc.), **classification**, gaps, and the **three spine anchors**.
