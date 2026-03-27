/**
 * Canvas Control Routes — Gateway Global AI OS
 *
 * Single endpoint: POST /api/canvas-control
 *
 * Routes internally by CanvasSyscallEnvelope.syscall type:
 *   canvas.resolve  → canvasIntentRouter
 *   canvas.render   → validate + commit (canvas store is client-owned)
 *   canvas.patch    → validate + ack
 *   canvas.clear    → validate + ack
 *   canvas.action   → validate + dispatch action
 *
 * Every request:
 *   1. Zod structural validation
 *   2. Resolve SiteRuntimeContext from siteConfigId
 *   3. 5-layer canvasDirectiveValidator (security from visitor session, NOT client)
 *   4. Route by syscall type
 *   5. Write CanvasSyscallAuditRecord (fire-and-forget)
 *
 * Security note: client-sent securityLevel and authState are HINTS only.
 * The validator resolves authoritative values from visitor_sessions DB.
 */

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { resolveSiteRuntime } from '../services/siteRuntimeResolver';
import { validateCanvasSyscall } from '../services/canvasDirectiveValidator';
import { routeCanvasIntent } from '../services/canvasIntentRouter';
import { writeCanvasAuditRecord, buildAuditRecord } from '../services/canvasAuditLog';
import type { CanvasSyscallEnvelope } from '../../shared/canvasViewContract';

const router = Router();

// ── Structural Zod schema ─────────────────────────────────────────────────────

const EnvelopeSchema = z.object({
  version: z.literal('1.0'),
  syscallId: z.string().uuid().default(() => uuidv4()),
  turnId: z.string().min(1),
  sessionId: z.string().min(1),
  siteConfigId: z.string().min(1),
  visitorId: z.string().optional(),
  syscall: z.enum(['canvas.resolve', 'canvas.render', 'canvas.patch', 'canvas.clear', 'canvas.action']),
  source: z.enum(['voice_turn_orchestrator', 'canvas_intent_router', 'skill_dispatch', 'canvas_action_handler', 'system_recovery', 'legacy_adapter']),
  security: z.object({
    securityLevel: z.enum(['public', 'verified', 'staff', 'admin']),
    authState: z.enum(['anonymous', 'identified', 'authenticated']),
  }),
  context: z.object({
    currentViewId: z.string().optional(),
    workspaceState: z.enum(['demo', 'provisioned', 'claimed', 'active', 'archived']).optional(),
    intent: z.object({
      name: z.string(),
      confidence: z.number(),
      requiresDisambiguation: z.boolean().optional(),
    }).optional(),
  }),
  payload: z.unknown(),
  trace: z.object({
    parentSyscallId: z.string().optional(),
    requestId: z.string().optional(),
    correlationId: z.string().optional(),
    tier1MatchedPattern: z.string().optional(),
    llamaRawResponse: z.string().optional(),
    validationErrors: z.array(z.string()).optional(),
    routingLatencyMs: z.number().optional(),
  }).optional(),
});

// ── POST /api/canvas-control ──────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const startMs = Date.now();
  let siteConfigId = '';
  let syscallId = uuidv4();
  let turnId = '';
  let sessionId = '';

  try {
    // 1. Structural validation
    const parseResult = EnvelopeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'INVALID_SCHEMA',
        message: 'Request body failed schema validation',
        issues: parseResult.error.issues,
      });
    }

    const envelope = parseResult.data as CanvasSyscallEnvelope;
    syscallId = envelope.syscallId ?? syscallId;
    turnId = envelope.turnId;
    sessionId = envelope.sessionId;
    siteConfigId = envelope.siteConfigId;

    // 2. Resolve site runtime context
    let siteRuntime;
    try {
      siteRuntime = await resolveSiteRuntime(siteConfigId);
    } catch (err) {
      return res.status(404).json({ error: 'SITE_NOT_FOUND', message: `siteConfigId not found: ${siteConfigId}` });
    }

    // 3. 5-layer validation
    const validation = await validateCanvasSyscall(envelope, siteRuntime);

    if (!validation.valid) {
      writeCanvasAuditRecord(buildAuditRecord({
        syscallId, turnId, sessionId, siteConfigId,
        visitorId: envelope.visitorId,
        syscall: envelope.syscall,
        source: envelope.source,
        previousViewId: envelope.context.currentViewId,
        nextViewId: undefined,
        validationStatus: 'failed',
        errorCode: validation.error?.code,
        directiveJson: envelope,
        startMs,
      }));

      return res.status(403).json({
        error: validation.error?.code ?? 'VALIDATION_FAILED',
        message: validation.error?.message ?? 'Validation failed',
        syscallId,
        recoverable: validation.error?.recoverable ?? false,
        fallbackViewId: validation.error?.fallbackViewId,
      });
    }

    // 4. Route by syscall type
    let result: unknown;
    let nextViewId: string | undefined;

    switch (envelope.syscall) {
      case 'canvas.resolve': {
        const payload = envelope.payload as { transcript: string; recentTurns?: Array<{ transcript: string; selectedIntent?: string; currentViewId?: string }>; currentCanvasSummary?: string };
        const resolveResult = await routeCanvasIntent(
          payload,
          siteRuntime,
          validation.resolvedSecurity.securityLevel,
        );
        nextViewId = resolveResult.selectedViewId;
        result = resolveResult;
        break;
      }

      case 'canvas.render': {
        const payload = envelope.payload as { viewId?: string };
        nextViewId = payload?.viewId;
        result = { committed: true, viewId: nextViewId };
        break;
      }

      case 'canvas.patch': {
        result = { patched: true };
        break;
      }

      case 'canvas.clear': {
        const payload = envelope.payload as { fallbackViewId?: string };
        nextViewId = payload?.fallbackViewId;
        result = { cleared: true, fallbackViewId: nextViewId };
        break;
      }

      case 'canvas.action': {
        const payload = envelope.payload as { actionId?: string; actionType?: string; actionData?: unknown };
        // Action dispatch — for now, validate and log. Domain handlers wired in future passes.
        result = {
          dispatched: true,
          actionId: payload.actionId,
          actionType: payload.actionType,
        };
        break;
      }

      default: {
        return res.status(400).json({ error: 'UNKNOWN_SYSCALL' });
      }
    }

    // 5. Write audit record (fire-and-forget — never blocks response)
    writeCanvasAuditRecord(buildAuditRecord({
      syscallId, turnId, sessionId, siteConfigId,
      visitorId: envelope.visitorId,
      syscall: envelope.syscall,
      source: envelope.source,
      previousViewId: envelope.context.currentViewId,
      nextViewId,
      validationStatus: 'passed',
      directiveJson: envelope,
      startMs,
    }));

    return res.json({ syscallId, result, latencyMs: Date.now() - startMs });

  } catch (err) {
    console.error('[canvasControlRoutes] Unhandled error', err);

    if (siteConfigId) {
      writeCanvasAuditRecord(buildAuditRecord({
        syscallId, turnId, sessionId, siteConfigId,
        syscall: (req.body as Partial<CanvasSyscallEnvelope>)?.syscall ?? 'canvas.resolve',
        source: (req.body as Partial<CanvasSyscallEnvelope>)?.source ?? 'system_recovery',
        validationStatus: 'failed',
        errorCode: 'UNKNOWN',
        directiveJson: req.body,
        startMs,
      }));
    }

    return res.status(500).json({ error: 'INTERNAL_ERROR', syscallId });
  }
});

export default router;
