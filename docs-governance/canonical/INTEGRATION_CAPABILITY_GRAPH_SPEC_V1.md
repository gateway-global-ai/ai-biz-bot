---
status: canonical
truth_domain: governance
enforced_by: view-and-action-registry.mdc, modular-routing.mdc, REGISTRY_AUTHORITY_CHARTER.md
backed_by:
  schema: partial
  service: partial
  route: false
last_verified: 2026-03-30
spec_id: integration_capability_graph
spec_version: "1.0.0"
---

# Integration Capability Graph Spec v1

## Document authority

Machine-readable rows that implement this spec live under `registry-yaml/integration-capabilities/`, `registry-yaml/integration-entities/`, and `registry-yaml/integration-adapters/` (paths are normative once those directories exist; until then, this document is the **sole** normative definition of the graph).

```yaml
authority:
  source_of_truth: docs-governance/canonical/INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md
  spec_version: "1.0.0"
  derived_artifacts:
    - registry-yaml/integration-entities/*.yaml
    - registry-yaml/integration-endpoints/*.yaml
    - registry-yaml/integration-capabilities/*.yaml
    - registry-yaml/integration-adapters/*.yaml
    - registry-yaml/integration-capability-sets.yaml
    - server/config/geminiToolDeclarations.ts   # tool names/schemas only; subordinate to TOOL_DECLARATIONS charter row
```

**Normative language:** `MUST`, `MUST NOT`, `SHALL`, `SHALL NOT`, `MAY` are interpreted as in RFC 2119.

**Non-goals (v1):** This spec does not define UI, pricing, or vendor SDK selection. It does not replace [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md); it **extends** the integration plane under that charter.

---

## 1. Scope

v1 defines:

1. The **canonical entity schema** (platform-owned semantic objects).
2. **Anchor detection rules** (business keys extracted from specs and traffic).
3. The **endpoint normalization shape** (internal representation of vendor HTTP operations).
4. **Capability derivation rules** (how normalized endpoints become or support capabilities).
5. **Adapter generation outputs** (required artifacts from any codegen or hand-authored adapter).
6. **Confidence scoring** (mandatory labels on graph nodes and edges).
7. **Unsupported and uncertain route handling** (runtime and registry obligations).
8. **Deployability validation** (gates before an adapter is `deployable`).

**Platform rule:** Customer-facing agents MUST invoke **capabilities** (via declared Gemini tool names), not raw vendor endpoints. Raw endpoints exist only in the integration graph and adapter implementation.

---

## 2. Canonical entity schema

A **canonical entity** is a platform-defined semantic type. Vendor types map to canonical entities with explicit fidelity metadata.

### 2.1 Required fields (canonical entity record)

Every canonical entity MUST be representable as a record satisfying:

| Field | Type | Constraints |
|-------|------|---------------|
| `canonical_entity_id` | string | `^[a-z][a-z0-9_]{1,63}$`; stable across releases |
| `spec_version` | string | Semver string; bumped per §10 |
| `display_name` | string | Non-empty; human-readable |
| `description` | string | Non-empty; states intended business meaning |
| `parent_entity_id` | string \| null | If set, MUST reference another `canonical_entity_id` (acyclic hierarchy) |
| `identity_anchors` | string[] | List of `anchor_id` values that MAY identify this entity (subset of registered anchors) |
| `vendor_mappings` | object[] | See §2.2; MUST be non-empty for any `production` integration |
| `unsupported_claims` | string[] | Claim classes the entity MUST NOT imply without mapping |
| `confidence_aggregate` | enum | One of `certain` \| `high` \| `medium` \| `low` \| `unknown` (see §7) |

### 2.2 Vendor mapping entry (required shape)

Each element of `vendor_mappings` MUST contain:

| Field | Type | Constraints |
|-------|------|---------------|
| `vendor_id` | string | Stable vendor slug (e.g. `cloudbeds`, `accu_lynx`) |
| `vendor_object_name` | string | Non-empty; name as used in vendor spec or SDK |
| `field_mappings` | object[] | See §2.3 |
| `equivalence` | enum | `exact` \| `approximate` \| `lossy` \| `unknown` |
| `nuance_notes` | string | MUST document semantic gaps when `equivalence` is not `exact` |

### 2.3 Field mapping entry

Each `field_mappings` element MUST contain:

