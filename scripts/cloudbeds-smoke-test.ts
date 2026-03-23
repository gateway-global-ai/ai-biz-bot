/**
 * Cloudbeds smoke test — Boardwalk Suites Lafayette.
 *
 * Run: npm run test:cloudbeds  (wraps doppler run for DATABASE_URL)
 *
 * Canonical path: site_pms_integrations + fetchCloudbedsAvailability (same as voice get_hotel_inventory).
 * Optional: direct Cloudbeds HTTP call when CLOUDBEDS_API_KEY is set (dev/demo legacy).
 */

import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { siteConfigs, sitePmsIntegrations } from "../shared/schema.js";
import { fetchCloudbedsAvailability } from "../server/routes/cloudbedsRoutes.js";
import { BOARDWALK_SUITES } from "./setup-boardwalk-suites.js";

const BASE_URL = process.env.CLOUDBEDS_API_BASE_URL || "https://api.cloudbeds.com/api/v1.3";

function nextDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);
  return { checkIn: checkIn.toISOString().slice(0, 10), checkOut: checkOut.toISOString().slice(0, 10) };
}

/** Optional: global env → Cloudbeds HTTP. Production uses DB row instead. */
async function testEnvDirect(): Promise<boolean> {
  const apiKey = process.env.CLOUDBEDS_API_KEY;
  const propertyId = process.env.CLOUDBEDS_PROPERTY_ID || BOARDWALK_SUITES.cloudbedsPropertyId;
  console.log("\n--- 1) Optional: direct API (CLOUDBEDS_API_KEY + property) ---");
  if (!apiKey) {
    console.log(
      "SKIP: no global CLOUDBEDS_API_KEY — OK if site_pms_integrations has credentials (production path).",
    );
    return true;
  }
  console.log(`OK: CLOUDBEDS_API_KEY present (len=${apiKey.length}), propertyId=${propertyId}`);

  const { checkIn, checkOut } = nextDates();
  const params = new URLSearchParams({
    propertyIDs: propertyId,
    startDate: checkIn,
    endDate: checkOut,
    rooms: "1",
    adults: "2",
    children: "0",
    detailedRates: "true",
  });
  const url = `${BASE_URL}/getAvailableRoomTypes?${params}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "x-api-key": apiKey },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`FAIL: Cloudbeds HTTP ${res.status}: ${text.slice(0, 400)}`);
    return false;
  }
  let data: { data?: unknown };
  try {
    data = JSON.parse(text) as { data?: unknown };
  } catch {
    console.error("FAIL: Non-JSON response");
    return false;
  }
  const raw = Array.isArray(data.data) ? data.data[0] : data.data;
  const rooms = (raw as { propertyRooms?: unknown[] })?.propertyRooms ?? [];
  console.log(`OK: Cloudbeds returned ${rooms.length} room type row(s) for ${checkIn} → ${checkOut}`);
  return true;
}

async function testDbPmsRow(): Promise<boolean> {
  console.log("\n--- 2) Required: DB site_pms_integrations + fetchCloudbedsAvailability (voice path) ---");
  if (!process.env.DATABASE_URL) {
    console.error("FAIL: DATABASE_URL not set (cannot test PMS row).");
    return false;
  }
  const [site] = await db
    .select()
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, BOARDWALK_SUITES.placeId))
    .limit(1);
  if (!site) {
    console.error("FAIL: No site_configs row for Boardwalk placeId. Run: npm run setup:boardwalk");
    return false;
  }
  console.log(`OK: site_config id=${site.id}`);

  const [pms] = await db
    .select()
    .from(sitePmsIntegrations)
    .where(
      and(eq(sitePmsIntegrations.siteConfigId, site.id), eq(sitePmsIntegrations.pmsType, "cloudbeds")),
    )
    .limit(1);

  if (!pms) {
    console.error(
      "FAIL: No cloudbeds site_pms_integrations row. Run: npm run setup:boardwalk (or insert PMS row for this site).",
    );
    return false;
  }
  if (!pms.apiKey && !pms.accessToken) {
    console.error("FAIL: PMS row has no apiKey/accessToken.");
    return false;
  }
  console.log(`OK: PMS row id=${pms.id} propertyId=${pms.propertyId}`);

  const { checkIn, checkOut } = nextDates();
  const result = await fetchCloudbedsAvailability(pms, { checkIn, checkOut, adults: 2, children: 0, rooms: 1 });
  if (!result.success) {
    console.error("FAIL:", result.error);
    return false;
  }
  console.log(`OK: Handler path success=${result.success} rooms=${result.rooms?.length ?? 0} hotel=${result.hotelName}`);
  return true;
}

async function main() {
  console.log("Cloudbeds smoke test — Boardwalk Suites Lafayette");
  const dbOk = await testDbPmsRow();
  const envOk = await testEnvDirect();
  if (!dbOk || !envOk) {
    process.exit(1);
  }
  console.log("\nAll checks passed. Ready for demo.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
