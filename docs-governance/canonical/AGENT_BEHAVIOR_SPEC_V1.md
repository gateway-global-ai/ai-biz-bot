---
status: canonical
truth_domain: governance
enforced_by: none
backed_by:
  schema: agents, agent_templates, swarm_schematic_members (character inheritance target)
  service: promptCompiler, provisioning, future orchestration
  route: false
last_verified: 2026-03-28
---

# Agent behavior, character & reasoning spec v1 (`AGENT_BEHAVIOR_SPEC`)

File name remains **`AGENT_BEHAVIOR_SPEC_V1.md`** for stable links; scope includes **character** (value order under uncertainty) and **reasoning priors**, not only surface expression.

## Purpose

Separate **four** things the platform must not conflate:

| Layer | Question | Governed by |
|-------|------------|-------------|
| **1. Capability** | What tools and mutations are allowed? | Integration graph, execution contracts, mutation gate, tool allowlists |
| **2. Authority** | Who may **interrupt**, **direct**, **escalate**, or **finalize** in dialogue or workflow? | **Conversational power** (numeric gradient) + policy — **data**, not job-title prose |
| **3. Behavior** | How is the decision **expressed** (moment-level): phrasing, pacing, length, turn shape? | ARCH profile, operational mode, dialogue mechanics — **constrainable** |
| **4. Character** | When goals, facts, or human needs **tension**, what does this agent **honor first**? | **Value order** + **refusal ethics** + **DISC as weighting** over priorities — **structured**, reviewable |

Layers 3–4 together answer “how it sounds” and “what it protects first.” **Character** is not cosmetic: two agents with identical capabilities and authority can produce different **orderings of action** if their **declared priorities** differ.

**Governance principle:** Character and priorities must be **implemented as structured state and compiler/orchestration inputs**, not as vibe prompts. Prose in `long_term_memory` may **narrate** identity, but **conflict resolution under ambiguity** must eventually bind to **ordered, auditable principles** (this spec + schema/registry evolution).

**Canonical line:**

> **Character defines what an agent prioritizes when goals, facts, or human needs are in tension. DISC contributes weighting to that prioritization; it does not by itself define authority, capability, or surface behavior.**

---

## Where cognition defaults live: platform hierarchy

**Do not** anchor default character, authority, and behavior **primarily to industry role names** (e.g. “hospitality concierge” as the sole key). That encodes accidental, non-portable truth.

