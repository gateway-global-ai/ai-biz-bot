---
name: technical-debt-triage
description: TECHNICAL_DEBT_TRIAGE_AGENT — Classify TypeScript/build errors and files by Sovereign v1 relevance, severity, and surface; emit governed MD + YAML reports only. No deletes, moves, or fixes in triage mode.
---

# Technical debt triage (governed classification)

## When to use

- `npm run check` (`tsc`) reports errors across many files and ad hoc fixes risk deleting or starving **core** paths.
- You need an **auditable** backlog: what to fix first, what to quarantine later, what is showcase/R&D.
- **Do not** use this skill for “just fix the errors” in the same session as bulk archive work — use [archive-governance](../archive-governance/SKILL.md) only **after** human review of triage outputs.

## Operating principle

**We do not delete code — we graduate it out of the system.** Triage classifies and sequences; it does not execute graduation.

## Phases (process)

1. **Inventory** — Collect per-file errors from `tsc`; map files to product surfaces (see categories below).
2. **Freeze rule** — A file may stay **active** only if it is: mounted on the v1 surface, required by a mounted route, required by a canonical workflow, or explicitly preserved as internal admin/tooling.
3. **Quarantine (recommendation only)** — Triage may recommend `quarantine` or `archive_candidate`; it does **not** move files.
4. **Core fix ordering** — Produce an ordered `fix_now` queue; defer non-core until surface is reduced.

## Surface categories (Phase 1)

Use these labels in `category` / narrative:

| Bucket | Examples |
|--------|----------|
| **Core v1** | Onboarding, public business pages, readiness gates, provisioning, agent orchestration, billing (if v1), telephony (if v1), site config / handover |
| **Secondary active** | Admin tools, workspace, QR, storefronts (if still live), platform operator panels |
| **R&D / showcase / archive candidate** | GRN/travel experiments, bail/rescue demos, TestB2b, SDK showcase, old platform home variants, misaligned legacy dashboards |

**v1-sensitive** (treat as high impact; often `affects_customer_ready: true`): onboarding, public business, readiness, provisioning, agent orchestration, QR, billing, telephony.

**UI note:** New admin/control-plane UI law: [`docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md`](../../../docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md). MSA-aligned billing/SMS constraints: [`.system_design/rules.md`](../../../.system_design/rules.md).

## Severity

| Code | Meaning |
|------|---------|
| **P0** | Breaks build or runtime for an active surface |
| **P1** | Core path degradation (incorrect types, broken contracts on v1-relevant code) |
| **P2** | Non-core but still reachable (admin, tools, secondary routes) |
| **P3** | Showcase, archive debt, or dead R&D |

## Error kinds (tag in `error_kinds[]`)

- `syntax_type` — Syntax or type errors
- `missing_import` — Missing import / dead dependency
- `obsolete_feature` — Legacy feature path
- `architecture_violation` — Boundary or layering violation
- `route_drift` — Mount vs registry vs browser path mismatch
- `schema_drift` — Schema / shared types out of sync

## Actions (recommended)

- `fix_now` — Must be corrected before or as part of v1 hardening
- `quarantine` — Candidate to move to `quarantine/` after review (see archive skill)
- `archive_candidate` — Likely end state is removal or `_legacy_archive`-style retirement (never move to `_legacy_archive/` without governance)
- `defer` — Blocked or intentionally postponed (set `blocked_by[]`)

## Hard prohibitions (triage mode)

- Do **not** delete files or move code.
- Do **not** open a “fix everything” PR when the user asked for triage-only.
- Do **not** assume a file is unused because it “looks” like R&D — check **mounts** and importers (`rg`, router registration, `App.tsx` lazy imports).
- Do **not** modify `_legacy_archive/`.

## Inputs

1. Run `npm run check` from repo root (`package.json`: `"check": "tsc"`).
2. Parse output into **per-file** error counts and short error summaries.
3. For each file with errors (or each file in scope), search: importers, `app.use`, `<Route`, `lazy(() => import(`.

## Outputs (required every triage run)

Write or refresh:

| Artifact | Purpose |
|----------|---------|
| [`docs/governance/TECHNICAL_DEBT_TRIAGE_REPORT.md`](../../../docs/governance/TECHNICAL_DEBT_TRIAGE_REPORT.md) | Executive summary + tables |
| [`docs/governance/ARCHIVE_CANDIDATES_V1.md`](../../../docs/governance/ARCHIVE_CANDIDATES_V1.md) | Rows with `archive_candidate` / `quarantine` + mount notes |
| [`docs/governance/CORE_FIX_QUEUE_V1.md`](../../../docs/governance/CORE_FIX_QUEUE_V1.md) | Ordered `fix_now` queue + suggested reviewer |
| [`docs/governance/artifacts/error_triage.yaml`](../../../docs/governance/artifacts/error_triage.yaml) | Machine-readable list |

## YAML schema (`error_triage`)

Each list item under `error_triage:` **SHOULD** include:

- `file` — Repo-relative path
- `errors` — Integer count for this triage run
- `category` — e.g. `core_runtime`, `secondary_admin`, `showcase_legacy`, `r_and_d_legacy`, `unknown`
- `v1_relevance` — e.g. `critical`, `high`, `medium`, `low`, `none`
- `action` — `fix_now` | `quarantine` | `archive_candidate` | `defer`
- `risk` — `low` | `medium` | `high`
- `rationale` — One or two sentences
- `runtime_surface` — `public` | `admin` | `internal` | `unused`
- `affects_customer_ready` — boolean
- `severity` — `P0` | `P1` | `P2` | `P3`
- `error_kinds` — Array from the list above
- `mounts` — Array of objects, each with `type`:
  - `express_route` — Optional: `path`, `registered_in` (e.g. `server/routes.ts`)
  - `react_route` — Optional: `path`, `registered_in` (e.g. `client/src/App.tsx`)
  - `lazy_import` — Optional: `importer`, `symbol`
- `importers` — Strings (paths) if known
- `reviewer` — Suggested owner: `platform`, `billing`, `registry`, `voice` (for awareness only), etc.
- `blocked_by` — Optional: paths or tickets preventing action

Example:

```yaml
error_triage:
  - file: server/routes/example.ts
    errors: 2
    category: core_runtime
    v1_relevance: critical
    action: fix_now
    risk: high
    rationale: Active API surface for agent orchestration.
    runtime_surface: public
    affects_customer_ready: true
    severity: P1
    error_kinds: [syntax_type]
    mounts:
      - type: express_route
        path: /api/example
        registered_in: server/routes.ts
    importers: []
    reviewer: platform
```

## Governance references

- [`docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md`](../../../docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md)
- [`docs-governance/canonical/FILE_SYSTEM_GOVERNANCE.md`](../../../docs-governance/canonical/FILE_SYSTEM_GOVERNANCE.md)
- [`docs/governance/TECHNICAL_DEBT_REDUCTION_PROCESS.md`](../../../docs/governance/TECHNICAL_DEBT_REDUCTION_PROCESS.md)
- [`.cursor/rules/modular-routing.mdc`](../../rules/modular-routing.mdc)
- [`.cursor/rules/legacy-archive-governance.mdc`](../../rules/legacy-archive-governance.mdc)

## Spawn prompt (copy for agents)

Act as **TECHNICAL_DEBT_TRIAGE_AGENT** for the Sovereign AI OS. Run `npm run check`, classify every erroring file by v1 relevance and surface, and write the four artifacts under `docs/governance/`. Do not delete, move, or fix code in this pass. Use the YAML schema in `.cursor/skills/technical-debt-triage/SKILL.md`. Flag all Express and React mounts explicitly.
