---
status: canonical
truth_domain: governance
enforced_by: agent-policy-registry.mdc, prompt-runtime-governance.mdc
backed_by:
  schema: partial
  service: partial
  route: false
last_verified: 2026-03-28
---

# Agent Deployment Contract v1

## Document authority

```yaml
authority:
  source_of_truth: docs-governance/canonical/AGENT_DEPLOYMENT_CONTRACT_V1.md
  scope: customer_facing_runtime_deployed_agents
```

This document defines **what must be true** before a **customer-facing** agent is treated as **deployed** under the OS: identity, **knowledge authority**, tools, fallbacks, proficiency, and runtime enforcement. It **binds** registries and services listed in [REGISTRY_AUTHORITY_CHARTER.md](./REGISTRY_AUTHORITY_CHARTER.md); it does **not** replace them.

**Plane scope:** `customer_facing_runtime` (Gemini voice, website chat, site-assigned concierge). For **internal workers** (`/api/local-agent`), see [AGENT_CAPABILITY_SPEC_V0.md](./AGENT_CAPABILITY_SPEC_V0.md) and `registry-yaml/agent-capabilities/*.yaml` — cross-reference only until a deliberate merge.

**Non-goals (v1):** This file is **law** for *what “deployed” means* and *what validators must check*; it is not the machine-readable schema for a future `agent_deployment_contracts` table (that is a later implementation artifact). **Anti-pattern:** satisfying the contract with prompt-only “be careful” or intro copy.

## North star pipeline

**Required mental model:**

```text
Agent deployment contract → validation (deploy / CI) → runtime enforcement → compiled prompt + tool allowlist → model behavior
```

**Forbidden as sole authority:** `Agent row → long system prompt → behavior` without contract validation and enforcement.

## Definitions

| Term | Meaning |
|------|---------|
| **Deployed agent** | A customer-facing agent session that is **allowed** to represent a business under production policy — contract **valid** for that `(site_config_id, agent_id)` (or explicit **non-deployed** exception; see §Bypass surfaces). |
| **Claim class** | A category of factual or commercial assertion (e.g. `address`, `phone`, `hours`, `pricing`, `inventory`, `policy`). |
| **Knowledge source class** | An authorized backing store or path (e.g. structured DB fields, `knowledge_library`, named external API, certified audit dimension). |
| **Contract valid** | All **mandatory** sections below are defined, internally consistent, and pass **proficiency** per policy. |

## Mandatory sections (v1)

A **deployed** customer-facing agent MUST have the following defined and validated. Until enforcement code exists, this document is the **specification** for validators and reviews; gaps are **documented debt**, not permission to invent behavior in prompts.

### 1. Identity

| Field | Requirement |
|-------|-------------|
| `agent_id` | Row in `agents`; matches runtime resolution for the session. |
| `site_config_id` | Site binding; `site_configs.assignedAgentId` (or governed multi-agent rule) consistent with policy. |
| `role_type` / archetype | Declared role for jurisdiction ([AGENT_POLICY_REGISTRY.md](./AGENT_POLICY_REGISTRY.md)). |
| `operational_mode` | One of [OPERATIONAL_MODES](../../server/config/operationalModes.ts) ids; drives tool allowlist intersection. |

### 2. Knowledge authority (mandatory)

**Rule:** For each **claim class** the agent may need to answer, the contract MUST list **one or more allowed `knowledge_source_class` values**. If a claim class is **not** bound, the agent is **not permitted to state** facts in that class except via **explicit fallback** actions (refuse, handoff, tool-only after success).

**Illustrative source classes** (extend in implementation; names are stable vocabulary):

- `structured_fields` — authoritative columns on `site_configs` / related tables (name, address, phone, hours, etc.).
- `knowledge_library` — owner-curated library attached to the site.
- `place_entity` — Google Places / normalized `placeData` where policy allows.
- `external_api` — Named integration (e.g. PMS inventory); must name the integration id in contract appendix.
- `certified_dimension` — Output of knowledge certification / audit plane ([KNOWLEDGE_PLAN_ORCHESTRATOR.md](./KNOWLEDGE_PLAN_ORCHESTRATOR.md), [SAFE_MODE_CONTRACT.md](./SAFE_MODE_CONTRACT.md) Phase 5B).

**Singular authority per claim:** At runtime, **compiled prompts** and **tool results** must be traceable to these classes — not to model priors. Enforcement is **tool gating + mode + certification-driven restrictions**, not disclaimer text alone.

### 3. Skills / tools

| Rule | Detail |
|------|--------|
| **Allowlist** | `allowed_tools` ⊆ keys of [geminiToolDeclarations.ts](../../server/config/geminiToolDeclarations.ts) ∩ `allowedToolNames` for the agent’s `operational_mode` in [operationalModes.ts](../../server/config/operationalModes.ts). |
| **Tool requirements** | Declarative rows: e.g. `pricing` claims → require successful `inventory_lookup` class tool (exact name per integration) **or** refusal. Same for `address` → `structured_fields` or `get_business_details` per policy. |
| **Site-anchored tools** | Tools in the site-anchored set (e.g. `query_knowledge_library`, inventory tools) MUST NOT execute without session/site binding — see live implementation in `server/geminiVoice.ts` and [SESSION_IDENTITY_BINDING_SPEC.md](./SESSION_IDENTITY_BINDING_SPEC.md) for protected paths. |

### 4. Fallback rules

| Trigger | Allowed actions (vocabulary) |
|---------|-------------------------------|
| **Missing knowledge** for a bound claim | `refuse`, `honest_unknown`, `offer_handoff`, `degrade_mode` (per [SAFE_MODE_CONTRACT.md](./SAFE_MODE_CONTRACT.md)). |
| **Tool failure** | `retry_bounded`, `degrade_mode`, `refuse`, `human_route`. |
| **Unverified claim attempt** | `block`, `safe_mode_slice` (dimension-aware per Phase 5B). |

