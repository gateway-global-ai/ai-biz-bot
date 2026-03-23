/**
 * Cloudbeds API routes — availability, OAuth, reservations.
 * Uses docs/knowledge-base/cloudbeds as single source of truth.
 * Credentials are per-site via site_pms_integrations; optional global CLOUDBEDS_CLIENT_* for OAuth + API key fallback.
 */

import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import type { SitePmsIntegration } from '@shared/schema';
import { sitePmsIntegrations } from '@shared/schema';
import { requireCustomerAuth } from '../customerAuth';
import { db } from '../db';
import { storage } from '../storage';
import {
  CLOUDBEDS_BASE,
  effectivePropertyId,
  exchangeAuthorizationCode,
  flattenPostReservationForm,
  loadCloudbedsPmsRow,
  oauthAuthorizeUrl,
  resolvePmsAuthHeaders,
  signOAuthState,
  verifyOAuthState,
} from '../services/cloudbedsApi';

const router = Router();
const BASE_URL = CLOUDBEDS_BASE;

export type CloudbedsAvailabilityArgs = {
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  rooms?: number;
};

/**
 * Fetch availability from Cloudbeds using a site_pms_integrations row.
 * Uses api_key (x-api-key), global CLOUDBEDS_CLIENT_API_KEY fallback, or OAuth Bearer (with refresh).
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
  const propertyId = effectivePropertyId(pmsRow);
  if (!propertyId) {
    return {
      success: false,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      error: 'Cloudbeds property ID missing (set site_pms_integrations.property_id or CLOUDBEDS_CLIENT_PROPERTY_ID).',
    };
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
  let headers: Record<string, string>;
  try {
    ({ headers } = await resolvePmsAuthHeaders(pmsRow));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Cloudbeds auth failed.';
    return { success: false, checkIn, checkOut, error: msg };
  }
  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(25_000),
  });

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
    const apiKey = process.env.CLOUDBEDS_CLIENT_API_KEY || process.env.CLOUDBEDS_API_KEY;
    const propertyId =
      (req.query.propertyId as string) ||
      process.env.CLOUDBEDS_CLIENT_PROPERTY_ID ||
      process.env.CLOUDBEDS_PROPERTY_ID;
    if (!apiKey || !propertyId) {
      return res.status(503).json({
        success: false,
        error:
          'Cloudbeds not configured (CLOUDBEDS_CLIENT_API_KEY / CLOUDBEDS_API_KEY or CLOUDBEDS_CLIENT_PROPERTY_ID / CLOUDBEDS_PROPERTY_ID missing).',
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

async function assertCustomerOwnsSite(req: Request, siteConfigId: string): Promise<boolean> {
  const session = (req as { customerSession?: { customerAccountId?: string } }).customerSession;
  if (!session?.customerAccountId) return false;
  const site = await storage.getSiteConfig(siteConfigId);
  return site?.ownerId === session.customerAccountId;
}

function forwardCloudbedsQuery(req: Request, exclude: Set<string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, raw] of Object.entries(req.query)) {
    if (exclude.has(k)) continue;
    if (Array.isArray(raw)) {
      for (const v of raw) {
        if (v !== undefined && v !== null) params.append(k, String(v));
      }
    } else if (raw !== undefined && raw !== null) {
      params.append(k, String(raw));
    }
  }
  return params;
}

/**
 * GET /api/cloudbeds/oauth/start?siteConfigId=
 * Customer session — redirects to Cloudbeds authorize (state is signed).
 */
router.get('/oauth/start', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const siteConfigId = typeof req.query.siteConfigId === 'string' ? req.query.siteConfigId : '';
    if (!siteConfigId) {
      return res.status(400).json({ error: 'siteConfigId is required.' });
    }
    const ok = await assertCustomerOwnsSite(req, siteConfigId);
    if (!ok) return res.status(403).json({ error: 'You do not have access to this site.' });

    const clientId = process.env.CLOUDBEDS_CLIENT_ID;
    const redirectUri = process.env.CLOUDBEDS_CLIENT_CALLBACK_URL;
    if (!clientId || !redirectUri) {
      return res.status(503).json({ error: 'CLOUDBEDS_CLIENT_ID and CLOUDBEDS_CLIENT_CALLBACK_URL must be set.' });
    }

    const state = signOAuthState(siteConfigId);
    const u = new URL(oauthAuthorizeUrl());
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('state', state);
    res.redirect(302, u.toString());
  } catch (e: unknown) {
    console.error('[Cloudbeds] oauth/start:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'OAuth start failed.' });
  }
});

