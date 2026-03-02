/**
 * fleetHealth.ts — Nightly Fleet Pulse Cron
 *
 * Schedules the Bulk Pulse Check at 3:00 AM America/Chicago every day.
 * Validates every active site's Google Place ID, auto-heals any 404s via
 * placeDiscoveryService, and SMS the admin a Daily Fleet Health Report.
 *
 * Quota math (Places API New, $200/month free tier ≈ 40,000 calls):
 *   100 sites  →   3,000 calls/month  (free)
 *   500 sites  →  15,000 calls/month  (free)
 * 1,000 sites  →  30,000 calls/month  (free)
 * 1,333+ sites →  40,000 calls/month  (free tier ceiling)
 */

import cron from "node-cron";
import { runBulkPulseCheck, sendFleetHealthReport } from "../services/pulseCheck";

/** 3:00 AM every day — off-peak, before US business owners wake up. */
const FLEET_SWEEP_SCHEDULE = "0 3 * * *";

export function initFleetHealthCron(): void {
  cron.schedule(
    FLEET_SWEEP_SCHEDULE,
    async () => {
      console.log("[FleetHealth] Starting 3 AM Bulk Pulse Check...");
      try {
        const results = await runBulkPulseCheck();

        const healthy = results.filter((r) => r.status === "healthy").length;
        const healed  = results.filter((r) => r.status === "healed").length;
        const failed  = results.filter((r) => r.status === "failed").length;

        console.log(
          `[FleetHealth] Pulse complete. healthy=${healthy} healed=${healed} failed=${failed}`
        );

        await sendFleetHealthReport(results);
      } catch (err) {
        console.error("[FleetHealth] Critical failure during Bulk Pulse Check:", err);
      }
    },
    {
      scheduled: true,
      timezone: "America/Chicago",
    }
  );

  console.log(
    `[FleetHealth] Pulse cron registered: "${FLEET_SWEEP_SCHEDULE}" (America/Chicago)`
  );
}
