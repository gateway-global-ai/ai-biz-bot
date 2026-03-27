/**
 * Site Runtime Resolver — Gateway Global AI OS
 *
 * Resolves siteConfigId into a normalized SiteRuntimeContext.
 * This is the ONLY place that reads site_configs in the canvas/voice pipeline.
 *
 * GOVERNANCE LAW (SYSTEM_MANIFEST.md — Site Runtime Authority Rule):
 *   One resolver call → one normalized object → all downstream consumers.
 *   Not necessarily one SQL statement — may join related tables as needed.
 *   The rule is about one interpretation of truth, not query count.
 *
 * Per-request in-memory cache (TTL 30s) prevents N+1 reads when multiple
 * subsystems within the same request lifecycle need the context.
 */

import { db } from '../db';
import { siteConfigs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type {
  SiteRuntimeContext,
  SiteEntitlements,
  ServiceMenuItem,
  FAQItem,
  TaskOrderItem,
  StaticRoutesConfig,
  KnowledgeArtifact,
  SiteVoiceConfig,
  SiteAgentConfig,
  StructuredGuardrails,
  CommunicationGovernance,
} from '../../shared/siteRuntimeContext';

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  context: SiteRuntimeContext;
  expiresAt: number;
}

const runtimeCache = new Map<string, CacheEntry>();

function getFromCache(siteConfigId: string): SiteRuntimeContext | null {
  const entry = runtimeCache.get(siteConfigId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    runtimeCache.delete(siteConfigId);
    return null;
  }
  return entry.context;
}

function setInCache(siteConfigId: string, context: SiteRuntimeContext): void {
  runtimeCache.set(siteConfigId, { context, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Invalidate cache entry — call when site_configs is updated for this site */
export function invalidateSiteRuntimeCache(siteConfigId: string): void {
  runtimeCache.delete(siteConfigId);
}

// ── Entitlement builder ───────────────────────────────────────────────────────

function buildEntitlements(
  plan: string | null,
  voicePlanActive: boolean,
  workspaceState: string,
): SiteEntitlements {
  const tier = (plan ?? 'free') as 'free' | 'pro' | 'voice' | 'enterprise';
  const isArchived = workspaceState === 'archived';
  const isDemo = workspaceState === 'demo';

  const enabledSkills: string[] = ['support', 'canvas_control'];

  if (tier !== 'free') {
    enabledSkills.push('manage_agents', 'build_knowledge_library', 'run_aptitude_test');
  }
  if (voicePlanActive) {
    enabledSkills.push('provision_phone_number');
  }
  if (tier === 'voice' || tier === 'enterprise') {
    enabledSkills.push('configure_workspace');
  }

  const allowedCanvasViews: string[] = [
    'welcome', 'service_menu', 'faq_list', 'intake_checklist',
    'business_summary', 'support_home', 'disambiguation_menu',
    'schedule', 'pricing_table', 'custom_card',
  ];

  if (!isArchived) {
    allowedCanvasViews.push('identity_verify', 'account_overview');
    if (tier !== 'free') {
      allowedCanvasViews.push(
        'agent_roster', 'knowledge_library_builder', 'aptitude_test_runner',
        'agent_builder_form',
      );
    }
    if (voicePlanActive) {
      allowedCanvasViews.push('phone_provisioning_form');
    }
    if (tier === 'voice' || tier === 'enterprise') {
      allowedCanvasViews.push('workspace_provisioning_form');
    }
  }

  const allowedCanvasActions: string[] = [];
  if (!isArchived) {
    allowedCanvasActions.push('open_support', 'open_service_menu', 'open_faq', 'open_account');
    if (!isDemo) {
      allowedCanvasActions.push('verify_identity', 'submit_inquiry');
    }
    if (!isDemo && tier !== 'free') {
      allowedCanvasActions.push('manage_agents', 'build_knowledge', 'run_aptitude_test');
    }
    if (!isDemo && voicePlanActive) {
      allowedCanvasActions.push('provision_phone', 'manage_phone');
    }
  }

  return {
    plan: tier,
    voicePlanActive,
    enabledSkills,
    allowedCanvasViews,
    allowedCanvasActions,
    allowedRuntimeActions: [], // Populated per-turn by canvasDirectiveValidator
    restrictions: {
      provisioningLocked: isDemo || isArchived,
      telephonyLocked: !voicePlanActive || isArchived,
      adminOnlySkillsDisabled: tier === 'free',
    },
  };
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeServiceMenu(raw: unknown): ServiceMenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) return { name: String(item) };
    const i = item as Record<string, unknown>;
    return {
      name: String(i.name ?? ''),
      price: i.price ? String(i.price) : undefined,
      duration: i.duration ? String(i.duration) : undefined,
      description: i.description ? String(i.description) : undefined,
    };
  });
}