**Do** anchor **default cognition contracts** to **swarm classification** — reusable **classes of agent work** expressed through **`agent_templates`** (actor/stage/mode) and [**`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)** — so every role that shares a classification **inherits the same durable defaults**. Industry and site specialize **on top**.

| Level | What it defines | Examples |
|-------|-----------------|----------|
| **1. Swarm classification** (`agent_templates`, schematic role → template) | **Durable class contract:** default **governing_values**, **decision_priority_weights**, **refusal_ethics**, **disc_weighting**, **conversational_power**, **arch_defaults** — portable across industries | Coordinator-like, stabilizer-like, validator-like archetypes |
| **2. Domain / industry pack** (swarm schematic, integration context, role YAML) | **What** the agent deals with: policy boundaries, vocabulary, workflow sequence, domain-specific value **emphasis** | Hospitality vs travel vs legal: tools, compliance tone, PMS vs docket |
| **3. Site / team / tenant** (`site_configs`, business overrides) | **Where / for whom:** local goals, escalation rules, tool availability, brand, team composition | Single property vs chain; owner preferences |

**Principles:**

- **Classification** defines *who this kind of agent is under tension* (recurring archetypes: guide, escalator, stabilizer, validator, operator, …).
- **Domain** defines *what domain and constraints apply*.
- **Tenant** defines *where it operates and local overrides*.

**Inheritance must be explicit:** defaults flow **template → schematic member → `agents` row**; overrides are **diffable** and documented (see [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) — `swarm_schematic_members`, `override_policy`).

**Hospitality** is the **first proving ground**, not the **source of truth** for cognition. The same concierge-like classification can specialize for hospitality **domain pack** and later for another vertical without redefining the whole character model.

## Non-goals (v1)

- **No** “personality tuning” or unconstrained prose as the sole source of truth.
- **No** authority declared only in natural language.
- **No** treating DISC as a costume (“sound more C”) without a **judgment** interpretation (see below).
- **No** encoding character **only** as hospitality-named roles; use **classification / template** keys.

---

## Character: value order and reasoning under uncertainty

**Character** (in this spec) means a **stable internal ordering**: what matters most, what gets protected first, what gets verified first when reality is ambiguous.

### The right translation for DISC

DISC is **not** primarily “how the agent acts on the surface.”

**Correct translation:** DISC is a **prior for judgment** — a structured bias over **which concerns get weight** when tradeoffs are unresolved.

| Axis | Judgment levers (under uncertainty), not “tone” |
|------|---------------------------------------------------|
| **D** | Move toward **decision**; reduce unresolved ambiguity; privilege **momentum** and closure when safe |
| **I** | Build **alignment** and shared understanding; preserve relational **energy** for cooperation |
| **S** | Preserve **stability** and continuity; reduce unnecessary disruption; hold the human steady |
| **C** | **Verify**, validate, narrow ambiguity; protect **correctness** and defensible claims |

Surface behavior (word choice, warmth) may **correlate**, but **enforcement and audit** attach to these **judgment semantics**.

### Structured character profile (target shape)

Implement incrementally. Defaults belong at **classification / template**; domain and tenant **merge or override**. **Informative YAML:**

```yaml
character_profile:
  governing_values:
    - correctness
    - stability
    - human_trust
    - decisiveness
    - alignment
  decision_priority_weights:
    correctness: 0.85
    stability: 0.70
    relational_alignment: 0.60
    decisiveness: 0.45
    momentum: 0.30
  disc_weighting:
    dominance: 0.35
    influence: 0.55
    steadiness: 0.80
    conscientiousness: 0.90
  refusal_ethics:
    protect_tenant_boundary: high
    avoid_unverified_claims: high
    avoid_unnecessary_escalation: medium
  conversational_power_default: 50
  arch_defaults:
    acknowledge: 55
    reflect: 50
    context: 60
    handoff: 45
```

**DISC is one input** into the character model, not the whole character. **Beliefs and values** belong in **`governing_values`** and **`refusal_ethics`**, operationalized for compiler and orchestration.

### Auditable “why this order?”

The OS should eventually support: *same tools, same permissions, different **documented priority graph*** → different **ordering of steps**. Character state must be **diffable** and **versioned** like code.

---

## Refusal ethics

**Refusal ethics** are **structured** commitments, aligned with [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) and [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md).

Map into **`structured_controls.guardrails`**, **`refusal_ethics`** in `character_profile`, and **tool/mutation gates**. Defaults at **classification**; domain/tenant may **tighten** (e.g. health vs retail).

---

## Authority: conversational power (recap)

**`conversationalPower`** in **`0..100`**: dialogue control (interrupt, finalize, override). **Default** at **template/classification**; schematic member or agent may **override** with audit trail.

---

## Behavior: expression and mechanics (recap)

Moment-level: **ARCH** (`arch_profile`), **operational_mode**. **Defaults** may live on template as **`arch_defaults`**; agent row remains source at runtime.

---

## What already exists in the OS (ground truth)

| Mechanism | Role in this spec |
|-----------|-------------------|
| **`agent_templates`** | **Primary home for classification-level** defaults (actor/stage/mode + future `character_profile` / cognition contract) |
| **`swarm_schematic_members`** | Role in a schematic: FK to template; **overrides** per policy |
| **`agents`** | Runtime: DISC axes, `arch_profile`, `structured_controls`, modes, STM/LTM |
| Types | `DiscScores`, `ArchProfile`, `StructuredControls` in `shared/schema.ts` |

Prompt assembly: [`server/services/promptCompiler.ts`](../server/services/promptCompiler.ts).

---

## Compiler merge order (normative)

When compiling prompts, **merge and apply constraints in this order** (upstream → downstream). Later layers **refine** earlier ones; they do not replace capability or safety.

1. **Capability constraints** — what may be proposed or executed
2. **Authority constraints** — conversational power, escalation policy
3. **Swarm classification / template** — character defaults, refusal ethics defaults, DISC weighting priors, `conversational_power_default`, `arch_defaults`
4. **Domain / industry pack** — vertical vocabulary, workflow emphasis, domain-specific refinements to values or ethics
5. **Structured behavior / ARCH** — agent-level `arch_profile`, mode, structured_controls merge
6. **Memory / context enrichment** — STM, certified knowledge, session facts
7. **Free-text supporting context** — LTM narrative, owner story (does not override structured priorities)

This keeps **classification upstream** of vertical and tenant specialization.

### Outputs: thought patterns, not vibes

Emit **reasoning-oriented fragments**: explicit **order of operations** under tension, ties between DISC weighting and priority weights, **refusal ethics** as checklists.

---

## Integration points (implementation roadmap)

| Stage | Responsibility |
|-------|----------------|
| **Classification registry / `agent_templates`** | Store **default `character_profile`** + authority/ARCH defaults per **template_key** (cognition class), not per hospitality label |
| **Swarm schematic members** | **Inherit** template defaults; allow **documented overrides** (weight adjustment, domain additions) per [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) |
| **Domain packs** | Industry YAML / schematic metadata: refine values, ethics, vocabulary — **without** redefining the whole classification |
| **Provisioning** | Copy merged contract onto **`agents`**; log provenance (template id, schematic member id) |
| **DB / JSON** | Optional dedicated JSON for `character_profile` on template or agent when migration lands |
| **`promptCompiler.ts`** | Implement **merge order** above; fragments for governing values, DISC-as-judgment, refusal ethics |
| **Tests** | Inheritance tests: template default → member override → agent row |

### Voice lockdown

**Frozen voice infrastructure** unchanged unless a **voice governance task** authorizes it ([`.cursor/rules/sovereign-voice-lockdown.mdc`](../../.cursor/rules/sovereign-voice-lockdown.mdc)).

---

## Layer placement (runtime vs cognition stack)

**Runtime / transport (conceptual):**

```text
Transport → Model (proposal) → Orchestration (authorization)
  → Contracts / capabilities → Execution + canvas
```

**Cognition merge (prompt assembly)** — see **Compiler merge order** above. Character and authority **constrain** proposals before execution; **classification defaults** sit **above** domain and tenant flavor.

---

## Scope: prove on hospitality; own at classification

- **Source of truth** for **default cognition**: **swarm classification** / **`agent_templates`** (and registry policy as aligned).
- **Hospitality Cloudbeds** (and related schematics): **first vertical** to **prove** inheritance and compiler merge — not the only place character lives.
- Generalize to other industries by **domain packs** and templates, not by rewriting character from scratch per vertical.

---

## Related

- [`CLASSIFICATION_GOVERNANCE_SPEC_V1.md`](./CLASSIFICATION_GOVERNANCE_SPEC_V1.md) — lifecycle, approval, and evidence for classification primitives.
- [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) — templates, schematics, inheritance, validators.
- [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) — jurisdiction and agent class posture.
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) — prompts as compiled artifacts.
- [`HOSPITALITY_SWARM_SCHEMATIC_V1.md`](./HOSPITALITY_SWARM_SCHEMATIC_V1.md) — first industry schematic (proving ground).
- [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) — safety vs character.
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md) — latency and boundary.
- [`SYSTEM_READINESS_CHECK_V1.md`](./SYSTEM_READINESS_CHECK_V1.md) — environment vs behavioral claims.

## Revision

Bump **last_verified** when classification-linked `character_profile` storage, compiler merge order, or inheritance rules materially change.
