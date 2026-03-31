/**
 * Integration connect tokens — mint (hash-only storage), validate (structured result), single-use.
 * @see docs-governance/canonical/INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md
 */
import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { integrationConnectTokens, type IntegrationConnectToken } from "@shared/schema";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export const INTEGRATION_CONNECT_LANES = ["oauth", "api_key"] as const;
export type IntegrationConnectLane = (typeof INTEGRATION_CONNECT_LANES)[number];

function requireConnectTokenSecret(): string {
  const s = process.env.INTEGRATION_CONNECT_TOKEN_SECRET?.trim();
  if (!s) {
    throw new Error(
      "INTEGRATION_CONNECT_TOKEN_SECRET is required to mint or validate integration connect tokens",
    );
  }
  return s;
}

/** HMAC-SHA256 hex digest of the opaque token (never store plain token). */
export function hashIntegrationConnectToken(plainToken: string): string {
  const secret = requireConnectTokenSecret();
  return crypto.createHmac("sha256", secret).update(plainToken, "utf8").digest("hex");
}

export type MintIntegrationConnectTokenInput = {
  siteConfigId: string;
  vendorId: string;
  connectLane: IntegrationConnectLane;
  phoneE164?: string | null;
  createdBy?: string | null;
  /** Override default 1h TTL */
  ttlMs?: number;
};

export type MintIntegrationConnectTokenResult = {
  id: string;
  /** Return to operator once (e.g. in SMS URL); never log. */
  plainToken: string;
  expiresAt: Date;
};

/**
 * Create a single-use connect token row; returns plaintext once for embedding in SMS/link.
 */
export async function mintIntegrationConnectToken(
  input: MintIntegrationConnectTokenInput,
): Promise<MintIntegrationConnectTokenResult> {
  if (!INTEGRATION_CONNECT_LANES.includes(input.connectLane)) {
    throw new Error(`Invalid connect_lane: ${input.connectLane}`);
  }
  const plainToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashIntegrationConnectToken(plainToken);
  const ttl = input.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  const [row] = await db
    .insert(integrationConnectTokens)
    .values({
      siteConfigId: input.siteConfigId,
      vendorId: input.vendorId,
      connectLane: input.connectLane,
      phoneE164: input.phoneE164?.trim() || null,
      tokenHash,
      expiresAt,
      createdBy: input.createdBy?.trim() || null,
    })
    .returning({ id: integrationConnectTokens.id });

  if (!row) throw new Error("integration_connect_tokens insert failed");

  return { id: row.id, plainToken, expiresAt };
}

export type ValidateIntegrationConnectOptions = {
  /** When set, mismatch yields site_mismatch (not invalid). */
  expectSiteConfigId?: string;
  expectVendorId?: string;
};

/** Deterministic validation outcome for UI + audit. */
export type IntegrationConnectValidation =
  | { status: "valid"; record: IntegrationConnectToken }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "already_used" }
  | { status: "site_mismatch"; tokenSiteConfigId: string; expectedSiteConfigId: string }
  | { status: "vendor_mismatch"; tokenVendorId: string; expectedVendorId: string };

/**
 * Validate opaque token from query param; does not mark used (call markIntegrationConnectTokenUsed after session bind or OAuth start).
 */
export async function validateIntegrationConnectToken(
  plainToken: string | undefined | null,
  options: ValidateIntegrationConnectOptions = {},
): Promise<IntegrationConnectValidation> {
  if (!plainToken?.trim()) {
    return { status: "invalid" };
  }
  let tokenHash: string;
  try {
    tokenHash = hashIntegrationConnectToken(plainToken.trim());
  } catch {
    return { status: "invalid" };
  }

  const [row] = await db
    .select()
    .from(integrationConnectTokens)
    .where(eq(integrationConnectTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    return { status: "invalid" };
  }

  if (row.usedAt) {
    return { status: "already_used" };
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }

  if (options.expectSiteConfigId && options.expectSiteConfigId !== row.siteConfigId) {
    return {
      status: "site_mismatch",
      tokenSiteConfigId: row.siteConfigId,
      expectedSiteConfigId: options.expectSiteConfigId,
    };
  }

  if (options.expectVendorId && options.expectVendorId !== row.vendorId) {
    return {
      status: "vendor_mismatch",
      tokenVendorId: row.vendorId,
      expectedVendorId: options.expectVendorId,
    };
  }

  return { status: "valid", record: row };
}

/**
 * Mark token consumed (single-use). Idempotent if already set.
 */
export async function markIntegrationConnectTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(integrationConnectTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(integrationConnectTokens.id, tokenId), isNull(integrationConnectTokens.usedAt)));
}
