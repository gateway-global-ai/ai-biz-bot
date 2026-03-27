---
status: canonical
truth_domain: governance
implements: META_PROMPT_ENVELOPES.md (law → runtime)
backed_by:
  registry: registry-yaml/state_meta_prompt_binding.yaml
last_verified: 2026-03-25
---

# Meta prompt runtime contract (control plane)

This document specifies **resolver behavior**, **telemetry shape**, and **enforcement rules** so implementation can make [`META_PROMPT_ENVELOPES.md`](./META_PROMPT_ENVELOPES.md) **true at runtime** — not only declared in governance.

**Scope:** control-plane orchestration paths that invoke an LLM with a meta prompt. Not voice/chat customer execution unless explicitly opted in elsewhere.

---

## 1. Resolver behavior

### Inputs

- `stateId` — active workflow state (string, stable id aligned with `bindings` keys in [`state_meta_prompt_binding.yaml`](../../registry-yaml/state_meta_prompt_binding.yaml)).
- `registry` — parsed `state_meta_prompt_binding.yaml` (artifacts + bindings + `deterministic_states_without_meta_prompt`).

### Algorithm (normative)

1. **Classify state**
   - If `stateId` is in `deterministic_states_without_meta_prompt` → classification = **`deterministic`**.
   - Else if `bindings[stateId]` is set → classification = **`llm_bound`**.
   - Else → classification = **`unclassified`** (governance gap).

2. **Before any LLM call**
   - If classification is **`deterministic`**: **reject** — do not invoke meta-prompt execution or load a meta artifact for this state. If code attempts an LLM path anyway → **hard error** (implementation bug); log `META_RESOLVER_DETERMINISTIC_LLM_ATTEMPT`.
   - If classification is **`unclassified`**: **reject** — do not call the LLM; log `META_RESOLVER_UNBOUND_STATE` with `stateId`.
   - If classification is **`llm_bound`**: resolve `artifactId = bindings[stateId]`. If `artifactId` is missing from `artifacts` or `artifacts[artifactId].status !== active` → **reject**; log `META_RESOLVER_UNKNOWN_ARTIFACT`.

3. **Artifact path**
   - `path = artifacts[artifactId].path` (relative to repo root). Load file from disk or approved bundle; **no** alternate path, **no** inline override.

4. **Version**
   - `version` is encoded in `artifactId` suffix (`_v1`, `_v2`). Resolver **must** pass through `artifactId` unchanged to telemetry (not only a file path).

5. **Output**
   - Resolver returns either `{ ok: true, artifactId, path, classification: 'llm_bound' }` or `{ ok: false, code, message, classification }` for callers to block without calling the model.

### Summary table

| Situation | LLM allowed? |
|-----------|----------------|
| State in `deterministic_states_without_meta_prompt` | **No** |
| State not in bindings and not listed deterministic | **No** |
| State in bindings, artifact missing/inactive | **No** |
| State in bindings, artifact active | **Yes** (subject to input/output gates below) |

---

## 2. Telemetry / event schema

Every **meta-prompted** execution **must** produce structured telemetry at **decision boundaries**, not only after the model returns. **Post-only logging is insufficient** — you lose resolver/input-gate failures and pre-LLM proof of proceed.

**Minimum emission points (each may be a full record or a clearly linked pair `attemptId` — implementer’s choice, but no silent gaps):**

1. **After resolver** — including blocks (unbound state, unknown artifact, deterministic LLM attempt).  
2. **After input validation, before LLM** — when proceeding to call the model (`inputsPresent` / `inputsMissing` final for this attempt).  
3. **After output validation** — pass or fail (`outputSchemaValid`, `blocked`, failure codes).  
4. **On any failure path** — including mid-flight aborts.

**Omitting** telemetry for a shipped path **is forbidden**.

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | string | Constant: `meta_prompt_execution` |
| `occurredAt` | string (ISO-8601) | When the attempt completed or was blocked (UTC recommended). |
| `stateId` | string | Active workflow state. |
| `artifactId` | string \| null | Resolved meta prompt id (e.g. `META_AGENT_SPEC_CREATION_v1`); `null` if blocked before resolution. |
| `artifactVersion` | string \| null | Redundant extract from id (`v1`) or same as id for search; **must** match registry. |
| `orchestrationRunId` | string \| null | Link to `agent_orchestration_runs.id` when the step runs inside a run; `null` if not applicable. |
| `siteConfigId` | string \| null | When available for the control-plane context. |
| `inputsPresent` | string[] | Keys or validator ids of required inputs that were **present**. |
| `inputsMissing` | string[] | Keys or validator ids **missing** (empty if none). |
| `outputSchemaValid` | boolean \| null | `true` / `false` after validation; `null` if model never called. |
| `blocked` | boolean | `true` if execution did not succeed end-to-end. |
| `failureCode` | string \| null | Stable machine code (e.g. `META_INPUT_MISSING`, `META_OUTPUT_INVALID`, `META_RESOLVER_UNBOUND_STATE`). |
| `failureMessage` | string \| null | Short, non-PII explanation. |

