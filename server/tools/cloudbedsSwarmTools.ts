/**
 * Hospitality swarm — Cloudbeds PMS tools (v1.3 OpenAPI).
 * Guest journey uses getReservations + guest-detail fields; phone match is best-effort on API shape.
 */

import {
  cloudbedsGetJson,
  effectivePropertyId,
  loadCloudbedsPmsRow,
} from "../services/cloudbedsApi";
import {
  getVerificationSkillsFromSiteConfig,
  hasRecentGuestVerification,
  loadSiteConfigRow,
  siteRequiresOtpForGuestPmsLookup,
} from "../services/novaGuestVerification";
import { normalizePhoneE164, phoneDigitsMatch } from "../utils/phoneNormalize";
import { computeGuestJourneyClassification } from "./cloudbedsGuestJourneyClassification";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Pull phone-like strings from nested guest / reservation objects. */
function collectPhonesFromUnknown(obj: unknown): string[] {
  const found: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 14 || v == null) return;
    if (typeof v === "string") {
      const d = v.replace(/\D/g, "");
      if (d.length >= 10) found.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
      return;
    }
    if (typeof v === "object") {
      for (const val of Object.values(v as object)) walk(val, depth + 1);
    }
  };
  walk(obj, 0);
  return found;
}

export type { GuestJourneyKind } from "./cloudbedsGuestJourneyClassification";

export async function handlePmsLookupGuestJourney(args: {
  phone?: string;
  _sessionSiteConfigId?: string;
}): Promise<unknown> {
  const siteId = args._sessionSiteConfigId;
  if (!siteId) return { success: false, error: "Missing site session (siteConfigId)." };
  const phoneRaw = args.phone?.trim();
  if (!phoneRaw) return { success: false, error: "phone is required" };
  const target = normalizePhoneE164(phoneRaw);

  const siteRow = await loadSiteConfigRow(siteId);
  if (siteRow) {
    const skills = getVerificationSkillsFromSiteConfig(siteRow.metadata);
    if (siteRequiresOtpForGuestPmsLookup(skills)) {
      const ok = await hasRecentGuestVerification(siteId, phoneRaw);
      if (!ok) {
        return {
          success: false,
          error:
            "Guest phone must be verified (OTP) before PMS lookup when verification skills are active. Use guest_phone_verification first.",
          requiresVerification: true,
        };
      }
    }
  }

  const pms = await loadCloudbedsPmsRow(siteId);
  if (!pms?.isActive) {
    return { success: false, error: "No active Cloudbeds integration for this property." };
  }
  const propertyID = effectivePropertyId(pms);
  if (!propertyID) {
    return { success: false, error: "Cloudbeds property ID is not set for this site." };
  }

  const checkInFrom = addYears(todayISODate(), -1);
  const checkInTo = addYears(todayISODate(), 1);

  const { ok, status, json } = await cloudbedsGetJson(
    pms,
    "getReservations",
    {
      propertyID,
      includeGuestsDetails: true,
      checkInFrom,
      checkInTo,
      pageSize: 100,
      pageNumber: 1,
    },
    { capabilityId: "cb_guest_journey_lookup" },
  );

  if (!ok) {
    return {
      success: false,
      error: `Cloudbeds getReservations failed (${status}).`,
      detail: typeof json === "object" && json && "message" in json ? (json as { message?: string }).message : undefined,
    };
  }

  const data = json as { data?: unknown[]; success?: boolean };
  const rows = Array.isArray(data.data) ? data.data : [];

  type Hit = {
    reservationId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    guestName?: string;
    roomName?: string;
  };

  const hits: Hit[] = [];

  for (const row of rows) {
    const phones = collectPhonesFromUnknown(row);
    const match = phones.some((p) => phoneDigitsMatch(p, target));
    if (!match) continue;

    const r = row as Record<string, unknown>;
    const guestFirst =
      (r.guestFirstName as string) || (r.customerFirstName as string) || (r.firstName as string) || "";
    const guestLast =
      (r.guestLastName as string) || (r.customerLastName as string) || (r.guestName as string) || "";
    const guestName = [guestFirst, guestLast].filter(Boolean).join(" ").trim() || (r.guestName as string) || "";

    hits.push({
      reservationId: (r.reservationID as string) || (r.reservationId as string),
      status: String(r.status || r.reservationStatus || ""),
      startDate: (r.startDate as string) || (r.checkInDate as string),
      endDate: (r.endDate as string) || (r.checkOutDate as string),
      guestName,
      roomName: (r.roomName as string) || (r.assignedRoomName as string),
    });
  }

  const today = new Date(todayISODate() + "T12:00:00");
  const { journey, summary } = computeGuestJourneyClassification(hits, today);

  return {
    success: true,
    journey,
    summary,
    matchCount: hits.length,
    reservations: hits.slice(0, 8),
    privacyNote:
      "For sensitive folio or payment details, keep the guest on OTP-verified flows and follow property policy.",
  };
}

export async function handlePmsGetHousekeepingStatus(args: {
  _sessionSiteConfigId?: string;
  roomCondition?: "clean" | "dirty";
  pageSize?: number;
}): Promise<unknown> {
  const siteId = args._sessionSiteConfigId;
  if (!siteId) return { success: false, error: "Missing site session (siteConfigId)." };
  const pms = await loadCloudbedsPmsRow(siteId);
  if (!pms?.isActive) return { success: false, error: "No active Cloudbeds integration." };
  const propertyID = effectivePropertyId(pms);
  if (!propertyID) return { success: false, error: "Property ID missing." };

  const q: Record<string, string | number | boolean | undefined> = {
    propertyID,
    pageNumber: 1,
    pageSize: Math.min(args.pageSize ?? 100, 5000),
  };
  if (args.roomCondition) q.roomCondition = args.roomCondition;

  const { ok, status, json } = await cloudbedsGetJson(pms, "getHousekeepingStatus", q, {
    capabilityId: "cb_housekeeping_status",
  });
  if (!ok) {
    return { success: false, error: `getHousekeepingStatus failed (${status})`, raw: json };
  }
  return { success: true, data: json };
}

export async function handlePmsGetHotelDashboard(args: {
  _sessionSiteConfigId?: string;
  date?: string;
}): Promise<unknown> {
  const siteId = args._sessionSiteConfigId;
  if (!siteId) return { success: false, error: "Missing site session (siteConfigId)." };
  const pms = await loadCloudbedsPmsRow(siteId);
  if (!pms?.isActive) return { success: false, error: "No active Cloudbeds integration." };
  const propertyID = effectivePropertyId(pms);
  if (!propertyID) return { success: false, error: "Property ID missing." };

  const { ok, status, json } = await cloudbedsGetJson(
    pms,
    "getDashboard",
    {
      propertyID,
      date: args.date || todayISODate(),
    },
    { capabilityId: "cb_hotel_dashboard" },
  );
  if (!ok) {
    return { success: false, error: `getDashboard failed (${status})`, raw: json };
  }
  return { success: true, data: json };
}
