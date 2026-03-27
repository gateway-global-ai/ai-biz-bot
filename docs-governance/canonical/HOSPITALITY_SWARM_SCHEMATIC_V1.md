---
status: canonical
truth_domain: governance
enforced_by: teams-agents-provisioning-matrix.mdc, REGISTRY_AUTHORITY_CHARTER.md
backed_by:
  schema: true
  service: partial
  route: false
last_verified: 2026-03-28
---

# Hospitality Swarm Schematic v1

## Authority

```yaml
authority:
  source_of_truth: docs-governance/canonical/HOSPITALITY_SWARM_SCHEMATIC_V1.md
  machine_readable: registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml
  proficiency_catalog: registry-yaml/swarm-schematics/hospitality_proficiency_probes.v1.yaml
  validator: npm run validate:swarm-schematic
```

Normative language: **MUST** / **MUST NOT** (RFC 2119).

## Purpose

Close the gap between **industry templates** (six archetypes) and **governed integration**: each swarm member gets an explicit binding to **operational mode**, **integration capability sets**, **resolved tools**, optional **skill dispatch** ids, **knowledge claim classes**, **proficiency probes**, **API version lane**, and **deploy posture**.

Without this schematic, the swarm is **template + narrative** only.

## Storage contract (explicit)

Per-agent bindings MUST be persisted on **`agents.structured_controls`** (JSONB) under:

**`swarm_role_contract`** — object shape:

| Field | Type | Meaning |
|-------|------|---------|
| `schematic_id` | string | Stable id, e.g. `hospitality_cloudbeds` |
| `bundle_version` | string | Semver of the YAML bundle row |
| `role_type` | string | Matches `agents.role_type` / template archetype |
| `integration_capability_set_ids` | string[] | Ids from `registry-yaml/integration-capability-sets.yaml` |
| `deploy_posture` | string | Copy from schematic row at provision time |
| `api_version_lane` | string | Copy from schematic row (e.g. Cloudbeds v1.3 vs v1.2) |

**MUST NOT** introduce a parallel column until this contract is superseded by a deliberate schema migration and charter update.

`StructuredControls` in [`shared/schema.ts`](../../shared/schema.ts) includes `swarm_role_contract` as optional typed JSON.

## Machine-readable bundle

[`registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml`](../../registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml) defines one row per **`role_type`** for `hospitality_travel` + Cloudbeds lane.

### Required fields per member row

| Field | Description |
|-------|-------------|
| `role_type` | Archetype id (`concierge`, `booking_coordinator`, …) |
| `default_operational_mode` | Initial `agents.operational_mode` |
| `integration_capability_set_ids` | Non-empty unless explicitly non-model-facing only |
| `resolved_tool_names` | MUST equal sorted unique union of tools from those sets (CI proves) |
| `optional_skill_dispatch_ids` | May be empty; each id MUST exist in `skill-dispatch-registry.yaml` if listed |
| `knowledge_claim_classes` | Vocabulary aligned with `AGENT_DEPLOYMENT_CONTRACT_V1.md` claim / source classes |
| `required_proficiency_probe_ids` | Each MUST exist in `hospitality_proficiency_probes.v1.yaml` |
| `api_version_lane` | e.g. `cloudbeds_v1_3` — adapter/runtime must honor before claiming production |
| `deploy_posture` | `draft` \| `review_required` \| `publish_blocked` \| `deployable` |
| `storage_target` | Literal `structured_controls.swarm_role_contract` (documentation + validator) |

## Provisioning bridge

[`provisionAgentsForBusiness`](../../server/services/agentProvisioning.ts) MUST, when `industryGroup === 'hospitality_travel'`:

1. Load [`hospitality_cloudbeds.v1.yaml`](../../registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml).
2. For each template `role_type`, resolve the matching schematic member.
3. If the file is missing or the role is missing, MUST **throw** (hospitality swarm is not provisionable without schematic integrity).
4. Set `operational_mode` from `default_operational_mode`.
5. Set `structured_controls.swarm_role_contract` from schematic + bundle version.
6. NOT invent tool lists in code — tools are implied by integration registry + modes at runtime; schematic documents intent for validators and humans.

## Cross-validation

`npm run validate:swarm-schematic` MUST verify:

- `role_type` uniqueness within the bundle.
- Each `integration_capability_set_id` exists.
- `resolved_tool_names` equals the union of `resolved_tool_names` from those sets.
- Each resolved tool ∈ `TOOL_DECLARATIONS` and ∈ `allowedToolNames` for `default_operational_mode`.
- Each `optional_skill_dispatch_id` exists in the skill dispatch registry (implemented skills).
- Each `required_proficiency_probe_id` exists in the proficiency catalog YAML.

Run after changing schematic, integration sets, tools, modes, or probes.

## Proficiency

Role-specific probes are **named** in `hospitality_proficiency_probes.v1.yaml`. Implementation of automated runs is **out of band** for this spec; the schematic **requires** probe ids so deployment cannot claim “full swarm” without a defined test surface.

## Related

- [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md)
- [`AGENT_DEPLOYMENT_CONTRACT_V1.md`](./AGENT_DEPLOYMENT_CONTRACT_V1.md)
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md)
