/**
 * Derive Google Places–style types[] for contract / industry checks when the HTTP body has no placeTypes.
 */
import type { SiteConfig } from "@shared/schema";

export function placeTypesFromSiteConfig(site: SiteConfig | null | undefined): string[] {
  if (!site) return ["establishment"];
  const pd = site.placeData as { types?: unknown } | null | undefined;
  if (Array.isArray(pd?.types) && pd.types.length > 0) {
    return pd.types.map(String);
  }
  return ["establishment"];
}
