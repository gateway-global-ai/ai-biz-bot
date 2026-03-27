/**
 * OpenAPI 3.x → integration IR v1 (offline). Does not write governed registries.
 * Usage: npx tsx scripts/integration-intelligence/openapi-to-ir.ts <openapi.json|yaml> --vendor <id> [--out <file.yaml>]
 */
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import yaml from "js-yaml";

type Oas3 = {
  openapi?: string;
  paths?: Record<string, Record<string, unknown>>;
  info?: { title?: string };
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function hash16(parts: string[]): string {
  const h = crypto.createHash("sha256").update(parts.join("|")).digest("hex");
  return h.slice(0, 16);
}

function stabilityForOp(hasResponseSchema: boolean, method: string, sourceTier: string): number {
  let s = sourceTier === "openapi" ? 1.0 : 0.85;
  if (!hasResponseSchema) s -= 0.15;
  if (!["get", "head", "options"].includes(method.toLowerCase())) s -= 0.1;
  return Math.max(0, Math.min(1, s));
}

function normalizeOpenapi(doc: Oas3, vendorId: string, sourcePath: string): Record<string, unknown> {
  const paths = doc.paths || {};
  const endpoints: Record<string, unknown>[] = [];

  for (const [p, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of Object.keys(pathItem)) {
      if (!/^(get|post|put|patch|delete|head|options)$/i.test(method)) continue;
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op || typeof op !== "object") continue;
      const operationName =
        (typeof op.operationId === "string" && op.operationId) ||
        `${method}_${slug(p.replace(/[{}]/g, ""))}`;
      const endpointId = `${vendorId}_${hash16([vendorId, method.toUpperCase(), p, operationName])}`;
      const responses = op.responses as Record<string, unknown> | undefined;
      const first200 = responses?.["200"] ?? responses?.["201"];
      const hasSchema =
        !!first200 &&
        typeof first200 === "object" &&
        first200 !== null &&
        "content" in first200;

      endpoints.push({
        endpoint_id: endpointId,
        spec_version: "1.0.0",
        vendor_id: vendorId,
        source_tier: "openapi",
        method: method.toUpperCase(),
        path_template: p.startsWith("/") ? p : `/${p}`,
        operation_name: operationName,
        security_requirements: Array.isArray(op.security)
          ? op.security
          : [{ scheme_id: "inherited", scopes: [] }],
        path_parameters: [],
        query_parameters: [],
        request_body: op.requestBody ? { content_types: ["application/json"], schema_ref: "inferred", required: true } : null,
        responses: responses ? Object.fromEntries(Object.keys(responses).map((k) => [k, { schema_ref: "inferred" }])) : {},
        pagination_mode: "unknown",
        rate_limit_class: "unknown",
        idempotency: method.toLowerCase() === "get" ? "supported" : "unknown",
        side_effect_level: method.toLowerCase() === "get" ? "read" : "unknown",
        entity_anchors: [],
        creates_anchors: [],
        consumes_anchors: [],
        related_capability_ids: [],
        stability_score: stabilityForOp(!!hasSchema, method, "openapi"),
        documentation_source: sourcePath,
        adapter_status: "unmapped",
        stability_notes:
          stabilityForOp(!!hasSchema, method, "openapi") < 0.7
            ? "Ingest-only draft; human must complete normalization per INTEGRATION_CAPABILITY_GRAPH_SPEC_V1."
            : undefined,
      });
    }
  }

  return {
    spec: "integration_ir_v1",
    ir_version: "1.0.0",
    vendor_id: vendorId,
    source_tier: "openapi",
    generated_at: new Date().toISOString(),
    openapi_version: doc.openapi ?? "unknown",
    source_title: doc.info?.title,
    endpoints,
  };
}

function parseArgs(argv: string[]): { file: string; vendor: string; out?: string } {
  const file = argv[2];
  if (!file) {
    console.error(
      "Usage: openapi-to-ir.ts <openapi.json|yaml> --vendor <vendor_id> [--out path.yaml]",
    );
    process.exit(1);
  }
  let vendor = "";
  let out: string | undefined;
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--vendor" && argv[i + 1]) {
      vendor = argv[++i];
    } else if (argv[i] === "--out" && argv[i + 1]) {
      out = argv[++i];
    }
  }
  if (!vendor) {
    console.error("--vendor is required");
    process.exit(1);
  }
  return { file, vendor, out };
}

function loadDoc(filePath: string): Oas3 {
  const raw = fs.readFileSync(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".yaml" || ext === ".yml") {
    return yaml.load(raw) as Oas3;
  }
  return JSON.parse(raw) as Oas3;
}

const { file, vendor, out } = parseArgs(process.argv);
const abs = path.resolve(file);
const doc = loadDoc(abs);
const ir = normalizeOpenapi(doc, vendor, abs);
const yamlOut = yaml.dump(ir, { lineWidth: 120, noRefs: true });
if (out) {
  fs.writeFileSync(path.resolve(out), yamlOut, "utf8");
  console.log(`Wrote ${out} (${(ir.endpoints as unknown[]).length} endpoints)`);
} else {
  process.stdout.write(yamlOut);
}
