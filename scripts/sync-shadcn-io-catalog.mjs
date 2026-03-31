#!/usr/bin/env node
/**
 * Merges component_index + blocks_index → merged_catalog.v1.json
 * Copies to client/public/shadcn-io/ for the dev directory page.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const regDir = join(root, "registry-yaml/shadcn-io-catalog");
const compPath = join(regDir, "component_index.v1.json");
const blocksPath = join(regDir, "blocks_index.v1.json");
const mergedRegPath = join(regDir, "merged_catalog.v1.json");
const publicDir = join(root, "client/public/shadcn-io");
const mergedPublicPath = join(publicDir, "merged_catalog.v1.json");

const comp = JSON.parse(readFileSync(compPath, "utf-8"));
const blocks = JSON.parse(readFileSync(blocksPath, "utf-8"));

const merged = {
  spec: "shadcn_io_merged_catalog_v1",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  disclaimer: comp.disclaimer,
  blocksDisclaimer: blocks.disclaimer,
  sourceReadme: comp.sourceReadme,
  blocksSource: blocks.source,
  entryCount: comp.entries.length + blocks.entries.length,
  entries: [...comp.entries, ...blocks.entries],
};

mkdirSync(publicDir, { recursive: true });
const json = JSON.stringify(merged, null, 2);
writeFileSync(mergedRegPath, json, "utf-8");
writeFileSync(mergedPublicPath, json, "utf-8");
console.log(
  `Merged ${merged.entryCount} entries → ${mergedRegPath} + ${mergedPublicPath}`,
);
