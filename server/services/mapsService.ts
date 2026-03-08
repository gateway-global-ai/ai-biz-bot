/**
 * MapsService - Internal Data Provider for Voice AI Tools
 * Handles Google Places API (New) and SerpApi (Reviews)
 */

import { getServerMapsApiKey } from "../config/mapsApiKey";

// ✅ ACCESS KEYS VIA DOPPLER-SYNCED ENVIRONMENT VARIABLES
const GOOGLE_MAPS_KEY = getServerMapsApiKey();
const SERP_API_KEY = process.env.SERPAPI_KEY;

/** Internal/sentinel IDs that must never be sent to the Places API (they are site_config ids, not Google Place IDs). */
const INTERNAL_PLACE_IDS = new Set(['platform_landing', 'platform-landing', 'platform', '']);
/** Google Place IDs start with ChIJ or "places/ChIJ" — reject anything that looks like an internal id. */
function isInvalidPlaceIdForApi(placeId: string): boolean {
  if (!placeId || typeof placeId !== 'string') return true;
  const trimmed = placeId.trim().replace(/^places\//i, '');
  if (INTERNAL_PLACE_IDS.has(trimmed)) return true;
  if (trimmed.length < 20 || /^[a-z_-]+$/i.test(trimmed)) return true; // e.g. platform_landing, demo
  return false;
}

/**
 * getBusinessDetails - Logic for "get_business_details" tool
 * Fetches core business data from Google Places API (New)
 */
export async function getBusinessDetails(placeId: string) {
  if (!GOOGLE_MAPS_KEY) throw new Error("Missing Google Maps API Key");
  if (isInvalidPlaceIdForApi(placeId)) {
    throw new Error("No specific business place selected. Use a valid Google Place ID from a business search.");
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
      // Field masking to minimize payload and cost
      'X-Goog-FieldMask': 'displayName,formattedAddress,regularOpeningHours,rating,userRatingCount'
    }
  });

  if (!response.ok) throw new Error(`Google Places API Error: ${response.statusText}`);
  
  const data = await response.json();
  return {
    name: data.displayName?.text,
    address: data.formattedAddress,
    hours: data.regularOpeningHours?.weekdayDescriptions,
    rating: data.rating,
    reviewCount: data.userRatingCount
  };
}

/**
 * getBusinessReviews - Logic for "get_business_reviews" tool
 * Scrapes reviews using SerpApi Google Maps Reviews engine
 */
export async function getBusinessReviews(placeId: string, maxReviews: number = 5) {
  if (!SERP_API_KEY) throw new Error("Missing SerpApi Key");
  if (isInvalidPlaceIdForApi(placeId)) {
    throw new Error("No specific business place selected. Use a valid Google Place ID from a business search.");
  }

  const params = new URLSearchParams({
    engine: "google_maps_reviews",
    place_id: placeId,
    api_key: SERP_API_KEY,
    hl: "en",
    num: maxReviews.toString()
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  
  if (!response.ok) throw new Error(`SerpApi Error: ${response.statusText}`);
  
  const data = await response.json();
  
  // Return a clean array of review snippets for the LLM to read
  return data.reviews?.map((r: any) => ({
    rating: r.rating,
    date: r.date,
    snippet: r.snippet
  })) || [];
}