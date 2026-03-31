---
status: canonical
truth_domain: governance
enforced_by: validate-agent-classification, GOVERNANCE_REVIEW_ENGINE (promotion), preflight-review-required.mdc
backed_by:
  schema: agent_templates, swarm_schematic_members, agents
  service: provisioning, promptCompiler
  route: false
last_verified: 2026-03-28
spec_id: classification_governance
spec_version: "1.0.0"
---

# Classification governance spec v1 (`CLASSIFICATION_GOVERNANCE`)

## Purpose

Answer: **who decides what a valid swarm / agent classification is**—and how it enters the platform without drift or personality theater.

**Short answer:** Classifications are **not** decided by ad hoc roles (“psychologist,” “PM,” individual engineer taste). They are **system-level primitives** promoted through a **governed registry, evidence, and acceptance criteria**—like scheduling classes or isolation levels, not like marketing personas.

This spec defines the **Classification Authority** model: **registry + lifecycle + validation + versioning**. It complements:

- [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) — structural model and limits
- [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) — cognition defaults live at **classification** (`agent_templates`), refined by domain and tenant
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md) — single source of truth discipline

## What a “classification” is here

A **classification** (in the cognition sense used with templates) is a **declared, versioned default** for how a **class of agent work** reasons under tension: **governing values**, **priority weights**, **refusal ethics**, **DISC weighting**, **conversational power defaults**, **ARCH defaults**—see [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md).

Classifications are:

- **Not** unconstrained prompts or UX copy
- **Not** permanent immutable truths (they **version** and can **deprecate**)
- **Not** allowed to override **capability**, **mutation**, or **safe mode** rules

They **are**:

- **Registry-backed** rows (YAML and/or `agent_templates` / policy manifests)
- **Testable** and **observable** under defined scenarios
- **Distinguishable** from other classifications in documented ways

## Classification Authority (not a persona)

**Classification Authority** is **not** a chat agent or a job title. It is:

> **A governed process: registry + review + acceptance standard + promotion workflow**

Authority to mark a classification **approved** for production binding rests with **platform governance** (see **Roles** below), informed by evidence—not on individual subjective “expertise labels.”

Domain expertise (e.g. hospitality operations) feeds **evidence and validation**; it does not replace **governance gates**.

## Lifecycle

Normative states for a classification definition (or template-bound cognition package):

```text
proposed → tested → validated → approved → versioned → monitored → updated | deprecated
```

| State | Meaning |
|-------|---------|
| **proposed** | In registry or branch; not for production agent binding |
| **tested** | Automated checks + targeted scenarios pass |
| **validated** | Domain vertical proof (e.g. hospitality path) meets criteria |
| **approved** | Governance promotion; may bind new `agent_templates` / schematics |
| **versioned** | Immutable version id; changes ship as new minor/patch per semver rules |
| **monitored** | Production signals, audits, readiness—no silent drift |
| **deprecated** | No new binds; existing may grandfather until cutover |

Exact state machine may be tracked in registry metadata (`status`, `version`) and CI until a workflow tool owns transitions.

## Acceptance criteria (before `approved`)

A classification **must**:

1. **Be testable** — produces **consistent, documented reasoning patterns** under fixture scenarios (deterministic or bounded checks where possible).
2. **Be observable** — behavior under tension is **inspectable** (logs, traces, compiled prompt artifacts—not vibes).
3. **Be distinguishable** — documented delta vs peer classifications (not redundant copies).
4. **Not conflict with governance** — cannot weaken capability gates, mutation policy, [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md), or [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) constraints.

## Vertical proof (required)

> **No classification becomes production-authoritative until it is proven in at least one live vertical** (hospitality first in current roadmap).

“Proven” means: template/schematic path works end-to-end with **merged cognition contract** visible in provisioning output and **compiler merge order** respected ([`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md)).

## Roles in the process (capabilities, not job titles)

| Role | Responsibility |
|------|------------------|
| **Governance owner** | Maintains registry consistency; **final promotion** to `approved` for platform use; rejects fragmentation |
| **Domain validation** | Supplies **evidence** from a vertical (workflows, policy boundaries, failure modes) |
| **System validation** | Ensures validators, provisioning, and **prompt compiler** consume the classification **deterministically**; merges are reproducible |

The same human may wear multiple hats; the **artifacts** (registry, tests, review record) matter more than titles.

## Registry shape (informative)

Classifications and template-bound cognition should declare machine-readable metadata, for example:

```yaml
classification_id: concierge_like_v1
status: proposed | approved | deprecated
version: 1.0.0
owner: governance
backed_by:
  - research_notes: uri_or_path
  - test_scenarios: concierge_flow_v1
  - audit: validated_interaction_sample_set
cognition_defaults:
  governing_values: []
  decision_priority_weights: {}
  refusal_ethics: {}
  disc_weighting: {}
  conversational_power_default: 50
  arch_defaults: {}
```

Authoritative storage may split across `registry-yaml/agent-templates/*`, `registry-yaml/agent-classification-policy/*`, and **`agent_templates`** rows as implementation converges—**one logical classification must not fork** into conflicting YAML and DB without an explicit migration spec.

## Materialized merged contract (implementation rule)

> **Merged cognition contract must be materialized and inspectable at provisioning time**, not only reconstructed implicitly during prompt compilation.

The **instantiated `agents` row** (or attached JSON) should carry enough **provenance** (template id, schematic member id, classification version) for **debugging, QA, audit, and readiness**—see [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) integration table.

## Explicit prohibitions

- **No “psychologist agent”** (or similar) that **invents** or **mutates** production classifications without human governance and registry updates.
- **No ungoverned creation** of new classification ids in application code—**registry + validator** first.
- **No treating classifications as unfalsifiable**—they must remain **versioned, testable, replaceable**.

## What to defer (until classification merge is proven)

Avoid premature investment in:

- Dynamic runtime **negotiation** of conversational power between agents (orchestration complexity)
- **Turn-control** logic in voice paths without a voice governance task
- **New `agents` columns** if **`agent_templates` + registry YAML** can prove the merge and materialization path first

## Related

- [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)
- [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md)
- [`GOVERNANCE_REVIEW_ENGINE.md`](./GOVERNANCE_REVIEW_ENGINE.md)
- [`GOVERNANCE_EXECUTION_PLAN_V1.md`](./GOVERNANCE_EXECUTION_PLAN_V1.md)

## Revision

Bump **last_verified** when lifecycle states, acceptance criteria, or registry ownership materially change.
