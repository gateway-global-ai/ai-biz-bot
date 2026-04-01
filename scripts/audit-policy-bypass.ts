#!/usr/bin/env npx tsx
/**
 * Audit: Policy Bypass Scanner
 *
 * Scans server route files for mutation handlers (POST/PUT/PATCH/DELETE)
 * and checks whether they use `requirePolicy()` middleware.
 *
 * Doctrine D2: No execution without PolicyDecision.
 * Violation code: DOCTRINE_VIOLATION_DIRECT_EXECUTION
 *
 * Usage:
 *   npx tsx scripts/audit-policy-bypass.ts
 *   npm run audit:policy-bypass
 *
 * Exit codes:
 *   0 — all mutation routes are gated (or explicitly exempted)
 *   1 — bypass routes detected
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";

const ROOT = resolve(import.meta.dirname ?? process.cwd(), "..");

const ROUTE_DIRS = [
  resolve(ROOT, "server/routes"),
];

const ROUTE_FILES = [
  resolve(ROOT, "server/routes.ts"),
];

/**
 * Routes that are explicitly exempted from policy gating.
 * Each must have a documented reason.
 */
const EXEMPTIONS: Record<string, string> = {
  // Auth routes issue credentials — they ARE the identity gate
  "POST /api/auth/send-otp": "Auth flow — issues identity, not a governed action",
  "POST /api/auth/verify-otp": "Auth flow — issues identity",
  "POST /api/auth/logout": "Auth flow — teardown",
  "POST /api/customer/send-otp": "Customer auth flow",
  "POST /api/customer/verify-otp": "Customer auth flow",
  "POST /api/customer/logout": "Customer auth flow",
  // Twilio webhooks use HMAC signature validation, not policy gates
  "POST /webhook/sms": "Twilio HMAC-validated inbound",
  "POST /webhook/voice": "Twilio HMAC-validated inbound",
  "POST /webhook/voice/stream": "Twilio HMAC-validated inbound",
  "POST /webhook/voice/gather": "Twilio HMAC-validated inbound",
  "POST /webhook/voice/status": "Twilio HMAC-validated inbound",
  "POST /webhook/sms/status": "Twilio HMAC-validated inbound",
  // Voice transcription is stateless audio processing
  "POST /api/voice/transcribe": "Stateless audio processing, no mutation",
  // Health/analytics hints are observability, not mutations
  "POST /api/analytics/voice-latency-hint": "Observability telemetry, no mutation",
  // Unified auth routes
  "POST /send": "Auth OTP flow",
  "POST /verify": "Auth OTP flow",
};

interface RouteHit {
  file: string;
  line: number;
  method: string;
  path: string;
  hasPolicyGate: boolean;
  hasAuthGate: boolean;
  exempted: boolean;
  exemptionReason?: string;
}

const MUTATION_PATTERN = /\b(app|router)\.(post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

function scanFile(filePath: string): RouteHit[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const hits: RouteHit[] = [];

  const hasRequirePolicyImport = content.includes("requirePolicy");
  const hasRequireAuthImport = content.includes("requireAuth");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [...line.matchAll(MUTATION_PATTERN)];
    for (const match of matches) {
      const method = match[2].toUpperCase();
      const path = match[3];

      // Check if requirePolicy appears on this line or the next few
      const context = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
      const hasPolicyGate = context.includes("requirePolicy");
      const hasAuthGate = context.includes("requireAuth") ||
        context.includes("requireCustomerAuth") ||
        context.includes("requirePlatformAdmin") ||
        context.includes("requireAdminOrReseller") ||
        context.includes("validateTwilioSignature") ||
        context.includes("requireInstallationApiKey") ||
        context.includes("requireIntegrationConnectMintAuth");

      const exemptionKey = `${method} ${path}`;
      const exempted = exemptionKey in EXEMPTIONS;

      hits.push({
        file: relative(ROOT, filePath),
        line: i + 1,
        method,
        path,
        hasPolicyGate,
        hasAuthGate,
        exempted,
        exemptionReason: exempted ? EXEMPTIONS[exemptionKey] : undefined,
      });
    }
  }

  return hits;
}

function collectRouteFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...collectRouteFiles(full));
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts") && !entry.endsWith(".test.ts")) {
        files.push(full);
      }
    }
  } catch { /* dir may not exist */ }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────

