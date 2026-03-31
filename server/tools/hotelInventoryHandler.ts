/**
 * get_hotel_inventory — Live room availability and rates.
 * If the site has a Cloudbeds PMS integration, uses Cloudbeds; otherwise GRN for platform-linked hotels.
 */

import { integrationBlockToSafeMessage } from "@shared/integrationExecution";
import { db } from "../db";
import { b2bHotels, platformBusinessMap, siteConfigs, sitePmsIntegrations } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { fetchCloudbedsAvailability } from "../routes/cloudbedsRoutes";
import { getGrnAvailability, toGrnApiCode } from "../mcp-hotels-logic";
import { getExecutionContext } from "../services/integrationCredentialBroker";

export async function handleGetHotelInventory(args: {
  platformId?: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  roomFilter?: string;
  _sessionSiteConfigId?: string;
}): Promise<unknown> {
  const siteConfigId =
    args._sessionSiteConfigId ?? (args as { siteConfigId?: string }).siteConfigId;

  // PMS fork: if this site has an active Cloudbeds integration, use it (no platformId required).
  if (siteConfigId) {
    const [pmsRow] = await db
      .select()
      .from(sitePmsIntegrations)
      .where(
        and(
          eq(sitePmsIntegrations.siteConfigId, siteConfigId),
          eq(sitePmsIntegrations.pmsType, "cloudbeds"),
          eq(sitePmsIntegrations.isActive, true)
        )
      );
    if (pmsRow) {
      const exec = await getExecutionContext({
        siteConfigId,
        vendorId: "cloudbeds",
        capabilityId: "cb_inventory_quote",
      });
      if (!exec.ok) {
        return {
          success: false,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          error: integrationBlockToSafeMessage(exec.block),
          integrationBlockCode: exec.block.code,
        };
      }
      const result = await fetchCloudbedsAvailability(
        exec.pmsRow,
        {
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          adults: args.guests ?? 2,
          children: 0,
          rooms: 1,
        },
        { authHeaders: exec.headers },
      );
      if (result.success && result.rooms && args.roomFilter) {
        const roomFilterLower = args.roomFilter.toLowerCase();
        result.rooms = result.rooms.map((r) => ({
          ...r,
          pinned: (r.roomType ?? "").toLowerCase().includes(roomFilterLower),
        }));
        result.rooms.sort(
          (a, b) =>
            (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.netPrice ?? 999) - (b.netPrice ?? 999)
        );
      }
      return result;
    }
  }

  // GRN path: resolve platformId and fetch via GRN.
  let platformId = args.platformId;
  if (!platformId && siteConfigId) {
    const [map] = await db
      .select()
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.siteConfigId, siteConfigId));
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
