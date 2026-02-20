/**
 * Hotel MCP Server - API logic for Google Maps, GRN Connect, SERP API
 * Ported from user_uploads/new/mcp_travel_server/hotel-mcp-server
 */
import pg from "pg";
import axios from "axios";
import Fuse from "fuse.js";

const config = {
  grn: {
    apiKey: process.env.GRN_API_KEY || "7438238a97854f59a51d19f36de24625",
    endpoint:
      process.env.GRN_ENDPOINT ||
      "https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/",
    country: "US",
    currency: "USD",
  },
  database: {
    host: process.env.DB_HOST || "88.198.6.114",
    port: parseInt(process.env.DB_PORT || "38164"),
    database: process.env.DB_NAME || "static_master",
    user: process.env.DB_USER || "reporting",
    password: process.env.GRN_STATIC_KEY || process.env.DB_PASSWORD || "Ghab%j2jK231",
  },
  serp: {
    apiKey: process.env.SERPAPI_KEY || process.env.SERP_API_KEY || "",
    endpoint: "https://serpapi.com/search",
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.google_map_api_key || "",
    placesApiKey: process.env.GOOGLE_PLACES_KEY || "",
    mcpEndpoint: "https://mapstools.googleapis.com/mcp",
  },
};

let dbPool: pg.Pool | null = null;

async function getDbPool(): Promise<pg.Pool> {
  if (!dbPool) {
    dbPool = new pg.Pool(config.database);
  }
  return dbPool;
}

function toGrnApiCode(grnHotelId: string | null | undefined): string | null {
  if (!grnHotelId) return null;
  return grnHotelId.replace(/^H!/i, "");
}

/** Convert a bare GRN API code back to the DB-stored "H!" prefix form. */
function toGrnDbCode(apiCode: string | null | undefined): string | null {
  if (!apiCode) return null;
  if (/^H!/i.test(apiCode)) return apiCode;
  return `H!${apiCode}`;
}

function toRad(deg: number) {
  return deg * (Math.PI / 180);
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function matchHotels(
  googleHotels: Array<{ name: string; latitude?: number; longitude?: number }>,
  grnHotels: Array<{
    hotel_name: string;
    address?: string;
    city_name?: string;
    latitude?: string | number;
    longitude?: string | number;
  }>
) {
  const fuse = new Fuse(grnHotels, {
    keys: ["hotel_name", "address", "city_name"],
    threshold: 0.4,
    includeScore: true,
  });

  return googleHotels.map((googleHotel) => {
    const results = fuse.search(googleHotel.name);
    let bestMatch: (typeof grnHotels)[0] | null = null;
    let bestScore = Infinity;

    for (const result of results.slice(0, 5)) {
      let score = result.score ?? 1;
      if (
        googleHotel.latitude != null &&
        googleHotel.longitude != null &&
        result.item.latitude != null &&
        result.item.longitude != null
      ) {
        const lat2 = typeof result.item.latitude === "string" ? parseFloat(result.item.latitude) : result.item.latitude;
        const lon2 = typeof result.item.longitude === "string" ? parseFloat(result.item.longitude) : result.item.longitude;
        const distance = calculateDistance(
          googleHotel.latitude,
          googleHotel.longitude,
          lat2,
          lon2
        );
        if (distance < 0.5) score *= 0.5;
        else if (distance < 1) score *= 0.7;
      }
      if (score < bestScore) {
        bestScore = score;
        bestMatch = result.item;
      }
    }
    return {
      google: googleHotel,
      grn: bestMatch,
      matchScore: bestMatch ? (1 - bestScore) * 100 : 0,
      matched: bestScore < 0.5,
    };
  });
}

export async function searchHotelsInDb(
  cityName: string,
  countryCode: string | null = null,
  limit = 100
) {
  const pool = await getDbPool();
  let query = `
    SELECT h.grn_hotel_id, h.giata_hotel_id, h.hotel_name, h.address, h.latitude, h.longitude,
      h.star_rating, h.description, h.giata_city_name as city_name, h.destination_name,
      h.country_name, h.country_code, h.grn_destination_id
    FROM hotel h
    WHERE (LOWER(h.giata_city_name) LIKE LOWER($1) OR LOWER(h.destination_name) LIKE LOWER($1))
  `;
  const params: (string | number)[] = [`%${cityName}%`];
  if (countryCode) {
    query += ` AND LOWER(h.country_code) = LOWER($2)`;
    params.push(countryCode);
  }
  query += ` LIMIT $${params.length + 1}`;
  params.push(limit);
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getPoiAutocomplete(
  input: string,
  options: { region?: string; types?: string; language?: string } = {}
) {
  const apiKey = config.googleMaps.placesApiKey || config.googleMaps.apiKey;
  if (!apiKey) throw new Error("Google Places API key not configured.");
  const params: Record<string, string> = { input, key: apiKey };
  if (options.region) params.components = `country:${options.region}`;
  if (options.types) params.types = options.types;
  if (options.language) params.language = options.language;
  const res = await axios.get(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
    { params }
  );
  if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
    throw new Error(`Places Autocomplete: ${res.data.status}`);
  }
  return {
    predictions: (res.data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text,
      secondaryText: p.structured_formatting?.secondary_text,
      types: p.types,
    })),
    status: res.data.status,
  };
}

