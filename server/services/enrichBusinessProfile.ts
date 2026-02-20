/**
 * enrichBusinessProfile.ts
 *
 * Admin-only tool: manually trigger SerpApi enrichment for a known platformId.
 * Stores raw SerpApi payloads as snapshots in platform_business_enrichment_snapshots.
 *
 * NOT used by the voice assistant path. Assistant real-time discovery continues
 * to use Google Maps Grounding Lite / Google ecosystem.
 */

import { db } from "../db.js";
import {
  platformBusinessMap,
  platformBusinessEnrichmentSnapshots,
  siteConfigs,
} from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";

const SERPAPI_KEY =
  process.env.SERPAPI_API_KEY ??
  process.env.SERPAPI_KEY ??
  process.env.SERP_API_KEY;

const SERPAPI_BASE = "https://serpapi.com/search";
const MAX_PAGES = 10;
const MAX_REVIEWS = 500;

export interface EnrichBusinessProfileInput {
  platformId: string;
  maxReviews?: number;
  force?: boolean;
}

export interface EnrichBusinessProfileResult {
  status: "enriched" | "already_enriched" | "failed";
  platformId: string;
  artifacts: {
    serpPlaceProfileStored: boolean;
    serpReviewsStored: boolean;
    reviewCount: number;
    serpapiDataId?: string;
  };
  reason?: string;
}

/**
 * Fetch a single page from SerpApi (JSON). Returns parsed body or throws.
 */
