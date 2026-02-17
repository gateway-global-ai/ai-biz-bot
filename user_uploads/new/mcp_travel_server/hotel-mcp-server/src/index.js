import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import axios from "axios";
import Fuse from "fuse.js";

// ============================================================================
// Configuration
// ============================================================================

const config = {
  // GRN Connect API
  grn: {
    apiKey: process.env.GRN_API_KEY || "7438238a97854f59a51d19f36de24625",
    endpoint: process.env.GRN_ENDPOINT || "https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/",
    agencyName: "Jason Travel",
    agentName: "Jason",
    agencyEmail: "jason@proximitycapital.us",
    country: "US",
    currency: "USD"
  },
  // GRN Database
  database: {
    host: process.env.DB_HOST || "88.198.6.114",
    port: parseInt(process.env.DB_PORT || "38164"),
    database: process.env.DB_NAME || "static_master",
    user: process.env.DB_USER || "reporting",
    password: process.env.GRN_STATIC_KEY || process.env.DB_PASSWORD || "Ghab%j2jK231"
  },
  // SERP API
  serp: {
    apiKey: process.env.SERPAPI_KEY || process.env.SERP_API_KEY || "",
    endpoint: "https://serpapi.com/search"
  },
  // Google Maps
  googleMaps: {
    apiKey: process.env.google_map_api_key || process.env.GOOGLE_MAPS_API_KEY || "",
    placesApiKey: process.env.GOOGLE_PLACES_KEY || "",
    mcpEndpoint: "https://mapstools.googleapis.com/mcp"
  }
};

// ============================================================================
// Database Pool
// ============================================================================

let dbPool = null;

async function getDbPool() {
  if (!dbPool) {
    dbPool = new pg.Pool(config.database);
  }
  return dbPool;
}

// ============================================================================
// Hotel Code Utilities
// ============================================================================

/**
 * Convert GRN hotel ID to API format (strip H! prefix)
 * DB stores: "H!1848061" -> API needs: "1848061"
 */
function toGrnApiCode(grnHotelId) {
  if (!grnHotelId) return null;
  return grnHotelId.replace(/^H!/i, '');
}

/**
 * Convert API hotel code to DB format (add H! prefix)
 * API returns: "1848061" -> DB has: "H!1848061"
 */
function toGrnDbCode(apiCode) {
  if (!apiCode) return null;
  if (apiCode.startsWith('H!')) return apiCode;
  return `H!${apiCode}`;
}

// ============================================================================
// Hotel Matching Logic
// ============================================================================

/**
 * Match hotels from Google to GRN database using fuzzy matching
 */
function matchHotels(googleHotels, grnHotels) {
  const fuse = new Fuse(grnHotels, {
    keys: ["hotel_name", "address", "city_name"],
    threshold: 0.4,
    includeScore: true
  });

  return googleHotels.map(googleHotel => {
    const results = fuse.search(googleHotel.name);

    // Also try matching by coordinates if available
    let bestMatch = null;
    let bestScore = Infinity;

    for (const result of results.slice(0, 5)) {
      let score = result.score;

      // Boost score if coordinates are close
      if (googleHotel.latitude && googleHotel.longitude &&
          result.item.latitude && result.item.longitude) {
        const distance = calculateDistance(
          googleHotel.latitude, googleHotel.longitude,
          result.item.latitude, result.item.longitude
        );
        if (distance < 0.5) { // Within 500m
          score *= 0.5; // Boost score significantly
        } else if (distance < 1) {
          score *= 0.7;
        }
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
      matched: bestScore < 0.5
    };
  });
}

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search hotels in GRN database by city
 */
async function searchHotelsInDb(cityName, countryCode = null, limit = 100) {
  const pool = await getDbPool();

  let query = `
    SELECT
      h.grn_hotel_id,
      h.giata_hotel_id,
      h.hotel_name,
      h.address,
      h.latitude,
      h.longitude,
      h.star_rating,
      h.description,
      h.giata_city_name as city_name,
      h.destination_name,
      h.country_name,
      h.country_code,
      h.grn_destination_id
    FROM hotel h
    WHERE (LOWER(h.giata_city_name) LIKE LOWER($1) OR LOWER(h.destination_name) LIKE LOWER($1))
  `;

  const params = [`%${cityName}%`];

  if (countryCode) {
    query += ` AND LOWER(h.country_code) = LOWER($2)`;
    params.push(countryCode);
  }

  query += ` LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * POI Autocomplete using Google Places Autocomplete API
 * Returns matching places for autocomplete suggestions
 */
async function getPoiAutocomplete(input, options = {}) {
  const apiKey = config.googleMaps.placesApiKey || config.googleMaps.apiKey;
  if (!apiKey) {
    throw new Error("Google Places API key not configured. Set GOOGLE_PLACES_KEY environment variable.");
  }

  const params = {
    input: input,
    key: apiKey
  };

  // Optional location bias
  if (options.latitude && options.longitude) {
    params.location = `${options.latitude},${options.longitude}`;
    params.radius = options.biasRadius || 50000; // 50km default bias
  }

  // Filter by types (e.g., 'establishment', 'geocode', 'address')
  if (options.types) {
    params.types = options.types;
  }

  // Language
  if (options.language) {
    params.language = options.language;
  }

  // Region bias
  if (options.region) {
    params.components = `country:${options.region}`;
  }

  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json',
    { params }
  );

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places Autocomplete error: ${response.data.status} - ${response.data.error_message || ''}`);
  }

  return {
    predictions: (response.data.predictions || []).map(p => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text,
      secondaryText: p.structured_formatting?.secondary_text,
      types: p.types,
      matchedSubstrings: p.matched_substrings
    })),
    status: response.data.status
  };
}

