/**
 * Load integration capability rows for the credential broker (runtime).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "../..");
const CAPS_DIR = path.join(ROOT, "registry-yaml/integration-capabilities");

export type IntegrationCapabilityBrokerRow = {
  capability_id: string;
  vendor_id: string;
  required_scope_ids?: string[];
  allowed_version_lanes?: string[];
  tool_name?: string | null;
  credential_anchor_ref?: string;
};

function listYamlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => path.join(dir, f));
}

let cached: Map<string, IntegrationCapabilityBrokerRow> | null = null;

export function loadIntegrationCapabilityRegistry(): Map<string, IntegrationCapabilityBrokerRow> {
  if (cached) return cached;
  const map = new Map<string, IntegrationCapabilityBrokerRow>();
  for (const file of listYamlFiles(CAPS_DIR)) {
    const doc = yaml.load(fs.readFileSync(file, "utf8")) as {
      capabilities?: IntegrationCapabilityBrokerRow[];
    };
    for (const c of doc.capabilities ?? []) {
      if (c.capability_id) map.set(c.capability_id, c);
    }
  }
  cached = map;
  return map;
}

export function getIntegrationCapabilityRow(
  capabilityId: string,
): IntegrationCapabilityBrokerRow | undefined {
  return loadIntegrationCapabilityRegistry().get(capabilityId);
}

/** Test helper */
export function resetIntegrationCapabilityRegistryCache(): void {
  cached = null;
}
