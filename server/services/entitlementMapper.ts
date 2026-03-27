/**
 * Platform license SKU → site entitlement patch (plan tier, voice unlock, minute floors).
 * Single source of truth for redeem-time mutations on `site_configs`.
 * @see docs-governance/PLATFORM_LICENSE_ENTITLEMENT_MAP.md
 *
 * SKU strings must stay aligned with `PLATFORM_LICENSE_SKUS` in `platformLicenseService.ts`.
 */
import { PLAN_LIMITS, type PlanType } from "@shared/schema";

/** Must match `PlatformLicenseSku` / admin key generator. */
export type PlatformLicenseSkuKey =
  | "platform_core"
  | "platform_pro"
  | "voice_addon"
  | "enterprise"
  | "custom";

export interface SiteEntitlementLedgerSnapshot {
  plan: string | null | undefined;
  voicePlanActive: boolean;
  voiceWebAiMinutes: number;
  voicePhoneAiMinutes: number;
  voicePlanActivatedAt: Date | null;
}

export interface EntitlementMergeResult {
  plan: PlanType;
  voicePlanActive: boolean;
  voiceWebAiMinutes: number;
  voicePhoneAiMinutes: number;
  voicePlanActivatedAt: Date | null;
}

/** Base mapping for each SKU before merge with current site state (no downgrades). */
const SKU_BASE: Record<PlatformLicenseSkuKey, { plan: PlanType; voicePlanActive: boolean }> = {
  platform_core: { plan: "pro", voicePlanActive: false },
  platform_pro: { plan: "pro", voicePlanActive: false },
  voice_addon: { plan: "voice", voicePlanActive: true },
  enterprise: { plan: "enterprise", voicePlanActive: true },
  /** Custom keys: safe default until operator metadata defines otherwise. */
  custom: { plan: "pro", voicePlanActive: false },
};

const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  voice: 2,
  enterprise: 3,
};

function normalizePlan(p: string | null | undefined): PlanType {
  const x = String(p ?? "free").toLowerCase();
  if (x === "free" || x === "pro" || x === "voice" || x === "enterprise") {
    return x;
  }
  return "free";
}

function maxPlan(a: PlanType, b: PlanType): PlanType {
  return PLAN_RANK[a] >= PLAN_RANK[b] ? a : b;
}

function isPlatformLicenseSku(s: string): s is PlatformLicenseSkuKey {
  return (
    s === "platform_core" ||
    s === "platform_pro" ||
    s === "voice_addon" ||
    s === "enterprise" ||
    s === "custom"
  );
}

/**
 * Returns merged entitlements after redeeming a key with the given SKU.
 * Does not downgrade plan or voice flag relative to current site state.
 * Minute pools are floored at plan limits from PLAN_LIMITS (never reduced).
 */
export function mergeEntitlementsForLicenseRedeem(
  sku: string,
  current: SiteEntitlementLedgerSnapshot
): EntitlementMergeResult {
  const base = isPlatformLicenseSku(sku) ? SKU_BASE[sku] : SKU_BASE.custom;
  const currentPlan = normalizePlan(current.plan);
  const mergedPlan = maxPlan(base.plan, currentPlan);
  const mergedVoice = Boolean(base.voicePlanActive || current.voicePlanActive);

  const limits = PLAN_LIMITS[mergedPlan];
  const voiceWebAiMinutes = Math.max(
    Number(current.voiceWebAiMinutes ?? 0),
    limits.websiteTtsMinutes
  );
  const voicePhoneAiMinutes = Math.max(
    Number(current.voicePhoneAiMinutes ?? 0),
    limits.liveVoiceMinutes
  );

  let voicePlanActivatedAt: Date | null = current.voicePlanActivatedAt ?? null;
  if (mergedVoice && !voicePlanActivatedAt) {
    voicePlanActivatedAt = new Date();
  }

  return {
    plan: mergedPlan,
    voicePlanActive: mergedVoice,
    voiceWebAiMinutes,
    voicePhoneAiMinutes,
    voicePlanActivatedAt,
  };
}

/** Expose read-only SKU → base plan/voice for docs and admin UI. */
export function getBaseEntitlementsForSku(sku: string): { plan: PlanType; voicePlanActive: boolean } {
  if (isPlatformLicenseSku(sku)) return { ...SKU_BASE[sku] };
  return { ...SKU_BASE.custom };
}
