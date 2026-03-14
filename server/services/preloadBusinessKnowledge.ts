/**
 * Async preload of business + reviews into site_configs.knowledge_library (sovereignTruths).
 * Called fire-and-forget on site create/update when placeId or placeData is present.
 * Ensures voice/chat have business info without blocking connection or tool calls.
 */

import { db } from "../db";
import { siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { getPlaceDetails } from "../tools/placesHandler";
import { fetchSerpApiReviews } from "../services/serpapi-reviews";

export interface SovereignTruth {
  topic: string;
  fact: string;
}

/**
 * Build sovereignTruths from place details and optional SerpAPI reviews.
 * Does not throw; returns empty array on missing data.
 */
export async function preloadBusinessAndReviews(siteConfigId: string): Promise<void> {
  try {
    const site = await storage.getSiteConfigById(siteConfigId);
    if (!site) return;

    const placeId = (site as { placeId?: string | null }).placeId ?? null;
    const placeData = (site as { placeData?: Record<string, unknown> | null }).placeData ?? null;

    const truths: SovereignTruth[] = [];
    let name = (placeData?.name as string) ?? (placeData?.displayName as { text?: string } | undefined)?.text ?? site.name ?? "";
    let address = (placeData?.formatted_address as string) ?? (placeData?.formattedAddress as string) ?? "";
    let phone = (placeData?.formatted_phone_number as string) ?? (placeData?.internationalPhoneNumber as string) ?? "";
    let hours = "";
    let rating: number | undefined;
    let reviewCount: number | undefined;

    if (placeId) {
      try {
        const details = await getPlaceDetails(placeId);
        name = details.name || name;
        address = details.formattedAddress || address;
        phone = details.internationalPhoneNumber || phone;
        rating = details.rating;
        reviewCount = details.userRatingCount;
        if (details.regularOpeningHours?.weekdayDescriptions?.length) {
          hours = details.regularOpeningHours.weekdayDescriptions.join("; ");
        }
      } catch (_e) {
        // use placeData / existing fields only
      }
    }

    if (name) truths.push({ topic: "Business name", fact: name });
    if (address) truths.push({ topic: "Address", fact: address });
    if (phone) truths.push({ topic: "Phone", fact: phone });
    if (hours) truths.push({ topic: "Hours", fact: hours });
    if (rating != null) truths.push({ topic: "Rating", fact: `${rating}${reviewCount != null ? ` (${reviewCount} reviews)` : ""}` });

    // Optional: SerpAPI reviews summary (first page only for preload)
    const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? process.env.SERP_API_KEY;
    if (placeId && apiKey) {
      try {
        const result = await fetchSerpApiReviews(placeId, apiKey, { num: 15 });
        if (result?.place_info) {
          const pi = result.place_info;
          if (pi.rating && pi.reviews) {
            truths.push({ topic: "Review summary", fact: `${pi.rating} rating, ${pi.reviews} reviews.` });
          }
          if (result.reviews?.length) {
            const snippets = result.reviews.slice(0, 5).map((r) => (r.snippet ?? "").slice(0, 120)).filter(Boolean);
            if (snippets.length) {
              truths.push({ topic: "Sample reviews", fact: snippets.join(" | ") });
            }
          }
        }
      } catch (_e) {
        // non-fatal
      }
    }

    if (truths.length === 0) return;

    const existing = await storage.getSiteConfigById(siteConfigId);
    const existingLib = (existing?.knowledgeLibrary as Record<string, unknown>) ?? {};
    const existingTruths = Array.isArray(existingLib.sovereignTruths) ? (existingLib.sovereignTruths as SovereignTruth[]) : [];
    const merged = {
      ...existingLib,
      sovereignTruths: [...existingTruths, ...truths],
    };

    await db.update(siteConfigs).set({ knowledgeLibrary: merged, updatedAt: new Date() }).where(eq(siteConfigs.id, siteConfigId));
  } catch (err: unknown) {
    console.warn("[PreloadBusinessKnowledge] Failed for siteConfigId=" + siteConfigId, err);
  }
}
