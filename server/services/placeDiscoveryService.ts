/**
 * Place ID Discovery Service
 *
 * Resolves a fresh Place ID from a search signature (e.g. business name).
 * Used when stored Place ID returns 404 (obsolete) from Places API (New).
 * Prefer Maps Grounding Lite (free); fallback to Places API (New) searchText.
 *
 * See: client/src/components/chat/gemini_2_5_flash_react_instructions/google_place_ids/obtaining_place_ids.md
 */

import axios from 'axios';

function normalizePlaceId(id: string): string {
  return id.replace(/^places\//i, '').trim();
}

/**
 * Try to get current Place ID via Maps Grounding Lite (free).
 * Returns null if key missing, request fails, or no place found.
 */
async function getFreshPlaceIdViaGroundingLite(searchSignature: string): Promise<string | null> {
  const apiKey =
    process.env.GOOGLE_MAPS_GROUNDING_LITE_API_KEY || process.env.MAPS_GROUNDING_LITE_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://mapstools.googleapis.com/mcp/search_places', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({ textQuery: searchSignature }),
    });

    const result = await response.json();
    const rawId = result.places?.[0]?.id;
    return rawId ? normalizePlaceId(String(rawId)) : null;
  } catch (error) {
    console.error('[PlaceDiscovery] Grounding Lite failed for signature:', searchSignature, error);
    return null;
  }
}

/**
 * Fallback: get Place ID via Places API (New) searchText.
 * Uses getServerMapsApiKey() (GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, GOOGLE_PLACES_API_KEY, GOOGLE_API_KEY).
 */
async function getFreshPlaceIdViaPlacesSearch(searchSignature: string): Promise<string | null> {
  const { getServerMapsApiKey } = await import("../config/mapsApiKey");
  const apiKey = getServerMapsApiKey();
  if (!apiKey) return null;

  try {
    const { data } = await axios.post<{ places?: Array<{ id?: string }> }>(
      'https://places.googleapis.com/v1/places:searchText',
      { textQuery: searchSignature },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
        },
      }
    );

    const rawId = data.places?.[0]?.id;
    return rawId ? normalizePlaceId(String(rawId)) : null;
  } catch (error) {
    console.error('[PlaceDiscovery] Places searchText failed for signature:', searchSignature, error);
    return null;
  }
}

export type PlaceDiscoveryResult = {
  placeId: string | null;
  source: 'grounding_lite' | 'places_search' | null;
};

/**
 * Resolve a fresh Place ID for the given search signature (e.g. business name).
 * Tries Grounding Lite first, then Places API (New) searchText.
 */
export async function getFreshPlaceId(searchSignature: string): Promise<string | null> {
  const trimmed = searchSignature?.trim();
  if (!trimmed) return null;

  const fromGrounding = await getFreshPlaceIdViaGroundingLite(trimmed);
  if (fromGrounding) return fromGrounding;

  return getFreshPlaceIdViaPlacesSearch(trimmed);
}

/**
 * Same as getFreshPlaceId but returns source for UI (grounding_lite vs places_search).
 */
export async function getFreshPlaceIdWithSource(
  searchSignature: string
): Promise<PlaceDiscoveryResult> {
  const trimmed = searchSignature?.trim();
  if (!trimmed) return { placeId: null, source: null };

  const fromGrounding = await getFreshPlaceIdViaGroundingLite(trimmed);
  if (fromGrounding) return { placeId: fromGrounding, source: 'grounding_lite' };

  const fromPlaces = await getFreshPlaceIdViaPlacesSearch(trimmed);
  if (fromPlaces) return { placeId: fromPlaces, source: 'places_search' };

  return { placeId: null, source: null };
}
