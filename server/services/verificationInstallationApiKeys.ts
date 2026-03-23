/**
 * Installation API keys for POST /api/v1/verification/* (remote OS, ISV integrations).
 * Secrets: never log full keys; store SHA-256 hex only.
 */

import crypto from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { verificationInstallationApiKeys } from "@shared/schema";

const PERMS = {
  GUEST: "verification.guest",
} as const;

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/** First 16 chars of key — unique index in DB (gwv_ + 12 hex). */
export function keyPrefixFromFullKey(fullKey: string): string {
  return fullKey.slice(0, 16);
}

export function generateInstallationApiKey(): { fullKey: string; keyPrefix: string } {
  const secretPart = crypto.randomBytes(24).toString("hex");
  const fullKey = `gwv_${secretPart}`;
  return { fullKey, keyPrefix: keyPrefixFromFullKey(fullKey) };
}

export type ValidateKeyResult =
  | { ok: true; siteConfigId: string; keyId: string; permissions: string[] }
  | { ok: false; error: string };

export async function validateInstallationApiKey(fullKey: string): Promise<ValidateKeyResult> {
  const trimmed = fullKey?.trim();
  if (!trimmed || !trimmed.startsWith("gwv_")) {
    return { ok: false, error: "Invalid API key format." };
  }
  const prefix = keyPrefixFromFullKey(trimmed);
  const hash = sha256Hex(trimmed);

  const rows = await db
    .select()
    .from(verificationInstallationApiKeys)
    .where(
      and(
        eq(verificationInstallationApiKeys.keyPrefix, prefix),
        eq(verificationInstallationApiKeys.isActive, true),
        isNull(verificationInstallationApiKeys.revokedAt),
      ),
    )
    .limit(2);

  if (rows.length === 0) return { ok: false, error: "Invalid or revoked API key." };

  const row = rows.find((r) => r.secretHash === hash);
  if (!row) return { ok: false, error: "Invalid or revoked API key." };

  const permissions = Array.isArray(row.permissions) ? row.permissions : ([] as string[]);
  return {
    ok: true,
    siteConfigId: row.siteConfigId,
    keyId: row.id,
    permissions,
  };
}

export async function touchInstallationApiKeyLastUsed(keyId: string): Promise<void> {
  const now = new Date();
  await db
    .update(verificationInstallationApiKeys)
    .set({ lastUsedAt: now, updatedAt: now })
    .where(eq(verificationInstallationApiKeys.id, keyId));
}

export function keyHasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}

export async function createInstallationApiKey(params: {
  siteConfigId: string;
  name: string;
}): Promise<{ id: string; keyPrefix: string; fullKey: string; warning: string }> {
  const { fullKey, keyPrefix } = generateInstallationApiKey();
  const secretHash = sha256Hex(fullKey);

  const [row] = await db
    .insert(verificationInstallationApiKeys)
    .values({
      siteConfigId: params.siteConfigId,
      name: params.name.trim() || "Installation",
      keyPrefix,
      secretHash,
      permissions: [PERMS.GUEST],
    })
    .returning({ id: verificationInstallationApiKeys.id });

  if (!row?.id) throw new Error("Failed to create API key.");

  return {
    id: row.id,
    keyPrefix,
    fullKey,
    warning: "Store this key securely. It will not be shown again.",
  };
}

export async function listInstallationApiKeys(siteConfigId: string): Promise<
  Array<{
    id: string;
    name: string;
    keyPrefix: string;
    permissions: string[];
    isActive: boolean;
    lastUsedAt: string | null;
    createdAt: string;
    revokedAt: string | null;
  }>
> {
  const rows = await db
    .select()
    .from(verificationInstallationApiKeys)
    .where(eq(verificationInstallationApiKeys.siteConfigId, siteConfigId))
    .orderBy(desc(verificationInstallationApiKeys.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
    isActive: r.isActive,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    revokedAt: r.revokedAt?.toISOString() ?? null,
  }));
}

export async function revokeInstallationApiKey(params: {
  siteConfigId: string;
  keyId: string;
}): Promise<boolean> {
  const now = new Date();
  const result = await db
    .update(verificationInstallationApiKeys)
    .set({
      isActive: false,
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(verificationInstallationApiKeys.id, params.keyId),
        eq(verificationInstallationApiKeys.siteConfigId, params.siteConfigId),
      ),
    )
    .returning({ id: verificationInstallationApiKeys.id });

  return result.length > 0;
}
