/**
 * Shared probes + catalog for system / governance readiness (no stdout).
 * Source of truth for CLI (`npm run system:check`) and `GET /api/platform/readiness`.
 * @see docs-governance/canonical/SYSTEM_READINESS_CHECK_V1.md
 */
import { execSync } from "node:child_process";
import { hostname } from "node:os";
import { count, sql } from "drizzle-orm";
import { agents, siteConfigs } from "@shared/schema";

/** Keep in sync with server/* (grep registerWebSocketRoute). Duplicate paths = one upgrade handler. */
export const GOVERNED_WEBSOCKET_ROUTES = [
  "/ws/gemini-live",
  "/ws/browser-voice",
  "/ws/os-live",
  "/ws/voice-stream",
  "/ws/twilio-sovereign",
  "/ws/ai-studio-ptt",
  "/ws/local-voice",
] as const;

export function maskEnv(name: string): "missing" | "set" {
  const v = process.env[name];
  if (v == null || String(v).trim() === "") return "missing";
  return "set";
}

export function dopplerCliInstalled(): boolean {
  try {
    execSync("doppler --version", { stdio: "ignore", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export function insideDopplerShell(): boolean {
  return Boolean(
    process.env.DOPPLER_ENVIRONMENT?.trim() ||
      process.env.DOPPLER_PROJECT?.trim() ||
      process.env.DOPPLER_CONFIG?.trim(),
  );
}

export type DbState = "no_url" | "ok" | "error";

export async function probeDatabase(): Promise<{ state: DbState; detail?: string }> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return { state: "no_url" };
  try {
    const { db } = await import("../db.js");
    await db.execute(sql`SELECT 1`);
    return { state: "ok" };
  } catch (e) {
    return {
      state: "error",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function probeDbCounts(): Promise<
  | { ok: true; siteConfigs: number; agents: number }
  | { ok: false; error: string }
> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return { ok: false, error: "no DATABASE_URL" };
  try {
    const { db } = await import("../db.js");
    const [sc] = await db.select({ n: count() }).from(siteConfigs);
    const [ag] = await db.select({ n: count() }).from(agents);
    return { ok: true, siteConfigs: Number(sc?.n ?? 0), agents: Number(ag?.n ?? 0) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function probeLocalServerHealth(): Promise<{
  status: "up" | "down";
  port: number;
  httpStatus?: number;
  detail?: string;
}> {
  const port = parseInt(process.env.PORT || "3004", 10);
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2000);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: ac.signal });
    clearTimeout(t);
    return { status: res.ok ? "up" : "down", port, httpStatus: res.status };
  } catch (e) {
    return {
      status: "down",
      port,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function tryGitCommit(): string | null {
  try {
    const h = execSync("git rev-parse HEAD", {
      encoding: "utf8",
      timeout: 2500,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return h.length >= 7 ? h.slice(0, 40) : h || null;
  } catch {
    return null;
  }
}

export function environmentLabel(): string {
  return (
    process.env.DOPPLER_ENVIRONMENT?.trim() ||
    process.env.DEPLOY_ENV?.trim() ||
    process.env.NODE_ENV?.trim() ||
    "unknown"
  );
}

export function tryPm2Summary(): string {
  try {
    const out = execSync("pm2 jlist", {
      encoding: "utf8",
      timeout: 4000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const list = JSON.parse(out) as Array<{ name?: string; pm2_env?: { status?: string } }>;
    const online = list.filter((p) => p.pm2_env?.status === "online").length;
    return `${list.length} process(es), ${online} online`;
  } catch {
    return "unavailable (pm2 not installed or not in PATH)";
  }
}

// ── Test catalog (sync with package.json) ────────────────────────────────────

export interface CatalogEntry {
  script: string;
  description: string;
  requiresDatabase: boolean;
  preferDoppler: boolean;
  npmScriptUsesDopplerWrapper?: boolean;
  escapeHatchCommand?: string;
  notes?: string;
}

export const TEST_CATALOG: CatalogEntry[] = [
  { script: "check", description: "TypeScript compile (tsc)", requiresDatabase: false, preferDoppler: false },
  {
    script: "test:execution-mutation-gate",
    description: "Mutation gate envelope + executeContract smoke",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:execution-contract-registry",
    description: "Execution contract kind registry + unknown-kind warn",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:admission-contract-gate",
    description: "Hospitality Phase 1 admission gate (unit)",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:voice-concierge-aptitude",
    description: "Voice concierge PPP/ARCH heuristics (no DB, no Live WS)",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:local-agent-aptitude",
    description: "Local agent jurisdiction / parse (no server unless LIVE=true)",
    requiresDatabase: false,
    preferDoppler: false,
    notes: "LIVE=true needs running server + AGENT_ID + SITE_ID",
  },
  {
    script: "test:guest-tool-phone-binding",
    description: "Guest tool phone binding Zod/resolver",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:cloudbeds-guest-journey",
    description: "Cloudbeds guest journey classification + handler early exits",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:integration-connect-tokens",
    description: "Integration connect token mint/validate/mark (operator SMS loop)",
    requiresDatabase: true,
    preferDoppler: true,
    notes: "Requires INTEGRATION_CONNECT_TOKEN_SECRET in Doppler; skips if unset",
  },
  {
    script: "test:twilio-debugger-normalize",
    description: "Twilio debugger normalization",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "test:twilio-debugger-hints-integrity",
    description: "Twilio debugger hints integrity",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "validate:onboarding-contract-hash",
    description: "Onboarding contract hash vs definition",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "validate:skill-identity",
    description: "Skill identity registry YAML",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "validate:agent-capabilities",
    description: "Agent capability registry YAML",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "validate:integration-registry",
    description: "Integration capability graph",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "ingest:integration-vendor-specs",
    description: "Vendor OpenAPI ingest (url_fetch) + checksum verify (manual_promote)",
    requiresDatabase: false,
    preferDoppler: false,
    notes: "url_fetch needs network; --verify-only skips fetches",
  },
  {
    script: "validate:swarm-schematic",
    description: "Swarm schematic registry",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "validate:agent-classification",
    description: "Agent classification policy YAML",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "verify:hospitality-projection",
    description: "Hospitality projection verify script",
    requiresDatabase: false,
    preferDoppler: false,
    notes: "May read YAML only; see script if DB added later",
  },
  {
    script: "check-env-manifest",
    description: "Env manifest keys check",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "governance:score",
    description: "Governance maturity score",
    requiresDatabase: false,
    preferDoppler: false,
  },
  {
    script: "governance:daily",
    description: "Daily governance report + work plan (readiness envelope + derived work items)",
    requiresDatabase: false,
    preferDoppler: false,
    notes: "Writes docs-governance/artifacts/daily/YYYY-MM-DD/; use --run-m1-tests for full M1 battery",
  },
  {
    script: "integration:readiness:local",
    description: "Integration readiness (uses DATABASE_URL if set)",
    requiresDatabase: false,
    preferDoppler: false,
    notes: "DB section skipped if DATABASE_URL missing",
  },
  {
    script: "integration:readiness",
    description: "Integration readiness via Doppler",
    requiresDatabase: false,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
    escapeHatchCommand: "npm run integration:readiness:local   (needs DATABASE_URL in shell)",
    notes: "package.json wraps doppler run",
  },
  {
    script: "test:intelligence-provision-contract-http",
    description: "HTTP contract tests for /api/intelligence (in-process server)",
    requiresDatabase: true,
    preferDoppler: true,
  },
  {
    script: "test:guardrails",
    description: "Guardrails pipeline",
    requiresDatabase: true,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
    escapeHatchCommand: "doppler run -- tsx tests/test-guardrails.ts",
  },
  {
    script: "test:onboarding-e2e-hospitality",
    description: "Onboarding E2E hospitality",
    requiresDatabase: true,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
  },
  {
    script: "test:cloudbeds",
    description: "Cloudbeds smoke (tenant DB credentials)",
    requiresDatabase: true,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
    notes: "Needs site_pms_integrations / property setup",
  },
  {
    script: "test:frontdesk-projection",
    description: "Frontdesk projection tests",
    requiresDatabase: true,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
  },
  {
    script: "test:intake-governance",
    description: "Intake governance smoke",
    requiresDatabase: true,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
  },
  {
    script: "test:bi",
    description: "BI pipeline",
    requiresDatabase: true,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
  },
  {
    script: "check-keys",
    description: "Google key permissions check",
    requiresDatabase: false,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
    notes: "Uses Secret Manager / API — needs doppler secrets",
  },
  {
    script: "sovereign-guard",
    description: "Sovereign guard script",
    requiresDatabase: false,
    preferDoppler: true,
    npmScriptUsesDopplerWrapper: true,
  },
];

export type CatalogRowStatus = "runnable" | "degraded" | "blocked";

export function rowStatus(
  entry: CatalogEntry,
  db: DbState,
  inDoppler: boolean,
  dopplerCli: boolean,
): { status: CatalogRowStatus; reason: string; command: string } {
  const cmdBase = `npm run ${entry.script}`;
  const dopplerPrefixed = `doppler run -- ${cmdBase}`;
  const cmd =
    entry.preferDoppler && !inDoppler && !entry.npmScriptUsesDopplerWrapper
      ? dopplerPrefixed
      : cmdBase;

  if (entry.npmScriptUsesDopplerWrapper && !dopplerCli) {
    return {
      status: "blocked",
      reason: "package.json uses `doppler run --`; Doppler CLI not found in PATH",
      command: entry.escapeHatchCommand ?? "Install Doppler CLI or run the underlying tsx script from package.json with env set",
    };
  }

  if (entry.requiresDatabase && db !== "ok") {
    const r =
      db === "no_url"
        ? "DATABASE_URL not set or empty"
        : "DATABASE_URL set but connection failed";
    return {
      status: "blocked",
      reason: r,
      command: dopplerPrefixed,
    };
  }

  /** Recommended command uses `doppler run --` but CLI absent — cannot run as advertised. */
  if (
    entry.preferDoppler &&
    !inDoppler &&
    !entry.npmScriptUsesDopplerWrapper &&
    !dopplerCli
  ) {
    return {
      status: "blocked",
      reason:
        "Prefers Doppler-injected secrets but Doppler CLI is missing — install CLI or export equivalent env and run `npm run` directly",
      command: cmdBase,
    };
  }

  if (entry.preferDoppler && !inDoppler) {
    if (entry.npmScriptUsesDopplerWrapper) {
      return {
        status: "runnable",
        reason: "OK (npm script wraps doppler run — secrets loaded by that wrapper)",
        command: cmdBase,
      };
    }
    return {
      status: "degraded",
      reason: "Outside Doppler-injected shell — use shown command for vault-aligned secrets",
      command: dopplerPrefixed,
    };
  }

  return { status: "runnable", reason: "OK", command: cmdBase };
}

/**
 * Worst-of across catalog, database reachability, and live voice scenario
 * (aligned with tri-state vocabulary: blocked > degraded > runnable).
 *
 * When `overallStatus === "blocked"`, `criticalBlockers` lists contributing causes
 * (stable order: database → catalog rows → live scenario) so agents and monitors
 * need not infer from the full catalog map.
 */
export type ReadinessCatalogMap = Record<
  string,
  {
    status: CatalogRowStatus;
    reason?: string;
    command: string;
    description: string;
  }
>;

export function deriveOverallStatusAndBlockers(input: {
  catalog: ReadinessCatalogMap;
  dbState: DbState;
  dbDetail?: string;
  liveScenario: "ready" | "blocked" | "degraded";
  liveBlockers: string[];
}): { overallStatus: CatalogRowStatus; criticalBlockers: string[] } {
  let catalogBlocked = 0;
  let catalogDegraded = 0;
  for (const row of Object.values(input.catalog)) {
    if (row.status === "blocked") catalogBlocked++;
    if (row.status === "degraded") catalogDegraded++;
  }

  let overallStatus: CatalogRowStatus = "runnable";
  if (catalogBlocked > 0 || input.dbState !== "ok" || input.liveScenario === "blocked") {
    overallStatus = "blocked";
  } else if (catalogDegraded > 0 || input.liveScenario === "degraded") {
    overallStatus = "degraded";
  }

  const criticalBlockers: string[] = [];
  if (overallStatus !== "blocked") {
    return { overallStatus, criticalBlockers };
  }

  if (input.dbState !== "ok") {
    if (input.dbState === "no_url") {
      criticalBlockers.push("database:no_url — DATABASE_URL not set or empty");
    } else {
      criticalBlockers.push(
        `database:error${input.dbDetail ? ` — ${String(input.dbDetail).slice(0, 240)}` : ""}`,
      );
    }
  }

  for (const entry of TEST_CATALOG) {
    const row = input.catalog[entry.script];
    if (row?.status === "blocked") {
      const reason = row.reason?.trim() || "blocked";
      criticalBlockers.push(`catalog:${entry.script} — ${reason}`);
    }
  }

  if (input.liveScenario === "blocked") {
    for (const b of input.liveBlockers) {
      criticalBlockers.push(`live_voice_browser:${b}`);
    }
  }

  return { overallStatus, criticalBlockers };
}

/**
 * Core execution path (DB + Gemini + local API) — excludes npm test-catalog noise.
 * Use this for runtime gates (e.g. tool dispatch); use `overallStatus` for ops/PR.
 */
export function deriveExecutionReadiness(input: {
  dbState: DbState;
  dbDetail?: string;
  geminiOk: boolean;
  health: { status: "up" | "down"; port: number };
}): { status: CatalogRowStatus; blockers: string[] } {
  const blockers: string[] = [];
  if (input.dbState !== "ok") {
    if (input.dbState === "no_url") {
      blockers.push("database:no_url — DATABASE_URL not set or empty");
    } else {
      blockers.push(
        `database:error${input.dbDetail ? ` — ${String(input.dbDetail).slice(0, 240)}` : ""}`,
      );
    }
    return { status: "blocked", blockers };
  }
  if (!input.geminiOk) {
    blockers.push("execution:gemini — GEMINI_API_KEY or GEMINI_MODEL_ID missing");
    return { status: "blocked", blockers };
  }
  if (input.health.status !== "up") {
    return {
      status: "degraded",
      blockers: [`execution:local_api — /api/health not OK on port ${input.health.port}`],
    };
  }
  return { status: "runnable", blockers: [] };
}

/** Serializable report for JSON output and agents/tools. */
export interface SystemReadinessReport {
  schemaVersion: 4;
  generatedAt: string;
  /** Single rollup for dashboards/agents; detail remains in catalog + scenarios. */
  overallStatus: CatalogRowStatus;
  /**
   * Populated when `overallStatus === "blocked"`: ordered reasons (database → catalog → live).
   * Empty when not blocked.
   */
  criticalBlockers: string[];
  /**
   * Database + Gemini + local API — for runtime tool gates (ignores npm test catalog).
   */
  executionReadiness: {
    status: CatalogRowStatus;
    blockers: string[];
  };
  /** Audit / provenance (no secrets). */
  provenance: {
    hostname: string;
    environmentLabel: string;
    gitCommit: string | null;
  };
  environment: {
    nodeVersion: string;
    cwd: string;
    dotenvLoaded: boolean;
    dopplerCli: boolean;
    dopplerShell: boolean;
  };
  secretsPresence: {
    DATABASE_URL: "missing" | "set";
    GEMINI_API_KEY: "missing" | "set";
    GEMINI_MODEL_ID: "missing" | "set";
    TWILIO_ACCOUNT_SID: "missing" | "set";
    TWILIO_AUTH_TOKEN: "missing" | "set";
    STRIPE_SECRET_KEY: "missing" | "set";
    CLOUDBEDS_API_KEY: "missing" | "set";
  };
  voice: {
    geminiConfigured: boolean;
    websocketRoutesRegistered: readonly string[];
    localApi: {
      port: number;
      status: "up" | "down";
      httpStatus?: number;
      detail?: string;
    };
    /** True when keys present; Live WS still needs running server + browser for E2E. */
    readyForLiveProvisioning: boolean;
  };
  integrations: {
    twilio: "configured" | "partial" | "missing";
    stripe: "configured" | "missing";
    /** Global env vs typical production path (tenant DB). */
    cloudbeds: "global_env_set" | "global_env_missing" | "unknown";
  };
  database: {
    connected: boolean;
    state: DbState;
    detail?: string;
    siteConfigsCount: number | null;
    agentsCount: number | null;
  };
  processes: {
    pm2Summary: string;
  };
  tests: {
    catalog: Record<
      string,
      {
        status: CatalogRowStatus;
        reason?: string;
        command: string;
        description: string;
      }
    >;
    /** Synthetic capability rows for agent/orchestrator use. */
    scenarios: {
      live_voice_browser: {
        status: "ready" | "blocked" | "degraded";
        requires: string[];
        blockers: string[];
      };
    };
  };
  summary: {
    catalogRunnable: number;
    catalogDegraded: number;
    catalogBlocked: number;
    catalogTotal: number;
  };
}

export async function buildSystemReadinessReport(): Promise<SystemReadinessReport> {
  const dbProbe = await probeDatabase();
  const health = await probeLocalServerHealth();
  const dopplerCli = dopplerCliInstalled();
  const inDoppler = insideDopplerShell();
  const pm2 = tryPm2Summary();

  let siteConfigsCount: number | null = null;
  let agentsCount: number | null = null;
  if (dbProbe.state === "ok") {
    const counts = await probeDbCounts();
    if (counts.ok) {
      siteConfigsCount = counts.siteConfigs;
      agentsCount = counts.agents;
    }
  }

  const twilioSid = maskEnv("TWILIO_ACCOUNT_SID");
  const twilioToken = maskEnv("TWILIO_AUTH_TOKEN");
  let twilio: "configured" | "partial" | "missing" = "missing";
  if (twilioSid === "set" && twilioToken === "set") twilio = "configured";
  else if (twilioSid === "set" || twilioToken === "set") twilio = "partial";

  const stripeConfigured = maskEnv("STRIPE_SECRET_KEY") === "set";

  const geminiOk = maskEnv("GEMINI_API_KEY") === "set" && maskEnv("GEMINI_MODEL_ID") === "set";
  const liveBlockers: string[] = [];
  if (!geminiOk) liveBlockers.push("GEMINI_API_KEY or GEMINI_MODEL_ID missing");
  if (health.status !== "up") liveBlockers.push(`local /api/health not OK on port ${health.port}`);
  let liveStatus: "ready" | "blocked" | "degraded" = "blocked";
  if (liveBlockers.length === 0) liveStatus = "ready";
  else if (geminiOk && health.status === "down") liveStatus = "degraded";

  const catalog: SystemReadinessReport["tests"]["catalog"] = {};
  let blocked = 0;
  let degraded = 0;
  for (const entry of TEST_CATALOG) {
    const row = rowStatus(entry, dbProbe.state, inDoppler, dopplerCli);
    if (row.status === "blocked") blocked++;
    if (row.status === "degraded") degraded++;
    catalog[entry.script] = {
      status: row.status,
      reason: row.reason === "OK" ? undefined : row.reason,
      command: row.command,
      description: entry.description,
    };
  }

  const generatedAt = new Date().toISOString();
  const { overallStatus, criticalBlockers } = deriveOverallStatusAndBlockers({
    catalog,
    dbState: dbProbe.state,
    dbDetail: dbProbe.detail,
    liveScenario: liveStatus,
    liveBlockers,
  });
  const executionReadiness = deriveExecutionReadiness({
    dbState: dbProbe.state,
    dbDetail: dbProbe.detail,
    geminiOk,
    health,
  });

  return {
    schemaVersion: 4,
    generatedAt,
    overallStatus,
    criticalBlockers,
    executionReadiness,
    provenance: {
      hostname: hostname(),
      environmentLabel: environmentLabel(),
      gitCommit: tryGitCommit(),
    },
    environment: {
      nodeVersion: process.version,
      cwd: process.cwd(),
      dotenvLoaded: true,
      dopplerCli,
      dopplerShell: inDoppler,
    },
    secretsPresence: {
      DATABASE_URL: maskEnv("DATABASE_URL"),
      GEMINI_API_KEY: maskEnv("GEMINI_API_KEY"),
      GEMINI_MODEL_ID: maskEnv("GEMINI_MODEL_ID"),
      TWILIO_ACCOUNT_SID: twilioSid,
      TWILIO_AUTH_TOKEN: twilioToken,
      STRIPE_SECRET_KEY: maskEnv("STRIPE_SECRET_KEY"),
      CLOUDBEDS_API_KEY: maskEnv("CLOUDBEDS_API_KEY"),
    },
    voice: {
      geminiConfigured: geminiOk,
      websocketRoutesRegistered: [...GOVERNED_WEBSOCKET_ROUTES],
      localApi: {
        port: health.port,
        status: health.status,
        httpStatus: health.httpStatus,
        detail: health.detail,
      },
      readyForLiveProvisioning: geminiOk,
    },
    integrations: {
      twilio,
      stripe: stripeConfigured ? "configured" : "missing",
      cloudbeds:
        maskEnv("CLOUDBEDS_API_KEY") === "set" ? "global_env_set" : "global_env_missing",
    },
    database: {
      connected: dbProbe.state === "ok",
      state: dbProbe.state,
      detail: dbProbe.detail,
      siteConfigsCount,
      agentsCount,
    },
    processes: { pm2Summary: pm2 },
    tests: {
      catalog,
      scenarios: {
        live_voice_browser: {
          status: liveStatus,
          requires: ["GEMINI_API_KEY", "GEMINI_MODEL_ID", "server_listening", "browser_mic"],
          blockers: liveBlockers,
        },
      },
    },
    summary: {
      catalogRunnable: TEST_CATALOG.length - blocked - degraded,
      catalogDegraded: degraded,
      catalogBlocked: blocked,
      catalogTotal: TEST_CATALOG.length,
    },
  };
}

/** TTL cache for tool-handler gate (full report is expensive). CLI / HTTP use uncached `buildSystemReadinessReport`. */
const READINESS_GATE_TTL_MS = (() => {
  const raw = process.env.READINESS_GATE_CACHE_MS;
  if (raw === "0" || raw === "") return 0;
  const n = parseInt(raw ?? "25000", 10);
  return Number.isFinite(n) && n >= 0 ? n : 25000;
})();

let readinessGateCache: { at: number; report: SystemReadinessReport } | null = null;

/**
 * Cached snapshot for execution-plane checks. Set `READINESS_GATE_CACHE_MS=0` to disable.
 */
export async function getSystemReadinessReportForExecutionGate(): Promise<SystemReadinessReport> {
  if (READINESS_GATE_TTL_MS <= 0) {
    return buildSystemReadinessReport();
  }
  const now = Date.now();
  if (readinessGateCache && now - readinessGateCache.at < READINESS_GATE_TTL_MS) {
    return readinessGateCache.report;
  }
  const report = await buildSystemReadinessReport();
  readinessGateCache = { at: now, report };
  return report;
}

export function clearSystemReadinessGateCache(): void {
  readinessGateCache = null;
}
