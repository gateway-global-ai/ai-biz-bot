---
status: canonical
truth_domain: operations
enforced_by: none
backed_by:
  schema: false
  service: server/services/systemReadinessCore.ts
  route: GET /api/platform/readiness
last_verified: 2026-03-27
---

# System readiness check v1 (`SYSTEM_READINESS_CHECK`)

## Purpose

Give the platform **self-describing operational state**: what is configured, what is reachable, which npm tests are runnable, and what blocks **browser Live** E2E. This is the **capability awareness layer** for humans, CI, and (later) governed agents/tools.

**Principle:** batch test execution and voice QA should be **preceded** by a readiness pass so “tests passed” is not claimed in a dead or half-configured environment.

## Commands

| Command | Output |
|---------|--------|
| `npm run system:check` | Full human-readable report (env, voice, integrations, DB counts, npm catalog, Live scenario blockers). |
| `npm run system:check -- --json` | Single JSON document (`schemaVersion: 4`) — suitable for tools, agents, CI artifacts. |
| `npm run system:check -- --governance-focus` | Shorter layout (same data as legacy governance preflight). |
| `npm run governance:test-readiness` | **Alias** of governance-focused text (back-compat). |

**Secrets:** never prints values — only `set` / `missing` / connectivity.

## JSON shape (summary)

`schemaVersion: 4` — bump when fields are removed or semantics change.

- `overallStatus` — `runnable` | `degraded` | `blocked` — worst-of across **test catalog**, **database reachability** (`dbState === ok`), and **`tests.scenarios.live_voice_browser`** (`ready` → no penalty; `degraded` / `blocked` map into the rollup)
- `criticalBlockers` — string[]; **non-empty only when `overallStatus === "blocked"`**, ordered **database → catalog (`catalog:<script> — …`) → live (`live_voice_browser:…`)** so operators and agents do not infer from the full map
- `executionReadiness` — `{ status, blockers[] }` — **database + Gemini + local `/api/health` only** (ignores npm test catalog). Used for the **runtime tool gate** in `server/services/toolHandler.ts` so a blocked CI/npm row does not halt Live tool dispatch while the core plane is healthy
- `generatedAt` — ISO timestamp (also echoed under provenance for auditors who copy subtrees)
- `provenance` — `hostname`, `environmentLabel` (`DOPPLER_ENVIRONMENT` → `DEPLOY_ENV` → `NODE_ENV` → `unknown`), `gitCommit` (`git rev-parse HEAD`, truncated, or `null` if not a git checkout)
- `environment` — Node, cwd, Doppler CLI / shell detection, `dotenvLoaded`
- `secretsPresence` — named keys only (`set` | `missing`) — **never values**
- `voice` — Gemini configured, static list of **declared** WebSocket paths, local `/api/health` probe, `readyForLiveProvisioning`
- `integrations` — Twilio / Stripe / Cloudbeds **env slice** (tenant PMS remains DB; use `integration:readiness`)
- `database` — connected, `site_configs` / `agents` **counts** when connected
- `processes` — PM2 summary string
- `tests.catalog` — map of npm script → `{ status: runnable | degraded | blocked, reason?, command, description }`
  - **runnable** — OK to run as shown
  - **degraded** — can run, but outside a Doppler-injected shell while script **prefers** vault-aligned secrets (use `doppler run -- …`)
  - **blocked** — missing DB, missing Doppler CLI when required, etc.
- `tests.scenarios.live_voice_browser` — `ready` | `degraded` | `blocked`, `requires[]`, `blockers[]`
- `summary` — `catalogRunnable`, `catalogDegraded`, `catalogBlocked`, `catalogTotal`

**Maintain:** WebSocket path list lives in `server/services/systemReadinessCore.ts` (`GOVERNED_WEBSOCKET_ROUTES`) — sync with `grep registerWebSocketRoute server/`.

## Code map

| File | Role |
|------|------|
| `server/services/systemReadinessCore.ts` | **Canonical** probes, `TEST_CATALOG`, `buildSystemReadinessReport()`, `deriveOverallStatusAndBlockers()`, `deriveExecutionReadiness()`, `getSystemReadinessReportForExecutionGate()` (TTL cache) |
| `scripts/lib/systemReadinessCore.ts` | Re-export (CLI import stability) |
| `scripts/lib/systemReadinessPrint.ts` | Text formatters |
| `scripts/system-readiness-check.ts` | CLI (`--json`, `--governance-focus`) |
| `scripts/governance-test-readiness.ts` | Back-compat entry |
| `server/routes/platformReadinessRoutes.ts` | `GET /readiness` on mount `/api/platform` |

## Related

- [`GOVERNANCE_TEST_READINESS_V1.md`](./GOVERNANCE_TEST_READINESS_V1.md) — historical name; prefer `system:check` for new docs.
- [`GOVERNANCE_EXECUTION_PLAN_V1.md`](./GOVERNANCE_EXECUTION_PLAN_V1.md)
- `scripts/integration-readiness.ts` — tenant PMS / Boardwalk row detail

## HTTP (remote / operator)

- **`GET /api/platform/readiness`** — same JSON as the CLI (`buildSystemReadinessReport()`). Requires **`Authorization: Bearer <session>`** (`requireAuth`). Does not expose secret values (same `secretsPresence` as CLI). No Gemini API permit on this path.

**Logical route id:** `admin.platform.readiness` — see [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md).

## Execution gate (tools)

- **Hot path:** `getSystemReadinessReportForExecutionGate()` — same builder as CLI/API, with optional **in-memory TTL** (`READINESS_GATE_CACHE_MS`, default `25000`; set `0` to disable) so tool dispatch does not rebuild the full report on every call.
- **Rule:** if `executionReadiness.status === "blocked"`, `handleToolCall` returns a structured error (`system_readiness_blocked`) with `critical_blockers` from `executionReadiness.blockers`. **Degraded** (e.g. local health probe down while Gemini keys are set) does **not** block tools — matches “core engine still breathes.”

**Reviewer frame (`toolHandler.ts`):** interpret side effects against **`executionReadiness`** (core plane: DB + Gemini + local health) and **`overallStatus` / `tests.catalog`** (ops/CI npm scripts). A tool may be **runnable** while **`overallStatus`** is **degraded** (e.g. Doppler shell off for some npm rows); the runtime gate uses **`executionReadiness`**, not the full catalog.

## Future agent / tool contract

Any future **model-visible** `system_check` (or equivalent) **must** surface the **same JSON** as this plane — no duplicate probes or ad hoc summaries:

- **Server-side:** call **`buildSystemReadinessReport()`** from `server/services/systemReadinessCore.ts` and return the result (or a documented subset) to the tool response.
- **Authenticated HTTP:** proxy **`GET /api/platform/readiness`** and forward JSON — same `schemaVersion` and fields.

Do not implement a second readiness schema in prompts or client-only code; one builder, one shape — see also [`GOVERNANCE_TEST_READINESS_V1.md`](./GOVERNANCE_TEST_READINESS_V1.md) (voice/QA bundle).
