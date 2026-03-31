# Cloudbeds GraphQL — schema ingest (vendor authority)

## Goal

Commit a **vendor-derived** introspection snapshot so the discovery tier is machine-authority-backed (see [`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](../../../../docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md)).

## Where settings live (programmatic)

Do **not** treat secret-manager or Doppler **naming variants** (e.g. mixed `BWS_*` vs `CLOUDBEDS_*` keys) as the integration contract — that is not stable for automation.

**Authority:** per-tenant [`site_pms_integrations`](../../../../shared/schema.ts):

- **Machine GraphQL HTTP URL (non-secret):** `config.cloudbeds_graphql_discovery_v1.http_url` (see governance doc for the versioned shape).
- **Auth material:** existing `access_token` / `api_key` / OAuth flow on the **same row** — same as REST Cloudbeds ([`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](../../../../docs-governance/canonical/INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md)). Do not introduce parallel GraphQL-specific secret env vars for production paths.

The fetch script currently accepts **stable override env vars** for **local / one-off** ingest when a DB-backed flag is not wired yet (see script header). Those names are intentional and minimal; they are not copied from tenant-specific Doppler naming.

## Frozen authority decision (stable)

| Role | Artifact | Notes |
|------|------------|--------|
| **Primary machine authority** | `vendor-introspection.json` | GraphQL introspection response; diffable source of truth for types. |
| **Provenance (required with ingest)** | `vendor-introspection.provenance.json` | No secrets — endpoint URL, fetch time, auth *class*, script version, error/partial flags. |
| **Registry checksum (current)** | `discovery-schema.graphql` | Minimal SDL index; `expected_sha256` in `integration-vendor-metadata/cloudbeds_graphql.v1.yaml` until governance moves checksum to `vendor-introspection.json`. |
| **Human illustration (non-authority)** | `discovery-schema.illustrative.graphql` | Examples only; do not treat as vendor-complete. |

**Promotion path:** When ready to treat introspection as the single checksum gate, add `expected_sha256` for `vendor-introspection.json` in vendor metadata — **one PR, explicit review.**

## Local / CI ingest (stable env overrides)

Until ingest is wired to load `site_pms_integrations` by `site_config_id`, operators may export:

| Variable | Purpose |
|----------|---------|
| `CLOUDBEDS_GRAPHQL_HTTP_URL` | Must equal the tenant’s `config.cloudbeds_graphql_discovery_v1.http_url` (machine endpoint, JSON `POST`). |
| `CLOUDBEDS_GRAPHQL_BEARER` | OAuth access token for that tenant (same material as row `access_token` when using Bearer). |
| *or* `CLOUDBEDS_GRAPHQL_HEADER_NAME` + `CLOUDBEDS_GRAPHQL_HEADER_VALUE` | Only if Cloudbeds documents a non-Bearer header for GraphQL. |
| `CLOUDBEDS_GRAPHQL_REDACT` | Optional `true` — provenance `redacted: true` if you strip fields before commit. |

Use `doppler run --` (or your org’s secret runner) **without** encoding Doppler project or config names in this repo — those are operator-local.

## Important: URL distinction

The browser docs URL [`https://developers.cloudbeds.com/graphql`](https://developers.cloudbeds.com/graphql) and some hosts return **HTML** (playground), not the GraphQL API. A successful ingest **MUST** return JSON (`{"data":{"__schema":…}}` or GraphQL `errors` + partial `data`).

## Steps

1. Ensure the tenant row has `config.cloudbeds_graphql_discovery_v1.http_url` set (and valid Cloudbeds tokens on the row for auth).
2. For a one-off ingest, set the **stable** env overrides above from that tenant’s values (via Doppler or shell — **not** committed).
3. Run:

   ```bash
   cd /path/to/repo
   npm run ingest:cloudbeds-graphql-schema
   ```

4. Confirm outputs:

   - `docs/knowledge-base/cloudbeds/graphql/vendor-introspection.json`
   - `docs/knowledge-base/cloudbeds/graphql/vendor-introspection.provenance.json`

5. If the script warns about **partial/error** responses, inspect the JSON before committing.

6. **Commit** both files. No bearer tokens in either file.

7. Record `sha256sum vendor-introspection.json` in the PR; update vendor metadata when promoting introspection to the checksum anchor.

8. Complete [`MAPPING_REVIEW.md`](./MAPPING_REVIEW.md) and [`PII_AND_SENSITIVITY_REVIEW.md`](./PII_AND_SENSITIVITY_REVIEW.md).

9. Follow [`SCHEMA_DRIFT.md`](./SCHEMA_DRIFT.md) for refreshes.

## SDL export (optional)

SDL derived from introspection is **secondary**; **`vendor-introspection.json`** is the diff authority.