/**
 * Get POI details including coordinates for radius search
 */
async function getPoiDetails(placeId) {
  const apiKey = config.googleMaps.placesApiKey || config.googleMaps.apiKey;
  if (!apiKey) {
    throw new Error("Google Places API key not configured.");
  }

  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/place/details/json',
    {
      params: {
        place_id: placeId,
        fields: 'place_id,name,formatted_address,geometry,types',
        key: apiKey
      }
    }
  );

  if (response.data.status !== 'OK') {
    throw new Error(`Place Details error: ${response.data.status}`);
  }

  const place = response.data.result;
  return {
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    types: place.types
  };
}

/**
 * Get place details from Google Places API (New) for UI Kit integration
 * Returns all fields needed for Places UI Kit components
 */
async function getGooglePlaceDetails(placeId, options = {}) {
  const apiKey = config.googleMaps.placesApiKey || config.googleMaps.apiKey;
  if (!apiKey) {
    throw new Error("Google Places API key not configured. Set GOOGLE_PLACES_KEY environment variable.");
  }

  // Fields for Places UI Kit integration (organized by pricing tier)
  const defaultFields = [
    // Essentials (IDs Only)
    'id', 'name', 'photos',
    // Essentials
    'addressComponents', 'formattedAddress', 'location', 'plusCode', 'types', 'shortFormattedAddress',
    // Pro
    'displayName', 'googleMapsUri', 'primaryType', 'primaryTypeDisplayName', 'businessStatus',
    'iconBackgroundColor', 'iconMaskBaseUri', 'accessibilityOptions',
    // Enterprise
    'currentOpeningHours', 'regularOpeningHours', 'internationalPhoneNumber', 'nationalPhoneNumber',
    'priceLevel', 'rating', 'userRatingCount', 'websiteUri',
    // Enterprise + Atmosphere (optional, can be costly)
    ...(options.includeAtmosphere ? [
      'editorialSummary', 'reviews', 'outdoorSeating', 'reservable', 'delivery', 'dineIn', 'takeout',
      'parkingOptions', 'paymentOptions', 'goodForChildren', 'goodForGroups'
    ] : [])
  ];

  const fieldMask = options.fields || defaultFields.join(',');

  const response = await axios.get(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask
      }
    }
  );

  const place = response.data;

  // Transform response for UI Kit compatibility
  return {
    // Core identifiers for UI Kit
    placeId: place.id,
    resourceName: place.name, // For gmp-place-details-place-request

    // Display info
    displayName: place.displayName?.text,
    displayNameLanguage: place.displayName?.languageCode,
    primaryType: place.primaryType,
    primaryTypeDisplayName: place.primaryTypeDisplayName?.text,
    types: place.types,

    // Location
    formattedAddress: place.formattedAddress,
    shortFormattedAddress: place.shortFormattedAddress,
    addressComponents: place.addressComponents,
    location: place.location,
    plusCode: place.plusCode,

    // Contact
    phoneNumber: place.internationalPhoneNumber || place.nationalPhoneNumber,
    websiteUri: place.websiteUri,
    googleMapsUri: place.googleMapsUri,

    // Business info
    businessStatus: place.businessStatus,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,

    // Hours
    openingHours: place.regularOpeningHours,
    currentOpeningHours: place.currentOpeningHours,

    // Photos (for UI Kit media elements)
    photos: place.photos?.map(photo => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      authorAttributions: photo.authorAttributions,
      // Photo URL can be constructed: https://places.googleapis.com/v1/{photo.name}/media?maxHeightPx=400&key=API_KEY
      photoUri: `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&key=${apiKey}`
    })),

    // Icons (for UI Kit)
    iconBackgroundColor: place.iconBackgroundColor,
    iconMaskBaseUri: place.iconMaskBaseUri,

    // Accessibility
    accessibilityOptions: place.accessibilityOptions,

    // Atmosphere data (if requested)
    ...(options.includeAtmosphere && {
      editorialSummary: place.editorialSummary?.text,
      reviews: place.reviews,
      amenities: {
        outdoorSeating: place.outdoorSeating,
        reservable: place.reservable,
        delivery: place.delivery,
        dineIn: place.dineIn,
        takeout: place.takeout,
        goodForChildren: place.goodForChildren,
        goodForGroups: place.goodForGroups
      },
      parkingOptions: place.parkingOptions,
      paymentOptions: place.paymentOptions
    }),

    // UI Kit HTML snippet for easy integration
    uiKitSnippet: {
      placeDetails: `<gmp-place-details>
  <gmp-place-details-place-request place="${place.id}"></gmp-place-details-place-request>
  <gmp-place-all-content></gmp-place-all-content>
</gmp-place-details>`,
      placeDetailsCompact: `<gmp-place-details-compact orientation="horizontal">
  <gmp-place-details-place-request place="${place.id}"></gmp-place-details-place-request>
  <gmp-place-content-config>
    <gmp-place-media lightbox-preferred></gmp-place-media>
    <gmp-place-rating></gmp-place-rating>
    <gmp-place-type></gmp-place-type>
    <gmp-place-open-now-status></gmp-place-open-now-status>
  </gmp-place-content-config>
</gmp-place-details-compact>`,
      customConfig: `<gmp-place-details>
  <gmp-place-details-place-request place="${place.id}"></gmp-place-details-place-request>
  <gmp-place-content-config>
    <gmp-place-media lightbox-preferred></gmp-place-media>
    <gmp-place-address></gmp-place-address>
    <gmp-place-rating></gmp-place-rating>
    <gmp-place-opening-hours></gmp-place-opening-hours>
    <gmp-place-website></gmp-place-website>
    <gmp-place-phone-number></gmp-place-phone-number>
    <gmp-place-reviews></gmp-place-reviews>
  </gmp-place-content-config>
</gmp-place-details>`
    }
  };
}

