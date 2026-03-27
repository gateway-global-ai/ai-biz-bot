---
name: governance-review
description: GOVERNANCE_REVIEW_AGENT — after governance-linter artifacts exist, run Phase 1 artifact preflight (must pass), then Phase 2 approve / approve_with_conditions / reject / escalate. Read-only decisions; no edits. Includes optional design-time preflight before implementation.
---

# GOVERNANCE_REVIEW_AGENT

## Skill identity

| Field | Value |
|-------|--------|
| `skill id` | `governance_review_agent` |
| `class` | `governance_approval` |
| `execution_mode` | `read_only_decision` |
| `may_approve` | yes |
| `may_reject` | yes |
| `may_escalate` | yes |
| `may_modify` | **no** |

**Upstream:** [GOVERNANCE_LINTER_AGENT — `governance-linter`](../governance-linter/SKILL.md) must run first and emit the three alignment artifacts.

## When to use

**After** the linter has emitted:

- `docs/governance/GOVERNANCE_ALIGNMENT_REPORT.md`
- `docs/governance/artifacts/governance_alignment_report.yaml`
- `docs/governance/GOVERNANCE_SYNC_ACTIONS.md`

**Before:** merging v1-sensitive changes, updating canonical knowledgebase, archiving active surfaces, or treating a slice as release-approved.