export async function getPoiDetails(placeId: string) {
  const apiKey = config.googleMaps.placesApiKey || config.googleMaps.apiKey;
  if (!apiKey) throw new Error("Google Places API key not configured.");
  const res = await axios.get(
    "https://maps.googleapis.com/maps/api/place/details/json",
    {
      params: {
        place_id: placeId,
        fields: "place_id,name,formatted_address,geometry,types",
        key: apiKey,
      },
    }
  );
  if (res.data.status !== "OK") throw new Error(`Place Details: ${res.data.status}`);
  const place = res.data.result;
  return {
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    types: place.types,
  };
}

export async function searchGoogleMapsHotels(
  query: string,
  location: string | null,
  options: {
    poiName?: string;
    radius?: number;
    radiusUnit?: string;
    minRating?: number;
    maxRating?: number;
    keywords?: string;
  } = {}
) {
  const apiKey = config.googleMaps.apiKey;
  if (!apiKey) throw new Error("Google Maps API key not configured.");
  let searchQuery: string;
  if (options.poiName) {
    const r = options.radius || 5;
    const u = options.radiusUnit || "miles";
    searchQuery = `hotels within ${r} ${u} of ${options.poiName}`;
    if (query) searchQuery += ` ${query}`;
  } else {
    searchQuery = location
      ? `hotels in ${location} ${query || ""}`.trim()
      : `hotels ${query || ""}`.trim();
  }
  if (options.keywords) searchQuery += ` ${options.keywords}`;
  if (options.minRating && options.minRating >= 1 && options.minRating <= 5) {
    searchQuery += ` ${options.minRating}+ stars`;
  }
  if (options.maxRating && options.maxRating >= 1 && options.maxRating <= 5) {
    searchQuery += ` up to ${options.maxRating} stars`;
  }
  const res = await axios.post(
    config.googleMaps.mcpEndpoint,
    {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "search_places", arguments: { query: searchQuery } },
      id: Date.now(),
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
    }
  );
  if (res.data.error) throw new Error(res.data.error.message);
  const places = res.data.result?.content || [];
  return places.map((place: any) => ({
    placeId: place.id,
    name: place.summary?.split("\n")[0] || place.id,
    address: place.location?.formattedAddress || "",
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    googleMapsUrl: place.googleMapsLinks?.placeUri,
    summary: place.summary,
  }));
}

export async function getGrnAvailability(
  hotelCodes: string[],
  checkin: string,
  checkout: string,
  rooms: Array<{ adults?: number; childrenAges?: number[] }>,
  options: { nationality?: string; currency?: string; rateType?: string } = {}
) {
  const payload = {
    hotel_codes: hotelCodes,
    checkin,
    checkout,
    client_nationality: options.nationality || config.grn.country,
    currency: options.currency || config.grn.currency,
    rates: options.rateType || "comprehensive",
    cutoff_time: 10000,
    rooms: rooms.map((r) => ({
      adults: (r.adults ?? 2).toString(),
      ...(r.childrenAges && { children_ages: r.childrenAges.map(String) }),
    })),
  };
  const res = await axios.post(config.grn.endpoint, payload, {
    headers: {
      "Content-Type": "application/json",
      "api-key": config.grn.apiKey,
      Accept: "application/json",
    },
  });
  return res.data;
}

