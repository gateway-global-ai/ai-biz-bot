---
status: canonical
truth_domain: qa-telemetry
scope: full-stack lifecycle test — funnel → chat → workspace provisioning
last_verified: 2026-03-26
related_phases: Phase 1 (Visitor Session), Phase 2-3 (Founder Voice), Phase 4 (Industry Funnel), Phase 5 (Workspace Agent), Phase 6 (Agent Builder)
---

# Work Log — E2E Lifecycle Telemetry Test

## Objective

Verify that every platform component from a visitor's first public touch through a provisioned workspace deployment produces a correct, queryable audit trail. No event in this chain should be invisible to the orchestration log.

**Test scenario:** A visitor finds the `/industry/nail-salon` funnel page, engages the Concierge, and an operator later triggers Google Workspace provisioning for that business. We assert that each system boundary emits telemetry that can be independently verified via SQL.

---

## Architecture under test

```
/industry/nail-salon ──► visitor_sessions (upsert)
         │
         ▼
   ConciergePanel ──► chat session ──► buyer_journey patch
         │                                     │
         │                              journey_agent (async)
         │                                     │
         ▼                                     ▼
 knowledge_artifacts                 visitor_sessions.buyer_journey
 (anti_platform_doctrine)
         │
         ▼
  Operator: POST /api/workspace-agent/provision
         │
         ├──► agent_orchestration_runs (created)
         ├──► WORKSPACE_TOOL_REGISTRY jurisdiction check
         ├──► Ollama qwen2.5-coder (structured output)
         ├──► dispatchAction() per workspace_action
         ├──► workspace_configurations (status writeback)
         └──► agent_orchestration_runs (completed/deferred)
```

---

## Telemetry checkpoints by phase

### Phase 1 — Public Funnel Entry

| Checkpoint | Table | Field | Expected Value |
|---|---|---|---|
| T1.1 | `visitor_sessions` | `buyer_journey.phase` | `"awareness"` |
| T1.2 | `visitor_sessions` | `channel` | `"web"` |
| T1.3 | `visitor_sessions` | `visitor_id` | UUID from client localStorage |
| T1.4 | `visitor_sessions` | `site_config_id` | matches nail-salon demo site |
| T1.5 | `visitor_sessions` | `buyer_journey.industry` | `"nail_salon"` (set by funnel signal) |

**Signal fired by:** `POST /api/visitor-session/:visitorId/:siteConfigId/event`
body `{ signal: "funnel_visit", industry: "nail_salon" }`

### Phase 2 — Concierge Chat Session

| Checkpoint | Table/Log | Field | Expected Value |
|---|---|---|---|
| T2.1 | `visitor_sessions` | `buyer_journey.sessionCount` | incremented by 1 |
| T2.2 | `visitor_sessions` | `buyer_journey.lastSessionAt` | within 60s of test run |
| T2.3 | Server log | `[PromptCompiler]` | contains `ANTI_PLATFORM_DOCTRINE` fragment |
| T2.4 | Server log | `[PromptCompiler]` | contains `BUYER_JOURNEY:` section |
| T2.5 | Server log | `[CGR]` | `buyerJourney.phase` = `"awareness"` |
| T2.6 | `visitor_sessions` | `buyer_journey.painPointsExpressed` | contains at least 1 entry after chat |
| T2.7 | `visitor_sessions` | `buyer_journey.phase` | may advance to `"consideration"` |

**Journey update fired by:** `PATCH /api/visitor-session/:visitorId/:siteConfigId`
body `{ painPointsExpressed: ["platform_fees"], sessionCount: 1 }`

### Phase 3 — Journey Agent Run (async worker)

| Checkpoint | Table | Field | Expected Value |
|---|---|---|---|
| T3.1 | `agent_orchestration_runs` | `source` | `"journey_agent"` |
| T3.2 | `agent_orchestration_runs` | `status` | `"completed"` |
| T3.3 | `agent_orchestration_runs` | `result.review_required` | `true` |
| T3.4 | `agent_orchestration_runs` | `result.files_touched` | `["visitor_sessions"]` |
| T3.5 | `orchestration_violations` | (no rows for this run) | empty or only pre-existing |

**Triggered by:** `POST /api/local-agent/run` with `journey_agent` agentId

### Phase 4 — Workspace Provisioning Trigger

| Checkpoint | Table | Field | Expected Value |
|---|---|---|---|
| T4.1 | `agent_orchestration_runs` | `source` | `"workspace_provision"` |
| T4.2 | `agent_orchestration_runs` | `status` | `"completed"` OR `"deferred"` (if approval gates hit) |
| T4.3 | `agent_orchestration_runs` | `result.review_required` | `true` |
| T4.4 | `agent_orchestration_runs` | `result.workspace_actions` | array length > 0 |
| T4.5 | `workspace_configurations` | `status` | `"provisioning"` → `"active"` |
| T4.6 | `workspace_configurations` | `drive_folder_id` | non-null after `drive.createFolder` |
| T4.7 | `orchestration_violations` | `violation_type` | no `"workspace_tool_unauthorized"` rows |
| T4.8 | `orchestration_violations` | `violation_type` | no `"unauthorized_domain_access"` rows |

