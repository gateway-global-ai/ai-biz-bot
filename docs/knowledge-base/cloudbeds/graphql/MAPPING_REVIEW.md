# Cloudbeds GraphQL → canonical model mapping review

**Status:** Awaiting **`vendor-introspection.json`** from [`SCHEMA_INGEST.md`](./SCHEMA_INGEST.md). Until then, mappings below reference **`discovery-schema.illustrative.graphql`** and registry rows in `registry-yaml/integration-entities/cloudbeds_hospitality_graphql.v1.yaml` as **hypothesis only**.

## 1. Types that map cleanly to existing canonical entities

| Canonical target (`cloudbeds_hospitality.v1.yaml`) | GraphQL / illustrative | Notes |
|---------------------------------------------------|--------------------------|--------|
| `property` | `Property` (illustrative) | Confirm `propertyID` / id alignment vs REST. |
| `room_type` | `RoomType` | REST uses aggregates from `getAvailableRoomTypes`; GraphQL may expose nested links. |
| `reservation` | `Reservation` | Primary join surface for guest journey vs REST list filters. |
| `guest` | `Guest` | Expect PII fields; compare to REST reservation payloads. |
| `housekeeping_room` | `HousekeepingRoom` | Operational vs guest-facing fields. |
| `operations_dashboard` | `Dashboard` | Date-scoped snapshot semantics. |

**After introspection:** Replace illustrative names with **exact** GraphQL type names from `vendor-introspection.json`.

## 2. Richer relationships than REST (hypothesis)

GraphQL may expose **nested** paths (e.g. reservation → guest → folio) in one round-trip where REST requires multiple `/get*` calls. Document concrete paths here once schema is known:

- _TBD_

## 3. Semantic name differences vs canonical model

| Area | Risk | Action |
|------|------|--------|
| Date/time fields | `String` vs `Date` scalar | Record in field mapping; add `coerce` transforms if needed. |
| Status enums | Vendor strings vs platform lifecycle | `enum_map` or `unsupported_claims`. |
| IDs | `ID` vs numeric strings | Anchor detection (`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1` §3). |

## 4. Ambiguous types / `unsupported_claims`

| Type / surface | Issue | Registry action |
|----------------|-------|-----------------|
| `Folio` (illustrative) | Financial-adjacent | Keep `unsupported_claims` on `cb_gql_folio` until canonical folio entity exists. |
| _TBD from schema_ | | |

## 5. Canonical object model expansion

List any **new** canonical entities or fields required **only if** GraphQL exposes business meaning not covered by `INTEGRATION_CANONICAL_OBJECT_MODEL.md`:

- _TBD_

## After first real ingest (`vendor-introspection.json`)

Tenant URL and credentials follow [`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](../../../../docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md) and [`SCHEMA_INGEST.md`](./SCHEMA_INGEST.md) (no ad-hoc secret-manager naming in automation).

1. List type names: `jq '.data.__schema.types[].name' vendor-introspection.json | sort -u`
2. For each GraphQL type aligned in `cloudbeds_hospitality_graphql.v1.yaml`, confirm **exact** `vendor_object_name` matches the vendor schema (update YAML if renamed).
3. Record **richer-than-REST** nested paths in §2 — may require a **field-level** introspection query in a follow-up PR.
4. Open issues for any **canonical model** gap (new entity or `unsupported_claims`).

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Integration owner | | | |
| Security / PII | | | (see also [`PII_AND_SENSITIVITY_REVIEW.md`](./PII_AND_SENSITIVITY_REVIEW.md)) |
