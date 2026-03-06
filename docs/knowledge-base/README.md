# Cloudbeds & Hotel Knowledge Library

A curated library of Cloudbeds API, hospitality templates, hotel-matching, and global-variable docs for use by **Gemini Live + React** voice agents and build-time tooling.

## Structure

| Section | Purpose |
|--------|--------|
| **cloudbeds/** | API reference, OAuth, workflows, validation. Canonical OpenAPI and validation YAML live here. |
| **hospitality/** | Industry mapping and JSON templates (e.g. hotel booking, identity verification). |
| **hotel-matching/** | Matching logic, rate filtering, and implementation plans. |
| **global-variables/** | Variable mapping and schema aliasing (e.g. `guest`/`hotel` terminology). |

## Taxonomy (for agent retrieval)

Agents should query by **category**, **topic**, or **tags**:

| Topic | Use when |
|-------|----------|
| `auth_oauth` | Implementing or debugging OAuth / auth flows. |
| `api_endpoints` | Calling Cloudbeds API, building tools, or mapping endpoints. |
| `reservation_flow` | Building or modifying reservation/booking flows. |
| `payments` | Payment methods, collection, or settings. |
| `housekeeping` | Housekeeping workflows and status. |
| `webhooks` | Webhook setup and handling. |
| `global_variables` | Personalization and variable mapping. |
| `schema_aliasing` | Industry terminology (guest, hotel) and provider mapping. |
| `ui_react` | UI templates and React-related assets. |
| `voice_workflow` | Voice AI workflow design and patterns. |
| `best_practices` | Guardrails, validation, and operational safety. |

## Agent retrieval strategy

- **Build-time:** Filter by `category` (e.g. `cloudbeds`) or `topic` (e.g. `reservation_flow`, `voice_workflow`) to load implementation docs and patterns.
- **Runtime:** Use `api_endpoints`, `auth_oauth`, and `reservation_flow` for live API and flow behavior.
- **Guardrails:** Use items with `best_practice_flags: ["guardrails"]` or topic `best_practices` together with implementation docs so agents get both “how” and “guardrails.”

Indexes:

- **INDEX.md** — Human navigation and section links.
- **index.json** — Machine-friendly metadata for retrieval pipelines (`id`, `title`, `category`, `tags`, `source_path`, `library_path`, `file_type`, `topic`, `integration_stage`, `best_practice_flags`, `related_items`).
- **index.yaml** — Same metadata in YAML for config-driven systems.

Each section folder (e.g. `cloudbeds/`, `hospitality/`) contains an **INDEX.md** for local browsing and selective retrieval.

## Canonical artifacts

- **OpenAPI:** `cloudbeds/api/pms-v1.3-openapi.yaml` (from `cloudbeds-api-integration/generated`).
- **Validation rules:** `cloudbeds/validation/validation-rules.yaml` (from `cloudbeds-api-integration/validation-rules`).

Source-to-library mapping and alternates are recorded in **source-mapping.json**.