/**
 * GET /api/cloudbeds/oauth/callback
 * Public — exchanges code for tokens and stores on site_pms_integrations (state is HMAC-signed).
 * Do not log full URL (contains authorization code).
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !stateRaw) {
      return res.status(400).json({ error: 'Missing code or state.' });
    }
    const siteConfigId = verifyOAuthState(stateRaw);
    if (!siteConfigId) {
      return res.status(400).json({ error: 'Invalid or expired OAuth state.' });
    }

    const tokens = await exchangeAuthorizationCode(code);
    const expiresAt =
      tokens.expires_in != null ? new Date(Date.now() + tokens.expires_in * 1000) : null;

    const existing = await loadCloudbedsPmsRow(siteConfigId);
    if (existing) {
      await db
        .update(sitePmsIntegrations)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existing.refreshToken,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(sitePmsIntegrations.id, existing.id));
    } else {
      await db.insert(sitePmsIntegrations).values({
        siteConfigId,
        pmsType: 'cloudbeds',
        propertyId: null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        isActive: true,
        config: {},
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Cloudbeds OAuth tokens saved. Set property_id on the PMS row if not already set.',
      siteConfigId,
    });
  } catch (e: unknown) {
    console.error('[Cloudbeds] oauth/callback:', e instanceof Error ? e.message : e);
    return res.status(502).json({
      ok: false,
      error: e instanceof Error ? e.message : 'Token exchange failed.',
    });
  }
});

/**
 * GET /api/cloudbeds/reservations?siteConfigId=... (forwards to Cloudbeds getReservations)
 */
router.get('/reservations', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const siteConfigId = typeof req.query.siteConfigId === 'string' ? req.query.siteConfigId : '';
    if (!siteConfigId) return res.status(400).json({ error: 'siteConfigId is required.' });
    if (!(await assertCustomerOwnsSite(req, siteConfigId))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const pms = await loadCloudbedsPmsRow(siteConfigId);
    if (!pms) return res.status(404).json({ error: 'No Cloudbeds integration for this site.' });

    const { headers } = await resolvePmsAuthHeaders(pms);
    const params = forwardCloudbedsQuery(req, new Set(['siteConfigId']));
    const prop = effectivePropertyId(pms);
    if (!params.has('propertyID') && prop) {
      params.set('propertyID', prop);
    }

    const url = `${BASE_URL}/getReservations?${params.toString()}`;
    const r = await fetch(url, { method: 'GET', headers });
    const text = await r.text();
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return res.status(r.status).send(text.slice(0, 2000));
    }
    return res.status(r.status).json(JSON.parse(text));
  } catch (e: unknown) {
    console.error('[Cloudbeds] getReservations:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Request failed.' });
  }
});

/**
 * GET /api/cloudbeds/reservation?siteConfigId=&reservationID=
 */
router.get('/reservation', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const siteConfigId = typeof req.query.siteConfigId === 'string' ? req.query.siteConfigId : '';
    if (!siteConfigId) return res.status(400).json({ error: 'siteConfigId is required.' });
    if (!(await assertCustomerOwnsSite(req, siteConfigId))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const pms = await loadCloudbedsPmsRow(siteConfigId);
    if (!pms) return res.status(404).json({ error: 'No Cloudbeds integration for this site.' });

    const { headers } = await resolvePmsAuthHeaders(pms);
    const params = forwardCloudbedsQuery(req, new Set(['siteConfigId']));
    const prop = effectivePropertyId(pms);
    if (!params.has('propertyID') && prop) {
      params.set('propertyID', prop);
    }
    if (!params.has('reservationID')) {
      return res.status(400).json({ error: 'reservationID is required.' });
    }

    const url = `${BASE_URL}/getReservation?${params.toString()}`;
    const r = await fetch(url, { method: 'GET', headers });
    const text = await r.text();
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return res.status(r.status).send(text.slice(0, 2000));
    }
    return res.status(r.status).json(JSON.parse(text));
  } catch (e: unknown) {
    console.error('[Cloudbeds] getReservation:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Request failed.' });
  }
});

/**
 * POST /api/cloudbeds/reservations — body: { siteConfigId, ...postReservation fields }
 */
router.post('/reservations', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown> & { siteConfigId?: string };
    const siteConfigId = typeof body.siteConfigId === 'string' ? body.siteConfigId : '';
    if (!siteConfigId) return res.status(400).json({ error: 'siteConfigId is required in body.' });
    if (!(await assertCustomerOwnsSite(req, siteConfigId))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const pms = await loadCloudbedsPmsRow(siteConfigId);
    if (!pms) return res.status(404).json({ error: 'No Cloudbeds integration for this site.' });

    const { headers } = await resolvePmsAuthHeaders(pms);
    const payload: Record<string, unknown> = { ...body };
    delete payload.siteConfigId;
    const prop = effectivePropertyId(pms);
    if (!payload.propertyID && prop) {
      payload.propertyID = prop;
    }
    if (payload.sendEmailConfirmation === undefined) {
      payload.sendEmailConfirmation = true;
    }

    const form = flattenPostReservationForm(payload);
    const url = `${BASE_URL}/postReservation`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const text = await r.text();
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return res.status(r.status).send(text.slice(0, 2000));
    }
    return res.status(r.status).json(JSON.parse(text));
  } catch (e: unknown) {
    console.error('[Cloudbeds] postReservation:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Request failed.' });
  }
});

export default router;
