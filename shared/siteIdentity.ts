/**
 * Branded string types for site identity vs external references.
 * @see docs-governance/canonical/SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md
 */

declare const __siteConfigIdBrand: unique symbol;
declare const __googlePlaceIdBrand: unique symbol;
declare const __cloudbedsPropertyIdBrand: unique symbol;

/** Gateway platform scope: `site_configs.id` (UUID). Canonical internal business/site identity. */
export type SiteConfigId = string & { readonly [__siteConfigIdBrand]: typeof __siteConfigIdBrand };

/** Google Places resource id — external locator only; not platform scope. */
export type GooglePlaceId = string & { readonly [__googlePlaceIdBrand]: typeof __googlePlaceIdBrand };

/** Cloudbeds / PMS property id — vendor-scoped; not internal identity. */
export type CloudbedsPropertyId = string & { readonly [__cloudbedsPropertyIdBrand]: typeof __cloudbedsPropertyIdBrand };

export function asSiteConfigId(id: string): SiteConfigId {
  return id as SiteConfigId;
}

export function asGooglePlaceId(id: string): GooglePlaceId {
  return id as GooglePlaceId;
}

export function asCloudbedsPropertyId(id: string): CloudbedsPropertyId {
  return id as CloudbedsPropertyId;
}
