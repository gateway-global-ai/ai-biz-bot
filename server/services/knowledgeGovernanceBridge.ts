/**
 * Knowledge Governance Bridge — runtime filter between knowledge sources
 * and the prompt compiler.
 *
 * Doctrine 11: Knowledge is input, not authority.
 *
 * This bridge:
 *   1. Takes a PolicyDecision (with allowedKnowledgeLevels)
 *   2. Loads knowledge items from all sources for the site
 *   3. Classifies each item by certification level and source type
 *   4. Filters by the policy-permitted levels
 *   5. Returns only admitted knowledge for prompt injection
 *
 * This replaces the raw `knowledgeLibrary.map(d => d.content).join()` pattern
 * with a governed pipeline that respects certification.
 */

import type { PolicyDecision } from "@shared/policyDecisionContract";
import {
  type KnowledgeFilterContext,
  type KnowledgeFilterResult,
  type KnowledgeItem,
  type KnowledgeRejection,
  type KnowledgeCertificationLevel,
  type KnowledgeSourceType,
  SOURCE_CONFLICT_PRIORITY,
  KNOWLEDGE_FILTER_PRESETS,
  KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION,
  filterKnowledgeByCertification,
  classifyArtifactCertification,
  classifyLibraryEntryCertification,
} from "@shared/knowledgeCertificationContract";
import { storage } from "../storage";
import { getCachedKnowledgeGapReport, certificationFromGapReport } from "./knowledgeCertificationContext";
import type { KnowledgeCertificationInput } from "./promptCompiler";

export interface GovernedKnowledgeResult {
  /** Items that passed certification filter — safe to inject into prompt. */
  admittedItems: KnowledgeItem[];
  /** Items that require a disclaimer prefix in the prompt. */
  disclaimerItems: KnowledgeItem[];
  /** Items that were filtered out by certification policy. */
  rejectedCount: number;
  /** Structured rejection reasons for audit trail. */
  rejections: KnowledgeRejection[];
  /** The filter context that was applied. */
  filterContext: KnowledgeFilterContext;
  /** Existing Phase 5C certification input (backward compat). */
  certificationInput: KnowledgeCertificationInput | undefined;
  /** Knowledge block text — governed replacement for raw library concatenation. */
  knowledgeBlock: string;
  /** Filter duration in milliseconds (for audit). */
  filterDurationMs: number;
  /** Total candidates before filtering. */
  totalCandidates: number;
}

/**
 * Resolve the knowledge filter context from a PolicyDecision.
 * Falls back to the concierge_qa preset if no knowledge constraints are set.
 */
export function resolveKnowledgeFilter(
  policyDecision?: PolicyDecision | null,
  presetKey?: string,
): KnowledgeFilterContext {
  if (presetKey && KNOWLEDGE_FILTER_PRESETS[presetKey]) {
    const preset = { ...KNOWLEDGE_FILTER_PRESETS[presetKey] };

    if (policyDecision?.allowedKnowledgeLevels) {
      preset.allowedLevels = policyDecision.allowedKnowledgeLevels as KnowledgeCertificationLevel[];
    }
    if (policyDecision?.allowedKnowledgeSourceTypes) {
      preset.allowedSourceTypes = policyDecision.allowedKnowledgeSourceTypes as KnowledgeSourceType[];
    }

    return preset;
  }

  if (policyDecision?.allowedKnowledgeLevels) {
    return {
      contractVersion: KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION,
      allowedLevels: policyDecision.allowedKnowledgeLevels as KnowledgeCertificationLevel[],
      allowedSourceTypes: (policyDecision.allowedKnowledgeSourceTypes as KnowledgeSourceType[]) ?? ["system", "owner", "web", "external"],
      requireDisclaimerForLevels: ["unverified"],
      maxItems: 50,
      siteConfigId: policyDecision.siteConfigId,
    };
  }

  return KNOWLEDGE_FILTER_PRESETS.concierge_qa;
}

/**
 * Build classified KnowledgeItems from a site's knowledge_library entries.
 */