async function serpFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = SERPAPI_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY / SERPAPI_KEY / SERP_API_KEY not configured");

  const qs = new URLSearchParams({ ...params, api_key: apiKey, output: "json" });
  const res = await fetch(`${SERPAPI_BASE}?${qs.toString()}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`SerpApi HTTP ${res.status}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Resolve serpapi_data_id for a platform.
 * Uses existing value if stored, otherwise searches by business name + coords from site_configs.
 * Updates platform_business_map when a new data_id is discovered.
 */
async function resolveDataId(
  pbm: { platformId: string; serpapiDataId: string | null; googlePlaceId: string | null; siteConfigId: string },
): Promise<string | null> {
  if (pbm.serpapiDataId) return pbm.serpapiDataId;

  // Try to derive from site_config seed data
  const [site] = await db
    .select()
    .from(siteConfigs)
    .where(eq(siteConfigs.id, pbm.siteConfigId))
    .limit(1);

  if (!site) return null;

  const placeData = site.placeData as Record<string, unknown> | null;
  const name: string | undefined =
    site.name ?? (placeData?.name as string | undefined);

  const geometry = placeData?.geometry as Record<string, unknown> | undefined;
  const location = geometry?.location as Record<string, unknown> | undefined;
  const lat = location?.lat as number | undefined;
  const lng = location?.lng as number | undefined;

  if (!name) return null;

  const params: Record<string, string> = {
    engine: "google_maps",
    q: name,
    type: "search",
    hl: "en",
  };
  if (typeof lat === "number" && typeof lng === "number") {
    params.ll = `@${lat},${lng},14z`;
  } else if (site.placeId) {
    // Fallback: use place_id directly as the data_id
    const newDataId = site.placeId;
    await db
      .update(platformBusinessMap)
      .set({ serpapiDataId: newDataId, updatedAt: new Date() })
      .where(eq(platformBusinessMap.platformId, pbm.platformId));
    return newDataId;
  }

  try {
    const data = await serpFetch(params);

    // SerpApi may return place_results (place mode) or local_results (search mode)
    const placeResults = data.place_results as Record<string, unknown> | undefined;
    const localResults = data.local_results as Array<Record<string, unknown>> | undefined;

    let dataId: string | null = null;
    let googlePlaceId: string | null = null;

    if (placeResults?.data_id) {
      dataId = String(placeResults.data_id);
      if (placeResults.place_id) googlePlaceId = String(placeResults.place_id);
    } else if (localResults?.[0]?.data_id) {
      dataId = String(localResults[0].data_id);
      if (localResults[0].place_id) googlePlaceId = String(localResults[0].place_id);
    }

    if (!dataId) return null;

    if (googlePlaceId && !pbm.googlePlaceId) {
      await db
        .update(platformBusinessMap)
        .set({ serpapiDataId: dataId, googlePlaceId, updatedAt: new Date() })
        .where(eq(platformBusinessMap.platformId, pbm.platformId));
    } else {
      await db
        .update(platformBusinessMap)
        .set({ serpapiDataId: dataId, updatedAt: new Date() })
        .where(eq(platformBusinessMap.platformId, pbm.platformId));
    }

    return dataId;
  } catch (err) {
    console.warn(`[Enrichment] Failed to resolve data_id for platformId=${pbm.platformId}:`, (err as Error).message);
    return null;
  }
}

/**
 * Store a raw SerpApi payload snapshot.
 */
async function storeSnapshot(
  platformId: string,
  provider: string,
  providerRef: string | null,
  payload: unknown,
): Promise<void> {
  await db.insert(platformBusinessEnrichmentSnapshots).values({
    platformId,
    provider,
    providerRef: providerRef ?? undefined,
    payload: payload as Record<string, unknown>,
  });
}

/**
 * Fetch the SerpApi google_maps place profile and store as snapshot.
 */
async function fetchAndStorePlaceProfile(
  platformId: string,
  dataId: string,
): Promise<boolean> {
  try {
    const data = await serpFetch({
      engine: "google_maps",
      type: "place",
      data_id: dataId,
      hl: "en",
    });
    await storeSnapshot(platformId, "serpapi_google_maps_place", dataId, data);
    console.log(`[Enrichment] Stored place profile for platformId=${platformId} data_id=${dataId}`);
    return true;
  } catch (err) {
    console.warn(`[Enrichment] Place profile fetch failed for platformId=${platformId}:`, (err as Error).message);
    return false;
  }
}

/**
 * Fetch SerpApi google_maps_reviews, paginating until maxReviews reached.
 * Merges all review pages into a single snapshot payload.
 */
async function fetchAndStoreReviews(
  platformId: string,
  dataId: string,
  maxReviews: number,
): Promise<{ stored: boolean; reviewCount: number }> {
  const allReviews: unknown[] = [];
  let nextPageToken: string | undefined;
  let pagesFetched = 0;
  let placeInfo: unknown = null;
  let topics: unknown[] = [];

  try {
    do {
      const params: Record<string, string> = {
        engine: "google_maps_reviews",
        data_id: dataId,
        hl: "en",
        num: String(Math.max(1, Math.min(20, maxReviews - allReviews.length))),
      };
      if (nextPageToken) params.next_page_token = nextPageToken;

      const data = await serpFetch(params);

      if (!placeInfo && data.place_info) placeInfo = data.place_info;
      if (Array.isArray(data.topics) && topics.length === 0) topics = data.topics;

      const page = Array.isArray(data.reviews) ? (data.reviews as unknown[]) : [];
      allReviews.push(...page);
      pagesFetched++;

      const pagination = data.serpapi_pagination as Record<string, unknown> | undefined;
      nextPageToken = pagination?.next_page_token as string | undefined;
    } while (
      nextPageToken &&
      allReviews.length < maxReviews &&
      pagesFetched < MAX_PAGES
    );

    const mergedPayload = {
      place_info: placeInfo,
      topics,
      reviews: allReviews.slice(0, maxReviews),
      total_fetched: allReviews.length,
      pages_fetched: pagesFetched,
    };

    await storeSnapshot(
      platformId,
      "serpapi_google_maps_reviews_merged",
      dataId,
      mergedPayload,
    );

    console.log(
      `[Enrichment] Stored ${allReviews.length} reviews (${pagesFetched} pages) for platformId=${platformId} data_id=${dataId}`,
    );
    return { stored: true, reviewCount: allReviews.length };
  } catch (err) {
    console.warn(`[Enrichment] Reviews fetch failed for platformId=${platformId}:`, (err as Error).message);
    return { stored: false, reviewCount: 0 };
  }
}

/**
 * Main admin tool handler: enrich a business profile using SerpApi.
 *
 * - Requires an existing platform_business_map row for platformId.
 * - Fetches SerpApi place profile + paginated reviews.
 * - Stores raw payloads as snapshots (idempotent with force=false).
 */
export async function enrichBusinessProfile(
  input: EnrichBusinessProfileInput,
): Promise<EnrichBusinessProfileResult> {
  const { platformId, maxReviews = 100, force = false } = input;

  const failed = (reason: string): EnrichBusinessProfileResult => ({
    status: "failed",
    platformId,
    artifacts: { serpPlaceProfileStored: false, serpReviewsStored: false, reviewCount: 0 },
    reason,
  });

  // 1. Require existing platform_business_map row
  const [pbm] = await db
    .select()
    .from(platformBusinessMap)
    .where(eq(platformBusinessMap.platformId, platformId))
    .limit(1);

  if (!pbm) {
    return failed(`No platform_business_map row found for platformId=${platformId}`);
  }

  // 2. Idempotency guard (unless force=true)
  if (!force) {
    const existing = await db
      .select({ id: platformBusinessEnrichmentSnapshots.id })
      .from(platformBusinessEnrichmentSnapshots)
      .where(
        and(
          eq(platformBusinessEnrichmentSnapshots.platformId, platformId),
          eq(platformBusinessEnrichmentSnapshots.provider, "serpapi_google_maps_place"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        status: "already_enriched",
        platformId,
        artifacts: {
          serpPlaceProfileStored: false,
          serpReviewsStored: false,
          reviewCount: 0,
          serpapiDataId: pbm.serpapiDataId ?? undefined,
        },
        reason: "Snapshot already exists; pass force=true to re-enrich",
      };
    }
  }

  // 3. Resolve SerpApi data_id
  const dataId = await resolveDataId(pbm);
  if (!dataId) {
    return failed(
      "Could not resolve serpapi_data_id; ensure site_configs has name/coordinates or set serpapi_data_id manually",
    );
  }

  const cappedReviews = Math.min(MAX_REVIEWS, Math.max(1, maxReviews));

  // 4. Fetch + store place profile
  const serpPlaceProfileStored = await fetchAndStorePlaceProfile(platformId, dataId);

  // 5. Fetch + store reviews (paginated)
  const { stored: serpReviewsStored, reviewCount } = await fetchAndStoreReviews(
    platformId,
    dataId,
    cappedReviews,
  );

  return {
    status: "enriched",
    platformId,
    artifacts: {
      serpPlaceProfileStored,
      serpReviewsStored,
      reviewCount,
      serpapiDataId: dataId,
    },
  };
}