**Triggered by:** `POST /api/workspace-agent/provision`
body `{ agentId: <workspace_agent_uuid>, siteConfigId: <site>, goal: "setup_full", businessName: "Glamour Nails" }`

---

## SQL Verification Queries

Run these against the dev database (`doppler run -- psql $DATABASE_URL`) after the test scenario:

```sql
-- T1: Confirm visitor session created with nail_salon funnel signal
SELECT visitor_id, site_config_id, channel,
       buyer_journey->>'phase'    AS phase,
       buyer_journey->>'industry' AS industry,
       first_seen_at
FROM visitor_sessions
WHERE buyer_journey->>'industry' = 'nail_salon'
ORDER BY first_seen_at DESC
LIMIT 5;

-- T2: Confirm session count incremented and pain points recorded
SELECT visitor_id,
       buyer_journey->>'sessionCount'          AS session_count,
       buyer_journey->>'lastSessionAt'         AS last_session,
       buyer_journey->'painPointsExpressed'    AS pain_points,
       buyer_journey->>'phase'                 AS phase
FROM visitor_sessions
ORDER BY last_seen_at DESC
LIMIT 5;

-- T3: Confirm journey agent orchestration run
SELECT id, source, status,
       result->>'review_required'  AS review_required,
       result->'files_touched'     AS files_touched,
       created_at, updated_at
FROM agent_orchestration_runs
WHERE source LIKE '%journey%'
ORDER BY created_at DESC
LIMIT 5;

-- T4: Confirm workspace provision run and status
SELECT id, source, status,
       result->>'review_required'              AS review_required,
       jsonb_array_length(result->'workspace_actions') AS action_count,
       created_at, updated_at
FROM agent_orchestration_runs
WHERE source = 'workspace_provision'
ORDER BY created_at DESC
LIMIT 5;

-- T4.5: Confirm workspace config status updated
SELECT id, site_config_id, status, drive_folder_id, created_at, updated_at
FROM workspace_configurations
ORDER BY updated_at DESC
LIMIT 5;

-- T4.7-8: Audit violations — should return zero rows for the test run
SELECT id, violation_type, severity, site_config_id, route_or_source, detail, created_at
FROM orchestration_violations
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## Expected Orchestration Run Chain

For a clean test, you should see exactly this chain in `agent_orchestration_runs`:

```
run_id_A  source="intelligence_provision"  status="completed"  → (swarm provision, Phase 6 AgentBuilder)
run_id_B  source="journey_agent"           status="completed"  → (journey update, Phase 3)
run_id_C  source="workspace_provision"     status="completed"  OR "deferred"
```

For run_id_C, if any tools have `requiresApproval: true` (e.g., `gmail.sendWelcome`), the status will be `"deferred"` with `review_required: true`. That is **correct behavior** — deferred is not failure.

---

## Known Boundaries and Acceptance Criteria

| # | Criterion | Pass condition |
|---|---|---|
| AC1 | No orchestration_violations from any test phase | `violation_type` rows for test run = 0 |
| AC2 | Workspace agent cannot touch voice or schema files | Jurisdiction check blocks before Ollama call |
| AC3 | Free-form Gmail body stripped | `gmail.sendWelcome` dispatched with template-resolved body only |
| AC4 | Buyer journey accumulated, not replaced | `painPointsExpressed` array grows across sessions |
| AC5 | DISC/ARCH override applied to Concierge post-provision | Agent row `dominance/influence/steadiness/conscientiousness` match AgentBuilder form |
| AC6 | All runs have `review_required: true` | No run result has `review_required: false` in local_agent_plane |
| AC7 | Sub-agent scope cannot exceed parent scope | child `allowed_domains` ⊆ parent `allowed_domains` |
| AC8 | Two-Plane boundary enforced | No `orchestration_runs` row created from a Gemini voice session directly |

---

## Runnable test script

```
doppler run -- npx tsx tests/e2e-lifecycle-telemetry.ts
```

Set environment variables before running:

| Var | Description |
|---|---|
| `BASE_URL` | Server base (default `http://localhost:3004`) |
| `SITE_ID` | Nail-salon demo siteConfigId |
| `WORKSPACE_AGENT_ID` | UUID of the `workspace_provisioning_agent` |
| `JOURNEY_AGENT_ID` | UUID of the `journey_agent` |
| `SESSION_COOKIE` | Auth cookie for admin endpoints (`requireAuth`) |

---

## Related

- [`INTERNAL_AGENT_CREATION_DOCTRINE.md`](./canonical/INTERNAL_AGENT_CREATION_DOCTRINE.md)
- [`SOVEREIGN_OS_V1_SPEC.md`](./canonical/SOVEREIGN_OS_V1_SPEC.md)
- [`AGENT_SWARM_DEPLOYMENT_RUNBOOK.md`](./canonical/AGENT_SWARM_DEPLOYMENT_RUNBOOK.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./canonical/EXECUTION_PLANE_BOUNDARY_SPEC.md)
- `tests/e2e-lifecycle-telemetry.ts` — executable harness for this plan
