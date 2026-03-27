/**
 * Industry Funnel Templates — barrel export
 * All payloads are draft by default and require approval via
 * POST /api/knowledge/approve-artifact/:id before the /industry/[slug] route serves them live.
 */
export { NAIL_SALON_FUNNEL } from "./nail-salon";
export { MED_SPA_FUNNEL } from "./med-spa";
export { DENTAL_FUNNEL } from "./dental";
export { HVAC_FUNNEL } from "./hvac";
export { AUTO_SERVICE_FUNNEL } from "./auto-service";
export { HOTEL_FUNNEL } from "./hotel";

export {
  funnelPayloadSchema,
  funnelArtifactKey,
  PRIORITY_VERTICALS,
  type FunnelPayload,
  type FunnelHero,
  type FunnelPainPoint,
  type FunnelOffer,
  type VerticalSlug,
} from "./FunnelPayload";

import { NAIL_SALON_FUNNEL } from "./nail-salon";
import { MED_SPA_FUNNEL } from "./med-spa";
import { DENTAL_FUNNEL } from "./dental";
import { HVAC_FUNNEL } from "./hvac";
import { AUTO_SERVICE_FUNNEL } from "./auto-service";
import { HOTEL_FUNNEL } from "./hotel";
import type { FunnelPayload } from "./FunnelPayload";

export const ALL_FUNNELS: FunnelPayload[] = [
  NAIL_SALON_FUNNEL,
  MED_SPA_FUNNEL,
  DENTAL_FUNNEL,
  HVAC_FUNNEL,
  AUTO_SERVICE_FUNNEL,
  HOTEL_FUNNEL,
];

export const FUNNEL_BY_SLUG = new Map<string, FunnelPayload>(
  ALL_FUNNELS.map((f) => [f.slug, f])
);
