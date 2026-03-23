/**
 * Knowledge Gap Analysis (v1) — heuristic “observed proficiency” vs role minimum.
 * See docs-governance/KNOWLEDGE_PLAN_ORCHESTRATOR.md. Not RAG similarity; artifact + Places boosts.
 */

import type { Agent, KnowledgeArtifact, SiteConfig } from "@shared/schema";
import { storage } from "../storage";

export type KnowledgeDimensionId =
  | "hours_location"
  | "pricing_menu"
  | "policies_returns"
  | "booking_contact"
  | "brand_story";

export interface KnowledgeDimensionSpec {
  id: KnowledgeDimensionId;
  label: string;
  /** Match if any pattern matches artifact title or content. */
  patterns: RegExp[];
}

/** v1 ladder: dimensions most concierge-style roles should cover. */
export const KNOWLEDGE_DIMENSIONS: KnowledgeDimensionSpec[] = [
  {
    id: "hours_location",
    label: "Hours & location",
    patterns: [/hour/i, /\bopen\b/i, /address/i, /location/i, /\bmap\b/i, /direction/i],
  },
  {
    id: "booking_contact",
    label: "Booking & contact",
    patterns: [/book/i, /reserv/i, /appoint/i, /contact/i, /phone/i, /call\b/i, /email/i],
  },
  {
    id: "pricing_menu",
    label: "Pricing / menu / services",
    patterns: [/price/i, /\$\d/, /menu/i, /cost/i, /fee/i, /rate/i, /service/i],
  },
  {
    id: "policies_returns",
    label: "Policies & returns",
    patterns: [/policy/i, /return/i, /refund/i, /cancel/i, /warrant/i, /terms/i],
  },
  {
    id: "brand_story",
    label: "Brand & story",
    patterns: [/about\b/i, /story/i, /mission/i, /why\b/i, /founded/i, /team/i],
  },
];

export interface RoleKnowledgeProfile {
  id: string;
  label: string;
  /** Dimensions that must be non-zero for “no conflict” at minimum tier. */
  requiredDimensions: KnowledgeDimensionId[];
  /** Minimum mean score (0–10) across required dimensions. */
  minimumMeanScore: number;
}

/** v1 defaults keyed by agent roleType (fallback: general). */
export const ROLE_KNOWLEDGE_PROFILES: Record<string, RoleKnowledgeProfile> = {
  concierge: {
    id: "concierge",
    label: "Concierge",
    requiredDimensions: ["hours_location", "booking_contact", "brand_story"],
    minimumMeanScore: 5,
  },
  booking_coordinator: {
    id: "booking_coordinator",
    label: "Booking coordinator",
    requiredDimensions: ["hours_location", "booking_contact", "pricing_menu"],
    minimumMeanScore: 6,
  },
  lead_qualifier: {
    id: "lead_qualifier",
    label: "Lead qualifier",
    requiredDimensions: ["booking_contact", "brand_story"],
    minimumMeanScore: 4,
  },
  general: {
    id: "general",
    label: "General",
    requiredDimensions: ["hours_location", "booking_contact"],
    minimumMeanScore: 4,
  },
};

function contentStrengthScore(text: string): number {
  const t = text.trim();
  if (t.length < 24) return 0;
  if (t.length < 120) return 4;
  if (t.length < 400) return 7;
  return 10;
}

function bestArtifactScoreForDimension(
  artifacts: KnowledgeArtifact[],
  spec: KnowledgeDimensionSpec
): number {
  let best = 0;
  for (const a of artifacts) {
    const blob = `${a.title}\n${a.content ?? ""}`;
    if (!spec.patterns.some((p) => p.test(blob))) continue;
    best = Math.max(best, contentStrengthScore(blob));
  }
  return best;
}

function knowledgeLibraryCount(site: SiteConfig): number {
  const lib = site.knowledgeLibrary;
  if (!lib) return 0;
  if (Array.isArray(lib)) return lib.length;
  if (typeof lib === "object") return 1;
  return 0;
}

function mergeLibraryText(site: SiteConfig): string {
  const lib = site.knowledgeLibrary;
  if (!lib) return "";
  if (Array.isArray(lib)) {
    return lib
      .map((entry: unknown) => {
        if (!entry || typeof entry !== "object") return "";
        const o = entry as Record<string, unknown>;
        return `${o.title ?? ""}\n${o.content ?? ""}`;
      })
      .join("\n");
  }
  return "";
}

/** Boost hours/location from Google Places–style place_data (entity truth). */
function placeDataBoosts(placeData: unknown): Partial<Record<KnowledgeDimensionId, number>> {
  const out: Partial<Record<KnowledgeDimensionId, number>> = {};
  if (!placeData || typeof placeData !== "object") return out;
  const p = placeData as Record<string, unknown>;
  const addr =
    typeof p.formatted_address === "string"
      ? p.formatted_address
      : typeof p.formattedAddress === "string"
        ? p.formattedAddress
        : "";
  const hasHours =
    p.opening_hours != null ||
    p.openingHours != null ||
    p.currentOpeningHours != null ||
    (Array.isArray(p.weekday_text) && (p.weekday_text as unknown[]).length > 0);
  if (addr && String(addr).length > 8) {
    out.hours_location = Math.max(out.hours_location ?? 0, 6);
  }
  if (hasHours) {
    out.hours_location = Math.max(out.hours_location ?? 0, 7);
  }
  const phone =
    typeof p.formatted_phone_number === "string"
      ? p.formatted_phone_number
      : typeof p.internationalPhoneNumber === "string"
        ? p.internationalPhoneNumber
        : "";
  if (phone && String(phone).length >= 7) {
    out.booking_contact = Math.max(out.booking_contact ?? 0, 6);
  }
  return out;
}

