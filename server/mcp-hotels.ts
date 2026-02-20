/**
 * Hotel MCP Server - Streamable HTTP transport for Cursor and other MCP clients
 * Exposed at /mcp/hotels (POST, GET, DELETE)
 */
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  searchHotelsInDb,
  getPoiAutocomplete,
  getPoiDetails,
  searchGoogleMapsHotels,
  getGrnAvailability,
  getHotelReviews,
  getHotelReviewsPaginated,
  searchReviews,
  getGooglePlaceDetails,
  matchHotels,
  toGrnApiCode,
} from "./mcp-hotels-logic.js";

const transports: Record<string, StreamableHTTPServerTransport> = {};

function createHotelMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "hotel-mcp-server",
      version: "1.0.0",
      websiteUrl: "https://gatewayglobal.ai",
    },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "poi_autocomplete",
    {
      description: "Autocomplete for Points of Interest using Google Places. Use to find a POI place ID for searching hotels near it.",
      inputSchema: {
        input: z.string().describe("Text to search (e.g., 'Times Square', 'LAX airport')"),
        region: z.string().optional().describe("Two-letter country code (e.g., 'US', 'FR')"),
        types: z.string().optional().describe("Filter types: 'establishment', 'geocode', 'address'"),
        language: z.string().optional().describe("Language code (default: en)"),
      },
    },
    async ({ input, region, types, language }) => {
      const results = await getPoiAutocomplete(input, { region, types, language });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, input, ...results }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "search_hotels_near_poi",
    {
      description: "Search for hotels near a Point of Interest. Use poi_autocomplete first to get a POI place ID.",
      inputSchema: {
        poiPlaceId: z.string().optional().describe("Google Place ID of the POI"),
        poiName: z.string().describe("Name of the POI (e.g., 'Times Square')"),
        radius: z.number().optional().describe("Search radius (default: 5)"),
        radiusUnit: z.enum(["miles", "km", "meters"]).optional().describe("Unit for radius"),
        query: z.string().optional().describe("Additional search query (e.g., 'luxury')"),
        keywords: z.string().optional().describe("Keywords (e.g., 'pet friendly', 'pool')"),
        minRating: z.number().optional().describe("Minimum rating 1-5"),
        maxRating: z.number().optional().describe("Maximum rating 1-5"),
        limit: z.number().optional().describe("Max results (default: 20)"),
      },
    },
    async (args) => {
      let poiDetails = null;
      if (args.poiPlaceId) {
        try {
          poiDetails = await getPoiDetails(args.poiPlaceId);
        } catch {}
      }
      const googleHotels = await searchGoogleMapsHotels(args.query || "", null, {
        poiName: args.poiName,
        radius: args.radius,
        radiusUnit: args.radiusUnit,
        minRating: args.minRating,
        maxRating: args.maxRating,
        keywords: args.keywords,
      });
      const searchLocation = poiDetails?.address?.split(",")[1]?.trim() || args.poiName;
      const grnHotels = await searchHotelsInDb(searchLocation, null, args.limit || 100).catch(() => []);
      const matched = matchHotels(googleHotels, grnHotels);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            searchQuery: { poiName: args.poiName, radius: args.radius || 5, radiusUnit: args.radiusUnit || "miles" },
            totalResults: matched.length,
            hotels: matched.slice(0, args.limit || 20),
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "search_hotels",
    {
      description: "Search hotels using Google Maps and match with GRN Connect. Returns hotels with Google details and matched GRN codes.",
      inputSchema: {
        query: z.string().optional().describe("Search query (e.g., 'luxury hotels')"),
        location: z.string().describe("Location (e.g., 'New York', 'Paris, France')"),
        keywords: z.string().optional().describe("Keywords (e.g., 'pet friendly', 'pool')"),
        minRating: z.number().optional().describe("Minimum rating 1-5"),
        maxRating: z.number().optional().describe("Maximum rating 1-5"),
        limit: z.number().optional().describe("Max results (default: 20)"),
      },
    },
    async (args) => {
      const googleHotels = await searchGoogleMapsHotels(args.query || "", args.location, {
        minRating: args.minRating,
        maxRating: args.maxRating,
        keywords: args.keywords,
      });
      const grnHotels = await searchHotelsInDb(args.location, null, args.limit || 100).catch(() => []);
      const matched = matchHotels(googleHotels, grnHotels);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            searchQuery: { location: args.location, query: args.query, keywords: args.keywords },
            totalResults: matched.length,
            hotels: matched.slice(0, args.limit || 20),
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "search_hotels_db",
    {
      description: "Search hotels in GRN database by city name. Returns hotel codes for availability lookup.",
      inputSchema: {
        cityName: z.string().describe("City name to search"),
        countryCode: z.string().optional().describe("Two-letter country code"),
        limit: z.number().optional().describe("Max results (default: 100)"),
      },
    },
    async (args) => {
      const hotels = await searchHotelsInDb(args.cityName, args.countryCode ?? null, args.limit || 100);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, totalResults: hotels.length, hotels }, null, 2) }],
      };
    }
  );

  const roomsSchema = z.array(
    z.object({
      adults: z.number().optional(),
      childrenAges: z.array(z.number()).optional(),
    })
  );

  server.registerTool(
    "get_hotel_availability",
    {
      description: "Get hotel rates and availability from GRN Connect. Requires GRN hotel codes.",
      inputSchema: {
        hotelCodes: z.array(z.string()).describe("GRN hotel codes (DB format H!xxx or API format)"),
        checkin: z.string().describe("Check-in YYYY-MM-DD"),
        checkout: z.string().describe("Check-out YYYY-MM-DD"),
        rooms: roomsSchema.describe("Room configurations"),
        nationality: z.string().optional().describe("Client nationality (default: US)"),
        currency: z.string().optional().describe("Currency (default: USD)"),
        rateType: z.enum(["concise", "comprehensive"]).optional().describe("Rate detail level"),
      },
    },
    async (args) => {
      const apiCodes = args.hotelCodes.map((c) => toGrnApiCode(c)).filter(Boolean) as string[];
      const availability = await getGrnAvailability(
        apiCodes,
        args.checkin,
        args.checkout,
        args.rooms,
        { nationality: args.nationality, currency: args.currency, rateType: args.rateType }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...availability }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_hotel_reviews",
    {
      description: "Get hotel reviews from Google Maps via SERP API. Supports pagination.",
      inputSchema: {
        placeId: z.string().describe("Google Place ID"),
        sortBy: z.enum(["qualityScore", "newestFirst", "ratingHigh", "ratingLow"]).optional(),
        maxReviews: z.number().optional().describe("Max total reviews (default: 20)"),
        topicId: z.string().optional().describe("Filter by topic ID"),
        language: z.string().optional(),
        nextPageToken: z.string().optional().describe("Pagination token"),
      },
    },
    async (args) => {
      const maxReviews = args.maxReviews ?? 20;
      if (maxReviews > 8 && !args.nextPageToken) {
        const r = await getHotelReviewsPaginated(args.placeId, {
          maxReviews: Math.min(maxReviews, 100),
          sortBy: args.sortBy,
          topicId: args.topicId,
          language: args.language,
        });
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              placeInfo: r.place_info,
              topics: r.topics,
              reviewCount: r.reviews?.length ?? 0,
              reviews: r.reviews,
              pagination: r.pagination,
            }, null, 2),
          }],
        };
      }
      const r = await getHotelReviews(args.placeId, {
        sortBy: args.sortBy,
        topicId: args.topicId,
        language: args.language,
        nextPageToken: args.nextPageToken,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            placeInfo: r.place_info,
            topics: r.topics,
            reviewCount: r.reviews?.length ?? 0,
            reviews: r.reviews,
            pagination: r.serpapi_pagination,
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "search_reviews",
    {
      description: "Search within hotel reviews using text query.",
      inputSchema: {
        placeId: z.string().describe("Google Place ID"),
        query: z.string().describe("Search query (e.g., 'clean', 'breakfast')"),
        fetchLimit: z.number().optional().describe("Reviews to fetch (default: 20)"),
        threshold: z.number().optional().describe("Match threshold 0-1 (default: 0.4)"),
      },
    },
    async (args) => {
      const data = await getHotelReviewsPaginated(args.placeId, {
        maxReviews: Math.min(args.fetchLimit ?? 40, 100),
      });
      const results = searchReviews(data.reviews || [], args.query, { threshold: args.threshold });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            query: args.query,
            totalReviewsFetched: data.reviews?.length ?? 0,
            matchingReviews: results.length,
            results,
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "enrich_hotels_with_rates",
    {
      description: "Combined: search hotels via GRN DB and fetch availability. Returns enriched hotel data with rates.",
      inputSchema: {
        location: z.string().describe("Location (e.g., 'Miami Beach, FL')"),
        query: z.string().optional().describe("Additional query (e.g., 'luxury')"),
        checkin: z.string().describe("Check-in YYYY-MM-DD"),
        checkout: z.string().describe("Check-out YYYY-MM-DD"),
        rooms: roomsSchema.optional().describe("Room config (default: 1 room, 2 adults)"),
        currency: z.string().optional().describe("Currency (default: USD)"),
      },
    },
    async (args) => {
      const grnHotels = await searchHotelsInDb(args.location, null, 50);
      if (grnHotels.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No hotels found for this location" }, null, 2) }],
        };
      }
      const codes = grnHotels.slice(0, 20).map((h) => toGrnApiCode(h.grn_hotel_id)).filter(Boolean) as string[];
      const rooms = args.rooms || [{ adults: 2 }];
      const availability = await getGrnAvailability(codes, args.checkin, args.checkout, rooms, {
        currency: args.currency,
      });
      const enriched = grnHotels.map((h) => {
        const apiCode = toGrnApiCode(h.grn_hotel_id);
        const av = availability.hotels?.find((x: any) => x.hotel_code === apiCode);
        return {
          ...h,
          availability: av
            ? { available: true, minRate: av.min_rate, rates: av.rates }
            : { available: false },
        };
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            searchId: availability.search_id,
            checkin: args.checkin,
            checkout: args.checkout,
            totalHotels: enriched.length,
            hotelsWithAvailability: enriched.filter((x) => x.availability.available).length,
            hotels: enriched,
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "get_full_hotel_details",
    {
      description: "Get complete hotel info: Google data, GRN rates, reviews.",
      inputSchema: {
        placeId: z.string().describe("Google Place ID"),
        grnHotelCode: z.string().optional().describe("GRN hotel code if known"),
        checkin: z.string().describe("Check-in YYYY-MM-DD"),
        checkout: z.string().describe("Check-out YYYY-MM-DD"),
        rooms: roomsSchema.optional(),
        reviewLimit: z.number().optional().describe("Reviews to include (default: 5)"),
      },
    },
    async (args) => {
      const results: any = { success: true, google: null, rates: null, reviews: null, errors: [] };
      if (args.grnHotelCode) {
        try {
          const rooms = args.rooms || [{ adults: 2 }];
          const av = await getGrnAvailability(
            [toGrnApiCode(args.grnHotelCode)!],
            args.checkin,
            args.checkout,
            rooms
          );
          results.rates = av.hotels?.[0] ?? null;
        } catch (e: any) {
          results.errors.push(`Rates: ${e.message}`);
        }
      }
      try {
        const r = await getHotelReviews(args.placeId);
        results.google = { placeInfo: r.place_info, topics: r.topics };
        results.reviews = r.reviews;
      } catch (e: any) {
        results.errors.push(`Reviews: ${e.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_place_details_for_ui_kit",
    {
      description: "Get Google Place details for Places UI Kit. Returns photos, ratings, hours, HTML snippets.",
      inputSchema: {
        placeId: z.string().describe("Google Place ID"),
        includeAtmosphere: z.boolean().optional().describe("Include reviews, amenities (higher cost)"),
        fields: z.string().optional().describe("Custom field mask"),
      },
    },
    async (args) => {
      const placeDetails = await getGooglePlaceDetails(args.placeId, {
        includeAtmosphere: args.includeAtmosphere,
        fields: args.fields,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            placeDetails,
            uiKitIntegration: {
              libraryImport: "await google.maps.importLibrary('places');",
              htmlSnippets: placeDetails.uiKitSnippet,
            },
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "search_hotels_with_ui_data",
    {
      description: "Search hotels and return data for Places UI Kit. Combines GRN DB with UI Kit integration info.",
      inputSchema: {
        location: z.string().describe("Location (e.g., 'Dubai', 'Miami Beach')"),
        query: z.string().optional(),
        limit: z.number().optional().describe("Max results (default: 10)"),
        includeAtmosphere: z.boolean().optional(),
      },
    },
    async (args) => {
      const grnHotels = await searchHotelsInDb(args.location, null, args.limit || 10);
      if (grnHotels.length === 0) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No hotels found" }, null, 2) }],
        };
      }
      const hotels = grnHotels.map((h) => ({
        grnHotelCode: h.grn_hotel_id,
        name: h.hotel_name,
        address: h.address,
        city: h.city_name,
        country: h.country_name,
        starRating: h.star_rating,
        location: { latitude: parseFloat(String(h.latitude)), longitude: parseFloat(String(h.longitude)) },
        uiKitInfo: {
          searchQuery: `${h.hotel_name} ${h.city_name} ${h.country_name}`,
          placesSearchEndpoint: "https://places.googleapis.com/v1/places:searchText",
        },
      }));
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            totalResults: hotels.length,
            hotels,
            uiKitSetupGuide: {
              step1: "Enable Places UI Kit in Google Cloud Console",
              step2: "Load: await google.maps.importLibrary('places');",
              step3: "Use Places Text Search for Place IDs",
              step4: "Use get_place_details_for_ui_kit with Place ID",
            },
          }, null, 2),
        }],
      };
    }
  );

  return server;
}

/** Express handler for POST /mcp/hotels */
async function handleMcpPost(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          if (sid) {
            transports[sid] = transport;
          }
        },
      });
      transport.onclose = () => {
        const sid = (transport as any).sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };
      const server = createHotelMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req as any, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID" },
        id: null,
      });
      return;
    }
    await transport.handleRequest(req as any, res, req.body);
  } catch (error: any) {
    console.error("[MCP Hotels] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}

/** Express handler for GET /mcp/hotels (SSE) */
async function handleMcpGet(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  const transport = transports[sessionId];
  await transport.handleRequest(req as any, res);
}

/** Express handler for DELETE /mcp/hotels */
async function handleMcpDelete(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req as any, res);
  } catch (e: any) {
    console.error("[MCP Hotels] Delete error:", e);
    if (!res.headersSent) res.status(500).send("Error processing session termination");
  }
}

/**
 * Attach MCP Hotels routes to an Express app.
 * Mount the returned router at /mcp/hotels so that:
 * - POST /mcp/hotels handles MCP JSON-RPC
 * - GET /mcp/hotels handles SSE
 * - DELETE /mcp/hotels terminates session
 */
export function attachHotelMcpRoutes(
  app: { post: (path: string, ...handlers: any[]) => void; get: (path: string, ...handlers: any[]) => void; delete: (path: string, ...handlers: any[]) => void },
  basePath: string
) {
  app.post(basePath, handleMcpPost);
  app.get(basePath, handleMcpGet);
  app.delete(basePath, handleMcpDelete);
}

/** Tools as Gemini function declarations for voice/chat integration */
export const HOTEL_MCP_TOOLS = [
  {
    name: "search_hotels",
    description: "Search hotels by location. Returns hotels with Google Maps details and GRN rates.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location (e.g., 'New York', 'Paris')" },
        query: { type: "string", description: "Optional query (e.g., 'luxury')" },
        checkin: { type: "string", description: "Check-in date YYYY-MM-DD" },
        checkout: { type: "string", description: "Check-out date YYYY-MM-DD" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["location"],
    },
  },
  {
    name: "enrich_hotels_with_rates",
    description: "Get hotels with live rates for a location and dates. Best for availability + pricing.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location (e.g., 'Miami Beach')" },
        checkin: { type: "string", description: "Check-in YYYY-MM-DD" },
        checkout: { type: "string", description: "Check-out YYYY-MM-DD" },
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: { adults: { type: "number" }, childrenAges: { type: "array", items: { type: "number" } } },
          },
        },
      },
      required: ["location", "checkin", "checkout"],
    },
  },
  {
    name: "get_hotel_availability",
    description: "Get rates for specific hotels by GRN codes. Use after search_hotels to get codes.",
    parameters: {
      type: "object",
      properties: {
        hotelCodes: { type: "array", items: { type: "string" }, description: "GRN hotel codes" },
        checkin: { type: "string", description: "Check-in YYYY-MM-DD" },
        checkout: { type: "string", description: "Check-out YYYY-MM-DD" },
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: { adults: { type: "number" }, childrenAges: { type: "array", items: { type: "number" } } },
          },
        },
      },
      required: ["hotelCodes", "checkin", "checkout", "rooms"],
    },
  },
  {
    name: "poi_autocomplete",
    description: "Autocomplete for places (POI). Use to find Place ID for 'hotels near X'.",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "Search text" },
        region: { type: "string", description: "Country code (e.g., US)" },
      },
      required: ["input"],
    },
  },
  {
    name: "search_hotels_near_poi",
    description: "Search hotels near a Point of Interest (e.g., Times Square, LAX).",
    parameters: {
      type: "object",
      properties: {
        poiName: { type: "string", description: "POI name" },
        poiPlaceId: { type: "string", description: "Google Place ID from poi_autocomplete" },
        radius: { type: "number", description: "Radius (default 5)" },
        radiusUnit: { type: "string", enum: ["miles", "km", "meters"] },
      },
      required: ["poiName"],
    },
  },
];
