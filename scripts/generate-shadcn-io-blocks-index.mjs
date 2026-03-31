#!/usr/bin/env node
/**
 * Generates registry-yaml/shadcn-io-catalog/blocks_index.v1.json
 * — curated block paths under https://www.shadcn.io/blocks/...
 * Recipe URLs are conventional; confirm on each doc page.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "registry-yaml/shadcn-io-catalog/blocks_index.v1.json");

const base = "https://www.shadcn.io";

/** Hero block slugs (hero-01 … hero-12) — expand as upstream publishes more */
const heroSlugs = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `hero-${n}`;
});

const entries = heroSlugs.map((slug) => {
  const path = `blocks/hero/${slug}`;
  const docUrl = `${base}/${path}`;
  const recipeSlug = slug;
  const recipeUrl = `${base}/r/${recipeSlug}.json`;
  return {
    id: `blocks:hero:${slug}`,
    category: "blocks",
    subcategory: "hero",
    slug,
    title: `Hero ${slug.replace("hero-", "")}`,
    docUrl,
    recipeUrl,
    installCommand: `npx shadcn@latest add ${recipeUrl}`,
  };
});

const doc = {
  spec: "shadcn_io_blocks_index_v1",
  version: "1.0.0",
  source: "https://www.shadcn.io/blocks — generated hero grid; extend scripts for more sections",
  disclaimer:
    "Recipe URLs are conventional (…/r/hero-NN.json). Verify on each doc page. shadcn.io is not affiliated with official shadcn/ui.",
  entryCount: entries.length,
  entries,
};

writeFileSync(out, JSON.stringify(doc, null, 2), "utf-8");
console.log(`Wrote ${entries.length} block entries → ${out}`);
