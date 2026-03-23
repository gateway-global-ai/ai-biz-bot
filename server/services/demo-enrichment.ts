/**
 * Demo enrichment: after OTP verification, look up the business and run
 * a quick enrichment so the site and bots are knowledgeable (reviews, summary, SWOT).
 * Includes: last 5 reviews, area + review summary, business type, website (optional crawl),
 * 1-mile competitor context (counts + highest/lowest rated examples), and SWOT.
 * Used by POST /api/demo/verify-and-enrich.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCompetitorCounts, fetchNearbyPlacesWithRatings } from "../mcp/placesAggregate";
import { fetchSerpApiReviews } from "./serpapi-reviews";

export interface EnrichmentInput {
  name: string;
  address?: string;
  website?: string;
  types?: string[];
  reviews?: Array<{ text?: string; rating?: number; author_name?: string }>;
  formatted_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  /** For 1-mile competitor context (counts + top/bottom examples). */
  latitude?: number;
  longitude?: number;
  primaryType?: string;
  /** Google Place ID; when set and SERPAPI_API_KEY is present, fetches SerpAPI reviews + topics. */
  placeId?: string;
}

export interface CompetitorSummary {
  total: number;
  highRated: number;
  lowRated: number;
  topRated: Array<{ name: string; rating: number }>;
  bottomRated: Array<{ name: string; rating: number }>;
}

/** DISC profile (0-100 per dimension) tailored to the business vibe and concierge role. */
export interface SuggestedDisc {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

export interface EnrichmentResult {
  reviewsUsed: Array<{ text: string; rating?: number; author_name?: string }>;
  summary: string;
  businessType: string;
  websiteUrl?: string;
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  systemPromptOverride?: string;
  competitorSummary?: CompetitorSummary;
  /** Vibe/tone inferred from reviews; used to tailor agent personality. */
  vibeSummary?: string;
  /** DISC profile derived from vibe + concierge role; influences system prompt. */
  suggestedDisc?: SuggestedDisc;
  /** Top review topics (e.g. "french toast" 128 mentions) from SerpAPI; used for signature items. */
  reviewTopics?: Array<{ keyword: string; mentions: number }>;
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
/** How many reviews to request from SerpAPI per page. More = better SWOT/vibe. */
const SERPAPI_NUM_REVIEWS = Math.min(50, Math.max(5, parseInt(process.env.SERPAPI_NUM_REVIEWS ?? "20", 10) || 20));
/** When we have SerpAPI reviews, send up to this many snippets to Gemini for summary/SWOT/vibe. */
const MAX_REVIEWS_FOR_SWOT = 20;
const COMPETITOR_RADIUS_MILES = 1;
const WEBSITE_EXCERPT_MAX_CHARS = 2500;
const MAX_TOPICS_IN_PROMPT = 12;

/** Fetch URL and return plain text excerpt (strip HTML). */
async function fetchWebsiteExcerpt(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BizBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, WEBSITE_EXCERPT_MAX_CHARS);
  } catch {
    return "";
  }
}

