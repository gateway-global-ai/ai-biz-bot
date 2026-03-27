# Operational governance (technical debt & decay)

This directory holds **operational** artifacts: triage reports, fix queues, archive candidates, and process notes for **controlled technical debt reduction**.

It is **not** the same as [`docs-governance/`](../../docs-governance/canonical/) (canonical policy and registry source of truth).

| Path | Role |
|------|------|
| [TECHNICAL_DEBT_REDUCTION_PROCESS.md](./TECHNICAL_DEBT_REDUCTION_PROCESS.md) | Phases, human gate, active-surface rule |
| [TECHNICAL_DEBT_TRIAGE_REPORT.md](./TECHNICAL_DEBT_TRIAGE_REPORT.md) | Latest human-readable triage run |
| [ARCHIVE_CANDIDATES_V1.md](./ARCHIVE_CANDIDATES_V1.md) | Subset approved for graduation planning |
| [CORE_FIX_QUEUE_V1.md](./CORE_FIX_QUEUE_V1.md) | Ordered core fixes |
| [artifacts/error_triage.yaml](./artifacts/error_triage.yaml) | Machine-readable triage rows |
| [GOVERNANCE_ALIGNMENT_REPORT.md](./GOVERNANCE_ALIGNMENT_REPORT.md) | Latest alignment / drift report (from linter run) |
| [artifacts/governance_alignment_report.yaml](./artifacts/governance_alignment_report.yaml) | Machine-readable alignment violations |
| [GOVERNANCE_SYNC_ACTIONS.md](./GOVERNANCE_SYNC_ACTIONS.md) | Required sync actions (grouped by update type + surface) |
| [GOVERNANCE_REVIEW_DECISION.md](./GOVERNANCE_REVIEW_DECISION.md) | Governance review decision (after linter artifacts) |
| [artifacts/governance_review_decision.yaml](./artifacts/governance_review_decision.yaml) | Machine-readable review outcome + preflight block |
| [GOVERNANCE_REVIEW_CHECKLIST.md](./GOVERNANCE_REVIEW_CHECKLIST.md) | Short operational review checklist |

**Governance sync loop:** **validate before decide** — run [`.cursor/skills/governance-linter/SKILL.md`](../../.cursor/skills/governance-linter/SKILL.md) (drift detection), then [`.cursor/skills/governance-review/SKILL.md`](../../.cursor/skills/governance-review/SKILL.md) (Phase 1 artifact preflight → Phase 2 approve / conditional / reject / escalate). If preflight is not `ready`, `overall_decision` is `invalid` only.

**Cursor skills:** [`.cursor/skills/technical-debt-triage/SKILL.md`](../../.cursor/skills/technical-debt-triage/SKILL.md), [`.cursor/skills/archive-governance/SKILL.md`](../../.cursor/skills/archive-governance/SKILL.md), [`.cursor/skills/governance-linter/SKILL.md`](../../.cursor/skills/governance-linter/SKILL.md), [`.cursor/skills/governance-review/SKILL.md`](../../.cursor/skills/governance-review/SKILL.md).

**Quarantine holding area:** [`quarantine/README.md`](../../quarantine/README.md).
