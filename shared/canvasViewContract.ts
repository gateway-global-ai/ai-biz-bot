/**
 * Canvas Control Syscall Layer — Gateway Global AI OS
 *
 * "Canvas Control is the syscall interface by which agents request governed UI mutations.
 *  The runtime validates those requests against site context, entitlements, session state,
 *  and security policy, then commits canvas truth for the LLM to narrate."
 *
 * AI OS Specification v1.0 — canvas_control.md
 *
 * FIVE LAWS (SYSTEM_MANIFEST.md):
 *   1. No direct UI authority — no model output may directly mutate the UI
 *   2. No untyped canvas payloads — versioned discriminated contracts only
 *   3. No entitlement bypass — every syscall validates SiteEntitlements + security
 *   4. No invisible actions — all actions must be in the server-owned action registry
 *   5. No speech before truth — canvas must be committed before LLM narrates
 *
 * SYSCALL CLASSES:
 *   canvas.resolve  — resolve what to show based on intent
 *   canvas.render   — render a view into the shared canvas
 *   canvas.patch    — mutate current view without full replacement
 *   canvas.clear    — clear or reset canvas
 *   canvas.action   — execute a user-selected canvas action
 */

// ── View ID registry ──────────────────────────────────────────────────────────

export type CanvasViewId =
  // Legacy AI-emitted views (retained, backward compatible)
  | 'service_menu' | 'schedule' | 'pricing_table' | 'faq_list'
  | 'intake_checklist' | 'business_summary' | 'custom_card'
  // Skill-driven (existing)
  | 'account_overview' | 'phone_provisioning_form'
  | 'agent_builder_form' | 'workspace_provisioning_form'
  // OS views (new)
  | 'welcome' | 'support_home' | 'identity_verify'
  | 'agent_roster' | 'knowledge_library_builder' | 'aptitude_test_runner'
  // Disambiguation
  | 'disambiguation_menu'
  // Dynamic (ShadCN MCP generated)
  | 'dynamic';

// ── Canonical syscall envelope ─────────────────────────────────────────────────

export type CanvasSyscallType =
  | 'canvas.resolve'   // §6.1 — resolve intent → view selection
  | 'canvas.render'    // §6.2 — render a view
  | 'canvas.patch'     // §6.3 — mutate current view
  | 'canvas.clear'     // §6.4 — clear/reset canvas
  | 'canvas.action';   // §6.5 — execute user action

export type CanvasSyscallSource =
  | 'voice_turn_orchestrator'
  | 'canvas_intent_router'
  | 'skill_dispatch'
  | 'canvas_action_handler'
  | 'system_recovery'
  | 'legacy_adapter';

export interface CanvasSyscallEnvelope {
  version: '1.0';
  syscallId: string;       // UUID — correlates to CanvasSyscallAuditRecord
  turnId: string;          // UUID per PTT turn
  sessionId: string;
  siteConfigId: string;
  visitorId?: string;

  syscall: CanvasSyscallType;
  source: CanvasSyscallSource;

  security: {
    /** CLIENT HINT ONLY — server confirms from visitor session */
    securityLevel: 'public' | 'verified' | 'staff' | 'admin';
    /** CLIENT HINT ONLY — server confirms from visitor session */
    authState: 'anonymous' | 'identified' | 'authenticated';
  };

  context: {
    currentViewId?: string;
    workspaceState?: 'demo' | 'provisioned' | 'claimed' | 'active' | 'archived';
    intent?: {
      name: string;
      confidence: number;
      requiresDisambiguation?: boolean;
    };
  };

  /** Typed by the discriminated payload contracts below */
  payload: unknown;

  trace?: {
    parentSyscallId?: string;
    requestId?: string;
    correlationId?: string;
    tier1MatchedPattern?: string;
    llamaRawResponse?: string;
    validationErrors?: string[];
    routingLatencyMs?: number;
  };
}

// ── Syscall payload contracts ─────────────────────────────────────────────────

// §8.1 — canvas.resolve
export interface CanvasResolvePayload {
  transcript: string;
  recentTurns?: Array<{
    transcript: string;
    selectedIntent?: string;
    currentViewId?: string;
  }>;
  currentCanvasSummary?: string;
  requestedSkillHint?: string;
}

