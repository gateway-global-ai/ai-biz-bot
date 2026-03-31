/**
 * Canvas Directive Validator — Gateway Global AI OS
 *
 * 5-layer validation for every CanvasSyscallEnvelope.
 * Every syscall passes through all layers before execution.
 *
 * Validation layers (canvas_control.md §13):
 *   1. Structural     — version, syscall type, required IDs, payload shape
 *   2. Entitlement    — view in allowedCanvasViews, skill enabled, action allowed
 *   3. Workspace      — demo/archived restrictions
 *   4. Visitor security — public/verified/staff/admin per view and action
 *   5. Renderer       — viewId in registry, actionIds resolve, data shape matches model
 *
 * Returns CanvasSyscallError on any failure — never throws 500 to client.
 * Populates allowedRuntimeActions on SiteEntitlements for the current visitor.
 */

import { db } from '../db.js';
import { visitorSessions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type {
  CanvasActionPayload,
  CanvasPatchPayload,
  CanvasSyscallEnvelope,
  CanvasSyscallError,
  CanvasSyscallErrorCode,
  CanvasViewId,
} from '../../shared/canvasViewContract';
import type { SiteRuntimeContext } from '../../shared/siteRuntimeContext';
import { validateSyscallPayload } from './canvasPayloadSchemas';
import type { IntentLoopDomainSnapshotV1 } from './intentLoopDomainSnapshot.js';
import { parseIntentLoopDomainSnapshotFromBuyerJourney } from './intentLoopDomainSnapshot.js';

// ── View registry — which views exist in the system ───────────────────────────

const REGISTERED_VIEW_IDS = new Set<CanvasViewId>([
  'welcome', 'service_menu', 'faq_list', 'intake_checklist', 'business_summary',
  'support_home', 'disambiguation_menu', 'schedule', 'pricing_table', 'custom_card',
  'account_overview', 'identity_verify', 'phone_provisioning_form', 'agent_builder_form',
  'workspace_provisioning_form', 'agent_roster', 'knowledge_library_builder',
  'aptitude_test_runner', 'command_center', 'canvas_backgrounds', 'dynamic',
]);

/** Palette ids for canvas.patch replace_component — must match GOVERNED_GENERATIVE_UI_SPEC.md */
const ALLOWED_REPLACE_COMPONENT_TYPES = new Set([
  'status_row',
  'work_card',
  'approval_chip',
  'dynamic_frame',
]);

function validatePatchAllowlist(payload: unknown): string | null {
  const p = payload as CanvasPatchPayload;
  const ver = p.patchContractVersion ?? '1.0';
  if (ver !== '1.0') {
    return `Unsupported patchContractVersion: ${ver}`;
  }
  const ops = p.patchOps;
  if (!Array.isArray(ops)) return null;
  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    if (op.op === 'replace_component') {
      if (!ALLOWED_REPLACE_COMPONENT_TYPES.has(op.componentType)) {
        return `replace_component.componentType '${op.componentType}' is not allowlisted`;
      }
    }
  }
  return null;
}

function validateActionContractVersion(payload: unknown): string | null {
  const p = payload as CanvasActionPayload;
  const ver = p.actionContractVersion ?? '1.0';
  if (ver !== '1.0') {
    return `Unsupported actionContractVersion: ${ver}`;
  }
  return null;
}

// ── Visitor security resolver ─────────────────────────────────────────────────

export interface ResolvedVisitorSecurity {
  securityLevel: 'public' | 'verified' | 'staff' | 'admin';
  authState: 'anonymous' | 'identified' | 'authenticated';
}

/** Allowlisted buyer_journey.phase values (see shared/conversationGrounding.ts BuyerJourney). */
const BUYER_JOURNEY_PHASES = new Set([
  "awareness",
  "consideration",
  "demo",
  "trial",
  "activation",
  "retention",
]);

function parseBuyerJourneyPhaseFromRow(buyerJourney: unknown): string | null {
  if (!buyerJourney || typeof buyerJourney !== "object") return null;
  const p = (buyerJourney as Record<string, unknown>).phase;
  if (typeof p !== "string" || !BUYER_JOURNEY_PHASES.has(p)) return null;
  return p;
}

