---
status: canonical
truth_domain: governance
scope: storage-level and service-level agent row creation (non-HTTP exceptions)
last_verified: 2026-03-25
---

# Internal agent creation doctrine (v1)

This document defines **which code paths may create `agents` rows without going through the public single-agent HTTP gate** (`POST /api/intelligence/orchestration-runs` → `POST /api/agents`), **why**, and **what audit trail they owe**. It prevents **false unity**: the external surface is site-bound and run-gated; the storage layer still has **explicit trusted exceptions**.

Pair with [`SOVEREIGN_OS_V1_SPEC.md`](./SOVEREIGN_OS_V1_SPEC.md) (two-layer truth) and [`WL-AGENT-ORCHESTRATION.md`](../worklogs/WL-AGENT-ORCHESTRATION.md).

## 1. Allowed internal creation paths

| Path | Code anchor | Classification |
|------|-------------|----------------|
| Swarm template provisioning | [`server/services/agentProvisioning.ts`](../../server/services/agentProvisioning.ts) → `storage.createAgent` | **Permanent control-plane** — only legitimate entry is via `runAgentSwarmProvisionOrchestrated` (run row created before/at orchestration; site-config create, `POST /api/intelligence/provision`, storefront demo). |
| HTTP single-agent create (post-gate) | [`server/routes/agentSystemRoutes.ts`](../../server/routes/agentSystemRoutes.ts) → `storage.createAgent` | **Not an exception** — this is the governed public path after run + site access validation. |
| Demo site + agent seed | [`server/index.ts`](../../server/index.ts) `seedDemoAgents` | **Transitional / environment-scoped** — must not be relied on as prod tenant creation; prefer env guard (`NODE_ENV`, explicit flag) if prod must never mutate. |
| Core platform agent seed | [`server/index.ts`](../../server/index.ts) `seedCoreAgents` | **Permanent platform internal** — seeds global/core rows; not tenant-scoped business agents. |

**Rule:** Any **new** `storage.createAgent` call site requires an update to this table and governance review.

## 2. Required justification / reason codes

Use these string codes in logs, run `metadata`, or future `internal_creation_reason` fields when implementing structured audit:

| Code | Meaning |
|------|---------|
| `INT_SWARM_PROVISION` | Agent created from industry templates inside orchestrated swarm provision. |
| `INT_HTTP_SINGLE_AGENT` | Agent created via gated `POST /api/agents` (orchestration run + site access). |
| `INT_SEED_DEMO_AGENTS` | Demo slug sites and paired agents for showcase/dev. |
| `INT_SEED_CORE_AGENTS` | Platform-wide core agents (non-tenant product rows). |

## 3. Required audit fields

Minimum expectations by path:

| Path | Orchestration run | Other audit |
|------|-------------------|-------------|
| Swarm provision (orchestrated) | **Required** — `agent_orchestration_runs` row for the provision attempt; failures update run `status` / `failure_refs`. | Server logs on provision errors. |
| HTTP single-agent create | **Required** — `single_agent_create` run; completed on success. | `orchestration_violations` on gate or site denial. |
| Demo seed | **Not required today** | Console / startup log line identifying seed path; **sunset:** add env gate or migrate to explicit script. |
| Core agent seed | **Not required** (not tenant swarm) | Console / startup log; idempotent by agent name. |

**Violations telemetry** (external denials): normalized shape per `SOVEREIGN_OS_V1_SPEC` — `routeOrSource`, `actorHint`, `siteConfigId`, `detail.reason`, `detail.httpStatus`, `detail.orchestrationRunId` when applicable.

## 4. Orchestration run: required, optional, or prohibited

| Flow | Run |
|------|-----|
| Public single-agent create | **Required** (unless `ORCHESTRATION_AGENT_CREATE_BYPASS=true`; still logs violation). |
| Public swarm provision (`runAgentSwarmProvisionOrchestrated`) | **Required** — provision orchestration run. |
| `provisionAgentsForBusiness` called only from orchestrator | **Required** upstream; direct ad-hoc calls from new code are **forbidden** without doctrine update. |
| Startup demo/core seeds | **Prohibited** — no `agent_orchestration_runs` row; documented exception. |

## 5. Sunset plan for temporary exceptions

| Exception | v1 stance | Sunset / hardening |
|-----------|-----------|---------------------|
| `seedDemoAgents` | Acceptable for dev/demo if startup runs in those environments only. | Add explicit `ENABLE_DEMO_SEED` (default off in prod) or move to one-off migration script; then remove from hot path. |
| Bypass env `ORCHESTRATION_AGENT_CREATE_BYPASS` | Dev/stage only; never default in prod. | Remove from production configs; keep violation logging while it exists. |

Permanent internals (swarm provision via orchestrator, core seed) have **no sunset**; they remain documented **trusted control-plane** paths.

## 6. What this doctrine does not decide (next work)

- **Uniform aptitude / customer-outcome semantics** across `single_agent_create` vs provision finalization — still path-dependent; align in a dedicated task.
- **Universal `storage.createAgent` wrapper** — optional future choke (reason code + run ref on every insert). v1 uses **explicit exceptions** (this doc) first.

## Related

- [`SOVEREIGN_OS_V1_SPEC.md`](./SOVEREIGN_OS_V1_SPEC.md)
- [`META_PROMPT_ENVELOPES.md`](./META_PROMPT_ENVELOPES.md) — step-bound prompts for spec / mapping / aptitude; not orchestration authority
- [`AGENT_SWARM_DEPLOYMENT_RUNBOOK.md`](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
