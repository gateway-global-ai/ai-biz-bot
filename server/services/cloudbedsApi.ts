/**
 * Cloudbeds API v1.3 — OAuth token exchange, auth headers, and reservation helpers.
 * Env: CLOUDBEDS_API_BASE_URL, CLOUDBEDS_CLIENT_ID, CLOUDBEDS_CLIENT_SECRET,
 * CLOUDBEDS_CLIENT_CALLBACK_URL, CLOUDBEDS_CLIENT_API_KEY (optional, cbat), CLOUDBEDS_API_KEY (legacy alias),
 * CLOUDBEDS_CLIENT_PROPERTY_ID (fallback when site_pms_integrations.property_id is null), CLOUDBEDS_PROPERTY_ID (legacy).
 */

import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import type { SitePmsIntegration } from "@shared/schema";
import { db } from "../db";
import { sitePmsIntegrations } from "@shared/schema";

export const CLOUDBEDS_BASE =
  process.env.CLOUDBEDS_API_BASE_URL?.replace(/\/$/, "") || "https://api.cloudbeds.com/api/v1.3";

export function accessTokenUrl(): string {
  return `${CLOUDBEDS_BASE}/access_token`;
}

export function oauthAuthorizeUrl(): string {
  return process.env.CLOUDBEDS_OAUTH_AUTHORIZE_URL || `${CLOUDBEDS_BASE}/oauth/authorize`;
}

/** Signed opaque state for OAuth (callback is unauthenticated). */
export function signOAuthState(siteConfigId: string): string {
  const secret = process.env.CLOUDBEDS_CLIENT_SECRET;
  if (!secret) throw new Error("CLOUDBEDS_CLIENT_SECRET is required for OAuth state signing");
  const ts = Date.now();
  const base = `${siteConfigId}|${ts}`;
  const sig = crypto.createHmac("sha256", secret).update(base).digest("hex").slice(0, 32);
  return `${Buffer.from(base, "utf8").toString("base64url")}.${sig}`;
}

export function verifyOAuthState(state: string): string | null {
  const secret = process.env.CLOUDBEDS_CLIENT_SECRET;
  if (!secret) return null;
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  if (!b64 || !sig) return null;
  let base: string;
  try {
    base = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", secret).update(base).digest("hex").slice(0, 32);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) return null;
  const pipe = base.indexOf("|");
  if (pipe < 0) return null;
  const siteConfigId = base.slice(0, pipe);
  const ts = parseInt(base.slice(pipe + 1), 10);
  if (!Number.isFinite(ts) || Date.now() - ts > 15 * 60_000) return null;
  return siteConfigId;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function exchangeAuthorizationCode(code: string): Promise<TokenResponse> {
  const clientId = process.env.CLOUDBEDS_CLIENT_ID;
  const clientSecret = process.env.CLOUDBEDS_CLIENT_SECRET;
  const redirectUri = process.env.CLOUDBEDS_CLIENT_CALLBACK_URL;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("CLOUDBEDS_CLIENT_ID, CLOUDBEDS_CLIENT_SECRET, CLOUDBEDS_CLIENT_CALLBACK_URL required");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(accessTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cloudbeds token exchange failed: ${res.status} ${text.slice(0, 500)}`);
  }
  const data = JSON.parse(text) as TokenResponse & { error?: string };
  if (data.error || !data.access_token) {
    throw new Error(`Cloudbeds token response invalid: ${text.slice(0, 300)}`);
  }
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.CLOUDBEDS_CLIENT_ID;
  const clientSecret = process.env.CLOUDBEDS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("CLOUDBEDS_CLIENT_ID and CLOUDBEDS_CLIENT_SECRET required for refresh");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(accessTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cloudbeds refresh failed: ${res.status} ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as TokenResponse;
}

function globalApiKey(): string | undefined {
  return process.env.CLOUDBEDS_CLIENT_API_KEY || process.env.CLOUDBEDS_API_KEY;
}

/** Property ID: per-site row first, then Doppler global (single-property integrations). */
export function effectivePropertyId(pmsRow: SitePmsIntegration): string | undefined {
  const fromRow = pmsRow.propertyId?.trim();
  if (fromRow) return fromRow;
  return (
    process.env.CLOUDBEDS_CLIENT_PROPERTY_ID?.trim() ||
    process.env.CLOUDBEDS_PROPERTY_ID?.trim() ||
    undefined
  );
}

/**
 * Returns headers for Cloudbeds API calls; refreshes OAuth access token when near expiry.
 */
export async function resolvePmsAuthHeaders(row: SitePmsIntegration): Promise<{
  headers: Record<string, string>;
  updatedRow: SitePmsIntegration;
}> {
  let current = row;

  if (current.accessToken && current.refreshToken && current.tokenExpiresAt) {
    const exp = new Date(current.tokenExpiresAt).getTime();
    if (exp < Date.now() + 60_000) {
      const tok = await refreshAccessToken(current.refreshToken);
      const expiresAt =
        tok.expires_in != null ? new Date(Date.now() + tok.expires_in * 1000) : null;
      await db
        .update(sitePmsIntegrations)
        .set({
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token ?? current.refreshToken,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(sitePmsIntegrations.id, current.id));
      const [fresh] = await db
        .select()
        .from(sitePmsIntegrations)
        .where(eq(sitePmsIntegrations.id, current.id))
        .limit(1);
      if (fresh) current = fresh;
    }
    return {
      headers: {
        Authorization: `Bearer ${current.accessToken}`,
        Accept: "application/json",
      },
      updatedRow: current,
    };
  }

  if (current.accessToken) {
    return {
      headers: {
        Authorization: `Bearer ${current.accessToken}`,
        Accept: "application/json",
      },
      updatedRow: current,
    };
  }

  const apiKey = current.apiKey || globalApiKey();
  if (!apiKey) {
    throw new Error("No Cloudbeds API key or OAuth token for this site.");
  }
  return {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
    updatedRow: current,
  };
}

export async function loadCloudbedsPmsRow(siteConfigId: string): Promise<SitePmsIntegration | undefined> {
  const [row] = await db
    .select()
    .from(sitePmsIntegrations)
    .where(
      and(eq(sitePmsIntegrations.siteConfigId, siteConfigId), eq(sitePmsIntegrations.pmsType, "cloudbeds")),
    )
    .limit(1);
  return row;
}

/**
 * GET JSON from Cloudbeds v1.3 (method path without leading slash, e.g. getReservations).
 */
export async function cloudbedsGetJson(
  pmsRow: SitePmsIntegration,
  methodPath: string,
  query: Record<string, string | number | boolean | undefined>,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const { headers } = await resolvePmsAuthHeaders(pmsRow);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const path = methodPath.replace(/^\//, "");
  const url = `${CLOUDBEDS_BASE}/${path}?${params}`;
  const res = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { parseError: true, snippet: text.slice(0, 400) };
  }
  return { ok: res.ok, status: res.status, json };
}

/** Flatten postReservation JSON into application/x-www-form-urlencoded (nested arrays). */
export function flattenPostReservationForm(data: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          for (const [ik, iv] of Object.entries(item as Record<string, unknown>)) {
            if (iv !== undefined && iv !== null) {
              params.append(`${key}[${i}][${ik}]`, String(iv));
            }
          }
        }
      });
    } else {
      params.append(key, String(value));
    }
  }
  return params;
}