| Field | Type | Constraints |
|-------|------|---------------|
| `canonical_field_id` | string | `^[a-z][a-z0-9_]{1,63}$` |
| `vendor_field_path` | string | Dot-path or JSON Pointer to vendor field |
| `direction` | enum | `read` \| `write` \| `both` |
| `transform` | enum | `identity` \| `coerce` \| `enum_map` \| `custom` |
| `transform_ref` | string \| null | MUST be non-null if `transform` is `enum_map` or `custom` |
| `confidence` | enum | Per §7 |

---

## 3. Anchor detection rules

An **anchor** is a recurring business identifier used to correlate operations across the graph.

### 3.1 Anchor record (required shape)

| Field | Type | Constraints |
|-------|------|---------------|
| `anchor_id` | string | `^[a-z][a-z0-9_]{1,63}$` |
| `canonical_entity_id` | string | MUST reference a defined canonical entity |
| `detection_sources` | enum[] | Non-empty subset of `openapi_param` \| `openapi_property` \| `path_segment` \| `header` \| `sdk_field` \| `traffic_observed` \| `manual` |
| `patterns` | object[] | See §3.2 |
| `lifecycle` | object | See §3.3 |
| `confidence` | enum | Per §7 |

### 3.2 Pattern rules

Each `patterns` entry MUST specify at least one of:

- `name_regex`: POSIX-style regex applied to parameter/property names after normalization (lowercase, strip vendor prefix tokens defined in adapter policy).
- `path_template_token`: Named path token (e.g. `{reservationId}`) tied to `anchor_id`.

**Detection rule D1:** A name MUST be promoted to a candidate anchor if **both** hold:

1. It matches `name_regex` OR appears as a `path_template_token` in ≥2 distinct normalized endpoints; and  
2. It appears in at least one **response** schema and one **request** location (parameter or body), OR it is the subject of a `GET` by-id path template.

**Detection rule D2:** A candidate anchor MUST NOT be promoted to `registered` status until `lifecycle` (§3.3) is complete for all endpoints that reference it in the current vendor slice.

**Detection rule D3:** If two candidate anchors are correlated (same type, co-occur in ≥60% of shared operations in the analyzed slice), they MUST be merged to a single `anchor_id` or explicitly marked `distinct_with_correlation` in `nuance_notes` at the capability level.

### 3.3 Lifecycle object (required keys)

| Key | Type | Meaning |
|-----|------|---------|
| `creates` | string[] | Normalized `endpoint_id`s that MAY create this anchor’s value |
| `reads` | string[] | Normalized `endpoint_id`s that require it as input or return it as primary identity |
| `updates` | string[] | Mutating endpoints that target the anchored resource |
| `deletes` | string[] | Archive/delete endpoints |
| `lists` | string[] | Collection endpoints where this anchor may appear as a member field |

Arrays MUST be exhaustive for the **declared vendor slice** (the set of endpoints under active integration). Unknown endpoints MUST be listed under `unsupported` (§8), not omitted silently.

---

## 4. Endpoint normalization shape

Every vendor HTTP operation MUST be normalized to an **endpoint record** with exactly the following top-level fields:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `endpoint_id` | string | yes | Stable: `sha256(vendor_id\|method\|path_template)[0:16]` or vendor-provided `operationId` if globally unique within vendor slice; MUST be documented in adapter |
| `spec_version` | string | yes | Semver of this normalization schema (mirror `INTEGRATION_CAPABILITY_GRAPH_SPEC_V1` minor/patch) |
| `vendor_id` | string | yes | |
| `source_tier` | enum | yes | `openapi` \| `postman` \| `graphql` \| `sdk` \| `html_docs` \| `traffic` \| `manual` |
| `method` | enum | yes | HTTP method in uppercase |
| `path_template` | string | yes | MUST preserve `{param}` tokens; MUST NOT contain literal host |
| `operation_name` | string | yes | Human or vendor label |
| `security_requirements` | object[] | yes | Each: `{ scheme_id, scopes[] }`; MAY be empty only if explicitly `none` with justification in `stability_notes` |
| `path_parameters` | object[] | yes | `{ name, schema_ref, required, anchor_id \| null }` |
| `query_parameters` | object[] | yes | Same shape as path parameters |
| `request_body` | object \| null | yes | If present: `{ content_types[], schema_ref, required }` |
| `responses` | object | yes | Keys: status code strings; values: `{ schema_ref, headers_ref \| null }` |
| `pagination_mode` | enum | yes | `none` \| `offset` \| `cursor` \| `link_header` \| `vendor_token` \| `unknown` |
| `rate_limit_class` | enum | yes | `none` \| `standard` \| `strict` \| `burst` \| `unknown` |
| `idempotency` | enum | yes | `supported` \| `unsupported` \| `unknown` |
| `side_effect_level` | enum | yes | `none` \| `read` \| `write_internal` \| `write_customer_visible` \| `financial` \| `unknown` |
| `entity_anchors` | string[] | yes | Anchor ids referenced; MAY be empty |
| `creates_anchors` | string[] | yes | Anchors the response MAY first introduce |
| `consumes_anchors` | string[] | yes | Anchors required to succeed |
| `related_capability_ids` | string[] | yes | Capabilities that MAY use this endpoint; empty = unassigned |
| `stability_score` | number | yes | 0.0–1.0; see §7.2 |
| `documentation_source` | string | yes | URI or repo path |
| `adapter_status` | enum | yes | `unmapped` \| `draft` \| `validated` \| `deployable` \| `deprecated` |
| `stability_notes` | string | no | MUST be present if `stability_score` < 0.7 or `adapter_status` is `draft` |

