/**
 * Phase 5D — Voice Bridge: compact certification snapshot + Live tool-name filter.
 * Browser Live (`geminiVoice.ts`) integration is documented in docs-governance/VOICE_PHASE_5D_BRIDGE.md
 * (file is governance-lockdown; execution gate already via toolHandler.assertKnowledgeToolForSession).
 */

import type { BusinessContext } from "./promptCompiler";
import {
  certificationFromGapReport,
  getCachedKnowledgeGapReport,
  PRICING_SENSITIVE_TOOLS,
} from "./knowledgeCertificationContext";

/** Serialized on VoiceSession; keep under ~1KB JSON. */
export interface VoiceKnowledgeSnapshot {
  v: 1;
  siteConfigId: string;
  generatedAt: string;
  atRisk: boolean;
  observedMeanRequired: number;
  requiredMinimum: number;
  pricingMenuScore: number;
  pricingMenuRequired: boolean;
  /** When true, omit pricing-sensitive tools from Live functionDeclarations. */
  blockPricingSensitiveTools: boolean;
  restrictedDimensionLabels: string[];
}

export async function buildVoiceKnowledgeSnapshot(
  siteConfigId: string,
): Promise<VoiceKnowledgeSnapshot | null> {
  const report = await getCachedKnowledgeGapReport(siteConfigId);
  if (!report) return null;
  const pm = report.dimensions.find((d) => d.id === "pricing_menu");
  const pricingMenuScore = pm?.score ?? 0;
  const pricingMenuRequired = pm?.required ?? false;
  const blockPricingSensitiveTools = pricingMenuRequired && pricingMenuScore < 5;
  const cert = certificationFromGapReport(report);
  return {
    v: 1,
    siteConfigId,
    generatedAt: new Date().toISOString(),
    atRisk: report.atRisk,
    observedMeanRequired: report.observedMeanRequired,
    requiredMinimum: report.requiredMinimum,
    pricingMenuScore,
    pricingMenuRequired,
    blockPricingSensitiveTools,
    restrictedDimensionLabels: cert.restrictedDimensionLabels.slice(0, 12),
  };
}

/**
 * Apply the same rule as toolHandler: strip pricing Live tools when uncertified.
 */
export function filterToolNamesForVoiceKnowledge(
  effectiveAllowed: string[],
  snapshot: VoiceKnowledgeSnapshot | null | undefined,
): string[] {
  if (!snapshot?.blockPricingSensitiveTools) {
    return effectiveAllowed;
  }
  return effectiveAllowed.filter((n) => !PRICING_SENSITIVE_TOOLS.has(n));
}

/**
 * For future use in geminiVoice contextual snap: merge certification into BusinessContext
 * so buildBehavioralPrompt injects KNOWLEDGE CERTIFICATION GATES.
 */
export async function buildBusinessContextWithVoiceKnowledge(
  base: BusinessContext,
  siteConfigId: string,
): Promise<BusinessContext> {
  const report = await getCachedKnowledgeGapReport(siteConfigId);
  if (!report) return base;
  return {
    ...base,
    knowledgeCertification: certificationFromGapReport(report),
  };
}