export interface CanvasResolveResult {
  selectedViewId?: string;
  renderMode: 'replace' | 'patch' | 'noop' | 'disambiguate';
  reason: string;
  hydrationKey?: string;
  speechContext?: {
    screenSummary: string;
    speakingInstructions?: string;
  };
}

// §8.2 — canvas.render — viewId and data ALWAYS coupled (never Partial<>)

export interface WelcomeViewModel {
  greeting: string;
  intentOptions: Array<{ label: string; viewId: CanvasViewId; icon?: string }>;
}

export interface ServiceMenuViewModel {
  title: string;
  items: Array<{ name: string; price?: string; duration?: string; description?: string }>;
  cta?: { label: string; action: string };
}

export interface FAQListViewModel {
  title: string;
  faqs: Array<{ question: string; answer: string }>;
}

export interface IntakeChecklistViewModel {
  title: string;
  steps: Array<{ id: string; label: string; description?: string; required: boolean; status?: 'pending' | 'complete' }>;
}

export interface AgentRosterViewModel {
  agents: Array<{
    id: string;
    name: string;
    roleType: string;
    status: 'active' | 'paused' | 'inactive';
    model?: string;
    lastRun?: string;
    knowledgeCount?: number;
  }>;
}

export interface KnowledgeLibraryBuilderViewModel {
  agentId: string;
  agentName: string;
  existingArtifacts: Array<{ id: string; title: string; addedAt?: string }>;
}

export interface AptitudeTestRunnerViewModel {
  agentId: string;
  agentName: string;
  results?: Array<{
    question: string;
    expected: string;
    actual: string;
    passed: boolean;
  }>;
}

export interface SupportHomeViewModel {
  topics: Array<{ label: string; description: string; action: string }>;
}

export interface DisambiguationMenuViewModel {
  question: string;
  options: Array<{ label: string; intent: string; viewId: CanvasViewId }>;
}

export interface AccountOverviewViewModel {
  plan: string;
  businesses: Array<{ id: string; name: string; slug: string; businessAddress?: string }>;
  billingCta?: { label: string; url: string };
}

export interface IdentityVerifyViewModel {
  siteConfigId: string;
  verificationMethod: 'otp' | 'magic_link';
}

export interface PhoneProvisioningViewModel {
  siteConfigId: string;
  suggestedAreaCode?: string;
  availableNumbers?: Array<{ phoneNumber: string; friendlyName: string; locality: string }>;
  currentNumber?: string;
  voicePlanActive: boolean;
}

export interface DynamicViewModel {
  componentType: string;
  props: Record<string, unknown>;
  actions?: Array<{ actionId: string; label: string; style?: 'primary' | 'secondary' | 'danger' }>;
}

/**
 * Discriminated union — viewId and data ALWAYS coupled.
 * Never use Partial<CanvasRenderPayload> or arbitrary payload blobs.
 */
export type CanvasRenderPayload =
  | { viewId: 'welcome';                    renderMode: 'replace'; title: string; data: WelcomeViewModel }
  | { viewId: 'service_menu';               renderMode: 'replace'; title: string; data: ServiceMenuViewModel }
  | { viewId: 'faq_list';                   renderMode: 'replace'; title: string; data: FAQListViewModel }
  | { viewId: 'intake_checklist';           renderMode: 'replace'; title: string; data: IntakeChecklistViewModel }
  | { viewId: 'agent_roster';               renderMode: 'replace'; title: string; data: AgentRosterViewModel }
  | { viewId: 'knowledge_library_builder';  renderMode: 'replace'; title: string; data: KnowledgeLibraryBuilderViewModel }
  | { viewId: 'aptitude_test_runner';       renderMode: 'replace'; title: string; data: AptitudeTestRunnerViewModel }
  | { viewId: 'support_home';               renderMode: 'replace'; title: string; data: SupportHomeViewModel }
  | { viewId: 'disambiguation_menu';        renderMode: 'replace'; title: string; data: DisambiguationMenuViewModel }
  | { viewId: 'account_overview';           renderMode: 'replace'; title: string; data: AccountOverviewViewModel }
  | { viewId: 'identity_verify';            renderMode: 'replace'; title: string; data: IdentityVerifyViewModel }
  | { viewId: 'phone_provisioning_form';    renderMode: 'replace'; title: string; data: PhoneProvisioningViewModel }
  | { viewId: 'workspace_provisioning_form'; renderMode: 'replace'; title: string; data: IntakeChecklistViewModel }
  | { viewId: 'agent_builder_form';         renderMode: 'replace'; title: string; data: DynamicViewModel }
  | { viewId: 'dynamic';                    renderMode: 'replace'; title: string; data: DynamicViewModel }
  // Legacy views — retain backward compat
  | { viewId: 'schedule';       renderMode: 'replace'; title: string; data: DynamicViewModel }
  | { viewId: 'pricing_table';  renderMode: 'replace'; title: string; data: DynamicViewModel }
  | { viewId: 'business_summary'; renderMode: 'replace'; title: string; data: DynamicViewModel }
  | { viewId: 'custom_card';    renderMode: 'replace'; title: string; data: DynamicViewModel };

