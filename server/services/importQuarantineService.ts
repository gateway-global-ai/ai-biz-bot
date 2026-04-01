/**
 * Import Quarantine Service — governed zero-trust import pipeline.
 *
 * Implements the 9-phase Clean Room Extraction protocol:
 *   1. Quarantine  → isolate in /tmp
 *   2. Scan        → static security analysis
 *   3. Recon       → identify extractable artifacts
 *   4. Extract     → produce documentation report
 *   5. SDK Mode    → generate minimal adapter (not install)
 *   6. Certify     → create knowledge items at unverified
 *   7. Policy      → check PolicyDecision before use
 *   8. Incinerate  → rm -rf quarantine dir
 *   9. Audit       → record everything
 *
 * Doctrine 12: External code is knowledge + risk, not capability.
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../db";
import { importQuarantineRuns } from "@shared/schema";
import {
  type CreateQuarantineRunRequest,
  type ImportScanResult,
  type ExtractedArtifact,
  type QuarantineRunState,
  type SuspiciousPattern,
  type RiskLevel,
  type PromotionDecision,
  FORBIDDEN_SCAN_PATTERNS,
  QUARANTINE_ALLOWED_EXTENSIONS,
  QUARANTINE_FORBIDDEN_FILES,
} from "@shared/importQuarantineContract";
import { persistOrchestrationViolation } from "./agentOrchestration";

const QUARANTINE_BASE = "/tmp";

// ── Quarantine path management ────────────────────────────────────────────────

function quarantinePath(runId: string): string {
  return path.join(QUARANTINE_BASE, `_quarantine_extraction_${runId}`);
}

async function ensureQuarantineDir(runId: string): Promise<string> {
  const dir = quarantinePath(runId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// ── State transition ──────────────────────────────────────────────────────────

async function transitionState(
  runId: string,
  state: QuarantineRunState,
  extra?: Record<string, unknown>,
): Promise<void> {
  await db
    .update(importQuarantineRuns)
    .set({
      state,
      ...extra,
      updatedAt: new Date(),
    })
    .where(eq(importQuarantineRuns.id, runId));
}

// ── Phase 1: Create quarantine run ────────────────────────────────────────────

export async function createQuarantineRun(
  request: CreateQuarantineRunRequest,
): Promise<{ runId: string; quarantinePath: string }> {
  const dir = await ensureQuarantineDir(crypto.randomUUID());

  const [run] = await db
    .insert(importQuarantineRuns)
    .values({
      sourceUri: request.sourceUri,
      sourceType: request.sourceType ?? "external",
      sdkMode: request.sdkMode ?? "extract_adapter",
      state: "quarantined",
      quarantinePath: dir,
      siteConfigId: request.siteConfigId ?? null,
      orchestrationRunId: request.orchestrationRunId ?? null,
      intentExecutionId: request.intentExecutionId ?? null,
      requestedBy: request.requestedBy ?? null,
    })
    .returning({ id: importQuarantineRuns.id });

  return { runId: run.id, quarantinePath: dir };
}

// ── Phase 2: Security scan ────────────────────────────────────────────────────

export async function scanQuarantine(runId: string): Promise<ImportScanResult> {
  await transitionState(runId, "scanning");

  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, runId))
    .limit(1);

  if (!run) throw new Error("quarantine_run_not_found");

  const dir = run.quarantinePath;
  const exists = await fs.stat(dir).catch(() => null);
  if (!exists) {
    await transitionState(runId, "failed", {
      violations: ["quarantine_dir_missing"],
    });
    throw new Error("quarantine_dir_missing");
  }

  const allFiles = await walkDirectory(dir);
  const suspiciousPatterns: SuspiciousPattern[] = [];
  const suspiciousFiles: string[] = [];
  const flags: string[] = [];
  let totalSizeBytes = 0;
  const dependencySummary: Record<string, string> = {};
  let license = "unknown";

  for (const filePath of allFiles) {
    const relativePath = path.relative(dir, filePath);
    const basename = path.basename(filePath);
    const ext = path.extname(filePath);

    const stat = await fs.stat(filePath).catch(() => null);
    if (stat) totalSizeBytes += stat.size;

    if (QUARANTINE_FORBIDDEN_FILES.has(basename)) {
      flags.push(`forbidden_file:${relativePath}`);

      if (basename === "package.json") {
        try {
          const pkgRaw = await fs.readFile(filePath, "utf8");
          const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; license?: string };
          if (pkg.dependencies) Object.assign(dependencySummary, pkg.dependencies);
          if (pkg.devDependencies) {
            for (const [k, v] of Object.entries(pkg.devDependencies)) {
              dependencySummary[`dev:${k}`] = v;
            }
          }
          if (pkg.license) license = pkg.license;
        } catch { /* non-parseable, flag it */ }
      }
      continue;
    }

    if (!QUARANTINE_ALLOWED_EXTENSIONS.has(ext)) {
      flags.push(`disallowed_extension:${relativePath}`);
      continue;
    }

    if (stat && stat.size > 500_000) {
      flags.push(`large_file:${relativePath}:${stat.size}b`);
    }

    try {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n");

      for (const { pattern, label, severity } of FORBIDDEN_SCAN_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            suspiciousPatterns.push({
              file: relativePath,
              pattern: label,
              line: i + 1,
              snippet: lines[i].trim().slice(0, 200),
            });
            if (!suspiciousFiles.includes(relativePath)) {
              suspiciousFiles.push(relativePath);
            }
          }
        }
      }
    } catch { /* binary or unreadable — skip */ }
  }

  const riskLevel = deriveRiskLevel(suspiciousPatterns, flags);

  const scanResult: ImportScanResult = {
    riskLevel,
    suspiciousFiles,
    suspiciousPatterns,
    dependencySummary,
    license,
    flags,
    fileCount: allFiles.length,
    totalSizeBytes,
    scannedAt: new Date().toISOString(),
  };

  const violations: string[] = [];
  if (riskLevel === "critical") {
    violations.push("scan_critical_risk_auto_blocked");
  }

  await transitionState(
    runId,
    riskLevel === "critical" ? "blocked" : "scan_complete",
    { scanResult, violations },
  );

  return scanResult;
}

