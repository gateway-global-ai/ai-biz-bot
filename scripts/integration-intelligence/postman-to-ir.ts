/**
 * Postman Collection v2.1 → integration IR v1 (offline).
 * Usage: npx tsx scripts/integration-intelligence/postman-to-ir.ts <collection.json> --vendor <id> [--out <file.yaml>]
 */
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import yaml from "js-yaml";

type PmRequest = {
  method?: string;
  header?: unknown[];
  url?: string | { raw?: string; path?: string[] };
  body?: unknown;
};

type PmItem = {
  name?: string;
  request?: PmRequest;
  item?: PmItem[];
};

type PmCollection = {
  info?: { name?: string };
  item?: PmItem[];
};

function hash16(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function extractUrl(req: PmRequest): string {
  const u = req.url;
  if (typeof u === "string") return u;
  if (u && typeof u === "object") {
    if (u.raw) return u.raw;
    if (u.path?.length) return "/" + u.path.join("/");
  }
  return "/unknown";
}

/** Strip host; keep path + query template roughly */
function toPathTemplate(raw: string): string {
  try {
    const parsed = new URL(raw, "http://dummy.local");
    return parsed.pathname || "/";
  } catch {
    return raw.split("?")[0] || "/";
  }
}

function walkItems(items: PmItem[] | undefined, acc: PmItem[]): void {
  if (!items) return;
  for (const it of items) {
    if (it.request) acc.push(it);
    if (it.item?.length) walkItems(it.item, acc);
  }
}

function normalizePostman(doc: PmCollection, vendorId: string, sourcePath: string): Record<string, unknown> {
  const leaves: PmItem[] = [];
  walkItems(doc.item, leaves);

  const endpoints: Record<string, unknown>[] = [];
  for (const leaf of leaves) {
    const req = leaf.request!;
    const method = (req.method || "GET").toUpperCase();
    const pathTemplate = toPathTemplate(extractUrl(req));
    const operationName = leaf.name || `${method}_${pathTemplate.replace(/\W/g, "_")}`;
    const endpointId = `${vendorId}_${hash16([vendorId, method, pathTemplate, operationName])}`;

    endpoints.push({
      endpoint_id: endpointId,
      spec_version: "1.0.0",
      vendor_id: vendorId,
      source_tier: "postman",
      method,
      path_template: pathTemplate.startsWith("/") ? pathTemplate : `/${pathTemplate}`,
      operation_name: operationName,
      security_requirements: [{ scheme_id: "unknown", scopes: [] }],
      path_parameters: [],
      query_parameters: [],
      request_body: req.body ? { content_types: ["*/*"], schema_ref: "unknown", required: false } : null,
      responses: { "200": { schema_ref: "unknown" } },
      pagination_mode: "unknown",
      rate_limit_class: "unknown",
      idempotency: method === "GET" ? "supported" : "unknown",
      side_effect_level: method === "GET" ? "read" : "unknown",
      entity_anchors: [],
      creates_anchors: [],
      consumes_anchors: [],
      related_capability_ids: [],
      stability_score: 0.55,
      documentation_source: sourcePath,
      adapter_status: "unmapped",
      stability_notes: "Postman ingest; confirm against OpenAPI or live traffic before deployable.",
    });
  }

  return {
    spec: "integration_ir_v1",
    ir_version: "1.0.0",
    vendor_id: vendorId,
    source_tier: "postman",
    generated_at: new Date().toISOString(),
    collection_name: doc.info?.name,
    endpoints,
  };
}

function parseArgs(argv: string[]): { file: string; vendor: string; out?: string } {
  const file = argv[2];
  if (!file) {
    console.error(
      "Usage: postman-to-ir.ts <collection.json> --vendor <vendor_id> [--out path.yaml]",
    );
    process.exit(1);
  }
  let vendor = "";
  let out: string | undefined;
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--vendor" && argv[i + 1]) vendor = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  if (!vendor) {
    console.error("--vendor is required");
    process.exit(1);
  }
  return { file, vendor, out };
}

const { file, vendor, out } = parseArgs(process.argv);
const abs = path.resolve(file);
const doc = JSON.parse(fs.readFileSync(abs, "utf8")) as PmCollection;
const ir = normalizePostman(doc, vendor, abs);
const yamlOut = yaml.dump(ir, { lineWidth: 120, noRefs: true });
if (out) {
  fs.writeFileSync(path.resolve(out), yamlOut, "utf8");
  console.log(`Wrote ${out} (${(ir.endpoints as unknown[]).length} endpoints)`);
} else {
  process.stdout.write(yamlOut);
}
