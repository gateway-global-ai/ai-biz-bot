/**
 * Storefront industry report: top 5 + bottom 5 businesses by rating, review aggregation, Gemini summary.
 */
import { db } from '../db.js';
import { storefrontCategories, storefrontReports } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getBusinessReviewsPaginated } from './reviewAnalysisService.js';
import { generateJsonWithGemini } from './geminiService.js';

const PLACES_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
const TOP_N = 5;
const BOTTOM_RATING_THRESHOLD = 3.5;
const MIN_TOP_RATING = 4.0;
const REVIEWS_PER_PLACE = 30;

export interface IndustryReportResult {
  summary: string;
  whatsWorking: string[];
  whatsNotWorking: string[];
  rawPlaces?: { top: Array<{ placeId: string; name: string; rating: number }>; bottom: Array<{ placeId: string; name: string; rating: number }> };
}

function normalizePlaceId(placeId: string): string {
  return placeId.replace(/^places\//i, '');
}

/**
 * Search places via Places API (text search). Returns places with rating.
 */
async function searchPlacesForCategory(searchQuery: string, location: string, lat?: number, lng?: number): Promise<Array<{ placeId: string; name: string; rating: number; userRatingCount?: number }>> {
  if (!PLACES_API_KEY) throw new Error('Google API key not configured');
  const textQuery = `${searchQuery} ${location}`.trim();
  const body: Record<string, unknown> = {
    textQuery,
  };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 15000 } };
  }
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Places search failed');
  const places = (data.places || []).map((p: { id?: string; displayName?: { text?: string }; rating?: number; userRatingCount?: number }) => ({
    placeId: p.id ?? '',
    name: p.displayName?.text ?? 'Unknown',
    rating: typeof p.rating === 'number' ? p.rating : 0,
    userRatingCount: p.userRatingCount,
  }));
  return places.filter((p: { placeId: string }) => p.placeId);
}

/**
 * Generate industry report for a storefront category: fetch places, top/bottom by rating, reviews, Gemini summary.
 */
export async function generateIndustryReport(categorySlug: string): Promise<IndustryReportResult> {
  const [cat] = await db.select().from(storefrontCategories).where(eq(storefrontCategories.slug, categorySlug)).limit(1);
  if (!cat) throw new Error(`Category not found: ${categorySlug}`);

  const places = await searchPlacesForCategory(cat.searchQuery, cat.location, cat.lat ?? undefined, cat.lng ?? undefined);
  const withRating = places.filter((p) => p.rating > 0);
  const sorted = [...withRating].sort((a, b) => b.rating - a.rating);
  const top = sorted.filter((p) => p.rating >= MIN_TOP_RATING).slice(0, TOP_N);
  const bottom = sorted.filter((p) => p.rating < BOTTOM_RATING_THRESHOLD).slice(-TOP_N);
  if (top.length === 0) top.push(...sorted.slice(0, TOP_N));
  if (bottom.length === 0 && sorted.length > TOP_N) bottom.push(...sorted.slice(-TOP_N));

  const topSnippets: string[] = [];
  const bottomSnippets: string[] = [];

  for (const p of top) {
    try {
      const placeId = normalizePlaceId(p.placeId);
      const reviews = await getBusinessReviewsPaginated(placeId, REVIEWS_PER_PLACE);
      const snips = reviews.map((r) => (r as { snippet?: string }).snippet).filter(Boolean) as string[];
      topSnippets.push(...snips);
    } catch (e) {
      console.warn(`[StorefrontReport] Reviews for top place ${p.placeId} failed:`, (e as Error).message);
    }
  }
  for (const p of bottom) {
    try {
      const placeId = normalizePlaceId(p.placeId);
      const reviews = await getBusinessReviewsPaginated(placeId, REVIEWS_PER_PLACE);
      const snips = reviews.map((r) => (r as { snippet?: string }).snippet).filter(Boolean) as string[];
      bottomSnippets.push(...snips);
    } catch (e) {
      console.warn(`[StorefrontReport] Reviews for bottom place ${p.placeId} failed:`, (e as Error).message);
    }
  }

  const prompt = `You are a business intelligence analyst. For the industry "${cat.displayName}" in "${cat.location}".

Below are review snippets from:
1) TOP-PERFORMING businesses (high ratings) — what customers love.
2) STRUGGLING businesses (lower ratings) — recurring complaints and problems.

Task: Produce a short industry report (JSON only, no markdown).

OUTPUT FORMAT (JSON only):
{
  "summary": "2-4 sentences summarizing the industry: what drives success and what commonly fails in this market.",
  "whatsWorking": ["Bullet 1: strength from top performers", "Bullet 2", "Bullet 3 (up to 5)"],
  "whatsNotWorking": ["Bullet 1: recurring problem from low-rated businesses", "Bullet 2", "Bullet 3 (up to 5)"]
}

REVIEWS FROM TOP-PERFORMING BUSINESSES:
${JSON.stringify(topSnippets.slice(0, 80))}

REVIEWS FROM STRUGGLING BUSINESSES (lower ratings):
${JSON.stringify(bottomSnippets.slice(0, 80))}
`;

  const parsed = await generateJsonWithGemini<IndustryReportResult>(prompt);
  const result: IndustryReportResult = {
    summary: parsed.summary ?? '',
    whatsWorking: Array.isArray(parsed.whatsWorking) ? parsed.whatsWorking : [],
    whatsNotWorking: Array.isArray(parsed.whatsNotWorking) ? parsed.whatsNotWorking : [],
    rawPlaces: { top: top.map((p) => ({ placeId: p.placeId, name: p.name, rating: p.rating })), bottom: bottom.map((p) => ({ placeId: p.placeId, name: p.name, rating: p.rating })) },
  };

  await db
    .insert(storefrontReports)
    .values({
      categorySlug,
      summary: result.summary,
      whatsWorking: result.whatsWorking,
      whatsNotWorking: result.whatsNotWorking,
      rawPlaces: result.rawPlaces as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: storefrontReports.categorySlug,
      set: {
        summary: result.summary,
        whatsWorking: result.whatsWorking,
        whatsNotWorking: result.whatsNotWorking,
        rawPlaces: result.rawPlaces as unknown as Record<string, unknown>,
        generatedAt: new Date(),
      },
    });

  return result;
}

/**
 * Get cached report for category, or null if not generated yet.
 */
export async function getCachedReport(categorySlug: string): Promise<IndustryReportResult | null> {
  const [row] = await db.select().from(storefrontReports).where(eq(storefrontReports.categorySlug, categorySlug)).limit(1);
  if (!row) return null;
  return {
    summary: row.summary ?? '',
    whatsWorking: (row.whatsWorking as string[]) ?? [],
    whatsNotWorking: (row.whatsNotWorking as string[]) ?? [],
    rawPlaces: row.rawPlaces as IndustryReportResult['rawPlaces'],
  };
}
