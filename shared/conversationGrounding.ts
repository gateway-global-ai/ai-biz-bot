/**
 * Conversation Grounding Record (CGR) — control-plane artifact for session identity, ability, space, focus, time.
 * @see docs-governance/COMMUNICATION_GOVERNANCE_SCORECARD.md
 */

import { z } from "zod";

export const DisclosurePolicyIdSchema = z.enum(["early", "contextual", "late_experiment"]);
export type DisclosurePolicyId = z.infer<typeof DisclosurePolicyIdSchema>;

export const PrincipalOfRecordSchema = z.enum(["customer", "owner", "organization"]);
export type PrincipalOfRecord = z.infer<typeof PrincipalOfRecordSchema>;

export const CommunicationChannelSchema = z.enum([
  "pstn_narrowband",
  "voip_wideband",
  "web",
  "sms",
  "unknown",
]);
export type CommunicationChannel = z.infer<typeof CommunicationChannelSchema>;

export const StabilityDialsSchema = z.object({
  /** 0–2 */
  emotionalIntensity: z.number().int().min(0).max(2).default(1),
  /** 0–3 */
  friendliness: z.number().int().min(0).max(3).default(2),
  /** 0–3 */
  formality: z.number().int().min(0).max(3).default(2),
  /** 0–3 */
  directness: z.number().int().min(0).max(3).default(2),
});

export type StabilityDials = z.infer<typeof StabilityDialsSchema>;

/** Purpose–Plan–Pressure engagement (compiler-injected; default on). */
export const PppEngagementConfigSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(["standard", "sales_emphasis"]).optional(),
});

export type PppEngagementConfig = z.infer<typeof PppEngagementConfigSchema>;

/** Deterministic PPP adherence score for shadow telemetry (text chat); not an LLM judgment. */
export const PppShadowScoreSchema = z.object({
  compositeScore: z.number().min(0).max(100),
  hasPurpose: z.boolean(),
  hasPlan: z.boolean(),
  hasPressure: z.boolean(),
  hasHandoff: z.boolean(),
  isViolation: z.boolean(),
  skipped: z.boolean().optional(),
  skippedReason: z.string().optional(),
});

export type PppShadowScore = z.infer<typeof PppShadowScoreSchema>;

/** Site-level bundle persisted in site_configs.communication_governance (JSONB). */
export const CommunicationGovernanceConfigSchema = z.object({
  disclosurePolicyId: DisclosurePolicyIdSchema.default("contextual"),
  principalOfRecord: PrincipalOfRecordSchema.default("customer"),
  /** A/B or experiment key for disclosure timing (optional). */
  disclosureExperimentVariant: z.string().max(64).optional(),
  stabilityDials: StabilityDialsSchema.optional(),
  /** When true, surface owner-vs-customer conflict copy in compiler. */
  principalConflictPossible: z.boolean().optional(),
  /** PPP discovery: opt out with `{ "enabled": false }`. */
  pppEngagement: PppEngagementConfigSchema.default({ enabled: true }),
});

export type CommunicationGovernanceConfig = z.infer<typeof CommunicationGovernanceConfigSchema>;

export const ConversationGroundingRecordSchema = z.object({
  /** Correlation */
  sessionKey: z.string().optional(),
  siteConfigId: z.string().optional(),
  visitorId: z.string().optional(),

  identity: z.object({
    agentRoleId: z.string().optional(),
    agentId: z.string().optional(),
    disclosurePolicyId: DisclosurePolicyIdSchema,
    brandAffiliationSiteId: z.string().optional(),
  }),

  ability: z.object({
    permittedModalities: z.array(z.enum(["text", "voice", "canvas", "sms"])).default(["text", "voice"]),
    maxRiskClass: z.enum(["low", "medium", "high"]).default("low"),
  }),

  space: z.object({
    channel: CommunicationChannelSchema,
    language: z.string().default("en"),
    audioBandwidthClass: z.enum(["narrowband", "wideband", "unknown"]).optional(),
  }),

  focus: z.object({
    primaryObjective: z.string().optional(),
    customerObjectiveHypothesis: z.string().optional(),
    prohibitedObjectives: z.array(z.string()).optional(),
    /** PPP tracking — user-stated or confirmed; max lengths enforced in Zod. */
    prioritizedNeeds: z.array(z.string().max(200)).max(8).optional(),
    supportingActivities: z.array(z.string().max(200)).max(8).optional(),
    conflictingActivities: z.array(z.string().max(200)).max(8).optional(),
  }),

  time: z.object({
    interactionMode: z.enum(["ptt", "full_duplex", "chat_turns"]).default("chat_turns"),
    responseBudgetMs: z.number().int().positive().optional(),
    sessionTtlAt: z.string().optional(),
    escalationSla: z.string().optional(),
  }),

  principalOfRecord: PrincipalOfRecordSchema,
  /** True when business rules detect owner incentives vs customer welfare tension. */
  principalConflictFlag: z.boolean().default(false),

  recommendedHandoff: z.enum(["none", "sms_canvas"]).optional(),

  /** Agent operational mode when known — used for handoff heuristics. */
  operationalMode: z.string().optional(),

  /** Last shadow PPP score for this turn (text chat telemetry); optional. */
  pppShadow: PppShadowScoreSchema.optional(),
});

export type ConversationGroundingRecord = z.infer<typeof ConversationGroundingRecordSchema>;

// ── Buyer Journey Payload Node ────────────────────────────────────────────────
/**
 * Persistent cross-session buyer context accumulated in visitor_sessions.buyer_journey.
 * Hydrated by the CGR builder on session start; updated by journey_agent after each session.
 */
export interface BuyerJourney {
  phase: 'awareness' | 'consideration' | 'demo' | 'trial' | 'activation' | 'retention';
  industry?: string;
  painPointsExpressed: string[];
  pricingObjectionsRaised: string[];
  needsExpressed: string[];
  demoViewedAt?: string;
  trialStartedAt?: string;
  activatedAt?: string;
  lastAgentId?: string;
  lastSessionAt?: string;
  sessionCount: number;
}

export const DEFAULT_BUYER_JOURNEY: BuyerJourney = {
  phase: 'awareness',
  painPointsExpressed: [],
  pricingObjectionsRaised: [],
  needsExpressed: [],
  sessionCount: 0,
};

export function parseCommunicationGovernance(
  raw: unknown
): CommunicationGovernanceConfig {
  const parsed = CommunicationGovernanceConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : CommunicationGovernanceConfigSchema.parse({});
}
