/**
 * LLM-based classification for knowledge library documents.
 * Ensures consistent tags (api_docs, hotel, platform_economics) for agent indexing.
 * api-lockdown: uses GEMINI_MODEL_ID via generateJsonWithGemini.
 */

import { generateJsonWithGemini } from "./geminiService";

export const KNOWLEDGE_CATEGORIES = ["api_docs", "hotel", "platform_economics"] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

const CONTENT_SAMPLE_MAX = 12000;

export interface ClassifiedDoc {
  category: KnowledgeCategory;
  title: string;
  topic: string;
}

function normalizeCategory(raw: string): KnowledgeCategory {
  const lower = (raw || "").toLowerCase().trim();
  if (lower === "api_docs" || lower === "api docs") return "api_docs";
  if (lower === "hotel" || lower === "category:hotel") return "hotel";
  if (lower === "platform_economics" || lower === "platform economics") return "platform_economics";
  return "platform_economics";
}

/** Filename-based fallback when LLM is unavailable. */
function fallbackClassifyFromFilename(sourceName: string): ClassifiedDoc {
  const lower = sourceName.toLowerCase();
  let category: KnowledgeCategory = "platform_economics";
  if (/openapi|api[_-]?docs|\.yaml|\.yml|endpoints/i.test(lower) && !/platform_economics|voice_platform/.test(lower))
    category = "api_docs";
  else if (/hotel|concierge|boardwalk|pms|hospitality|booking[_-]?agent/i.test(lower))
    category = "hotel";
  const title = sourceName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").slice(0, 80);
  const topic = category === "api_docs" ? "API" : category === "hotel" ? "Hotel" : "Platform";
  return { category, title, topic };
}

/**
 * Classify a document into one of api_docs, hotel, or platform_economics and get a short title and topic.
 */
export async function classifyKnowledgeDocument(
  sourceName: string,
  content: string
): Promise<ClassifiedDoc> {
  const sample =
    content.length <= CONTENT_SAMPLE_MAX
      ? content
      : content.slice(0, CONTENT_SAMPLE_MAX) + "\n\n[content truncated for classification]";

  const prompt = `You are a document classifier. Classify the following document for a knowledge base. Rules:
- category MUST be exactly one of: api_docs, hotel, platform_economics.
  - api_docs: API specifications, OpenAPI, endpoints, technical API documentation.
  - hotel: Hotel operations, PMS, concierge, hospitality, property management, room types, booking.
  - platform_economics: Business model, pricing, platform strategy, economics, plans, summaries, research reports.
- title: A short, clear title (max 80 chars) for the document.
- topic: A short topic tag (max 60 chars) for indexing, e.g. "PMS API", "Voice economics", "Hotel concierge".

Source filename: ${sourceName}

Document content:
---
${sample}
---

Respond with ONLY a JSON object, no markdown, no explanation. Example:
{"category":"platform_economics","title":"Voice Platform Economics","topic":"Voice AI pricing"}`;

  try {
    const out = await generateJsonWithGemini<{ category?: string; title?: string; topic?: string }>(
      prompt
    );
    const category = normalizeCategory(out?.category ?? "");
    const title = String(out?.title ?? sourceName).slice(0, 200) || sourceName;
    const topic = String(out?.topic ?? "General").slice(0, 200) || "General";
    return { category, title, topic };
  } catch (e) {
    console.warn("[KnowledgeClassification] LLM classification failed, using filename fallback:", (e as Error).message);
    return fallbackClassifyFromFilename(sourceName);
  }
}
