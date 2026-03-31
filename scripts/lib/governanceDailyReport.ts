/**
 * Governance daily report envelope + work-item derivation.
 * @see docs-governance/canonical/GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md
 */
import { createHash, randomBytes } from "node:crypto";
import type { SystemReadinessReport } from "../../server/services/systemReadinessCore.js";

export type GovernanceWorkItemPriority = "P0" | "P1" | "P2";

export type GovernanceWorkItemCategory =
  | "environment"
  | "catalog"
  | "execution"
  | "live_scenario"
  | "manual";

export interface GovernanceWorkItemV1 {
  id: string;
  priority: GovernanceWorkItemPriority;
  category: GovernanceWorkItemCategory;
  title: string;
  detail?: string;
  suggestedCommand?: string;
}

/** Dashboards / “latest run” queries — store alongside full envelope in Phase 2 persistence. */
export interface GovernanceDailySummaryCompactV1 {
  reportId: string;
  generatedAt: string;
  environmentLabel: string;
  overallStatus: SystemReadinessReport["overallStatus"];
  executionReadinessStatus: SystemReadinessReport["executionReadiness"]["status"];
  workItemCounts: { p0: number; p1: number; p2: number; total: number };
  /** First N P0 titles for alerts (cap 12). */
  p0Titles: string[];
  catalogRunnable: number;
  catalogTotal: number;
  /** Repo-relative path when written to disk, e.g. `docs-governance/artifacts/daily/YYYY-MM-DD/governance_daily_report.json`. */
  artifactRelativePath?: string;
}

export interface GovernanceDailyReportV1 {
  /** Bump when envelope fields change materially (Phase 2 APIs should key on this). */
  schemaVersion: "1.1.0";
  /** Stable id: environment + date + time (UTC) + short hash (unique per run). */
  reportId: string;
  /** Same as `readiness.generatedAt` — single clock for the run. */
  generatedAt: string;
  runKind: "readiness_only" | "readiness_plus_m1";
  readiness: SystemReadinessReport;
  workItems: GovernanceWorkItemV1[];
  summaryLine: string;
  summaryCompact: GovernanceDailySummaryCompactV1;
  m1TestResults?: Record<string, { ok: boolean; exitCode: number; stderrTail?: string }>;
}

/**
 * Stable report id for storage and APIs: `govdaily_{env}_{YYYYMMDD}THHmmssZ_{hash10}`.
 * Hash includes nonce so two runs in the same second do not collide.
 */
export function buildReportId(readiness: SystemReadinessReport): string {
  const env =
    readiness.provenance.environmentLabel.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 48) || "unknown";
  const d = readiness.generatedAt;
  const dateCompact = d.slice(0, 10).replace(/-/g, "");
  const timeCompact = d.slice(11, 19).replace(/:/g, "");
  const nonce = randomBytes(8).toString("hex");
  const h = createHash("sha256")
    .update(
      `${d}|${readiness.provenance.gitCommit ?? ""}|${readiness.provenance.hostname}|${env}|${nonce}`,
    )
    .digest("hex")
    .slice(0, 10);
  return `govdaily_${env}_${dateCompact}T${timeCompact}Z_${h}`;
}

export function buildSummaryCompact(input: {
  reportId: string;
  generatedAt: string;
  readiness: SystemReadinessReport;
  workItems: GovernanceWorkItemV1[];
  artifactRelativePath?: string;
}): GovernanceDailySummaryCompactV1 {
  let p0 = 0;
  let p1 = 0;
  let p2 = 0;
  const p0Titles: string[] = [];
  for (const w of input.workItems) {
    if (w.priority === "P0") {
      p0 += 1;
      if (p0Titles.length < 12) p0Titles.push(w.title);
    } else if (w.priority === "P1") p1 += 1;
    else p2 += 1;
  }
  return {
    reportId: input.reportId,
    generatedAt: input.generatedAt,
    environmentLabel: input.readiness.provenance.environmentLabel,
    overallStatus: input.readiness.overallStatus,
    executionReadinessStatus: input.readiness.executionReadiness.status,
    workItemCounts: { p0, p1, p2, total: input.workItems.length },
    p0Titles,
    catalogRunnable: input.readiness.summary.catalogRunnable,
    catalogTotal: input.readiness.summary.catalogTotal,
    ...(input.artifactRelativePath ? { artifactRelativePath: input.artifactRelativePath } : {}),
  };
}

export function deriveWorkItemsFromReadiness(report: SystemReadinessReport): GovernanceWorkItemV1[] {
  const items: GovernanceWorkItemV1[] = [];
  let n = 0;
  const add = (partial: Omit<GovernanceWorkItemV1, "id">) => {
    n += 1;
    items.push({ id: `wi-${String(n).padStart(3, "0")}`, ...partial });
  };

  if (report.overallStatus === "blocked") {
    for (const line of report.criticalBlockers) {
      add({
        priority: "P0",
        category: "environment",
        title: `Critical blocker: ${line}`,
        detail: "overallStatus is blocked — resolve before claiming green platform state.",
      });
    }
  }

  if (report.executionReadiness.status !== "runnable") {
    for (const b of report.executionReadiness.blockers) {
      add({
        priority: "P0",
        category: "execution",
        title: `Execution plane: ${b}`,
        detail: "executionReadiness governs tool/runtime gate; fix DB, Gemini keys, or local API as indicated.",
      });
    }
  }

  if (!report.database.connected && report.database.state !== "no_url") {
    add({
      priority: "P0",
      category: "environment",
      title: "Database unreachable",
      detail: report.database.detail,
    });
  }

  const catalog = report.tests.catalog;
  for (const [script, row] of Object.entries(catalog)) {
    if (row.status === "blocked") {
      add({
        priority: "P1",
        category: "catalog",
        title: `Test/catalog blocked: ${script}`,
        detail: row.reason,
        suggestedCommand: `npm run ${script}`,
      });
    } else if (row.status === "degraded") {
      add({
        priority: "P2",
        category: "catalog",
        title: `Degraded: ${script}`,
        detail: row.reason,
        suggestedCommand: row.command,
      });
    }
  }

  const live = report.tests.scenarios.live_voice_browser;
  if (live.status === "blocked") {
    for (const b of live.blockers) {
      add({
        priority: "P2",
        category: "live_scenario",
        title: `Live browser voice: ${b}`,
        detail: "Manual Live QA may be blocked until resolved.",
      });
    }
  } else if (live.status === "degraded") {
    add({
      priority: "P2",
      category: "live_scenario",
      title: "Live browser voice scenario degraded",
      detail: live.blockers.join("; ") || undefined,
    });
  }

  return items;
}

export function buildSummaryLine(report: SystemReadinessReport, workCount: number): string {
  return `overall=${report.overallStatus} execution=${report.executionReadiness.status} workItems=${workCount} catalog ${report.summary.catalogRunnable}/${report.summary.catalogTotal} runnable`;
}