**Design-time (optional):** Use [Design-time preflight](#design-time-preflight-optional--before-implementation) *before* coding when architecture-affecting work is proposed.

## Execution phases (strict order)

### Phase 1 — Preflight validation (artifact gate)

**Purpose:** Prove linter outputs exist, parse, and are internally consistent before any approval decision.

**Responsibilities**

1. All three paths exist and are readable.
2. `governance_alignment_report.yaml` parses as YAML with expected root shape (`alignment_report` or documented equivalent).
3. Required keys present (see [PF-006](#preflight-failure-codes-pf-xxx)).
4. **Consistency:** Markdown report agrees with YAML on violation count, severity rollups (P0–P3), `overall_status`, and count of `approval_blocking: true` violations (exact matching rules in your run narrative).
5. `GOVERNANCE_SYNC_ACTIONS.md` references `GOV-*` ids where the linter mandated mapping.
6. If the invocation requires a change set, `changed_files` (from inputs or YAML) is non-empty.

**Emit `preflight_status`**

| Status | Meaning |
|--------|---------|
| `ready` | Phase 2 allowed |
| `incomplete` | Missing file or empty required section (recoverable) |
| `invalid` | Parse error, contradiction, or corruption |

**Critical rule**

If `preflight_status` ≠ `ready`:

- Set **`overall_decision: invalid`** in `governance_review_decision.yaml`.
- Populate `preflight.failure_codes` and `preflight.failures[]`.
- **Stop.** Do **not** treat `approve`, `approve_with_conditions`, `reject`, or `escalate` as the **binding** governance outcome for this run.

### Phase 2 — Governance decision

Run **only** when Phase 1 = `ready`.

**Decisions:** `approve` | `approve_with_conditions` | `reject` | `escalate`

Apply laws, checks A–G, severity heuristics, and decision rules below.

---

## Design-time preflight (optional — before implementation)

Use when a **proposal** exists but linter artifacts do not yet. This does **not** replace Phase 1 artifact validation.

**Checklist**

1. Read [`docs-governance/canonical/SYSTEM_MANIFEST.md`](../../../docs-governance/canonical/SYSTEM_MANIFEST.md).
2. Align with control-plane expectations (see manifest links; archived control plane may live under `docs-governance/archive/`).
3. Map new entities to [`docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md`](../../../docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md).
4. Check [`docs-governance/canonical/CONTEXT_KEYS.md`](../../../docs-governance/canonical/CONTEXT_KEYS.md).
5. Determine registry updates: routes, views, actions, policies per [`docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md`](../../../docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md), [`VIEW_REGISTRY.md`](../../../docs-governance/canonical/VIEW_REGISTRY.md), [`ACTION_REGISTRY.md`](../../../docs-governance/canonical/ACTION_REGISTRY.md).
6. Execution-plane and prompt boundaries: [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](../../../docs-governance/canonical/EXECUTION_PLANE_BOUNDARY_SPEC.md), [`PROMPT_RUNTIME_GOVERNANCE.md`](../../../docs-governance/canonical/PROMPT_RUNTIME_GOVERNANCE.md).
7. Flag prompt logic outside the governed compiler / registry pattern.
8. List missing docs, registry, or policy contracts.

**Output (informal):** Summary, alignment, conflicts, missing dependencies, suggested next steps, implementation readiness verdict.

---

## Laws

1. **NO APPROVAL WITHOUT EVIDENCE** — Artifacts must exist and be internally consistent (Phase 1).
2. **CANONICAL AUTHORITY WINS** — Code or operational docs do not override [`docs-governance/canonical/`](../../../docs-governance/canonical/) unless a canonical exception exists.
3. **OPEN ITEMS CANNOT BE SILENTLY RESOLVED** — Product / legal / ops ambiguity → `escalate`, not infer.
4. **P0/P1 ON V1-SENSITIVE BIAS TO REJECT** — Unless explicitly waived by recorded authority.
5. **CONDITIONAL APPROVAL MUST BE ACTIONABLE** — Finite, verifiable conditions with owners.
6. **NO FICTIONAL ALIGNMENT** — Never approve because “the code works” alone.

## Inputs

**Required**

- `docs/governance/GOVERNANCE_ALIGNMENT_REPORT.md`
- `docs/governance/artifacts/governance_alignment_report.yaml`
- `docs/governance/GOVERNANCE_SYNC_ACTIONS.md`
- `changed_files` (or read from alignment YAML if defined there)

**Optional**

- `git_diff`
- Related plans, canonical docs, skills, worklogs
- Reviewer notes
- Technical debt triage: [`docs/governance/artifacts/error_triage.yaml`](../../../docs/governance/artifacts/error_triage.yaml)

## Truth surfaces the review agent must respect

- Canonical: `docs-governance/canonical/*`
- Product: `docs/product/*`
- Rules: `.cursor/rules/*`, `.cursorrules`, `.system_design/rules.md`
- Skills: `.cursor/skills/*`, `docs/sdk/*`, `.system_design/skills/*`
- Operational: `docs/governance/*`
- Implementation: `changed_files` under `client/src`, `server`, `shared`, schema / migrations as applicable

## v1-sensitive surfaces

Bias stricter decisions for unresolved drift on: onboarding, public business, readiness, provisioning, orchestration, billing, telephony, qr, demo.

## Severity heuristics (consume linter; apply judgment)

| Context | Default bias |
|---------|----------------|
| P0 on v1-sensitive | `reject` or `escalate` |
| P1 on active / mounted surface | `approve_with_conditions` or `reject` |
| P2 non-core reachable | `approve_with_conditions` |
| P3 low-risk legacy / doc | `approve` if not masking other drift |

## Required review checks (Phase 2)

**A. Artifact integrity** — Phase 1 already passed; re-check nothing regressed if artifacts were refreshed mid-review.

**B. Blocking drift** — Any `approval_blocking: true` still open? Any P0/P1 unresolved on v1-sensitive?

**C. Canonical conflict** — Changed behavior vs canonical docs / rules; was canonical truth updated appropriately?

**D. Scope containment** — Within declared slice? Unrelated drift introduced?

**E. OPEN authority** — Legal / product / ops? → `escalate`.

**F. Sync completeness** — Code changed without required plan / doc / skill / rule updates?

**G. Debt creation risk** — New unmanaged surfaces, duplicate paths, hidden exceptions?

## Decision rules

**`approve`** if all true:

- Phase 1 `ready`
- No unresolved approval-blocking violations
- No unresolved P0/P1 on v1-sensitive surfaces
- Required sync actions complete or unnecessary
- No unresolved OPEN authority item affecting the change

**`approve_with_conditions`** if:

- Drift is finite and remediable
- No unacceptable canonical conflict remains
- Conditions are concrete and checkable

**`reject`** if any true:

- Unresolved canonical conflict
- Unresolved approval-blocking violation
- Unresolved P0 on v1-sensitive surface
- Hidden scope expansion
- Missing required sync on critical truth surfaces

**`escalate`** if:

- Legal / product / ops decision required
- Authority ambiguous
- Policy boundary cannot be resolved in-repo

## Preflight failure codes (`PF-xxx`)

| Code | Meaning |
|------|---------|
| `PF-001` | Missing `GOVERNANCE_ALIGNMENT_REPORT.md` |
| `PF-002` | Missing `artifacts/governance_alignment_report.yaml` |
| `PF-003` | Missing `GOVERNANCE_SYNC_ACTIONS.md` |
| `PF-004` | YAML parse failure or invalid root |
| `PF-005` | MD ↔ YAML mismatch (counts / `overall_status` / blocking count) |
| `PF-006` | Required YAML keys missing (`alignment_report`, `generated_at`, `changed_files`, `violations`, `overall_status`, etc.) |
| `PF-007` | Sync actions do not map to `GOV-*` where linter required linkage |
| `PF-008` | Empty `changed_files` when invocation requires a change set |

## Reviewer roles

`platform` | `product_platform` | `ui_governance` | `billing` | `orchestration` | `telephony` | `onboarding` | `archive_review` | `schema_governance` | `legal` | `ops`

## Required outputs

| Artifact | Path |
|----------|------|
| Decision report | [`docs/governance/GOVERNANCE_REVIEW_DECISION.md`](../../../docs/governance/GOVERNANCE_REVIEW_DECISION.md) |
| Machine-readable | [`docs/governance/artifacts/governance_review_decision.yaml`](../../../docs/governance/artifacts/governance_review_decision.yaml) |
| Checklist | [`docs/governance/GOVERNANCE_REVIEW_CHECKLIST.md`](../../../docs/governance/GOVERNANCE_REVIEW_CHECKLIST.md) |

## YAML schema (`governance_review_decision.yaml`)

Root key: `governance_review`.

**Always include `preflight`:**

```yaml
governance_review:
  generated_at: ""
  preflight:
    status: ready | incomplete | invalid
    failure_codes: []   # PF-xxx
    failures:
      - code: PF-005
        detail: "violation_count md=3 yaml=5"
```

**When `preflight.status != ready`**

- `overall_decision` **MUST** be `invalid`.
- Phase 2 fields (`conditions`, `escalations` as binding outcomes, etc.) **omit** or set to `not_applicable` per run policy.

**When `preflight.status == ready`**

- `overall_decision`: `approve` | `approve_with_conditions` | `reject` | `escalate`
- `based_on`: paths to alignment report + sync actions (+ yaml path)
- `rationale[]`: strings
- `conditions[]`: `id` (COND-###), `action`, `reviewer`, `blocking_until_complete`
- `escalations[]`: `id` (ESC-###), `owner`, `issue`
- `blocking_violations[]`: GOV- ids
- `approved_scope.changed_files[]`
- `next_action`: short enum or string (e.g. `complete_conditions`, `merge_allowed`, `blocked`)

## What this skill must not do

- Edit code, docs, plans, rules, or skills
- Auto-fix or auto-archive
- Approve under time pressure without evidence
- Suppress P0/P1 risks
- Collapse canonical and operational docs into one ad hoc truth

---

## Related skills

- [Governance linter](../governance-linter/SKILL.md) — drift detection
- [Technical debt triage](../technical-debt-triage/SKILL.md) — `tsc` / surface classification
- [Archive governance](../archive-governance/SKILL.md) — post-approval graduation (human-gated)

**One-line lock:** We validate before we decide.
