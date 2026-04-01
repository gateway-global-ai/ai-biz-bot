/**
 * Knowledge Certification Contract (v1).
 *
 * Governs how knowledge enters the system, how it is classified by trust,
 * and how policy filters it before the model sees it.
 *
 * Core invariant (Doctrine 11):
 *   Knowledge is input, not authority. The control plane decides what
 *   knowledge is admissible. The model processes what it receives.
 *   No knowledge source — including the model itself — is treated
 *   as authoritative without explicit certification.
 *
 * Consumed by:
 *   - knowledgeCertificationContext.ts  → maps gap reports to certification
 *   - promptCompiler.ts                → filters knowledge by level before injection
 *   - PolicyDecision                   → constrains allowedKnowledgeLevels per gate
 *   - knowledge-routes.ts             → enforces certification on ingest
 *   - voiceKnowledgeBridge.ts         → filters knowledge before voice prompt
 *
 * Registry authority: registry-yaml/knowledge-sources.yaml
 */

import { z } from "zod";

export const KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION =
  "knowledge_certification.v1" as const;

/**
 * Source type classification — where did this knowledge come from?
 *
 * system:   Structured integrations (PMS, billing, CRM), internal DB,
 *           registry-backed data. Highest provenance.
 * owner:    Operator-uploaded documents (PDFs, SOPs, policies).
 *           Scoped to the site that uploaded them.
 * web:      Scraped/crawled content (business websites, menu pages).
 *           Must be labeled and periodically refreshed.
 * external: Third-party API data (SerpAPI reviews, Places enrichment).
 *           Useful but not operator-verified.
 * inference: LLM-generated content (summaries, classifications, reasoning).
 *           NEVER authoritative for facts. HIGH for reasoning only.
 */
export const KNOWLEDGE_SOURCE_TYPES = [
  "system",
  "owner",
  "web",
  "external",
  "inference",
] as const;

export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

/**
 * Certification levels — how much should the system trust this knowledge?
 *
 * approved:    Explicitly certified by system or operator. Safe for
 *              billing, pricing, contractual claims, policy statements.
 * trusted:     High confidence from verified source (e.g. Places data,
 *              PMS integration). Safe for general Q&A and concierge.
 * unverified:  Ingested but not yet certified. May be used with
 *              disclaimers for general chat. NOT for financial/legal claims.
 * rejected:    Explicitly marked as unreliable, outdated, or harmful.
 *              Must NEVER be passed to the model.
 */
export const KNOWLEDGE_CERTIFICATION_LEVELS = [
  "approved",
  "trusted",
  "unverified",
  "rejected",
] as const;

export type KnowledgeCertificationLevel =
  (typeof KNOWLEDGE_CERTIFICATION_LEVELS)[number];

/**
 * Who or what certified this knowledge?
 *
 * system:      Automatic certification (e.g. PMS integration data,
 *              Places API response, structured DB query result).
 * operator:    Human operator explicitly approved/rejected.
 * ai_assisted: AI-assisted classification confirmed by operator.
 * auto_heuristic: Gap analysis heuristic score met threshold.
 */
export const KNOWLEDGE_CERTIFICATION_SOURCES = [
  "system",
  "operator",
  "ai_assisted",
  "auto_heuristic",
] as const;

export type KnowledgeCertificationSource =
  (typeof KNOWLEDGE_CERTIFICATION_SOURCES)[number];

/**
 * A knowledge source — a declared origin for knowledge items.
 * Must be registered in registry-yaml/knowledge-sources.yaml.
 */
export const KnowledgeSourceSchema = z.object({
  sourceId: z.string().min(1),
  sourceType: z.enum(KNOWLEDGE_SOURCE_TYPES),
  label: z.string().min(1),
  defaultCertificationLevel: z.enum(KNOWLEDGE_CERTIFICATION_LEVELS),
  refreshIntervalHours: z.number().int().positive().optional(),
  siteScoped: z.boolean().default(true),
});

export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;

/**
 * Conflict resolution priority — when two knowledge items cover the same
 * topic, higher priority wins. Derived from source type by default.
 */
export const SOURCE_CONFLICT_PRIORITY: Record<KnowledgeSourceType, number> = {
  system: 100,
  owner: 75,
  web: 50,
  external: 50,
  inference: 25,
};

/**
 * A knowledge item — one unit of knowledge with provenance and certification.
 */