function deriveRiskLevel(
  patterns: SuspiciousPattern[],
  flags: string[],
): RiskLevel {
  const hasCritical = patterns.some((p) =>
    FORBIDDEN_SCAN_PATTERNS.find((fp) => fp.label === p.pattern)?.severity === "critical",
  );
  if (hasCritical) return "critical";

  const hasHigh = patterns.some((p) =>
    FORBIDDEN_SCAN_PATTERNS.find((fp) => fp.label === p.pattern)?.severity === "high",
  );
  if (hasHigh || patterns.length > 10) return "high";

  if (patterns.length > 3 || flags.length > 5) return "medium";

  return "low";
}

// ── Phase 3: Reconnaissance (extract artifacts) ──────────────────────────────

export async function extractArtifacts(runId: string): Promise<ExtractedArtifact[]> {
  await transitionState(runId, "extracting");

  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, runId))
    .limit(1);

  if (!run) throw new Error("quarantine_run_not_found");
  if (run.state !== "extracting" && run.state !== "scan_complete") {
    throw new Error(`invalid_state_for_extraction:${run.state}`);
  }

  const dir = run.quarantinePath;
  const allFiles = await walkDirectory(dir);
  const artifacts: ExtractedArtifact[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(dir, filePath);
    const basename = path.basename(filePath);
    const ext = path.extname(filePath);

    if (QUARANTINE_FORBIDDEN_FILES.has(basename)) continue;
    if (!QUARANTINE_ALLOWED_EXTENSIONS.has(ext)) continue;

    if (isRoutingOrServerFile(relativePath)) continue;

    try {
      const content = await fs.readFile(filePath, "utf8");

      if (ext === ".ts" || ext === ".tsx") {
        const typeArtifacts = extractTypeDefinitions(relativePath, content);
        artifacts.push(...typeArtifacts);

        const pureArtifacts = extractPureFunctions(relativePath, content);
        artifacts.push(...pureArtifacts);
      }

      if (ext === ".json" && !basename.startsWith(".")) {
        artifacts.push({
          kind: "mock_data",
          name: basename,
          sourceFile: relativePath,
          content: content.slice(0, 10_000),
        });
      }

      if (ext === ".md" || ext === ".mdx") {
        artifacts.push({
          kind: "documentation",
          name: basename,
          sourceFile: relativePath,
          content: content.slice(0, 20_000),
        });
      }

      if (ext === ".css" || ext === ".scss") {
        artifacts.push({
          kind: "ui_token",
          name: basename,
          sourceFile: relativePath,
          content: content.slice(0, 10_000),
        });
      }
    } catch { /* unreadable */ }
  }

  await transitionState(runId, "extracted", {
    extractedArtifacts: artifacts.map((a) => ({
      kind: a.kind,
      name: a.name,
      sourceFile: a.sourceFile,
      content: a.content.slice(0, 2000),
      lineRange: a.lineRange ?? null,
    })),
  });

  return artifacts;
}

function isRoutingOrServerFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return (
    lower.includes("route") ||
    lower.includes("server/") ||
    lower.includes("middleware") ||
    lower.includes("websocket") ||
    lower.includes("socket.io") ||
    lower.includes("ws.") ||
    lower.startsWith("api/") ||
    lower.includes("auth") ||
    lower.includes("app.tsx") ||
    lower.includes("index.tsx") ||
    lower.includes("main.tsx")
  );
}

function extractTypeDefinitions(file: string, content: string): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];
  const lines = content.split("\n");

  const typeRegex = /^export\s+(?:interface|type)\s+(\w+)/;
  for (let i = 0; i < lines.length; i++) {
    const match = typeRegex.exec(lines[i]);
    if (match) {
      let end = i;
      let braceDepth = 0;
      for (let j = i; j < lines.length; j++) {
        braceDepth += (lines[j].match(/\{/g) || []).length;
        braceDepth -= (lines[j].match(/\}/g) || []).length;
        end = j;
        if (braceDepth <= 0 && j > i) break;
        if (lines[j].endsWith(";") && braceDepth === 0) break;
      }
      artifacts.push({
        kind: "type_definition",
        name: match[1],
        sourceFile: file,
        content: lines.slice(i, end + 1).join("\n"),
        lineRange: { start: i + 1, end: end + 1 },
      });
    }
  }

  return artifacts;
}

function extractPureFunctions(file: string, content: string): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];
  const lines = content.split("\n");

  const fnRegex = /^export\s+function\s+(\w+)/;
  for (let i = 0; i < lines.length; i++) {
    const match = fnRegex.exec(lines[i]);
    if (match) {
      let end = i;
      let braceDepth = 0;
      for (let j = i; j < lines.length; j++) {
        braceDepth += (lines[j].match(/\{/g) || []).length;
        braceDepth -= (lines[j].match(/\}/g) || []).length;
        end = j;
        if (braceDepth <= 0 && j > i) break;
      }

      const fnBody = lines.slice(i, end + 1).join("\n");
      const hasSideEffects =
        /\bfetch\b|\bfs\b|\bchild_process\b|\bconsole\b|\bprocess\.exit\b/.test(fnBody);
      if (!hasSideEffects) {
        artifacts.push({
          kind: "pure_function",
          name: match[1],
          sourceFile: file,
          content: fnBody,
          lineRange: { start: i + 1, end: end + 1 },
        });
      }
    }
  }

  return artifacts;
}

// ── Phase 4: Documentation report ─────────────────────────────────────────────

