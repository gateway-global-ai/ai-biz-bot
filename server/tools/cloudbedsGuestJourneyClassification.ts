/**
 * Pure guest-journey classification from reservation hits (testable without Cloudbeds HTTP).
 * @see server/tools/cloudbedsSwarmTools.ts — handlePmsLookupGuestJourney
 */

export type GuestJourneyKind =
  | "in_house"
  | "upcoming_stay"
  | "recent_checkout"
  | "past_guest"
  | "no_pms_match";

export type GuestJourneyHit = {
  reservationId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  guestName?: string;
  roomName?: string;
};

/**
 * Classify journey from normalized reservation hits (phone match already applied).
 */
export function computeGuestJourneyClassification(
  hits: GuestJourneyHit[],
  today: Date,
): { journey: GuestJourneyKind; summary: string } {
  let journey: GuestJourneyKind = "no_pms_match";
  let summary = "No guest profile matched this phone in Cloudbeds for the search window.";

  if (hits.length === 0) {
    return { journey, summary };
  }

  const st = (s: string) => (s || "").toLowerCase();

  if (hits.some((h) => st(h.status || "") === "checked_in")) {
    journey = "in_house";
    summary = "Guest has an in-house (checked-in) reservation matching this phone.";
  } else if (
    hits.some((h) => {
      const sd = h.startDate ? new Date(h.startDate) : null;
      return (
        !!sd &&
        sd > today &&
        /confirmed|not_confirmed/i.test(h.status || "")
      );
    })
  ) {
    journey = "upcoming_stay";
    summary = "Guest has a future reservation matching this phone.";
  } else if (
    hits.some((h) => {
      if (st(h.status || "") !== "checked_out") return false;
      const ed = h.endDate ? new Date(h.endDate) : null;
      if (!ed) return false;
      const days = (today.getTime() - ed.getTime()) / 86400000;
      return days >= 0 && days <= 45;
    })
  ) {
    journey = "recent_checkout";
    summary = "Guest recently checked out (within the last ~45 days).";
  } else {
    journey = "past_guest";
    summary = "A historical or non-active reservation matches this phone.";
  }

  return { journey, summary };
}
