/**
 * MapsService - Internal Data Provider for Voice AI Tools
 * Handles Google Places API (New) and SerpApi (Reviews)
 */

// ✅ ACCESS KEYS VIA DOPPLER-SYNCED ENVIRONMENT VARIABLES
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SERP_API_KEY = process.env.SERPAPI_KEY;

/**
 * getBusinessDetails - Logic for "get_business_details" tool
 * Fetches core business data from Google Places API (New)
 */
export async function getBusinessDetails(placeId: string) {
  if (!GOOGLE_MAPS_KEY) throw new Error("Missing Google Maps API Key");

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