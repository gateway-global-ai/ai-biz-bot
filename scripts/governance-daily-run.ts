#!/usr/bin/env npx tsx
/**
 * Governance daily run — structured report + work plan for operators and automation.
 *
 *   npm run governance:daily
 *   npm run governance:daily -- --run-m1-tests    (slower: runs M1 battery scripts)
 *   npm run governance:daily -- --stdout-json     (print envelope only, no file write)
 *
 * @see docs-governance/canonical/GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "node:child_process";
import { buildSystemReadinessReport } from "./lib/systemReadinessCore.js";
import {
  buildReportId,
  buildSummaryCompact,
  buildSummaryLine,
  deriveWorkItemsFromReadiness,
  type GovernanceDailyReportV1,
} from "./lib/governanceDailyReport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const M1_SCRIPTS = [
  "check",
  "test:execution-mutation-gate",
  "test:execution-contract-registry",
  "test:cognition-contract",
  "test:voice-concierge-aptitude",
] as const;

function runM1Battery(): Record<string, { ok: boolean; exitCode: number; stderrTail?: string }> {
  const out: Record<string, { ok: boolean; exitCode: number; stderrTail?: string }> = {};
  for (const script of M1_SCRIPTS) {
    let stderr = "";
    try {
      execSync(`npm run ${script}`, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 600_000,
        env: process.env,
      });
      out[script] = { ok: true, exitCode: 0 };
    } catch (e: unknown) {
      const err = e as { status?: number; stderr?: Buffer | string };
      const code = typeof err.status === "number" ? err.status : 1;
      stderr =
        typeof err.stderr === "string"
          ? err.stderr
          : err.stderr != null
            ? err.stderr.toString("utf8")
            : "";
      const tail = stderr.length > 800 ? stderr.slice(-800) : stderr;
      out[script] = { ok: false, exitCode: code, stderrTail: tail || undefined };
    }
  }
  return out;
}

function renderWorkPlanMd(report: GovernanceDailyReportV1): string {
  const lines: string[] = [
    `# Governance daily work plan`,
    ``,
    `**reportId:** \`${report.reportId}\``,
    `Generated: ${report.generatedAt}`,
    `Run: ${report.runKind}`,
    ``,
    `**Summary:** ${report.summaryLine}`,
    ``,
    `**Compact:** overall=${report.summaryCompact.overallStatus} execution=${report.summaryCompact.executionReadinessStatus} P0=${report.summaryCompact.workItemCounts.p0} P1=${report.summaryCompact.workItemCounts.p1} P2=${report.summaryCompact.workItemCounts.p2}`,
    ``,
    `## Work items (derived)`,
    ``,
  ];
  const byPri = { P0: [] as typeof report.workItems, P1: [], P2: [] };
  for (const w of report.workItems) {
    byPri[w.priority].push(w);
  }
  for (const p of ["P0", "P1", "P2"] as const) {
    const bucket = byPri[p];
    if (bucket.length === 0) continue;
    lines.push(`### ${p}`, ``);
    for (const w of bucket) {
      lines.push(`- **${w.id}** (${w.category}) — ${w.title}`);
      if (w.detail) lines.push(`  - ${w.detail}`);
      if (w.suggestedCommand) lines.push(`  - \`${w.suggestedCommand}\``);
    }
    lines.push(``);
  }
  if (report.m1TestResults) {
    lines.push(`## M1 script results`, ``);
    for (const [script, r] of Object.entries(report.m1TestResults)) {
      lines.push(`- \`${script}\`: ${r.ok ? "PASS" : "FAIL"} (exit ${r.exitCode})`);
    }
    lines.push(``);
  }
  lines.push(
    `---`,
    `Readiness JSON is embedded in governance_daily_report.json (same directory).`,
    ``,
  );
  return lines.join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const runM1 = argv.includes("--run-m1-tests");
  const stdoutJson = argv.includes("--stdout-json");

  const readiness = await buildSystemReadinessReport();
  const workItems = deriveWorkItemsFromReadiness(readiness);
  const summaryLine = buildSummaryLine(readiness, workItems.length);
  const generatedAt = readiness.generatedAt;
  const reportId = buildReportId(readiness);

  let m1TestResults: GovernanceDailyReportV1["m1TestResults"];
  if (runM1) {
    console.error("[governance:daily] Running M1 battery (may take several minutes)...");
    m1TestResults = runM1Battery();
  }

  const day = generatedAt.slice(0, 10);
  const artifactRelativePath = `docs-governance/artifacts/daily/${day}/governance_daily_report.json`;

  const summaryCompact = buildSummaryCompact({
    reportId,
    generatedAt,
    readiness,
    workItems,
    ...(stdoutJson ? {} : { artifactRelativePath }),
  });

  const envelope: GovernanceDailyReportV1 = {
    schemaVersion: "1.1.0",
    reportId,
    generatedAt,
    runKind: runM1 ? "readiness_plus_m1" : "readiness_only",
    readiness,
    workItems,
    summaryLine,
    summaryCompact,
    ...(m1TestResults ? { m1TestResults } : {}),
  };

  if (stdoutJson) {
    process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
    return;
  }

  const dir = path.join(root, "docs-governance/artifacts/daily", day);
  fs.mkdirSync(dir, { recursive: true });

  const jsonPath = path.join(dir, "governance_daily_report.json");
  const mdPath = path.join(dir, "DAILY_WORK_PLAN.md");

  fs.writeFileSync(jsonPath, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdPath, renderWorkPlanMd(envelope), "utf8");

  console.log(`[governance:daily] reportId=${reportId}`);
  console.log(`[governance:daily] Wrote ${jsonPath}`);
  console.log(`[governance:daily] Wrote ${mdPath}`);
  console.log(`[governance:daily] ${summaryLine}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
