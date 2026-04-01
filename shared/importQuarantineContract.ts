/**
 * Import Quarantine Contract — Zod schemas and types for the governed
 * zero-trust import pipeline.
 *
 * This contract defines the data shapes for quarantine runs, security scans,
 * extracted artifacts, and promotion decisions. It integrates with:
 *   - KnowledgeCertificationContract (sourceType, certificationLevel)
 *   - PolicyDecisionContract (allowedKnowledgeLevels, allowedSourceTypes)
 *   - OrchestrationConstants (violation types)
 *
 * Doctrine 12: External code is knowledge + risk, not capability.
 */

import { z } from "zod";

export const IMPORT_QUARANTINE_CONTRACT_VERSION = "1.0.0";

// ── Risk levels ───────────────────────────────────────────────────────────────

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// ── SDK import modes ──────────────────────────────────────────────────────────

export const SDK_IMPORT_MODES = [
  "docs_only",
  "extract_adapter",
  "install_package",
] as const;
export type SdkImportMode = (typeof SDK_IMPORT_MODES)[number];

// ── Quarantine run states ─────────────────────────────────────────────────────

export const QUARANTINE_RUN_STATES = [
  "quarantined",
  "scanning",
  "scan_complete",
  "extracting",
  "extracted",
  "certifying",
  "certified",
  "promoting",
  "promoted",
  "incinerating",
  "incinerated",
  "blocked",
  "failed",
] as const;
export type QuarantineRunState = (typeof QUARANTINE_RUN_STATES)[number];

// ── Suspicious pattern ────────────────────────────────────────────────────────

export const SuspiciousPatternSchema = z.object({
  file: z.string().min(1),
  pattern: z.string().min(1),
  line: z.number().int().nonnegative(),
  snippet: z.string().max(200).optional(),
});
export type SuspiciousPattern = z.infer<typeof SuspiciousPatternSchema>;

// ── Import scan result ────────────────────────────────────────────────────────

export const ImportScanResultSchema = z.object({
  riskLevel: z.enum(RISK_LEVELS),
  suspiciousFiles: z.array(z.string().min(1)).default([]),
  suspiciousPatterns: z.array(SuspiciousPatternSchema).default([]),
  dependencySummary: z.record(z.string()).default({}),
  license: z.string().default("unknown"),
  flags: z.array(z.string().min(1)).default([]),
  fileCount: z.number().int().nonnegative().default(0),
  totalSizeBytes: z.number().int().nonnegative().default(0),
  scannedAt: z.string().datetime().optional(),
});
export type ImportScanResult = z.infer<typeof ImportScanResultSchema>;

// ── Extracted artifact ────────────────────────────────────────────────────────

export const EXTRACTED_ARTIFACT_KINDS = [
  "type_definition",
  "api_contract",
  "ui_token",
  "pure_function",
  "mock_data",
  "documentation",
  "minimal_adapter",
] as const;
export type ExtractedArtifactKind = (typeof EXTRACTED_ARTIFACT_KINDS)[number];

export const ExtractedArtifactSchema = z.object({
  kind: z.enum(EXTRACTED_ARTIFACT_KINDS),
  name: z.string().min(1),
  sourceFile: z.string().min(1),
  content: z.string().min(1),
  lineRange: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }).optional(),
});
export type ExtractedArtifact = z.infer<typeof ExtractedArtifactSchema>;

// ── Quarantine run ────────────────────────────────────────────────────────────

