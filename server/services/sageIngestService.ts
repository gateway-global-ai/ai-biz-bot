/**
 * Sage pipeline: resolve → ingest (SerpAPI reviews) → compile (Gemini → markdown) → persist to siteConfigs.knowledgeLibrary.
 * Used by POST /api/intelligence/ingest.
 */
import { randomUUID } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchSerpApiReviews } from "./serpapi-reviews";
import { storage } from "../storage";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SERPAPI_NUM = Math.min(50, Math.max(5, parseInt(process.env.SERPAPI_NUM_REVIEWS ?? "25", 10) || 25));

export interface IngestResult {
  success: boolean;
  reviewsHarvested: number;
  knowledgeDocId?: string;
  error?: string;
}

/**
 * Ingest: fetch reviews for a place (dataId/placeId) via SerpAPI and return a text corpus.
 */
export async function ingestSerpApiReviews(placeId: string): Promise<{ corpus: string; reviewsCount: number }> {
  const result = await fetchSerpApiReviews(placeId, undefined, { num: SERPAPI_NUM });
  if (!result || result.reviews.length === 0) {
    return { corpus: "", reviewsCount: 0 };
  }
  const lines = result.reviews.map((r) => `- [${r.rating}★] ${r.snippet}`).filter(Boolean);
  const corpus = [
    `# Reviews for ${result.place_info?.title || "Business"}`,
    "",
    ...lines,
  ].join("\n");
  return { corpus, reviewsCount: result.reviews.length };
}

/**
 * Compile: send corpus to Gemini and get structured markdown knowledge base.
 */
export async function compileKnowledgeBase(
  businessName: string,
  corpus: string
): Promise<string> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is not configured");
  if (!corpus.trim()) return `# Knowledge: ${businessName}\n\nNo reviews were available to generate insights.\n`;

  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_FALLBACK || (console.error('[GOVERNANCE] GEMINI_MODEL_FALLBACK not set in Doppler'), 'gemini-2.0-flash') });
  const prompt = `You are a business analyst. Below are customer reviews for "${businessName}".

Turn this into a concise, structured markdown knowledge base that an AI concierge can use to answer customer questions. Include:
1. **Summary** – 2–3 sentence overview of what customers say about this business.
2. **Strengths** – What customers praise (bullet points).
3. **Common topics** – Recurring themes (food, service, ambiance, etc.).
4. **Practical info** – Any mentioned details (hours, parking, popular items, price range) if present in the reviews.

Keep the total under 2000 words. Use clear headings and bullets.

---\n${corpus}`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  return text || `# Knowledge: ${businessName}\n\nNo summary could be generated.\n`;
}

/**
 * Run full pipeline: ingest reviews → compile markdown → persist to siteConfig.knowledgeLibrary.
 */
export async function runSageIngest(
  siteConfigId: string,
  dataId: string,
  businessName: string
): Promise<IngestResult> {
  const site = await storage.getSiteConfigById(siteConfigId);
  if (!site) {
    return { success: false, reviewsHarvested: 0, error: "Site not found" };
  }

  const { corpus, reviewsCount } = await ingestSerpApiReviews(dataId);
  const name = businessName || (site as any).name || "Business";

  let markdown: string;
  try {
    markdown = await compileKnowledgeBase(name, corpus);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Compile failed";
    return { success: false, reviewsHarvested: reviewsCount, error: message };
  }

  const existing = Array.isArray((site as any).knowledgeLibrary)
    ? (site as any).knowledgeLibrary
    : [];
  const doc = {
    id: randomUUID(),
    title: `Business Knowledge: ${name}`,
    content: markdown,
    addedAt: new Date().toISOString(),
  };
  const updated = await storage.updateSiteConfig(siteConfigId, {
    knowledgeLibrary: [...existing, doc],
  } as any);
  if (!updated) {
    return { success: false, reviewsHarvested: reviewsCount, error: "Failed to update site config" };
  }
  return {
    success: true,
    reviewsHarvested: reviewsCount,
    knowledgeDocId: doc.id,
  };
}