**Normalization rule N1:** Field names in parameters and JSON bodies MUST be recorded in **vendor-native** form in `path_parameters` / `request_body`; canonical names appear only in entity field mappings.

**Normalization rule N2:** If pagination is `unknown`, the endpoint MUST NOT be referenced by any `deployable` capability without a manual `pagination_override` object attached to the capability (see §5.3).

---

## 5. Capability derivation rules

A **capability** is the smallest unit of integration exposed to orchestration and (when allowed) to customer-facing tools.

### 5.0 Primary execution surface, discovery, and multi-API vendors

Three concepts MUST stay distinct:

| Concept | Meaning | Typical artifacts |
|--------|---------|-------------------|
| **Discovery authority** | What helps engineers understand the vendor’s object model and fields | Vendor OpenAPI, **GraphQL schema / introspection**, portal “try it” consoles |
| **Execution authority** | What contract backs a **shipped** runtime capability | Normalized **endpoint** rows (`source_tier`, e.g. `openapi` or `graphql`) + adapter manifests tied to `endpoint_flow` |
| **Canonical truth** | What the platform means operationally | Canonical entities, anchors, and capability rows in `registry-yaml/integration-*` — **not** the vendor surface itself |

**GraphQL vs REST:** GraphQL is a **discovery-rich** and optionally **execution** surface (nested queries, introspection). REST/OpenAPI is usually a **contract-stable operation** surface for path-oriented calls. The same vendor MAY offer both; they MUST be governed as **separate source tiers** per [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md) **D4**.

**Primary-source discipline (normative):**

1. Each capability MUST have **one primary** fulfillment API style in practice (the adapter and `endpoint_flow` MUST reflect it). Documentation in `description` / adapter manifest MUST state the primary `source_tier` until first-class registry fields subsume it.
2. **Do not** mix REST and GraphQL in one capability unless **INTEGRATION_GRAPH_DISCIPLINE D4** mixed-source exception criteria are met and documented.
3. GraphQL-specific controls (query depth, field allowlists, persisted-query or allowlisted operation shapes, rate policy) MUST be defined **before** production execution—discovery-only ingestion of a GraphQL schema does not imply runtime approval.

**Modeling preference:** Prefer **separate integration entity bundles** (e.g. distinct YAML namespaces or entity bundles per surface) when a vendor ships both REST and GraphQL, rather than implicit dual-home in one bundle—unless the graph explicitly maps both under reviewed `vendor_mappings`.

### 5.1 Capability record (required fields)

