---
name: governance-linter
description: GOVERNANCE_LINTER_AGENT — detect alignment drift across code, rules, plans, skills, and docs; read-only reports only (no approval, no edits).
---

# GOVERNANCE_LINTER_AGENT

## Skill identity

| Field | Value |
|-------|--------|
| `skill id` | `governance_linter_agent` |
| `class` | `governance_enforcement` |
| `execution_mode` | `read_only` |
| Companion | **GOVERNANCE_REVIEW_AGENT** — [`.cursor/skills/governance-review/SKILL.md`](../governance-review/SKILL.md) (validate artifacts, then decide) |

## When to use

- Changes touch **v1-sensitive** surfaces: onboarding, public business pages, readiness gates, provisioning, agent orchestration, billing, telephony, QR, customer-facing demo paths.
- Mounted routes, `App.tsx` / router imports, or modular route registration change.
- New admin / control-plane UI, registry YAML, canonical docs, meta-prompt or orchestration contracts.
- Before treating a slice as “done” for merge or release (after implementation, feed outputs to the review skill).

## What this skill does

- Compares **changed files** to declared **truth surfaces** (canonical docs, rules, skills, plans, product docs).
- Classifies **drift** and severity; proposes **required_updates** and narrative actions.
- Emits **three governed artifacts** (markdown + YAML + sync checklist).

## What this skill must not do

- Edit code, docs, rules, skills, or plans.
- Auto-fix, auto-archive, or approve / reject changes.
- Suppress violations because “the code works.”

## Laws

1. **READ ONLY** — Never modify repository files.
2. **DETECT, DO NOT DECIDE** — Report violations; approval is [governance-review](../governance-review/SKILL.md).
3. **NO SILENT DRIFT** — Implementation without matching truth-surface updates must be reported.
4. **CANONICAL FIRST** — On conflict, [`docs-governance/canonical/`](../../../docs-governance/canonical/) wins unless a canonical doc delegates authority.
5. **MOUNTED SURFACES = HIGHER RISK** — Drift on live routes / entrypoints outranks showcase / quarantine / archive-only paths.
6. **UNKNOWNS EXPLICIT** — Use drift `type: unknown_alignment` rather than guessing.

## Inputs

**Required**

- `changed_files` — repo-relative paths for this review scope.
- Scope hint: which branch / PR / slice (narrative).

**Optional**

- `git_diff`
- `current_branch` / `target_branch`
- `tsc_output` (from `npm run check`)
- `mounted_route_inventory` — e.g. `client/src/App.tsx`, lazy imports, `app.use` mounts in `server/routes/**`

## Truth surfaces (path roots)

| Category | Roots |
|----------|--------|
| Canonical governance | `docs-governance/canonical/*` |
| Operational governance | `docs/governance/*`, `docs-governance/worklogs/*` (if present) |
| Product truth | `docs/product/*` |
| UX / SDK docs | `docs/ux/*`, `docs/sdk/*` |
| Rules | `.cursorrules`, `.cursor/rules/*.mdc`, `.system_design/rules.md` |
| Skills | `.cursor/skills/**/SKILL.md` |
| Plans | `.cursor/plans/*.plan.md`, `*.plan.md` in scope |
| Registries | `registry-yaml/*` |
| Code | `client/src/**`, `server/**`, `shared/**`, `migrations/**` |
| Quarantine | `quarantine/**` (imports *from* here from active code = high severity) |

## `change_signal[]` (report-level)

Derive a **deduped** list from `changed_files` path prefixes:

- `code_change` — under `client/src`, `server`, `shared`, `migrations`, etc.
- `plan_change` — `.cursor/plans/`, `*.plan.md`
- `rule_change` — `.cursor/rules/`, `.cursorrules`, `.system_design/rules.md`
- `skill_change` — `.cursor/skills/`, `docs/sdk/` (skill-like), `.system_design/skills/`
- `doc_change` — `docs/`, `docs-governance/` (excluding code-only paths)

## Drift types (`violations[].type`)

- `plan_drift`
- `rule_drift`
- `skill_drift`
- `doc_drift`
- `route_drift`
- `schema_drift`
- `ui_governance_drift`
- `archive_boundary_drift`
- `runtime_contract_drift`
- `unknown_alignment`

## Severity

| Code | Meaning |
|------|---------|
| **P0** | Breaks governance or critical v1 runtime alignment |
| **P1** | Active / mounted surface drift or missing required truth update |
| **P2** | Non-core but reachable drift or incomplete sync |
| **P3** | Low-risk debt, legacy inconsistency, doc lag |