const allFiles = [
  ...ROUTE_FILES.filter(f => {
    try { statSync(f); return true; } catch { return false; }
  }),
  ...ROUTE_DIRS.flatMap(d => collectRouteFiles(d)),
];

const allHits = allFiles.flatMap(f => scanFile(f));
const mutationHits = allHits.filter(h => ["POST", "PUT", "PATCH", "DELETE"].includes(h.method));

const bypasses = mutationHits.filter(h => !h.hasPolicyGate && !h.exempted);
const gated = mutationHits.filter(h => h.hasPolicyGate);
const authOnly = mutationHits.filter(h => !h.hasPolicyGate && h.hasAuthGate && !h.exempted);
const exempted = mutationHits.filter(h => h.exempted);
const unprotected = bypasses.filter(h => !h.hasAuthGate);

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║           POLICY BYPASS AUDIT (Doctrine D2)                ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║ Total mutation routes found:     ${String(mutationHits.length).padStart(4)}                       ║`);
console.log(`║ ✅ Policy-gated (requirePolicy): ${String(gated.length).padStart(4)}                       ║`);
console.log(`║ 🔑 Auth-only (no policy gate):   ${String(authOnly.length).padStart(4)}                       ║`);
console.log(`║ 🔓 Exempted (documented):        ${String(exempted.length).padStart(4)}                       ║`);
console.log(`║ ⚠️  BYPASS (auth only, no policy):${String(authOnly.length).padStart(4)}                       ║`);
console.log(`║ 🚨 UNPROTECTED (no auth/policy): ${String(unprotected.length).padStart(4)}                       ║`);
console.log("╚══════════════════════════════════════════════════════════════╝");

if (bypasses.length > 0) {
  console.log("\n── BYPASS ROUTES (need requirePolicy) ──────────────────────\n");
  for (const h of bypasses) {
    const authTag = h.hasAuthGate ? " [has auth]" : " [NO AUTH]";
    console.log(`  ${h.method} ${h.path}${authTag}`);
    console.log(`    → ${h.file}:${h.line}`);
  }
}

if (unprotected.length > 0) {
  console.log("\n── 🚨 CRITICAL: No auth AND no policy ──────────────────────\n");
  for (const h of unprotected) {
    console.log(`  ${h.method} ${h.path}`);
    console.log(`    → ${h.file}:${h.line}`);
  }
}

if (exempted.length > 0) {
  console.log("\n── EXEMPTED ROUTES (documented) ────────────────────────────\n");
  for (const h of exempted) {
    console.log(`  ${h.method} ${h.path} — ${h.exemptionReason}`);
  }
}

// CI machine-readable output
if (process.argv.includes("--json")) {
  const report = {
    timestamp: new Date().toISOString(),
    doctrine: "D2",
    violationCode: "DOCTRINE_VIOLATION_DIRECT_EXECUTION",
    summary: {
      totalMutationRoutes: mutationHits.length,
      policyGated: gated.length,
      authOnly: authOnly.length,
      exempted: exempted.length,
      bypasses: bypasses.length,
      unprotected: unprotected.length,
    },
    coverage: mutationHits.length > 0
      ? Math.round(((gated.length + exempted.length) / mutationHits.length) * 100)
      : 100,
    bypasses: bypasses.map(h => ({
      method: h.method,
      path: h.path,
      file: h.file,
      line: h.line,
      hasAuth: h.hasAuthGate,
    })),
    passed: bypasses.length === 0,
  };
  console.log("\n" + JSON.stringify(report, null, 2));
}

// Coverage meter
const coveragePercent = mutationHits.length > 0
  ? Math.round(((gated.length + exempted.length) / mutationHits.length) * 100)
  : 100;
console.log(`\n── Policy Coverage: ${coveragePercent}% ──`);
console.log(`   ${gated.length + exempted.length} of ${mutationHits.length} mutation routes governed`);

if (bypasses.length > 0) {
  console.log(`\n❌ CI FAIL: ${bypasses.length} mutation route(s) bypass PolicyDecision`);
  process.exit(1);
} else {
  console.log(`\n✅ CI PASS: All mutation routes are policy-gated or exempted`);
  process.exit(0);
}