/**
 * Search hotels using Google Maps Grounding Lite
 * @param {string} query - Search query
 * @param {string} location - Location to search
 * @param {object} options - Additional options (minRating, maxRating, keywords, poiName, radius, radiusUnit)
 */
async function searchGoogleMapsHotels(query, location = null, options = {}) {
  if (!config.googleMaps.apiKey) {
    throw new Error("Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY environment variable.");
  }

  // Build search query with all filters embedded in the string
  // Maps Grounding Lite doesn't support structured params, so we embed in query
  let searchQuery;

  // POI-based search (near a point of interest)
  if (options.poiName) {
    const radiusValue = options.radius || 5;
    const radiusUnit = options.radiusUnit || 'miles';
    searchQuery = `hotels within ${radiusValue} ${radiusUnit} of ${options.poiName}`;
    if (query) searchQuery += ` ${query}`;
  } else {
    // Standard location-based search
    searchQuery = location
      ? `hotels in ${location} ${query || ''}`.trim()
      : `hotels ${query || ''}`.trim();
  }

  // Add keywords/special search terms
  if (options.keywords) {
    searchQuery += ` ${options.keywords}`;
  }

  // Add rating filters to query string
  if (options.minRating && options.minRating >= 1 && options.minRating <= 5) {
    searchQuery += ` ${options.minRating}+ stars`;
  }
  if (options.maxRating && options.maxRating >= 1 && options.maxRating <= 5) {
    searchQuery += ` up to ${options.maxRating} stars`;
  }

  const response = await axios.post(
    config.googleMaps.mcpEndpoint,
    {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "search_places",
        arguments: {
          query: searchQuery
        }
      },
      id: Date.now()
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.googleMaps.apiKey
      }
    }
  );

  if (response.data.error) {
    throw new Error(response.data.error.message);
  }

  // Parse and return places
  const places = response.data.result?.content || [];
  return places.map(place => ({
    placeId: place.id,
    name: place.summary?.split('\n')[0] || place.id,
    address: place.location?.formattedAddress || "",
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    googleMapsUrl: place.googleMapsLinks?.placeUri,
    summary: place.summary
  }));
}

/**
 * Get hotel availability from GRN Connect API
 */
