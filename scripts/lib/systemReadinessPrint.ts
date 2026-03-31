import {
  rowStatus,
  TEST_CATALOG,
  type SystemReadinessReport,
} from "./systemReadinessCore.js";

export function printFullTextReport(r: SystemReadinessReport): void {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  SYSTEM READINESS CHECK (SYSTEM_READINESS_CHECK v1)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log("PROVENANCE\n");
  console.log(`  generatedAt        ${r.generatedAt}`);
  console.log(`  hostname           ${r.provenance.hostname}`);
  console.log(`  environmentLabel   ${r.provenance.environmentLabel}`);
  console.log(`  gitCommit          ${r.provenance.gitCommit ?? "unavailable"}`);
  console.log(`  overallStatus      ${r.overallStatus}`);
  console.log(
    `  executionReadiness ${r.executionReadiness.status}  (${r.executionReadiness.blockers.join("; ") || "none"})`,
  );
  if (r.criticalBlockers.length > 0) {
    console.log("  criticalBlockers (when overall blocked)");
    for (const line of r.criticalBlockers) {
      console.log(`    - ${line}`);
    }
  }

  console.log("\nENVIRONMENT\n");
  console.log(`  Node            ${r.environment.nodeVersion}`);
  console.log(`  CWD             ${r.environment.cwd}`);
  console.log(`  Doppler CLI     ${r.environment.dopplerCli ? "installed" : "not found"}`);
  console.log(
    `  Doppler shell   ${r.environment.dopplerShell ? "active" : "not detected — use doppler run or export env"}`,
  );

  console.log("\nSECRETS (presence only, not values)\n");
  for (const [k, v] of Object.entries(r.secretsPresence)) {
    console.log(`  ${k.padEnd(22)} ${v}`);
  }

  console.log("\nVOICE / TRANSPORT (declared routes + local probe)\n");
  console.log(`  Gemini keys+model   ${r.voice.geminiConfigured ? "OK" : "incomplete"}`);
  console.log(`  WebSocket routes    ${r.voice.websocketRoutesRegistered.join(", ")}`);
  console.log(
    `  Local API           ${r.voice.localApi.status === "up" ? `up :${r.voice.localApi.port} (HTTP ${r.voice.localApi.httpStatus})` : `down :${r.voice.localApi.port}${r.voice.localApi.detail ? ` — ${r.voice.localApi.detail}` : ""}`}`,
  );
  console.log(
    `  Live browser E2E    ${r.tests.scenarios.live_voice_browser.status}  blockers: ${r.tests.scenarios.live_voice_browser.blockers.join("; ") || "none"}`,
  );

  console.log("\nINTEGRATIONS (env slice)\n");
  console.log(`  Twilio            ${r.integrations.twilio}`);
  console.log(`  Stripe            ${r.integrations.stripe}`);
  console.log(`  Cloudbeds (global) ${r.integrations.cloudbeds}  (tenant creds usually in DB)`);

  console.log("\nDATABASE\n");
  console.log(
    `  Connected         ${r.database.connected} (${r.database.state})${r.database.detail ? ` — ${r.database.detail.slice(0, 100)}` : ""}`,
  );
  console.log(
    `  Counts            site_configs=${r.database.siteConfigsCount ?? "—"}  agents=${r.database.agentsCount ?? "—"}`,
  );

  console.log(`\nPROCESSES\n  PM2               ${r.processes.pm2Summary}\n`);

  console.log("───────────────────────────────────────────────────────────────────");
  console.log("  NPM TEST CATALOG (runnable vs blocked)\n");

  const dbState = r.database.state;
  const inD = r.environment.dopplerShell;
  const dCli = r.environment.dopplerCli;

  for (const entry of TEST_CATALOG) {
    const row = rowStatus(entry, dbState, inD, dCli);
    const flag =
      row.status === "blocked" ? "BLOCKED " : row.status === "degraded" ? "DEGRADED" : "RUNNABLE";
    console.log(`  [${flag}] ${entry.script}`);
    console.log(`           ${entry.description}`);
    if (entry.notes) console.log(`           Note: ${entry.notes}`);
    console.log(`           → ${row.command}`);
    if (row.reason !== "OK") {
      console.log(`           (${row.reason})`);
    }
    console.log("");
  }

  console.log("───────────────────────────────────────────────────────────────────");
  console.log("GOVERNED SEQUENCE (before batch tests / voice QA)\n");
  console.log("  1. npm run system:check");
  console.log("  2. npm run check && npm run test:execution-mutation-gate && npm run test:voice-concierge-aptitude");
  console.log("  3. npm run integration:readiness (or :local)");
  console.log("  4. Manual Live session if scenarios.live_voice_browser.status === ready\n");

  console.log(
    `Summary: ${r.summary.catalogRunnable} runnable, ${r.summary.catalogDegraded} degraded, ${r.summary.catalogBlocked} blocked (${r.summary.catalogTotal} total).\n`,
  );
}

