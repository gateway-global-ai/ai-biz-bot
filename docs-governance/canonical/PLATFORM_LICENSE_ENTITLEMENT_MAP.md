---
status: canonical
truth_domain: schema
enforced_by: none
backed_by:
  schema: true
  service: true
  route: true
last_verified: 2026-03-25
---
# Platform license entitlement map (invariant)

Version: 1.0  
Status: **Runtime contract** — redeem path must apply entitlements only through [`server/services/entitlementMapper.ts`](../server/services/entitlementMapper.ts).

## Purpose

When a customer redeems a `gwl_` platform license key, **`site_configs` must reflect the purchased capability** without manual DB edits. The key records `platform_license_sku` / `platform_license_activated_at`; **derived** fields (`plan`, `voice_plan_active`, minute pools, voice activation time) come from this map merged with current site state.

## Single source of truth

| Artifact | Role |
| --- | --- |
| SKU list | [`PLATFORM_LICENSE_SKUS`](../server/services/platformLicenseService.ts) (admin generate + DB `platform_license_keys.sku`) |
| Merge logic | [`mergeEntitlementsForLicenseRedeem`](../server/services/entitlementMapper.ts) |
| Redeem side effects | [`redeemPlatformLicenseKey`](../server/services/platformLicenseService.ts) — **only** place that should apply SKU → `site_configs` entitlement updates on redeem |

Do **not** duplicate SKU → plan/voice rules in routes or UI; extend `entitlementMapper.ts` and this document together.

## SKU → base entitlements (before merge)

| SKU | `plan` | `voice_plan_active` (base) |
| --- | --- | --- |
| `platform_core` | `pro` | false |
| `platform_pro` | `pro` | false |
| `voice_addon` | `voice` | true |
| `enterprise` | `enterprise` | true |
| `custom` | `pro` | false (until product defines metadata-driven mapping) |

## Merge rules (no drift)

1. **Plan tier:** `mergedPlan = max(basePlan, currentPlan)` using order `free < pro < voice < enterprise`. **Never downgrade** a site that already sits on a higher tier.
2. **Voice flag:** `mergedVoice = base.voicePlanActive || current.voicePlanActive`. Once voice is on, redeem does not turn it off.
3. **Minute pools:** `voice_web_ai_minutes` and `voice_phone_ai_minutes` are set to **max(current, PLAN_LIMITS[mergedPlan])** using [`PLAN_LIMITS`](../shared/schema.ts) (`websiteTtsMinutes`, `liveVoiceMinutes`). Pools are **never decreased** by redeem.
4. **`voice_plan_activated_at`:** Set when merged voice is true and the site had no prior activation timestamp; otherwise preserved.

## API

`POST /api/customer/platform-licenses/redeem` returns `entitlements` (merged snapshot) alongside `sku` and `activationId` for client confirmation.

## Related

- Platform license keys (generate/redeem): [`server/routes/platformLicenseRoutes.ts`](../server/routes/platformLicenseRoutes.ts)
- Plan marketing copy / limits: `PLAN_LIMITS` in [`shared/schema.ts`](../shared/schema.ts)
