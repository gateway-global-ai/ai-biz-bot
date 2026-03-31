/**
 * Cloudbeds guest journey — pure classification + handler early exits (no HTTP, no DB).
 * Proves normalization logic used after getReservations + phone match in handlePmsLookupGuestJourney.
 *
 * Full stack (OTP gate, Cloudbeds API, toolHandler dispatch) requires doppler + DB; use npm run test:cloudbeds.
 *
 * Run: npx tsx tests/test-cloudbeds-guest-journey-handler.ts
 * Or: npm run test:cloudbeds-guest-journey
 */

import { computeGuestJourneyClassification } from "../server/tools/cloudbedsGuestJourneyClassification.ts";
import { handlePmsLookupGuestJourney } from "../server/tools/cloudbedsSwarmTools.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const today = new Date("2026-03-28T12:00:00Z");

  // ── computeGuestJourneyClassification (typed journey + summary) ─────────
  {
    const r0 = computeGuestJourneyClassification([], today);
    assert(r0.journey === "no_pms_match", "empty hits → no_pms_match");
    assert(
      r0.summary.includes("No guest profile matched"),
      "empty hits summary",
    );
  }

  {
    const r = computeGuestJourneyClassification(
      [{ status: "checked_in", startDate: "2026-03-27", endDate: "2026-03-30" }],
      today,
    );
    assert(r.journey === "in_house", "checked_in wins");
    assert(r.summary.includes("in-house"), "in_house summary");
  }

  {
    const r = computeGuestJourneyClassification(
      [
        {
          status: "confirmed",
          startDate: "2026-04-10",
          endDate: "2026-04-12",
        },
      ],
      today,
    );
    assert(r.journey === "upcoming_stay", "future confirmed");
  }

  {
    const r = computeGuestJourneyClassification(
      [
        {
          status: "checked_out",
          startDate: "2026-03-20",
          endDate: "2026-03-26",
        },
      ],
      today,
    );
    assert(r.journey === "recent_checkout", "checkout within ~45d");
  }

  {
    const r = computeGuestJourneyClassification(
      [
        {
          status: "checked_out",
          startDate: "2025-01-01",
          endDate: "2025-01-05",
        },
      ],
      today,
    );
    assert(r.journey === "past_guest", "old checkout → past_guest");
  }

  // Priority: checked_in beats upcoming on same synthetic list
  {
    const r = computeGuestJourneyClassification(
      [
        { status: "confirmed", startDate: "2026-04-10", endDate: "2026-04-12" },
        { status: "checked_in", startDate: "2026-03-27", endDate: "2026-03-30" },
      ],
      today,
    );
    assert(r.journey === "in_house", "checked_in priority");
  }

  // ── handlePmsLookupGuestJourney — identity / input failure modes (sync) ──
  {
    const a = await handlePmsLookupGuestJourney({});
    assert(
      typeof a === "object" && a !== null && "success" in a && (a as { success: boolean }).success === false,
      "missing site → failure",
    );
    assert(
      String((a as { error?: string }).error || "").includes("site"),
      "missing site message",
    );
  }

  {
    const b = await handlePmsLookupGuestJourney({
      _sessionSiteConfigId: "00000000-0000-0000-0000-000000000001",
    });
    assert(
      typeof b === "object" && b !== null && "success" in b && (b as { success: boolean }).success === false,
      "missing phone → failure",
    );
    assert(
      String((b as { error?: string }).error || "").includes("phone"),
      "missing phone message",
    );
  }

  console.log("test-cloudbeds-guest-journey-handler: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
