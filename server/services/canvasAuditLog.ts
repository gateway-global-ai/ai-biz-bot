/**
 * Canvas Audit Log — Gateway Global AI OS
 *
 * Fire-and-forget writer for CanvasSyscallAuditRecord.
 * Called from canvasControlRoutes on every syscall (all 5 types)
 * and from skillDispatchRoutes on skill-originated renders.
 *
 * Uses setImmediate so it never blocks the response path.
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import type { CanvasSyscallAuditRecord } from '../../shared/canvasViewContract';

// ── Atomic failure counter ─────────────────────────────────────────────────────
// Incremented on every DB write failure. Observable by PM2 health checks and
// the /api/health endpoint. Never resets during the process lifetime so that
// any audit degradation becomes a visible, actionable metric.

let _auditWriteFailureCount = 0;

/**
 * Returns the number of canvas audit write failures since process start.
 * Exposed via /api/health so PM2 dashboards and alerting can observe silently
 * dropped audit records without waiting for a database log scrape.
 */
export function getAuditWriteFailureCount(): number {
  return _auditWriteFailureCount;
}

export function writeCanvasAuditRecord(record: CanvasSyscallAuditRecord): void {
  // Fire-and-forget — never await this on the response path
  setImmediate(async () => {
    try {
      await db.execute(sql`
        INSERT INTO canvas_events (
          syscall_id,
          turn_id,
          session_id,
          site_config_id,
          visitor_id,
          syscall,
          source,
          previous_view_id,
          next_view_id,
          selected_intent,
          intent_confidence,
          validation_status,
          error_code,
          directive_json,
          latency_ms,
          tool_invocations,
          created_at
        ) VALUES (
          ${record.syscallId}::uuid,
          ${record.turnId},
          ${record.sessionId},
          ${record.siteConfigId},
          ${record.visitorId ?? null},
          ${record.syscall},
          ${record.source},
          ${record.previousViewId ?? null},
          ${record.nextViewId ?? null},
          ${record.selectedIntent ?? null},
          ${record.intentConfidence ?? null},
          ${record.validationStatus},
          ${record.errorCode ?? null},
          ${JSON.stringify(record.directiveJson)}::jsonb,
          ${record.latencyMs ?? null},
          ${record.toolInvocations ?? null},
          ${record.createdAt}::timestamptz
        )
      `);
    } catch (err) {
      // Audit failure must never crash the request — increment counter and log hard
      _auditWriteFailureCount++;
      console.error('[canvasAuditLog] WRITE FAILED — syscallId:', record.syscallId, '| total failures:', _auditWriteFailureCount, err);
    }
  });
}

/** Build a base audit record from a syscall envelope */
export function buildAuditRecord(params: {
  syscallId: string;
  turnId: string;
  sessionId: string;
  siteConfigId: string;
  visitorId?: string;
  syscall: CanvasSyscallAuditRecord['syscall'];
  source: CanvasSyscallAuditRecord['source'];
  previousViewId?: string;
  nextViewId?: string;
  selectedIntent?: string;
  intentConfidence?: number;
  validationStatus: 'passed' | 'failed';
  errorCode?: string;
  directiveJson: unknown;
  startMs: number;
  toolInvocations?: string[];
}): CanvasSyscallAuditRecord {
  return {
    syscallId: params.syscallId,
    turnId: params.turnId,
    sessionId: params.sessionId,
    siteConfigId: params.siteConfigId,
    visitorId: params.visitorId,
    syscall: params.syscall,
    source: params.source,
    previousViewId: params.previousViewId,
    nextViewId: params.nextViewId,
    selectedIntent: params.selectedIntent,
    intentConfidence: params.intentConfidence,
    validationStatus: params.validationStatus,
    errorCode: params.errorCode,
    directiveJson: params.directiveJson,
    latencyMs: Date.now() - params.startMs,
    toolInvocations: params.toolInvocations,
    createdAt: new Date().toISOString(),
  };
}
