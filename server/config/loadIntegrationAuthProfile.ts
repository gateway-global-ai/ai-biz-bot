/**
 * Load vendor integration auth profiles (supported lanes, scope catalog).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "../..");
const PROFILES_DIR = path.join(ROOT, "registry-yaml/integration-auth-profiles");

export type IntegrationAuthProfileV1 = {
  spec: string;
  version: string;
  vendor_id: string;
  supported_auth_modes: string[];
  version_lanes: string[];
  scope_catalog?: Array<{ scope_id: string; description?: string }>;
};

const cache = new Map<string, IntegrationAuthProfileV1 | null>();

export function loadIntegrationAuthProfile(vendorId: string): IntegrationAuthProfileV1 | null {
  if (cache.has(vendorId)) return cache.get(vendorId) ?? null;
  const file = path.join(PROFILES_DIR, `${vendorId}.v1.yaml`);
  if (!fs.existsSync(file)) {
    cache.set(vendorId, null);
    return null;
  }
  const doc = yaml.load(fs.readFileSync(file, "utf8")) as IntegrationAuthProfileV1;
  cache.set(vendorId, doc);
  return doc;
}

export function resetIntegrationAuthProfileCache(): void {
  cache.clear();
}