export function printGovernancePreflightOnly(r: SystemReadinessReport): void {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  GOVERNANCE TEST READINESS (preflight)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log("SYSTEM PLANE\n");
  console.log(`  overallStatus     ${r.overallStatus}`);
  console.log(
    `  executionReadiness ${r.executionReadiness.status} — ${r.executionReadiness.blockers.join("; ") || "ok"}`,
  );
  if (r.criticalBlockers.length > 0) {
    console.log("  criticalBlockers");
    for (const line of r.criticalBlockers) {
      console.log(`    - ${line}`);
    }
  }
  console.log(`  Node              ${r.environment.nodeVersion}`);
  console.log(`  CWD               ${r.environment.cwd}`);
  console.log(`  Doppler CLI       ${r.environment.dopplerCli ? "installed" : "not found"}`);
  console.log(
    `  Doppler shell     ${r.environment.dopplerShell ? "active (env injected)" : "not detected — export secrets or use doppler run"}`,
  );
  console.log(`  DATABASE_URL      ${r.secretsPresence.DATABASE_URL === "set" ? `set` : "missing"}`);
  console.log(
    `  DB connectivity   ${r.database.connected ? "ok" : r.database.state}${r.database.detail ? ` (${r.database.detail.slice(0, 120)})` : ""}`,
  );
  console.log(`  GEMINI_API_KEY    ${r.secretsPresence.GEMINI_API_KEY}`);
  console.log(`  GEMINI_MODEL_ID   ${r.secretsPresence.GEMINI_MODEL_ID}`);
  console.log(`  PORT              ${process.env.PORT || "3004 (default)"}`);
  console.log(
    `  Local API         ${r.voice.localApi.status === "up" ? `up (http 127.0.0.1:${r.voice.localApi.port}/api/health → ${r.voice.localApi.httpStatus})` : `down (port ${r.voice.localApi.port})${r.voice.localApi.detail ? ` — ${r.voice.localApi.detail}` : ""}`}`,
  );
  console.log(`  PM2               ${r.processes.pm2Summary}`);

  console.log("\n───────────────────────────────────────────────────────────────────");
  console.log("  TEST CATALOG (runnable now vs blocked)\n");

  const inD = r.environment.dopplerShell;
  const dCli = r.environment.dopplerCli;
  let blocked = 0;
  let degraded = 0;
  for (const entry of TEST_CATALOG) {
    const row = rowStatus(entry, r.database.state, inD, dCli);
    if (row.status === "blocked") blocked++;
    if (row.status === "degraded") degraded++;
    const flag =
      row.status === "blocked" ? "BLOCKED " : row.status === "degraded" ? "DEGRADED" : "RUNNABLE";
    console.log(`  [${flag}] ${entry.script}`);
    console.log(`           ${entry.description}`);
    if (entry.notes) console.log(`           Note: ${entry.notes}`);
    console.log(`           → ${row.command}`);
    if (row.reason !== "OK") {
      console.log(`           (${row.reason})`);
    }
    console.log("");
  }

  console.log("───────────────────────────────────────────────────────────────────");
  console.log("RECOMMENDED GOVERNED SEQUENCE (after pull / before voice QA)\n");
  console.log("  1. npm run system:check   (or governance:test-readiness for this layout)");
  console.log("  2. npm run check");
  console.log("  3. npm run test:execution-mutation-gate");
  console.log("  4. npm run test:voice-concierge-aptitude");
  console.log("  5. npm run integration:readiness   (or integration:readiness:local)");
  console.log("  6. Manual: browser Live session on your deployed/stage URL\n");

  console.log(
    `Summary: ${TEST_CATALOG.length - blocked - degraded} runnable, ${degraded} degraded, ${blocked} blocked (${TEST_CATALOG.length} total).\n`,
  );

  if (blocked > 0) {
    if (r.database.state !== "ok") {
      console.log("Database: set DATABASE_URL and verify connectivity.\n");
    }
    if (!r.environment.dopplerCli) {
      console.log("Doppler: install CLI or use escape-hatch commands / :local npm scripts where listed.\n");
    }
  }
}
