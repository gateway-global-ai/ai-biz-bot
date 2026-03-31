/**
 * Signed HttpOnly cookie for operator integration-connect lane (SMS deep-link exchange).
 * Uses INTEGRATION_CONNECT_SESSION_SECRET when set, else INTEGRATION_CONNECT_TOKEN_SECRET.
 */
import crypto from "crypto";
import type { Response } from "express";

export const INTEGRATION_CONNECT_SESSION_COOKIE = "integration_connect_sess";

const MAX_AGE_MS = 60 * 60 * 1000;

function sessionSigningSecret(): string {
  const s =
    process.env.INTEGRATION_CONNECT_SESSION_SECRET?.trim() ||
    process.env.INTEGRATION_CONNECT_TOKEN_SECRET?.trim();
  if (!s) {
    throw new Error(
      "INTEGRATION_CONNECT_SESSION_SECRET or INTEGRATION_CONNECT_TOKEN_SECRET is required for integration connect sessions",
    );
  }
  return s;
}

export type IntegrationConnectSessionPayload = {
  siteConfigId: string;
  vendorId: string;
  exp: number;
};

export function createIntegrationConnectSessionPayload(
  siteConfigId: string,
  vendorId: string,
): IntegrationConnectSessionPayload {
  return { siteConfigId, vendorId, exp: Date.now() + MAX_AGE_MS };
}

export function signIntegrationConnectSession(payload: IntegrationConnectSessionPayload): string {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", sessionSigningSecret()).update(body).digest("hex");
  return `${Buffer.from(body, "utf8").toString("base64url")}.${sig}`;
}

export function verifyIntegrationConnectSession(
  cookieValue: string | undefined,
): IntegrationConnectSessionPayload | null {
  try {
    if (!cookieValue?.trim()) return null;
    const parts = cookieValue.split(".");
    if (parts.length !== 2) return null;
    const [b64, sig] = parts;
    if (!b64 || !sig) return null;
    const body = Buffer.from(b64, "base64url").toString("utf8");
    const expected = crypto.createHmac("sha256", sessionSigningSecret()).update(body).digest("hex");
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
    ) {
      return null;
    }
    const payload = JSON.parse(body) as IntegrationConnectSessionPayload;
    if (
      typeof payload.exp !== "number" ||
      typeof payload.siteConfigId !== "string" ||
      typeof payload.vendorId !== "string"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookieFromRequest(req: { headers: { cookie?: string } }, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

type SetCookieOpts = { maxAgeSec: number; httpOnly?: boolean };

export function appendSetCookie(res: Response, name: string, value: string, opts: SetCookieOpts): void {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${opts.maxAgeSec}`];
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  parts.push("SameSite=Lax");
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

export function clearCookieByName(res: Response, name: string): void {
  const parts = [`${name}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

export function setIntegrationConnectSessionCookie(
  res: Response,
  payload: IntegrationConnectSessionPayload,
): void {
  const token = signIntegrationConnectSession(payload);
  appendSetCookie(res, INTEGRATION_CONNECT_SESSION_COOKIE, token, {
    maxAgeSec: Math.floor(MAX_AGE_MS / 1000),
    httpOnly: true,
  });
}
