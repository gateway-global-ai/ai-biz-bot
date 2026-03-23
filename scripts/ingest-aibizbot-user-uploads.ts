import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { storage } from "../server/storage";
import { classifyKnowledgeDocument } from "../server/services/knowledgeClassificationService";

const TARGET_SITE_SLUG = process.env.TARGET_SITE_SLUG?.trim() || "ai-biz-bots";
const UPLOAD_FILES = [
  {
    sourcePath: path.join(process.cwd(), "user_uploads", "aibizbot_training_model.md"),
    sourceType: "upload",
  },
  {
    sourcePath: path.join(process.cwd(), "user_uploads", "knowledgebase.md"),
    sourceType: "upload",
  },
  {
    sourcePath: path.join(process.cwd(), "user_uploads", "founder_knowledge_core.md"),
    sourceType: "derived",
  },
] as const;

async function main() {
  const site = await storage.getSiteConfigBySlug(TARGET_SITE_SLUG);
  if (!site) {
    console.error(`Target site not found for slug: ${TARGET_SITE_SLUG}`);
    process.exit(1);
  }

  const existing = Array.isArray((site as any).knowledgeLibrary)
    ? ([...(site as any).knowledgeLibrary] as any[])
    : [];

  const existingSourcePaths = new Set(
    existing
      .map((doc) =>
        typeof doc?.sourcePath === "string" ? doc.sourcePath : undefined
      )
      .filter((value): value is string => Boolean(value))
  );

  const documentDate = new Date().toISOString().slice(0, 10);
  let added = 0;

  for (const file of UPLOAD_FILES) {
    if (!fs.existsSync(file.sourcePath)) {
      console.warn(`Skipping missing file: ${file.sourcePath}`);
      continue;
    }

    if (existingSourcePaths.has(file.sourcePath)) {
      console.log(`Already ingested, skipping: ${file.sourcePath}`);
      continue;
    }

    const content = fs.readFileSync(file.sourcePath, "utf8");
    if (!content.trim()) {
      console.warn(`Skipping empty file: ${file.sourcePath}`);
      continue;
    }

    const sourceName = path.basename(file.sourcePath);
    const classified = await classifyKnowledgeDocument(sourceName, content);
    const now = new Date().toISOString();

    const doc = {
      id: randomUUID(),
      title: classified.title,
      content,
      addedAt: now,
      category: classified.category,
      topic: classified.topic,
      documentDate,
      sourceType: file.sourceType,
      sourcePath: file.sourcePath,
      reviewStatus: "approved",
      visibility: "private",
    };

    existing.push(doc);
    added += 1;
    console.log(
      `[${classified.category}] ${sourceName} -> "${classified.title}" (${classified.topic})`
    );
  }

  if (added === 0) {
    console.log("No new knowledge documents were added.");
    return;
  }

  await storage.updateSiteConfig(site.id, { knowledgeLibrary: existing } as any);
  console.log(
    `Done. Added ${added} document(s) to knowledgeLibrary for site slug "${TARGET_SITE_SLUG}".`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