// §8.3 — canvas.patch — typed ops only, no arbitrary JSON patch
export type CanvasPatchOp =
  | { op: 'replace_field'; path: string; value: unknown }
  | { op: 'append_items'; path: string; items: unknown[] }
  | { op: 'remove_item'; path: string; key: string }
  | { op: 'set_loading'; path: string; value: boolean }
  | { op: 'set_error'; path: string; message: string };

export interface CanvasPatchPayload {
  targetViewId: string;
  patchOps: CanvasPatchOp[];
}

// §8.4 — canvas.clear
export interface CanvasClearPayload {
  reason: 'session_end' | 'security_change' | 'timeout' | 'dismiss' | 'reset' | 'error_recovery';
  fallbackViewId?: 'welcome';
}

// §8.5 — canvas.action — actionId MUST map to server-owned registry entry
export interface CanvasActionPayload {
  actionId: string;
  actionType:
    | 'open_view' | 'submit_form' | 'trigger_skill' | 'escalate'
    | 'open_route' | 'call' | 'text' | 'email' | 'website';
  actionData?: Record<string, unknown>;
}

// ── Action registry entry ─────────────────────────────────────────────────────

/** Server-owned registry. Every canvas action MUST have an entry here. */
export interface CanvasActionRegistryEntry {
  actionId: string;
  actionType: string;
  requiredSecurityLevel: 'public' | 'verified' | 'staff' | 'admin';
  requiredSkills?: string[];
  requiredPlans?: Array<'free' | 'pro' | 'voice' | 'enterprise'>;
  workspaceStates?: Array<'demo' | 'provisioned' | 'claimed' | 'active' | 'archived'>;
  handler: string;
}

// ── Speech grounding contract ─────────────────────────────────────────────────

/**
 * The ONLY input Gemini receives for canvas-related narration.
 * The LLM may only describe state that has been validated and committed.
 * Never invent UI, never reference unrendered content.
 */
export interface SpeechGroundingContext {
  turnId: string;
  currentViewId?: string;
  screenSummary: string;
  speakingInstructions?: string;
  allowedReferences?: string[];
}

// ── Error model ───────────────────────────────────────────────────────────────

export type CanvasSyscallErrorCode =
  | 'INVALID_SCHEMA'
  | 'VIEW_NOT_ALLOWED'
  | 'ACTION_NOT_ALLOWED'
  | 'SECURITY_VIOLATION'
  | 'WORKSPACE_RESTRICTED'
  | 'VIEW_NOT_REGISTERED'
  | 'HYDRATION_FAILED'
  | 'PATCH_INVALID'
  | 'UNKNOWN';

export interface CanvasSyscallError {
  code: CanvasSyscallErrorCode;
  message: string;
  syscallId: string;
  recoverable: boolean;
  fallbackViewId?: string;
}

// ── Audit record ──────────────────────────────────────────────────────────────

/** Written to canvas_events table on every syscall. Enables replay and governance proof. */
export interface CanvasSyscallAuditRecord {
  syscallId: string;
  turnId: string;
  sessionId: string;
  siteConfigId: string;
  visitorId?: string;

  syscall: CanvasSyscallType;
  source: CanvasSyscallSource;

  previousViewId?: string;
  nextViewId?: string;

  selectedIntent?: string;
  intentConfidence?: number;

  validationStatus: 'passed' | 'failed';
  errorCode?: string;

  directiveJson: unknown;
  latencyMs?: number;

  toolInvocations?: string[];
  createdAt: string;
}

// ── PTT event union ───────────────────────────────────────────────────────────

/**
 * Replaces the overloaded VoiceMessage type.
 * Each concern is a separate, typed event — no more metadata blobs.
 */
