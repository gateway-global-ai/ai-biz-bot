/**
 * E2E proof pack: Cloudbeds GraphQL discovery onboarding (HTTP).
 *
 * Runs in order: GET status → POST validate (full) → POST validate (skipHttp) → POST mint → POST send-sms (dryRun) → optional live SMS.
 *
 * Required env:
 *   E2E_ADMIN_BEARER_TOKEN — **Platform admin** `auth_sessions` token (`Authorization: Bearer` for admin APIs).
 *     **Not** `CLOUDBEDS_CLIENT_API_KEY` (vendor PMS key → wrong auth plane → **401** on these routes).
 *
 * Site scope (stable key is **`site_configs.id` UUID**, not Google `place_id`):
 *   BOARDWALK_SITE_CONFIG_ID or E2E_SITE_CONFIG_ID — preferred (set from `npm run setup:boardwalk` output or admin API).
 *   If unset and DATABASE_URL is set: optional legacy lookup by Google place_id (deprecated; may be removed).
 *
 * Optional env:
 *   DATABASE_URL — enables legacy Boardwalk resolution when UUID env vars are unset.
 *   E2E_API_BASE — default http://127.0.0.1:3004 (no trailing slash)
 *   INTEGRATION_CONNECT_MINT_SECRET — if set, mint step runs; if unset, mint is skipped with reason.
 *   E2E_LIVE_SMS — set to "1" or "true" to run a second send-sms without dryRun (compliance permitting).
 *
 * Run:
 *   npm run e2e:cloudbeds-graphql-discovery-onboarding-proof -- --confirm-governance
 *   doppler run --config dev -- npm run e2e:cloudbeds-graphql-discovery-onboarding-proof -- --confirm-governance
 *   E2E_CONFIRM_GOVERNANCE=1 … (alternative to CLI flag)
 *
 * **Governance:** This script is NOT production-proof-capable (legacy place_id path possible). You must pass
 * `--confirm-governance` or set `E2E_CONFIRM_GOVERNANCE=1` or the script exits 1.
 *
 * @see docs-governance/canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md
 * @see docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md
 */
import * as fs from "fs";
import * as path from "path";
import { boardwalkSiteConfigIdFromEnv, resolveBoardwalkSiteConfigId } from "./lib/boardwalkSiteIdentity";

const ROOT = path.resolve(import.meta.dirname, "..");

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBase(raw: string): string {
  const t = raw.trim().replace(/\/$/, "");
  return t || "http://127.0.0.1:3004";
}

function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...h };
  if (out.Authorization) {
    const v = out.Authorization;
    out.Authorization = v.length > 12 ? `${v.slice(0, 12)}…[REDACTED]` : "[REDACTED]";
  }
  if (out["X-Integration-Connect-Mint"]) {
    out["X-Integration-Connect-Mint"] = "[REDACTED]";
  }
  return out;
}

async function httpJson(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<{ status: number; json: unknown; text: string }> {
  const init: RequestInit = { method, headers: { ...headers, Accept: "application/json" } };
  if (body !== undefined) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text };
}

type Line = {
  at: string;
  step: string;
  method: string;
  url: string;
  requestHeadersRedacted?: Record<string, string>;
  status: number;
  responseSummary: unknown;
};

function summarizeResponse(json: unknown): unknown {
  if (json == null || typeof json !== "object") return json;
  const o = json as Record<string, unknown>;
  const keys = [
    "skill_id",
    "integration_key",
    "ok",
    "error",
    "code",
    "integrationPresent",
    "lanePresent",
    "onboarding",
    "skipHttpValidation",
    "persisted",
    "status",
    "dryRun",
    "message",
  ];
  const pick: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in o) pick[k] = o[k];
  }
  if (Object.keys(pick).length === 0) return { _keys: Object.keys(o).slice(0, 24) };
  return pick;
}

function governanceConfirmed(): boolean {
  return (
    process.argv.includes("--confirm-governance") ||
    process.env.E2E_CONFIRM_GOVERNANCE === "1" ||
    process.env.E2E_CONFIRM_GOVERNANCE === "true"
  );
}

