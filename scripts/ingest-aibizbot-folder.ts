import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { storage } from "../server/storage";
import { classifyKnowledgeDocument } from "../server/services/knowledgeClassificationService";

const TARGET_SITE_SLUG = process.env.TARGET_SITE_SLUG?.trim() || "ai-biz-bots";
const TARGET_DIR =
  process.env.TARGET_DIR?.trim() ||
  path.join(process.cwd(), "user_uploads", "new");

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".yaml", ".yml", ".csv", ".json"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const SKIP_EXTENSIONS = new Set([".zip", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const SKIP_NAMES = new Set(["desktop.ini", ".ds_store"]);

function listFilesRecursive(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name.toLowerCase())) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function getSourceType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  if (DOCX_EXTENSIONS.has(ext)) return "docx";
  return "text";
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (SKIP_EXTENSIONS.has(ext)) {
    return "";
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return fs.readFileSync(filePath, "utf8");
  }

  if (PDF_EXTENSIONS.has(ext)) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const fileBuffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(fileBuffer);
      return parsed?.text ?? "";
    } catch (error) {
      console.warn(
        `[Knowledge folder ingest] PDF parse failed for ${path.basename(filePath)}: ${
          (error as Error).message
        }`
      );
      return `[PDF: ${path.basename(filePath)} — text extraction failed in automated ingest. Re-upload via chat window or dedicated parser path.]`;
    }
  }

  if (DOCX_EXTENSIONS.has(ext)) {
    return `[DOCX: ${path.basename(filePath)} — docx extraction is not wired in this script yet. Re-upload via chat window or dedicated parser path.]`;
  }

  return fs.readFileSync(filePath, "utf8");
}

async function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`Target directory not found: ${TARGET_DIR}`);
    process.exit(1);
  }

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

  const filePaths = listFilesRecursive(TARGET_DIR);
  const documentDate = new Date().toISOString().slice(0, 10);
  let added = 0;

  for (const filePath of filePaths) {
    if (existingSourcePaths.has(filePath)) {
      console.log(`Already ingested, skipping: ${filePath}`);
      continue;
    }

    try {
      const content = await extractText(filePath);
      if (!content.trim()) {
        console.warn(`Skipping empty file: ${filePath}`);
        continue;
      }

      if (content.includes("\u0000")) {
        console.warn(`Skipping binary-like content: ${filePath}`);
        continue;
      }

      const sourceName = path.basename(filePath);
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
        sourceType: getSourceType(filePath),
        sourcePath: filePath,
        reviewStatus: "approved",
        visibility: "private",
      };

      existing.push(doc);
      added += 1;
      console.log(
        `[${classified.category}] ${sourceName} -> "${classified.title}" (${classified.topic})`
      );
    } catch (error) {
      console.warn(
        `[Knowledge folder ingest] Skipping ${filePath}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  if (added === 0) {
    console.log("No new knowledge documents were added.");
    return;
  }

  await storage.updateSiteConfig(site.id, { knowledgeLibrary: existing } as any);
  console.log(
    `Done. Added ${added} document(s) from ${TARGET_DIR} to knowledgeLibrary for site slug "${TARGET_SITE_SLUG}".`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
