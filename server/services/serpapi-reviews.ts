/**
 * SerpAPI Google Maps Reviews – optional enrichment source.
 * When SERPAPI_API_KEY is set and we have a place_id, we can fetch:
 * - place_info (title, address, rating, reviews count, type)
 * - topics (keyword + mention counts: e.g. "french toast" 128) for signature items
 * - reviews (snippet, rating, date, details like meal_type, price_per_person, food/service/atmosphere)
 * @see https://serpapi.com/google-maps-reviews-api
 */

export interface SerpApiPlaceInfo {
  title: string;
  address: string;
  rating: number;
  reviews: number;
  type: string;
}

export interface SerpApiTopic {
  keyword: string;
  mentions: number;
  id?: string;
}

export interface SerpApiReviewDetail {
  meal_type?: string;
  price_per_person?: string;
  food?: number;
  service?: number;
  atmosphere?: number;
  wait_time?: string;
  seating_type?: string;
  [key: string]: unknown;
}

export interface SerpApiReview {
  snippet: string;
  rating: number;
  date?: string;
  iso_date?: string;
  user?: { name: string };
  details?: SerpApiReviewDetail;
}

export interface SerpApiReviewsResult {
  place_info: SerpApiPlaceInfo;
  topics: SerpApiTopic[];
  reviews: SerpApiReview[];
  /** Use to fetch the next page of reviews (optional pagination). */
  next_page_token?: string;
}

export interface SerpApiReviewsOptions {
  /** Number of reviews to request per page (SerpAPI param `num`). More reviews = better SWOT/vibe. Default 20. */
  num?: number;
  /** Token from a previous response to get the next page of reviews. */
  next_page_token?: string;
}

const BASE = "https://serpapi.com/search";
const DEFAULT_NUM = 20;

/**
 * Fetch Google Maps reviews and topics for a place from SerpAPI.
 * Use `num` to request more reviews (e.g. 15–30) for a more informed SWOT and vibe analysis.
 * Requires SERPAPI_API_KEY. Returns null if key missing, place_id missing, or request fails.
 */
export async function fetchSerpApiReviews(
  placeId: string,
  apiKey?: string,
  options: SerpApiReviewsOptions = {}
): Promise<SerpApiReviewsResult | null> {
  const key = apiKey ?? process.env.SERPAPI_API_KEY;
  if (!key || !placeId) return null;

  const num = Math.min(50, Math.max(1, options.num ?? DEFAULT_NUM));
  const params = new URLSearchParams({
    engine: "google_maps_reviews",
    place_id: placeId,
    hl: "en",
    api_key: key,
    num: String(num),
  });
  if (options.next_page_token) {
    params.set("next_page_token", options.next_page_token);
  }
  const url = `${BASE}?${params.toString()}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.warn("[SerpAPI] Non-OK response:", res.status);
      return null;
    }
    const data = (await res.json()) as {
      place_info?: { title?: string; address?: string; rating?: number; reviews?: number; type?: string };
      topics?: Array<{ keyword?: string; mentions?: number; id?: string }>;
      reviews?: Array<{
        snippet?: string;
        rating?: number;
        date?: string;
        iso_date?: string;
        user?: { name?: string };
        details?: Record<string, unknown>;
      }>;
      serpapi_pagination?: { next_page_token?: string };
    };

    const place_info: SerpApiPlaceInfo = {
      title: data.place_info?.title ?? "",
      address: data.place_info?.address ?? "",
      rating: Number(data.place_info?.rating) || 0,
      reviews: Number(data.place_info?.reviews) || 0,
      type: data.place_info?.type ?? "",
    };

    const topics: SerpApiTopic[] = (data.topics ?? []).map((t) => ({
      keyword: t.keyword ?? "",
      mentions: Number(t.mentions) || 0,
      id: t.id,
    })).filter((t) => t.keyword);

    const reviews: SerpApiReview[] = (data.reviews ?? []).map((r) => ({
      snippet: r.snippet ?? "",
      rating: Number(r.rating) || 0,
      date: r.date,
      iso_date: r.iso_date,
      user: r.user ? { name: r.user.name ?? "" } : undefined,
      details: r.details as SerpApiReviewDetail | undefined,
    })).filter((r) => r.snippet);

    const next_page_token = data.serpapi_pagination?.next_page_token;

    return { place_info, topics, reviews, next_page_token };
  } catch (e) {
    console.warn("[SerpAPI] Fetch error:", e);
    return null;
  }
}