async function getGrnAvailability(hotelCodes, checkin, checkout, rooms, options = {}) {
  const payload = {
    hotel_codes: hotelCodes,
    checkin: checkin,
    checkout: checkout,
    client_nationality: options.nationality || config.grn.country,
    currency: options.currency || config.grn.currency,
    rates: options.rateType || "comprehensive",
    cutoff_time: options.cutoffTime || 10000,
    rooms: rooms.map(room => ({
      adults: room.adults?.toString() || "2",
      ...(room.childrenAges && { children_ages: room.childrenAges.map(String) })
    }))
  };

  if (options.hotelCategory) {
    payload.hotel_category = options.hotelCategory;
  }

  const response = await axios.post(
    config.grn.endpoint,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "api-key": config.grn.apiKey,
        "Accept": "application/json"
      }
    }
  );

  return response.data;
}

/**
 * Get reviews from SERP API with pagination support
 * First page always returns 8 reviews. Subsequent pages can return up to 20 with 'num' param.
 */
async function getHotelReviews(placeId, options = {}) {
  if (!config.serp.apiKey) {
    throw new Error("SERP API key not configured. Set SERPAPI_KEY environment variable.");
  }

  const params = {
    engine: "google_maps_reviews",
    api_key: config.serp.apiKey,
    place_id: placeId,
    hl: options.language || "en",
    sort_by: options.sortBy || "newestFirst"
  };

  // Handle topic_id filter
  if (options.topicId) {
    params.topic_id = options.topicId;
    if (options.perPage) params.num = Math.min(options.perPage, 20);
  }

  // Handle query filter (cannot be used with topic_id)
  if (options.query && !options.topicId) {
    params.query = options.query;
    if (options.perPage) params.num = Math.min(options.perPage, 20);
  }

  // Handle pagination
  if (options.nextPageToken) {
    params.next_page_token = options.nextPageToken;
    if (options.perPage) params.num = Math.min(options.perPage, 20);
  }

  const response = await axios.get(config.serp.endpoint, { params });
  return response.data;
}

/**
 * Fetch multiple pages of reviews up to maxReviews limit
 * Returns aggregated reviews with pagination info
 */
async function getHotelReviewsPaginated(placeId, options = {}) {
  const maxReviews = options.maxReviews || 20;
  const perPage = Math.min(options.perPage || 20, 20); // SERP API max is 20 per page
  const allReviews = [];
  let placeInfo = null;
  let topics = null;
  let nextPageToken = null;
  let pagesLoaded = 0;
  const maxPages = Math.ceil(maxReviews / 8) + 1; // First page is 8, rest can be up to 20

  while (allReviews.length < maxReviews && pagesLoaded < maxPages) {
    const pageOptions = {
      ...options,
      nextPageToken: nextPageToken,
      perPage: pagesLoaded === 0 ? undefined : perPage // First page doesn't support num
    };

    const response = await getHotelReviews(placeId, pageOptions);

    // Store place info and topics from first page
    if (pagesLoaded === 0) {
      placeInfo = response.place_info;
      topics = response.topics;
    }

    // Add reviews
    if (response.reviews && response.reviews.length > 0) {
      allReviews.push(...response.reviews);
    }

    // Check for next page
    nextPageToken = response.serpapi_pagination?.next_page_token;
    if (!nextPageToken) break;

    pagesLoaded++;
  }

  // Trim to maxReviews
  const trimmedReviews = allReviews.slice(0, maxReviews);

  return {
    place_info: placeInfo,
    topics: topics,
    reviews: trimmedReviews,
    pagination: {
      totalFetched: trimmedReviews.length,
      hasMore: nextPageToken !== null && allReviews.length >= maxReviews,
      nextPageToken: nextPageToken,
      pagesLoaded: pagesLoaded + 1
    }
  };
}

/**
 * Search within reviews using fuzzy matching
 */