| Field | Type | Constraints |
|-------|------|-------------|
| `capability_id` | string | `^[a-z][a-z0-9_]{1,63}$` |
| `spec_version` | string | Semver |
| `vendor_id` | string | |
| `title` | string | Non-empty |
| `description` | string | Non-empty; MUST state user-visible effects |
| `mutation_level` | enum | `read` \| `write` \| `delete` \| `mixed` |
| `required_anchors` | string[] | MUST be subset of registered anchors |
| `optional_anchors` | string[] | |
| `required_inputs` | object[] | `{ name, type_ref, source: body\|query\|path\|header }` |
| `optional_inputs` | object[] | Same shape |
| `returns` | object[] | `{ name, type_ref }` |
| `endpoint_flow` | object | See §5.2 |
| `side_effect_level` | enum | Same enum as endpoint; MUST be ≥ max of constituent endpoints (ordering: `none` < `read` < `write_internal` < `write_customer_visible` < `financial`) |
| `tool_name` | string \| null | If customer-visible: MUST equal a key in `server/config/geminiToolDeclarations.ts`; if internal-only: null |
| `operational_mode_allowlist` | string[] \| null | If non-null, MUST be subset of mode ids in `server/config/operationalModes.ts` |
| `confidence` | enum | Per §7 |
| `fallback` | object | See §8.2 |

### 5.2 Endpoint flow object

`endpoint_flow` MUST contain:

| Key | Type | Constraints |
|-----|------|-------------|
| `steps` | object[] | Ordered; each step `{ endpoint_id, purpose: read\|create\|update\|delete\|list\|other, on_failure }` |
| `parallel_groups` | number[][] | Optional indices of `steps` that MAY run in parallel |
| `completion_predicate` | string | Expression language TBD in patch; until defined, MUST be plain-language predicate reviewed in deploy gate |

**Derivation rule C1:** A capability MUST NOT be created from a single normalized endpoint unless that endpoint’s `side_effect_level` is `read` OR the capability’s `mutation_level` explicitly matches the endpoint.

**Derivation rule C2:** Multi-step capabilities MUST declare an ordered `steps` list; speculative ordering MUST set `confidence` to at most `medium`.

**Derivation rule C3:** Any capability with `tool_name` set MUST have `mutation_level`, `required_anchors`, and `returns` sufficient to generate a JSON Schema for the tool declaration without vendor leakage (no raw URL templates in tool parameter descriptions unless required for disambiguation—prefer abstract field names).

### 5.3 Pagination override (when `pagination_mode` is `unknown`)

```yaml
pagination_override:
  strategy: cursor | offset | vendor_token | manual_loop
  documented_by: string   # URI to vendor doc or internal runbook
  max_pages: positive integer
  safety_cap: positive integer  # hard stop for agent/runtime loops
```

If absent and pagination is `unknown`, `adapter_status` for all attached endpoints MUST remain `unmapped` or `draft`.

---

## 6. Adapter generation outputs

Whether adapters are hand-written or generated, the following outputs MUST exist on disk (or in CI artifacts) before `adapter_status: deployable`:

| Output | Description | MUST contain |
|--------|-------------|--------------|
| `adapter_manifest` | YAML/JSON binding capabilities to code | `capability_id`, implementation module path, `credential_anchor` (e.g. schema anchor name), `endpoint_id` list |
| `request_templates` | Per-step HTTP construction | Resolved path, method, header rules, body schema ref |
| `response_normalizers` | Map vendor JSON to canonical return shapes | Field-level mapping refs to §2.3 |
| `error_taxonomy` | Vendor error → platform class | Stable `error_class_id` strings; MUST include `rate_limit`, `auth`, `not_found`, `validation`, `unknown` |
| `test_scaffold` | Automated tests | At least one happy path and one failure path per `capability_id` marked `deployable` |
| `idempotency_notes` | Markdown or YAML | Explicit statement per mutating step |

Generated code MUST NOT introduce Gemini tool names not present in `geminiToolDeclarations.ts`. Codegen MUST emit a manifest diff for CI.

---

## 7. Confidence scoring

### 7.1 Node-level confidence enum

Every canonical entity mapping (§2.3), anchor (§3.1), endpoint (`stability_score` + label), and capability (§5.1) MUST carry:

`certain` \| `high` \| `medium` \| `low` \| `unknown`

**Assignment rules:**

| Label | Conditions (ALL required unless noted) |
|-------|--------------------------------------|
| `certain` | Vendor OpenAPI documents parameter/response; integration tests pass; field mapping `equivalence` is `exact` |
| `high` | OpenAPI or SDK match; tests pass; `equivalence` is `exact` or `approximate` with documented nuance |
| `medium` | Inferred from naming/recurrence (D1) OR partial docs; tests pass |
| `low` | Inferred only OR tests absent |
| `unknown` | Insufficient evidence |

### 7.2 Endpoint `stability_score` (0.0–1.0)

