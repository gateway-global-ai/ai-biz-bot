---
status: canonical
truth_domain: governance
enforced_by: validate-agent-classification, tests/test-guardrails.ts, tests/onboarding-e2e-new-business-hospitality.ts (onboarding-e2e:new-business-hospitality), future provisioning gates
backed_by:
  schema: partial
  service: false
last_verified: 2026-03-28
spec_id: agent_classification_swarm_limits
spec_version: "1.0.0"
---

# Agent classification and swarm limits v1

## Purpose

Govern **who** an agent is for (actor class), **what phase** of work it serves (lifecycle vs control stage), and **how large** swarms and active rosters may grow—without duplicating tool/capability truth already in the integration graph and swarm schematic.

## Where constraints live (database vs governance)

**Database (structural, mirrors stable schema — see `migrations/0072_agent_classification_tables.sql`):**

- **Uniqueness:** `agent_templates.template_key`, `swarm_schematics.schematic_key`, `UNIQUE (swarm_schematic_id, role_key)` on `swarm_schematic_members`.
- **Referential integrity:** FKs from members → schematics/templates; from `agents` → `agent_templates` / `swarm_schematic_members` (nullable, `ON DELETE` as declared).

**Governance layer (policy + CI + runtime guards — not duplicated as ad hoc DDL):**

- **Enum-like vocabulary** for actors/stages/deployment: `registry-yaml/agent-classification-policy/enums.v1.yaml` + **`npm run validate:agent-classification`** (and related validators).
- **Composition and restricted combinations:** `composition_rules.v1.yaml`, `restricted_combinations.v1.yaml`, role-level actor/stage YAML (e.g. hospitality role classification).
- **Derived or cross-row rules** (e.g. max write-capable agents per swarm, capability-set-derived “write-capable”): stay in validators, provisioning enforcement, and readiness/reporting until/unless a **materialized** column or summary table is introduced for DB-level enforcement.

Do **not** paste generic peer-review DDL wholesale; add SQL only when it **directly encodes** the same invariant already owned by registries or Drizzle. Triggers for derived policy are a **later** option, not the default.

## Classification model

### Actor class

`customer` | `employee` | `vendor` | `management`

- **Primary:** exactly one per agent.
- **Secondary:** up to **two** (see policy `composition_rules.v1.yaml`).
- No agent may span **all four** actor classes in active production.

### Stage class

**Lifecycle** (for `customer`, `employee`, `vendor`): `outreach` | `onboarding` | `operations` | `retention`

**Control** (for `management` only): `planning` | `tracking` | `reporting` | `optimization`

- **Primary stage:** exactly one per agent.
- **Secondary stages:** up to **three** (policy).
- **Management** actors that participate in customer-visible execution MUST carry `deploy_posture: review_required` (or equivalent) per restricted-combination rules.

### Cross-over

Cross-over between lifecycle ideas is allowed subject to **`registry-yaml/agent-classification-policy/restricted_combinations.v1.yaml`**. Vague prose rules are **not** authoritative; the YAML is.

### Swarm role actor/stage (per schematic)

For **`hospitality_cloudbeds`**, primary/secondary actor and stage classes for DB projection (`agent_templates`, `swarm_schematic_members`, `agents.*`) are defined in **`registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml`**. The swarm manifest declares this file via **`role_classification_yaml_path`** in **`registry-yaml/swarm-schematics-registry/manifest.v1.yaml`**. CI validates it with **`npm run validate:agent-classification`**. Do not hardcode per-role actor/stage in application services.

## Swarm and property limits

Machine-readable caps: **`registry-yaml/agent-classification-policy/swarm_limits.v1.yaml`**.

Summary:

| Concept | v1 value |
|--------|-----------|
| Min swarm size | 1 |
| Default swarm size | 4 |
| Recommended max swarm | 12 |
| Hard max swarm | 24 |
| Hard max **active deployable** agents per property | 16 |
| Beyond 16 | `disabled_overflow` / `simulation_only` / non-active |

Per-actor-class caps inside a swarm (max members of that class) are in the same file.

## Write-capable limits

**Definition:** A capability set is *write-capable* for limits if any resolved integration capability used by that set has `mutation_level: write` OR `side_effect_level: financial` (see `registry-yaml/integration-capabilities/*.yaml`).

- Max **write-capable capability sets** bound to one agent: **3** (policy).
- Max **write-capable agents** in one swarm (v1): **4** (policy).

Counts MUST be enforced by **`validate-agent-classification`** (and later provisioning), not by ad hoc labels on agents.

## Database anchors (v1)

| Table | Role |
|-------|------|
| `agent_templates` | Reusable blueprint (`template_key`, defaults for actor/stage/mode/capability sets). **Target home for platform cognition defaults** — character, authority, and ARCH priors shared by every role bound to this template (see [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md): *classification → domain → tenant*). |
| `swarm_schematics` | Bounded roster metadata per industry/schematic (`schematic_key`, min/default/max/hard_max). **Domain / industry** layer for specialization. |
| `swarm_schematic_members` | One row per role in a schematic; FK to template; effective overrides per **override_policy.v1.yaml**. **Inherits** template cognition defaults; may **refine** for domain role (explicit, auditable). |
| `agents` | Runtime rows; **reuse** existing `operational_mode` (Drizzle: `operationalMode`). Added: FKs to template/member + classification JSON + `deployment_status` (see schema). Receives **merged** cognition contract at provision time. |

**Capability / tool truth:** Prefer **`structured_controls.swarm_role_contract`** and integration registries for sets/tools; do not duplicate unbounded capability lists on `agents` unless a later spec explicitly requires it.

### Cognition contract inheritance (behavior / character)

Platform **default character, conversational-power, and refusal-ethics priors** belong at **classification / `agent_templates`**, not at hospitality-only role names. **Industry schematics** (e.g. hospitality) and **tenant/site** layers **specialize** on top. Full merge order and compiler rules: [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md). Implementation is incremental (registry YAML → DB columns/JSON as validated).

## Hospitality Cloudbeds schematic (SOT)

For `hospitality_travel` + Cloudbeds, **`registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml`** remains the **authoritative** machine-readable schematic until a deliberate cutover to DB-only. **`registry-yaml/swarm-schematics-registry/manifest.v1.yaml`** indexes it for classification validation.

## Business Capability Translator (prompt)

Internal / onboarding use only. Governed output shape (classify, decompose, scope—not reject vision):

- **Required line:** *If a request spans multiple primary actors or primary stage classes, decompose it into multiple candidate agents rather than forcing it into one agent.*

Full prompt and output schema belong in the prompt compiler / fragment registry per **`PROMPT_RUNTIME_GOVERNANCE.md`** (Phase 5).

## Validators

- `npm run validate:agent-classification` — policy + manifest + optional `agent-templates` + hospitality member counts vs limits.

## Related

- [`CLASSIFICATION_GOVERNANCE_SPEC_V1.md`](./CLASSIFICATION_GOVERNANCE_SPEC_V1.md) — who promotes a classification, lifecycle, acceptance criteria, vertical proof.
- [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) — character, authority, behavior; **classification-first** hierarchy and compiler merge order.
- [`HOSPITALITY_SWARM_SCHEMATIC_V1.md`](./HOSPITALITY_SWARM_SCHEMATIC_V1.md)
- [`AGENT_DEPLOYMENT_CONTRACT_V1.md`](./AGENT_DEPLOYMENT_CONTRACT_V1.md)
- [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md)
- [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md)