function searchReviews(reviews, query, options = {}) {
  const fuse = new Fuse(reviews, {
    keys: ["snippet", "extracted_snippet.original", "user.name"],
    threshold: options.threshold || 0.4,
    includeScore: true,
    includeMatches: true
  });

  return fuse.search(query).map(result => ({
    review: result.item,
    score: (1 - result.score) * 100,
    matches: result.matches
  }));
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: "hotel-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: "poi_autocomplete",
    description: "Autocomplete for Points of Interest (POI) using Google Places Autocomplete. Use this to find a POI place ID for searching hotels near it.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "Text to search for (e.g., 'Times Square', 'LAX airport', 'Eiffel Tower')"
        },
        region: {
          type: "string",
          description: "Two-letter country code to bias results (e.g., 'US', 'FR')"
        },
        types: {
          type: "string",
          description: "Filter types: 'establishment', 'geocode', 'address', or '(cities)'"
        },
        language: {
          type: "string",
          description: "Language code for results (default: en)"
        }
      },
      required: ["input"]
    }
  },
  {
    name: "search_hotels_near_poi",
    description: "Search for hotels near a Point of Interest (POI). First use poi_autocomplete to get a POI place ID, then use this tool with the POI name and radius.",
    inputSchema: {
      type: "object",
      properties: {
        poiPlaceId: {
          type: "string",
          description: "Google Place ID of the POI (from poi_autocomplete)"
        },
        poiName: {
          type: "string",
          description: "Name of the POI (e.g., 'Times Square', 'LAX Airport') - used in search query"
        },
        radius: {
          type: "number",
          description: "Search radius distance (default: 5)"
        },
        radiusUnit: {
          type: "string",
          enum: ["miles", "km", "meters"],
          description: "Unit for radius (default: miles)"
        },
        query: {
          type: "string",
          description: "Additional search query (e.g., 'luxury', 'budget')"
        },
        keywords: {
          type: "string",
          description: "Additional keywords (e.g., 'pet friendly', 'pool')"
        },
        minRating: {
          type: "number",
          description: "Minimum review rating (1-5 stars)"
        },
        maxRating: {
          type: "number",
          description: "Maximum review rating (1-5 stars)"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)"
        }
      },
      required: ["poiName"]
    }
  },
  {
    name: "search_hotels",
    description: "Search for hotels using Google Maps Grounding Lite and match with GRN Connect database for availability enrichment. Returns hotels with Google details and matched GRN hotel codes.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'luxury hotels', 'beach resort')"
        },
        location: {
          type: "string",
          description: "Location to search (e.g., 'New York', 'Paris, France')"
        },
        keywords: {
          type: "string",
          description: "Additional keywords or special search terms to include (e.g., 'pet friendly', 'pool', 'free breakfast', 'near airport')"
        },
        minRating: {
          type: "number",
          description: "Minimum review rating filter (1-5 stars). Added to search query string."
        },
        maxRating: {
          type: "number",
          description: "Maximum review rating filter (1-5 stars). Added to search query string."
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "search_hotels_db",
    description: "Search hotels directly in the GRN Connect database by city name. Returns hotel codes that can be used for availability lookup.",
    inputSchema: {
      type: "object",
      properties: {
        cityName: {
          type: "string",
          description: "City name to search"
        },
        countryCode: {
          type: "string",
          description: "Two-letter country code (optional)"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 100)"
        }
      },
      required: ["cityName"]
    }
  },
  {
    name: "get_hotel_availability",
    description: "Get hotel rates and availability from GRN Connect API. Requires GRN hotel codes.",
    inputSchema: {
      type: "object",
      properties: {
        hotelCodes: {
          type: "array",
          items: { type: "string" },
          description: "Array of GRN hotel codes - can use DB format (H!1848061) or API format (1848061)"
        },
        checkin: {
          type: "string",
          description: "Check-in date in YYYY-MM-DD format"
        },
        checkout: {
          type: "string",
          description: "Check-out date in YYYY-MM-DD format"
        },
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              adults: { type: "number" },
              childrenAges: { type: "array", items: { type: "number" } }
            }
          },
          description: "Array of room configurations"
        },
        nationality: {
          type: "string",
          description: "Two-letter country code for client nationality (default: US)"
        },
        currency: {
          type: "string",
          description: "Three-letter currency code (default: USD)"
        },
        rateType: {
          type: "string",
          enum: ["concise", "comprehensive"],
          description: "Rate detail level (default: comprehensive)"
        }
      },
      required: ["hotelCodes", "checkin", "checkout", "rooms"]
    }
  },
  {
    name: "get_hotel_reviews",
    description: "Get hotel reviews from Google Maps using SERP API. Requires a Google Place ID. Supports pagination to fetch multiple pages of reviews.",
    inputSchema: {
      type: "object",
      properties: {
        placeId: {
          type: "string",
          description: "Google Place ID for the hotel"
        },
        sortBy: {
          type: "string",
          enum: ["qualityScore", "newestFirst", "ratingHigh", "ratingLow"],
          description: "Sort order for reviews (default: newestFirst)"
        },
        maxReviews: {
          type: "number",
          description: "Maximum total reviews to fetch across all pages (default: 20, max: 100). First page returns 8, subsequent pages up to 20 each."
        },
        topicId: {
          type: "string",
          description: "Filter reviews by topic ID (get topic IDs from first response)"
        },
        language: {
          type: "string",
          description: "Language code (default: en)"
        },
        nextPageToken: {
          type: "string",
          description: "Token for manual pagination (optional - use maxReviews for automatic pagination)"
        }
      },
      required: ["placeId"]
    }
  },
  {
    name: "search_reviews",
    description: "Search within fetched hotel reviews using text query. Useful for finding reviews mentioning specific topics.",
    inputSchema: {
      type: "object",
      properties: {
        placeId: {
          type: "string",
          description: "Google Place ID for the hotel"
        },
        query: {
          type: "string",
          description: "Search query to find in reviews (e.g., 'clean', 'breakfast', 'staff')"
        },
        fetchLimit: {
          type: "number",
          description: "Number of reviews to fetch before searching (default: 20)"
        },
        threshold: {
          type: "number",
          description: "Match threshold 0-1, lower is stricter (default: 0.4)"
        }
      },
      required: ["placeId", "query"]
    }
  },
  {
    name: "enrich_hotels_with_rates",
    description: "Combined operation: Search hotels via Google Maps, match with GRN database, and fetch availability/rates. Returns enriched hotel data with both Google info and GRN rates.",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to search (e.g., 'Miami Beach, FL')"
        },
        query: {
          type: "string",
          description: "Additional search query (e.g., 'luxury', 'beachfront')"
        },
        checkin: {
          type: "string",
          description: "Check-in date in YYYY-MM-DD format"
        },
        checkout: {
          type: "string",
          description: "Check-out date in YYYY-MM-DD format"
        },
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              adults: { type: "number" },
              childrenAges: { type: "array", items: { type: "number" } }
            }
          },
          description: "Array of room configurations (default: 1 room, 2 adults)"
        },
        currency: {
          type: "string",
          description: "Currency code (default: USD)"
        }
      },
      required: ["location", "checkin", "checkout"]
    }
  },
  {
    name: "get_full_hotel_details",
    description: "Get complete hotel information including Google data, GRN rates, and reviews all in one call.",
    inputSchema: {
      type: "object",
      properties: {
        placeId: {
          type: "string",
          description: "Google Place ID"
        },
        grnHotelCode: {
          type: "string",
          description: "GRN hotel code (if known)"
        },
        checkin: {
          type: "string",
          description: "Check-in date in YYYY-MM-DD format"
        },
        checkout: {
          type: "string",
          description: "Check-out date in YYYY-MM-DD format"
        },
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              adults: { type: "number" },
              childrenAges: { type: "array", items: { type: "number" } }
            }
          }
        },
        reviewLimit: {
          type: "number",
          description: "Number of reviews to include (default: 5)"
        }
      },
      required: ["placeId", "checkin", "checkout"]
    }
  },
  {
    name: "get_place_details_for_ui_kit",
    description: "Get Google Place details optimized for Places UI Kit integration. Returns all fields needed to render PlaceDetailsElement and PlaceDetailsCompactElement components, including photos, ratings, hours, and ready-to-use HTML snippets.",
    inputSchema: {
      type: "object",
      properties: {
        placeId: {
          type: "string",
          description: "Google Place ID (e.g., 'ChIJN1t_tDeuEmsRUsoyG83frY4')"
        },
        includeAtmosphere: {
          type: "boolean",
          description: "Include atmosphere data like reviews, amenities, parking (Enterprise + Atmosphere tier, higher cost)"
        },
        fields: {
          type: "string",
          description: "Custom comma-separated field mask (optional, uses optimized defaults if not specified)"
        }
      },
      required: ["placeId"]
    }
  },
  {
    name: "search_hotels_with_ui_data",
    description: "Search hotels and return enriched data ready for Places UI Kit display. Combines Google Maps search, GRN database matching, and place details for each result.",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to search (e.g., 'Dubai', 'Miami Beach')"
        },
        query: {
          type: "string",
          description: "Additional search query (e.g., 'luxury', 'beachfront')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)"
        },
        includeAtmosphere: {
          type: "boolean",
          description: "Include atmosphere data for each hotel (higher cost)"
        }
      },
      required: ["location"]
    }
  }
];

