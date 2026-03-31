---
status: canonical
truth_domain: governance
enforced_by: integration-graph-discipline.mdc, scripts/validate-integration-registry.ts
backed_by:
  schema: partial
  registry: partial
last_verified: 2026-03-30
spec_id: cloudbeds_graphql_discovery
spec_version: "1.0.0"
---

# Cloudbeds GraphQL — Discovery Governance v1

## Authority

```yaml
authority:
  source_of_truth: docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md
  discovery_schema_index: docs/knowledge-base/cloudbeds/graphql/discovery-schema.graphql
  illustrative_sdl: docs/knowledge-base/cloudbeds/graphql/discovery-schema.illustrative.graphql
  introspection_artifact: docs/knowledge-base/cloudbeds/graphql/vendor-introspection.json (commit after ingest)
  introspection_provenance: docs/knowledge-base/cloudbeds/graphql/vendor-introspection.provenance.json (required with ingest; no secrets)
  mapping_review: docs/knowledge-base/cloudbeds/graphql/MAPPING_REVIEW.md
  pii_review: docs/knowledge-base/cloudbeds/graphql/PII_AND_SENSITIVITY_REVIEW.md
  schema_ingest: docs/knowledge-base/cloudbeds/graphql/SCHEMA_INGEST.md
  schema_drift: docs/knowledge-base/cloudbeds/graphql/SCHEMA_DRIFT.md
  promotion_readiness: docs/knowledge-base/cloudbeds/graphql/EXECUTION_PROMOTION_READINESS.md
  onboarding: docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md
  entity_bundle: registry-yaml/integration-entities/cloudbeds_hospitality_graphql.v1.yaml
  capability_bundle: registry-yaml/integration-capabilities/cloudbeds_graphql_discovery.v1.yaml
  capability_set: cloudbeds_graphql_discovery_registry (integration-capability-sets.yaml)
  vendor_metadata: registry-yaml/integration-vendor-metadata/cloudbeds_graphql.v1.yaml
```

Normative language: **MUST** / **MUST NOT** (RFC 2119).

## Tenant configuration (programmatic source of truth)

GraphQL discovery settings **MUST NOT** rely on ad-hoc secret-manager key names (e.g. mixed `BWS_*` vs `CLOUDBEDS_*` prefixes) or project-specific Doppler paths as the authority for automation. Those are operator conveniences only.

**Source of truth:** [`site_pms_integrations`](../../shared/schema.ts) for the tenant, same as other Cloudbeds integration posture ([`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](./INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md)).

| Storage | Content |
|---------|---------|
| `site_pms_integrations.config` | Stable, versioned JSON for **non-secret** GraphQL discovery fields (see shape below). |
| `site_pms_integrations.access_token`, `api_key`, etc. | **Secrets** — same columns and broker rules as REST; do not duplicate tokens under new env var names for GraphQL. |

**`config` shape (v1):** key **`cloudbeds_graphql_discovery_v1`** (object):

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `http_url` | string (https) | yes when GraphQL discovery is used | Machine GraphQL HTTP endpoint (`POST` JSON), **not** the HTML docs/playground URL. |
| `onboarding` | object | optional | Governed onboarding state and validation metadata — see [`CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md`](./CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md). |

Ingest scripts and future automation **SHOULD** read `http_url` from this config (by `site_config_id`) and obtain auth via the existing credential broker / row tokens — not from a parallel env naming scheme.

## Phase 1 — Discovery only (current)

**GraphQL is discovery authority in this phase, not execution authority.**

1. **MUST NOT** wire Cloudbeds GraphQL into production HTTP execution paths, Gemini tools, or customer-facing runtimes.
2. **MUST NOT** add `tool_name` to discovery capabilities or place them in model-facing capability sets with non-empty `resolved_tool_names`.
3. **MUST NOT** fulfill shipped hospitality capabilities from GraphQL without an explicit **D4 / §5.0** promotion review ([`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md), [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md)).
4. **MUST NOT** implement mixed-source REST + GraphQL fulfillment for a single capability without a written exception (field precedence, caching, PII boundary, tests).

**Artifact roles**

