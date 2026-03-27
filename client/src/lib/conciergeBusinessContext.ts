/**
 * Single builder for ConciergePanel `business` (BusinessContext) from site API payload + URL slug.
 * PublicBusinessPage and AgentPage must use this so /biz/:slug and /agent/:slug share shell-affecting fields.
 */
import type { BusinessContext } from '@/types/voice';

export function getPublicDemoSlug(): string {
  const v = import.meta.env.VITE_PUBLIC_DEMO_SLUG;
  return typeof v === 'string' && v.trim() ? v.trim() : 'ai-biz-bots';
}

/**
 * @param siteData — JSON from GET /api/site-configs/by-slug (after stripping readiness_gate_v1)
 * @param slug — route param (used for platform marketing demo detection)
 */
export function buildConciergeBusinessFromSite(siteData: Record<string, unknown>, slug: string): BusinessContext {
  const placeData = (siteData.placeData as Record<string, unknown>) || {};
  const heroImageUrl =
    (siteData.heroImageUrl as string | undefined) ??
    (siteData.placeId
      ? `/api/places/photo-proxy/${encodeURIComponent(String(siteData.placeId))}?maxWidth=1200`
      : undefined);

  const opening = placeData.opening_hours as { weekday_text?: string[] } | undefined;
  const geometry = placeData.geometry as { location?: { lat?: number; lng?: number } } | undefined;
  const typesRaw = (placeData.types as string[] | undefined) || [];

  const meta = siteData.metadata as Record<string, unknown> | undefined;
  const demoSlug = getPublicDemoSlug();

  return {
    id: String(siteData.id ?? ''),
    placeId: String(siteData.placeId || (placeData.place_id as string) || ''),
    name: String((placeData.name as string) || (siteData.name as string) || 'Agent'),
    address: String((placeData.formatted_address as string) || ''),
    hours: opening?.weekday_text || [],
    services: [],
    rating: placeData.rating as number | undefined,
    userRatingsTotal: placeData.user_ratings_total as number | undefined,
    phone: (placeData.formatted_phone_number as string) || (placeData.international_phone_number as string),
    types: typesRaw.filter((t: string) => !['point_of_interest', 'establishment'].includes(t)),
    heroImageUrl,
    lat: geometry?.location?.lat,
    lng: geometry?.location?.lng,
    workspaceState: (siteData.workspaceState as BusinessContext['workspaceState']) ?? 'demo',
    claimStatus: (siteData.claimStatus as BusinessContext['claimStatus']) ?? null,
    ownerId: (siteData.ownerId as string | null) ?? null,
    plan: (siteData.plan as BusinessContext['plan']) ?? 'free',
    platformMarketingDemo:
      meta?.platformMarketingDemo === true || slug === demoSlug,
    funnelContextKeys:
      (siteData.funnelContextKeys as Record<string, string | undefined> | undefined) ||
      (meta?.funnelContextKeys as Record<string, string | undefined> | undefined),
  };
}