function pickProfileForAgents(agentList: Agent[]): RoleKnowledgeProfile {
  const types = new Set<string>();
  for (const a of agentList) {
    const t = (a.roleType || "").trim();
    types.add(t || "general");
  }
  if (types.size === 0) types.add("general");

  let maxMin = 0;
  const dims = new Set<KnowledgeDimensionId>();
  for (const t of types) {
    const p = ROLE_KNOWLEDGE_PROFILES[t] ?? ROLE_KNOWLEDGE_PROFILES.general;
    maxMin = Math.max(maxMin, p.minimumMeanScore);
    for (const d of p.requiredDimensions) {
      dims.add(d);
    }
  }
  const fallback = ROLE_KNOWLEDGE_PROFILES.general;
  if (dims.size === 0) {
    for (const d of fallback.requiredDimensions) dims.add(d);
    maxMin = Math.max(maxMin, fallback.minimumMeanScore);
  }

  return {
    id: "merged",
    label: "Merged role requirements",
    requiredDimensions: Array.from(dims),
    minimumMeanScore: Math.max(maxMin, fallback.minimumMeanScore),
  };
}

export interface DimensionResult {
  id: KnowledgeDimensionId;
  label: string;
  /** 0–10 */
  score: number;
  required: boolean;
}

export interface KnowledgeGapReport {
  siteConfigId: string;
  siteName: string;
  profileId: string;
  profileLabel: string;
  artifactCount: number;
  knowledgeLibraryEntryCount: number;
  dimensions: DimensionResult[];
  /** Mean of scores for required dimensions only. */
  observedMeanRequired: number;
  requiredMinimum: number;
  /** True if any required dimension is 0 OR mean < minimum. */
  atRisk: boolean;
  notes: string[];
}

export async function analyzeKnowledgeGapForSite(siteConfigId: string): Promise<KnowledgeGapReport | null> {
  const site = await storage.getSiteConfig(siteConfigId);
  if (!site) return null;

  const agents = await storage.getAgentsBySiteConfigId(siteConfigId);
  const profile = pickProfileForAgents(agents);

  const artifacts = await storage.listKnowledgeArtifactsForContext({ siteConfigId });
  const libText = mergeLibraryText(site);
  const combinedFromArtifacts = artifacts.map((a) => `${a.title}\n${a.content ?? ""}`).join("\n");
  const combined = `${combinedFromArtifacts}\n${libText}`;

  const placeBoost = placeDataBoosts(site.placeData);

  const dimensions: DimensionResult[] = KNOWLEDGE_DIMENSIONS.map((spec) => {
    const fromArt = bestArtifactScoreForDimension(artifacts, spec);
    let score = fromArt;
    if (libText && spec.patterns.some((p) => p.test(libText))) {
      score = Math.max(score, contentStrengthScore(libText));
    }
    const boost = placeBoost[spec.id];
    if (boost != null) {
      score = Math.max(score, boost);
    }
    const required = profile.requiredDimensions.includes(spec.id);
    return {
      id: spec.id,
      label: spec.label,
      score,
      required,
    };
  });

  const requiredScores = dimensions.filter((d) => d.required).map((d) => d.score);
  const observedMeanRequired =
    requiredScores.length === 0
      ? 0
      : requiredScores.reduce((a, b) => a + b, 0) / requiredScores.length;

  const anyRequiredZero = dimensions.some((d) => d.required && d.score === 0);
  const belowMean = observedMeanRequired < profile.minimumMeanScore;
  const atRisk = anyRequiredZero || belowMean;

  const notes: string[] = [];
  if (artifacts.length === 0 && knowledgeLibraryCount(site) === 0) {
    notes.push("No knowledge_artifacts rows and no knowledge_library entries — proficiency is entity-only if place_data exists.");
  }
  if (anyRequiredZero) {
    notes.push("At least one required dimension has score 0 (no matching artifact or library content).");
  }
  if (belowMean) {
    notes.push(
      `Observed mean across required dimensions (${observedMeanRequired.toFixed(1)}) is below profile minimum (${profile.minimumMeanScore}).`
    );
  }

  return {
    siteConfigId: site.id,
    siteName: site.name,
    profileId: profile.id,
    profileLabel: profile.label,
    artifactCount: artifacts.length,
    knowledgeLibraryEntryCount: knowledgeLibraryCount(site),
    dimensions,
    observedMeanRequired,
    requiredMinimum: profile.minimumMeanScore,
    atRisk,
    notes,
  };
}

export interface AtRiskSiteSummary {
  siteConfigId: string;
  siteName: string;
  atRisk: boolean;
  observedMeanRequired: number;
  requiredMinimum: number;
  profileId: string;
}

export async function analyzeAllSitesForGapSummary(): Promise<AtRiskSiteSummary[]> {
  const sites = await storage.getSiteConfigs();
  const out: AtRiskSiteSummary[] = [];
  for (const s of sites) {
    const report = await analyzeKnowledgeGapForSite(s.id);
    if (!report) continue;
    out.push({
      siteConfigId: report.siteConfigId,
      siteName: report.siteName,
      atRisk: report.atRisk,
      observedMeanRequired: report.observedMeanRequired,
      requiredMinimum: report.requiredMinimum,
      profileId: report.profileId,
    });
  }
  return out.sort((a, b) => a.siteName.localeCompare(b.siteName));
}
