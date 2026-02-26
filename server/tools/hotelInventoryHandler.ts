/**
 * get_hotel_inventory — Live GRN room availability and rates for a platform-linked hotel.
 * Resolves platformId from session anchor, fetches GRN rates, overlays sovereign intelligence from siteConfigs.knowledgeLibrary.
 */

import { db } from "../db";
import { b2bHotels, platformBusinessMap, siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getGrnAvailability, toGrnApiCode } from "../mcp-hotels-logic";

export async function handleGetHotelInventory(args: {
  platformId?: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  roomFilter?: string;
  _sessionSiteConfigId?: string;
}): Promise<unknown> {
  let platformId = args.platformId;
  if (!platformId && args._sessionSiteConfigId) {
    const [map] = await db
      .select()
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.siteConfigId, args._sessionSiteConfigId));
    platformId = map?.platformId ?? undefined;
  }
  if (!platformId) {
    return { success: false, error: "Sovereign Link Missing: no platform ID resolved." };
  }

  const [hotel] = await db
    .select()
    .from(b2bHotels)
    .where(eq(b2bHotels.platformId, platformId));
  if (!hotel?.hotelCode) {
    return {
      success: false,
      error:
        "GRN hotel code not yet linked to this platform. Ask the owner to complete hotel onboarding.",
    };
  }

  const apiCode = toGrnApiCode(hotel.hotelCode);
  if (!apiCode) {
    return { success: false, error: "Invalid GRN hotel code." };
  }

  const availability = await getGrnAvailability(
    [apiCode],
    args.checkIn,
    args.checkOut,
    [{ adults: args.guests ?? 2 }],
    { currency: "USD" }
  );

  const liveHotel = (availability as any)?.hotels?.[0];
  const rates: any[] = liveHotel?.rates ?? [];

  const roomFilterLower = args.roomFilter?.toLowerCase();
  const filtered = roomFilterLower
    ? rates.filter((r: any) => (r.room_type ?? "").toLowerCase().includes(roomFilterLower))
    : rates;

  const [siteMap] = await db
    .select()
    .from(platformBusinessMap)
    .where(eq(platformBusinessMap.platformId, platformId));
  let site = null;
  if (siteMap?.siteConfigId) {
    const [s] = await db
      .select()
      .from(siteConfigs)
      .where(eq(siteConfigs.id, siteMap.siteConfigId));
    site = s;
  }
  const knowledge = (site?.knowledgeLibrary as Record<string, unknown>) ?? {};
  const sovereignRooms = (knowledge.sovereignRooms as Record<string, string>) ?? {};

  const rooms = filtered.map((r: any) => {
    const roomType = r.room_type ?? "Standard Room";
    const pinned = !!(
      roomFilterLower && (roomType as string).toLowerCase().includes(roomFilterLower)
    );
    return {
      roomType,
      netPrice: r.net_price,
      currency: r.currency ?? "USD",
      boardType: r.board_type,
      ratePlanCode: r.rate_plan_code,
      sovereignName: sovereignRooms[roomType] ?? roomType,
      mattressType: knowledge.mattressType ?? null,
      proTip: knowledge.proTip ?? null,
      staffNote: knowledge.staffNote ?? null,
      pinned,
    };
  });

  rooms.sort(
    (a: any, b: any) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.netPrice ?? 999) - (b.netPrice ?? 999)
  );

  return {
    success: true,
    hotelName: hotel.name ?? "Your Hotel",
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    platformId,
    totalAvailable: rooms.length,
    rooms,
    uiComponent: "HOTEL_INVENTORY_GRID",
    bookingUrl: knowledge.bookingUrl ?? null,
  };
}
