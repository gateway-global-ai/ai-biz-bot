# Work log — agent orchestration (SOVEREIGN_OS_V1)

## Priority stack (execute in order)

1. Block direct agent creation outside orchestrator.
2. Define deterministic orchestration run terminal states (`completed` | `blocked` | `failed` | `deferred`).
3. Add minimal aptitude gate to deploy transition (`aptitude_status`, `required_for_deploy`).
4. Add minimal customer outcome gate to completion transition (`clarity_score`, `configuration_completeness`, `fallback_defined`, `first_value_path_present`).
5. Persist orchestration violations structurally (table or event stream + `orchestration_run_id`, severity, type, actor/route/source).
6. Add run replay / inspection view **later** (after last bypass is closed).

## What not to do until last bypass is closed

- Full retry queues  
- Rich owner assignment logic  
- Advanced scoring  
- More skills / more routes (ornamentation)

## v1 product line

A feature counts as **in v1** only if all three are true:

1. It runs through the orchestrator.  
2. It writes an orchestration run.  
3. It can be blocked by governance.

## Rolling gaps / resolutions

| Date | Owner | Gap | Resolution |
|------|-------|-----|------------|
| 2026-03-25 | platform | POST /api/agents bypass | **P0** — gate per priority stack #1 |
| 2026-03-25 | platform | Run status semantics | **P0** — deterministic terminals per stack #2 |
| 2026-03-25 | platform | Aptitude runtime gate | **P1** — minimal gate per stack #3 |
| 2026-03-25 | platform | Customer outcome on run | **P1** — minimal fields per stack #4 |
| 2026-03-25 | platform | Violations console-only | **P1** — persist per stack #5 |
| 2026-03-25 | platform | Session ↔ site for run mint / agent create | **P0** — `assertSiteAccessForSession` on `POST /api/intelligence/orchestration-runs` and `POST /api/agents` (when `siteConfigId` present); violations on deny. See `SOVEREIGN_OS_V1_SPEC.md` two-layer section. |
| 2026-03-25 | platform | Provision vs agent create asymmetry | **P0** — same `assertSiteAccessForSession` on `POST /api/intelligence/provision`; violation `detail` includes `orchestrationRunId` when known (else `null`) for cross-tenant debugging. |
| 2026-03-25 | platform | Internal `createAgent` false unity | **P0** — canonical [`INTERNAL_AGENT_CREATION_DOCTRINE.md`](../canonical/INTERNAL_AGENT_CREATION_DOCTRINE.md): allowed paths, reason codes (`INT_*`), audit fields, run required/optional/prohibited, sunset for demo seed. |
| 2026-03-25 | platform | Meta prompts vs mega prompts | **P1** — [`META_PROMPT_ENVELOPES.md`](../canonical/META_PROMPT_ENVELOPES.md): governance = authority, state machine = sequencing, meta prompt = bounded frame; registry [`state_meta_prompt_binding.yaml`](../../registry-yaml/state_meta_prompt_binding.yaml); v1 artifacts `META_*_v1` under `.system_design/meta_prompts/`. |
| 2026-03-25 | platform | Meta prompt execution contract | **P0** — Non-optional: bound state↔artifact before LLM; versioned registry only; mandatory log fields; hard block on missing inputs / state mismatch / invalid output; `deterministic_states_without_meta_prompt` for non-LLM steps. Implementation = `meta-prompt-runtime-wire` per [`META_PROMPT_RUNTIME_CONTRACT.md`](../canonical/META_PROMPT_RUNTIME_CONTRACT.md). |
| 2026-03-25 | platform | Meta-prompt wire rollout | **Next** — Resolver + multi-point telemetry (not post-only) + enforcement; integrate 1–2 control-plane sites; prove on `AGENT_SPEC_CREATION` / `SKILL_MAPPING` / `APTITUDE_TEST`; structured logs v1; scope frozen in orchestration_gate_hardening plan (no extra doctrine). |

Reference: [SOVEREIGN_OS_V1_SPEC.md](../canonical/SOVEREIGN_OS_V1_SPEC.md), [INTERNAL_AGENT_CREATION_DOCTRINE.md](../canonical/INTERNAL_AGENT_CREATION_DOCTRINE.md) (internal `createAgent` exceptions + audit), [orchestrator_contract.yaml](../../registry-yaml/orchestrator_contract.yaml), plan **§9** (orchestration governance glue).
