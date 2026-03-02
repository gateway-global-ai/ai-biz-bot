/**
 * Data Ingestion Handler — Google Business Intelligence Tools
 *
 * Three sovereign tools for the Business Intelligence "Data Miner" Agent (Sage):
 *
 *   resolve_data_id         — query string → stable SerpAPI data_id
 *   ingest_serpapi_reviews  — data_id → paginated review harvest → DB snapshot
 *   compile_knowledge_base  — reviews + topics → Gemini SWOT → knowledgeLibrary insert
 *
 * All SerpAPI calls are server-side. API keys never touch the client.
 */

import { storage } from '../storage.js';
import { db } from '../db.js';
import { eq } from 'drizzle-orm';
import { siteConfigs, platformBusinessMap, platformBusinessEnrichmentSnapshots } from '@shared/schema';
import { getBusinessReviewsPaginated, analyzeReviewsWithGemini } from '../services/reviewAnalysisService.js';
import { fetchSerpApiReviews, type SerpApiReview, type SerpApiTopic } from '../services/serpapi-reviews.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ResolvedBusinessIdentity {
  data_id: string;
  lat: number;
  lng: number;
  business_name: string;
  address: string;
  serpapi_reviews_link?: string;
}

export interface IngestResult {
  review_count: number;
  topics_extracted: Array<{ keyword: string; mentions: number }>;
  place_info: {
    title: string;
    address: string;
    rating: number;
    total_reviews: number;
    type: string;
  };
  snapshot_id: string;
}

export interface KnowledgeBaseEntry {
  knowledge_entry_id: string;
  disc_recommendation: { d: number; i: number; s: number; c: number };
  review_count: number;
  topics_extracted: string[];
  markdown_preview: string;
}

// ── Tool 1: resolve_data_id ────────────────────────────────────────────────────

/**
 * Resolve a business name string to a stable SerpAPI data_id.
 * Uses SerpAPI google_maps_autocomplete — returns data_id from first suggestion.
 * The data_id is stable; Google's place_id rotates and should not be used for storage.
 */
