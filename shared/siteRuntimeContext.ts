/**
 * Site Runtime Context — Gateway Global AI OS
 *
 * SiteRuntimeContext is the canonical resolved object derived from siteConfigId.
 * It is the single source of truth for identity, business data, AI configuration,
 * and commercial entitlements for every governed subsystem.
 *
 * GOVERNANCE LAW (SYSTEM_MANIFEST.md — Site Runtime Authority Rule):
 *   siteConfigId must be resolved into SiteRuntimeContext before use.
 *   No subsystem may independently query site_configs.
 *   All downstream systems — router, validator, prompt compiler,
 *   directive builder, speech planner — consume this object.
 *
 * Resolution chain:
 *   siteConfigId → resolveSiteRuntime() → SiteRuntimeContext → all consumers
 */

// ── Sub-types ──────────────────────────────────────────────────────────────────

export interface ServiceMenuItem {
  name: string;
  price?: string;
  duration?: string;
  description?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TaskOrderItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
}

export interface StaticRoutesConfig {
  call?: { enabled: boolean; value: string } | string;
  text?: { enabled: boolean; value: string } | string;
  email?: { enabled: boolean; value: string } | string;
  website?: { enabled: boolean; value: string } | string;
}

export interface KnowledgeArtifact {
  id: string;
  title: string;
  content: string;
  addedAt?: string;
}

export interface StructuredGuardrails {
  always?: string[];
  never?: string[];
  believe?: string[];
}

export interface CommunicationGovernance {
  disclosurePolicy?: string;
  stabilityDials?: Record<string, unknown>;
  principalOfRecord?: string;
  [key: string]: unknown;
}

export interface SiteVoiceConfig {
  voiceName?: string;
  language?: string;
  isPushToTalk?: boolean;
}

export interface SiteAgentConfig {
  name?: string;
  role?: string;
  personality?: string;
  objectives?: string[];
  constraints?: string[];
  discProfile?: Record<string, number>;
  basePrompt?: string;
}

// ── Entitlements ──────────────────────────────────────────────────────────────

/**
 * SiteEntitlements governs what the site/visitor may access.
 *
 * Three distinct layers:
 *   enabledSkills       — plan/tier license gate (set at site boot)
 *   allowedCanvasViews  — views allowed for this site plan (set at site boot)
 *   allowedCanvasActions— workspace-state-gated UI actions (set at site boot)
 *   allowedRuntimeActions— backend actions for this visitor/security state
 *                          (populated per-turn by canvasDirectiveValidator,
 *                           siteRuntimeResolver sets it to [] as placeholder)
 */
export interface SiteEntitlements {
  plan: 'free' | 'pro' | 'voice' | 'enterprise';
  voicePlanActive: boolean;

  /** Capabilities the site/plan tier is licensed to use */
  enabledSkills: string[];

  /** Canvas views allowed for this site plan */
  allowedCanvasViews: string[];

  /** UI actions that may appear in a canvas directive for this site */
  allowedCanvasActions: string[];

  /**
   * Backend actions executable for this visitor/session/security state.
   * Populated at turn time by canvasDirectiveValidator — NOT pre-stored at site boot.
   * siteRuntimeResolver initializes this as [] and the validator fills it per request.
   */
  allowedRuntimeActions: string[];

  restrictions?: {
    provisioningLocked?: boolean;
    telephonyLocked?: boolean;
    adminOnlySkillsDisabled?: boolean;
  };
}

// ── Root context ──────────────────────────────────────────────────────────────

/**
 * The canonical resolved runtime object for a site.
 * Every voice turn, canvas syscall, and skill dispatch derives from this.
 */
export interface SiteRuntimeContext {
  // Identity and tenancy
  identity: {
    siteConfigId: string;
    ownerId: string | null;
    slug: string | null;
    workspaceState: 'demo' | 'provisioned' | 'claimed' | 'active' | 'archived';
    claimStatus: 'unclaimed' | 'invite_sent' | 'payment_pending' | 'claimed';
  };

  // Business content — hydrates canvas views directly
  business: {
    name: string;
    placeId?: string | null;
    domain?: string | null;
    website?: string | null;
    businessType: string;
    businessDescription?: string | null;
    serviceMenu: ServiceMenuItem[];       // → service_menu canvas view
    faqs: FAQItem[];                      // → faq_list canvas view
    taskOrder: TaskOrderItem[];           // → intake_checklist canvas view
    staticRoutes: StaticRoutesConfig;     // → governed canvas CTA actions
  };

  // AI behavior — governs speech and prompt compilation
  ai: {
    assignedAgentId?: string | null;
    systemPromptOverride?: string | null;
    agentConfig?: SiteAgentConfig | null;
    voiceConfig?: SiteVoiceConfig | null;
    modelProvider: string;
    modelName?: string | null;
    structuredGuardrails?: StructuredGuardrails | null;
    communicationGovernance?: CommunicationGovernance | null;
    knowledgeLibrary: KnowledgeArtifact[];
  };

  // Commercial entitlements — governs skill access and allowed actions
  entitlements: SiteEntitlements;
}

// ── PTT session context ───────────────────────────────────────────────────────

/**
 * Sent at PTT connection time. Replaces the thin legacy sessionContext.
 * The full SiteRuntimeContext is embedded — not flattened fields from site_configs.
 *
 * IMPORTANT: visitor.securityLevel and visitor.authState are CLIENT-CACHED HINTS only.
 * The server confirms authoritative values from the visitor session record on every request.
 */
export interface PttSessionContext {
  sessionId: string;

  /** Full resolved site runtime — not flattened fields */
  siteRuntime: SiteRuntimeContext;

  visitor: {
    visitorId?: string;
    /** CLIENT HINT ONLY — server confirms from visitor session on every request */
    securityLevel: 'public' | 'verified' | 'staff' | 'admin';
    /** CLIENT HINT ONLY — server confirms from visitor session on every request */
    authState: 'anonymous' | 'identified' | 'authenticated';
  };

  currentCanvas: {
    currentViewId?: string;
    currentViewSummary?: string;
  };

  activeAgent: {
    agentId?: string;
    metaPrompt?: string;
  };

  funnelContextKeys?: Record<string, string>;
}

// ── Voice turn context ────────────────────────────────────────────────────────

/**
 * Created at the transcript.final intercept point.
 * Input to VoiceTurnOrchestrator. Contains everything needed
 * to resolve intent, build a canvas syscall, and ground speech.
 *
 * Bounded policy for recentTurns: max 3 turns, raw transcript,
 * maintained client-side. Never fetched from server on hot path.
 */
export interface VoiceTurnContext {
  turnId: string;     // generated at the transcript.final intercept
  sessionId: string;

  transcript: string;

  /** Full site runtime embedded — enables router + validator to work without extra DB calls */
  siteRuntime: SiteRuntimeContext;

  visitor: {
    visitorId?: string;
    securityLevel: 'public' | 'verified' | 'staff' | 'admin';
    authState: 'anonymous' | 'identified' | 'authenticated';
  };

  currentCanvas: {
    currentViewId?: string;
    currentViewSummary?: string;
  };

  /** Last 3 turns max — client-side ring buffer, never server-fetched on hot path */
  recentTurns: Array<{
    turnId: string;
    transcript: string;
    selectedIntent?: string;
    currentViewId?: string;
  }>;
}

// ── Initial runtime state ─────────────────────────────────────────────────────

/** Sent at connection time alongside PttSessionContext. Carries initial UI truth. */
export interface PttRuntimeState {
  currentCanvasView: string | null;
  currentCanvasSummary: string;
  lastTurnId: string | null;
}