| Artifact | Role |
|----------|------|
| `discovery-schema.graphql` | **Authority index** (minimal SDL); registry checksum target |
| `discovery-schema.illustrative.graphql` | Non-checksum illustrative types for human mapping until `vendor-introspection.json` exists |
| `vendor-introspection.json` | **Primary machine schema authority** once ingested ([`SCHEMA_INGEST.md`](../../docs/knowledge-base/cloudbeds/graphql/SCHEMA_INGEST.md)); then refresh per [`SCHEMA_DRIFT.md`](../../docs/knowledge-base/cloudbeds/graphql/SCHEMA_DRIFT.md) |
| `vendor-introspection.provenance.json` | **Sidecar:** endpoint URL, fetch time, auth *class* (not secrets), script version, error/partial flags — required with every committed introspection snapshot |
| `MAPPING_REVIEW.md` / `PII_AND_SENSITIVITY_REVIEW.md` | Formal mapping and sensitivity passes |
| `EXECUTION_PROMOTION_READINESS.md` | Gate before any execution pilot |
| `cloudbeds_hospitality_graphql.v1.yaml` | GraphQL **type** → canonical alignment (`cb_gql_*` rows; targets `property`, `reservation`, … in REST bundle) |
| `cloudbeds_graphql_discovery.v1.yaml` | Discovery capability rows (`cb_gql_*_inspect`); `endpoint_flow.steps` empty; `tool_name: null` |
| `cloudbeds_graphql_discovery_registry` set | Non-model-facing bundle for traceability; no tools |

## Phase B — Real schema authority + reviews (current)

1. **MUST** obtain `vendor-introspection.json` **and** `vendor-introspection.provenance.json` via [`SCHEMA_INGEST.md`](../../docs/knowledge-base/cloudbeds/graphql/SCHEMA_INGEST.md) (machine GraphQL URL + OAuth/token — not the HTML docs page).
2. **MUST** complete [`MAPPING_REVIEW.md`](../../docs/knowledge-base/cloudbeds/graphql/MAPPING_REVIEW.md) and [`PII_AND_SENSITIVITY_REVIEW.md`](../../docs/knowledge-base/cloudbeds/graphql/PII_AND_SENSITIVITY_REVIEW.md) against committed introspection.
3. **MUST** treat [`EXECUTION_PROMOTION_READINESS.md`](../../docs/knowledge-base/cloudbeds/graphql/EXECUTION_PROMOTION_READINESS.md) as the promotion gate memo until verdict changes from **not ready** — a real introspection snapshot **does not** imply execution readiness.

REST PMS OpenAPI remains the **execution anchor** for live Cloudbeds capabilities (`vendor_id: cloudbeds`). See [`registry-yaml/integration-vendor-metadata/cloudbeds.v1.yaml`](../../registry-yaml/integration-vendor-metadata/cloudbeds.v1.yaml).

## Promotion gate — execution lane (future)

GraphQL **MAY** graduate to an execution lane only when **all** are satisfied:

1. **Schema authority** — Vendor SDL or normalized introspection artifact is committed; `expected_sha256` updated in vendor metadata.
2. **Controls** — Auth, rate limits, caching, **PII classification**, **query-depth / cardinality limits**, and field allowlists are documented and implemented.
3. **Adapter** — Separate adapter manifest (`vendor_id: cloudbeds_graphql` or distinct module) with `adapter_status` progression per [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md).
4. **Capability** — Exactly **one** pilot capability (read-only, low blast radius); no broad nested search as first pilot.
5. **Approval** — Integration / security sign-off recorded (ticket or governance PR reference).

Until then, discovery outputs (mapping notes, PII review, relationship diff) are **engineering artifacts** only.

## Pilot candidates (non-normative)

Reasonable first execution pilots after promotion: reservation detail read, guest–reservation relationship read, room-type metadata read. **Avoid** first: writes, financial/folio-heavy mutations, unconstrained deep queries.

## Related

- [`CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md`](./CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md) — onboarding agent, state machine, SMS vs secure handoff  
- [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](./INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md) — tenant credentials; broker  
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md) — **D4** REST vs GraphQL tiers  
- [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md) — §5.0 discovery vs execution  
- [Cloudbeds GraphQL developer reference](https://developers.cloudbeds.com/graphql) (external)  
- [Cloudbeds PMS REST reference](https://developers.cloudbeds.com/reference/about-pms-api) (external)
