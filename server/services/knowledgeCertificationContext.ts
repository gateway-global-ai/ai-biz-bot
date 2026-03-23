/**
 * Phase 5C — maps Knowledge Gap reports to policy inputs and tool gates.
 * See docs-governance/SAFE_MODE_CONTRACT.md § Phase 5B.
 */
import type { KnowledgeCertificationInput } from "./promptCompiler";
import type { KnowledgeGapReport } from "./knowledgeGapAnalysis";
import { analyzeKnowledgeGapForSite } from "./knowledgeGapAnalysis";

/** Same shape as ToolCallContext.siteConfigId — avoid importing toolHandler (circular). */
export interface KnowledgeToolGateContext {
  siteConfigId?: string | null;
}

const cache = new Map<string, { report: KnowledgeGapReport; at: number }>();
const TTL_MS = 60_000;

/** Tools that must not run when pricing/menu dimension is below certification threshold. */
export const PRICING_SENSITIVE_TOOLS = new Set([
  "get_hotel_inventory",
  "get_booking_and_pricing_info",
]);

export async function getCachedKnowledgeGapReport(
  siteConfigId: string,
): Promise<KnowledgeGapReport | null> {
  const now = Date.now();
  const hit = cache.get(siteConfigId);
  if (hit && now - hit.at < TTL_MS) {
    return hit.report;
  }
  const report = await analyzeKnowledgeGapForSite(siteConfigId);
  if (report) {
    cache.set(siteConfigId, { report, at: now });
  }
  return report;
}

/**
 * Required dimension with score &lt; 5 treated as uncertified for pricing-adjacent tools
 * (aligns with admin “warn/critical” band in KnowledgeProficiencyCard).
 */
export function certificationFromGapReport(report: KnowledgeGapReport): KnowledgeCertificationInput {
  const restrictedDimensionLabels = report.dimensions
    .filter((d) => d.required && d.score < 5)
    .map((d) => d.label);
  return {
    atRisk: report.atRisk,
    observedMeanRequired: report.observedMeanRequired,
    requiredMinimum: report.requiredMinimum,
    restrictedDimensionLabels,
    notes: report.notes,
  };
}

export function assertToolAllowedByKnowledgeCert(
  toolName: string,
  report: KnowledgeGapReport | null,
): { ok: true } | { ok: false; message: string } {
  if (!report || !PRICING_SENSITIVE_TOOLS.has(toolName)) {
    return { ok: true };
  }
  const dim = report.dimensions.find((d) => d.id === "pricing_menu");
  if (!dim) return { ok: true };
  if (dim.required && dim.score < 5) {
    return {
      ok: false,
      message:
        "Knowledge certification: pricing and menu are not certified for this site. Do not quote specific rates or availability from tools; offer the official booking link, phone, or a staff handoff.",
    };
  }
  return { ok: true };
}

/**
 * Execution-plane gate for site-anchored tool calls (Live API, etc.).
 */
export async function assertKnowledgeToolForSession(
  toolName: string,
  context?: KnowledgeToolGateContext,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sid = context?.siteConfigId;
  if (!sid || !PRICING_SENSITIVE_TOOLS.has(toolName)) {
    return { ok: true };
  }
  const report = await getCachedKnowledgeGapReport(sid);
  return assertToolAllowedByKnowledgeCert(toolName, report);
}
