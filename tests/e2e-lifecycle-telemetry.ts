/**
 * E2E Lifecycle Telemetry Test
 *
 * Simulates the full platform lifecycle for a nail-salon visitor:
 *   Phase 1 — Public funnel entry (/industry/nail-salon → visitor_sessions upsert)
 *   Phase 2 — Concierge chat session (buyer journey update)
 *   Phase 3 — Journey agent run (local worker, orchestration run)
 *   Phase 4 — Workspace provisioning trigger (workspace_agent, tool dispatch, DB writeback)
 *
 * Then verifies all expected telemetry rows in the database.
 *
 * Usage (server must be running):
 *   SITE_ID=<uuid> WORKSPACE_AGENT_ID=<uuid> JOURNEY_AGENT_ID=<uuid> \
 *   SESSION_COOKIE="connect.sid=..." \
 *   doppler run -- npx tsx tests/e2e-lifecycle-telemetry.ts
 *
 * Optional:
 *   BASE_URL=http://localhost:3004   (default)
 *   DRY_RUN=true                     (print HTTP calls without executing)
 *
 * Reference plan: docs-governance/worklogs/WL-LIFECYCLE-TELEMETRY-TEST.md
 */

import { db } from "../server/db.js";
import {
  visitorSessions,
  agentOrchestrationRuns,
  workspaceConfigurations,
} from "../shared/schema.js";
import { eq, and, gt, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL        = process.env.BASE_URL          ?? "http://localhost:3004";
const SITE_ID         = process.env.SITE_ID           ?? "";
const WORKSPACE_AGENT_ID = process.env.WORKSPACE_AGENT_ID ?? "";
const JOURNEY_AGENT_ID   = process.env.JOURNEY_AGENT_ID   ?? "";
const SESSION_COOKIE  = process.env.SESSION_COOKIE    ?? "";
const DRY_RUN         = process.env.DRY_RUN           === "true";

// Synthetic visitor generated fresh each run so we don't contaminate existing sessions
const TEST_VISITOR_ID = `test-${randomUUID().slice(0, 8)}`;
const TEST_RUN_AT     = new Date().toISOString();

// ── Result tracking ───────────────────────────────────────────────────────────

interface CheckResult {
  name:   string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function pass(name: string, detail = "") {
  results.push({ name, passed: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail = "") {
  results.push({ name, passed: false, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(label: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("─".repeat(60));
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function call(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${BASE_URL}${path}`;

  if (DRY_RUN) {
    console.log(`    [DRY] ${method} ${url}`, body ? JSON.stringify(body).slice(0, 120) : "");
    return { ok: true, status: 200, data: { _dry: true } };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SESSION_COOKIE) headers["Cookie"] = SESSION_COOKIE;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: unknown;
    try { data = await res.json(); } catch { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

// ── Phase 1: Public funnel entry ──────────────────────────────────────────────

async function runPhase1() {
  section("Phase 1 — Public Funnel Entry (/industry/nail-salon)");

  if (!SITE_ID) {
    fail("T1.0 — config", "SITE_ID env var not set — skipping Phase 1 live calls");
    return;
  }

  // T1.1 — GET (upsert-on-read) creates a visitor session
  const getRes = await call("GET", `/api/visitor-session/${TEST_VISITOR_ID}/${SITE_ID}`);
  if (getRes.ok) {
    pass("T1.1 — upsert-on-read returns 200", `visitorId=${TEST_VISITOR_ID}`);
  } else {
    fail("T1.1 — upsert-on-read", `status=${getRes.status} ${JSON.stringify(getRes.data).slice(0,120)}`);
  }

  // T1.2 — Fire a funnel visit signal
  const signalRes = await call(
    "POST",
    `/api/visitor-session/${TEST_VISITOR_ID}/${SITE_ID}/event`,
    { signal: "funnel_visit", industry: "nail_salon", page: "/industry/nail-salon" },
  );
  if (signalRes.ok) {
    pass("T1.2 — funnel_visit signal accepted");
  } else {
    fail("T1.2 — funnel_visit signal", `status=${signalRes.status}`);
  }

  // T1.3 — Fire a CTA click signal (interest signal, phase advancement)
  const ctaRes = await call(
    "POST",
    `/api/visitor-session/${TEST_VISITOR_ID}/${SITE_ID}/event`,
    { signal: "cta_click", ctaLabel: "Test Drive the AI" },
  );
  if (ctaRes.ok) {
    pass("T1.3 — cta_click signal accepted");
  } else {
    fail("T1.3 — cta_click signal", `status=${ctaRes.status}`);
  }

  // T1.4 — DB: verify session row exists with correct fields
  if (!DRY_RUN) {
    const rows = await db
      .select()
      .from(visitorSessions)
      .where(and(
        eq(visitorSessions.visitorId, TEST_VISITOR_ID),
        eq(visitorSessions.siteConfigId, SITE_ID),
      ))
      .limit(1);

    if (rows.length === 1) {
      const row = rows[0];
      pass("T1.4 — visitor_sessions row exists in DB");
      const journey = row.buyerJourney as Record<string, unknown> | null;
      if (journey?.phase === "awareness") {
        pass("T1.5 — buyer_journey.phase = awareness");
      } else {
        fail("T1.5 — buyer_journey.phase", `got: ${journey?.phase}`);
      }
    } else {
      fail("T1.4 — visitor_sessions row exists in DB", "0 rows found");
    }
  }
}

// ── Phase 2: Concierge chat simulation ───────────────────────────────────────

async function runPhase2() {
  section("Phase 2 — Concierge Chat Session (buyer journey update)");

  if (!SITE_ID) {
    fail("T2.0 — config", "SITE_ID not set — skipping Phase 2");
    return;
  }

  // Simulate what ConciergePanel does on disconnect: PATCH journey
  const patchRes = await call(
    "PATCH",
    `/api/visitor-session/${TEST_VISITOR_ID}/${SITE_ID}`,
    {
      phase:                 "consideration",
      painPointsExpressed:   ["platform_fees", "lack_of_control"],
      needsExpressed:        ["booking_automation", "own_customer_data"],
      sessionCount:          1,
      lastSessionAt:         TEST_RUN_AT,
    },
  );

  if (patchRes.ok) {
    pass("T2.1 — POST-session PATCH accepted (session count +1, pain points merged)");
  } else {
    fail("T2.1 — POST-session PATCH", `status=${patchRes.status} ${JSON.stringify(patchRes.data).slice(0,100)}`);
  }

  // T2.2 — DB: verify journey was updated with accumulated arrays
  if (!DRY_RUN) {
    const rows = await db
      .select()
      .from(visitorSessions)
      .where(and(
        eq(visitorSessions.visitorId, TEST_VISITOR_ID),
        eq(visitorSessions.siteConfigId, SITE_ID),
      ))
      .limit(1);

    if (rows.length === 1) {
      const journey = rows[0].buyerJourney as Record<string, unknown> | null;

      if (journey?.phase === "consideration") {
        pass("T2.2 — buyer_journey.phase advanced to consideration");
      } else {
        fail("T2.2 — buyer_journey.phase", `got: ${journey?.phase}`);
      }

      const pain = (journey?.painPointsExpressed as string[] | undefined) ?? [];
      if (pain.includes("platform_fees")) {
        pass("T2.3 — painPointsExpressed accumulated: platform_fees present");
      } else {
        fail("T2.3 — painPointsExpressed", `got: ${JSON.stringify(pain)}`);
      }

      if (Number(journey?.sessionCount) >= 1) {
        pass("T2.4 — sessionCount >= 1");
      } else {
        fail("T2.4 — sessionCount", `got: ${journey?.sessionCount}`);
      }
    } else {
      fail("T2.2 — visitor_sessions row exists post-patch", "0 rows found");
    }
  }
}

// ── Phase 3: Journey agent run ────────────────────────────────────────────────

async function runPhase3() {
  section("Phase 3 — Journey Agent Run (local worker)");

  if (!JOURNEY_AGENT_ID || !SITE_ID) {
    fail("T3.0 — config", "JOURNEY_AGENT_ID or SITE_ID not set — skipping Phase 3");
    return;
  }

  if (!SESSION_COOKIE && !DRY_RUN) {
    fail("T3.0 — auth", "SESSION_COOKIE not set — journey_agent requires auth");
    return;
  }

  const runRes = await call("POST", "/api/local-agent/run", {
    agentId:     JOURNEY_AGENT_ID,
    siteConfigId: SITE_ID,
    task:        `Analyze the following session end state and update the buyer journey.
Visitor ${TEST_VISITOR_ID} just completed a Concierge session on /industry/nail-salon.
They expressed concerns about platform fees and want to own their customer data.
Recommend phase progression if appropriate.
Output as governed JSON contract.`,
    taskType:    "journey_analysis",
  });

  if (runRes.ok) {
    const data = runRes.data as Record<string, unknown>;
    pass("T3.1 — journey_agent /api/local-agent/run accepted", `runId=${data?.orchestrationRunId ?? "unknown"}`);

    if (data?.output && typeof (data.output as Record<string, unknown>)?.review_required !== "undefined") {
      if ((data.output as Record<string, unknown>).review_required === true) {
        pass("T3.2 — output.review_required = true");
      } else {
        fail("T3.2 — output.review_required", `got: ${(data.output as Record<string, unknown>).review_required}`);
      }
    } else {
      fail("T3.2 — output.review_required", "field missing from response");
    }

    // DB: check orchestration run was written
    if (!DRY_RUN && data?.orchestrationRunId) {
      const runs = await db
        .select()
        .from(agentOrchestrationRuns)
        .where(eq(agentOrchestrationRuns.id, String(data.orchestrationRunId)))
        .limit(1);

      if (runs.length === 1) {
        pass("T3.3 — orchestration_run row exists in DB", `status=${runs[0].status}`);
        if (runs[0].status === "completed" || runs[0].status === "blocked") {
          pass("T3.4 — orchestration_run in terminal state");
        } else {
          fail("T3.4 — orchestration_run terminal state", `got: ${runs[0].status}`);
        }
      } else {
        fail("T3.3 — orchestration_run row exists in DB", "0 rows found");
      }
    }
  } else {
    fail("T3.1 — journey_agent run", `status=${runRes.status} ${JSON.stringify(runRes.data).slice(0,120)}`);
  }
}

// ── Phase 4: Workspace provisioning trigger ───────────────────────────────────

async function runPhase4() {
  section("Phase 4 — Workspace Provisioning (workspace_provisioning_agent)");

  if (!WORKSPACE_AGENT_ID || !SITE_ID) {
    fail("T4.0 — config", "WORKSPACE_AGENT_ID or SITE_ID not set — skipping Phase 4");
    return;
  }

  if (!SESSION_COOKIE && !DRY_RUN) {
    fail("T4.0 — auth", "SESSION_COOKIE not set — workspace provisioning requires auth");
    return;
  }

  const provisionRes = await call("POST", "/api/workspace-agent/provision", {
    agentId:      WORKSPACE_AGENT_ID,
    siteConfigId: SITE_ID,
    goal:         "verify_only",   // safe for simulation — only verification tools, no mutations
    businessName: "Glamour Nails (Test)",
  });

  if (provisionRes.ok) {
    const data = provisionRes.data as Record<string, unknown>;
    const runId = data?.orchestrationRunId as string | undefined;
    pass("T4.1 — POST /api/workspace-agent/provision accepted", `runId=${runId ?? "unknown"}`);

    // Check review_required
    if (data?.review_required === true) {
      pass("T4.2 — review_required = true on provision response");
    } else {
      fail("T4.2 — review_required", `got: ${data?.review_required}`);
    }

    // DB: verify orchestration run
    if (!DRY_RUN && runId) {
      const runs = await db
        .select()
        .from(agentOrchestrationRuns)
        .where(eq(agentOrchestrationRuns.id, runId))
        .limit(1);

      if (runs.length === 1) {
        const run = runs[0];
        pass("T4.3 — orchestration_run row exists in DB", `status=${run.status}`);

        const validTerminals = ["completed", "deferred", "failed", "blocked"];
        if (validTerminals.includes(run.status)) {
          pass("T4.4 — orchestration_run in terminal state", run.status);
        } else {
          fail("T4.4 — orchestration_run terminal state", `got: ${run.status} (still running?)`);
        }

        // Check result contract
        const result = run.result as Record<string, unknown> | null;
        if (result?.review_required === true) {
          pass("T4.5 — run.result.review_required = true in DB");
        } else {
          fail("T4.5 — run.result.review_required", `got: ${result?.review_required}`);
        }

        if (Array.isArray(result?.workspace_actions)) {
          pass("T4.6 — run.result.workspace_actions is array", `length=${(result.workspace_actions as unknown[]).length}`);
        } else {
          fail("T4.6 — run.result.workspace_actions", "not an array or missing");
        }
      } else {
        fail("T4.3 — orchestration_run row in DB", "0 rows found");
      }
    }

    // T4.7 — Poll status endpoint
    if (runId) {
      const statusRes = await call("GET", `/api/workspace-agent/status/${runId}`);
      if (statusRes.ok) {
        pass("T4.7 — GET /api/workspace-agent/status/:runId = 200");
      } else {
        fail("T4.7 — GET status endpoint", `status=${statusRes.status}`);
      }
    }
  } else {
    fail("T4.1 — workspace provision request", `status=${provisionRes.status} ${JSON.stringify(provisionRes.data).slice(0,120)}`);
  }
}

// ── Phase 5: Violation audit (zero-violation gate) ────────────────────────────

async function runViolationAudit() {
  section("Phase 5 — Violation Audit (zero-violation gate)");

  if (DRY_RUN) {
    pass("T5.0 — violation audit skipped in DRY_RUN mode");
    return;
  }

  // Use raw SQL via drizzle execute to query violations from last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  try {
    const rows = await db.execute<{
      id: string;
      violation_type: string;
      severity: string;
      route_or_source: string;
    }>(
      // @ts-expect-error drizzle execute with template literal
      `SELECT id, violation_type, severity, route_or_source
       FROM orchestration_violations
       WHERE created_at > ${tenMinutesAgo.toISOString()}::timestamptz
       ORDER BY created_at DESC
       LIMIT 20`
    );

    const violations = Array.isArray(rows) ? rows : (rows as { rows: typeof rows }).rows ?? [];

    if (violations.length === 0) {
      pass("T5.1 — zero orchestration_violations in last 10 min");
    } else {
      const critical = violations.filter((v) => v.severity === "high" || v.severity === "critical");
      if (critical.length > 0) {
        fail(`T5.1 — ${critical.length} critical/high violations found`, critical.map((v) => `${v.violation_type}@${v.route_or_source}`).join(", "));
      } else {
        pass(`T5.1 — ${violations.length} low/medium violations (non-blocking)`, violations.map((v) => v.violation_type).join(", "));
      }
    }
  } catch (err) {
    fail("T5.1 — could not query orchestration_violations", String(err).slice(0, 100));
  }
}

// ── Summary report ────────────────────────────────────────────────────────────

function printSummary() {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const skipped = results.filter((r) => r.detail.includes("not set") || r.detail.includes("skipping")).length;

  console.log(`\n${"═".repeat(60)}`);
  console.log("  E2E LIFECYCLE TELEMETRY — RESULTS");
  console.log("═".repeat(60));
  console.log(`  Total checks : ${results.length}`);
  console.log(`  Passed       : ${passed}`);
  console.log(`  Failed       : ${failed}`);
  console.log(`  Skipped/Warn : ${skipped}`);
  console.log(`  Test visitor : ${TEST_VISITOR_ID}`);
  console.log(`  Run at       : ${TEST_RUN_AT}`);

  if (failed > 0) {
    console.log("\n  FAILED CHECKS:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`    ✗ ${r.name} — ${r.detail}`);
    });
  }

  console.log(`\n  ${"─".repeat(56)}`);
  console.log("  SQL QUERIES TO VERIFY MANUALLY:");
  console.log(`  ${"─".repeat(56)}`);
  console.log(`
  -- Visitor session created by this test run:
  SELECT visitor_id, buyer_journey->>'phase' AS phase,
         buyer_journey->'painPointsExpressed' AS pain_points,
         buyer_journey->>'sessionCount' AS sessions
  FROM visitor_sessions
  WHERE visitor_id = '${TEST_VISITOR_ID}';

  -- All orchestration runs from last 10 minutes:
  SELECT id, source, status, result->>'review_required' AS review_required
  FROM agent_orchestration_runs
  WHERE created_at > NOW() - INTERVAL '10 minutes'
  ORDER BY created_at DESC;

  -- Any violations (should be zero for a clean run):
  SELECT violation_type, severity, route_or_source, detail
  FROM orchestration_violations
  WHERE created_at > NOW() - INTERVAL '10 minutes';
  `);

  console.log("═".repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  GATEWAY GLOBAL AI — E2E LIFECYCLE TELEMETRY TEST");
  console.log("═".repeat(60));
  console.log(`  Base URL      : ${BASE_URL}`);
  console.log(`  SITE_ID       : ${SITE_ID || "(not set — live DB checks skipped)"}`);
  console.log(`  Workspace Agt : ${WORKSPACE_AGENT_ID || "(not set)"}`);
  console.log(`  Journey Agt   : ${JOURNEY_AGENT_ID || "(not set)"}`);
  console.log(`  Auth cookie   : ${SESSION_COOKIE ? "provided" : "(not set — auth endpoints skipped)"}`);
  console.log(`  Dry run       : ${DRY_RUN}`);
  console.log(`  Visitor ID    : ${TEST_VISITOR_ID}`);

  await runPhase1();
  await runPhase2();
  await runPhase3();
  await runPhase4();
  await runViolationAudit();

  printSummary();
}

main().catch((err) => {
  console.error("[lifecycle-test] Fatal error:", err);
  process.exit(2);
});
