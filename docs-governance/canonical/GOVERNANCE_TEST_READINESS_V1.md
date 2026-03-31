---
status: canonical
truth_domain: operations
enforced_by: none
backed_by:
  schema: false
  service: server/services/systemReadinessCore.ts
  route: GET /api/platform/readiness
last_verified: 2026-03-28
---

# Governance test readiness v1

## Purpose

Before running “the tests,” operators and agents need a **single, governed preflight** that answers:

1. **What is active** on this machine (DB, Doppler shell, local API, PM2 snapshot)?
2. **Which `npm run` scripts are runnable** with the current environment vs **blocked** (and why)?
3. **Exact commands** to run (including when to prefix `doppler run --`).

This avoids guessing whether failures are **code regressions** vs **missing secrets / DB / server**.

**Canonical superset:** [`SYSTEM_READINESS_CHECK_V1.md`](./SYSTEM_READINESS_CHECK_V1.md) — use **`npm run system:check`** (and **`-- --json`** for structured output). This doc remains the **governance policy** pointer; implementation is canonical in `server/services/systemReadinessCore.ts` (CLI re-exports via `scripts/lib/systemReadinessCore.ts`).

## Command

```bash
npm run system:check
```

**Structured (agents / CI):**

```bash
npm run system:check -- --json
```

**Legacy layout** (same catalog, shorter text):

```bash
npm run governance:test-readiness
```

**Recommended** when secrets live in Doppler:

```bash
doppler run -- npm run system:check
```

## Rules

- The script **must not** print secret values — only presence or connectivity (`set` / `missing` in JSON).
- The **test catalog** is **maintained in code** in `server/services/systemReadinessCore.ts` (`TEST_CATALOG`). When you add or change a governance-relevant npm script, update that array.
- **Integration tenant state** (e.g. Boardwalk Cloudbeds row) remains **`npm run integration:readiness`** (or `:local`). Readiness v1 is **orthogonal**: env + catalog, not full tenant smoke.

## Recommended sequence (human)

1. `npm run system:check` (or `system:check -- --json` in CI)
2. `npm run check`
3. `npm run test:execution-mutation-gate`
4. `npm run test:voice-concierge-aptitude`
5. `npm run integration:readiness` or `npm run integration:readiness:local`
6. Manual browser Live QA when `tests.scenarios.live_voice_browser.status` is `ready`

## Voice / manual QA bundle (mandatory for voice-adjacent validation)

Do not treat tests or Live sessions as evidence without **three artifacts captured together** (same ticket, PR, or run log):

| Artifact | What to capture |
|----------|-----------------|
| **1. Readiness JSON** | `npm run system:check -- --json` **or** `GET /api/platform/readiness` (authenticated) — full document; include **`provenance`**, **`overallStatus`**, **`executionReadiness`**, **`criticalBlockers`** (when overall blocked), and catalog rows you relied on. |
| **2. Test results** | Command lines + stdout/stderr or CI job link for the **exact** tests run after readiness (e.g. `test:execution-mutation-gate`, `test:voice-concierge-aptitude`, integration readiness). |
| **3. Manual notes** | Short narrative: environment (dev/stage/prod URL), what was exercised (browser Live, PSTN, etc.), pass/fail, anomalies. |

**Why:** exit codes alone cannot answer “**what could this environment actually do?**” Readiness JSON is the **evidence plane** for that claim; tests prove **behavior**; notes prove **intent and scope** of manual QA.

## Policy (normative for governed work)

For **governance-affecting** or **voice-adjacent** changes, treat **`npm run system:check`** (or JSON equivalent) as the **required preflight** before asserting that automated tests were run in a valid environment.

**PR / review habit:** attach or summarize **`system:check -- --json`** `provenance` + **`overallStatus`** + **`criticalBlockers`** (if any) + **`executionReadiness`** + `summary` + any **blocked** or **degraded** catalog rows alongside test output and manual QA notes so reviewers see **environment context**, not only exit codes.

**Catalog tri-state:** each npm script is **`runnable`**, **`degraded`** (run with noted caveat, e.g. use `doppler run --`), or **`blocked`** — see `SYSTEM_READINESS_CHECK_V1.md`.

## Related

- [`PLATFORM_CAPABILITY_MILESTONE_V1.md`](./PLATFORM_CAPABILITY_MILESTONE_V1.md) — **M1** (governed execution + minimum test battery) vs **M2** (browser gateway law-in-code); PR summary block
- [`GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md`](./GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md) — **daily** programmatic run: readiness + work plan + optional M1 battery (`npm run governance:daily`)
- [`SYSTEM_READINESS_CHECK_V1.md`](./SYSTEM_READINESS_CHECK_V1.md) — full spec and JSON schema notes.
- [`EXECUTION_MUTATION_GATE_SPEC_V1.md`](./EXECUTION_MUTATION_GATE_SPEC_V1.md) — mutation gate metrics and adoption.
- [`GOVERNANCE_EXECUTION_PLAN_V1.md`](./GOVERNANCE_EXECUTION_PLAN_V1.md) — phase order and review gates.
- `scripts/integration-readiness.ts` — PMS / secrets checklist.

## Revision

Bump **last_verified** when the catalog or probes materially change.
