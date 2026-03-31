---
name: Agent classification and swarm deployment
overview: Harden actor/lifecycle/control classification and swarm limits into governed registries, validators, DB tables, provisioning, and a Business Capability Translator—aligned with existing hospitality YAML swarm and integration graph.
todos:
  - id: doc-AGENT_CLASSIFICATION_V1
    content: Author AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md + charter/schema anchor updates
  - id: yaml-policy-registry
    content: Add registry-yaml/agent-classification-policy/*.v1.yaml (enums, composition, restricted combinations, swarm_limits, overrides)
  - id: yaml-structural-bundles
    content: Add agent-templates + swarm schematic registry/member YAML; reconcile with hospitality_cloudbeds.v1.yaml SOT strategy
  - id: script-validate-agent-classification
    content: scripts/validate-agent-classification.ts + npm script + sovereign-guard step
  - id: migration-agent-swarm-tables
    content: migrations + Drizzle for new tables; extend agents with classification + FKs without duplicating operationalMode
  - id: provision-swarm-bridge
    content: Provisioning service with property active cap and write-capable limits from integration graph
  - id: translator-prompt-fragment
    content: Governed translator prompt + output schema validation + persistence anchor
isProject: false
---

# Agent and swarm classification — deployment plan

## Review improvements (apply to your notes)

1. **Replace vague crossover rule:** "outreach and compensation" — `compensation` is not a defined stage. Encode pairs in **`restricted_combinations.v1.yaml`** (e.g. outreach + retention, or named business rules) with `approval_required` / `management_review`.

2. **Align with existing DB:** Do not add a second `operational_mode` on `agents`; reuse **`operationalMode`**. Map `deployment_status` / `is_active` carefully against existing **`status`**, **`startupStatus`**, and **`structuredControls`**.

3. **Single SOT for hospitality swarm:** Today [`registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml`](registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml) + [`validate-swarm-schematic`](scripts/validate-swarm-schematic.ts) already close role/mode/capability/tool alignment. Choose one for v1: **YAML authoritative + DB projection** OR **DB authoritative + YAML generated** — document in canonical spec; avoid dual unvalidated truths.

4. **Write-capable (formal):** Derive from **integration capability** rows (`mutation_level`, `side_effect_level`) for tools in each agent’s capability sets — not from agent labels. Swarm limit "4 write-capable agents" = count from graph.

5. **Template vs member:** Adopt **Option C** — template defaults; member **effective** values; validator checks **override_policy** bounds.

6. **Prompt addition (verbatim):** *If a request spans multiple primary actors or primary stage classes, decompose it into multiple candidate agents rather than forcing it into one agent.*

7. **Management reporting:** Address via **capability maps** (read-heavy sets for `reporting` primary) — not prompt-only.

8. **Existing `industry_agent_templates`:** [`shared/schema.ts`](shared/schema.ts) holds DISC/ARCH industry × `role_type`. New **`agent_templates`** are reusable blueprints; plan a **migration/backfill** path (FK from industry template → platform template) rather than replacing in one cut.

## Phase 0 — Canonical doc

- [`docs-governance/canonical/AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](docs-governance/canonical/AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)
- Update [`REGISTRY_AUTHORITY_CHARTER.md`](docs-governance/canonical/REGISTRY_AUTHORITY_CHARTER.md), [`SCHEMA_ANCHOR_REGISTRY.md`](docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md) when tables exist.

## Phase 1 — Policy registry (machine-readable)

`registry-yaml/agent-classification-policy/`:

- `enums.v1.yaml` — actor, lifecycle, control, statuses
- `composition_rules.v1.yaml` — max secondaries, stage namespace by actor
- `restricted_combinations.v1.yaml` — approval / review triggers
- `swarm_limits.v1.yaml` — global and per-actor caps, write-capable swarm cap, per-agent write-set cap
- `override_policy.v1.yaml` — member vs template (Option C)

## Phase 2 — Structural YAML + validator

- `registry-yaml/agent-templates/*.v1.yaml`
- Swarm schematic registry (manifest + extend or split members per peer review)
- **`npm run validate:agent-classification`** — load policy + templates + schematics + integration sets; enforce limits and combinations
- Wire [`.github/workflows/sovereign-guard.yml`](.github/workflows/sovereign-guard.yml)

## Phase 3 — Database

Tables: `agent_templates`, `swarm_schematics`, `swarm_schematic_members`. Extend `agents` with classification JSON/FKs. Avoid duplicating `capability_set` truth: prefer **one** effective store (`structured_controls.swarm_role_contract` and/or new columns) — decide in spec.

`npm run db:migrate`

## Phase 4 — Provisioning

Extend [`server/services/agentProvisioning.ts`](server/services/agentProvisioning.ts) or new service: schematic → members → agents; enforce **16 active cap**; overflow = draft/disabled/simulation_only per policy.

## Phase 5 — Business Capability Translator

Governed fragment per [`PROMPT_RUNTIME_GOVERNANCE.md`](docs-governance/canonical/PROMPT_RUNTIME_GOVERNANCE.md); validate output (Zod/YAML schema); persist to chosen anchor (`siteConfigs` metadata or `onboardingSessions`).

## Phase 6 — Optional UI/admin

Classification violations dashboard; link to deployment readiness.

## Non-goals (v1)

- Big-bang removal of `industry_agent_templates` without backfill
- Translator on customer voice hot path
- Changes under voice lockdown for this initiative

## Success criteria

- `validate:agent-classification` green in CI with hospitality + policy
- One end-to-end provision path sets classification fields and respects caps
- Translator output stored and validated