function classifyLibraryEntries(
  knowledgeLibrary: unknown,
  siteConfigId: string,
): KnowledgeItem[] {
  if (!knowledgeLibrary || !Array.isArray(knowledgeLibrary)) return [];

  return knowledgeLibrary.map((entry: Record<string, unknown>, idx: number) => {
    const { level, sourceType } = classifyLibraryEntryCertification({
      title: typeof entry.title === "string" ? entry.title : undefined,
      content: typeof entry.content === "string" ? entry.content : undefined,
      category: typeof entry.category === "string" ? entry.category : undefined,
      sourceType: typeof entry.sourceType === "string" ? entry.sourceType : undefined,
    });

    return {
      knowledgeId: typeof entry.id === "string" ? entry.id : `lib-${siteConfigId}-${idx}`,
      sourceId: "knowledge_library",
      sourceType,
      siteConfigId,
      title: typeof entry.title === "string" ? entry.title : "",
      content: typeof entry.content === "string" ? entry.content : "",
      certificationLevel: level,
      certificationSource: "auto_heuristic" as const,
      confidenceScore: 0.7,
      trustWeight: level === "approved" ? 9 : level === "trusted" ? 6 : 3,
    };
  });
}

/**
 * Build classified KnowledgeItems from knowledge_artifacts rows.
 * Uses DB-level certification columns when present; falls back to heuristic.
 */
function classifyArtifacts(
  artifacts: Array<{
    id: string;
    title: string;
    content?: string | null;
    trustWeight?: number | null;
    scope?: string | null;
    visibility?: string | null;
    sourcePath?: string | null;
    siteConfigId?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    certificationLevel?: string | null;
    certificationSource?: string | null;
    confidenceScore?: string | null;
    expiresAt?: Date | null;
    lastValidatedAt?: Date | null;
    refreshIntervalHours?: number | null;
    agentId?: string | null;
    swarmRole?: string | null;
    conflictPriority?: number | null;
  }>,
): KnowledgeItem[] {
  return artifacts.map((a) => {
    const hasDbCert = a.certificationLevel && a.certificationLevel !== "unverified";
    const { level: heuristicLevel, sourceType: heuristicSourceType } = classifyArtifactCertification(a);

    const sourceType = (a.sourceType as KnowledgeSourceType) || heuristicSourceType;
    const certLevel = hasDbCert
      ? (a.certificationLevel as KnowledgeCertificationLevel)
      : heuristicLevel;

    return {
      knowledgeId: a.id,
      sourceId: a.sourceId || "knowledge_artifacts",
      sourceType,
      siteConfigId: a.siteConfigId ?? undefined,
      title: a.title,
      content: a.content ?? "",
      certificationLevel: certLevel,
      certificationSource: (a.certificationSource as "system" | "operator" | "ai_assisted" | "auto_heuristic") || "auto_heuristic",
      confidenceScore: a.confidenceScore ? parseFloat(a.confidenceScore) : (certLevel === "approved" ? 0.9 : certLevel === "trusted" ? 0.7 : 0.4),
      trustWeight: a.trustWeight ?? 5,
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : undefined,
      lastValidatedAt: a.lastValidatedAt ? a.lastValidatedAt.toISOString() : undefined,
      refreshIntervalHours: a.refreshIntervalHours ?? undefined,
      agentId: a.agentId ?? undefined,
      swarmRole: a.swarmRole ?? undefined,
      conflictPriority: a.conflictPriority ?? SOURCE_CONFLICT_PRIORITY[sourceType] ?? 50,
    };
  });
}

const KNOWLEDGE_CAP = 32_000;

/**
 * Build the governed knowledge block text from admitted items.
 */
function buildGovernedKnowledgeBlock(
  admitted: KnowledgeItem[],
  disclaimerItems: KnowledgeItem[],
): string {
  if (admitted.length === 0) return "";

  const disclaimerIds = new Set(disclaimerItems.map((d) => d.knowledgeId));
  const parts: string[] = [
    "\n\n--- KNOWLEDGE LIBRARY (certified and governed — use this to answer questions accurately) ---\n",
  ];

  for (const item of admitted) {
    const needsDisclaimer = disclaimerIds.has(item.knowledgeId);
    const prefix = needsDisclaimer
      ? `[UNVERIFIED — present with appropriate hedging] `
      : "";
    const certLabel = `[${item.certificationLevel.toUpperCase()} | ${item.sourceType}]`;
    parts.push(`## ${prefix}${item.title} ${certLabel}\n${item.content}`);
  }

  const combined = parts.join("\n\n---\n\n");
  if (combined.length > KNOWLEDGE_CAP) {
    return combined.slice(0, KNOWLEDGE_CAP) + "\n\n[truncated]";
  }
  return combined;
}

/**
 * Main entry point — assemble governed knowledge for a site.
 *
 * Call this from chatRoutes, voiceKnowledgeBridge, or any path
 * that injects knowledge into the model's context.
 */