/** Intent-loop / audit: raw DB value + whether a row was loaded (single query with resolution). */
export interface VisitorSessionSecurityProbe {
  sessionRowFound: boolean;
  rawDbSecurityLevel: string | null;
  /** Structured phase from visitor_sessions.buyer_journey when row loaded (observability only). */
  buyerJourneyPhase?: string | null;
  /**
   * Phase B3 — allowlisted snapshot from buyer_journey JSON (`intent_loop_domain_v1`), same DB row as security.
   * Absent unless server persisted PMS guest-journey classification on a trusted path.
   */
  intentLoopDomainSnapshot?: IntentLoopDomainSnapshotV1 | null;
}

interface VisitorSecurityResolution {
  resolved: ResolvedVisitorSecurity;
  probe: VisitorSessionSecurityProbe;
}

/**
 * Authoritative security resolution from the visitor session record.
 * Client-sent values are HINTS only — this is the canonical check.
 */
async function resolveVisitorSecurity(
  visitorId: string | undefined,
  clientHint: CanvasSyscallEnvelope['security'],
): Promise<VisitorSecurityResolution> {
  const defaultProbe: VisitorSessionSecurityProbe = {
    sessionRowFound: false,
    rawDbSecurityLevel: null,
  };

  if (!visitorId) {
    return {
      resolved: { securityLevel: 'public', authState: 'anonymous' },
      probe: defaultProbe,
    };
  }

  try {
    const rows = await db
      .select({
        securityLevel: visitorSessions.securityLevel,
        verifiedPhone: visitorSessions.verifiedPhone,
        buyerJourney: visitorSessions.buyerJourney,
      })
      .from(visitorSessions)
      .where(eq(visitorSessions.id, visitorId))
      .limit(1);

    if (rows.length === 0) {
      return {
        resolved: { securityLevel: 'public', authState: 'anonymous' },
        probe: defaultProbe,
      };
    }

    const raw = rows[0].securityLevel ?? 'anonymous';
    const securityLevel: ResolvedVisitorSecurity['securityLevel'] =
      raw === 'phone_verified'
        ? 'verified'
        : raw === 'admin'
          ? 'admin'
          : raw === 'staff'
            ? 'staff'
            : 'public';
    const verified = Boolean(rows[0].verifiedPhone);
    const authState: ResolvedVisitorSecurity['authState'] =
      securityLevel === 'admin' || securityLevel === 'verified' || verified
        ? 'authenticated'
        : 'anonymous';

    return {
      resolved: {
        securityLevel,
        authState,
      },
      probe: {
        sessionRowFound: true,
        rawDbSecurityLevel: raw,
        buyerJourneyPhase: parseBuyerJourneyPhaseFromRow(rows[0].buyerJourney),
        intentLoopDomainSnapshot: parseIntentLoopDomainSnapshotFromBuyerJourney(rows[0].buyerJourney),
      },
    };
  } catch {
    // Fail safe — downgrade to public, never trust client hint on DB error
    return {
      resolved: { securityLevel: 'public', authState: 'anonymous' },
      probe: defaultProbe,
    };
  }
}

// ── Allowed runtime actions builder ──────────────────────────────────────────

function buildAllowedRuntimeActions(
  security: ResolvedVisitorSecurity,
  siteRuntime: SiteRuntimeContext,
): string[] {
  const { securityLevel } = security;
  const { plan } = siteRuntime.entitlements;
  const actions: string[] = ['open_support', 'open_service_menu', 'open_faq'];

  if (securityLevel !== 'public') {
    actions.push('open_account', 'verify_identity', 'submit_inquiry');
  }
  if ((securityLevel === 'staff' || securityLevel === 'admin') && plan !== 'free') {
    actions.push('manage_agents', 'build_knowledge', 'run_aptitude_test');
  }
  if (securityLevel === 'admin' && siteRuntime.entitlements.voicePlanActive) {
    actions.push('provision_phone', 'manage_phone');
  }
  return actions;
}

// ── Validation error helper ───────────────────────────────────────────────────

function makeError(
  code: CanvasSyscallErrorCode,
  message: string,
  syscallId: string,
  recoverable = true,
  fallbackViewId?: string,
): CanvasSyscallError {
  return { code, message, syscallId, recoverable, fallbackViewId };
}

