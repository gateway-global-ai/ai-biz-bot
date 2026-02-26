/**
 * pulseCheck.ts — Sovereign Fleet Health Engine
 *
 * Validates every site's Google Place ID against the Places API (New).
 * If a Place ID returns 404 (Google has retired/merged it), auto-heals by
 * re-discovering the current ID via placeDiscoveryService and writing it to DB.
 *
 * Designed to be called from the 3 AM nightly cron (fleetHealth.ts) or
 * manually from an admin route for on-demand checks.
 *
 * API quota cost: 1 Places Details call per site with a placeId.
 * For 1,000 sites: 30,000 calls/month — within the $200 free tier threshold.
 */

import { storage } from "../storage";
import { getFreshPlaceId } from "./placeDiscoveryService";
import { sendSms } from "../twilio";

const PLACES_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

/** Milliseconds to wait between consecutive Places API calls — rate-limit guard. */
const INTER_REQUEST_GAP_MS = 200;

export interface SitePulseResult {
  siteId: string;
  siteName: string;
  oldPlaceId: string;
  status: "healthy" | "healed" | "failed" | "skipped";
  newPlaceId?: string;
  error?: string;
}

/**
 * Returns true if the Place ID is still live in the Places API (New).
 * Returns true (optimistic) if the API key is missing — we can't check without it.
 */
async function validatePlaceId(placeId: string): Promise<boolean> {
  if (!PLACES_API_KEY) {
    console.warn("[PulseCheck] No GOOGLE_MAPS_API_KEY — skipping live validation");
    return true;
  }
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": PLACES_API_KEY,
          "X-Goog-FieldMask": "id", // Minimal field mask — cheapest call possible
        },
      }
    );
    return res.status !== 404;
  } catch (err) {
    console.error(`[PulseCheck] Network error validating ${placeId}:`, err);
    return true; // Treat transient errors as "alive" — don't incorrectly mark healthy sites as broken
  }
}

/**
 * Runs the full fleet pulse check across all site_configs rows.
 * Sequential with a gap between requests to avoid hammering the Places API.
 */
export async function runBulkPulseCheck(): Promise<SitePulseResult[]> {
  const allSites = await storage.getSiteConfigs();
  const results: SitePulseResult[] = [];

  console.log(`[PulseCheck] Scanning ${allSites.length} sites...`);

  for (const site of allSites) {
    if (!site.placeId) {
      results.push({
        siteId: site.id,
        siteName: site.name,
        oldPlaceId: "",
        status: "skipped",
      });
      continue;
    }

    // Rate-limit guard between API calls
    await new Promise((r) => setTimeout(r, INTER_REQUEST_GAP_MS));

    const isAlive = await validatePlaceId(site.placeId);

    if (isAlive) {
      results.push({
        siteId: site.id,
        siteName: site.name,
        oldPlaceId: site.placeId,
        status: "healthy",
      });
      continue;
    }

    console.warn(
      `[PulseCheck] 404 detected for ${site.name} (${site.placeId}). Attempting auto-heal...`
    );

    try {
      const newId = await getFreshPlaceId(site.name);
      if (newId && newId !== site.placeId) {
        await storage.updateSiteConfig(site.id, { placeId: newId });
        console.log(
          `[PulseCheck] Healed ${site.name}: ${site.placeId} → ${newId}`
        );
        results.push({
          siteId: site.id,
          siteName: site.name,
          oldPlaceId: site.placeId,
          newPlaceId: newId,
          status: "healed",
        });
      } else {
        console.error(
          `[PulseCheck] Could not find a replacement Place ID for ${site.name}`
        );
        results.push({
          siteId: site.id,
          siteName: site.name,
          oldPlaceId: site.placeId,
          status: "failed",
          error: "Auto-heal returned no result",
        });
      }
    } catch (healErr) {
      const message =
        healErr instanceof Error ? healErr.message : String(healErr);
      results.push({
        siteId: site.id,
        siteName: site.name,
        oldPlaceId: site.placeId,
        status: "failed",
        error: message,
      });
    }
  }

  return results;
}

/**
 * Formats pulse results into a concise SMS and sends to the admin phone.
 * Silently skips if ADMIN_ALERT_PHONE is not set in environment.
 */
export async function sendFleetHealthReport(
  results: SitePulseResult[]
): Promise<void> {
  const adminPhone = process.env.ADMIN_ALERT_PHONE;
  if (!adminPhone) return;

  const healthy = results.filter((r) => r.status === "healthy").length;
  const healed  = results.filter((r) => r.status === "healed").length;
  const failed  = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const total   = results.length;

  const failedNames = results
    .filter((r) => r.status === "failed")
    .map((r) => r.siteName)
    .join(", ");

  const lines = [
    `[AI Biz Bot] Daily Fleet Report — ${new Date().toLocaleDateString("en-US", { timeZone: "America/Chicago" })}`,
    `Total: ${total} | OK: ${healthy} | Healed: ${healed} | Failed: ${failed} | No-ID: ${skipped}`,
    failed > 0
      ? `Needs manual review: ${failedNames}`
      : "All sites operating normally.",
  ];

  try {
    await sendSms(adminPhone, lines.join("\n"));
    console.log(`[PulseCheck] Fleet health report sent to ${adminPhone}`);
  } catch (smsErr) {
    console.error("[PulseCheck] Failed to send fleet health SMS:", smsErr);
  }
}
