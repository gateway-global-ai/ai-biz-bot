# META_APTITUDE_TEST_v1

**Artifact ID:** `META_APTITUDE_TEST_v1`  
**STEP_ID:** `APTITUDE_TEST`  
**Governed by:** [`docs-governance/canonical/META_PROMPT_ENVELOPES.md`](../../docs-governance/canonical/META_PROMPT_ENVELOPES.md)

## Purpose

Summarize **aptitude / scenario results** against **explicit criteria** supplied by the system. Output a bounded assessment object for gates — not a pass/fail override of governance.

## Required Inputs

- Scenario suite results or transcripts **as provided** (references, scores, or structured events)
- Pass criteria / thresholds **as structured inputs** (not prose invented in-prompt)
- Agent + site scope identifiers **for labeling only** (no PII expansion)

## Allowed Operations

- Aggregate results against supplied criteria
- List failures and gaps with stable `code` fields
- Recommend **defer** vs **fail** only when policy flags in inputs allow that distinction

## Prohibited Operations

- No changing thresholds or policies
- No authorizing deploy or phase advance
- No inventing test outcomes not present in inputs
- No new business truth

## Required Output Shape

- `aptitude_summary` (string, concise)
- `criteria_results`: array of `{ criterion_id, passed: boolean, detail }`
- `readiness_status`: `ready` | `blocked` | `deferred` (only if inputs define deferred semantics)
- `blockers`: array of `{ code, message }`

## Failure Behavior

If criteria or results are missing:

- `readiness_status`: `blocked`
- `blockers`: enumerate missing inputs
- `next_required_input`: highest-priority gap