export const KnowledgeItemSchema = z.object({
  knowledgeId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceType: z.enum(KNOWLEDGE_SOURCE_TYPES),
  siteConfigId: z.string().optional(),

  title: z.string().default(""),
  content: z.string().default(""),
  structuredData: z.record(z.unknown()).optional(),
  extractedEntities: z.array(z.string()).optional(),

  certificationLevel: z.enum(KNOWLEDGE_CERTIFICATION_LEVELS),
  certificationSource: z.enum(KNOWLEDGE_CERTIFICATION_SOURCES),
  confidenceScore: z.number().min(0).max(1).default(0.5),
  trustWeight: z.number().int().min(0).max(10).default(5),

  certifiedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  lastValidatedAt: z.string().datetime().optional(),
  refreshIntervalHours: z.number().int().positive().optional(),

  dimensionId: z.string().optional(),

  agentId: z.string().optional(),
  swarmRole: z.string().optional(),

  conflictPriority: z.number().int().min(0).max(100).default(50),
});

export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

/**
 * Knowledge filter context — what certification levels the current
 * policy decision allows for knowledge injection.
 *
 * This is the bridge between PolicyDecision and knowledge assembly.
 * The intent loop resolver sets this based on the active gate.
 */
export const KnowledgeFilterContextSchema = z.object({
  contractVersion: z.literal(KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION),
  allowedLevels: z
    .array(z.enum(KNOWLEDGE_CERTIFICATION_LEVELS))
    .min(1)
    .default(["approved", "trusted"]),
  allowedSourceTypes: z
    .array(z.enum(KNOWLEDGE_SOURCE_TYPES))
    .default(["system", "owner", "web", "external"]),
  requireDisclaimerForLevels: z
    .array(z.enum(KNOWLEDGE_CERTIFICATION_LEVELS))
    .default(["unverified"]),
  maxItems: z.number().int().positive().default(50),
  siteConfigId: z.string().optional(),
  /** Scope binding: filter to specific agent (null = all). */
  agentId: z.string().optional(),
  /** Scope binding: filter to specific swarm role (null = all). */
  swarmRole: z.string().optional(),
  /** When true, resolve conflicts by keeping highest-priority item per dimension. */
  resolveConflicts: z.boolean().default(false),
});

export type KnowledgeFilterContext = z.infer<
  typeof KnowledgeFilterContextSchema
>;

/**
 * Default filter presets by scenario.
 *
 * billing_action:  Only approved knowledge. No guessing on money.
 * concierge_qa:    Approved + trusted. General customer service.
 * general_chat:    Approved + trusted + unverified (with disclaimers).
 * voice_live:      Approved + trusted only (no time for disclaimers).
 */
export const KNOWLEDGE_FILTER_PRESETS: Record<string, KnowledgeFilterContext> = {
  billing_action: {
    contractVersion: KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION,
    allowedLevels: ["approved"],
    allowedSourceTypes: ["system"],
    requireDisclaimerForLevels: [],
    maxItems: 10,
    resolveConflicts: false,
  },
  concierge_qa: {
    contractVersion: KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION,
    allowedLevels: ["approved", "trusted"],
    allowedSourceTypes: ["system", "owner", "web", "external"],
    requireDisclaimerForLevels: [],
    maxItems: 50,
    resolveConflicts: false,
  },
  general_chat: {
    contractVersion: KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION,
    allowedLevels: ["approved", "trusted", "unverified"],
    allowedSourceTypes: ["system", "owner", "web", "external"],
    requireDisclaimerForLevels: ["unverified"],
    maxItems: 50,
    resolveConflicts: false,
  },
  voice_live: {
    contractVersion: KNOWLEDGE_CERTIFICATION_CONTRACT_VERSION,
    allowedLevels: ["approved", "trusted"],
    allowedSourceTypes: ["system", "owner", "external"],
    requireDisclaimerForLevels: [],
    maxItems: 30,
    resolveConflicts: false,
  },
};

export interface KnowledgeRejection {
  knowledgeId: string;
  reason: string;
}

export interface KnowledgeFilterResult {
  admitted: KnowledgeItem[];
  rejected: KnowledgeItem[];
  rejections: KnowledgeRejection[];
  disclaimerRequired: KnowledgeItem[];
}

/**
 * Filter knowledge items by certification context.
 * This is the runtime gate — items that don't pass are not injected.
 *
 * Enforcement order:
 *   1. Rejected certification level → always excluded
 *   2. Expired items (expiresAt in the past) → excluded
 *   3. Stale items (lastValidatedAt + refreshIntervalHours exceeded) → downgrade to unverified
 *   4. Certification level not in allowedLevels → excluded
 *   5. Source type not in allowedSourceTypes → excluded
 *   6. Scope binding (agentId / swarmRole mismatch) → excluded
 *   7. Conflict resolution (highest priority per dimensionId wins)
 *   8. Cap to maxItems
 */