**v1-sensitive** (bias to P0/P1): onboarding, public business, readiness, provisioning, orchestration, billing, telephony, qr, demo paths.

## Surface (`violations[].surface`)

One of: `public` | `admin` | `internal` | `archive_candidate`

## Required updates (`violations[].required_updates[]`)

When actionable, include one or more:

- `update_plan`
- `update_rule`
- `update_skill`
- `update_doc`
- `fix_code`

Each violation should also have narrative `required_action[]` bullets aligned with these enums.

## Drift origin (`violations[].drift_origin[]`)

Non-empty array of one or more: `code_change` | `plan_change` | `rule_change` | `skill_change` | `doc_change` — what moved or should have moved for this mismatch.

## Required checks

**A. Code ↔ plan** — Behavior vs active plan / slice; plan claims vs code.

**B. Code ↔ rules** — e.g. modular routing (no new routes in `server/routes.ts` monolith), execution-plane boundaries, prompt governance, API lockdown, voice/chat lockdown files, import discipline.

**C. Code ↔ skills** — Skill paths / steps / contracts stale vs repo.

**D. Code ↔ docs** — Product / onboarding / readiness docs vs actual routes and APIs.

**E. Mounted surface drift** — Deprecated or archive candidates still mounted; hidden routes still linked.

**F. Archive / quarantine** — Active code must not import `quarantine/` or `_legacy_archive/`.

**G. Runtime contract drift** — Readiness, onboarding, orchestration, meta-prompt bindings vs [`docs-governance/canonical/`](../../../docs-governance/canonical/) (e.g. `PROMPT_RUNTIME_GOVERNANCE.md`, `META_PROMPT_RUNTIME_CONTRACT.md` when applicable).

**UI governance** — New control-plane UI: prefer `@/ui-core` over raw `@mui/material` per [`docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md`](../../../docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md); violations → `ui_governance_drift`.

## Workflow

1. **Inventory** — List `changed_files`; classify `change_signal[]`; note mounted relevance.
2. **Truth matching** — Map each file to plans, rules, skills, docs, registries.
3. **Drift detection** — Emit `violations[]` with `drift_origin`, `surface`, `required_updates`, `approval_blocking`.
4. **Sync requirements** — Group actions for `GOVERNANCE_SYNC_ACTIONS.md`.
5. **Report emission** — Write the three outputs below.

## Required outputs

| Artifact | Path |
|----------|------|
| Human report | [`docs/governance/GOVERNANCE_ALIGNMENT_REPORT.md`](../../../docs/governance/GOVERNANCE_ALIGNMENT_REPORT.md) |
| Machine-readable | [`docs/governance/artifacts/governance_alignment_report.yaml`](../../../docs/governance/artifacts/governance_alignment_report.yaml) |
| Sync checklist | [`docs/governance/GOVERNANCE_SYNC_ACTIONS.md`](../../../docs/governance/GOVERNANCE_SYNC_ACTIONS.md) |

**`GOVERNANCE_SYNC_ACTIONS.md`** — Group sections by `required_updates` and by `surface` for scanning.

## YAML schema (`governance_alignment_report.yaml`)

Top-level keys:

- `alignment_report` (root object)
  - `generated_at` — ISO-8601 string
  - `changed_files` — string[]
  - `change_signal[]` — enum list (see above)
  - `overall_status` — `aligned` | `aligned_with_required_updates` | `misaligned` | `unknown`
  - `severity_counts` — optional map P0–P3
  - `violations[]`:
    - `id` — stable `GOV-001`, `GOV-002`, …
    - `type` — drift type enum
    - `severity` — P0 | P1 | P2 | P3
    - `file` — primary path
    - `related_truth_surfaces[]` — paths
    - `issue` — short string
    - `evidence[]` — short strings
    - `drift_origin[]` — non-empty when known
    - `surface`
    - `required_updates[]`
    - `required_action[]`
    - `reviewer` — e.g. `platform`, `ui_governance`, `onboarding`, `orchestration`
    - `approval_blocking` — boolean

## Reviewer roles (suggested)

`platform` | `product_platform` | `ui_governance` | `billing` | `orchestration` | `telephony` | `onboarding` | `archive_review` | `schema_governance`

## Final statuses (linter — not approval)

- `aligned` — No significant drift detected for scope.
- `aligned_with_required_updates` — Proceed only after listed sync actions.
- `misaligned` — Blocking drift; do not treat as shippable without fixes.
- `unknown` — Human review required before proceeding.

---

**One-line lock:** Nothing is “aligned” until the declared truth surfaces match the change — detection is not approval.
