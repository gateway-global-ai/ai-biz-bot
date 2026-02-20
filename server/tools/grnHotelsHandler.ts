/**
 * GRN Hotels Handler
 * 
 * Handles hotel search and enrichment with GRN Connect API.
 * Integrates Google Maps discovery, static database matching, and live rate pricing.
 * Matched hotels are persisted to b2b_hotels with platformId + googlePlaceId links.
 */

import axios from 'axios';
import {
  searchHotelsInDb,
  searchGoogleMapsHotels,
  matchHotels,
  toGrnApiCode,
  getGrnAvailability,
} from '../mcp-hotels-logic.js';
import { smallBusinessInjector } from './smallBusinessInjector.js';
import { b2bStorage } from '../b2b-storage.js';

/**
 * Search GRN hotels by destination code and dates
 */
export async function handleSearchGrnHotels(args: {
  destination_code: string;
  hotel_codes?: string[];
  checkin: string;
  checkout: string;
  adults?: number;
}): Promise<unknown> {
  const grnApiKey = process.env.GRN_API_KEY || '7438238a97854f59a51d19f36de24625';
  const grnEndpoint = process.env.GRN_ENDPOINT || 
    'https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/';

  const payload = {
    rooms: [{ adults: args.adults || 2 }],
    rates: 'comprehensive',
    destination_codes: args.destination_code,
    hotel_codes: args.hotel_codes || [],
    currency: 'USD',
    client_nationality: 'US',
    checkin: args.checkin,
    checkout: args.checkout,
  };

  try {
    const response = await axios.post(grnEndpoint, payload, {
      headers: { 'api-key': grnApiKey },
    });

    return {
      success: true,
      searchId: response.data.search_id,
      hotels: response.data.hotels || [],
    };
  } catch (error: any) {
    console.error('[GRN Hotels] Search error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Enrich hotels with live rates (Discover → Match → Price).
 * When platformId is supplied, matched hotels are upserted into b2b_hotels
 * so they can be re-fetched later via platform_id or google_place_id.
 */
export async function handleEnrichHotelsWithRates(args: {
  location: string;
  query?: string;
  checkin: string;
  checkout: string;
  currency?: string;
  rooms?: Array<{ adults: number; childrenAges?: number[] }>;
  /** Optional: stable UUID from platform_business_map to link enrichment results. */
  platformId?: string;
}): Promise<unknown> {
  try {
    // Phase 1: Discover via Google Maps
    const googleHotels = await searchGoogleMapsHotels(
      args.query || 'hotels',
      args.location,
      {}
    );

    // Phase 2: Match with GRN Static Database
    const grnHotelsFromDb = await searchHotelsInDb(args.location, null, 50);
    const matchedSet = matchHotels(googleHotels, grnHotelsFromDb);
    const validMatches = matchedSet.filter((m) => m.matched && m.grn);

    if (validMatches.length === 0) {
      return {
        success: true,
        hotels: [],
        message: 'No matches found in GRN.',
      };
    }

    // Phase 3: Price via GRN Connect API
    const apiCodes = validMatches
      .map((m) => toGrnApiCode(m.grn?.grn_hotel_id))
      .filter(Boolean) as string[];

    const availability = await getGrnAvailability(
      apiCodes.slice(0, 20), // Cap at 20 for latency
      args.checkin,
      args.checkout,
      args.rooms || [{ adults: 2 }],
      { currency: args.currency || 'USD' }
    );

    // Final Merge + optional persistence
    const enrichedResults = await Promise.all(
      validMatches.map(async (match) => {
        const apiCode = toGrnApiCode(match.grn?.grn_hotel_id);
        const liveData = availability.hotels?.find(
          (h: any) => h.hotel_code === apiCode
        );
        const googlePlaceId = (match.google as any)?.placeId ?? undefined;

        // Persist to b2b_hotels if we have a GRN code and a platform or place anchor
        if (apiCode && (args.platformId || googlePlaceId)) {
          try {
            await b2bStorage.upsertHotelByCode({
              hotelCode: apiCode,
              ...(googlePlaceId !== undefined && { googlePlaceId }),
              ...(args.platformId !== undefined && { platformId: args.platformId }),
              name: match.grn?.hotel_name ?? (match.google as any)?.name ?? undefined,
              rawResponse: liveData ?? undefined,
            });
          } catch (persistErr: any) {
            console.warn('[GRN Hotels] Persist warning:', persistErr.message);
          }
        }

        return {
          google: match.google,
          grn: match.grn,
          matchScore: match.matchScore,
          availability: liveData
            ? {
                available: true,
                minRate: liveData.min_rate,
                rates: liveData.rates,
              }
            : { available: false },
        };
      })
    );

    return {
      success: true,
      searchId: availability.search_id,
      hotels: enrichedResults.filter((h) => h.availability.available),
    };
  } catch (error: any) {
    console.error('[GRN Hotels] Enrichment error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Enriched search with Small Business priority injection
 */
export async function handleEnrichedSearchWithSmallBiz(args: {
  location: string;
  query?: string;
  checkin: string;
  checkout: string;
  cityCode?: string;
  currency?: string;
  rooms?: Array<{ adults: number; childrenAges?: number[] }>;
}): Promise<unknown> {
  // STEP A: The Priority Injection
  const featuredPartners = await smallBusinessInjector(
    args.query || '',
    args.cityCode || args.location
  );

  // STEP B: The General Google + GRN Sweep
  const generalResults = (await handleEnrichHotelsWithRates({
    location: args.location,
    query: args.query,
    checkin: args.checkin,
    checkout: args.checkout,
    currency: args.currency,
    rooms: args.rooms,
  })) as { hotels?: any[] };

  // STEP C: De-duplicate and Concatenate
  const filteredGeneral = (generalResults.hotels || []).filter(
    (gh) =>
      !featuredPartners.some(
        (fp: any) => fp.grn_hotel_id === gh.grn?.grn_hotel_id
      )
  );

  return {
    success: true,
    featured: featuredPartners, // Render these with the "WOW" touchdown first
    general: filteredGeneral,
  };
}
