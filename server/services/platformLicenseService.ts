/**
 * Platform software license keys: generate, list (masked), validate, redeem.
 * Pattern aligned with verificationInstallationApiKeys (prefix + SHA-256 hash).
 *
 * Redeem applies `plan` / voice / minute entitlements via `entitlementMapper.ts`;
 * see docs-governance/PLATFORM_LICENSE_ENTITLEMENT_MAP.md.
 */

import crypto from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  platformLicenseActivations,
  platformLicenseKeys,
  siteConfigs,
} from "@shared/schema";
import {
  mergeEntitlementsForLicenseRedeem,
  type EntitlementMergeResult,
} from "./entitlementMapper";
import { invalidateSiteRuntimeCache } from "./siteRuntimeResolver";

const KEY_PREFIX_LEN = 16;
const KEY_PREFIX = "gwl_";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function keyPrefixFromFullKey(fullKey: string): string {
  return fullKey.slice(0, KEY_PREFIX_LEN);
}

export function generatePlatformLicenseKey(): { fullKey: string; keyPrefix: string } {
  const secretPart = crypto.randomBytes(24).toString("hex");
  const fullKey = `${KEY_PREFIX}${secretPart}`;
  return { fullKey, keyPrefix: keyPrefixFromFullKey(fullKey) };
}

export const PLATFORM_LICENSE_SKUS = [
  "platform_core",
  "platform_pro",
  "voice_addon",
  "enterprise",
  "custom",
] as const;
export type PlatformLicenseSku = (typeof PLATFORM_LICENSE_SKUS)[number];

export async function createPlatformLicenseKeys(params: {
  sku: string;
  count: number;
  maxActivations: number | null;
  expiresAt: Date | null;
  label: string | null;
  metadata: Record<string, unknown>;
  createdByAdminId: string;
}): Promise<Array<{ id: string; fullKey: string; keyPrefix: string; warning: string }>> {
  const out: Array<{ id: string; fullKey: string; keyPrefix: string; warning: string }> = [];
  const warning =
    "Store this key securely. It will not be shown again. Do not commit to git or paste in tickets.";

  for (let i = 0; i < params.count; i++) {
    const { fullKey, keyPrefix } = generatePlatformLicenseKey();
    const secretHash = sha256Hex(fullKey);

    const [row] = await db
      .insert(platformLicenseKeys)
      .values({
        keyPrefix,
        secretHash,
        sku: params.sku,
        label: params.label ?? undefined,
        maxActivations: params.maxActivations ?? undefined,
        expiresAt: params.expiresAt ?? undefined,
        metadata: params.metadata,
        createdByAdminId: params.createdByAdminId,
      })
      .returning({ id: platformLicenseKeys.id });

    if (!row?.id) throw new Error("Failed to insert platform license key.");
    out.push({ id: row.id, fullKey, keyPrefix, warning });
  }

  return out;
}

export type ListLicenseRow = {
  id: string;
  keyPrefix: string;
  sku: string;
  label: string | null;
  maxActivations: number | null;
  activationCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listPlatformLicenseKeys(limit = 100): Promise<ListLicenseRow[]> {
  const rows = await db
    .select({
      id: platformLicenseKeys.id,
      keyPrefix: platformLicenseKeys.keyPrefix,
      sku: platformLicenseKeys.sku,
      label: platformLicenseKeys.label,
      maxActivations: platformLicenseKeys.maxActivations,
      activationCount: platformLicenseKeys.activationCount,
      expiresAt: platformLicenseKeys.expiresAt,
      revokedAt: platformLicenseKeys.revokedAt,
      createdAt: platformLicenseKeys.createdAt,
    })
    .from(platformLicenseKeys)
    .orderBy(desc(platformLicenseKeys.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    keyPrefix: r.keyPrefix,
    sku: r.sku,
    label: r.label ?? null,
    maxActivations: r.maxActivations ?? null,
    activationCount: r.activationCount,
    expiresAt: r.expiresAt ?? null,
    revokedAt: r.revokedAt ?? null,
    createdAt: r.createdAt!,
  }));
}

export type RedeemResult =
  | {
      ok: true;
      sku: string;
      activationId: string;
      entitlements: EntitlementMergeResult;
    }
  | { ok: false; error: string };

