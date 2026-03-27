---
status: canonical
truth_domain: governance
enforced_by: prompt-runtime-governance.mdc; orchestration / control-plane loaders (mandatory where LLM invoked)
backed_by:
  registry: registry-yaml/state_meta_prompt_binding.yaml
  artifacts: .system_design/meta_prompts/
last_verified: 2026-03-25
---

# Meta prompt envelopes (governed assignment frames)

Structured **meta prompts** are **governed assignment envelopes**: they shape how an agent reasons **inside a single workflow step**. They are **not** a second brain, routing layer, or policy engine.

This layer is **not optional**, **not cosmetic**, and **not an optimization** — it is the **enforcement frame** that makes orchestrated intelligence **reliable** (auditable, bounded, repeatable). Reliability is what makes the behavior product-grade.

## Non-optional execution contract (no exceptions)

These rules are **binding** for any **meta-prompted LLM execution** on the control plane (orchestration, provisioning assist, governance-assist steps, etc.). **There are no bypasses** for missing inputs, wrong state, or invalid output shape.

### 1. State → binding → execution

For every workflow **state that is allowed to invoke an LLM** for structured assistance:

- The state **must** have a **registry-bound** meta prompt artifact (`bindings.<STATE_ID>` → `META_*_vN` in [`state_meta_prompt_binding.yaml`](../../registry-yaml/state_meta_prompt_binding.yaml)).
- **No registry binding for that state → the LLM path must not run** (hard block — treat as governance gap or implementation error).

States that **never** call an LLM (pure code, DB, HTTP handler only) **must** be **explicitly declared** as non-LLM in the workflow registry (or equivalent single source of truth) so that “no meta prompt” is **intentional**, not ambiguous. Those states **must not** load ad hoc or inline prompts for model calls.

### 2. Versioned + registered only

- **No free-floating prompts:** every meta prompt artifact in production paths **must** be versioned (`*_vN`), listed under `artifacts` in the registry, and reachable only via **state binding** (or compiler indirection that resolves **through** the registry).
- Prompt prose **must not** live only in code comments, Slack, or unversioned markdown outside `.system_design/meta_prompts/` + registry.

### 3. Mandatory execution log (every meta-prompted run)

Every meta-prompted execution **must** emit structured telemetry (control plane — not voice/chat hot paths unless explicitly designed):

| Field | Requirement |
|-------|----------------|
| **state id** | Active workflow state |
| **meta prompt id + version** | Resolved artifact id (e.g. `META_AGENT_SPEC_CREATION_v1`) |
| **inputs** | Present / missing summary (keys or validator ids — no raw PII) |
| **output validity** | Pass / fail vs schema or validator |
| **failure reason** | If blocked: stable code + short message |

Exact field names, resolver algorithm, and acceptance tests: [`META_PROMPT_RUNTIME_CONTRACT.md`](./META_PROMPT_RUNTIME_CONTRACT.md). **Omitting the telemetry record is not allowed** once the LLM path ships.

### 4. Hard block conditions (mandatory)

**Block execution (do not call the model, or abort immediately after call if validation fails)** if **any** of the following hold:

- **Required inputs missing** (per artifact + governance validators)  
- **State mismatch** (declared state ≠ binding used, or binding missing)  
- **Output shape invalid** (schema / validator rejection)  

**No exceptions** — no “best effort” deploy, no silent retry without a new run record, no skipping validation in prod.

---

**Scope note:** Voice/chat customer runtime and frozen execution-plane paths remain governed by [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md) and voice lockdown; **this contract** applies where the **control plane** chooses to invoke an LLM for orchestration/meta steps. Expanding that surface **extends** these obligations.

## Law: separation of concerns

**The workflow / state machine is the only component allowed to decide:**

- what step is active  
- whether that step is allowed  
- what inputs are required  
- what outputs are valid  
- whether the process may proceed  

**Governance** (policy, schema, validators, allowlists) decides **authority**: what is permitted, what data is considered validated, and what constitutes a blocker.

**The meta prompt is limited to one function only:**

- shape the agent’s behavior **inside the active step** (reasoning shape, role containment, output structure, safe failure wording).

### Stack (binding)

| Layer | Role |
|-------|------|
| **Governance** | Authority — inputs required, policies active, outputs allowed, violations |
| **Workflow / state machine** | Sequencing — step, gates, proceed / block |
| **Meta prompt** | Bounded execution frame — how to compose output **within** the step |
| **Skills / tools** | Side effects per skill contracts — not replaced by meta prompts |

### Named law: no phase transitions from prompts

