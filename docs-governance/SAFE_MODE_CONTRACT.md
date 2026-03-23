# Safe Mode Contract

## Purpose
Define Safe Mode as an enforceable runtime policy, not a conversational style.

**Relationship to KAP:** The [Knowledge Plan Orchestrator](./KNOWLEDGE_PLAN_ORCHESTRATOR.md) defines **proficiency**, **trust weights**, and **acquisition**. **Phase 5B** (below) binds **audit outputs** (gap analysis, future probes) to **runtime posture** here—so “Safe Mode” is not only a global toggle but a **multi-dimensional governor** when knowledge certification is partial or missing.

## Safe Mode controls

### Tool access
- strict allowlist only
- no undeclared or exploratory tool usage

### Scope
- current context keys only
- no unrelated entity traversal

### Memory
- memory writes disabled by default
- no persistent profile or workflow mutation unless explicitly allowed

### Navigation
- menu-first
- transition to `view` only when the route/view policy declares it valid

### Mutation
- disabled or tightly limited
- high-risk actions require confirmation or promotion

### Search and retrieval
- no broad catalog or tool exploration
- only scoped, policy-approved lookup behavior

### Response posture
- concise
- schema-grounded
- action-bounded
- explicit about what is and is not allowed

### Escalation
- if the request falls outside scope, the agent must:
  - offer allowed next actions
  - escalate to a better-suited agent
  - or refuse cleanly

## Enforcement rule
Safe Mode behavior must be enforced through:
- policy registry
- route/view/action contracts
- tool allowlists
- execution-time validation

It must not rely on “be careful” wording alone.

---

## Phase 5B — Knowledge certification gates (multi-dimensional governor)

### Purpose (why this exists)

Owners and operators must not discover **uncertified behavior** only from customer complaints. When the **Audit Plane** reports that **observed proficiency** falls short of **role requirement** for one or more **knowledge dimensions**, the OS must **change what the agent is allowed to do**—not merely add a softer system prompt.

This section turns **Safe Mode** from a **binary** (on/off) posture into a **dimension-aware** posture: the agent may remain in **full professional capability** for certified dimensions (e.g. hours/location) while **automatically** entering a **restricted / fallback** posture for uncertified dimensions (e.g. pricing).

**Anti-pattern (forbidden):** Implementing this logic as deep nested `if/else` in ad-hoc route handlers without registry and compiler contracts (“spaghetti AI”). **Required:** structured policy inputs, declared tool restrictions, and compiled prompt fragments per [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md).

### Definitions

| Term | Meaning |
|------|--------|
| **Knowledge dimension** | A governed slice of business truth (e.g. `pricing_menu`, `hours_location`, `booking_contact`). IDs must align with the **gap analysis model** and registries—not ad-hoc strings in UI. |
| **Dimension threshold** | A configured minimum score (0–10) and/or **required** flag below which the dimension is treated as **not certified** for professional claims. |
| **Site-level `atRisk`** | Boolean from the **gap analysis service** when required dimensions fail minimums (see [Knowledge Plan Orchestrator §Implementation alignment](./KNOWLEDGE_PLAN_ORCHESTRATOR.md)). |
| **Runtime posture** | The effective combination of: tool allowlist, retrieval scope, mandatory disclaimers, and escalation skills for the current request. |

### Triggers (contract-level)

The following **may** activate Phase 5B restrictions (exact composition is policy-versioned):

1. **`atRisk === true`** for the site (fleet or session context), **or**
2. **Per-dimension:** `dimension.score < dimensionThreshold` **or** required dimension with **score 0**, **or**
3. **Future:** pre-deploy **probe failure** for a dimension (stress test), which **overrides** heuristic scores for that dimension until cleared.

Triggers must be **logged inputs** to the prompt compiler and policy evaluation, not inferred only from user text.

### Multi-dimensional posture (the “surgical” fallback)

**Rule:** Degraded posture applies **per dimension or intent class**, not by default to the entire agent unless policy declares **global safe** (e.g. hard block for regulated advice).

**Example (illustrative):**

- **Hours/location** certified → normal answers, normal tools for hours/directions.
- **Pricing** uncertified (`pricing_menu` below threshold) → **do not** synthesize prices; **do not** call tools that imply **authoritative** pricing or booking at a quoted rate; **must** offer **human transfer** or **approved** fallback route when the user’s intent is pricing-sensitive.

The agent does **not** need “full lobotomy mode” for the whole session if only one dimension is uncertified.

### Restrictions (enforcement layers)

| Layer | Contract requirement | Implementation hook (see registries) |
|-------|----------------------|-------------------------------------|
| **Tools** | Uncertified dimensions **remove** or **disable** high-risk tools (e.g. anything that commits a price, inventory hold, or payment). | **Tool allowlist** / policy in [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) and execution-plane validation. |
| **Retrieval** | No pretending uncertified RAG chunks are **authoritative** for that dimension; contradiction rules prefer higher **W_t** sources per KAP. | Retrieval policy + source tier metadata. |
| **Mutations** | Booking/checkout mutations **blocked** or **confirm-only** when pricing/booking dimensions uncertified. | Action registry + confirmation gates. |

### Mandatory injection (prompt compiler)

When a dimension is uncertified and the user’s request **falls into** that dimension (policy-classified intent, not free-form guessing):

1. **Disclosure:** A **compiled fragment** must state that **pricing (or relevant dimension) is not certified** for professional mode—not vague “I might be wrong.”
2. **Behavior:** **Refuse authoritative numeric/specific claims** for that dimension; **offer** escalation (human, callback, official channel).
3. **No** relying on the model to “try anyway” outside compiled rules.

Fragments are **versioned inputs** to the compiler, not one-off strings in UI or routes.

### Escalation and fallback skills

When policy maps an uncertified dimension to **human handoff**:

- **`FALLBACK_SKILL_ID`** (or equivalent) must resolve to a **declared** skill in [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md) (or successor)—e.g. transfer, request callback, send to booking URL without quoting a price.
- Escalation must be **deterministic** when triggers fire: same inputs → same escalation class (auditable).

### Composition with global Safe Mode

Phase 5B **layers on top of** the core Safe Mode controls in §Safe Mode controls. If **global** Safe Mode is already on (strict tool allowlist, narrow scope), Phase 5B **tightens** further for specific dimensions; it does not replace execution-time validation for tools and routes.

### Prohibitions

- **No** sole enforcement via conversational “please be careful.”
- **No** uncertified **pricing or policy** presented as **verified** because the model “found it” in a chunk.
- **No** bypassing this contract by injecting ad-hoc overrides in a single route file without registry and governance review per [`GOVERNANCE_REVIEW_ENGINE.md`](./GOVERNANCE_REVIEW_ENGINE.md).

### Versioning

- Dimension thresholds, trigger combinations, and fallback skill IDs are **versioned** alongside KAP weights (see [Knowledge Plan Orchestrator §Versioning](./KNOWLEDGE_PLAN_ORCHESTRATOR.md)).
- Changes require **review** and **migration** notes for existing businesses.

### References

- [`KNOWLEDGE_PLAN_ORCHESTRATOR.md`](./KNOWLEDGE_PLAN_ORCHESTRATOR.md) — KAP, trust weights, gap analysis, certification narrative.
- [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) — jurisdiction, retrieval, refusal.
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) — compiler fragments and structured inputs.