export async function resolve_data_id(
  query: string,
  ll: string = '@40.7455096,-74.0083012,14z',
  siteConfigId?: string,
): Promise<ResolvedBusinessIdentity> {
  const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? process.env.SERP_API_KEY;
  if (!apiKey) throw new Error('[DataIngestion] SERP API key not configured.');

  const params = new URLSearchParams({
    engine: 'google_maps_autocomplete',
    q: query,
    ll,
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`[DataIngestion] SerpAPI autocomplete failed: ${res.status}`);

  const data = await res.json() as {
    suggestions?: Array<{
      value?: string;
      subtext?: string;
      data_id?: string;
      latitude?: number;
      longitude?: number;
      reviews_serpapi_link?: string;
    }>;
  };

  const first = data.suggestions?.find(s => s.data_id);
  if (!first?.data_id) {
    throw new Error(`[DataIngestion] No business found for query: "${query}"`);
  }

  const result: ResolvedBusinessIdentity = {
    data_id: first.data_id,
    lat: first.latitude ?? 0,
    lng: first.longitude ?? 0,
    business_name: first.value ?? query,
    address: first.subtext ?? '',
    serpapi_reviews_link: first.reviews_serpapi_link,
  };

  // Persist data_id to platform_business_map if siteConfigId provided
  if (siteConfigId) {
    try {
      await db
        .update(platformBusinessMap)
        .set({ serpapiDataId: result.data_id })
        .where(eq(platformBusinessMap.siteConfigId, siteConfigId));
      console.log(`[DataIngestion] Stored data_id for siteConfigId=${siteConfigId}`);
    } catch (e: any) {
      console.warn('[DataIngestion] Failed to persist data_id:', e.message);
    }
  }

  return result;
}

// ── Tool 2: ingest_serpapi_reviews ─────────────────────────────────────────────

/**
 * Harvest all available Google Maps reviews for a business via SerpAPI.
 * Uses the stable data_id (not Google's rotating place_id).
 * Stores raw payload snapshot in platformBusinessEnrichmentSnapshots.
 */
export async function ingest_serpapi_reviews(
  data_id: string,
  max_reviews: number = 100,
  sort_by: 'qualityScore' | 'newestFirst' | 'ratingHigh' | 'ratingLow' = 'qualityScore',
  siteConfigId?: string,
): Promise<IngestResult> {
  const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? process.env.SERP_API_KEY;
  if (!apiKey) throw new Error('[DataIngestion] SERP API key not configured.');

  const clampedMax = Math.min(Math.max(1, max_reviews), 500);

  let allReviews: SerpApiReview[] = [];
  let allTopics: SerpApiTopic[] = [];
  let placeInfo = { title: '', address: '', rating: 0, reviews: 0, type: '' };
  let nextToken: string | undefined;
  let pageCount = 0;

  // Paginate through all available reviews
  while (allReviews.length < clampedMax) {
    const result = await fetchSerpApiReviews(data_id, apiKey, {
      num: Math.min(20, clampedMax - allReviews.length),
      next_page_token: nextToken,
    });

    if (!result) break;

    if (pageCount === 0) {
      placeInfo = result.place_info;
      allTopics = result.topics;
    }

    allReviews = [...allReviews, ...result.reviews];
    nextToken = result.next_page_token;
    pageCount++;

    if (!nextToken) break;
    // Rate limit guard — avoid hammering SerpAPI
    await new Promise(r => setTimeout(r, 200));
  }

  const trimmedReviews = allReviews.slice(0, clampedMax);

  // Store raw snapshot
  const snapshotPayload = {
    data_id,
    sort_by,
    review_count: trimmedReviews.length,
    page_count: pageCount,
    place_info: placeInfo,
    topics: allTopics,
    reviews: trimmedReviews,
    harvested_at: new Date().toISOString(),
  };

  let snapshotId = 'no-site-config';
  if (siteConfigId) {
    try {
      const platformMap = await db
        .select({ platformId: platformBusinessMap.platformId })
        .from(platformBusinessMap)
        .where(eq(platformBusinessMap.siteConfigId, siteConfigId))
        .limit(1);

      if (platformMap[0]) {
        const [snap] = await db
          .insert(platformBusinessEnrichmentSnapshots)
          .values({
            platformId: platformMap[0].platformId,
            provider: 'serpapi_google_maps_reviews_merged',
            providerRef: data_id,
            payload: snapshotPayload,
          })
          .returning({ id: platformBusinessEnrichmentSnapshots.id });
        snapshotId = snap?.id ?? snapshotId;
      }
    } catch (e: any) {
      console.warn('[DataIngestion] Failed to store snapshot:', e.message);
    }
  }

  return {
    review_count: trimmedReviews.length,
    topics_extracted: allTopics.slice(0, 20).map(t => ({ keyword: t.keyword, mentions: t.mentions })),
    place_info: {
      title: placeInfo.title,
      address: placeInfo.address,
      rating: placeInfo.rating,
      total_reviews: placeInfo.reviews,
      type: placeInfo.type,
    },
    snapshot_id: snapshotId,
  };
}

// ── DISC Auto-Tuner ────────────────────────────────────────────────────────────

function deriveDISCFromReviews(reviews: SerpApiReview[], topics: SerpApiTopic[]): { d: number; i: number; s: number; c: number } {
  const allText = reviews.map(r => r.snippet?.toLowerCase() ?? '').join(' ');
  const topicKeywords = topics.map(t => t.keyword.toLowerCase()).join(' ');
  const combined = allText + ' ' + topicKeywords;

  // D — Dominance signals: efficiency, speed, directness, results
  const dSignals = ['fast', 'quick', 'efficient', 'direct', 'professional', 'get things done', 'no wait', 'responsive'];
  // I — Influence signals: warmth, charm, social energy, enthusiasm
  const iSignals = ['friendly', 'warm', 'welcoming', 'fun', 'love', 'amazing', 'personality', 'cheerful', 'great vibe'];
  // S — Steadiness signals: consistency, reliability, calm, trust
  const sSignals = ['always', 'consistent', 'reliable', 'every time', 'never disappoints', 'dependable', 'calm', 'patient'];
  // C — Conscientiousness signals: precision, cleanliness, detail, accuracy
  const cSignals = ['clean', 'detail', 'accurate', 'perfect', 'exactly', 'quality', 'thorough', 'immaculate', 'precise'];

  const score = (signals: string[]) => {
    const hits = signals.filter(s => combined.includes(s)).length;
    return Math.min(95, Math.max(20, 40 + (hits / signals.length) * 55));
  };

  return {
    d: Math.round(score(dSignals)),
    i: Math.round(score(iSignals)),
    s: Math.round(score(sSignals)),
    c: Math.round(score(cSignals)),
  };
}

// ── Tool 3: compile_knowledge_base ─────────────────────────────────────────────

/**
 * Analyze harvested reviews with Gemini and compile a structured markdown knowledge
 * document into the site's knowledgeLibrary JSONB array.
 */
export async function compile_knowledge_base(
  reviews: SerpApiReview[],
  topics: SerpApiTopic[],
  place_info: { title: string; rating: number; total_reviews: number; type: string },
  siteConfigId: string,
): Promise<KnowledgeBaseEntry> {
  if (reviews.length === 0) throw new Error('[DataIngestion] No reviews to analyze.');

  // Gemini SWOT analysis
  const analysis = await analyzeReviewsWithGemini(place_info.title, reviews);

  // Auto-tune DISC from review language
  const disc = deriveDISCFromReviews(reviews, topics);

  // Build top topic list
  const topTopics = topics.slice(0, 10).map(t => `${t.keyword} (${t.mentions} mentions)`);

  // Compile the markdown knowledge document
  const markdown = `# ${place_info.title} — Intelligence Brief

**Generated:** ${new Date().toLocaleString()}  
**Source:** ${reviews.length} Google Maps reviews (SerpAPI harvest)  
**Rating:** ${place_info.rating}/5 from ${place_info.total_reviews.toLocaleString()} reviews  
**Business Type:** ${place_info.type}

---

## Executive Summary

${analysis.executive_summary}

---

## What Customers Talk About Most

${topTopics.map(t => `- ${t}`).join('\n')}

---

## What Customers Love

${analysis.owner_insights.strengths.map(s => `- ${s}`).join('\n')}

---

## What Customers Want Improved

${analysis.owner_insights.blind_spots.map(b => `- ${b}`).join('\n')}

---

## Amenities & Services (Customer-Confirmed)

${analysis.amenity_list.map(a => `- ${a}`).join('\n')}

---

## Recommended Agent DISC Profile

Based on ${reviews.length} reviews, the ideal agent for this business:

| Dimension | Score | Behavioral Signature |
|---|---|---|
| D — Dominance | ${disc.d} | ${disc.d >= 65 ? 'Direct and decisive' : disc.d >= 40 ? 'Balanced assertiveness' : 'Gentle and accommodating'} |
| I — Influence | ${disc.i} | ${disc.i >= 65 ? 'Warm and enthusiastic' : disc.i >= 40 ? 'Naturally personable' : 'Reserved and precise'} |
| S — Steadiness | ${disc.s} | ${disc.s >= 65 ? 'Patient and reliable' : disc.s >= 40 ? 'Stable with flexibility' : 'Fast-paced and adaptive'} |
| C — Conscientiousness | ${disc.c} | ${disc.c >= 65 ? 'Detailed and systematic' : disc.c >= 40 ? 'Quality-conscious' : 'Big-picture thinker'} |

---

## Voice Agent Narrative

**Opening:** ${analysis.cinematic_narrative.take_off}

**Mid-Conversation:** ${analysis.cinematic_narrative.cruise}

**Closing:** ${analysis.cinematic_narrative.landing}

---

## Owner Action Plan

${analysis.action_plan.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}
`;

  // Insert into siteConfigs.knowledgeLibrary
  const entryId = crypto.randomUUID();
  const newEntry = {
    id: entryId,
    title: `${place_info.title} — Review Intelligence Brief`,
    content: markdown,
    addedAt: new Date().toISOString(),
  };

  try {
    const [site] = await db
      .select({ knowledgeLibrary: siteConfigs.knowledgeLibrary })
      .from(siteConfigs)
      .where(eq(siteConfigs.id, siteConfigId))
      .limit(1);

    const existing = (site?.knowledgeLibrary as any[] | null) ?? [];
    // Remove any old intelligence brief for this business and add the fresh one
    const filtered = existing.filter((e: any) => !e.title?.includes('Review Intelligence Brief'));

    await db
      .update(siteConfigs)
      .set({ knowledgeLibrary: [...filtered, newEntry] })
      .where(eq(siteConfigs.id, siteConfigId));

    console.log(`[DataIngestion] Knowledge base compiled for siteConfigId=${siteConfigId}`);
  } catch (e: any) {
    console.warn('[DataIngestion] Failed to persist knowledge base entry:', e.message);
  }

  return {
    knowledge_entry_id: entryId,
    disc_recommendation: disc,
    review_count: reviews.length,
    topics_extracted: topTopics,
    markdown_preview: markdown.slice(0, 500) + '...',
  };
}