Actions MUST map to **runtime policy + routing**, not to fixed user-facing strings in this doc.

### 5. Proficiency tests (mandatory for deploy)

**Rule:** A **blocking** probe set MUST pass before **deployed** status. Each probe specifies at least: `question` (or stimulus), `expected_source_class` **or** `expected_tool`, and pass criteria.

| Policy knob | v1 recommendation |
|-------------|-------------------|
| **Blocking set** | Small golden set (e.g. address, hours, one commercial fact) — **100%** pass required for `deployed`. |
| **Expansion** | Full KAP adversarial set ([KNOWLEDGE_PLAN_ORCHESTRATOR.md](./KNOWLEDGE_PLAN_ORCHESTRATOR.md) §Pre-deploy stress test) — batch / CI, not voice hot path. |

**Gap (today):** `npm run test:voice-concierge-aptitude` validates **PPP/ARCH shape**, not **source/tool grounding**. [agentAptitudeService.ts](../../server/services/agentAptitudeService.ts) scores **prompt text**, not **claim-to-source** alignment. New tests MUST be added per this contract under Phase 5 execution.

### 6. Runtime enforcement flags

| Flag (normative) | Intent |
|------------------|--------|
| `block_unverified_claims` | No authoritative statement outside bound sources / tool success. |
| `require_tool_for_fields` | Named claim classes require tool path or refusal. |
| `safe_mode_on_certification_gap` | When audit marks dimensions **at risk**, narrow tools/mode per [SAFE_MODE_CONTRACT.md](./SAFE_MODE_CONTRACT.md) Phase 5B — **compiler inputs + allowlist**, not softer prose. |

Implementation touches: [promptCompiler.ts](../../server/services/promptCompiler.ts), `geminiVoice` tool filtering, `toolHandler`, optional post-generation checks — **governed tasks** where voice lockdown applies.

## Bypass surfaces (non-deployed unless enumerated)

Any UX path that starts a model **without** resolving a full **site + assigned agent + contract-equivalent context** MUST be explicitly listed as:

- **Non-deployed** (demo / marketing only), or  
- Migrated under this contract.

**Examples to enumerate in implementation appendices:** industry funnel pages, `/buy`-style flows, embed widget, AI Studio parallel socket paths not using Contextual Snap — **named list**, not tribal knowledge.

Provisioning: if `POST /api/site-configs` creates a site without [provisionAgentsForBusiness](../../server/services/agentProvisioning.ts), the roster may be incomplete ([teams-agents-provisioning-matrix.mdc](../../.cursor/rules/teams-agents-provisioning-matrix.mdc)) — contract validation SHOULD treat **missing roster** as **not deployable** for full swarm claims unless a **single-agent demo** flag is defined.

## Appendix A — Repo alignment (current anchors)

| Contract concern | Primary code / doc anchor |
|------------------|---------------------------|
| Identity & site | `shared/schema.ts` (`agents`, `site_configs`), [siteRuntimeResolver.ts](../../server/services/siteRuntimeResolver.ts) |
| Compiled prompt | [promptCompiler.ts](../../server/services/promptCompiler.ts), `compileFullSystemPrompt` / `buildBehavioralPrompt` |
| Voice session shaping | [geminiVoice.ts](../../server/geminiVoice.ts) (Contextual Snap; lockdown) |
| Mode tool sets | [operationalModes.ts](../../server/config/operationalModes.ts) |
| Tool declarations | [geminiToolDeclarations.ts](../../server/config/geminiToolDeclarations.ts) |
| Tool execution | [toolHandler.ts](../../server/services/toolHandler.ts) |
| Readiness (identity/path) | [readinessGateV1.ts](../../server/services/readinessGateV1.ts) — **not** equivalent to knowledge deploy gate |
| Prompt-level aptitude | [agentAptitudeService.ts](../../server/services/agentAptitudeService.ts) |
| Website chat path | [chatRoutes.ts](../../server/routes/chatRoutes.ts) |

## Appendix B — Related canonical docs

- [REGISTRY_AUTHORITY_CHARTER.md](./REGISTRY_AUTHORITY_CHARTER.md) — registry SOT; this contract **binds** them for deploy posture.
- [GOVERNANCE_EXECUTION_PLAN_V1.md](./GOVERNANCE_EXECUTION_PLAN_V1.md) — phase order; contract validation is Phase **5** enforcement loop.
- [KNOWLEDGE_PLAN_ORCHESTRATOR.md](./KNOWLEDGE_PLAN_ORCHESTRATOR.md) — R_min, P_obs, trust weights, probes.
- [SAFE_MODE_CONTRACT.md](./SAFE_MODE_CONTRACT.md) — Phase 5B dimension-aware governor.
- [AGENT_POLICY_REGISTRY.md](./AGENT_POLICY_REGISTRY.md) — jurisdiction and refusal posture.
- [PROMPT_RUNTIME_GOVERNANCE.md](./PROMPT_RUNTIME_GOVERNANCE.md) — prompts as compiled artifacts.
- [AGENT_CAPABILITY_SPEC_V0.md](./AGENT_CAPABILITY_SPEC_V0.md) — internal worker capabilities (orthogonal plane).

## Versioning (this document)

| Bump | When |
|------|------|
| **patch** | Clarifications, appendix path fixes, non-semantic edits |
| **minor** | New optional sections, new source classes, new enforcement flags |
| **major** | Redefinition of **deployed**, removal of mandatory sections, or breaking enforcement semantics |
