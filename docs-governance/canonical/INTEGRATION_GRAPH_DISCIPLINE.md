---
status: canonical
truth_domain: governance
enforced_by: REGISTRY_AUTHORITY_CHARTER.md, scripts/validate-integration-registry.ts
last_verified: 2026-03-30
---

# Integration Graph Discipline

## Authority

```yaml
authority:
  source_of_truth: docs-governance/canonical/INTEGRATION_GRAPH_DISCIPLINE.md
  normative_graph: INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md
  enforcement: npm run validate:integration-registry
```

Normative language: **MUST** / **MUST NOT** (RFC 2119).

---

## D1 — Runtime MUST NOT shortcut the graph

1. Customer-facing agents MUST invoke **capabilities** only through declared **Gemini tool names** (`server/config/geminiToolDeclarations.ts`). Those tools MUST remain façades over registry-backed capability rows (`registry-yaml/integration-capabilities/*.yaml`).
2. Execution code MUST NOT expose vendor **path + method** strings to the model, compiled prompts, or client-visible error copy as the primary API contract.
3. New HTTP entrypoints (e.g. `server/routes/*`) MUST NOT become a parallel way for the model to trigger vendor calls **without** a `capability_id` and `tool_name` (or explicit `internal_only` adapter manifest row with `tool_name: null` and no model surface).
4. Ingest output (OpenAPI → IR scripts) MUST NOT be mounted as runtime authority; promotion into `registry-yaml/integration-endpoints/` and capabilities is a **human-governed** step.

**Rationale:** Skipping the graph reintroduces endpoint sprawl and untestable agent behavior.

---

## D2 — Vendor documentation MUST NOT be authority

1. Vendor OpenAPI, Postman, PDFs, and portals are **inputs** to normalization only.
2. The **authoritative** integration truth for the platform is the **internal graph**: `registry-yaml/integration-entities/`, `integration-endpoints/`, `integration-capabilities/`, `integration-adapters/`, and `integration-capability-sets.yaml`, governed by `INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`.
3. When vendor specs and internal rows disagree, **runtime and CI** MUST follow internal rows after deliberate update; vendor docs MUST be cited under `documentation_source` / ingest metadata, not treated as automatic truth.
4. Drift detection MUST rely on comparing ingest IR or vendor spec checksums to **committed** internal endpoint rows (future automation); until then, reviewers MUST reject “fix in code only” changes that skip YAML.
5. **`registry-yaml/integration-vendor-metadata/`** holds **operator-facing** pointers (developer portal URL, checked-in OpenAPI path, ingest mode). It aids **discovery and provenance** only; it MUST NOT supersede the internal graph. `npm run validate:integration-registry` requires one metadata file per `vendor_id` declared on `integration-entities` bundles and aligns `reference_openapi_path` with `authority.openapi_reference`. **`npm run ingest:integration-vendor-specs`** performs automated ingest for `spec_ingest.mode: url_fetch` (fetch → verify → atomic write) and checksum verification for `manual_promote` when `expected_sha256` is set.

**Rationale:** Vendor docs are often incomplete, renamed, or wrong; the graph exists to survive that.

---

## D3 — Capability sets MUST NOT drift from tools and modes

1. Every non-null `tool_name` on a capability MUST be a key in `TOOL_DECLARATIONS` and MUST appear in `allowedToolNames` for **each** mode listed in that capability’s `operational_mode_allowlist` (enforced by `validate-integration-registry.ts`).
2. Each row in `registry-yaml/integration-capability-sets.yaml` MUST keep `resolved_tool_names` **exactly** equal to the sorted union of `tool_name` values of its `member_capabilities` (enforced by CI). Additionally, **each** entry in `resolved_tool_names` MUST equal the `tool_name` of **at least one** capability listed in `member_capabilities` (explicit set → capability trace; `validate-integration-registry.ts`).
3. **`requires_modes_superset` is validated against `resolved_tool_names` only**, not prose in `description`. A mode MUST NOT appear in `requires_modes_superset` unless that mode’s `allowedToolNames` includes **every** tool in `resolved_tool_names` (e.g. do not list CUSTOMER_SUPPORT for a set whose resolved tools include `get_hotel_inventory` if that mode does not allow that tool).
4. **Model-facing sets** (`resolved_tool_names` non-empty) MUST declare a **non-empty** `requires_modes_superset`, and each listed mode MUST be a superset of those tools. They MUST NOT use `exposure_type: non_model_facing` or `requires_tool_resolution: false`.
5. **Declarative / non-model-facing sets** (`resolved_tool_names` empty) MUST set **`exposure_type: non_model_facing`** and/or **`requires_tool_resolution: false`** so empty resolution is **intentional**. Otherwise validation MUST fail (masks broken wiring). Such sets MUST NOT declare `requires_modes_superset` (non-empty); mode superset checks do not apply.
6. `server/config/operationalModes.ts` MUST NOT remove a tool from a mode if that tool still appears on any capability or set that lists that mode in `requires_modes_superset` or `operational_mode_allowlist` without a matching registry update in the same change.

**Rationale:** Sets and modes are where integration governance silently decays; structural checks prevent it.

---

## D4 — REST and GraphQL from the same vendor are separate governed source tiers

Some vendors expose **both** REST-style HTTP APIs (often with OpenAPI) **and** GraphQL. Those surfaces differ in contract shape, caching, rate limits, PII exposure, and audit posture. They MUST NOT be blended into one fuzzy runtime.

1. **Normative rule:** **REST and GraphQL from the same vendor are separate governed source tiers** unless a **canonical capability mapping** explicitly unifies them (documented in the integration graph, reviewed like any registry change).
2. **Execution vs discovery:** **REST (OpenAPI-backed) endpoints** remain the natural **operation / execution authority** for endpoint-oriented capabilities already normalized in the graph. **GraphQL** is the richer **discovery** surface (schema, introspection, nested relationships) and MAY be used for schema-driven tooling, object-model comparison, and field-level boundary review—even when GraphQL is **not** used for production execution yet.
3. **No silent dual-home:** A capability MUST NOT switch from REST to GraphQL (or call both) because “the data was easier to get.” Each shipped capability MUST declare a **primary** fulfillment surface; mixed-source fulfillment is **prohibited by default**.
4. **Mixed-source exception (rare):** Allowed only when **all** hold: the capability **explicitly** declares a multi-source plan in registry + review notes; retrieved fields are **non-conflicting**; **precedence** and **caching** behavior are defined; **PII / data-boundary** review is recorded; tests prove **no semantic drift** between surfaces.

**Rationale:** Duplicate truth and semantic drift between two live vendor APIs is a production incident class; discovery-rich GraphQL must not bypass capability registry authority.

---

## Enforcement summary

| Discipline | Primary enforcement |
|------------|---------------------|
| D1 | Code review + Cursor rule `integration-graph-discipline.mdc`; graph spec §Platform rule |
| D2 | Internal YAML + charter row; ingest README states non-authoritative IR |
| D3 | `npm run validate:integration-registry` (required in CI); `requires_modes_superset` + `exposure_type` / `requires_tool_resolution` rules on sets |
| D4 | Code review + registry review; separate endpoint bundles / `source_tier` per surface; no capability changes without primary-surface declaration |

---

## Related

- [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md) — §5.0 discovery vs execution vs canonical truth; primary-source discipline
- [`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](./CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md) — Cloudbeds GraphQL discovery tier (Phase 1 non-executable)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md)
- [`ADAPTER_GENERATION_POLICY.md`](./ADAPTER_GENERATION_POLICY.md)