export async function generateExtractionReport(runId: string): Promise<string> {
  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, runId))
    .limit(1);

  if (!run) throw new Error("quarantine_run_not_found");

  const scanResult = (run.scanResult ?? {}) as ImportScanResult;
  const artifacts = (run.extractedArtifacts ?? []) as ExtractedArtifact[];

  const reportDir = path.join(process.cwd(), ".system_design", "extractions");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `extraction_${runId}.md`);

  const typeArtifacts = artifacts.filter((a) => a.kind === "type_definition");
  const funcArtifacts = artifacts.filter((a) => a.kind === "pure_function");
  const uiArtifacts = artifacts.filter((a) => a.kind === "ui_token");
  const dataArtifacts = artifacts.filter((a) => a.kind === "mock_data");
  const docArtifacts = artifacts.filter((a) => a.kind === "documentation");

  const sections = [
    `# Extraction Report: ${runId}`,
    "",
    "## Source Metadata",
    `- **Source URI:** ${run.sourceUri}`,
    `- **Source Type:** ${run.sourceType}`,
    `- **SDK Mode:** ${run.sdkMode}`,
    `- **File Count:** ${scanResult.fileCount ?? "unknown"}`,
    `- **Total Size:** ${scanResult.totalSizeBytes ? `${Math.round(scanResult.totalSizeBytes / 1024)}KB` : "unknown"}`,
    `- **Scanned At:** ${scanResult.scannedAt ?? "unknown"}`,
    `- **License:** ${scanResult.license ?? "unknown"}`,
    "",
    "## Risk Assessment",
    `- **Risk Level:** ${scanResult.riskLevel ?? "unknown"}`,
    `- **Suspicious Files:** ${scanResult.suspiciousFiles?.length ?? 0}`,
    `- **Flags:** ${(scanResult.flags ?? []).join(", ") || "none"}`,
    "",
    ...(scanResult.suspiciousPatterns?.length
      ? [
          "### Suspicious Patterns",
          ...scanResult.suspiciousPatterns.map(
            (p) => `- \`${p.file}:${p.line}\` — ${p.pattern}${p.snippet ? `: \`${p.snippet}\`` : ""}`,
          ),
          "",
        ]
      : []),
    "## Type Definitions",
    ...(typeArtifacts.length
      ? typeArtifacts.flatMap((a) => [
          `### ${a.name} (${a.sourceFile})`,
          "```ts",
          a.content,
          "```",
          "",
        ])
      : ["_None extracted._", ""]),
    "## Pure Functions",
    ...(funcArtifacts.length
      ? funcArtifacts.flatMap((a) => [
          `### ${a.name} (${a.sourceFile})`,
          "```ts",
          a.content,
          "```",
          "",
        ])
      : ["_None extracted._", ""]),
    "## UI Tokens",
    ...(uiArtifacts.length
      ? uiArtifacts.flatMap((a) => [`### ${a.name} (${a.sourceFile})`, "```", a.content.slice(0, 3000), "```", ""])
      : ["_None extracted._", ""]),
    "## Mock Data Inventory",
    ...(dataArtifacts.length
      ? dataArtifacts.map((a) => `- **${a.name}** (${a.sourceFile}) — ${a.content.length} chars`)
      : ["_None extracted._"]),
    "",
    "## Documentation",
    ...(docArtifacts.length
      ? docArtifacts.map((a) => `- **${a.name}** (${a.sourceFile})`)
      : ["_None extracted._"]),
    "",
    "## Dependency Summary",
    ...(Object.keys(scanResult.dependencySummary ?? {}).length
      ? Object.entries(scanResult.dependencySummary).map(([k, v]) => `- \`${k}\`: ${v}`)
      : ["_No dependencies found._"]),
    "",
    "## Security Flags",
    ...(scanResult.flags?.length
      ? scanResult.flags.map((f) => `- ${f}`)
      : ["_None._"]),
    "",
    "## Recommended Minimal Adapter",
    "_Review extracted types and documentation above. Build a minimal `fetch()` wrapper that covers only the endpoints you need. Do NOT install the full package._",
    "",
    `---`,
    `_Generated by Clean Room Extraction Protocol V2 — Contract version ${run.id}_`,
  ];

  const reportContent = sections.join("\n");
  await fs.writeFile(reportPath, reportContent, "utf8");

  const hash = crypto.createHash("sha256").update(reportContent).digest("hex");

  await transitionState(runId, "extracted", {
    extractionReportPath: reportPath,
    extractionReportHash: hash,
  });

  return reportPath;
}

// ── Phase 6: Certify as knowledge ─────────────────────────────────────────────

