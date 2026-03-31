---
status: canonical
truth_domain: governance
enforced_by: integrationCredentialBroker, validate-integration-registry
backed_by:
  schema: partial
  service: partial
last_verified: 2026-03-27
spec_id: integration_auth_credential_governance
spec_version: "1.0.0"
---

# Integration authentication and credential governance v1

## Purpose

Vendor credentials are **platform-owned**. Agents MUST NOT hold API keys, refresh tokens, or client secrets. Execution flows through **`getExecutionContext({ siteConfigId, vendorId, capabilityId })`** in [`server/services/integrationCredentialBroker.ts`](../../server/services/integrationCredentialBroker.ts), which returns headers only after **runtime** checks pass.

## Canonical failure vocabulary

[`shared/integrationExecution.ts`](../../shared/integrationExecution.ts) defines **`IntegrationExecutionBlock`**. Readiness reports, logs, and UI MUST use the same `code` values (no ad hoc strings).

## Auth lanes (Cloudbeds)

| Lane ID | Typical use |
|---------|-------------|
| `api_key_property` | Property-created API key ([Cloudbeds property API key guide](https://developers.cloudbeds.com/docs/quickstart-guide-api-authentication-for-property-level-users)) |
| `api_key_partner_delivery` | Partner-scaled key delivery (future automation) |
| `oauth2` | OAuth token path (`/api/cloudbeds/oauth/*`) |

`auth_lane` on [`site_pms_integrations`](../../shared/schema.ts) MAY be null; the broker **infers** `oauth2` if `access_token` is set, else `api_key_property` if `api_key` is set.

## Scope enforcement

- Capabilities declare **`required_scope_ids`** (logical IDs) in `registry-yaml/integration-capabilities/*.yaml`.
- The catalog of valid IDs for Cloudbeds is **`registry-yaml/integration-auth-profiles/cloudbeds.v1.yaml`** `scope_catalog`.
- Property rows store **`scopes_granted`** (JSON array). **`["*"]`** means operator-attested full access (lane A when vendor does not return granular scopes).
- **Runtime:** if `required_scope_ids ⊄ scopes_granted` (set semantics; `*` grants all), the broker returns **`SCOPE_MISSING`** and performs **no** vendor HTTP.

## GraphQL discovery (tenant config)

For Cloudbeds GraphQL **discovery** (schema ingest, mapping review — not execution until promoted), the machine HTTP endpoint is stored as **non-secret** tenant configuration: `site_pms_integrations.config.cloudbeds_graphql_discovery_v1.http_url`. Auth material remains the same row tokens (`access_token` / `api_key`) and broker rules — do not parallelize under ad-hoc env-only names. See [`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](./CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md) § Tenant configuration.

## Version lane enforcement

- Capabilities declare **`allowed_version_lanes`** (e.g. `cloudbeds_v1_3`).
- Property **`api_version_lane`** overrides inference from `CLOUDBEDS_API_BASE_URL`.
- **Runtime:** if the intersection of allowed lanes and the effective property lane is empty, return **`VERSION_LANE_MISMATCH`**.

## Install posture

`install_posture` on `site_pms_integrations`: `draft` | `connected` | `degraded` | `revoked`.

- **`revoked`** → **`INSTALL_REVOKED`** (block).
- **`draft`** or **`degraded`** → **`CONNECTION_DEGRADED`** (block in v1).

## Related

- [`USER_DATA_EXTRACTION_AND_VERIFICATION_V1.md`](./USER_DATA_EXTRACTION_AND_VERIFICATION_V1.md) — RRVCCE phases; Tier 3 = immediate vendor smoke test + confirmation (no save-then-discover-failure)
- [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md) — SMS → connect token → owner surface → OAuth/API key (operator loop)
- [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md)
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md)