export async function getHotelReviews(
  placeId: string,
  options: {
    sortBy?: string;
    topicId?: string;
    language?: string;
    nextPageToken?: string;
  } = {}
) {
  if (!config.serp.apiKey) throw new Error("SERP API key not configured.");
  const params: Record<string, string> = {
    engine: "google_maps_reviews",
    api_key: config.serp.apiKey,
    place_id: placeId,
    hl: options.language || "en",
    sort_by: options.sortBy || "newestFirst",
  };
  if (options.topicId) params.topic_id = options.topicId;
  if (options.nextPageToken) params.next_page_token = options.nextPageToken;
  const res = await axios.get(config.serp.endpoint, { params });
  return res.data;
}

export async function getHotelReviewsPaginated(
  placeId: string,
  options: { maxReviews?: number; sortBy?: string; topicId?: string; language?: string } = {}
) {
  const maxReviews = options.maxReviews || 20;
  const perPage = 20;
  const allReviews: any[] = [];
  let placeInfo = null;
  let topics = null;
  let nextPageToken: string | null = null;
  let pagesLoaded = 0;
  const maxPages = Math.ceil(maxReviews / 8) + 1;

  while (allReviews.length < maxReviews && pagesLoaded < maxPages) {
    const pageOpts: any = {
      ...options,
      nextPageToken: nextPageToken ?? undefined,
    };
    if (pagesLoaded > 0) (pageOpts as any).perPage = perPage;
    const r = await getHotelReviews(placeId, pageOpts);
    if (pagesLoaded === 0) {
      placeInfo = r.place_info;
      topics = r.topics;
    }
    if (r.reviews?.length) allReviews.push(...r.reviews);
    nextPageToken = r.serpapi_pagination?.next_page_token ?? null;
    if (!nextPageToken) break;
    pagesLoaded++;
  }
  const trimmed = allReviews.slice(0, maxReviews);
  return {
    place_info: placeInfo,
    topics,
    reviews: trimmed,
    pagination: {
      totalFetched: trimmed.length,
      hasMore: nextPageToken != null && allReviews.length >= maxReviews,
      nextPageToken,
      pagesLoaded: pagesLoaded + 1,
    },
  };
}

export function searchReviews(
  reviews: any[],
  query: string,
  options: { threshold?: number } = {}
) {
  const fuse = new Fuse(reviews, {
    keys: ["snippet", "extracted_snippet.original", "user.name"],
    threshold: options.threshold ?? 0.4,
    includeScore: true,
    includeMatches: true,
  });
  return fuse.search(query).map((r) => ({
    review: r.item,
    score: (1 - (r.score ?? 0)) * 100,
    matches: r.matches,
  }));
}

export async function getGooglePlaceDetails(
  placeId: string,
  options: { includeAtmosphere?: boolean; fields?: string } = {}
) {
  const apiKey = config.googleMaps.placesApiKey || config.googleMaps.apiKey;
  if (!apiKey) throw new Error("Google Places API key not configured.");
  const defaultFields = [
    "id", "name", "photos", "addressComponents", "formattedAddress", "location",
    "plusCode", "types", "shortFormattedAddress", "displayName", "googleMapsUri",
    "primaryType", "primaryTypeDisplayName", "businessStatus", "iconBackgroundColor",
    "iconMaskBaseUri", "accessibilityOptions", "currentOpeningHours", "regularOpeningHours",
    "internationalPhoneNumber", "nationalPhoneNumber", "priceLevel", "rating",
    "userRatingCount", "websiteUri",
  ];
  const fieldMask = options.fields || defaultFields.join(",");
  const res = await axios.get(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    }
  );
  const place = res.data;
  return {
    placeId: place.id,
    displayName: place.displayName?.text,
    formattedAddress: place.formattedAddress,
    location: place.location,
    types: place.types,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    websiteUri: place.websiteUri,
    photos: place.photos?.map((p: any) => ({
      name: p.name,
      photoUri: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=400&key=${apiKey}`,
    })),
    uiKitSnippet: {
      placeDetails: `<gmp-place-details><gmp-place-details-place-request place="${place.id}"></gmp-place-details-place-request><gmp-place-all-content></gmp-place-all-content></gmp-place-details>`,
    },
  };
}

export { toGrnApiCode, toGrnDbCode };
