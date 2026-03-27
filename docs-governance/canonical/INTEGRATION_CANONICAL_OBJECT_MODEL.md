---
status: canonical
truth_domain: governance
enforced_by: INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md, REGISTRY_AUTHORITY_CHARTER.md
backed_by:
  schema: partial
  service: partial
  route: false
last_verified: 2026-03-27
---

# Integration Canonical Object Model

## Authority

```yaml
authority:
  source_of_truth: docs-governance/canonical/INTEGRATION_CANONICAL_OBJECT_MODEL.md
  machine_readable_rows: registry-yaml/integration-entities/*.yaml
  subgraph_spec: docs-governance/canonical/INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md
```

This document defines the **platform vocabulary** of business objects used to compare vendors and compile capabilities. Vendor APIs are **mapped into** this model; they do not define it.

## Rules

1. **Canonical IDs** (`canonical_entity_id`, `canonical_field_id`) use `snake_case` and MUST match `^[a-z][a-z0-9_]{1,63}$`.
2. **No silent equivalence:** If two vendor fields are mapped to the same canonical field, `equivalence` and `nuance_notes` MUST be recorded per [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md) §2.2–2.3.
3. **Unsupported claims:** Each entity row MUST list `unsupported_claims` for claim classes the entity must not imply (e.g. `payment_instrument` for a guest profile without PCI scope).

## Core entity set (v1 seed)

These IDs are the initial cross-industry spine. Extend only by adding YAML under `registry-yaml/integration-entities/` and bumping bundle `version`.

| `canonical_entity_id` | Meaning |
|------------------------|---------|
| `property` | Lodging or operational site under which inventory and guests are managed. |
| `room_type` | Sellable accommodation category (not necessarily a physical key). |
| `reservation` | Confirmed or provisional stay / booking record. |
| `guest` | Person associated with a reservation or CRM profile. |
| `housekeeping_room` | Room unit housekeeping state. |
| `operations_dashboard` | Aggregated operational metrics snapshot for a date. |

Relationships (informative): `reservation` → `guest`, `property`; `reservation` → `room_type`; `housekeeping_room` → `property`.

## Registry file shape

Each `registry-yaml/integration-entities/<bundle>.yaml` MUST declare:

```yaml
spec: integration_entities_bundle_v1
version: "1.0.0"
authority:
  source_of_truth: registry-yaml/integration-entities/<bundle>.yaml
entities:
  - canonical_entity_id: property
    spec_version: "1.0.0"
    display_name: Property
    description: PMS property / hotel record.
    parent_entity_id: null
    identity_anchors: [property_id]
    vendor_mappings: []   # filled per vendor file or same bundle
    unsupported_claims: []
    confidence_aggregate: high
```

Vendor-specific mappings for Cloudbeds live in [`registry-yaml/integration-entities/cloudbeds_hospitality.v1.yaml`](../../registry-yaml/integration-entities/cloudbeds_hospitality.v1.yaml).

## Related

- [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md) — anchors, endpoints, capabilities, deploy gates.
- [`ADAPTER_GENERATION_POLICY.md`](./ADAPTER_GENERATION_POLICY.md) — codegen and review policy.
- [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md) — DB anchors such as `sitePmsIntegrations`.
