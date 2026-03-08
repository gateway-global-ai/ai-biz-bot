/**
 * QR Routes (shadow telecom): base URL, route URL building, QR generation for routes,
 * firewall check, and access logging.
 */
import { storage } from "../storage";
import { generateBusinessQR, getQRFilePath } from "./qrCodeService";

const DEFAULT_QR_BASE_URL = "https://aibizbot-qr.gatewayglobal.ai";

export function getQrBaseUrl(): string {
  return process.env.QR_BASE_URL || DEFAULT_QR_BASE_URL;
}

export function buildRouteUrl(id: number): string {
  const base = getQrBaseUrl().replace(/\/$/, "");
  return `${base}/qr/${id}`;
}

const ROUTE_QR_SLUG_PREFIX = "route-";

/**
 * Generate QR code PNG for a route (encodes buildRouteUrl(id)), with Gateway logo.
 * Saves to uploads/qr/route-{id}.png. Returns absolute filesystem path.
 */
export async function generateQrForRoute(id: number): Promise<string> {
  const url = buildRouteUrl(id);
  const slug = `${ROUTE_QR_SLUG_PREFIX}${id}`;
  return generateBusinessQR(url, slug);
}

/**
 * Get filesystem path for a route's QR image (may not exist yet).
 */
export function getRouteQrFilePath(id: number): string {
  return getQRFilePath(`${ROUTE_QR_SLUG_PREFIX}${id}`);
}

export interface FirewallCheckResult {
  blocked: boolean;
  reason?: string;
}

/**
 * Check firewall rules for a route. Order: deny wins; if any allow rule exists and none matched, block; rate_limit applied last.
 */
export async function checkFirewall(
  routeId: number,
  ip: string | undefined,
  userAgent: string | undefined
): Promise<FirewallCheckResult> {
  const rules = await storage.getQrFirewallRules(routeId);
  const active = rules.filter((r) => r.isActive);
  if (active.length === 0) return { blocked: false };

  const ipStr = ip ?? "";
  const uaStr = userAgent ?? "";

  for (const r of active) {
    if (r.ruleType === "deny_ip" && matchIp(ipStr, r.value)) {
      return { blocked: true, reason: "deny_ip" };
    }
    if (r.ruleType === "deny_ua" && matchUa(uaStr, r.value)) {
      return { blocked: true, reason: "deny_ua" };
    }
  }

  const allowIpRules = active.filter((r) => r.ruleType === "allow_ip");
  const allowUaRules = active.filter((r) => r.ruleType === "allow_ua");
  if (allowIpRules.length > 0) {
    const allowed = allowIpRules.some((r) => matchIp(ipStr, r.value));
    if (!allowed) return { blocked: true, reason: "allow_ip_no_match" };
  }
  if (allowUaRules.length > 0) {
    const allowed = allowUaRules.some((r) => matchUa(uaStr, r.value));
    if (!allowed) return { blocked: true, reason: "allow_ua_no_match" };
  }

  for (const r of active) {
    if (r.ruleType === "rate_limit") {
      const limit = parseInt(r.value, 10);
      if (!Number.isFinite(limit) || limit <= 0) continue;
      const { logs } = await storage.getQrAccessLog(routeId, 1, limit + 1);
      const windowMs = 60 * 1000;
      const since = Date.now() - windowMs;
      const recent = logs.filter(
        (l) => l.accessedAt && new Date(l.accessedAt).getTime() > since
      );
      if (recent.length >= limit) {
        return { blocked: true, reason: "rate_limit" };
      }
    }
  }

  return { blocked: false };
}

function matchIp(ip: string, value: string): boolean {
  if (!ip) return false;
  if (value === ip) return true;
  if (value.includes("/")) {
    return matchCidr(ip, value);
  }
  return false;
}

function matchCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/");
    const mask = parseInt(bits, 10);
    if (!Number.isFinite(mask) || mask < 0 || mask > 32) return false;
    const ipNum = ipToNum(ip);
    const rangeNum = ipToNum(range);
    if (ipNum === null || rangeNum === null) return false;
    const maskNum = mask === 0 ? 0 : 0xffffffff << (32 - mask);
    return (ipNum & maskNum) === (rangeNum & maskNum);
  } catch {
    return false;
  }
}

function ipToNum(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const oct = parseInt(p, 10);
    if (!Number.isFinite(oct) || oct < 0 || oct > 255) return null;
    n = (n << 8) + oct;
  }
  return n >>> 0;
}

function matchUa(ua: string, pattern: string): boolean {
  if (!ua) return false;
  try {
    const re = new RegExp(pattern, "i");
    return re.test(ua);
  } catch {
    return ua.includes(pattern);
  }
}

export interface QrAccessData {
  qrRouteId: number;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  destination?: string;
  wasBlocked: boolean;
  responseMs?: number;
}

export async function logQrAccess(data: QrAccessData): Promise<void> {
  await storage.logQrAccess({
    qrRouteId: data.qrRouteId,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
    referrer: data.referrer ?? null,
    destination: data.destination ?? null,
    wasBlocked: data.wasBlocked,
    responseMs: data.responseMs ?? null,
  });
}