export function filterKnowledgeByCertification(
  items: KnowledgeItem[],
  context: KnowledgeFilterContext,
): KnowledgeFilterResult {
  const admitted: KnowledgeItem[] = [];
  const rejected: KnowledgeItem[] = [];
  const rejections: KnowledgeRejection[] = [];
  const disclaimerRequired: KnowledgeItem[] = [];
  const now = new Date();

  for (const item of items) {
    if (item.certificationLevel === "rejected") {
      rejected.push(item);
      rejections.push({ knowledgeId: item.knowledgeId, reason: "certification_rejected" });
      continue;
    }

    if (item.expiresAt && new Date(item.expiresAt) < now) {
      rejected.push(item);
      rejections.push({ knowledgeId: item.knowledgeId, reason: "expired" });
      continue;
    }

    let effectiveLevel = item.certificationLevel;
    if (
      item.lastValidatedAt &&
      item.refreshIntervalHours &&
      item.refreshIntervalHours > 0
    ) {
      const staleAfterMs = item.refreshIntervalHours * 3_600_000;
      const validatedAt = new Date(item.lastValidatedAt);
      if (now.getTime() - validatedAt.getTime() > staleAfterMs) {
        effectiveLevel = "unverified";
      }
    }

    if (!context.allowedLevels.includes(effectiveLevel)) {
      rejected.push(item);
      rejections.push({ knowledgeId: item.knowledgeId, reason: `level_${effectiveLevel}_not_allowed` });
      continue;
    }

    if (!context.allowedSourceTypes.includes(item.sourceType)) {
      rejected.push(item);
      rejections.push({ knowledgeId: item.knowledgeId, reason: `source_${item.sourceType}_not_allowed` });
      continue;
    }

    if (context.agentId && item.agentId && item.agentId !== context.agentId) {
      rejected.push(item);
      rejections.push({ knowledgeId: item.knowledgeId, reason: "agent_scope_mismatch" });
      continue;
    }

    if (context.swarmRole && item.swarmRole && item.swarmRole !== context.swarmRole) {
      rejected.push(item);
      rejections.push({ knowledgeId: item.knowledgeId, reason: "swarm_role_scope_mismatch" });
      continue;
    }

    if (context.requireDisclaimerForLevels.includes(effectiveLevel)) {
      disclaimerRequired.push(item);
    }

    admitted.push(item);
  }

  let resolved = admitted;
  if (context.resolveConflicts && resolved.length > 1) {
    resolved = resolveKnowledgeConflicts(resolved);
  }

  resolved.sort((a, b) => (b.conflictPriority ?? 50) - (a.conflictPriority ?? 50));

  const capped = resolved.slice(0, context.maxItems);
  const overflow = resolved.slice(context.maxItems);
  for (const o of overflow) {
    rejected.push(o);
    rejections.push({ knowledgeId: o.knowledgeId, reason: "max_items_exceeded" });
  }

  return { admitted: capped, rejected, rejections, disclaimerRequired };
}

/**
 * Conflict resolution: when multiple items cover the same dimension,
 * keep the highest-priority item. Items without dimensionId are always kept.
 */
function resolveKnowledgeConflicts(items: KnowledgeItem[]): KnowledgeItem[] {
  const byDimension = new Map<string, KnowledgeItem>();
  const noDimension: KnowledgeItem[] = [];

  for (const item of items) {
    if (!item.dimensionId) {
      noDimension.push(item);
      continue;
    }
    const existing = byDimension.get(item.dimensionId);
    if (!existing || (item.conflictPriority ?? 50) > (existing.conflictPriority ?? 50)) {
      byDimension.set(item.dimensionId, item);
    }
  }

  return [...noDimension, ...byDimension.values()];
}

/**
 * Classify an existing knowledge artifact into certification levels
 * based on its source characteristics and trust_weight.
 */
export function classifyArtifactCertification(artifact: {
  trustWeight?: number | null;
  scope?: string | null;
  visibility?: string | null;
  sourcePath?: string | null;
}): { level: KnowledgeCertificationLevel; sourceType: KnowledgeSourceType } {
  const tw = artifact.trustWeight ?? 5;

  if (tw >= 8) return { level: "approved", sourceType: "system" };
  if (tw >= 5) return { level: "trusted", sourceType: "owner" };
  if (tw >= 2) return { level: "unverified", sourceType: "web" };
  return { level: "rejected", sourceType: "external" };
}

// ── Review Intelligence Classification ────────────────────────────────────

/**
 * Review classification — star-based sentiment bucketing.
 * 4-5★ = experiences (what customers love)
 * 1-3★ = lessons (improvement areas)
 *
 * This is the knowledge-plane equivalent of the operational insight
 * that makes SerpAPI reviews genuinely valuable: you don't just dump
 * reviews into the model — you classify them so the agent knows
 * which are strengths to highlight and which are gaps to acknowledge.
 */
export type ReviewClassification = "experience" | "lesson";

export const REVIEW_EXPERIENCE_THRESHOLD = 4;

