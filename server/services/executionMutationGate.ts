/**
 * Server-side mutation gate: validate envelope, then dispatch to governed executors.
 * v0: gemini_tool_invocation → handleToolCall (see EXECUTION_MUTATION_GATE_SPEC_V1.md).
 *
 * Structured logs: `metric_group: "mutation_gate"` + `evt` for aggregation (grep / log sinks).
 */
import { handleToolCall, type ToolCallContext } from "./toolHandler";
import {
  parseExecutionMutationRequest,
  type ExecutionMutationRequest,
} from "@shared/executionMutationGate";

export type MutationGateLogContext = {
  voiceSessionId?: string | null;
  siteConfigId?: string | null;
  /** When envelope parse fails, caller supplies path/transport for metrics. */
  routeOrSource?: string;
  transport?: string;
  proposedCapability?: string;
};

export type MutationGateMetricEvt =
  | "mutation_gate.invalid_envelope"
  | "mutation_gate.execution_failed"
  | "mutation_gate.executed"
  | "mutation_gate.unsupported_mutation_kind";

function emitMutationGateMetric(payload: {
  evt: MutationGateMetricEvt;
  routeOrSource?: string;
  transport?: string;
  capability?: string;
  actor?: string;
  correlationId?: string;
  voiceSessionId?: string | null;
  siteConfigId?: string | null;
  reason?: string;
  code?: string;
}): void {
  const line = JSON.stringify({
    metric_group: "mutation_gate",
    ...payload,
  });
  if (payload.evt === "mutation_gate.execution_failed") {
    console.error("[mutation_gate]", line);
  } else if (
    payload.evt === "mutation_gate.invalid_envelope" ||
    payload.evt === "mutation_gate.unsupported_mutation_kind"
  ) {
    console.warn("[mutation_gate]", line);
  } else {
    console.log("[mutation_gate]", line);
  }
}

function logFieldsFromContext(ctx?: MutationGateLogContext): {
  routeOrSource?: string;
  transport?: string;
  capability?: string;
  voiceSessionId?: string | null;
  siteConfigId?: string | null;
} {
  if (!ctx) return {};
  return {
    routeOrSource: ctx.routeOrSource,
    transport: ctx.transport,
    capability: ctx.proposedCapability,
    voiceSessionId: ctx.voiceSessionId,
    siteConfigId: ctx.siteConfigId,
  };
}

export type ExecutionMutationAudit = {
  routeOrSource: string;
  transport: string;
  actor: string;
  correlationId?: string;
};

export type ExecutionMutationOk = {
  ok: true;
  mutationKind: ExecutionMutationRequest["mutationKind"];
  capability: string;
  result: unknown;
  audit: ExecutionMutationAudit;
};

export type ExecutionMutationErr = {
  ok: false;
  code: "INVALID_ENVELOPE" | "UNSUPPORTED_MUTATION_KIND" | "EXECUTION_FAILED";
  reason: string;
  details?: unknown;
};

export type ExecutionMutationResult = ExecutionMutationOk | ExecutionMutationErr;

export type ExecuteContractOptions = {
  toolCallContext?: ToolCallContext;
  mutationGateLogContext?: MutationGateLogContext;
};

/**
 * Single entry for tool-style mutations after orchestration normalization.
 */
export async function executeContract(
  raw: unknown,
  opts?: ExecuteContractOptions,
): Promise<ExecutionMutationResult> {
  const logCtx = opts?.mutationGateLogContext;
  const parsed = parseExecutionMutationRequest(raw);
  if (!parsed.success) {
    emitMutationGateMetric({
      evt: "mutation_gate.invalid_envelope",
      reason: parsed.error.message,
      code: "INVALID_ENVELOPE",
      ...logFieldsFromContext(logCtx),
    });
    return {
      ok: false,
      code: "INVALID_ENVELOPE",
      reason: parsed.error.message,
      details: parsed.error.flatten(),
    };
  }

  const req = parsed.data;

  if (req.mutationKind === "gemini_tool_invocation") {
    try {
      const result = await handleToolCall(
        {
          name: req.capability,
          args: req.payload,
          id: req.caller.correlationId,
        },
        opts?.toolCallContext,
      );
      emitMutationGateMetric({
        evt: "mutation_gate.executed",
        routeOrSource: req.context.routeOrSource,
        transport: req.context.transport,
        capability: req.capability,
        actor: req.caller.actor,
        correlationId: req.caller.correlationId,
        voiceSessionId: logCtx?.voiceSessionId,
        siteConfigId: logCtx?.siteConfigId ?? req.context.siteConfigId,
      });
      return {
        ok: true,
        mutationKind: req.mutationKind,
        capability: req.capability,
        result,
        audit: {
          routeOrSource: req.context.routeOrSource,
          transport: req.context.transport,
          actor: req.caller.actor,
          correlationId: req.caller.correlationId,
        },
      };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      emitMutationGateMetric({
        evt: "mutation_gate.execution_failed",
        routeOrSource: req.context.routeOrSource,
        transport: req.context.transport,
        capability: req.capability,
        actor: req.caller.actor,
        correlationId: req.caller.correlationId,
        voiceSessionId: logCtx?.voiceSessionId,
        siteConfigId: logCtx?.siteConfigId ?? req.context.siteConfigId,
        code: "EXECUTION_FAILED",
        reason,
      });
      return {
        ok: false,
        code: "EXECUTION_FAILED",
        reason,
      };
    }
  }

  emitMutationGateMetric({
    evt: "mutation_gate.unsupported_mutation_kind",
    reason: `mutationKind ${(req as { mutationKind: string }).mutationKind} has no dispatcher`,
    code: "UNSUPPORTED_MUTATION_KIND",
    routeOrSource: req.context.routeOrSource,
    transport: req.context.transport,
    voiceSessionId: logCtx?.voiceSessionId,
    siteConfigId: logCtx?.siteConfigId ?? req.context.siteConfigId,
  });
  return {
    ok: false,
    code: "UNSUPPORTED_MUTATION_KIND",
    reason: `mutationKind ${(req as { mutationKind: string }).mutationKind} has no dispatcher`,
  };
}
