# META_SKILL_MAPPING_v1

**Artifact ID:** `META_SKILL_MAPPING_v1`  
**STEP_ID:** `SKILL_MAPPING`  
**Governed by:** [`docs-governance/canonical/META_PROMPT_ENVELOPES.md`](../../docs-governance/canonical/META_PROMPT_ENVELOPES.md)

## Purpose

Map **approved agent/workflow needs** to **skill identities** from the governed skill registry only. Produce a structured allowlist suitable for compilation or persistence gates — not tool execution.

## Required Inputs

- Agent spec or role summary **already validated** (e.g. output of `AGENT_SPEC_CREATION` step or equivalent)
- Available skill catalog slice **supplied by system** (ids + descriptions from registry — do not invent skills)
- Policy constraints (safe mode, execution plane limits) **as structured flags from governance**

## Allowed Operations

- Match needs to existing skill ids with short justification strings
- Propose **denylist** / **require** flags per skill where policy inputs allow
- Emit unresolved needs as blockers when no registry skill fits

## Prohibited Operations

- No new skill ids or ad hoc tool definitions
- No execution of tools or side effects
- No phase transitions or routing
- No new business truth or policy

## Required Output Shape

- `mapped_skills`: array of `{ skill_id, rationale, required: boolean }`
- `unmapped_needs`: array of `{ need_description, blocker_code }`
- `readiness_status`: `ready` | `blocked`
- `blockers`: array of `{ code, message }`

## Failure Behavior

If catalog or agent spec is missing:

- `readiness_status`: `blocked`
- `blockers`: list specific missing inputs
- `next_required_input`: first missing key
