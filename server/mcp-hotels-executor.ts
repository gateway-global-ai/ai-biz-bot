/**
 * Executes hotel MCP tools outside of the MCP transport.
 * Used by voice/chat when Gemini returns function calls.
 */
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
import { b2bStorage } from "./b2b-storage.js";

type ToolName = string;
type ToolArgs = Record<string, unknown>;

export async function executeHotelTool(
  name: ToolName,
  args: ToolArgs
): Promise<string> {
  try {
    switch (name) {
      case "poi_autocomplete": {
        const r = await getPoiAutocomplete(String(args.input ?? ""), {
          region: args.region as string | undefined,
          types: args.types as string | undefined,
          language: args.language as string | undefined,
        });
        return JSON.stringify({ success: true, input: args.input, ...r }, null, 2);
      }
      case "search_hotels_near_poi": {
        let poiDetails = null;
        if (args.poiPlaceId) {
          try {
            poiDetails = await getPoiDetails(String(args.poiPlaceId));
          } catch {}
        }
        const googleHotels = await searchGoogleMapsHotels(
          String(args.query ?? ""),
          null,
          {
            poiName: String(args.poiName ?? ""),
            radius: args.radius as number | undefined,
            radiusUnit: args.radiusUnit as string | undefined,
            minRating: args.minRating as number | undefined,
            maxRating: args.maxRating as number | undefined,
            keywords: args.keywords as string | undefined,
          }
        );
        const searchLocation =
          poiDetails?.address?.split(",")[1]?.trim() || String(args.poiName ?? "");
        const grnHotels = await searchHotelsInDb(
          searchLocation,
          null,
          (args.limit as number) || 100
        ).catch(() => []);
        const matched = matchHotels(googleHotels, grnHotels);
        return JSON.stringify(
          {
            success: true,
            searchQuery: {
              poiName: args.poiName,
              radius: args.radius ?? 5,
              radiusUnit: args.radiusUnit ?? "miles",
            },
            totalResults: matched.length,
            hotels: matched.slice(0, (args.limit as number) || 20),
          },
          null,
          2
        );
      }
      case "search_hotels": {
        const googleHotels = await searchGoogleMapsHotels(
          String(args.query ?? ""),
          String(args.location ?? ""),
          {
            minRating: args.minRating as number | undefined,
            maxRating: args.maxRating as number | undefined,
            keywords: args.keywords as string | undefined,
          }
        );
        const grnHotels = await searchHotelsInDb(
          String(args.location ?? ""),
          null,
          (args.limit as number) || 100
        ).catch(() => []);
        const matched = matchHotels(googleHotels, grnHotels);
        return JSON.stringify(
          {
            success: true,
            searchQuery: {
              location: args.location,
              query: args.query,
              keywords: args.keywords,
            },
            totalResults: matched.length,
            hotels: matched.slice(0, (args.limit as number) || 20),
          },
          null,
          2
        );
      }
      case "search_hotels_db": {
        const hotels = await searchHotelsInDb(
          String(args.cityName ?? ""),
          (args.countryCode as string) ?? null,
          (args.limit as number) || 100
        );
        return JSON.stringify(
          { success: true, totalResults: hotels.length, hotels },
          null,
          2
        );
      }
      case "get_hotel_availability": {
        const codes = (args.hotelCodes as string[] ?? []).map((c) =>
          toGrnApiCode(c)
        ).filter(Boolean) as string[];
        const rooms = (args.rooms as Array<{ adults?: number; childrenAges?: number[] }>) ?? [
          { adults: 2 },
        ];
        const av = await getGrnAvailability(
          codes,
          String(args.checkin ?? ""),
          String(args.checkout ?? ""),
          rooms,
          {
            nationality: args.nationality as string | undefined,
            currency: args.currency as string | undefined,
            rateType: args.rateType as string | undefined,
          }
        );
        return JSON.stringify({ success: true, ...av }, null, 2);
      }
      case "enrich_hotels_with_rates": {
        const grnHotels = await searchHotelsInDb(
          String(args.location ?? ""),
          null,
          50
        );
        if (grnHotels.length === 0) {
          return JSON.stringify({
            success: false,
            error: "No hotels found for this location",
          });
        }
        const codes = grnHotels
          .slice(0, 20)
          .map((h) => toGrnApiCode(h.grn_hotel_id))
          .filter(Boolean) as string[];
        const rooms =
          (args.rooms as Array<{ adults?: number; childrenAges?: number[] }>) ?? [
            { adults: 2 },
          ];
        const av = await getGrnAvailability(
          codes,
          String(args.checkin ?? ""),
          String(args.checkout ?? ""),
          rooms,
          { currency: args.currency as string | undefined }
        );
        const platformId = args.platformId as string | undefined;
        const enriched = await Promise.all(
          grnHotels.map(async (h) => {
            const apiCode = toGrnApiCode(h.grn_hotel_id);
            const ah = av.hotels?.find((x: any) => x.hotel_code === apiCode);
            // Persist to b2b_hotels when we have a platform anchor
            if (apiCode && platformId) {
              try {
                await b2bStorage.upsertHotelByCode({
                  hotelCode: apiCode,
                  platformId,
                  name: h.hotel_name ?? undefined,
                  rawResponse: ah ?? undefined,
                  // googlePlaceId not available in DB-only path; preserved from existing record by upsert
                });
              } catch (persistErr: any) {
                console.warn("[GRN Hotels] Persist warning:", persistErr.message);
              }
            }
            return {
              ...h,
              availability: ah
                ? { available: true, minRate: ah.min_rate, rates: ah.rates }
                : { available: false },
            };
          })
        );
        return JSON.stringify(
          {
            success: true,
            searchId: av.search_id,
            checkin: args.checkin,
            checkout: args.checkout,
            totalHotels: enriched.length,
            hotelsWithAvailability: enriched.filter(
              (x: any) => x.availability.available
            ).length,
            hotels: enriched,
          },
          null,
          2
        );
      }
      default:
        return JSON.stringify({
          success: false,
          error: `Unknown tool: ${name}`,
        });
    }
  } catch (err: any) {
    return JSON.stringify({
      success: false,
      error: err?.message ?? String(err),
    });
  }
}