export interface ClassifiedReview {
  knowledgeId: string;
  sourceId: "serpapi_reviews";
  sourceType: "external";
  siteConfigId: string;
  classification: ReviewClassification;
  rating: number;
  snippet: string;
  reviewerName?: string;
  reviewDate?: string;
  details?: {
    mealType?: string;
    pricePerPerson?: string;
    food?: number;
    service?: number;
    atmosphere?: number;
  };
  topics?: string[];
  certificationLevel: KnowledgeCertificationLevel;
  certificationSource: "system";
  confidenceScore: number;
}

/**
 * Classify a single review by star rating.
 * 4-5★ → experience (trusted — safe for concierge to cite)
 * 1-3★ → lesson (trusted — agent should acknowledge, not hide)
 */
export function classifyReview(review: {
  rating: number;
  snippet: string;
  user?: { name?: string };
  date?: string;
  iso_date?: string;
  details?: Record<string, unknown>;
}, siteConfigId: string, knowledgeId: string): ClassifiedReview {
  const classification: ReviewClassification =
    review.rating >= REVIEW_EXPERIENCE_THRESHOLD ? "experience" : "lesson";

  return {
    knowledgeId,
    sourceId: "serpapi_reviews",
    sourceType: "external",
    siteConfigId,
    classification,
    rating: review.rating,
    snippet: review.snippet,
    reviewerName: review.user?.name,
    reviewDate: review.iso_date ?? review.date,
    details: review.details ? {
      mealType: typeof review.details.meal_type === "string" ? review.details.meal_type : undefined,
      pricePerPerson: typeof review.details.price_per_person === "string" ? review.details.price_per_person : undefined,
      food: typeof review.details.food === "number" ? review.details.food : undefined,
      service: typeof review.details.service === "number" ? review.details.service : undefined,
      atmosphere: typeof review.details.atmosphere === "number" ? review.details.atmosphere : undefined,
    } : undefined,
    certificationLevel: "trusted",
    certificationSource: "system",
    confidenceScore: classification === "experience" ? 0.85 : 0.75,
  };
}

/**
 * Classify a batch of SerpAPI reviews into experiences and lessons.
 * Returns structured classified reviews ready for knowledge item conversion.
 */
export function classifyReviewBatch(
  reviews: Array<{
    rating: number;
    snippet: string;
    user?: { name?: string };
    date?: string;
    iso_date?: string;
    details?: Record<string, unknown>;
  }>,
  siteConfigId: string,
): { experiences: ClassifiedReview[]; lessons: ClassifiedReview[]; all: ClassifiedReview[] } {
  const all: ClassifiedReview[] = reviews.map((r, i) =>
    classifyReview(r, siteConfigId, `review-${siteConfigId}-${i}`)
  );
  return {
    experiences: all.filter((r) => r.classification === "experience"),
    lessons: all.filter((r) => r.classification === "lesson"),
    all,
  };
}

/**
 * Convert classified reviews into KnowledgeItems for the governance filter.
 */
export function reviewsToKnowledgeItems(classified: ClassifiedReview[]): KnowledgeItem[] {
  return classified.map((r) => ({
    knowledgeId: r.knowledgeId,
    sourceId: r.sourceId,
    sourceType: r.sourceType,
    siteConfigId: r.siteConfigId,
    title: `${r.classification === "experience" ? "★ Customer Experience" : "⚠ Lesson for Improvement"} (${r.rating}★)`,
    content: r.snippet,
    structuredData: r.details ? { reviewDetails: r.details, reviewerName: r.reviewerName, reviewDate: r.reviewDate } : undefined,
    certificationLevel: r.certificationLevel,
    certificationSource: r.certificationSource,
    confidenceScore: r.confidenceScore,
    trustWeight: r.classification === "experience" ? 7 : 5,
    conflictPriority: SOURCE_CONFLICT_PRIORITY.external,
    dimensionId: r.classification === "experience" ? "brand_story" : "policies_returns",
  }));
}

// ── Library Entry Classification ──────────────────────────────────────────

/**
 * Classify knowledge library entries (from site_configs.knowledge_library).
 * Owner-uploaded content defaults to trusted; system-injected (sovereignTruths)
 * defaults to approved.
 */
export function classifyLibraryEntryCertification(entry: {
  title?: string;
  content?: string;
  category?: string;
  sourceType?: string;
}): { level: KnowledgeCertificationLevel; sourceType: KnowledgeSourceType } {
  if (entry.sourceType === "system" || entry.category === "sovereignTruths") {
    return { level: "approved", sourceType: "system" };
  }
  if (entry.sourceType === "external") {
    return { level: "trusted", sourceType: "external" };
  }
  return { level: "trusted", sourceType: "owner" };
}
