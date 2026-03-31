# Cloudbeds GraphQL — schema drift workflow

## Artifacts

| File | Role |
|------|------|
| `vendor-introspection.json` | Primary machine schema authority (after first ingest). |
| `vendor-introspection.provenance.json` | Sidecar: endpoint, time, auth *class*, script version — explains snapshot context. |
| `discovery-schema.graphql` | Registry checksum anchor + minimal index (until checksum migrates). |
| `discovery-schema.illustrative.graphql` | Non-authoritative illustrations. |

## What counts as drift

| Kind | Examples | Typical cause |
|------|-----------|----------------|
| **Vendor evolution** | New types, new fields on existing types | Cloudbeds API release |
| **Endpoint change** | Different `endpoint_url` in provenance | Wrong URL fixed, environment promotion |
| **Auth scope** | Same endpoint, fewer/more types visible | Token scopes, property binding |
| **Script/query change** | `introspection_query_kind` or script version bump | Broader introspection query in repo |
| **Operational** | `partial_or_degraded` or `graphql_errors_present` | Transient vendor error, partial introspection |

Always compare **new provenance** to **previous commit** alongside JSON diff.

## Risk tiers (for diff triage)

| Tier | Signals | Review |
|------|---------|--------|
| **Low** | New enum value; new non-PII type; description-only changes | Integration owner ACK; update mapping doc if types are tracked. |
| **Medium** | New fields on `Guest`, `Reservation`, profile types; new optional query args | Integration owner + note in [`MAPPING_REVIEW.md`](./MAPPING_REVIEW.md). |
| **High** | New **Mutation** fields; new types named like payment/folio/charge/card; new root queries returning lists of PII | **Security + integration** review; update [`PII_AND_SENSITIVITY_REVIEW.md`](./PII_AND_SENSITIVITY_REVIEW.md); no execution promotion until resolved. |

## Refresh cadence

| Trigger | Action |
|---------|--------|
| **Quarterly** (minimum) | Re-run [`SCHEMA_INGEST.md`](./SCHEMA_INGEST.md); commit new JSON + provenance; diff. |
| **Vendor changelog** | Cloudbeds [changelog](https://developers.cloudbeds.com/changelog) — schedule ingest if GraphQL-relevant. |
| **Before execution pilot** | Mandatory fresh ingest + mapping/PII updates. |
| **Provenance endpoint or auth_mode change** | Treat as **medium** or higher until explained (scope/URL drift). |

## Diff review checklist

1. Save previous `vendor-introspection.json` (branch or `cp` to `.prev`).
2. Diff: `diff -u` or extract sorted type names with `jq` and diff those lists.
3. Compare `vendor-introspection.provenance.json` old vs new (endpoint, `auth_mode_class`, `script_version`, `introspection_query_kind`).
4. Classify changes using **risk tiers** above.
5. Update `expected_sha256` in `integration-vendor-metadata/cloudbeds_graphql.v1.yaml` when the checksum target file changes.
6. Record notable findings in [`MAPPING_REVIEW.md`](./MAPPING_REVIEW.md) / [`PII_AND_SENSITIVITY_REVIEW.md`](./PII_AND_SENSITIVITY_REVIEW.md).

## Ownership

- **Primary:** integration platform owner (ingest, registry checksums, mapping doc updates).
- **Security:** any **high** tier diff, or medium on guest/reservation/folio surfaces.
- **Approval for execution promotion:** governance PR or ticket reference per [`EXECUTION_PROMOTION_READINESS.md`](./EXECUTION_PROMOTION_READINESS.md).