export type PttEvent =
  | PttTranscriptPartialEvent
  | PttTranscriptFinalEvent
  | PttCanvasSyscallEvent
  | PttSpeechOutputEvent
  | PttAnalysisMetadataEvent
  | PttErrorEvent;

export interface PttTranscriptPartialEvent {
  type: 'transcript.partial';
  turnId: string;
  sessionId: string;
  text: string;
}

export interface PttTranscriptFinalEvent {
  type: 'transcript.final';
  turnId: string;
  sessionId: string;
  text: string;
}

/** Carries a committed syscall result — not a raw Gemini metadata blob */
export interface PttCanvasSyscallEvent {
  type: 'canvas.syscall';
  turnId: string;
  sessionId: string;
  syscallId: string;
  syscall: CanvasSyscallType;
  result: CanvasResolveResult | CanvasRenderPayload | null;
}

export interface PttSpeechOutputEvent {
  type: 'speech.output';
  turnId: string;
  sessionId: string;
  text: string;
  // Audio streaming fields — optional now, required when chunked TTS evolves
  audioState?: 'streaming' | 'complete' | 'interrupted';
  chunkIndex?: number;
  isFinal?: boolean;
}

export interface PttAnalysisMetadataEvent {
  type: 'analysis.metadata';
  turnId: string;
  sessionId: string;
  emotion?: string;
  sentiment?: number;
  disc?: { dominance: number; influence: number; steadiness: number; conscientiousness: number };
}

export interface PttErrorEvent {
  type: 'error';
  turnId?: string;
  sessionId: string;
  code: string;
  message: string;
  recoverable?: boolean;
}

// ── Legacy backward-compat exports ───────────────────────────────────────────
// Retained so existing consumers compile without immediate migration.
// These will be removed after the adapter phase confirms zero usage.

export interface CanvasViewBase {
  viewId: CanvasViewId;
  title: string;
  subtitle?: string;
  sourceSkillId?: string;
  dismissible?: boolean;
}

/** @deprecated Use CanvasRenderPayload discriminated union instead */
export type CanvasViewPayload =
  | (CanvasViewBase & { viewId: 'account_overview'; plan: string; businesses: Array<{ id: string; name: string; slug: string; businessAddress?: string }>; billingCta?: { label: string; url: string } })
  | (CanvasViewBase & { viewId: 'phone_provisioning_form'; siteConfigId: string; voicePlanActive: boolean; suggestedAreaCode?: string; availableNumbers?: Array<{ phoneNumber: string; friendlyName: string; locality: string }>; currentNumber?: string })
  | (CanvasViewBase & { viewId: 'agent_builder_form'; siteConfigId: string; industry?: string; archetype?: string; prefill?: { businessName?: string; industry?: string } })
  | (CanvasViewBase & { viewId: 'workspace_provisioning_form'; siteConfigId: string; steps: Array<{ id: string; label: string; status: 'pending' | 'in_progress' | 'complete' | 'error' }> })
  | (CanvasViewBase & { viewId: 'dynamic'; componentType: string; props: Record<string, unknown>; actions?: Array<{ actionId: string; label: string; style?: 'primary' | 'secondary' | 'danger' }> })
  | (CanvasViewBase & { viewId: 'service_menu' | 'schedule' | 'pricing_table' | 'faq_list' | 'intake_checklist' | 'business_summary' | 'custom_card'; canvas_type: string; items: Array<{ label: string; value?: string; description?: string; price?: string; duration?: string }>; cta_label?: string; cta_action?: 'book' | 'call' | 'form' | 'link'; accent_color?: 'indigo' | 'emerald' | 'amber' | 'rose' });

/** Skill-dispatch + SharedCanvasPanel entry shapes (full view rows, not inner view models). */
export type PhoneProvisioningPayload = Extract<CanvasViewPayload, { viewId: 'phone_provisioning_form' }>;
export type AccountOverviewPayload = Extract<CanvasViewPayload, { viewId: 'account_overview' }>;

export function isSkillCanvasView(payload: unknown): payload is CanvasViewPayload {
  return typeof payload === 'object' && payload !== null && 'viewId' in payload;
}

/** @deprecated Use CanvasSyscallEnvelope instead */
export interface CanvasDispatchEvent {
  skillId: string;
  viewId: CanvasViewId;
  payload: Partial<CanvasViewPayload>;
}