`stability_score` MUST be computed as documented in the adapter repo with this floor:

- Base 1.0 if `source_tier` is `openapi` and responses have schema refs.  
- −0.2 if `pagination_mode` is `unknown`.  
- −0.2 if `idempotency` is `unknown` and method is not GET/HEAD.  
- −0.3 if `source_tier` is `traffic` or `html_docs` without corroborating `openapi` or `sdk`.

Scores below **0.7** MUST set capability `confidence` to at most `medium` if linked.

---

## 8. Unsupported and uncertain route handling

### 8.1 Unsupported endpoint

An endpoint is **unsupported** if it is omitted from `endpoint_flow` and explicitly listed in:

```yaml
unsupported_endpoints:
  - endpoint_id: string
    reason: no_business_need | policy_forbidden | insufficient_spec | duplicate_of
    duplicate_of_id: string | null
```

**Rule U1:** Customer-facing runtimes MUST NOT call unsupported endpoints. Internal batch jobs MAY call them only if a separate `internal_only` capability exists with distinct `tool_name: null`.

### 8.2 Uncertain capability

If `confidence` is `low` or `unknown`, the capability MUST set:

```yaml
fallback:
  mode: refuse | degrade | human_handoff | retry_bounded
  user_visible_message_ref: string   # key into governed copy registry or static id
  max_retries: non-negative integer
```

**Rule U2:** `tool_name` MUST NOT be set for `unknown` confidence capabilities.

**Rule U3:** For `low` confidence, `tool_name` MAY be set only if `operational_mode_allowlist` restricts to non-customer-facing modes OR site-level feature flag `integration_beta` is documented in the adapter manifest (implementation-specific flag name MUST appear in `adapter_manifest`).

---

## 9. Deployability validation (adapter deploy gates)

An adapter (or capability backed by an adapter) is **deployable** only if ALL gates pass:

| Gate ID | Requirement |
|---------|-------------|
| G1 | Every `endpoint_id` in `endpoint_flow.steps` exists in the normalized endpoint table for the same `vendor_id` and `spec_version`. |
| G2 | Every `required_anchors` has `lifecycle.reads` or `lists` non-empty for lookup paths used in the flow. |
| G3 | `tool_name` is null OR the name exists in `geminiToolDeclarations.ts` with a JSON Schema that is a superset of `required_inputs` (no required tool arg without mapping). |
| G4 | If `tool_name` is non-null, `tool_name` appears in `getToolsAllowedForMode` for every mode listed in `operational_mode_allowlist` (if non-null); if `operational_mode_allowlist` is null, MUST appear in at least one production mode used by assigned agents. |
| G5 | `mutation_level` is not `read` implies automated tests cover success + auth failure + validation failure. |
| G6 | `error_taxonomy` maps every vendor HTTP status and documented error body pattern used in implementation. |
| G7 | `credential_anchor` in `adapter_manifest` references an approved schema anchor per [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md) (or explicit governance exception document with date). |
| G8 | Session-bound tools comply with [`SESSION_IDENTITY_BINDING_SPEC.md`](./SESSION_IDENTITY_BINDING_SPEC.md) if they accept PII-bearing parameters. |
| G9 | No `deployable` capability references an endpoint with `adapter_status` not in (`validated`, `deployable`). |

If any gate fails, `adapter_status` MUST remain `draft` or `validated` (never `deployable`).

---

## 10. Versioning

| Bump | When |
|------|------|
| **patch** | Clarifications, typo fixes, non-semantic constraints |
| **minor** | New optional fields, new enum values, new gate with default pass for existing adapters |
| **major** | Renamed required fields, removed gates, changed meaning of `confidence` or `side_effect_level` |

---

## Related

- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md) — runtime vs graph, docs vs YAML, set/mode anti-drift; **D4** REST vs GraphQL source tiers.
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md) — charter rows for tool and skill authority.
- [`AGENT_DEPLOYMENT_CONTRACT_V1.md`](./AGENT_DEPLOYMENT_CONTRACT_V1.md) — deployed agent tool allowlists.
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md) — heavy work off hot paths.
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) — no raw endpoint lists in compiled prompts.

---

## Archive criteria (for reviewers and agents)

Stop extending this spec and archive the editing session if the change set drifts into: generic integration advice without normative rules; narrative adapter guidance without required outputs; product roadmap; or implementation code **without** prior schema/policy updates to this document.
