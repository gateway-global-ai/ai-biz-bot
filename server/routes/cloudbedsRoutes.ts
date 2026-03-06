/**
 * Cloudbeds API routes — availability and (later) booking.
 * Uses docs/knowledge-base/cloudbeds as single source of truth.
 * Credentials are per-site via site_pms_integrations; no global CLOUDBEDS_* required for handler path.
 */

import { Router, type Request, type Response } from 'express';
import type { SitePmsIntegration } from '@shared/schema';

const router = Router();
const BASE_URL = process.env.CLOUDBEDS_API_BASE_URL || 'https://api.cloudbeds.com/api/v1.3';

export type CloudbedsAvailabilityArgs = {
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  rooms?: number;
};

/**
 * Fetch availability from Cloudbeds using a site_pms_integrations row.
 * Uses api_key (x-api-key) or access_token (Bearer); never reads env for credentials.
 */
export async function fetchCloudbedsAvailability(
  pmsRow: SitePmsIntegration,
  args: CloudbedsAvailabilityArgs
): Promise<{
  success: boolean;
  hotelName?: string;
  checkIn: string;
  checkOut: string;
  platformId?: string | null;
  totalAvailable?: number;
  rooms?: Array<{
    roomType: string;
    netPrice: number;
    currency: string;
    sovereignName?: string;
    ratePlanCode?: string | null;
    pinned?: boolean;
  }>;
  uiComponent?: string;
  bookingUrl?: string | null;
  error?: string;
}> {
  const propertyId = pmsRow.propertyId;
  if (!propertyId) {
    return { success: false, checkIn: args.checkIn, checkOut: args.checkOut, error: 'Cloudbeds property ID missing.' };
  }

  if (!pmsRow.apiKey && !pmsRow.accessToken) {
    return { success: false, checkIn: args.checkIn, checkOut: args.checkOut, error: 'Cloudbeds credentials missing (api_key or access_token).' };
  }

  const checkIn = args.checkIn || new Date().toISOString().slice(0, 10);
  const checkOut =
    args.checkOut ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
  const adults = args.adults ?? 2;
  const children = args.children ?? 0;
  const rooms = args.rooms ?? 1;

  const params = new URLSearchParams({
    propertyIDs: propertyId,
    startDate: checkIn,
    endDate: checkOut,
    rooms: String(rooms),
    adults: String(adults),
    children: String(children),
    detailedRates: 'true',
  });
  const url = `${BASE_URL}/getAvailableRoomTypes?${params}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(pmsRow.apiKey
      ? { 'x-api-key': pmsRow.apiKey }
      : pmsRow.accessToken
        ? { Authorization: `Bearer ${pmsRow.accessToken}` }
        : {}),
  };
  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    const text = await response.text();
    return {
      success: false,
      checkIn,
      checkOut,
      error: `Cloudbeds API error: ${response.status} ${text.slice(0, 200)}`,
    };
  }

  const data = await response.json();
  const raw = Array.isArray(data.data) ? data.data[0] : data.data;
  const propertyRooms = raw?.propertyRooms ?? [];

  const roomList = propertyRooms.map((r: any) => ({
    roomType: r.roomTypeName ?? r.roomTypeID ?? 'Room',
    netPrice: r.roomRate ?? 0,
    currency: 'USD',
    sovereignName: r.roomTypeName ?? r.roomTypeID ?? 'Room',
    ratePlanCode: r.roomRateID ?? null,
    pinned: false,
  }));

  return {
    success: true,
    hotelName: raw?.propertyName ?? 'Hotel',
    checkIn,
    checkOut,
    platformId: null,
    totalAvailable: roomList.length,
    rooms: roomList,
    uiComponent: 'HOTEL_INVENTORY_GRID',
    bookingUrl: pmsRow.bookingEngineUrl ?? null,
  };
}

/**
 * GET /api/cloudbeds/availability
 * Query: propertyId (optional if env CLOUDBEDS_PROPERTY_ID), checkIn, checkOut, adults, children, rooms.
 * Uses env CLOUDBEDS_API_KEY when no site-specific row is provided (backward compat).
 */
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const propertyId = (req.query.propertyId as string) || process.env.CLOUDBEDS_PROPERTY_ID;
    if (!apiKey || !propertyId) {
      return res.status(503).json({
        success: false,
        error: 'Cloudbeds not configured (CLOUDBEDS_API_KEY or CLOUDBEDS_PROPERTY_ID missing).',
      });
    }
    const checkIn = (req.query.checkIn as string) || new Date().toISOString().slice(0, 10);
    const checkOut =
      (req.query.checkOut as string) ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })();
    const adults = req.query.adults ? parseInt(req.query.adults as string, 10) : 2;
    const children = req.query.children ? parseInt(req.query.children as string, 10) : 0;
    const rooms = req.query.rooms ? parseInt(req.query.rooms as string, 10) : 1;

    const params = new URLSearchParams({
      propertyIDs: propertyId,
      startDate: checkIn,
      endDate: checkOut,
      rooms: String(rooms),
      adults: String(adults),
      children: String(children),
      detailedRates: 'true',
    });
    const url = `${BASE_URL}/getAvailableRoomTypes?${params}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Cloudbeds API error: ${response.status} ${text.slice(0, 200)}`,
      });
    }

    const data = await response.json();
    const raw = Array.isArray(data.data) ? data.data[0] : data.data;
    const propertyRooms = raw?.propertyRooms ?? [];

    const roomList = propertyRooms.map((r: any) => ({
      roomType: r.roomTypeName ?? r.roomTypeID ?? 'Room',
      netPrice: r.roomRate ?? 0,
      currency: 'USD',
      sovereignName: r.roomTypeName ?? r.roomTypeID ?? 'Room',
      ratePlanCode: r.roomRateID ?? null,
      pinned: false,
    }));

    return res.json({
      success: true,
      hotelName: raw?.propertyName ?? 'Hotel',
      checkIn,
      checkOut,
      platformId: null,
      totalAvailable: roomList.length,
      rooms: roomList,
      uiComponent: 'HOTEL_INVENTORY_GRID',
      bookingUrl: process.env.CLOUDBEDS_BOOKING_ENGINE_URL ?? null,
    });
  } catch (e: any) {
    console.error('[Cloudbeds] availability error:', e?.message ?? e);
    return res.status(500).json({
      success: false,
      error: e?.message ?? 'Failed to fetch Cloudbeds availability.',
    });
  }
});

export default router;