export async function runDemoEnrichment(input: EnrichmentInput): Promise<EnrichmentResult> {
  let reviews = (input.reviews || []).slice(0, 5);
  let reviewTopics: Array<{ keyword: string; mentions: number }> = [];

  if (input.placeId && SERPAPI_API_KEY) {
    const serp = await fetchSerpApiReviews(input.placeId, SERPAPI_API_KEY, { num: SERPAPI_NUM_REVIEWS });
    if (serp) {
      const serpReviewCount = Math.min(serp.reviews.length, MAX_REVIEWS_FOR_SWOT);
      if (serp.reviews.length > 0 && (reviews.length === 0 || reviews.length < serpReviewCount)) {
        reviews = serp.reviews.slice(0, serpReviewCount).map((r) => ({
          text: r.snippet,
          rating: r.rating,
          author_name: r.user?.name,
        }));
      }
      reviewTopics = serp.topics
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, MAX_TOPICS_IN_PROMPT)
        .map((t) => ({ keyword: t.keyword, mentions: t.mentions }));
    }
  }

  const reviewTexts = reviews.map((r) => (r.text || "").trim()).filter(Boolean);
  const skipTypes = ["point_of_interest", "establishment"];
  const primaryType =
    input.primaryType ||
    (input.types || []).filter((t) => !skipTypes.includes(t))[0] ||
    "establishment";
  const businessType =
    (input.types || []).filter((t) => !skipTypes.includes(t)).join(", ") || "Local business";
  const websiteUrl = input.website || undefined;

  let competitorSummary: CompetitorSummary | undefined;
  if (
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    primaryType &&
    GOOGLE_CLOUD_API_KEY
  ) {
    try {
      const [counts, nearby] = await Promise.all([
        getCompetitorCounts(
          input.latitude,
          input.longitude,
          primaryType,
          COMPETITOR_RADIUS_MILES,
          GOOGLE_CLOUD_API_KEY
        ),
        fetchNearbyPlacesWithRatings(
          input.latitude,
          input.longitude,
          primaryType,
          COMPETITOR_RADIUS_MILES,
          GOOGLE_CLOUD_API_KEY
        ),
      ]);
      const excludeName = (input.name || "").toLowerCase().trim();
      const others = nearby.filter(
        (p) => p.name && p.name.toLowerCase().trim() !== excludeName
      );
      const topRated = others.slice(0, 2);
      const bottomRated = others.slice(-2);
      competitorSummary = {
        total: counts.total,
        highRated: counts.highRated,
        lowRated: counts.lowRated,
        topRated,
        bottomRated,
      };
    } catch (e) {
      console.error("[DemoEnrichment] Competitor fetch error:", e);
    }
  }

  let websiteExcerpt = "";
  if (websiteUrl && (websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://"))) {
    websiteExcerpt = await fetchWebsiteExcerpt(websiteUrl);
  }

  let summary = "";
  let vibeSummary: string | undefined;
  let suggestedDisc: SuggestedDisc | undefined;
  let swot = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[],
  };

  if (GEMINI_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_FALLBACK || (console.error('[GOVERNANCE] GEMINI_MODEL_FALLBACK not set in Doppler'), 'gemini-2.0-flash') });

    const competitorBlock = competitorSummary
      ? `
LOCAL COMPETITION (within ${COMPETITOR_RADIUS_MILES} mile):
- Same category competitors: ${competitorSummary.total} (${competitorSummary.highRated} with 4-5 stars, ${competitorSummary.lowRated} below 3 stars).
- Highest-rated nearby: ${competitorSummary.topRated.map((p) => `${p.name} (${p.rating}★)`).join("; ") || "N/A"}.
- Lower-rated nearby (what to avoid): ${competitorSummary.bottomRated.map((p) => `${p.name} (${p.rating}★)`).join("; ") || "N/A"}.
Use this to sound informed about the local market and what works vs. what doesn't.`
      : "";

    const websiteBlock = websiteExcerpt
      ? `
WEBSITE CONTENT (excerpt from business website):
${websiteExcerpt}
Use this to reference specific services, offerings, or tone when answering.`
      : "";

    const topicsBlock =
      reviewTopics.length > 0
        ? `
SIGNATURE ITEMS / WHAT CUSTOMERS MENTION MOST (from review analysis):
${reviewTopics.map((t) => `- ${t.keyword}: ${t.mentions} mentions`).join("\n")}
Use these when relevant so the bot can recommend popular dishes/items.`
        : "";

    const prompt = `You are helping build a knowledgeable AI assistant for a business website. The more the bot knows (reviews, area, competition, website), the more impressed the owner will be.

Business: ${input.name}
Address: ${input.address || "N/A"}
Type: ${businessType}
Website: ${websiteUrl || "N/A"}
Rating: ${input.rating ?? "N/A"} (${input.user_ratings_total ?? 0} reviews)

Last ${reviewTexts.length} reviews:
${reviewTexts.map((t, i) => `[${i + 1}] ${t}`).join("\n\n")}
${competitorBlock}
${websiteBlock}
${topicsBlock}

TASKS (reply with valid JSON only, no markdown):
1. "summary": 2-3 sentences that capture: the area/neighborhood context, a concise review summary, and a business description. This will be used so the AI bot sounds well-versed on the business and the area.
2. "vibe": 2-3 sentences describing the business's VIBE/TONE from the reviews: energy level, tone (e.g. friendly, professional, quirky, luxury, casual, family-oriented), and what customers consistently feel or mention. This drives the agent's personality so the owner feels the bot "gets" them.
3. "disc": A DISC profile (each 0-100) that matches this vibe AND the role of website/voice concierge for this business:
   - dominance: direct/assertive (high) vs accommodating (low)
   - influence: warm/enthusiastic/social (high) vs reserved (low)
   - steadiness: patient/calm/consistent (high) vs fast-paced (low)
   - conscientiousness: precise/detailed/formal (high) vs casual/big-picture (low)
   Tailor so the agent's communication style mirrors the business's vibe (e.g. cozy cafe = higher I and S; law firm = higher D and C). Sum of the four should be roughly 200-400 (they are independent dimensions).
4. "swot": Quick SWOT in 2-3 bullets each (consider reviews, competition, and website if provided):
   - "strengths": array of strings
   - "weaknesses": array of strings
   - "opportunities": array of strings
   - "threats": array of strings

Output format (JSON only):
{"summary":"...","vibe":"...","disc":{"dominance":NN,"influence":NN,"steadiness":NN,"conscientiousness":NN},"swot":{"strengths":["..."],"weaknesses":["..."],"opportunities":["..."],"threats":["..."]}}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response?.text?.()?.trim() || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      summary =
        parsed.summary ||
        `${input.name} is a ${businessType} at ${input.address || "this location"}.`;
      vibeSummary =
        typeof parsed.vibe === "string" && parsed.vibe.trim()
          ? parsed.vibe.trim()
          : undefined;
      const rawDisc = parsed.disc;
      if (
        rawDisc &&
        typeof rawDisc.dominance === "number" &&
        typeof rawDisc.influence === "number" &&
        typeof rawDisc.steadiness === "number" &&
        typeof rawDisc.conscientiousness === "number"
      ) {
        const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
        suggestedDisc = {
          dominance: clamp(rawDisc.dominance),
          influence: clamp(rawDisc.influence),
          steadiness: clamp(rawDisc.steadiness),
          conscientiousness: clamp(rawDisc.conscientiousness),
        };
      }
      swot = {
        strengths: Array.isArray(parsed.swot?.strengths) ? parsed.swot.strengths : [],
        weaknesses: Array.isArray(parsed.swot?.weaknesses) ? parsed.swot.weaknesses : [],
        opportunities: Array.isArray(parsed.swot?.opportunities) ? parsed.swot.opportunities : [],
        threats: Array.isArray(parsed.swot?.threats) ? parsed.swot.threats : [],
      };
    } catch (e) {
      console.error("[DemoEnrichment] Gemini error:", e);
      summary = `${input.name} is a ${businessType}${input.address ? ` at ${input.address}` : ""}. ${reviewTexts.length ? "Customers appreciate the service." : ""}`;
    }
  } else {
    summary = `${input.name} is a ${businessType}${input.address ? ` at ${input.address}` : ""}.`;
  }

  const systemLines = [
    `You are the AI assistant for ${input.name}.`,
    summary,
    businessType ? `Business type: ${businessType}.` : "",
    websiteUrl ? `Website: ${websiteUrl}.` : "",
    swot.strengths.length ? `Strengths to emphasize: ${swot.strengths.join("; ")}.` : "",
  ];
  if (competitorSummary && competitorSummary.total > 0) {
    systemLines.push(
      `Local competition (within ${COMPETITOR_RADIUS_MILES} mi): ${competitorSummary.total} same-category businesses; ${competitorSummary.highRated} highly rated, ${competitorSummary.lowRated} lower rated. Top nearby: ${competitorSummary.topRated.map((p) => `${p.name} (${p.rating}★)`).join(", ")}. Use this to sound knowledgeable about the area.`
    );
  }
  if (reviewTopics.length > 0) {
    systemLines.push(
      `Popular items customers mention (recommend when relevant): ${reviewTopics.slice(0, 8).map((t) => t.keyword).join(", ")}.`
    );
  }
  if (vibeSummary || suggestedDisc) {
    const vibeLine = vibeSummary
      ? `Match this business's vibe: ${vibeSummary}`
      : "";
    const discLine = suggestedDisc
      ? `PERSONALITY (DISC for concierge role): D=${suggestedDisc.dominance}% I=${suggestedDisc.influence}% S=${suggestedDisc.steadiness}% C=${suggestedDisc.conscientiousness}%. ` +
        `Be direct/assertive when D is high; warm/enthusiastic when I is high; patient/calm when S is high; precise/detailed when C is high. Mirror the business's tone so callers feel the bot "gets" the brand.`
      : "";
    systemLines.push([vibeLine, discLine].filter(Boolean).join(" "));
  }
  systemLines.push(
    "Be helpful, concise, and knowledgeable about this business and the local area. If the owner tests you with questions about their business, show you know the reviews, the area, and the competition."
  );
  const systemPromptOverride = systemLines.filter(Boolean).join("\n");

  return {
    reviewsUsed: reviews.map((r) => ({
      text: r.text || "",
      rating: r.rating,
      author_name: r.author_name,
    })),
    summary,
    businessType,
    websiteUrl,
    swot,
    systemPromptOverride,
    competitorSummary,
    vibeSummary,
    suggestedDisc,
    reviewTopics: reviewTopics.length > 0 ? reviewTopics : undefined,
  };
}
