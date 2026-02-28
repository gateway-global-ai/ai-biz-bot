#!/usr/bin/env npx tsx
/**
 * Signature check: every env key declared in .env.example must be documented
 * in docs/SOVEREIGN_ENV_MANIFEST.md (Naming Constitution).
 * Run: npm run check-env-manifest
 */

import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dirname, "..");
const envExamplePath = join(repoRoot, ".env.example");
const manifestPath = join(repoRoot, "docs", "SOVEREIGN_ENV_MANIFEST.md");

function extractKeysFromEnvExample(content: string): string[] {
  const keys = new Set<string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.add(match[1]);
  }
  return [...keys].sort();
}

function main(): void {
  const envContent = readFileSync(envExamplePath, "utf-8");
  const manifestContent = readFileSync(manifestPath, "utf-8");
  const keys = extractKeysFromEnvExample(envContent);
  const missing: string[] = [];
  for (const key of keys) {
    if (!manifestContent.includes(key)) missing.push(key);
  }
  if (missing.length > 0) {
    console.error("SOVEREIGN_CONFIGURATION_ERROR: The following keys in .env.example are not documented in docs/SOVEREIGN_ENV_MANIFEST.md:");
    missing.forEach((k) => console.error("  -", k));
    console.error("\nAdd each key to the manifest (canonical names + allowed aliases table or equivalent section) before committing .env.example changes.");
    process.exit(1);
  }
  console.log("OK: All", keys.length, "keys from .env.example are documented in SOVEREIGN_ENV_MANIFEST.md.");
}

main();