export async function redeemPlatformLicenseKey(params: {
  fullKey: string;
  siteConfigId: string;
  customerAccountId: string;
}): Promise<RedeemResult> {
  const trimmed = params.fullKey?.trim();
  if (!trimmed || !trimmed.startsWith(KEY_PREFIX)) {
    return { ok: false, error: "Invalid license key format." };
  }

  const prefix = keyPrefixFromFullKey(trimmed);
  const hash = sha256Hex(trimmed);

  const rows = await db
    .select()
    .from(platformLicenseKeys)
    .where(and(eq(platformLicenseKeys.keyPrefix, prefix), isNull(platformLicenseKeys.revokedAt)))
    .limit(5);

  const row = rows.find((r) => r.secretHash === hash);
  if (!row) {
    return { ok: false, error: "Invalid or revoked license key." };
  }

  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    return { ok: false, error: "This license key has expired." };
  }

  const max = row.maxActivations;
  if (max != null && row.activationCount >= max) {
    return { ok: false, error: "This license key has reached its activation limit." };
  }

  const siteRows = await db
    .select({
      ownerId: siteConfigs.ownerId,
      plan: siteConfigs.plan,
      voicePlanActive: siteConfigs.voicePlanActive,
      voiceWebAiMinutes: siteConfigs.voiceWebAiMinutes,
      voicePhoneAiMinutes: siteConfigs.voicePhoneAiMinutes,
      voicePlanActivatedAt: siteConfigs.voicePlanActivatedAt,
    })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, params.siteConfigId))
    .limit(1);

  const siteRow = siteRows[0];
  const ownerId = siteRow?.ownerId;
  if (!ownerId || ownerId !== params.customerAccountId) {
    return { ok: false, error: "You can only apply a license to a business you own." };
  }

  const existingActivation = await db
    .select({ id: platformLicenseActivations.id })
    .from(platformLicenseActivations)
    .where(
      and(
        eq(platformLicenseActivations.licenseKeyId, row.id),
        eq(platformLicenseActivations.siteConfigId, params.siteConfigId),
      ),
    )
    .limit(1);

  if (existingActivation.length > 0) {
    return { ok: false, error: "This license key is already applied to this site." };
  }

  const [activation] = await db
    .insert(platformLicenseActivations)
    .values({
      licenseKeyId: row.id,
      siteConfigId: params.siteConfigId,
      customerAccountId: params.customerAccountId,
    })
    .returning({ id: platformLicenseActivations.id });

  await db
    .update(platformLicenseKeys)
    .set({
      activationCount: row.activationCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(platformLicenseKeys.id, row.id));

  const entitlements = mergeEntitlementsForLicenseRedeem(row.sku, {
    plan: siteRow.plan,
    voicePlanActive: siteRow.voicePlanActive ?? false,
    voiceWebAiMinutes: siteRow.voiceWebAiMinutes ?? 0,
    voicePhoneAiMinutes: siteRow.voicePhoneAiMinutes ?? 0,
    voicePlanActivatedAt: siteRow.voicePlanActivatedAt ?? null,
  });

  await db
    .update(siteConfigs)
    .set({
      platformLicenseSku: row.sku,
      platformLicenseActivatedAt: new Date(),
      plan: entitlements.plan,
      voicePlanActive: entitlements.voicePlanActive,
      voiceWebAiMinutes: entitlements.voiceWebAiMinutes,
      voicePhoneAiMinutes: entitlements.voicePhoneAiMinutes,
      voicePlanActivatedAt: entitlements.voicePlanActivatedAt,
      updatedAt: new Date(),
    })
    .where(eq(siteConfigs.id, params.siteConfigId));
  invalidateSiteRuntimeCache(params.siteConfigId);

  if (!activation?.id) {
    return { ok: false, error: "Failed to record activation." };
  }

  return { ok: true, sku: row.sku, activationId: activation.id, entitlements };
}

export async function revokePlatformLicenseKey(id: string): Promise<boolean> {
  const [updated] = await db
    .update(platformLicenseKeys)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(platformLicenseKeys.id, id))
    .returning({ id: platformLicenseKeys.id });
  return !!updated?.id;
}
