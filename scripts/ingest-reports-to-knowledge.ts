/**
 * Ingest all documents from the Reports folder into a site's knowledge library.
 * Each file is classified by LLM as api_docs | hotel | platform_economics and indexed.
 *
 * Usage:
 *   SITE_CONFIG_ID=<uuid> doppler run -- npx tsx scripts/ingest-reports-to-knowledge.ts
 *   # or without SITE_CONFIG_ID: uses first site config from DB
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { storage } from "../server/storage";
import { classifyKnowledgeDocument } from "../server/services/knowledgeClassificationService";

const REPORTS_DIR = path.join(process.cwd(), "Reports");
const SKIP_NAMES = new Set(["desktop.ini", ".ds_store"]);
const TEXT_EXT = new Set([".md", ".txt", ".yaml", ".yml", ".csv"]);

function isTextFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return TEXT_EXT.has(ext) || name.endsWith(".md") || name.endsWith(".yaml") || name.endsWith(".yml");
}

async function main() {
  let siteConfigId = process.env.SITE_CONFIG_ID;
  if (!siteConfigId) {
    const { siteConfigs } = await import("@shared/schema");
    const { db } = await import("../server/db");
    const rows = await db.select({ id: siteConfigs.id }).from(siteConfigs).limit(1);
    siteConfigId = rows[0]?.id ?? null;
  }
  if (!siteConfigId) {
    console.error("No site config found. Set SITE_CONFIG_ID or ensure the database has at least one site.");
    process.exit(1);
  }
  await run(siteConfigId);
}

async function run(siteConfigId: string) {
  if (!fs.existsSync(REPORTS_DIR)) {
    console.error("Reports directory not found:", REPORTS_DIR);
    process.exit(1);
  }

  const site = await storage.getSiteConfigById(siteConfigId);
  if (!site) {
    console.error("Site not found:", siteConfigId);
    process.exit(1);
  }

  const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
  const names = fs.readdirSync(REPORTS_DIR).filter((n) => !SKIP_NAMES.has(n.toLowerCase()) && isTextFile(n));

  console.log(`Found ${names.length} files in Reports. Classifying and appending to site ${siteConfigId}...`);

  const documentDate = new Date().toISOString().slice(0, 10);
  let added = 0;

  for (const name of names) {
    const filePath = path.join(REPORTS_DIR, name);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch (e) {
      console.warn("Skip (not utf8):", name);
      continue;
    }

    if (!content.trim()) {
      console.warn("Skip (empty):", name);
      continue;
    }

    try {
      const classified = await classifyKnowledgeDocument(name, content);
      const doc = {
        id: randomUUID(),
        title: classified.title,
        content,
        addedAt: new Date().toISOString(),
        category: classified.category,
        topic: classified.topic,
        documentDate,
      };
      existing.push(doc);
      added++;
      console.log(`  [${classified.category}] ${name} → "${classified.title}" (${classified.topic})`);
    } catch (e) {
      console.warn("Classification failed for", name, (e as Error).message);
    }
  }

  if (added > 0) {
    await storage.updateSiteConfig(siteConfigId, { knowledgeLibrary: existing } as any);
    console.log(`Done. ${added} documents added to knowledge library.`);
  } else {
    console.log("No new documents to add.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