export async function assembleGovernedKnowledge(
  siteConfigId: string,
  policyDecision?: PolicyDecision | null,
  presetKey?: string,
  opts?: { agentId?: string; swarmRole?: string; sessionId?: string; channel?: string },
): Promise<GovernedKnowledgeResult> {
  const startMs = Date.now();
  const filterContext = resolveKnowledgeFilter(policyDecision, presetKey);

  if (opts?.agentId) filterContext.agentId = opts.agentId;
  if (opts?.swarmRole) filterContext.swarmRole = opts.swarmRole;

  const [siteConfig, artifacts, gapReport] = await Promise.all([
    storage.getSiteConfig(siteConfigId),
    storage.listKnowledgeArtifactsForContext({ siteConfigId }),
    getCachedKnowledgeGapReport(siteConfigId),
  ]);

  const allItems: KnowledgeItem[] = [];

  if (siteConfig) {
    allItems.push(...classifyLibraryEntries(siteConfig.knowledgeLibrary, siteConfigId));
  }

  allItems.push(...classifyArtifacts(artifacts));

  const totalCandidates = allItems.length;
  const { admitted, rejected, rejections, disclaimerRequired } =
    filterKnowledgeByCertification(allItems, filterContext);

  let certificationInput: KnowledgeCertificationInput | undefined;
  if (gapReport) {
    certificationInput = certificationFromGapReport(gapReport);
  }

  const knowledgeBlock = buildGovernedKnowledgeBlock(admitted, disclaimerRequired);
  const filterDurationMs = Date.now() - startMs;

  logKnowledgeAudit(siteConfigId, {
    sessionId: opts?.sessionId,
    channel: opts?.channel ?? "chat",
    presetKey: presetKey ?? null,
    policyGate: policyDecision?.policyGate ?? null,
    totalCandidates,
    admittedCount: admitted.length,
    rejectedCount: rejected.length,
    disclaimerCount: disclaimerRequired.length,
    allowedLevels: filterContext.allowedLevels,
    allowedSourceTypes: filterContext.allowedSourceTypes,
    admittedIds: admitted.map((i) => i.knowledgeId),
    rejectedIds: rejected.map((i) => i.knowledgeId),
    rejections,
    knowledgeBlockChars: knowledgeBlock.length,
    filterDurationMs,
  });

  return {
    admittedItems: admitted,
    disclaimerItems: disclaimerRequired,
    rejectedCount: rejected.length,
    rejections,
    filterContext,
    certificationInput,
    knowledgeBlock,
    filterDurationMs,
    totalCandidates,
  };
}

/**
 * Async audit log — fire-and-forget write to knowledge_audit_log.
 * Non-blocking: failures are logged but do not break the prompt path.
 */
function logKnowledgeAudit(
  siteConfigId: string,
  data: {
    sessionId?: string;
    channel: string;
    presetKey: string | null;
    policyGate: string | null;
    totalCandidates: number;
    admittedCount: number;
    rejectedCount: number;
    disclaimerCount: number;
    allowedLevels: string[];
    allowedSourceTypes: string[];
    admittedIds: string[];
    rejectedIds: string[];
    rejections: KnowledgeRejection[];
    knowledgeBlockChars: number;
    filterDurationMs: number;
  },
): void {
  try {
    const { db } = require("../db");
    const { knowledgeAuditLog } = require("@shared/schema");

    db.insert(knowledgeAuditLog)
      .values({
        siteConfigId,
        sessionId: data.sessionId ?? null,
        channel: data.channel,
        presetKey: data.presetKey,
        policyGate: data.policyGate,
        totalCandidates: data.totalCandidates,
        admittedCount: data.admittedCount,
        rejectedCount: data.rejectedCount,
        disclaimerCount: data.disclaimerCount,
        allowedLevels: data.allowedLevels,
        allowedSourceTypes: data.allowedSourceTypes,
        admittedIds: data.admittedIds.slice(0, 200),
        rejectedIds: data.rejectedIds.slice(0, 200),
        rejectionReasons: data.rejections.slice(0, 200),
        knowledgeBlockChars: data.knowledgeBlockChars,
        filterDurationMs: data.filterDurationMs,
      })
      .execute()
      .catch((err: unknown) => {
        console.warn("[KnowledgeAudit] Failed to log audit entry:", err instanceof Error ? err.message : err);
      });
  } catch {
    // DB/schema not available (e.g. test context) — skip silently
  }
}
