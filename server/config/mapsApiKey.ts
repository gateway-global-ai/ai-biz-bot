/**
 * Canonical resolution for server-side Google Maps/Places API key.
 * Use this everywhere instead of reading GOOGLE_MAPS_API_KEY directly.
 *
 * IMPORTANT: Maps Grounding Lite API and Places API (New) must use the SAME key on the server.
 * Using different keys for different APIs causes failures when data is pulled across those APIs.
 * Client-side keys (e.g. GOOGLE_MAPS_JS_API) can be different; server-side must be one key.
 *
 * Fallback order (set one in Doppler):
 *   GOOGLE_MAPS_API_KEY
 *   GOOGLE_MAPS_GROUNDING_LITE_API_KEY
 *   MAPS_GROUNDING_LITE_API_KEY
 *   GOOGLE_PLACES_API_KEY
 *   GOOGLE_API_KEY
 */
export function getServerMapsApiKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_GROUNDING_LITE_API_KEY?.trim() ||
    process.env.MAPS_GROUNDING_LITE_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined
  );
}
