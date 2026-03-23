/**
 * Client fingerprint for transparency logs — peppered hash, no raw IP stored.
 * IPv6 normalized to RFC 5952 via ipaddr.js; IPv4-mapped IPv6 collapsed to IPv4.
 */

import crypto from "crypto";
import type { Request } from "express";
import type { IncomingMessage } from "http";
import ipaddr from "ipaddr.js";

function getPepper(): string {
  return process.env.CLIENT_FINGERPRINT_PEPPER?.trim() || "";
}

/** Normalize IPv4 / IPv6 for stable hashing. */
export function normalizeIpForFingerprint(raw: string): string {
  const t = raw.trim();
  if (!t) return "0";
  try {
    if (!ipaddr.isValid(t)) return t;
    const addr = ipaddr.parse(t);
    if (addr.kind() === "ipv4") return addr.toNormalizedString();
    if (addr instanceof ipaddr.IPv6) {
      if (addr.isIPv4MappedAddress()) return addr.toIPv4Address().toNormalizedString();
      return addr.toRFC5952String();
    }
  } catch {
    return t;
  }
  return t;
}

export function hashClientFingerprintString(parts: {
  ip: string;
  userAgent: string;
  siteScope: string | null;
}): string {
  const pepper = getPepper();
  const normalizedIp = normalizeIpForFingerprint(parts.ip);
  const ua = parts.userAgent || "";
  const scope = parts.siteScope ?? "";
  const payload = `${pepper}|${normalizedIp}|${ua}|${scope}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

export function hashClientFingerprint(req: Request, siteScope: string | null): string {
  const ip = (req.ip || req.socket?.remoteAddress || "").trim() || "0";
  const ua = String(req.headers["user-agent"] ?? "");
  return hashClientFingerprintString({ ip, userAgent: ua, siteScope });
}

/** WebSocket / HTTP upgrade: use `IncomingMessage` socket address. */
export function hashClientFingerprintFromIncomingMessage(
  req: IncomingMessage,
  siteScope: string | null,
): string {
  const raw =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "";
  const ip = raw.trim() || "0";
  const ua = String(req.headers["user-agent"] ?? "");
  return hashClientFingerprintString({ ip, userAgent: ua, siteScope });
}
