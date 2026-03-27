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
  CanvasSyscallEnvelope,
  CanvasSyscallError,
  CanvasSyscallErrorCode,
  CanvasViewId,
} from '../../shared/canvasViewContract';
import type { SiteRuntimeContext } from '../../shared/siteRuntimeContext';
import { validateSyscallPayload } from './canvasPayloadSchemas';

// ── View registry — which views exist in the system ───────────────────────────

const REGISTERED_VIEW_IDS = new Set<CanvasViewId>([
  'welcome', 'service_menu', 'faq_list', 'intake_checklist', 'business_summary',
  'support_home', 'disambiguation_menu', 'schedule', 'pricing_table', 'custom_card',
  'account_overview', 'identity_verify', 'phone_provisioning_form', 'agent_builder_form',
  'workspace_provisioning_form', 'agent_roster', 'knowledge_library_builder',
  'aptitude_test_runner', 'dynamic',
]);

// ── Visitor security resolver ─────────────────────────────────────────────────

interface ResolvedVisitorSecurity {
  securityLevel: 'public' | 'verified' | 'staff' | 'admin';
  authState: 'anonymous' | 'identified' | 'authenticated';
}

/**
 * Authoritative security resolution from the visitor session record.
 * Client-sent values are HINTS only — this is the canonical check.
 */
async function resolveVisitorSecurity(
  visitorId: string | undefined,
  clientHint: CanvasSyscallEnvelope['security'],
): Promise<ResolvedVisitorSecurity> {
  if (!visitorId) {
    return { securityLevel: 'public', authState: 'anonymous' };
  }

  try {
    const rows = await db
      .select({
        securityLevel: visitorSessions.securityLevel,
        authState: visitorSessions.authState,
      })
      .from(visitorSessions)
      .where(eq(visitorSessions.id, visitorId))
      .limit(1);

    if (rows.length === 0) {
      return { securityLevel: 'public', authState: 'anonymous' };
    }

    return {
      securityLevel: (rows[0].securityLevel ?? 'public') as ResolvedVisitorSecurity['securityLevel'],
      authState: (rows[0].authState ?? 'anonymous') as ResolvedVisitorSecurity['authState'],
    };
  } catch {
    // Fail safe — downgrade to public, never trust client hint on DB error
    return { securityLevel: 'public', authState: 'anonymous' };
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
    };
  }

  if (!envelope.sessionId || !envelope.siteConfigId || !envelope.turnId) {
    return {
      valid: false,
      error: makeError('INVALID_SCHEMA', 'Missing required IDs (sessionId, siteConfigId, turnId)', syscallId, false),
      resolvedSecurity: { securityLevel: 'public', authState: 'anonymous' },
      allowedRuntimeActions: [],
    };
  }

  const validSyscalls = ['canvas.resolve', 'canvas.render', 'canvas.patch', 'canvas.clear', 'canvas.action'];
  if (!validSyscalls.includes(syscall)) {
    return {
      valid: false,
      error: makeError('INVALID_SCHEMA', `Unknown syscall type: ${syscall}`, syscallId, false),
      resolvedSecurity: { securityLevel: 'public', authState: 'anonymous' },
      allowedRuntimeActions: [],
    };
  }

  // ── Layer 4: Visitor security (must run before entitlement to use real level) ─
  const resolvedSecurity = await resolveVisitorSecurity(visitorId, security);
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
      };
    }
  }

  if (entitlements.restrictions?.provisioningLocked) {
    const provisioningViews = ['phone_provisioning_form', 'workspace_provisioning_form'];
    const payload = envelope.payload as { viewId?: string } | null;
    if (payload?.viewId && provisioningViews.includes(payload.viewId)) {
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
      };
    }
  }

  // ── Layer 4 (continued): Visitor security per view ──────────────────────────
  const adminOnlyViews: CanvasViewId[] = [
    'agent_roster', 'knowledge_library_builder', 'aptitude_test_runner',
    'workspace_provisioning_form', 'phone_provisioning_form',
  ];
  const verifiedOnlyViews: CanvasViewId[] = ['account_overview', 'identity_verify', 'agent_builder_form'];

  const payload = envelope.payload as { viewId?: CanvasViewId } | null;
  const targetView = payload?.viewId;

  if (targetView && adminOnlyViews.includes(targetView)) {
    if (resolvedSecurity.securityLevel !== 'admin' && resolvedSecurity.securityLevel !== 'staff') {
      return {
        valid: false,
        error: makeError('SECURITY_VIOLATION', `View '${targetView}' requires staff or admin access`, syscallId, true, 'identity_verify'),
        resolvedSecurity,
        allowedRuntimeActions,
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
    };
  }

  return { valid: true, resolvedSecurity, allowedRuntimeActions };
}