export const QuarantineRunSchema = z.object({
  id: z.string().uuid(),
  sourceUri: z.string().min(1),
  sourceType: z.enum(["external", "web", "owner"]).default("external"),
  sdkMode: z.enum(SDK_IMPORT_MODES).default("extract_adapter"),
  state: z.enum(QUARANTINE_RUN_STATES),
  quarantinePath: z.string().min(1),

  scanResult: ImportScanResultSchema.nullable().default(null),
  extractedArtifacts: z.array(ExtractedArtifactSchema).default([]),
  extractionReportPath: z.string().nullable().default(null),

  certificationLevel: z.enum(["unverified", "trusted", "rejected"]).default("unverified"),
  promotedLevel: z.enum(["unverified", "trusted", "rejected"]).nullable().default(null),

  violations: z.array(z.string().min(1)).default([]),

  orchestrationRunId: z.string().uuid().nullable().default(null),
  intentExecutionId: z.string().uuid().nullable().default(null),
  siteConfigId: z.string().min(1).nullable().default(null),
  requestedBy: z.string().nullable().default(null),

  incineratedAt: z.string().datetime().nullable().default(null),
  extractionReportHash: z.string().nullable().default(null),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type QuarantineRun = z.infer<typeof QuarantineRunSchema>;

// ── Request schemas ───────────────────────────────────────────────────────────

export const CreateQuarantineRunRequestSchema = z.object({
  sourceUri: z.string().min(1),
  sourceType: z.enum(["external", "web", "owner"]).default("external"),
  sdkMode: z.enum(SDK_IMPORT_MODES).default("extract_adapter"),
  siteConfigId: z.string().min(1).optional(),
  orchestrationRunId: z.string().uuid().optional(),
  intentExecutionId: z.string().uuid().optional(),
  requestedBy: z.string().optional(),
});
export type CreateQuarantineRunRequest = z.infer<typeof CreateQuarantineRunRequestSchema>;

export const PromotionDecisionSchema = z.object({
  quarantineRunId: z.string().uuid(),
  decision: z.enum(["promote_to_trusted", "reject", "keep_unverified"]),
  reason: z.string().min(1),
  approvedBy: z.string().min(1),
});
export type PromotionDecision = z.infer<typeof PromotionDecisionSchema>;

// ── Forbidden patterns for scanning ──────────────────────────────────────────

export const FORBIDDEN_SCAN_PATTERNS: Array<{ pattern: RegExp; label: string; severity: RiskLevel }> = [
  { pattern: /\beval\s*\(/, label: "eval()", severity: "critical" },
  { pattern: /new\s+Function\s*\(/, label: "new Function()", severity: "critical" },
  { pattern: /child_process/, label: "child_process", severity: "high" },
  { pattern: /\bexec\s*\(/, label: "exec()", severity: "high" },
  { pattern: /\bspawn\s*\(/, label: "spawn()", severity: "high" },
  { pattern: /\bexecSync\s*\(/, label: "execSync()", severity: "high" },
  { pattern: /fs\.write/, label: "fs.write*", severity: "medium" },
  { pattern: /fs\.unlink/, label: "fs.unlink", severity: "medium" },
  { pattern: /fs\.rm/, label: "fs.rm*", severity: "medium" },
  { pattern: /net\.connect/, label: "net.connect", severity: "medium" },
  { pattern: /dgram\.createSocket/, label: "dgram socket", severity: "medium" },
  { pattern: /__proto__/, label: "__proto__", severity: "high" },
  { pattern: /Object\.setPrototypeOf/, label: "prototype manipulation", severity: "high" },
  { pattern: /process\.env\.\w+/, label: "env variable access", severity: "medium" },
  { pattern: /(?:AKIA|sk-|ghp_|glpat-|xox[bps]-)[A-Za-z0-9]{10,}/, label: "potential credential", severity: "critical" },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, label: "private key", severity: "critical" },
];

// ── Quarantine-safe file extensions ──────────────────────────────────────────

export const QUARANTINE_ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".yaml", ".yml",
  ".md", ".mdx", ".txt", ".csv",
  ".css", ".scss", ".less",
  ".html", ".svg",
  ".graphql", ".gql",
  ".proto",
]);

export const QUARANTINE_FORBIDDEN_FILES = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "tsconfig.json",
  "tsconfig.build.json",
  "vite.config.ts",
  "vite.config.js",
  "webpack.config.js",
  "webpack.config.ts",
  "rollup.config.js",
  "rollup.config.ts",
  ".env",
  ".env.local",
  ".env.production",
  "Dockerfile",
  "docker-compose.yml",
  "Makefile",
  ".gitlab-ci.yml",
]);
