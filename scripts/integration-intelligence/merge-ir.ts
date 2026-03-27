/**
 * Merge two integration_ir_v1 YAML/JSON documents (endpoints concatenated, dedupe by endpoint_id).
 * Usage: npx tsx scripts/integration-intelligence/merge-ir.ts <a.yaml> <b.yaml> --out <merged.yaml>
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

type IrDoc = {
  spec?: string;
  ir_version?: string;
  vendor_id?: string;
  endpoints?: Array<{ endpoint_id: string }>;
};

function load(p: string): IrDoc {
  const raw = fs.readFileSync(p, "utf8");
  if (p.endsWith(".json")) return JSON.parse(raw);
  return yaml.load(raw) as IrDoc;
}

const aPath = process.argv[2];
const bPath = process.argv[3];
let outPath: string | undefined;
for (let i = 4; i < process.argv.length; i++) {
  if (process.argv[i] === "--out" && process.argv[i + 1]) outPath = process.argv[++i];
}

if (!aPath || !bPath || !outPath) {
  console.error("Usage: merge-ir.ts <a.yaml> <b.yaml> --out <merged.yaml>");
  process.exit(1);
}

const A = load(path.resolve(aPath));
const B = load(path.resolve(bPath));
const vendor = A.vendor_id || B.vendor_id || "merged";

const byId = new Map<string, Record<string, unknown>>();
for (const bundle of [A, B]) {
  for (const e of bundle.endpoints || []) {
    const row = e as Record<string, unknown>;
    const id = row.endpoint_id as string;
    if (!id) continue;
    const prev = byId.get(id);
    if (prev && prev.source_tier === "openapi" && row.source_tier === "postman") continue;
    byId.set(id, row);
  }
}

const merged = {
  spec: "integration_ir_v1",
  ir_version: A.ir_version || B.ir_version || "1.0.0",
  vendor_id: vendor,
  source_tier: "merged",
  generated_at: new Date().toISOString(),
  merge_sources: [path.resolve(aPath), path.resolve(bPath)],
  endpoints: [...byId.values()],
};

fs.writeFileSync(path.resolve(outPath), yaml.dump(merged, { lineWidth: 120, noRefs: true }), "utf8");
console.log(`Wrote ${outPath} (${merged.endpoints.length} endpoints)`);