async function main(): Promise<void> {
  if (!governanceConfirmed()) {
    console.error(`
================================================================================
GOVERNANCE GATE — SCRIPT NOT RUN
This E2E pack is NOT production-proof-capable under zero-trust identity rules.
It may resolve site scope via deprecated legacy paths. Do not treat exit 0 as
"onboarding complete" without Phase 3 evidence (INTEGRATION_GOVERNANCE_INVENTORY_V1).

Run with:  npm run e2e:cloudbeds-graphql-discovery-onboarding-proof -- --confirm-governance
     or:  E2E_CONFIRM_GOVERNANCE=1 doppler run -- npm run e2e:cloudbeds-graphql-discovery-onboarding-proof
================================================================================
`);
    process.exit(1);
  }

  const token = process.env.E2E_ADMIN_BEARER_TOKEN?.trim();
  let siteConfigId = boardwalkSiteConfigIdFromEnv();
  const base = normalizeBase(process.env.E2E_API_BASE?.trim() || process.env.APP_URL?.trim() || "http://127.0.0.1:3004");
  const mintSecret = process.env.INTEGRATION_CONNECT_MINT_SECRET?.trim();
  const liveSms = process.env.E2E_LIVE_SMS === "1" || process.env.E2E_LIVE_SMS === "true";

  const logDir = path.join(
    ROOT,
    "docs-governance/artifacts/e2e-cloudbeds-graphql-discovery-onboarding",
  );
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `proof-${nowIso().replace(/[:.]/g, "-")}.log`);

  const lines: Line[] = [];
  const log = (msg: string) => {
    const line = `[${nowIso()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(logFile, line + "\n", "utf8");
  };

  log(`e2e-cloudbeds-graphql-discovery-onboarding-proof`);
  log(
    `[GOVERNANCE] confirm-governance acknowledged — this run is still NOT production-ready; output is diagnostic/proof-pack only.`,
  );
  log(`E2E_API_BASE=${base}`);
  if (!siteConfigId) {
    const fromDb = await resolveBoardwalkSiteConfigId();
    if (fromDb) {
      siteConfigId = fromDb.siteConfigId;
      log(
        `site_configs.id resolved (source=${fromDb.source}): ${siteConfigId}` +
          (fromDb.source === "legacy_google_place_id_migration_shim"
            ? " — migration shim only; set BOARDWALK_SITE_CONFIG_ID (Google place_id is not platform identity)"
            : ""),
      );
    }
  } else {
    log(`BOARDWALK_SITE_CONFIG_ID / E2E_SITE_CONFIG_ID=${siteConfigId}`);
  }
  if (!siteConfigId) {
    log(`site_configs.id=(MISSING — set BOARDWALK_SITE_CONFIG_ID or E2E_SITE_CONFIG_ID, or DATABASE_URL for deprecated place_id lookup)`);
  }
  log(`E2E_ADMIN_BEARER_TOKEN=${token ? "(set)" : "(MISSING)"}`);
  log(`INTEGRATION_CONNECT_MINT_SECRET=${mintSecret ? "(set)" : "(unset — mint step will skip or expect 503)"}`);
  log(`E2E_LIVE_SMS=${liveSms}`);

  if (!token || !siteConfigId) {
    log(
      "FAIL: Set E2E_ADMIN_BEARER_TOKEN (admin auth_sessions token, not CLOUDBEDS_CLIENT_API_KEY) and BOARDWALK_SITE_CONFIG_ID / E2E_SITE_CONFIG_ID (platform UUID), or DATABASE_URL for deprecated legacy lookup.",
    );
    process.exit(1);
  }

  const adminHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const push = (step: string, method: string, url: string, reqH: Record<string, string>, status: number, json: unknown) => {
    const entry: Line = {
      at: nowIso(),
      step,
      method,
      url,
      requestHeadersRedacted: redactHeaders(reqH),
      status,
      responseSummary: summarizeResponse(json),
    };
    lines.push(entry);
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf8");
  };

  // 1) GET status
  const urlStatus = `${base}/api/integration-onboarding/cloudbeds-graphql-discovery/${encodeURIComponent(siteConfigId)}`;
  const r1 = await httpJson("GET", urlStatus, adminHeaders);
  log(`STEP get_integration_onboarding_status HTTP ${r1.status}`);
  push("get_integration_onboarding_status", "GET", urlStatus, adminHeaders, r1.status, r1.json);

  // 2) POST validate (full probe unless skipHttp forced — first call without skip)
  const urlValidate = `${base}/api/integration-onboarding/cloudbeds-graphql-discovery/${encodeURIComponent(siteConfigId)}/validate`;
  const r2 = await httpJson("POST", urlValidate, adminHeaders, {});
  log(`STEP validate_integration_configuration (full) HTTP ${r2.status}`);
  push("validate_integration_configuration_full", "POST", urlValidate, adminHeaders, r2.status, r2.json);

  // 3) POST validate skipHttp
  const urlValidateSkip = `${urlValidate}?skipHttpValidation=true`;
  const r3 = await httpJson("POST", urlValidateSkip, adminHeaders, {});
  log(`STEP validate_integration_configuration (skipHttp) HTTP ${r3.status}`);
  push("validate_integration_configuration_skip_http", "POST", urlValidateSkip, adminHeaders, r3.status, r3.json);

  // 4) POST mint
  const urlMint = `${base}/api/integration/connect/mint`;
  if (mintSecret) {
    const mintHeaders: Record<string, string> = {
      "X-Integration-Connect-Mint": mintSecret,
      "Content-Type": "application/json",
    };
    const r4 = await httpJson("POST", urlMint, mintHeaders, {
      siteConfigId,
      eligibilityMode: "graphql_discovery_onboarding",
      createdBy: "e2e-cloudbeds-graphql-discovery-onboarding-proof",
    });
    log(`STEP begin_secure_integration_auth_handoff (mint) HTTP ${r4.status}`);
    push("integration_connect_mint", "POST", urlMint, mintHeaders, r4.status, r4.json);
  } else {
    log("STEP integration_connect_mint SKIP (INTEGRATION_CONNECT_MINT_SECRET unset)");
    const r4b = await httpJson("POST", urlMint, { "Content-Type": "application/json" }, { siteConfigId });
    log(`STEP mint without secret (expect 401/503) HTTP ${r4b.status}`);
    push("integration_connect_mint_unauthorized_probe", "POST", urlMint, {}, r4b.status, r4b.json);
  }

  // 5) POST send-sms dryRun
  const urlSms = `${base}/api/integration-onboarding/cloudbeds-graphql-discovery/${encodeURIComponent(siteConfigId)}/send-sms`;
  const r5 = await httpJson("POST", urlSms, adminHeaders, {
    variant: "invitation",
    dryRun: true,
    eligibilityMode: "graphql_discovery_onboarding",
  });
  log(`STEP send_integration_onboarding_sms (dryRun) HTTP ${r5.status}`);
  push("send_integration_onboarding_sms_dry_run", "POST", urlSms, adminHeaders, r5.status, r5.json);

  if (liveSms) {
    log("STEP send_integration_onboarding_sms (LIVE) — E2E_LIVE_SMS enabled");
    const r6 = await httpJson("POST", urlSms, adminHeaders, {
      variant: "invitation",
      dryRun: false,
      eligibilityMode: "graphql_discovery_onboarding",
    });
    log(`STEP send_integration_onboarding_sms (live) HTTP ${r6.status}`);
    push("send_integration_onboarding_sms_live", "POST", urlSms, adminHeaders, r6.status, r6.json);
  } else {
    log("STEP send_integration_onboarding_sms (live) SKIP — set E2E_LIVE_SMS=1 to enable");
  }

  log(`DONE. Log file: ${logFile}`);
  log("Review JSON lines for observed status codes and skill-aligned payloads.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