**Meta prompts may not trigger, infer, or authorize phase transitions.** If a meta prompt decides what phase comes next, the architecture is drifting.

### Prohibition: no new business truth

**A meta prompt may not introduce new business facts, policies, routes, thresholds, or truth claims not already present in validated inputs** (or in explicitly attached governed artifacts such as registries and schemas). Meta prompts teach *how to structure reasoning and output*, not *what the business is*.

## Versioning and registry binding (non-optional)

Covered by **§ Non-optional execution contract** above. In short:

- Every artifact is **versioned** (e.g. `META_AGENT_SPEC_CREATION_v1`).  
- Every in-use artifact appears under `artifacts` in [`registry-yaml/state_meta_prompt_binding.yaml`](../../registry-yaml/state_meta_prompt_binding.yaml); **state id → artifact id** under `bindings`.  
- **Do not** hardcode prompt paths in execution-plane hot paths; resolve via registry or compiler indirection per [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md).

## When to use a meta prompt

Use one when a step needs:

- consistent reasoning shape  
- structured output  
- role containment  
- explicit constraints  
- repeatable quality across varying inputs  

Examples of **suitable steps** (not all shipped): single-agent spec, swarm topology, skill mapping, funnel design, aptitude review, deployment spec draft, governance review assist.

## When not to use a meta prompt

A meta prompt may **not** be used as:

- a replacement for routing  
- a replacement for policy checks  
- a replacement for skill contracts  
- a replacement for state validation  
- a replacement for truth or business data  
- a phase transition engine  

Prefer **small, step-specific** envelopes over one universal mega-prompt (mega prompts blur responsibility, resist testing, and fight governance).

## Required structure per artifact

Each versioned artifact **must** document these sections:

| Section | Content |
|---------|---------|
| **STEP_ID** | Stable id aligned with workflow / registry state |
| **Purpose** | One paragraph — bounded role for this step only |
| **Required Inputs** | List — must be satisfied by upstream validation / governance |
| **Allowed Operations** | What the model may do inside the step |
| **Prohibited Operations** | Explicit negations (incl. no new truth, no phase transition) |
| **Required Output Shape** | Fields or schema reference |
| **Failure Behavior** | Deterministic blocked shape (e.g. `readiness_status`, `blockers`, `next_required_input`) |

## Runtime auditability

Redundant with **§ Non-optional execution contract → Mandatory execution log** and **→ Hard block conditions**. No “incremental” waiver: once a meta-prompted path is live, logging and blocking rules **apply**.

## Swarm vs single-agent

Swarm design is **not** “more agents.” It requires topology, role separation, coordination rules, shared memory policy, escalation, and per-role aptitude expectations — therefore a **dedicated** artifact (e.g. `META_SWARM_TOPOLOGY_DESIGN_v1`) when implemented, not a stretched single-agent envelope.

## Design law: no embedded business truth

**Bad:** hardcoded industry logic, fixed funnel assumptions, hidden policies, implicit thresholds inside meta prompt prose.  
**Good:** how to reason, how to structure output, how to fail safely, how to stay within scope — with **truth** supplied by validated inputs and registries.

## v1 priority artifacts

Ship first (highest leverage, least drift):

1. `META_AGENT_SPEC_CREATION_v1`  
2. `META_SKILL_MAPPING_v1`  
3. `META_APTITUDE_TEST_v1`  

Then expand per [`registry-yaml/state_meta_prompt_binding.yaml`](../../registry-yaml/state_meta_prompt_binding.yaml).

## Positioning vs chain-style frameworks

**Surface similarity:** step chains, structured prompts, tools, and agents appear in many frameworks (e.g. LangChain-style stacks).

**Architectural difference:** In prompt-driven orchestration, prompts often **drive** flow and can override behavior. In this OS, **governance and the state machine drive flow**; meta prompts **execute within** a bound. **LangChain lets the model decide next steps; this stack requires the system to decide and the model to obey within the active step.**

Do not undersell the product as “like LangChain”; the control and audit model is different by design.

## Related

- [`META_PROMPT_RUNTIME_CONTRACT.md`](./META_PROMPT_RUNTIME_CONTRACT.md) — resolver, telemetry schema, enforcement, ship acceptance criteria  
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)  
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)  
- [`SOVEREIGN_OS_V1_SPEC.md`](./SOVEREIGN_OS_V1_SPEC.md)  
- [`INTERNAL_AGENT_CREATION_DOCTRINE.md`](./INTERNAL_AGENT_CREATION_DOCTRINE.md)  
- [`WL-AGENT-ORCHESTRATION.md`](../worklogs/WL-AGENT-ORCHESTRATION.md)  
