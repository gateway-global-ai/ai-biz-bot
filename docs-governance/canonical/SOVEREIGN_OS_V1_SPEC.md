---
status: canonical
truth_domain: governance
enforced_by: agent_orchestration_runs, server/services/agentOrchestration.ts
backed_by:
  schema: true
  service: true
  route: true
last_verified: 2026-03-25
---

# SOVEREIGN_OS_V1_SPEC

Single anchor for **what is enforced**, **what survives failure**, and **what passes orchestration** for agent swarm provisioning and related control-plane flows.

## What is enforced (v1)

1. **Orchestrator entry for swarm provision** — `runAgentSwarmProvisionOrchestrated` in [`server/services/agentOrchestration.ts`](../../server/services/agentOrchestration.ts) is the required path for:
   - `POST /api/site-configs` (create) — [`server/routes/siteConfigRoutes.ts`](../../server/routes/siteConfigRoutes.ts)
   - `POST /api/intelligence/provision` — [`server/routes/intelligenceRoutes.ts`](../../server/routes/intelligenceRoutes.ts)
   - Storefront demo create — [`server/routes/storefrontRoutes.ts`](../../server/routes/storefrontRoutes.ts)

2. **Run memory** — Table `agent_orchestration_runs` (migration `0065_agent_orchestration_runs.sql`, Drizzle [`agentOrchestrationRuns`](../../shared/schema.ts)) stores `run_id`, `site_config_id`, optional `agent_id`, `current_state`, `step`, `status`, `blockers`, `failure_refs`, timestamps.

3. **Pipeline steps** — `orchestrator` → `skill_mapping` → `aptitude_test` (deferred at runtime) → `governance_gate` → `provisioning` → `provisionAgentsForBusiness`.

4. **Registry contracts** — Machine-oriented YAML: [`registry-yaml/orchestrator_contract.yaml`](../../registry-yaml/orchestrator_contract.yaml). Skill identity: [`registry-yaml/skill-identity-registry.yaml`](../../registry-yaml/skill-identity-registry.yaml).

5. **Prompt compile gate** — `reject_prompt_compilation_without_orchestrator` (YAML) means **orchestrator-gated persistence** of deployed prompt truth, **not** blocking per-session `compileFullSystemPrompt` on voice or chat (execution plane). See [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md).

6. **HTTP single-agent create** — `POST /api/intelligence/orchestration-runs` (auth) mints a run; client then `POST /api/agents` with `siteConfigId`, `orchestrationRunId`, and fields. Server validates run (exists, same `site_config_id`, `status=in_progress`, `metadata.purpose=single_agent_create`) and completes the run on success (consume-once via status). Env: `ORCHESTRATION_AGENT_CREATE_BYPASS` (dev only; logs violation).

7. **Session ↔ site binding** — These user-facing intelligence and agent routes call `assertSiteAccessForSession` ([`server/utils/siteScopedAccess.ts`](../../server/utils/siteScopedAccess.ts)): the authenticated admin session must be allowed for that site (global/support roles, or reseller scope match). Responses use `SITE_ACCESS_DENIED` when the principal cannot act on the given `siteConfigId`:
   - `POST /api/intelligence/orchestration-runs`
   - `POST /api/intelligence/provision`
   - `POST /api/agents` (when `siteConfigId` is present)

   Site-access denials persist a `governance_violation` with `routeOrSource`, `actorHint` (admin session id when available), `siteConfigId`, and `detail` including `reason`, `httpStatus`, and `orchestrationRunId` when the client supplied one (otherwise `null` pre-run).

## Two-layer agent creation (v1 truth)

In v1, agent creation on user-accessible HTTP paths is governed through orchestration runs and server-side run validation. Certain internal control-plane paths remain exempt from the single-agent HTTP gate, including seed initialization and swarm provisioning, and must be treated as explicit trusted exceptions with separate audit requirements.

**External (user-reachable HTTP):** Orchestrated where gated, run-bound, consume-once through terminal status (`in_progress` → `completed` on success). Business scope requires session ↔ site authorization on run mint and on create.

**Internal:** Trusted callers may still invoke `storage.createAgent` under explicit rules in [`INTERNAL_AGENT_CREATION_DOCTRINE.md`](./INTERNAL_AGENT_CREATION_DOCTRINE.md) (inventory, reason codes, audit, run requirements). These are **not** user-facing bypasses of the HTTP gate.

## ORCHESTRATOR EXECUTION CONTRACT (prompt fragment)

Governed parent orchestrator prompts MUST include:

```text
ORCHESTRATOR EXECUTION CONTRACT

All agent creation, modification, and deployment MUST originate from the orchestrator.

The orchestrator is the ONLY valid entry point for:
- agent creation
- funnel creation
- skill assignment
- deployment requests

Any attempt to bypass the orchestrator is:
→ invalid
→ blocked
→ logged as a violation

No exceptions.
```

Operational **break_glass** (if ever required) still emits a **violation** record; it must not add a silent second path.

## What survives failure

- **Failed provision** — Run row `status=failed`, `blockers` and `failure_refs` populated; site row may still exist (create-before-provision). Operators replay via `POST /api/intelligence/provision` or backfill scripts.
- **Idempotency** — `provisionAgentsForBusiness` remains the template loop; duplicate runs create duplicate agents unless a future idempotency key is added (work log).

## What passes orchestration

- **v1 gate** — Pipeline steps recorded on the run; `aptitude_test` marked deferred in `metadata` until CI/aptitude scenarios block release in a later phase.
- **Customer outcome** — Thresholds in `orchestrator_contract.yaml` under `customer_outcome` are **not** yet enforced in runtime; see [`WL-AGENT-ORCHESTRATION.md`](../worklogs/WL-AGENT-ORCHESTRATION.md).

## Planes

| Plane | Contents |
|-------|----------|
| **Control** | Orchestrator service, `orchestrator_contract.yaml`, skill identity registry, gates (partial) |
| **Execution** | Agents, voice/chat runtime, `promptCompiler` / `systemPromptCompiler` |
| **Feedback** | `agent_orchestration_runs`, `failure_pipeline` fields in YAML (severity wiring incremental) |

## Aspirational vs shipped

Enterprise vocabulary (global PDP/PEP, TTT product) is **not** implied here. See [`ENTERPRISE_MATURITY_EXTENSIONS.md`](../archive/ENTERPRISE_MATURITY_EXTENSIONS.md).

## Related

- [`INTERNAL_AGENT_CREATION_DOCTRINE.md`](./INTERNAL_AGENT_CREATION_DOCTRINE.md) — trusted internal `storage.createAgent` paths, reason codes, audit, run requirements
- [`META_PROMPT_ENVELOPES.md`](./META_PROMPT_ENVELOPES.md) — step-bound meta prompts (spec / skills / aptitude); state machine + governance retain authority  
- [`META_PROMPT_RUNTIME_CONTRACT.md`](./META_PROMPT_RUNTIME_CONTRACT.md) — resolver, telemetry schema, enforcement (law → runtime)
- [`KNOWLEDGE_VOLATILITY_GOVERNANCE.md`](./KNOWLEDGE_VOLATILITY_GOVERNANCE.md) — aptitude mandate
- [`AGENT_SWARM_DEPLOYMENT_RUNBOOK.md`](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md) — provision semantics
- [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md) — activatable skills vs control-plane skills
