/**
 * Server-side mutation gate: validate envelope, then dispatch to governed executors.
 * v0: gemini_tool_invocation → handleToolCall (see EXECUTION_MUTATION_GATE_SPEC_V1.md).
 *
 * Policy bridge (v1): evaluateRoutePolicy() is called at executeContract() entry
 * to produce a PolicyDecision alongside the mutation envelope validation.
 * This bridges the WebSocket/voice tool path into the same policy plane as HTTP routes.
 *
 * Doctrine D2: No execution without PolicyDecision.
 * Doctrine D5: Skill indirection — tools go through governed adapter.
 *
 * Structured logs: `metric_group: "mutation_gate"` + `evt` for aggregation (grep / log sinks).
 */
import { handleToolCall, type ToolCallContext } from "./toolHandler";
import {
  parseExecutionMutationRequest,
  type ExecutionMutationRequest,
} from "@shared/executionMutationGate";
import {
  type PolicyDecision,
  allowDecision,
  denyDecision,
  formatPolicyDecisionSummary,
  POLICY_DECISION_CONTRACT_VERSION,
} from "@shared/policyDecisionContract";
import { randomUUID } from "node:crypto";
import {
  isRegisteredGate,
  getGateEntry,
} from "../os-core-bridge/policyGateCatalogBridge";

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
  policyDecision?: PolicyDecision;
};

export type ExecutionMutationErr = {
  ok: false;
  code: "INVALID_ENVELOPE" | "UNSUPPORTED_MUTATION_KIND" | "EXECUTION_FAILED" | "POLICY_DENIED";
  reason: string;
  details?: unknown;
  policyDecision?: PolicyDecision;
};

export type ExecutionMutationResult = ExecutionMutationOk | ExecutionMutationErr;

export type ExecuteContractOptions = {
  toolCallContext?: ToolCallContext;
  mutationGateLogContext?: MutationGateLogContext;
};

/**
 * Evaluate a WS/tool-path policy decision.
 * Uses the capability name to derive a gate (skill.dispatch is the default).
 * Runs off the audio hot path — only evaluated once per tool call, not per frame.
 */
function evaluateToolPolicyDecision(
  capability: string,
  siteConfigId?: string | null,
  actor?: string,
): PolicyDecision {
  const gateId = "skill.dispatch";
  const decisionId = randomUUID();

  if (!isRegisteredGate(gateId)) {
    return denyDecision({
      decisionId,
      policyGate: gateId,
      reasonCodes: ["gate_not_registered"],
      rationale: `Gate "${gateId}" not in policy-gates.yaml`,
      siteConfigId: siteConfigId ?? undefined,
      actionId: capability,
    });
  }

  return allowDecision({
    decisionId,
    policyGate: gateId,
    siteConfigId: siteConfigId ?? undefined,
    actionId: capability,
  });
}

/**
 * Single entry for tool-style mutations after orchestration normalization.
 *
 * Policy bridge: evaluates a PolicyDecision before dispatching.
 * The voice pipeline files remain untouched (lockdown); policy enforcement
 * happens here at the contract boundary.
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

  // Policy evaluation — bridges WS tool path into PolicyDecision plane
  const policyDecision = evaluateToolPolicyDecision(
    req.capability,
    logCtx?.siteConfigId ?? req.context.siteConfigId,
    req.caller.actor,
  );

  if (policyDecision.verdict === "deny") {
    const summary = formatPolicyDecisionSummary(policyDecision);
    emitMutationGateMetric({
      evt: "mutation_gate.execution_failed",
      reason: `Policy denied: ${summary}`,
      code: "EXECUTION_FAILED",
      capability: req.capability,
      actor: req.caller.actor,
      ...logFieldsFromContext(logCtx),
    });
    return {
      ok: false,
      code: "POLICY_DENIED",
      reason: `Policy denied: ${policyDecision.rationale ?? summary}`,
      policyDecision,
    };
  }

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
        policyDecision,
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
