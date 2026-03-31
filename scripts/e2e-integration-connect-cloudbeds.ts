/**
 * End-to-end: GET governance-context → mint token → POST exchange → GET governance-context (session echo) → GET surface → GET hotel-details.
 *
 * Requires the same DATABASE_URL your API uses (e.g. Doppler dev config targeting dev DB).
 *
 *   doppler run --config dev -- npm run e2e:integration-connect
 *
 * Default HTTP base: if PORT is set (e.g. Doppler dev), uses http://127.0.0.1:PORT so the running PM2 app is hit.
 * Override: CONNECT_E2E_BASE=https://aibizbot-dev.gatewayglobal.ai
 *
 * Optional: --site-config-id=<uuid> (default: BOARDWALK_SITE_CONFIG_ID / E2E_SITE_CONFIG_ID, else legacy DB lookup, else first cloudbeds site)
 */
import { eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { siteConfigs, sitePmsIntegrations } from "../shared/schema.js";
import { mintIntegrationConnectToken } from "../server/services/integrationConnectTokens.js";
import { boardwalkSiteConfigIdFromEnv, resolveBoardwalkSiteConfigId } from "./lib/boardwalkSiteIdentity.js";

function argValue(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p?.slice(name.length + 1);
}

function parseCookiePair(setCookie: string): string | undefined {
  const part = setCookie.split(";")[0]?.trim();
  return part?.includes("=") ? part : undefined;
}

function buildCookieHeader(setCookies: string[]): string {
  const pairs = setCookies.map(parseCookiePair).filter(Boolean) as string[];
  return pairs.join("; ");
}

async function resolveSiteConfigId(): Promise<string> {
  const fromArg = argValue("--site-config-id");
  if (fromArg?.trim()) return fromArg.trim();

  const fromEnv = boardwalkSiteConfigIdFromEnv();
  if (fromEnv) return fromEnv;

  const resolved = await resolveBoardwalkSiteConfigId();
  if (resolved) return resolved.siteConfigId;

  const rows = await db
    .select({ siteConfigId: sitePmsIntegrations.siteConfigId })
    .from(sitePmsIntegrations)
    .where(eq(sitePmsIntegrations.pmsType, "cloudbeds"))
    .limit(1);
  if (rows[0]) return rows[0].siteConfigId;

  const [any] = await db.select({ id: siteConfigs.id }).from(siteConfigs).limit(1);
  if (!any) throw new Error("No site_configs row — run setup:boardwalk or seed a site.");
  return any.id;
}

async function main() {
  const port = process.env.PORT?.trim();
  const localFromPort =
    port && /^\d+$/.test(port) ? `http://127.0.0.1:${port}` : "";
  const base = (
    argValue("--base") ||
    process.env.CONNECT_E2E_BASE?.trim() ||
    localFromPort ||
    process.env.APP_URL?.trim() ||
    "https://aibizbot-dev.gatewayglobal.ai"
  ).replace(/\/$/, "");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL is missing. Run: doppler run --config dev -- npm run e2e:integration-connect\n" +
        "(or export DATABASE_URL for the same Postgres the API uses).",
    );
    process.exit(1);
  }
  if (!process.env.INTEGRATION_CONNECT_TOKEN_SECRET?.trim()) {
    console.error(`
INTEGRATION_CONNECT_TOKEN_SECRET is not set in the current environment.

It must exist in Doppler for this project/config (same value the Node server uses to mint and validate connect tokens).

1) Generate a secret:  openssl rand -hex 32
2) Add to Doppler (example):  doppler secrets set INTEGRATION_CONNECT_TOKEN_SECRET="<paste>" --config dev
   Or add "INTEGRATION_CONNECT_TOKEN_SECRET" in the Doppler dashboard for dev/stage/prd.
3) Restart the app / PM2 so the API loads it.
4) Run again:  doppler run -- npm run e2e:integration-connect

See .env.example (Operator integration connect) and INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md.
`);
    process.exit(1);
  }

  const siteConfigId = await resolveSiteConfigId();
  console.log(`Using siteConfigId=${siteConfigId}`);

  const govUrl = `${base}/api/integration/connect/governance-context`;
  console.log(`GET ${govUrl} (no cookie)`);
  const rGov0 = await fetch(govUrl, { headers: { Accept: "application/json" } });
  const jGov0 = (await rGov0.json()) as {
    logicalRouteId?: string;
    viewId?: string;
    session?: unknown;
  };
  console.log(`governance-context status=${rGov0.status} body=${JSON.stringify(jGov0)}`);
  if (!rGov0.ok) throw new Error(`governance-context failed: ${rGov0.status}`);
  if (jGov0.logicalRouteId !== "operator.integration.connect" || jGov0.viewId !== "integration_connect_surface") {
    throw new Error("governance-context contract mismatch");
  }
  if (jGov0.session != null) {
    throw new Error("governance-context expected session=null without cookie");
  }

  const minted = await mintIntegrationConnectToken({
    siteConfigId,
    vendorId: "cloudbeds",
    connectLane: "oauth",
    createdBy: "e2e:integration-connect-cloudbeds",
  });

  const exchangeUrl = `${base}/api/integration/connect/exchange`;
  console.log(`POST ${exchangeUrl}`);

  const r1 = await fetch(exchangeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: minted.plainToken }),
  });
  const rawSet = r1.headers.getSetCookie?.() ?? [];
  const j1 = (await r1.json()) as { ok?: boolean; error?: string };
  console.log(`exchange status=${r1.status} body=${JSON.stringify(j1)}`);
  if (!r1.ok || !j1.ok) {
    throw new Error(`Exchange failed: ${r1.status} ${JSON.stringify(j1)}`);
  }

  const cookieHeader = buildCookieHeader(rawSet);
  if (!cookieHeader.includes("integration_connect_sess=")) {
    console.warn("Warning: expected integration_connect_sess in Set-Cookie; continuing with:", cookieHeader || "(empty)");
  }

  console.log(`GET ${govUrl} (with session cookie)`);
  const rGov1 = await fetch(govUrl, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
  });
  const jGov1 = (await rGov1.json()) as {
    logicalRouteId?: string;
    viewId?: string;
    session?: { siteConfigId?: string } | null;
  };
  console.log(`governance-context status=${rGov1.status} body=${JSON.stringify(jGov1)}`);
  if (!rGov1.ok) throw new Error(`governance-context (with cookie) failed: ${rGov1.status}`);
  if (jGov1.session?.siteConfigId !== siteConfigId) {
    throw new Error("governance-context session echo mismatch");
  }

  const surfaceUrl = `${base}/api/integration/connect/cloudbeds/surface`;
  console.log(`GET ${surfaceUrl}`);
  const r2 = await fetch(surfaceUrl, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
  });
  const j2 = await r2.json();
  console.log(`surface status=${r2.status} body=${JSON.stringify(j2, null, 2)}`);
  if (!r2.ok) throw new Error(`Surface failed: ${r2.status}`);

  const hotelUrl = `${base}/api/integration/connect/cloudbeds/hotel-details`;
  console.log(`GET ${hotelUrl}`);
  const r3 = await fetch(hotelUrl, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
  });
  const j3 = await r3.json();
  console.log(`hotel-details status=${r3.status} body=${JSON.stringify(j3, null, 2)}`);

  if (r3.status === 422) {
    console.log("\nNote: 422 property_id_required — set site_pms_integrations.property_id or CLOUDBEDS_CLIENT_PROPERTY_ID.");
  } else if (!r3.ok) {
    console.warn("\nhotel-details non-OK — check Cloudbeds credentials on the PMS row.");
  } else {
    console.log("\ne2e-integration-connect-cloudbeds: OK (exchange + surface + hotel-details)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
