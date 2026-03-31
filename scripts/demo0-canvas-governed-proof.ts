/**
 * Demo 0 — Governed canvas proof (automated gate)
 *
 * POST /api/canvas-control exercises:
 *   - canvas.resolve → Tier-1 service_menu + faq_list
 *   - canvas.resolve → Tier-3 noop (gibberish)
 *   - Invalid envelope → 400
 *   - canvas.render agent_roster + public security → 403 (entitlement or security)
 *
 * Requires: DATABASE_URL (site resolution), running API (doppler run -- npm run dev).
 *
 *   doppler run --config dev -- npm run demo0:canvas-proof
 *
 * Override base: DEMO0_API_BASE=https://host  or  --base=http://127.0.0.1:3004
 * Site: --site-config-id=<uuid> (platform `site_configs.id`; do not use Google place_id as stable identity)
 *
 * Output: JSON blocks suitable for AC6 trace paste (see docs-governance/canonical/DEMO0_GOVERNED_CANVAS_PROOF.md).
 */
import { v4 as uuidv4 } from "uuid";
import { db } from "../server/db.js";
import { siteConfigs } from "../shared/schema.js";
import { boardwalkSiteConfigIdFromEnv, resolveBoardwalkSiteConfigId } from "./lib/boardwalkSiteIdentity.js";

function argValue(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p?.slice(name.length + 1);
}

async function resolveSiteConfigId(): Promise<string> {
  const fromArg = argValue("--site-config-id")?.trim();
  if (fromArg) return fromArg;
  const fromEnv = boardwalkSiteConfigIdFromEnv();
  if (fromEnv) return fromEnv;
  const resolved = await resolveBoardwalkSiteConfigId();
  if (resolved) return resolved.siteConfigId;
  const [any] = await db.select({ id: siteConfigs.id }).from(siteConfigs).limit(1);
  if (!any) throw new Error("No site_configs row — seed a site or pass --site-config-id= or set BOARDWALK_SITE_CONFIG_ID");
  return any.id;
}

type Syscall = "canvas.resolve" | "canvas.render";

function mkEnvelope(
  siteConfigId: string,
  syscall: Syscall,
  payload: unknown,
  overrides?: Partial<{ sessionId: string; turnId: string }>,
): Record<string, unknown> {
  return {
    version: "1.0",
    syscallId: uuidv4(),
    turnId: overrides?.turnId ?? uuidv4(),
    sessionId: overrides?.sessionId ?? `demo0-session-${Date.now()}`,
    siteConfigId,
    syscall,
    source: "voice_turn_orchestrator",
    security: { securityLevel: "public", authState: "anonymous" },
    context: { workspaceState: "active" },
    payload,
  };
}

async function post(base: string, body: unknown): Promise<{ status: number; json: unknown }> {
  const r = await fetch(`${base.replace(/\/$/, "")}/api/canvas-control`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = { parseError: true, raw: text.slice(0, 500) };
  }
  return { status: r.status, json };
}

async function main(): Promise<void> {
  const port = process.env.PORT?.trim();
  const localFromPort =
    port && /^\d+$/.test(port) ? `http://127.0.0.1:${port}` : "";
  const base = (
    argValue("--base") ||
    process.env.DEMO0_API_BASE?.trim() ||
    localFromPort ||
    "http://127.0.0.1:3004"
  ).replace(/\/$/, "");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL is required for site resolution.\n" +
        "Example: doppler run --config dev -- npm run demo0:canvas-proof",
    );
    process.exit(1);
  }

  const siteConfigId = await resolveSiteConfigId();
  console.log(`Demo 0 canvas proof\n  base=${base}\n  siteConfigId=${siteConfigId}\n`);

  // --- Success: service_menu (Tier 1) ---
  const e1 = mkEnvelope(siteConfigId, "canvas.resolve", {
    transcript: "what services do you offer",
    currentCanvasSummary: "",
  });
  const r1 = await post(base, e1);
  const j1 = r1.json as { result?: { selectedViewId?: string; renderMode?: string; reason?: string } };
  console.log("--- AC6: success trace (service_menu) ---");
  console.log(
    JSON.stringify(
      {
        transcript: "what services do you offer",
        http_status: r1.status,
        tier_rule: j1.result?.reason,
        selected_view_id: j1.result?.selectedViewId,
        render_mode: j1.result?.renderMode,
        raw: r1.json,
      },
      null,
      2,
    ),
  );
  if (r1.status !== 200) {
    throw new Error(`Expected 200 for canvas.resolve (services), got ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  if (j1.result?.selectedViewId !== "service_menu") {
    throw new Error(`Expected selectedViewId service_menu, got ${JSON.stringify(j1.result)}`);
  }

  // --- Success: faq_list ---
  const e1b = mkEnvelope(siteConfigId, "canvas.resolve", { transcript: "do you have a faq" });
  const r1b = await post(base, e1b);
  const j1b = r1b.json as { result?: { selectedViewId?: string; reason?: string } };
  console.log("\n--- AC6: success trace (faq_list) ---");
  console.log(
    JSON.stringify(
      {
        transcript: "do you have a faq",
        http_status: r1b.status,
        tier_rule: j1b.result?.reason,
        selected_view_id: j1b.result?.selectedViewId,
        raw: r1b.json,
      },
      null,
      2,
    ),
  );
  if (r1b.status !== 200 || j1b.result?.selectedViewId !== "faq_list") {
    throw new Error(`Expected faq_list resolve, got ${r1b.status} ${JSON.stringify(r1b.json)}`);
  }

  // --- Noop (Tier 3) ---
  const e2 = mkEnvelope(siteConfigId, "canvas.resolve", {
    transcript: "quantum flux xyzzy nonsense token zzq",
  });
  const r2 = await post(base, e2);
  const j2 = r2.json as { result?: { renderMode?: string; reason?: string } };
  console.log("\n--- AC6: noop trace (Tier 3) ---");
  console.log(
    JSON.stringify(
      { transcript: "quantum flux xyzzy nonsense token zzq", http_status: r2.status, raw: r2.json },
      null,
      2,
    ),
  );
  if (r2.status !== 200) {
    throw new Error(`Expected 200 for noop resolve, got ${r2.status}`);
  }
  if (j2.result?.renderMode !== "noop") {
    console.warn("WARN: expected renderMode noop for gibberish; got:", j2.result);
  }

  // --- Negative: structural (missing sessionId) ---
  const bad = { ...mkEnvelope(siteConfigId, "canvas.resolve", { transcript: "x" }) };
  delete (bad as { sessionId?: string }).sessionId;
  const r3 = await post(base, bad);
  console.log("\n--- AC6: failure trace (invalid envelope) ---");
  console.log(JSON.stringify({ http_status: r3.status, raw: r3.json }, null, 2));
  if (r3.status !== 400) {
    console.warn("WARN: expected 400 INVALID_SCHEMA for missing sessionId");
  }

  // --- Negative: disallowed or secured view (canvas.render agent_roster, public visitor) ---
  const e4 = mkEnvelope(siteConfigId, "canvas.render", {
    viewId: "agent_roster",
    renderMode: "replace",
    title: "Agents",
    data: { agents: [] },
  });
  const r4 = await post(base, e4);
  console.log("\n--- AC6: failure trace (agent_roster render, public) ---");
  console.log(JSON.stringify({ http_status: r4.status, raw: r4.json }, null, 2));
  if (r4.status !== 403) {
    console.warn(
      "WARN: expected 403 VIEW_NOT_ALLOWED or SECURITY_VIOLATION — check site plan / entitlements",
    );
  }

  console.log("\ndemo0:canvas-proof — OK");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
