---
status: canonical
truth_domain: governance
enforced_by: none
backed_by:
  schema: false
  service: partial
  route: false
last_verified: 2026-03-28
---

# Governance daily operations system (v1)

## Purpose

Turn **manual** governance testing and daily planning into a **repeatable, programmatic** pipeline that:

1. Captures **platform readiness** (same source as `npm run system:check`).
2. Derives a **prioritized work item list** for operators (and future automation).
3. Writes a **structured JSON envelope** plus a **human-readable work plan** for the day.
4. Can later be **scheduled** (cron / CI), **stored** by the platform, and eventually driven by a **swarm** on the Sovereign OS.

This does **not** replace the **governance linter / review agent** (design-time and PR-time). It complements them with **operational rhythm**.

## Relationship to other systems

| Mechanism | When | Role |
|-----------|------|------|
| **`npm run system:check`** / `GET /api/platform/readiness`** | Ad hoc, CI, pre-test | Single readiness JSON (`schemaVersion: 4`). |
| **`governance:daily`** | Daily (or on demand) | Readiness **plus** derived **work items** + optional **M1 script battery** + **files** under `docs-governance/artifacts/daily/`. |
| **Governance linter + review skills** | PR / architecture change | Drift detection and approve/reject; outputs under `docs/governance/`. |
| **M1 milestone** ([`PLATFORM_CAPABILITY_MILESTONE_V1.md`](./PLATFORM_CAPABILITY_MILESTONE_V1.md)) | Release criteria | Optional `--run-m1-tests` aligns with the M1 script list. |

## Structured report schema (`GovernanceDailyReportV1`)

| Field | Description |
|-------|-------------|
| `schemaVersion` | **`"1.1.0"`** for this envelope (distinct from readiness `schemaVersion: 4`). Bump when fields change materially. |
| `reportId` | **Stable id** for storage and APIs: `govdaily_{environment}_{YYYYMMDD}THHmmssZ_{hash10}` — environment + calendar date + UTC time + short hash (hash includes a nonce so two runs in the same second do not collide). |
| `generatedAt` | ISO timestamp; **same value as** `readiness.generatedAt` (single clock for the run). |
| `runKind` | `readiness_only` or `readiness_plus_m1`. |
| `readiness` | Full **`SystemReadinessReport`** (embedded; same as `system:check -- --json`). |
| `workItems` | Derived **`GovernanceWorkItemV1[]`** (P0–P2, category, title, optional command). |
| `summaryLine` | One line for operators / logs. |
| `summaryCompact` | **Normalized summary** for dashboards and “latest run” queries: overall/execution status, work-item counts, first N P0 titles, catalog runnable/total, optional repo-relative artifact path. **Phase 2 persistence should store both** the full envelope and this compact object (or derive compact from full on read — storing both avoids heavy JSON scans). |
| `m1TestResults` | Optional map of script → `{ ok, exitCode, stderrTail? }` when `--run-m1-tests` is used. |

**Code:** `scripts/lib/governanceDailyReport.ts`, runner `scripts/governance-daily-run.ts`.

## Work item derivation (v1 heuristic)

Work items are **derived** from readiness (not from LLM inference):

- **P0:** `overallStatus === blocked`, `executionReadiness` not runnable, DB unreachable when URL set.
- **P1:** Catalog rows **blocked**.
- **P2:** Catalog **degraded**, Live browser voice scenario degraded/blocked.

Tuning the heuristic is a **governance change** to this doc + `deriveWorkItemsFromReadiness`.

## Commands

```bash
# Default: readiness + work items → files under docs-governance/artifacts/daily/YYYY-MM-DD/
npm run governance:daily

# Optional: run M1 battery (longer — tsc + key tests)
npm run governance:daily -- --run-m1-tests

# Print envelope to stdout only (no write) — useful in CI with redirects
npm run governance:daily -- --stdout-json
```

**Recommended for scheduled jobs:** `doppler run -- npm run governance:daily` so secrets match production-like probes where relevant.

## Artifact layout

See [`docs-governance/artifacts/daily/README.md`](../artifacts/daily/README.md).

- `governance_daily_report.json` — full envelope.
- `DAILY_WORK_PLAN.md` — prioritized markdown for humans.

Generated date folders are **gitignored** by default (see repo `.gitignore`); **commit** selectively or upload artifacts to durable storage for audit.

## Scheduling (operations)

Example **cron** (adjust path and env):

```cron
0 7 * * * cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai && doppler run -- npm run governance:daily >> /var/log/governance-daily.log 2>&1
```

M1 battery is **not** recommended daily on resource-constrained hosts unless you accept multi-minute runtime; use weekly cron with `--run-m1-tests` or keep default **readiness-only** daily.

## Future: swarm on-platform (Phase 2)

**Disciplined order:** persistence → read API → scheduler → **then** swarm decomposition (do not split into multiple agents before the single pipeline is stable).

**Target architecture (not all implemented):**

1. **Persistence** — One row per run keyed by **`reportId`**; store **full JSON** (`GovernanceDailyReportV1`) and optionally **duplicate** `summaryCompact` in indexed columns for fast “latest run” / dashboard queries.
2. **Read API** — `GET` latest run, `GET` by `reportId` or date; return compact for list views and full envelope for detail.
3. **Agent / job** — A governed **internal** worker invokes the same runner or imports `buildSystemReadinessReport` + `deriveWorkItemsFromReadiness`.
4. **Day plan** — Consumer services read the **latest** run to build **“work plan for the day”** (tickets, Slack, owner digest).
5. **Separation of duties** — Swarm **does not** replace governance **approval** for code changes; it **operationalizes** measurement and planning.

Until Phase 2 exists, **files + stdout** are the integration surface.

## Verification

- [ ] `npm run governance:daily` completes and writes JSON + MD under today’s date folder.
- [ ] Envelope **`schemaVersion` `1.1.0`** includes **`reportId`** and **`summaryCompact`**.
- [ ] `npm run system:check` still authoritative; daily envelope **embeds** that report unchanged.
- [ ] M1 optional run matches scripts listed in [`PLATFORM_CAPABILITY_MILESTONE_V1.md`](./PLATFORM_CAPABILITY_MILESTONE_V1.md) (subset hardcoded in `scripts/governance-daily-run.ts` — keep in sync).

## Related

- [`GOVERNANCE_TEST_READINESS_V1.md`](./GOVERNANCE_TEST_READINESS_V1.md)
- [`SYSTEM_READINESS_CHECK_V1.md`](./SYSTEM_READINESS_CHECK_V1.md)
- [`PLATFORM_CAPABILITY_MILESTONE_V1.md`](./PLATFORM_CAPABILITY_MILESTONE_V1.md)
- [`GOVERNANCE_REVIEW_ENGINE.md`](./GOVERNANCE_REVIEW_ENGINE.md)
- **Queue / backlog truth audits:** [`QUEUE_REVIEW_TEMPLATE_V1.md`](../artifacts/QUEUE_REVIEW_TEMPLATE_V1.md) — required fields per work item (`current_truth`, `runtime_status`, `operator_usable_today`, `next_concrete_step`, `blocking_dependency`) to avoid overstating progress when docs and registries outrun operator surfaces.
