/**
 * Build Conversation Grounding Records (CGR) for chat and telephony-derived contexts.
 */
import type { Agent } from "@shared/schema";
import {
  type CommunicationGovernanceConfig,
  type ConversationGroundingRecord,
  type BuyerJourney,
  DEFAULT_BUYER_JOURNEY,
  parseCommunicationGovernance,
} from "@shared/conversationGrounding";
import { db } from "../db";
import { visitorSessions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function getCommunicationGovernanceFromSite(site: Record<string, unknown> | null | undefined): CommunicationGovernanceConfig {
  const raw = site?.communicationGovernance ?? site?.communication_governance;
  return parseCommunicationGovernance(raw);
}

/** Load persisted buyer journey for a visitor from visitor_sessions. Returns null if not found. */
export async function loadBuyerJourney(
  visitorId: string | undefined,
  siteConfigId: string | undefined,
): Promise<BuyerJourney | null> {
  if (!visitorId || !siteConfigId) return null;
  try {
    const [row] = await db
      .select({ buyerJourney: visitorSessions.buyerJourney })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.visitorId, visitorId),
          eq(visitorSessions.siteConfigId, siteConfigId),
        )
      )
      .limit(1);
    if (!row) return null;
    const raw = row.buyerJourney;
    if (!raw || typeof raw !== 'object' || !('phase' in raw)) return null;
    return {
      phase: (raw.phase as BuyerJourney['phase']) ?? 'awareness',
      industry: raw.industry as string | undefined,
      painPointsExpressed: (raw.painPointsExpressed as string[]) ?? [],
      pricingObjectionsRaised: (raw.pricingObjectionsRaised as string[]) ?? [],
      needsExpressed: (raw.needsExpressed as string[]) ?? [],
      demoViewedAt: raw.demoViewedAt as string | undefined,
      trialStartedAt: raw.trialStartedAt as string | undefined,
      activatedAt: raw.activatedAt as string | undefined,
      lastAgentId: raw.lastAgentId as string | undefined,
      lastSessionAt: raw.lastSessionAt as string | undefined,
      sessionCount: (raw.sessionCount as number) ?? 0,
    };
  } catch {
    return null;
  }
}

/** Heuristic: narrowband PSTN + visual/verification-heavy tasks should suggest SMS/canvas. */
export function shouldRecommendCanvasHandoff(cgr: ConversationGroundingRecord): boolean {
  const narrow =
    cgr.space.channel === "pstn_narrowband" ||
    cgr.space.audioBandwidthClass === "narrowband";
  if (!narrow) return false;
  const mode = (cgr.operationalMode || "").toUpperCase();
  const highTouch =
    mode === "CUSTOMER_SUPPORT" ||
    mode === "CASHIER" ||
    mode === "SALES";
  return highTouch;
}

export function buildCgrForWebsiteChat(
  siteConfigId: string | undefined,
  visitorId: string | undefined,
  site: Record<string, unknown> | null,
  agent: Agent | null,
  opts?: { language?: string; buyerJourney?: BuyerJourney | null }
): ConversationGroundingRecord {
  const gov = getCommunicationGovernanceFromSite(site);
  const principalConflictFlag =
    gov.principalOfRecord === "owner" && gov.principalConflictPossible === true;

  const base: ConversationGroundingRecord = {
    sessionKey: visitorId ? `web:${visitorId}:${siteConfigId ?? ""}` : undefined,
    siteConfigId,
    visitorId,
    operationalMode: agent?.operationalMode ?? undefined,
    identity: {
      agentId: agent?.id,
      agentRoleId: agent?.roleType ?? undefined,
      disclosurePolicyId: gov.disclosurePolicyId,
      brandAffiliationSiteId: siteConfigId,
    },
    ability: {
      permittedModalities: ["text", "voice", "canvas", "sms"],
      maxRiskClass: "medium",
    },
    space: {
      channel: "web",
      language: opts?.language ?? "en",
    },
    focus: {
      primaryObjective: "assist_visitor",
      // Attach persisted buyer journey when available so prompt compiler can inject context
      ...(opts?.buyerJourney ? { buyerJourney: opts.buyerJourney } : {}),
    } as ConversationGroundingRecord['focus'] & { buyerJourney?: BuyerJourney },
    time: {
      interactionMode: "chat_turns",
      responseBudgetMs: 8000,
    },
    principalOfRecord: gov.principalOfRecord,
    principalConflictFlag,
    recommendedHandoff: "none",
  };

  if (shouldRecommendCanvasHandoff(base)) {
    base.recommendedHandoff = "sms_canvas";
  }
  return base;
}

export function buildCgrForAgentChat(
  agent: Agent,
  site?: Record<string, unknown> | null
): ConversationGroundingRecord {
  const gov = site ? getCommunicationGovernanceFromSite(site) : parseCommunicationGovernance({});
  const principalConflictFlag =
    gov.principalOfRecord === "owner" && gov.principalConflictPossible === true;

  return {
    siteConfigId: agent.siteConfigId ?? undefined,
    operationalMode: agent.operationalMode ?? undefined,
    identity: {
      agentId: agent.id,
      agentRoleId: agent.roleType ?? undefined,
      disclosurePolicyId: gov.disclosurePolicyId,
    },
    ability: {
      permittedModalities: ["text", "voice", "canvas"],
      maxRiskClass: "low",
    },
    space: { channel: "web", language: "en" },
    focus: { primaryObjective: "internal_project_chat" },
    time: { interactionMode: "chat_turns", responseBudgetMs: 12000 },
    principalOfRecord: gov.principalOfRecord,
    principalConflictFlag,
    recommendedHandoff: "none",
  };
}