export async function certifyAsKnowledge(runId: string): Promise<void> {
  await transitionState(runId, "certifying");

  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, runId))
    .limit(1);

  if (!run) throw new Error("quarantine_run_not_found");

  await transitionState(runId, "certified", {
    certificationLevel: "unverified",
  });
}

// ── Phase 7: Promotion decision ───────────────────────────────────────────────

export async function applyPromotionDecision(
  decision: PromotionDecision,
): Promise<void> {
  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, decision.quarantineRunId))
    .limit(1);

  if (!run) throw new Error("quarantine_run_not_found");

  if (decision.decision === "promote_to_trusted") {
    if (run.sourceType === "external") {
      await transitionState(run.id, "promoted", {
        promotedLevel: "trusted",
        certificationLevel: "trusted",
      });
    }
  } else if (decision.decision === "reject") {
    await transitionState(run.id, "blocked", {
      promotedLevel: "rejected",
      certificationLevel: "rejected",
      violations: [
        ...((run.violations as string[]) ?? []),
        `rejected_by:${decision.approvedBy}:${decision.reason}`,
      ],
    });
  }
}

// ── Phase 8: Incineration ─────────────────────────────────────────────────────

export async function incinerateQuarantine(runId: string): Promise<void> {
  await transitionState(runId, "incinerating");

  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, runId))
    .limit(1);

  if (!run) throw new Error("quarantine_run_not_found");

  try {
    await fs.rm(run.quarantinePath, { recursive: true, force: true });
  } catch { /* already gone */ }

  const stillExists = await fs.stat(run.quarantinePath).catch(() => null);
  if (stillExists) {
    throw new Error("incineration_failed:directory_still_exists");
  }

  await transitionState(runId, "incinerated", {
    incineratedAt: new Date(),
  });
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

export interface QuarantinePipelineResult {
  runId: string;
  state: QuarantineRunState;
  scanResult: ImportScanResult | null;
  artifactCount: number;
  reportPath: string | null;
  violations: string[];
}

export async function runFullQuarantinePipeline(
  request: CreateQuarantineRunRequest,
): Promise<QuarantinePipelineResult> {
  const { runId } = await createQuarantineRun(request);

  let scanResult: ImportScanResult | null = null;
  let artifactCount = 0;
  let reportPath: string | null = null;
  const violations: string[] = [];

  try {
    scanResult = await scanQuarantine(runId);

    if (scanResult.riskLevel === "critical") {
      violations.push("scan_critical_risk_auto_blocked");
      await incinerateQuarantine(runId);
      return { runId, state: "blocked", scanResult, artifactCount: 0, reportPath: null, violations };
    }

    const artifacts = await extractArtifacts(runId);
    artifactCount = artifacts.length;

    reportPath = await generateExtractionReport(runId);

    await certifyAsKnowledge(runId);
    await incinerateQuarantine(runId);

    return { runId, state: "incinerated", scanResult, artifactCount, reportPath, violations };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    violations.push(`pipeline_error:${msg.slice(0, 200)}`);

    try { await incinerateQuarantine(runId); } catch { /* best effort */ }

    return {
      runId,
      state: "failed",
      scanResult,
      artifactCount,
      reportPath,
      violations,
    };
  }
}

// ── Violation helpers ─────────────────────────────────────────────────────────

export async function recordQuarantineViolation(params: {
  runId: string;
  violationType: "quarantine_direct_execution" | "quarantine_package_install_bypass" | "quarantine_unscanned_import" | "quarantine_routing_import" | "quarantine_dependency_trust_bypass";
  detail: Record<string, unknown>;
  siteConfigId?: string | null;
}): Promise<void> {
  await persistOrchestrationViolation({
    violationType: params.violationType,
    severity: "critical",
    orchestrationRunId: params.runId,
    siteConfigId: params.siteConfigId,
    routeOrSource: "importQuarantineService",
    detail: params.detail,
  });
}

// ── Directory walker ──────────────────────────────────────────────────────────

async function walkDirectory(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      results.push(...(await walkDirectory(full)));
    } else {
      results.push(full);
    }
  }
  return results;
}