function normalizeFaqs(raw: unknown): FAQItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    const i = (item ?? {}) as Record<string, unknown>;
    return { question: String(i.question ?? ''), answer: String(i.answer ?? '') };
  });
}

function normalizeTaskOrder(raw: unknown): TaskOrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    const i = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(i.id ?? ''),
      label: String(i.label ?? ''),
      description: i.description ? String(i.description) : undefined,
      required: Boolean(i.required),
    };
  });
}

function normalizeKnowledgeLibrary(raw: unknown): KnowledgeArtifact[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    const i = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(i.id ?? ''),
      title: String(i.title ?? ''),
      content: String(i.content ?? ''),
      addedAt: i.addedAt ? String(i.addedAt) : undefined,
    };
  });
}

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve siteConfigId into a normalized SiteRuntimeContext.
 *
 * This is the ONLY entry point for site config data in the canvas/voice pipeline.
 * Results are cached per siteConfigId for 30s to prevent N+1 reads.
 *
 * @throws Error if siteConfigId does not exist
 */
export async function resolveSiteRuntime(siteConfigId: string): Promise<SiteRuntimeContext> {
  // 1. Check cache
  const cached = getFromCache(siteConfigId);
  if (cached) return cached;

  // 2. Query — primary source is site_configs; may join related tables in future
  const rows = await db
    .select()
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`[siteRuntimeResolver] siteConfigId not found: ${siteConfigId}`);
  }

  const row = rows[0];

  // 3. Normalize and build context
  const workspaceState = (row.workspaceState ?? 'demo') as SiteRuntimeContext['identity']['workspaceState'];
  const claimStatus = (row.claimStatus ?? 'unclaimed') as SiteRuntimeContext['identity']['claimStatus'];

  const context: SiteRuntimeContext = {
    identity: {
      siteConfigId: row.id,
      ownerId: row.ownerId ?? null,
      slug: row.slug ?? null,
      workspaceState,
      claimStatus,
    },
    business: {
      name: row.name,
      placeId: row.placeId ?? null,
      domain: row.domain ?? null,
      website: row.website ?? null,
      businessType: row.businessType ?? 'google_maps',
      businessDescription: row.businessDescription ?? null,
      serviceMenu: normalizeServiceMenu(row.serviceMenu),
      faqs: normalizeFaqs(row.faqs),
      taskOrder: normalizeTaskOrder(row.taskOrder),
      staticRoutes: (row.staticRoutes ?? {}) as StaticRoutesConfig,
    },
    ai: {
      assignedAgentId: row.assignedAgentId ?? null,
      systemPromptOverride: row.systemPromptOverride ?? null,
      agentConfig: (row.agentConfig ?? null) as SiteAgentConfig | null,
      voiceConfig: (row.voiceConfig ?? null) as SiteVoiceConfig | null,
      modelProvider: row.modelProvider ?? 'gemini',
      modelName: row.modelName ?? null,
      structuredGuardrails: (row.structuredGuardrails ?? null) as StructuredGuardrails | null,
      communicationGovernance: (row.communicationGovernance ?? null) as CommunicationGovernance | null,
      knowledgeLibrary: normalizeKnowledgeLibrary(row.knowledgeLibrary),
    },
    entitlements: buildEntitlements(row.plan, row.voicePlanActive, workspaceState),
  };

  // 4. Cache and return
  setInCache(siteConfigId, context);
  return context;
}
