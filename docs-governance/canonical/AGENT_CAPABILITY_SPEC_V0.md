---
status: canonical
truth_domain: governance
enforced_by: local-agent-governance.mdc, agent-policy-registry.mdc
backed_by:
  schema: true
  service: partial
  route: false
last_verified: 2026-03-27
---

# Agent Capability Spec v0

## Document authority

For **this markdown specification** (prose + schema definition):

```yaml
authority:
  source_of_truth: docs-governance/canonical/AGENT_CAPABILITY_SPEC_V0.md
  derived_fields: []
```

Per-agent **executable** rows live under `registry-yaml/agent-capabilities/*.yaml`. Each file’s in-body `authority` block names itself as source for that agent class; DB `agents.structuredControls` and orchestration behavior are **derived** until a sync job exists.

## Purpose

Define agents as **execution units** with explicit capabilities, boundaries, contracts, and test hooks — extending existing storage and orchestration rather than replacing them.

v0 is **descriptive** for documentation, Cursor, and future validators; orchestration should consume these files before widening scope.

## Versioning policy (semver on `version:`)

| Bump | When |
|------|------|
| **patch** | Clarifications, comments, typo fixes, non-semantic YAML reordering |
| **minor** | Additive fields, new optional capabilities, new `derived_fields` mappings, new logical domains |
| **major** | Breaking contract changes (required fields removed/renamed, output format change, plane reassignment, default escalation behavior change) |

## Plane model and status

| Plane | Runtime | Spec focus |
|-------|---------|------------|
| `customer_facing_runtime` | Gemini (voice, website chat, assigned concierge) | Tools allowlist, operational mode, ARCH/DISC, site binding |
| `internal_worker_runtime` | Local LLM (`/api/local-agent`) | Boundaries, orchestration run, structured output |
| `background_scheduled` | Cron / workers | **Reserved — not authoritative in v0** |

```yaml
plane_status:
  customer_facing_runtime: active
  internal_worker_runtime: active
  background_scheduled: reserved_v1   # no v0 enforcement; do not assume coverage
```

## Logical domain vocabulary

Validators map **logical domains** to path globs / checks in code. Paths may move; domains stay stable.

| Domain id | Typical enforcement |
|-----------|---------------------|
| `server_plane` | `server/**` |
| `migrations_plane` | `migrations/**` |
| `scripts_plane` | `scripts/**` |
| `shared_library` | `shared/**` (excludes anchor file below if split) |
| `schema_anchor` | `shared/schema.ts` |
| `client_source` | `client/src/**` |
| `ui_core` | `client/src/ui-core/**` |
| `client_pages` | `client/src/pages/**` |
| `client_components` | `client/src/components/**` |
| `voice_runtime` | Sovereign voice lockdown list (see `.cursor/rules/sovereign-voice-lockdown.mdc`) |
| `customer_channel` | Direct user WebSocket / SSE from local agent (always forbidden) |

## v0 schema (YAML shape)

Every agent capability file SHOULD include the blocks below. **Omit cheating:** if a row needs a one-off exception, bump **minor** and document in `authority.derived_fields` or `exceptions` (v0.2+).

```yaml
spec: agent_capability_v0
id: example_agent                     # maps to agents.roleType or template id
version: "0.1.0"
display_name: Example Agent
plane: internal_worker_runtime

authority:
  source_of_truth: registry-yaml/agent-capabilities/example_agent.v0.yaml
  derived_fields: []                    # e.g. ["agents.structuredControls.jurisdiction"] when synced from DB

plane_status:                           # optional override; default from spec doc
  customer_facing_runtime: active
  internal_worker_runtime: active
  background_scheduled: reserved_v1

capabilities:
  - id: capability_key
    description: Human-readable scope
    scope:
      paths:                            # glob patterns this capability may touch
        - client/src/ui-core/**
      actions:                          # intent for pre-flight (validator maps to git diff / task payload)
        - create
        - modify
        - refactor
        - read

boundaries:
  # Precedence: forbidden_paths and forbidden_logical_domains win over allowed_* and capability.scope.paths
  # Logical: stable product concepts (paths derived in validator / jurisdiction service)
  forbidden_logical_domains:
    - voice_runtime
    - migrations_plane
  # Physical: explicit globs or files (hard stops, fast checks)
  forbidden_paths:
    - server/geminiVoice.ts
    - client/src/services/voice/**
  # Optional allow list (internal workers). If absent, infer only from capability.scope.paths (discouraged — prefer explicit).
  allowed_logical_domains: []
  allowed_paths: []

contracts:
  input:
    taskType: enum [governance, code, agent, ui]
    payload_schema_ref: null            # optional URI or path to zod/json schema
  output:
    format: local_agent_output
    parse_required: true

execution:
  deterministic_output_required: true  # internal workers: no “creative” unstructured primary payload
  structured_output_only: true

orchestration:
  requires_run_row: true
  violation_types:
    - missing_orchestration_run
    - unauthorized_domain_access
    - local_model_voice_path_attempt

escalation:
  on_boundary_hit: fail_closed          # enum: fail_closed | queue_for_review (v1)
  handoff_to:
    - governance_review

tests:
  npm_scripts:
    - test:local-agent-aptitude
  scenarios: []

scoring:
  violation_registry: agent_orchestration_runs.violation_type
  readiness_hooks:
    - integration:readiness

governance:
  policy_refs:
    - docs-governance/canonical/AGENT_POLICY_REGISTRY.md
    - docs-governance/canonical/SAFE_MODE_CONTRACT.md
  review_required: true
```

## Mapping to existing fields

| Spec field | Storage / code |
|------------|----------------|
| `plane` | `agents.aiModelProvider` (`local` vs remote) + product rules |
| `boundaries.*` | `agents.structuredControls` — migrate toward logical+path split |
| `orchestration` | `server/services/agentOrchestration.ts`, `agent_orchestration_runs` |
| `contracts.output` | Local agent JSON schema in `local-agent-governance.mdc` |
| `execution.*` | Enforced by orchestration parser + route (fail `blocked` if non-JSON output) |
| `escalation.*` | Process: governance-review skill; runtime: fail_closed = block run |
| `tests.npm_scripts` | `package.json` scripts |

## Exemplars (no exceptions)

Canonical examples — if an agent class cannot be expressed here, the spec must change:

- `registry-yaml/agent-capabilities/ui_agent.v0.yaml`
- `registry-yaml/agent-capabilities/coding_agent.v0.yaml`

## Related

- `REGISTRY_AUTHORITY_CHARTER.md`
- `.cursor/rules/local-agent-governance.mdc`
- `GOVERNANCE_EXECUTION_PLAN_V1.md`
