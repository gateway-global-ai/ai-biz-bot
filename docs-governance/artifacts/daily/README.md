# Daily governance artifacts (generated)

This directory holds **machine- and human-readable** outputs from `npm run governance:daily`.

## Layout

```
artifacts/daily/YYYY-MM-DD/
  governance_daily_report.json   # Envelope v1.1: reportId + summaryCompact + full readiness + workItems + optional M1
  DAILY_WORK_PLAN.md             # Prioritized work items for operators
```

Each JSON run includes a stable **`reportId`** (`govdaily_…`) and **`summaryCompact`** for dashboards; Phase 2 persistence can index those without changing the envelope.

## Git policy

Generated JSON/Markdown under date subfolders are **gitignored** by default so local and CI runs do not flood the repo. **Commit selectively** (e.g. release snapshots) or store artifacts in your object store / platform DB when persistence is required.

## Authority

The structured report **embeds** `system:check` readiness (`schemaVersion: 4`). It does not replace canonical policy docs in `docs-governance/canonical/`.

See [`GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md`](../canonical/GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md).
