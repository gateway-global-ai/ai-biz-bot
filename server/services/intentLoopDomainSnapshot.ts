/**
 * Allowlisted JSON snapshot for Phase B3 domain journey (under visitor_sessions.buyer_journey).
 * Parsed only — writers live on trusted server paths (e.g. PMS tool completion), not client or LLM prose.
 */

import { z } from "zod";

/** JSON key under visitor_sessions.buyer_journey — server-written only. */
export const INTENT_LOOP_DOMAIN_SNAPSHOT_KEY_V1 = "intent_loop_domain_v1" as const;

const guestJourneyEnum = z.enum([
  "in_house",
  "upcoming_stay",
  "recent_checkout",
  "past_guest",
  "no_pms_match",
]);

export const IntentLoopDomainSnapshotV1Schema = z.object({
  domainJourneyKey: guestJourneyEnum,
  evidence: z.literal("pms_guest_journey_v1"),
  confidence: z.number().min(0).max(1),
  recordedAt: z.string().optional(),
});

export type IntentLoopDomainSnapshotV1 = z.infer<typeof IntentLoopDomainSnapshotV1Schema>;

export function parseIntentLoopDomainSnapshotFromBuyerJourney(
  buyerJourney: unknown,
): IntentLoopDomainSnapshotV1 | null {
  if (!buyerJourney || typeof buyerJourney !== "object") return null;
  const raw = (buyerJourney as Record<string, unknown>)[INTENT_LOOP_DOMAIN_SNAPSHOT_KEY_V1];
  const parsed = IntentLoopDomainSnapshotV1Schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