// ── Validation result ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: CanvasSyscallError;
  resolvedSecurity: ResolvedVisitorSecurity;
  allowedRuntimeActions: string[];
  /** Populated after visitor security resolution (intent loop Phase B1 + audits). */
  visitorSessionProbe: VisitorSessionSecurityProbe;
}

// ── Main validator ────────────────────────────────────────────────────────────

export async function validateCanvasSyscall(
  envelope: CanvasSyscallEnvelope,
  siteRuntime: SiteRuntimeContext,
): Promise<ValidationResult> {
  const { syscallId, syscall, visitorId, security, context } = envelope;

  // ── Layer 1: Structural validation ──────────────────────────────────────────
  if (envelope.version !== '1.0') {
    return {
      valid: false,
      error: makeError('INVALID_SCHEMA', `Unsupported version: ${envelope.version}`, syscallId, false),
      resolvedSecurity: { securityLevel: 'public', authState: 'anonymous' },
      allowedRuntimeActions: [],
      visitorSessionProbe: { sessionRowFound: false, rawDbSecurityLevel: null },
    };
  }

  if (!envelope.sessionId || !envelope.siteConfigId || !envelope.turnId) {
    return {
      valid: false,
      error: makeError('INVALID_SCHEMA', 'Missing required IDs (sessionId, siteConfigId, turnId)', syscallId, false),
      resolvedSecurity: { securityLevel: 'public', authState: 'anonymous' },
      allowedRuntimeActions: [],
      visitorSessionProbe: { sessionRowFound: false, rawDbSecurityLevel: null },
    };
  }

  const validSyscalls = ['canvas.resolve', 'canvas.render', 'canvas.patch', 'canvas.clear', 'canvas.action'];
  if (!validSyscalls.includes(syscall)) {
    return {
      valid: false,
      error: makeError('INVALID_SCHEMA', `Unknown syscall type: ${syscall}`, syscallId, false),
      resolvedSecurity: { securityLevel: 'public', authState: 'anonymous' },
      allowedRuntimeActions: [],
      visitorSessionProbe: { sessionRowFound: false, rawDbSecurityLevel: null },
    };
  }

  // ── Layer 4: Visitor security (must run before entitlement to use real level) ─
  const vsr = await resolveVisitorSecurity(visitorId, security);
  const resolvedSecurity = vsr.resolved;
  const visitorSessionProbe = vsr.probe;
  const allowedRuntimeActions = buildAllowedRuntimeActions(resolvedSecurity, siteRuntime);

  // ── Layer 2: Entitlement validation ─────────────────────────────────────────
  const { entitlements } = siteRuntime;

  if (syscall === 'canvas.render' || syscall === 'canvas.resolve') {
    const payload = envelope.payload as { viewId?: string } | null;
    const targetViewId = payload?.viewId ?? context.intent?.name;

    if (targetViewId && !entitlements.allowedCanvasViews.includes(targetViewId)) {
      return {
        valid: false,
        error: makeError(
          'VIEW_NOT_ALLOWED',
          `View '${targetViewId}' not allowed for plan '${entitlements.plan}'`,
          syscallId,
          true,
          'welcome',
        ),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  if (syscall === 'canvas.patch') {
    const pp = envelope.payload as { targetViewId?: string } | null;
    const patchTarget = pp?.targetViewId;
    if (patchTarget && !entitlements.allowedCanvasViews.includes(patchTarget)) {
      return {
        valid: false,
        error: makeError(
          'VIEW_NOT_ALLOWED',
          `Patch target view '${patchTarget}' not allowed for plan '${entitlements.plan}'`,
          syscallId,
          true,
          'welcome',
        ),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  if (syscall === 'canvas.action') {
    const payload = envelope.payload as { actionId?: string } | null;
    const actionId = payload?.actionId;

    if (!actionId || !allowedRuntimeActions.includes(actionId)) {
      return {
        valid: false,
        error: makeError(
          'ACTION_NOT_ALLOWED',
          `Action '${actionId}' not allowed for security level '${resolvedSecurity.securityLevel}'`,
          syscallId,
          true,
        ),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  // ── Layer 3: Workspace validation ────────────────────────────────────────────
  const { workspaceState } = siteRuntime.identity;

  if (workspaceState === 'archived') {
    const isReadAction = ['open_support', 'open_service_menu', 'open_faq'].includes(
      (envelope.payload as { actionId?: string })?.actionId ?? '',
    );
    if (!isReadAction && syscall !== 'canvas.resolve' && syscall !== 'canvas.clear') {
      return {
        valid: false,
        error: makeError(
          'WORKSPACE_RESTRICTED',
          'This site is archived. Mutations are not allowed.',
          syscallId,
          true,
          'welcome',
        ),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  if (entitlements.restrictions?.provisioningLocked) {
    const provisioningViews = ['phone_provisioning_form', 'workspace_provisioning_form'];
    const pv = envelope.payload as { viewId?: string; targetViewId?: string } | null;
    const affectedView = syscall === 'canvas.patch' ? pv?.targetViewId : pv?.viewId;
    if (affectedView && provisioningViews.includes(affectedView)) {
      return {
        valid: false,
        error: makeError(
          'WORKSPACE_RESTRICTED',
          'Provisioning is locked in this workspace state.',
          syscallId,
          true,
          'welcome',
        ),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  // ── Layer 4 (continued): Visitor security per view ──────────────────────────
  const adminOnlyViews: CanvasViewId[] = [
    'agent_roster', 'knowledge_library_builder', 'aptitude_test_runner',
    'workspace_provisioning_form', 'phone_provisioning_form', 'command_center',
  ];
  const verifiedOnlyViews: CanvasViewId[] = ['account_overview', 'identity_verify', 'agent_builder_form'];

  const payloadForView = envelope.payload as { viewId?: CanvasViewId; targetViewId?: string } | null;
  const targetView: CanvasViewId | undefined =
    syscall === 'canvas.patch'
      ? (payloadForView?.targetViewId as CanvasViewId | undefined)
      : payloadForView?.viewId;

  if (targetView && adminOnlyViews.includes(targetView)) {
    if (resolvedSecurity.securityLevel !== 'admin' && resolvedSecurity.securityLevel !== 'staff') {
      return {
        valid: false,
        error: makeError('SECURITY_VIOLATION', `View '${targetView}' requires staff or admin access`, syscallId, true, 'identity_verify'),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  if (targetView && verifiedOnlyViews.includes(targetView)) {
    if (resolvedSecurity.securityLevel === 'public') {
      return {
        valid: false,
        error: makeError('SECURITY_VIOLATION', `View '${targetView}' requires verified access`, syscallId, true, 'identity_verify'),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  // ── Layer 5: Renderer validation + runtime payload schema enforcement ─────────
  if (targetView && !REGISTERED_VIEW_IDS.has(targetView)) {
    return {
      valid: false,
      error: makeError('VIEW_NOT_REGISTERED', `View '${targetView}' is not in the component registry`, syscallId, true, 'welcome'),
      resolvedSecurity,
      allowedRuntimeActions,
      visitorSessionProbe,
    };
  }

  // Strict runtime payload validation — type safety in code is not enough.
  // Every payload passes through the Zod schema for its syscall type.
  // This rejects hallucinated properties, malformed structures, or incomplete payloads
  // before they can corrupt canvas state.
  const payloadValidation = validateSyscallPayload(syscall, envelope.payload);
  if (!payloadValidation.success) {
    return {
      valid: false,
      error: makeError(
        'INVALID_SCHEMA',
        `Payload schema violation for '${syscall}': ${payloadValidation.error}`,
        syscallId,
        true,
        'welcome',
      ),
      resolvedSecurity,
      allowedRuntimeActions,
      visitorSessionProbe,
    };
  }

  if (syscall === 'canvas.patch') {
    const patchErr = validatePatchAllowlist(envelope.payload);
    if (patchErr) {
      return {
        valid: false,
        error: makeError('PATCH_INVALID', patchErr, syscallId, true, 'welcome'),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  if (syscall === 'canvas.action') {
    const actionVerErr = validateActionContractVersion(envelope.payload);
    if (actionVerErr) {
      return {
        valid: false,
        error: makeError('INVALID_SCHEMA', actionVerErr, syscallId, true),
        resolvedSecurity,
        allowedRuntimeActions,
        visitorSessionProbe,
      };
    }
  }

  return { valid: true, resolvedSecurity, allowedRuntimeActions, visitorSessionProbe };
}
