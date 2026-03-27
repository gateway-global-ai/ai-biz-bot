# META_AGENT_SPEC_CREATION_v1

**Artifact ID:** `META_AGENT_SPEC_CREATION_v1`  
**STEP_ID:** `AGENT_SPEC_CREATION`  
**Governed by:** [`docs-governance/canonical/META_PROMPT_ENVELOPES.md`](../../docs-governance/canonical/META_PROMPT_ENVELOPES.md)

## Purpose

Create a **governed agent specification** from **validated upstream inputs** only. Organize requirements into a single structured spec object. Do not invent business facts, policies, or deployment actions.

## Required Inputs

- Approved intent (from governance-validated intent record or equivalent)
- Validated business context (schema-backed or validator-approved)
- Persona definition (structured fields, not free-form invention)
- Verified knowledge scope (what knowledge sources/tools are in scope)
- Funnel definition (when the workflow requires it for this step; otherwise explicit `not_applicable` from upstream)

## Allowed Operations

- Organize and normalize requirements into the required output shape
- Define role boundaries and handoff hints **as structured fields** derived from inputs
- Define fallback routes **when provided or implied only by validated policy inputs**
- List required skills **by id from approved skill registry / contracts**
- Surface deployment blockers **from validation gaps or explicit policy flags** — do not invent blockers

## Prohibited Operations

- No code generation or executable deployment
- No missing-field assumptions — absent validated input → use Failure Behavior
- No bypass of validation results
- No new business truth, policies, routes, or thresholds not in validated inputs
- No phase transition, routing, or “next step” authorization

## Required Output Shape

Return a single JSON-serializable object with at least:

- `agent_name` (string)
- `business_role` (string)
- `primary_goal` (string)
- `allowed_knowledge_scope` (object or array — mirror input shape)
- `required_skills` (array of skill ids / references from registry)
- `fallback_routes` (array — empty if none validated)
- `blockers` (array of `{ code, message }`)
- `readiness_status` (`ready` | `blocked`)

## Failure Behavior

If any **required input** is missing or invalid:

- Set `readiness_status` to `blocked`
- Set `blockers` to a non-empty list describing each gap (machine-oriented `code` + short `message`)
- Set `next_required_input` to the single highest-priority missing key or validator id
- Do not fabricate defaults for missing governed fields