### Optional but recommended

| Field | Type | Description |
|-------|------|-------------|
| `startedAt` | string (ISO-8601) | When LLM request started. |
| `modelInvocationMs` | number | Latency for observability (control plane only). |

### JSON example (blocked — invalid output)

```json
{
  "eventType": "meta_prompt_execution",
  "occurredAt": "2026-03-25T12:00:00.000Z",
  "startedAt": "2026-03-25T11:59:58.000Z",
  "stateId": "AGENT_SPEC_CREATION",
  "artifactId": "META_AGENT_SPEC_CREATION_v1",
  "artifactVersion": "v1",
  "orchestrationRunId": "550e8400-e29b-41d4-a716-446655440000",
  "siteConfigId": "sc_abc123",
  "inputsPresent": ["intent", "business_context", "persona"],
  "inputsMissing": [],
  "outputSchemaValid": false,
  "blocked": true,
  "failureCode": "META_OUTPUT_INVALID",
  "failureMessage": "Required field readiness_status missing"
}
```

### Sink

Implementations may write to:

- append-only **structured logs** (JSON lines) with searchable `artifactId` / `orchestrationRunId`, and/or  
- a **DB table** (future migration) keyed by `occurredAt` + `orchestrationRunId` + `stateId`, and/or  
- **`orchestration_violations`** or run row JSON when the failure is policy-tier.

Until a dedicated table exists, **structured JSON log** is acceptable **if** log aggregation can answer: “list all executions for `artifactId` X in the last 7 days.”

---

## 3. Enforcement / failure rules

### Hard block (do not call model)

- Resolver returned `ok: false`.
- Any **required input** missing (per artifact + step validator) **before** model call → `failureCode: META_INPUT_MISSING`, emit telemetry, **no** LLM.
- **State mismatch**: caller’s `stateId` does not match machine truth → `META_STATE_MISMATCH`, no LLM.

### Hard block (after model call)

- **Output shape invalid** (schema / Zod / JSON Schema failure) → **do not** persist downstream artifacts; `outputSchemaValid: false`, `blocked: true`, `failureCode: META_OUTPUT_INVALID`, emit telemetry.

### Deterministic state violation

- LLM or meta-prompt loader invoked for `stateId` in `deterministic_states_without_meta_prompt` → **block**, `failureCode: META_RESOLVER_DETERMINISTIC_LLM_ATTEMPT`, emit telemetry (artifactId may be `null`).

### No silent retry

- Retries **must** emit a **new** telemetry record (new `occurredAt` or explicit `attempt` field in a future schema revision). **No** silent overwrite of the prior failure record.

---

## Acceptance criteria (`meta-prompt-runtime-wire`)

Ship is complete when **all** of the following are true on **every** shipped meta-prompt path:

1. **LLM state without registry binding cannot execute** — unbound or unknown artifact → no model call; telemetry with appropriate `failureCode`.
2. **Deterministic state cannot invoke meta-prompt execution** — listed non-LLM states never load artifacts or call the model for meta execution; violation emits `META_RESOLVER_DETERMINISTIC_LLM_ATTEMPT` if attempted.
3. **Telemetry at decision boundaries** — records exist for resolver blocks, pre-LLM proceed (post–input gate), and post–output validation (see **§2 Minimum emission points**); **post-only** logging **fails** this criterion.
4. **Invalid output shape causes hard block and logged failure** — `META_OUTPUT_INVALID`, `blocked: true`, `outputSchemaValid: false`.
5. **Artifact id/version is retrievable from logs** (or DB) **for every shipped path** — queries by `artifactId` or `orchestrationRunId` return the record.
6. **Retries** emit a **new** record (or new `attemptId` linkage), never silent overwrite.

---

## Related

- [`META_PROMPT_ENVELOPES.md`](./META_PROMPT_ENVELOPES.md) — law and separation of concerns  
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)  
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)  
- [`WL-AGENT-ORCHESTRATION.md`](../worklogs/WL-AGENT-ORCHESTRATION.md)  
