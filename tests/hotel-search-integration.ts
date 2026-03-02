/**
 * Hotel Search Workflow — Integration Tests
 *
 * Validates the full pipeline:
 *   1. searchGoogleMapsHotels  (Google Maps Grounding Lite) – axios stub
 *   2. searchHotelsInDb        (GRN Static Database)        – pg stub
 *   3. matchHotels             (fuzzy name + geo matching)  – pure function
 *   4. getGrnAvailability      (GRN Connect live rates)     – axios stub
 *   5. enrich_hotels_with_rates via executeHotelTool        – end-to-end
 *
 * External APIs are replaced with in-memory stubs so the suite runs offline.
 *
 * Run: npx tsx tests/hotel-search-integration.ts
 */

// Environment stubs — MUST be set before any lazy import so mcp-hotels-logic
// config object reads them during its first module initialisation.
process.env.GOOGLE_MAPS_API_KEY = "STUB_GOOGLE_KEY";
process.env.GRN_API_KEY = "STUB_GRN_KEY";
process.env.DB_HOST = "stub-host";

import axios from "axios";
import pg from "pg";

// ---------------------------------------------------------------------------
// Minimal assertion helper
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log("  \u2713  " + label);
    passed++;
  } else {
    console.error("  \u2717  " + label + (detail ? " \u2014 " + detail : ""));
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Stub data: 7 Las Vegas luxury hotels (Google Maps Grounding Lite shape)
// ---------------------------------------------------------------------------
const MOCK_GOOGLE_HOTELS = [
  { placeId: "ChIJa1", name: "Bellagio Las Vegas",             address: "3600 S Las Vegas Blvd, Las Vegas, NV 89109", latitude: 36.1129, longitude: -115.1765, rating: 4.7 },
  { placeId: "ChIJa2", name: "The Venetian Resort Las Vegas",  address: "3355 S Las Vegas Blvd, Las Vegas, NV 89109", latitude: 36.1210, longitude: -115.1692, rating: 4.6 },
  { placeId: "ChIJa3", name: "Wynn Las Vegas",                 address: "3131 S Las Vegas Blvd, Las Vegas, NV 89109", latitude: 36.1266, longitude: -115.1649, rating: 4.8 },
  { placeId: "ChIJa4", name: "ARIA Resort & Casino",           address: "3730 S Las Vegas Blvd, Las Vegas, NV 89158", latitude: 36.1072, longitude: -115.1767, rating: 4.5 },
  { placeId: "ChIJa5", name: "Caesars Palace Las Vegas",       address: "3570 S Las Vegas Blvd, Las Vegas, NV 89109", latitude: 36.1162, longitude: -115.1746, rating: 4.4 },
  { placeId: "ChIJa6", name: "MGM Grand Hotel Las Vegas",      address: "3799 S Las Vegas Blvd, Las Vegas, NV 89109", latitude: 36.1025, longitude: -115.1693, rating: 4.3 },
  { placeId: "ChIJa7", name: "The Cosmopolitan of Las Vegas",  address: "3708 S Las Vegas Blvd, Las Vegas, NV 89109", latitude: 36.1095, longitude: -115.1741, rating: 4.6 },
];

// ---------------------------------------------------------------------------
// Stub data: GRN Static Database records (PostgreSQL shape)
// ---------------------------------------------------------------------------
const MOCK_GRN_DB_HOTELS = [
  { grn_hotel_id: "H!BLG1", hotel_name: "Bellagio Hotel and Casino",   address: "3600 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1129",  longitude: "-115.1765", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
  { grn_hotel_id: "H!VNT1", hotel_name: "The Venetian Las Vegas",       address: "3355 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1210",  longitude: "-115.1692", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
  { grn_hotel_id: "H!WYN1", hotel_name: "Wynn Las Vegas Resort",        address: "3131 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1266",  longitude: "-115.1649", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
  { grn_hotel_id: "H!ARI1", hotel_name: "ARIA Resort Casino",           address: "3730 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1072",  longitude: "-115.1767", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
  { grn_hotel_id: "H!CES1", hotel_name: "Caesars Palace",               address: "3570 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1162",  longitude: "-115.1746", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
  { grn_hotel_id: "H!MGM1", hotel_name: "MGM Grand Hotel Casino",       address: "3799 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1025",  longitude: "-115.1693", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
  { grn_hotel_id: "H!CSM1", hotel_name: "The Cosmopolitan Las Vegas",   address: "3708 Las Vegas Blvd S", city_name: "Las Vegas", country_name: "United States", country_code: "US", latitude: "36.1095",  longitude: "-115.1741", star_rating: 5, destination_name: "Las Vegas", grn_destination_id: "LAS" },
];

// ---------------------------------------------------------------------------
// Stub: GRN Connect availability response
// ---------------------------------------------------------------------------
function buildMockAvailability(hotelCodes: string[]) {
  return {
    search_id: "mock-search-id-001",
    hotels: hotelCodes.map((code, i) => ({
      hotel_code: code,
      min_rate: 200 + i * 50,
      rates: [{ room_type: "Deluxe King", board_type: "RO", net_price: 200 + i * 50, currency: "USD" }],
    })),
  };
}

// ---------------------------------------------------------------------------
// Patch axios before any lazy module load
// ---------------------------------------------------------------------------
const origPost = axios.post.bind(axios);
const origGet  = axios.get.bind(axios);

function matchesHost(url: string, hostname: string): boolean {
  try {
    return new URL(url).hostname === hostname;
  } catch {
    return false;
  }
}

(axios as any).post = async (url: string, data: any, _opts?: any) => {
  if (matchesHost(url, "mapstools.googleapis.com")) {
    return {
      data: {
        result: {
          content: MOCK_GOOGLE_HOTELS.map((h) => ({
            id: h.placeId,
            summary: h.name,
            location: { formattedAddress: h.address, latitude: h.latitude, longitude: h.longitude },
          })),
        },
      },
    };
  }
  if (matchesHost(url, "sandbox-hub-neworbit.grnconnect.com")) {
    const codes: string[] = Array.isArray(data?.hotel_codes) ? data.hotel_codes : [];
    return { data: buildMockAvailability(codes) };
  }
  return origPost(url, data, _opts);
};

(axios as any).get = async (url: string, opts?: any) => {
  if (url.includes("place/autocomplete")) {
    return { data: { status: "OK", predictions: [{ place_id: "ChIJpred1", description: "Las Vegas, NV, USA", structured_formatting: { main_text: "Las Vegas", secondary_text: "NV, USA" }, types: ["locality"] }] } };
  }
  if (url.includes("place/details")) {
    return { data: { status: "OK", result: { place_id: "ChIJtest", name: "Las Vegas", formatted_address: "Las Vegas, NV, USA", geometry: { location: { lat: 36.1699, lng: -115.1398 } }, types: ["locality"] } } };
  }
  if (url.includes("places.googleapis.com/v1/places/")) {
    return { data: { id: "ChIJtest", displayName: { text: "Bellagio Las Vegas" }, formattedAddress: "3600 S Las Vegas Blvd", rating: 4.7, userRatingCount: 50000, location: { latitude: 36.1129, longitude: -115.1765 }, photos: [{ name: "places/ChIJtest/photos/photo1" }] } };
  }
  return origGet(url, opts);
};

// ---------------------------------------------------------------------------
// Patch pg.Pool before any lazy module load
// ---------------------------------------------------------------------------
(pg as any).Pool = function (_cfg: any) {
  return {
    query: async (_sql: string, params: any[]) => {
      const cityPattern = typeof params[0] === "string" ? params[0].replace(/%/g, "").toLowerCase() : "";
      const rows = MOCK_GRN_DB_HOTELS.filter(
        (h) => h.city_name.toLowerCase().includes(cityPattern) || h.destination_name.toLowerCase().includes(cityPattern)
      );
      return { rows };
    },
    end: async () => {},
  };
};

// ---------------------------------------------------------------------------
// Test 1: Helper functions
// ---------------------------------------------------------------------------
async function testToGrnApiCode() {
  console.log("\n--- 1. toGrnApiCode / toGrnDbCode helpers ---");
  const mod = await import("../server/mcp-hotels-logic.js");
  const toGrnApiCode = (mod as any).toGrnApiCode;
  const toGrnDbCode  = (mod as any).toGrnDbCode;

  assert(toGrnApiCode("H!BLG1") === "BLG1",    "strips H! prefix");
  assert(toGrnApiCode("BLG1")   === "BLG1",    "bare code unchanged");
  assert(toGrnApiCode(null)     === null,       "null input returns null");
  assert(toGrnDbCode("BLG1")   === "H!BLG1",   "prepends H! prefix");
  assert(toGrnDbCode("H!BLG1") === "H!BLG1",   "H!-prefixed unchanged");
  assert(toGrnDbCode(null)     === null,        "null input returns null");
}

// ---------------------------------------------------------------------------
// Test 2: matchHotels — pure function
// ---------------------------------------------------------------------------
async function testMatchHotels() {
  console.log("\n--- 2. matchHotels (pure function, no external deps) ---");
  const { matchHotels } = await import("../server/mcp-hotels-logic.js");

  const results = matchHotels(MOCK_GOOGLE_HOTELS, MOCK_GRN_DB_HOTELS);
  assert(Array.isArray(results),                               "returns an array");
  assert(results.length === MOCK_GOOGLE_HOTELS.length,         "result count equals Google input (" + results.length + ")");

  const matched = results.filter((r) => r.matched);
  assert(matched.length >= 5,                                  "at least 5 of 7 hotels matched (got " + matched.length + ")");

  for (const r of matched.slice(0, 3)) {
    assert(!!r.google?.name,         "google.name present: \"" + r.google?.name + "\"");
    assert(!!r.grn?.grn_hotel_id,    "grn.grn_hotel_id present: \"" + r.grn?.hotel_name + "\"");
    assert(r.matchScore > 0,         "matchScore > 0 (" + r.matchScore.toFixed(1) + ")");
  }

  // Edge cases
  assert(matchHotels([], MOCK_GRN_DB_HOTELS).length === 0,                  "empty Google input returns empty array");
  assert(matchHotels(MOCK_GOOGLE_HOTELS, []).every((r) => !r.matched),       "empty GRN input: all unmatched");
}

// ---------------------------------------------------------------------------
// Test 3: searchHotelsInDb
// ---------------------------------------------------------------------------
async function testSearchHotelsInDb() {
  console.log("\n--- 3. searchHotelsInDb (PostgreSQL stub) ---");
  const { searchHotelsInDb } = await import("../server/mcp-hotels-logic.js");

  const rows = await searchHotelsInDb("Las Vegas", null, 20);
  assert(Array.isArray(rows),                          "returns an array");
  assert(rows.length >= 5,                             "returns >=5 hotels (got " + rows.length + ")");
  assert(rows.every((h) => !!h.grn_hotel_id),          "every row has grn_hotel_id");
  assert(rows.every((h) => !!h.hotel_name),            "every row has hotel_name");

  const empty = await searchHotelsInDb("NONEXISTENT_CITY_XYZ_999", null, 5);
  assert(empty.length === 0,                           "nonexistent city returns 0 hotels (got " + empty.length + ")");
}

// ---------------------------------------------------------------------------
// Test 4: searchGoogleMapsHotels
// ---------------------------------------------------------------------------
async function testSearchGoogleMapsHotels() {
  console.log("\n--- 4. searchGoogleMapsHotels (Google Maps stub) ---");
  const { searchGoogleMapsHotels } = await import("../server/mcp-hotels-logic.js");

  const hotels = await searchGoogleMapsHotels("luxury hotels", "Las Vegas", { minRating: 4 });
  assert(Array.isArray(hotels),                                              "returns an array");
  assert(hotels.length >= 5,                                                 "returns >=5 hotels (got " + hotels.length + ")");
  assert(hotels.every((h) => !!h.name),                                      "every hotel has a name");
  assert(hotels.every((h) => !!h.placeId),                                   "every hotel has a placeId");
  assert(hotels.every((h) => typeof h.latitude === "number"),                "every hotel has numeric latitude");
  assert(hotels.every((h) => typeof h.longitude === "number"),               "every hotel has numeric longitude");
}

// ---------------------------------------------------------------------------
// Test 5: getGrnAvailability
// ---------------------------------------------------------------------------
async function testGetGrnAvailability() {
  console.log("\n--- 5. getGrnAvailability (GRN Connect stub) ---");
  const { getGrnAvailability } = await import("../server/mcp-hotels-logic.js");

  const codes = MOCK_GRN_DB_HOTELS.slice(0, 5).map((h) => h.grn_hotel_id.replace(/^H!/i, ""));
  const av    = await getGrnAvailability(codes, "2026-06-01", "2026-06-03", [{ adults: 2 }]);

  assert(!!av.search_id,                                               "response has search_id");
  assert(Array.isArray(av.hotels),                                     "response has hotels array");
  assert(av.hotels.length === codes.length,                            "availability covers all " + codes.length + " requested hotels");
  assert(av.hotels.every((h: any) => typeof h.min_rate === "number"),  "each hotel has numeric min_rate");
  assert(av.hotels.every((h: any) => Array.isArray(h.rates)),          "each hotel has rates array");
}

// ---------------------------------------------------------------------------
// Test 6: executeHotelTool / enrich_hotels_with_rates (end-to-end)
// ---------------------------------------------------------------------------
async function testEnrichHotelsWithRatesTool() {
  console.log("\n--- 6. enrich_hotels_with_rates (end-to-end via executeHotelTool) ---");
  const { executeHotelTool } = await import("../server/mcp-hotels-executor.js");

  const raw    = await executeHotelTool("enrich_hotels_with_rates", {
    location: "Las Vegas",
    query:    "luxury hotels",
    checkin:  "2026-06-01",
    checkout: "2026-06-03",
    rooms:    [{ adults: 2 }],
  });
  const result = JSON.parse(raw);

  assert(result.success === true,                           "success is true");
  assert(Array.isArray(result.hotels),                      "has hotels array");
  assert(result.totalHotels >= 5,                           "totalHotels >=5 (got " + result.totalHotels + ")");
  assert(typeof result.checkin  === "string",               "has checkin date");
  assert(typeof result.checkout === "string",               "has checkout date");

  const withAvail = result.hotels.filter((h: any) => h.availability?.available);
  assert(withAvail.length >= 5,                             "at least 5 hotels with availability (got " + withAvail.length + ")");

  // Validate data shape required by 40% Content Window UI
  for (const hotel of withAvail.slice(0, 5)) {
    assert(!!hotel.hotel_name,                              "hotel_name present: \"" + hotel.hotel_name + "\"");
    assert(typeof hotel.availability.minRate === "number",  "minRate is number: " + hotel.availability.minRate);
    assert(!!hotel.grn_hotel_id,                            "grn_hotel_id present: \"" + hotel.grn_hotel_id + "\"");
  }
}

// ---------------------------------------------------------------------------
// Test 7: executeHotelTool / search_hotels
// ---------------------------------------------------------------------------
async function testSearchHotelsTool() {
  console.log("\n--- 7. search_hotels (Google discovery + GRN match) ---");
  const { executeHotelTool } = await import("../server/mcp-hotels-executor.js");

  const raw    = await executeHotelTool("search_hotels", { location: "Las Vegas", query: "luxury hotels", limit: 10 });
  const result = JSON.parse(raw);

  assert(result.success === true,                    "success is true");
  assert(Array.isArray(result.hotels),               "has hotels array");
  assert(typeof result.totalResults === "number",    "totalResults is number (" + result.totalResults + ")");

  for (const h of (result.hotels || []).slice(0, 3)) {
    assert(h.google !== undefined,                   "hotel.google present");
    assert(typeof h.matchScore === "number",         "matchScore is number: " + h.matchScore);
  }
}

// ---------------------------------------------------------------------------
// Test 8: executeHotelTool / search_hotels_db
// ---------------------------------------------------------------------------
async function testSearchHotelsDbTool() {
  console.log("\n--- 8. search_hotels_db (GRN database query) ---");
  const { executeHotelTool } = await import("../server/mcp-hotels-executor.js");

  const raw    = await executeHotelTool("search_hotels_db", { cityName: "Las Vegas" });
  const result = JSON.parse(raw);

  assert(result.success === true,        "success is true");
  assert(Array.isArray(result.hotels),   "has hotels array");
  assert(result.totalResults >= 5,       "totalResults >=5 (got " + result.totalResults + ")");
}

// ---------------------------------------------------------------------------
// Test 9: Error scenarios
// ---------------------------------------------------------------------------
async function testErrorScenarios() {
  console.log("\n--- 9. Error scenarios ---");
  const { executeHotelTool } = await import("../server/mcp-hotels-executor.js");

  // Unknown tool name
  const unknown = JSON.parse(await executeHotelTool("unknown_tool_xyz", {}));
  assert(unknown.success === false,                                      "unknown tool: success is false");
  assert(typeof unknown.error === "string" && unknown.error.includes("Unknown"), "unknown tool: error message returned");

  // Non-existent location → no hotels found
  const noHotels = JSON.parse(
    await executeHotelTool("enrich_hotels_with_rates", {
      location: "NONEXISTENT_CITY_XYZ_999",
      checkin:  "2026-06-01",
      checkout: "2026-06-03",
    })
  );
  assert(noHotels.success === false,        "nonexistent location: success is false");
  assert(typeof noHotels.error === "string","nonexistent location: error message present");
}

// ---------------------------------------------------------------------------
// Test 10: Partial match scenario
// ---------------------------------------------------------------------------
async function testPartialMatchScenario() {
  console.log("\n--- 10. Partial match scenario (fewer GRN entries than Google results) ---");
  const { matchHotels } = await import("../server/mcp-hotels-logic.js");

  const partialGrn = MOCK_GRN_DB_HOTELS.slice(0, 3);
  const results    = matchHotels(MOCK_GOOGLE_HOTELS, partialGrn);

  assert(results.length === MOCK_GOOGLE_HOTELS.length,                              "result count equals Google input (" + results.length + ")");

  const matched   = results.filter((r) => r.matched);
  const unmatched = results.filter((r) => !r.matched);
  assert(matched.length <= 3,   "at most 3 matched (got " + matched.length + ")");
  assert(unmatched.length >= 4, "at least 4 unmatched (got " + unmatched.length + ")");

  // matchHotels always records the best GRN candidate even when score misses the
  // threshold; the `matched` flag is the authoritative signal of a valid match.
  for (const r of unmatched.slice(0, 2)) {
    assert(!!r.google?.name, "unmatched hotel still carries google.name: \"" + r.google?.name + "\"");
    assert(r.matched === false, "unmatched hotel: matched flag is false");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=================================================");
  console.log("  Hotel Search Workflow \u2014 Integration Tests");
  console.log("  Location : Las Vegas");
  console.log("  Query    : luxury hotels");
  console.log("  Dates    : 2026-06-01 \u2192 2026-06-03  | Adults: 2");
  console.log("=================================================");

  await testToGrnApiCode();
  await testMatchHotels();
  await testSearchHotelsInDb();
  await testSearchGoogleMapsHotels();
  await testGetGrnAvailability();
  await testEnrichHotelsWithRatesTool();
  await testSearchHotelsTool();
  await testSearchHotelsDbTool();
  await testErrorScenarios();
  await testPartialMatchScenario();

  console.log("\n=================================================");
  console.log("  Results: " + passed + " passed, " + failed + " failed");
  console.log("=================================================\n");

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
