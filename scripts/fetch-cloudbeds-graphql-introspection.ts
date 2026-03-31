/**
 * Fetches Cloudbeds GraphQL introspection JSON for docs/knowledge-base/cloudbeds/graphql/.
 * Source of truth for URL: site_pms_integrations.config.cloudbeds_graphql_discovery_v1.http_url
 * (see CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md). Auth: same row as REST Cloudbeds (access_token / api_key).
 * This script uses env overrides for local ingest only — stable names: CLOUDBEDS_GRAPHQL_HTTP_URL,
 * CLOUDBEDS_GRAPHQL_BEARER (or custom header pair). Future: --site-config-id to load row from DB.
 *
 * Run: doppler run -- npx tsx scripts/fetch-cloudbeds-graphql-introspection.ts
 * Or: npm run ingest:cloudbeds-graphql-schema
 *
 * Env:
 *   CLOUDBEDS_GRAPHQL_HTTP_URL — machine GraphQL HTTP endpoint (NOT the docs HTML playground URL).
 *   CLOUDBEDS_GRAPHQL_BEARER — OAuth access token (Authorization: Bearer …), OR
 *   CLOUDBEDS_GRAPHQL_HEADER_NAME + CLOUDBEDS_GRAPHQL_HEADER_VALUE — custom auth pair.
 *
 * Optional:
 *   CLOUDBEDS_GRAPHQL_REDACT=true — set provenance.redacted true if you strip fields before commit (manual).
 *
 * The correct URL is property/app-specific; obtain from Cloudbeds developer console or support.
 */

import * as crypto from "crypto";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs/knowledge-base/cloudbeds/graphql/vendor-introspection.json");
const OUT_PROVENANCE = path.join(ROOT, "docs/knowledge-base/cloudbeds/graphql/vendor-introspection.provenance.json");

const SCRIPT_SPEC = "cloudbeds_graphql_introspection_provenance_v1";
const SCRIPT_VERSION = "1.0.0";

/** Safe on all servers; extend for field-level introspection when needed. */
const MINIMAL_INTROSPECTION = `
query TypeInventory {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      description
    }
  }
}
`;

function gitHeadShort(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

type ProvenanceDoc = {
  spec: typeof SCRIPT_SPEC;
  spec_version: typeof SCRIPT_VERSION;
  fetched_at: string;
  endpoint_url: string;
  /** No secrets — class only: how auth was presented. */
  auth_mode_class: "bearer" | "custom_header";
  script: string;
  introspection_query_kind: "type_inventory_minimal";
  response: {
    http_status: number;
    /** True if `errors` array present in GraphQL response (may still have partial data). */
    graphql_errors_present: boolean;
    /** True if errors present or HTTP indicated partial failure — compare payload manually. */
    partial_or_degraded: boolean;
    /** Set true only if you manually redact the JSON before commit (see env note). */
    redacted: boolean;
  };
  repo_git_head_short: string | null;
};

async function main(): Promise<void> {
  const url = process.env.CLOUDBEDS_GRAPHQL_HTTP_URL?.trim();
  if (!url) {
    console.error(
      "[fetch-cloudbeds-graphql-introspection] CLOUDBEDS_GRAPHQL_HTTP_URL is required (machine endpoint, not docs HTML).",
    );
    process.exit(1);
  }

  const bearer = process.env.CLOUDBEDS_GRAPHQL_BEARER?.trim();
  const hName = process.env.CLOUDBEDS_GRAPHQL_HEADER_NAME?.trim();
  const hVal = process.env.CLOUDBEDS_GRAPHQL_HEADER_VALUE?.trim();

  let authMode: ProvenanceDoc["auth_mode_class"];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
    authMode = "bearer";
  } else if (hName && hVal) {
    headers[hName] = hVal;
    authMode = "custom_header";
  } else {
    console.error(
      "[fetch-cloudbeds-graphql-introspection] Set CLOUDBEDS_GRAPHQL_BEARER or CLOUDBEDS_GRAPHQL_HEADER_NAME + CLOUDBEDS_GRAPHQL_HEADER_VALUE.",
    );
    process.exit(1);
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: MINIMAL_INTROSPECTION }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(
      "[fetch-cloudbeds-graphql-introspection] Non-JSON response (wrong URL or HTML playground). First 200 chars:",
      text.slice(0, 200),
    );
    process.exit(1);
  }

  const body = json as { data?: unknown; errors?: unknown[] };
  const graphqlErrors = Array.isArray(body.errors) && body.errors.length > 0;
  const hasData = body.data != null;
  const partialOrDegraded = graphqlErrors || !hasData;

  if (!res.ok) {
    console.error("[fetch-cloudbeds-graphql-introspection] HTTP", res.status, JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const redactedFlag = process.env.CLOUDBEDS_GRAPHQL_REDACT === "1" || process.env.CLOUDBEDS_GRAPHQL_REDACT === "true";

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(json, null, 2)}\n`, "utf8");

  const buf = fs.readFileSync(OUT);
  const sha = crypto.createHash("sha256").update(buf).digest("hex");

  const provenance: ProvenanceDoc = {
    spec: SCRIPT_SPEC,
    spec_version: SCRIPT_VERSION,
    fetched_at: new Date().toISOString(),
    endpoint_url: url,
    auth_mode_class: authMode,
    script: "scripts/fetch-cloudbeds-graphql-introspection.ts",
    introspection_query_kind: "type_inventory_minimal",
    response: {
      http_status: res.status,
      graphql_errors_present: graphqlErrors,
      partial_or_degraded: partialOrDegraded,
      redacted: redactedFlag,
    },
    repo_git_head_short: gitHeadShort(),
  };

  fs.writeFileSync(OUT_PROVENANCE, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

  console.log("[fetch-cloudbeds-graphql-introspection] Wrote", path.relative(ROOT, OUT));
  console.log("[fetch-cloudbeds-graphql-introspection] Wrote", path.relative(ROOT, OUT_PROVENANCE));
  console.log("[fetch-cloudbeds-graphql-introspection] SHA256 vendor-introspection.json", sha);
  if (partialOrDegraded) {
    console.warn(
      "[fetch-cloudbeds-graphql-introspection] WARNING: GraphQL errors or missing data — review payload before treating as full authority.",
    );
  }
  console.log(
    "[fetch-cloudbeds-graphql-introspection] Next: commit both JSON files; update SCHEMA_INGEST authority + registry checksum strategy; fill MAPPING_REVIEW + PII docs.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
