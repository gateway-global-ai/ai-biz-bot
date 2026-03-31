# Cloudbeds GraphQL — execution promotion readiness

**Verdict: not ready** for any production execution lane.

## Preconditions (from governance)

All must be satisfied before **one** pilot read capability is proposed:

1. **`vendor-introspection.json`** committed and checksum-aligned ([`SCHEMA_INGEST.md`](./SCHEMA_INGEST.md)).
2. [`MAPPING_REVIEW.md`](./MAPPING_REVIEW.md) completed against real types (not illustrative-only).
3. [`PII_AND_SENSITIVITY_REVIEW.md`](./PII_AND_SENSITIVITY_REVIEW.md) signed for the pilot surface.
4. Adapter manifest + auth/rate/cache/query-depth controls per [`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](../../../../docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md) promotion gate.
5. **D4 / §5.0** explicit review — no mixed-source REST+GraphQL without exception record.

## First pilot candidate (when ready)

**Single** read-only, relationship-friendly capability — **not** financial:

| Candidate | Rationale | Defer if |
|-----------|-----------|----------|
| **Reservation detail read** (GraphQL) | Validates nested reads vs REST; bounded scope. | Schema shows heavy folio coupling. |
| Guest ↔ reservation relationship read | Good GraphQL fit. | PII review incomplete. |
| Room type metadata read | Low sensitivity. | Little gain over REST `getAvailableRoomTypes`. |

**Do not pilot first:** folio, payments, mutations, broad search, deep arbitrary nesting.

## Approval record

| Milestone | Status | Ticket / PR |
|-----------|--------|-------------|
| Real introspection committed | Pending | |
| Mapping + PII complete | Pending | |
| Pilot capability id + adapter draft | Not started | |