// ============================================================================
// Tool Handlers
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "poi_autocomplete": {
        const results = await getPoiAutocomplete(args.input, {
          region: args.region,
          types: args.types,
          language: args.language
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              input: args.input,
              predictions: results.predictions,
              status: results.status
            }, null, 2)
          }]
        };
      }

      case "search_hotels_near_poi": {
        // Get POI details if placeId provided
        let poiDetails = null;
        if (args.poiPlaceId) {
          try {
            poiDetails = await getPoiDetails(args.poiPlaceId);
          } catch (err) {
            // Continue without POI details
          }
        }

        // Search hotels near POI using Maps Grounding Lite
        const googleHotels = await searchGoogleMapsHotels(args.query || "", null, {
          poiName: args.poiName,
          radius: args.radius,
          radiusUnit: args.radiusUnit,
          minRating: args.minRating,
          maxRating: args.maxRating,
          keywords: args.keywords
        });

        // Try to match with GRN database
        // Extract city name from POI name or use as-is
        const searchLocation = poiDetails?.address?.split(',')[1]?.trim() || args.poiName;
        const grnHotels = await searchHotelsInDb(searchLocation, null, args.limit || 100);

        const matchedHotels = matchHotels(googleHotels, grnHotels);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              searchQuery: {
                poiName: args.poiName,
                poiPlaceId: args.poiPlaceId,
                radius: args.radius || 5,
                radiusUnit: args.radiusUnit || 'miles',
                query: args.query,
                keywords: args.keywords,
                minRating: args.minRating,
                maxRating: args.maxRating
              },
              poiDetails: poiDetails,
              totalResults: matchedHotels.length,
              hotels: matchedHotels.slice(0, args.limit || 20)
            }, null, 2)
          }]
        };
      }

      case "search_hotels": {
        // Search Google Maps with rating filters and keywords
        const googleHotels = await searchGoogleMapsHotels(args.query || "", args.location, {
          minRating: args.minRating,
          maxRating: args.maxRating,
          keywords: args.keywords
        });

        // Get GRN hotels from database for matching
        const grnHotels = await searchHotelsInDb(args.location, null, args.limit || 100);

        // Match hotels
        const matchedHotels = matchHotels(googleHotels, grnHotels);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              searchQuery: {
                location: args.location,
                query: args.query,
                keywords: args.keywords,
                minRating: args.minRating,
                maxRating: args.maxRating
              },
              totalResults: matchedHotels.length,
              hotels: matchedHotels.slice(0, args.limit || 20)
            }, null, 2)
          }]
        };
      }

      case "search_hotels_db": {
        const hotels = await searchHotelsInDb(
          args.cityName,
          args.countryCode,
          args.limit || 100
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              totalResults: hotels.length,
              hotels: hotels
            }, null, 2)
          }]
        };
      }

      case "get_hotel_availability": {
        // Convert hotel codes to API format (strip H! prefix)
        const apiHotelCodes = args.hotelCodes.map(code => toGrnApiCode(code));

        const availability = await getGrnAvailability(
          apiHotelCodes,
          args.checkin,
          args.checkout,
          args.rooms,
          {
            nationality: args.nationality,
            currency: args.currency,
            rateType: args.rateType
          }
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              ...availability
            }, null, 2)
          }]
        };
      }

      case "get_hotel_reviews": {
        // Use paginated function for fetching multiple pages of reviews
        const maxReviews = args.maxReviews || 20;

        // If maxReviews > 8 or specific page token not provided, use pagination
        if (maxReviews > 8 && !args.nextPageToken) {
          const reviews = await getHotelReviewsPaginated(args.placeId, {
            sortBy: args.sortBy,
            maxReviews: Math.min(maxReviews, 100), // Cap at 100
            topicId: args.topicId,
            language: args.language
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                placeInfo: reviews.place_info,
                topics: reviews.topics,
                reviewCount: reviews.reviews?.length || 0,
                reviews: reviews.reviews,
                pagination: reviews.pagination
              }, null, 2)
            }]
          };
        }

        // Single page fetch (manual pagination or small request)
        const reviews = await getHotelReviews(args.placeId, {
          sortBy: args.sortBy,
          topicId: args.topicId,
          language: args.language,
          nextPageToken: args.nextPageToken
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              placeInfo: reviews.place_info,
              topics: reviews.topics,
              reviewCount: reviews.reviews?.length || 0,
              reviews: reviews.reviews,
              pagination: reviews.serpapi_pagination
            }, null, 2)
          }]
        };
      }

      case "search_reviews": {
        // Fetch reviews using pagination for better coverage
        const fetchLimit = args.fetchLimit || 40;
        const reviewsData = await getHotelReviewsPaginated(args.placeId, {
          maxReviews: Math.min(fetchLimit, 100)
        });

        // Then search within them
        const searchResults = searchReviews(
          reviewsData.reviews || [],
          args.query,
          { threshold: args.threshold }
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              query: args.query,
              totalReviewsFetched: reviewsData.reviews?.length || 0,
              matchingReviews: searchResults.length,
              results: searchResults
            }, null, 2)
          }]
        };
      }

      case "enrich_hotels_with_rates": {
        // Step 1: Get GRN hotels from database
        const grnHotels = await searchHotelsInDb(args.location, null, 50);

        if (grnHotels.length === 0) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "No hotels found in database for this location"
              }, null, 2)
            }]
          };
        }

        // Step 2: Get availability for matched hotels (convert to API format)
        const hotelCodes = grnHotels.slice(0, 20)
          .map(h => toGrnApiCode(h.grn_hotel_id))
          .filter(Boolean);
        const rooms = args.rooms || [{ adults: 2 }];

        const availability = await getGrnAvailability(
          hotelCodes,
          args.checkin,
          args.checkout,
          rooms,
          { currency: args.currency }
        );

        // Step 3: Merge data (API returns codes without H! prefix)
        const enrichedHotels = grnHotels.map(grnHotel => {
          const apiCode = toGrnApiCode(grnHotel.grn_hotel_id);
          const availableHotel = availability.hotels?.find(
            h => h.hotel_code === apiCode
          );

          return {
            ...grnHotel,
            availability: availableHotel ? {
              available: true,
              minRate: availableHotel.min_rate,
              rates: availableHotel.rates
            } : {
              available: false
            }
          };
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              searchId: availability.search_id,
              checkin: args.checkin,
              checkout: args.checkout,
              totalHotels: enrichedHotels.length,
              hotelsWithAvailability: enrichedHotels.filter(h => h.availability.available).length,
              hotels: enrichedHotels
            }, null, 2)
          }]
        };
      }

      case "get_full_hotel_details": {
        const results = {
          success: true,
          google: null,
          rates: null,
          reviews: null,
          errors: []
        };

        // Get GRN availability if hotel code provided
        if (args.grnHotelCode) {
          try {
            const rooms = args.rooms || [{ adults: 2 }];
            const apiCode = toGrnApiCode(args.grnHotelCode);
            const availability = await getGrnAvailability(
              [apiCode],
              args.checkin,
              args.checkout,
              rooms
            );
            results.rates = availability.hotels?.[0] || null;
          } catch (err) {
            results.errors.push(`Rates error: ${err.message}`);
          }
        }

        // Get reviews
        try {
          const reviewsData = await getHotelReviews(args.placeId, {
            limit: args.reviewLimit || 5
          });
          results.google = {
            placeInfo: reviewsData.place_info,
            topics: reviewsData.topics
          };
          results.reviews = reviewsData.reviews;
        } catch (err) {
          results.errors.push(`Reviews error: ${err.message}`);
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };
      }

      case "get_place_details_for_ui_kit": {
        const placeDetails = await getGooglePlaceDetails(args.placeId, {
          includeAtmosphere: args.includeAtmosphere,
          fields: args.fields
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              placeDetails,
              // Include UI Kit integration guide
              uiKitIntegration: {
                libraryImport: `await google.maps.importLibrary('places');`,
                htmlSnippets: placeDetails.uiKitSnippet,
                documentation: "https://developers.google.com/maps/documentation/javascript/places-ui-kit/place-details"
              }
            }, null, 2)
          }]
        };
      }

      case "search_hotels_with_ui_data": {
        // Step 1: Get GRN hotels from database
        const grnHotels = await searchHotelsInDb(args.location, null, args.limit || 10);

        if (grnHotels.length === 0) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "No hotels found in database for this location"
              }, null, 2)
            }]
          };
        }

        // Step 2: For each hotel, try to get Google Place details (if we can find a matching place)
        // This would typically require a Places Text Search to find the Google Place ID first
        // For now, we return the database hotels with UI Kit integration guidance

        const hotelsWithUiData = grnHotels.map(hotel => ({
          // GRN Database info
          grnHotelCode: hotel.grn_hotel_id,
          giataHotelId: hotel.giata_hotel_id,
          name: hotel.hotel_name,
          address: hotel.address,
          city: hotel.city_name,
          country: hotel.country_name,
          countryCode: hotel.country_code,
          starRating: hotel.star_rating,
          location: {
            latitude: parseFloat(hotel.latitude),
            longitude: parseFloat(hotel.longitude)
          },
          description: hotel.description,

          // UI Kit integration info
          uiKitInfo: {
            // To use Places UI Kit, you need to find the Google Place ID first
            // This can be done via Places Text Search API
            searchQuery: `${hotel.hotel_name} ${hotel.city_name} ${hotel.country_name}`,
            placesSearchEndpoint: "https://places.googleapis.com/v1/places:searchText",
            uiKitDocumentation: "https://developers.google.com/maps/documentation/javascript/places-ui-kit/overview"
          }
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              totalResults: hotelsWithUiData.length,
              hotels: hotelsWithUiData,
              uiKitSetupGuide: {
                step1: "Enable Places UI Kit in Google Cloud Console",
                step2: "Load the places library: await google.maps.importLibrary('places');",
                step3: "Use Places Text Search to find Google Place IDs for each hotel",
                step4: "Use get_place_details_for_ui_kit tool with the Place ID to get full UI Kit data",
                documentationLinks: {
                  overview: "https://developers.google.com/maps/documentation/javascript/places-ui-kit/overview",
                  placeDetails: "https://developers.google.com/maps/documentation/javascript/places-ui-kit/place-details",
                  customStyling: "https://developers.google.com/maps/documentation/javascript/places-ui-kit/custom-styling"
                }
              }
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: error.message,
          stack: process.env.DEBUG ? error.stack : undefined
        }, null, 2)
      }],
      isError: true
    };
  }
});

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hotel MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
