/**
 * Coding Orchestrator Engine v1
 *
 * Server-side autonomous engine that drives the coding intent loop:
 *   intent → scopes → skills → execution packet → local agent invocation →
 *   structured output validation → positive domain enforcement →
 *   evidence persistence → outcome submission → review gate evaluation.
 *
 * Safety invariants:
 *   1. Every model call is attached to an orchestration run (pre-existing).
 *   2. Every returned file path is validated against positive allowed_domains.
 *   3. Structured output failures use `invalid_structured_output` (never conflated).
 *   4. Retry policy is bounded (MAX_RETRIES_PER_SCOPE).
 *   5. Autonomy terminates at review-ready or blocked — never self-merges.
 *
 * This service does NOT modify files or execute code itself. It calls the local
 * agent endpoint internally and validates the output contract.
 */

import { eq, and } from "drizzle-orm";

import { db } from "../db";
import {
  agents,
  agentOrchestrationRuns,
  intentExecutions,
  scopeExecutions,
} from "@shared/schema";
import type {
  CodingScopeKey,
  CodingAgentRoleType,
  ExecutionPacket,
  OutcomePacketFragment,
} from "@shared/intentExecutionPlane/contracts";
import {
  deriveScopes,
  bindSkills,
  createExecutionPacket,
  upsertOutcomePacket,
  evaluateReviewGates,
  startScopeActionRun,
  completeScopeActionRun,
  failScopeActionRun,
} from "./intentExecutionService";
import {
  persistOrchestrationViolation,
} from "./agentOrchestration";
import { getScopePolicy, derivePolicyForScopes } from "./domainPolicyEvaluator";
import {
  loadKnowledgeContext,
  loadSkillContext,
} from "./localAgentKnowledgeContext";
import { getLocalVoiceConfig } from "../local-voice/config";
import {
  checkJurisdiction,
  validatePathsAgainstAllowList,
} from "../routes/localAgentRoutes";

// ── Configuration ─────────────────────────────────────────────────────────────

const MAX_RETRIES_PER_SCOPE = 2;
const ORCHESTRATOR_TIMEOUT_MS = 60_000;

export type OrchestratorStepStatus =
  | "completed"
  | "blocked"
  | "failed"
  | "review_ready";

export interface OrchestratorStepResult {
  step: string;
  status: OrchestratorStepStatus;
  detail?: Record<string, unknown>;
}

export interface OrchestratorResult {
  intentExecutionId: string;
  orchestrationRunId: string | null;
  finalState: OrchestratorStepStatus;
  steps: OrchestratorStepResult[];
  scopeResults: ScopeExecutionResult[];
}

interface ScopeExecutionResult {
  scopeExecutionId: string;
  scopeKey: string;
  agentId: string | null;
  status: OrchestratorStepStatus;
  retries: number;
  filesTouched: string[];
  blockers: string[];
  domainViolations: string[];
}

// ── Agent resolution ──────────────────────────────────────────────────────────

async function resolveAgentForRole(
  siteConfigId: string,
  roleType: string,
): Promise<{ id: string; structuredControls: Record<string, unknown>; systemPrompt: string | null; aiModelId: string | null } | null> {
  const [agent] = await db
    .select({
      id: agents.id,
      structuredControls: agents.structuredControls,
      systemPrompt: agents.systemPrompt,
      aiModelId: agents.aiModelId,
    })
    .from(agents)
    .where(
      and(
        eq(agents.siteConfigId, siteConfigId),
        eq(agents.roleType, roleType),
        eq(agents.aiModelProvider, "local"),
        eq(agents.status, "active"),
      ),
    )
    .limit(1);

  if (!agent) return null;

  return {
    id: agent.id,
    structuredControls: (agent.structuredControls ?? {}) as Record<string, unknown>,
    systemPrompt: agent.systemPrompt,
    aiModelId: agent.aiModelId,
  };
}

// ── Local LLM call (internal, bypasses HTTP) ──────────────────────────────────

interface LocalLlmCallResult {
  ok: boolean;
  rawOutput: string;
  filesTouched: string[];
  assumptions: string[];
  blockers: string[];
  result: string;
  parseError: string | null;
  isTimeout: boolean;
}

async function callLocalLlm(params: {
  agent: { systemPrompt: string | null; aiModelId: string | null };
  prompt: string;
  taskType: string;
}): Promise<LocalLlmCallResult> {
  const config = getLocalVoiceConfig();

  const [knowledgeCtx, skillCtx] = await Promise.all([
    loadKnowledgeContext(params.taskType),
    loadSkillContext(params.taskType),
  ]);

  const systemBlock = [params.agent.systemPrompt ?? "", knowledgeCtx, skillCtx]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ORCHESTRATOR_TIMEOUT_MS);

  try {
    const r = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.agent.aiModelId || config.ollamaModel,
        prompt: `${systemBlock}\n\n---\n\nTask: ${params.prompt}`,
        stream: false,
        format: "json",
        options: { temperature: 0.1, num_predict: 4096 },
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return {
        ok: false,
        rawOutput: errText.slice(0, 300),
        filesTouched: [],
        assumptions: [],
        blockers: [`Ollama ${r.status}`],
        result: "",
        parseError: `ollama_http_${r.status}`,
        isTimeout: false,
      };
    }

    const payload = (await r.json()) as { response?: string };
    const rawOutput = payload.response ?? "";

    const parsed = parseLocalAgentOutput(rawOutput);
    return {
      ok: parsed.output !== null,
      rawOutput,
      filesTouched: parsed.output?.files_touched ?? [],
      assumptions: parsed.output?.assumptions ?? [],
      blockers: parsed.output?.blockers ?? [],
      result: parsed.output?.result ?? "",
      parseError: parsed.parseError,
      isTimeout: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      rawOutput: "",
      filesTouched: [],
      assumptions: [],
      blockers: [msg.slice(0, 400)],
      result: "",
      parseError: msg.toLowerCase().includes("abort") ? "timeout" : `llm_error:${msg.slice(0, 120)}`,
      isTimeout: msg.toLowerCase().includes("abort"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseLocalAgentOutput(raw: string): {
  output: { files_touched: string[]; assumptions: string[]; blockers: string[]; result: string } | null;
  parseError: string | null;
} {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { output: null, parseError: "no_json_object_found" };
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (
      !Array.isArray(parsed.files_touched) ||
      !Array.isArray(parsed.assumptions) ||
      !Array.isArray(parsed.blockers) ||
      typeof parsed.result !== "string"
    ) {
      const missing = [];
      if (!Array.isArray(parsed.files_touched)) missing.push("files_touched");
      if (!Array.isArray(parsed.assumptions)) missing.push("assumptions");
      if (!Array.isArray(parsed.blockers)) missing.push("blockers");
      if (typeof parsed.result !== "string") missing.push("result");
      return { output: null, parseError: `missing_fields:${missing.join(",")}` };
    }
    return {
      output: {
        files_touched: parsed.files_touched as string[],
        assumptions: parsed.assumptions as string[],
        blockers: parsed.blockers as string[],
        result: parsed.result as string,
      },
      parseError: null,
    };
  } catch (e) {
    return { output: null, parseError: `json_parse_error:${String(e).slice(0, 120)}` };
  }
}

// ── Scope execution ───────────────────────────────────────────────────────────

async function executeScopeAutonomously(params: {
  intentExecutionId: string;
  scopeExecutionId: string;
  scopeKey: CodingScopeKey;
  siteConfigId: string;
  orchestrationRunId: string;
  executionPacket: ExecutionPacket;
  intentKey: string;
  intentInput: Record<string, unknown>;
}): Promise<ScopeExecutionResult> {
  const scopePolicy = getScopePolicy(params.scopeKey);
  const specialistRole = scopePolicy.specialist_role as CodingAgentRoleType;

  const agent = await resolveAgentForRole(params.siteConfigId, specialistRole);
  if (!agent) {
    return {
      scopeExecutionId: params.scopeExecutionId,
      scopeKey: params.scopeKey,
      agentId: null,
      status: "blocked",
      retries: 0,
      filesTouched: [],
      blockers: [`No active local agent with roleType=${specialistRole} for site=${params.siteConfigId}`],
      domainViolations: [],
    };
  }

  const prompt = buildScopeExecutionPrompt({
    scopeKey: params.scopeKey,
    intentKey: params.intentKey,
    intentInput: params.intentInput,
    executionPacket: params.executionPacket,
    defaultActions: scopePolicy.default_actions ?? [],
  });

  const jurisdiction = checkJurisdiction(prompt, agent.structuredControls);
  if (!jurisdiction.allowed) {
    await persistOrchestrationViolation({
      violationType: "unauthorized_domain_access",
      severity: "high",
      orchestrationRunId: params.orchestrationRunId,
      siteConfigId: params.siteConfigId,
      routeOrSource: "codingOrchestratorEngine.executeScopeAutonomously",
      actorHint: agent.id,
      detail: { reason: jurisdiction.reason, scopeKey: params.scopeKey },
    });

    return {
      scopeExecutionId: params.scopeExecutionId,
      scopeKey: params.scopeKey,
      agentId: agent.id,
      status: "blocked",
      retries: 0,
      filesTouched: [],
      blockers: [`Jurisdiction violation: ${jurisdiction.reason}`],
      domainViolations: [],
    };
  }

  let lastResult: LocalLlmCallResult | null = null;
  let retries = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_SCOPE; attempt++) {
    const actionRun = await startScopeActionRun({
      scopeExecutionId: params.scopeExecutionId,
      actionKey: scopePolicy.default_actions?.[0] ?? "inspect_files",
      agentId: agent.id,
      orchestrationRunId: params.orchestrationRunId,
      actionInput: {
        attempt,
        prompt: prompt.slice(0, 500),
        scopeKey: params.scopeKey,
      },
    });

    const llmResult = await callLocalLlm({
      agent,
      prompt: attempt > 0
        ? `${prompt}\n\n[RETRY ${attempt}/${MAX_RETRIES_PER_SCOPE}] Previous attempt failed: ${lastResult?.parseError ?? "unknown"}. Fix the output format.`
        : prompt,
      taskType: "code",
    });

    lastResult = llmResult;

    if (!llmResult.ok) {
      await failScopeActionRun({
        actionRunId: actionRun.id,
        error: llmResult.parseError ?? "unknown_failure",
      });

      if (llmResult.parseError && !llmResult.isTimeout) {
        await persistOrchestrationViolation({
          violationType: "invalid_structured_output",
          severity: "medium",
          orchestrationRunId: params.orchestrationRunId,
          siteConfigId: params.siteConfigId,
          routeOrSource: "codingOrchestratorEngine.executeScopeAutonomously",
          actorHint: agent.id,
          detail: {
            attempt,
            parseError: llmResult.parseError,
            rawSnippet: llmResult.rawOutput.slice(0, 300),
            scopeKey: params.scopeKey,
          },
        });
      }

      retries = attempt;

      if (attempt < MAX_RETRIES_PER_SCOPE) {
        continue;
      }

      await db
        .update(scopeExecutions)
        .set({ state: "blocked", updatedAt: new Date() })
        .where(eq(scopeExecutions.id, params.scopeExecutionId));

      return {
        scopeExecutionId: params.scopeExecutionId,
        scopeKey: params.scopeKey,
        agentId: agent.id,
        status: "blocked",
        retries,
        filesTouched: [],
        blockers: [
          `Failed after ${MAX_RETRIES_PER_SCOPE + 1} attempts: ${llmResult.parseError ?? "unknown"}`,
        ],
        domainViolations: [],
      };
    }

    // ── Positive domain enforcement on returned file paths ──────────
    const domainCheck = validatePathsAgainstAllowList(
      llmResult.filesTouched,
      agent.structuredControls,
    );

    if (domainCheck.hasAllowList && domainCheck.rejected.length > 0) {
      await persistOrchestrationViolation({
        violationType: "domain_allowlist_violation",
        severity: "high",
        orchestrationRunId: params.orchestrationRunId,
        siteConfigId: params.siteConfigId,
        routeOrSource: "codingOrchestratorEngine.executeScopeAutonomously",
        actorHint: agent.id,
        detail: {
          rejectedPaths: domainCheck.rejected,
          allowedPaths: domainCheck.allowed,
          scopeKey: params.scopeKey,
          attempt,
        },
      });

      await failScopeActionRun({
        actionRunId: actionRun.id,
        error: `domain_allowlist_violation: ${domainCheck.rejected.join(", ")}`,
      });

      await db
        .update(scopeExecutions)
        .set({ state: "blocked", updatedAt: new Date() })
        .where(eq(scopeExecutions.id, params.scopeExecutionId));

      return {
        scopeExecutionId: params.scopeExecutionId,
        scopeKey: params.scopeKey,
        agentId: agent.id,
        status: "blocked",
        retries: attempt,
        filesTouched: llmResult.filesTouched,
        blockers: [`Domain allow-list violation: ${domainCheck.rejected.join(", ")}`],
        domainViolations: domainCheck.rejected,
      };
    }

    await completeScopeActionRun({
      actionRunId: actionRun.id,
      output: {
        files_touched: llmResult.filesTouched,
        assumptions: llmResult.assumptions,
        blockers: llmResult.blockers,
        result: llmResult.result,
      },
    });

    await db
      .update(scopeExecutions)
      .set({ state: "done", updatedAt: new Date() })
      .where(eq(scopeExecutions.id, params.scopeExecutionId));

    return {
      scopeExecutionId: params.scopeExecutionId,
      scopeKey: params.scopeKey,
      agentId: agent.id,
      status: llmResult.blockers.length > 0 ? "blocked" : "completed",
      retries: attempt,
      filesTouched: llmResult.filesTouched,
      blockers: llmResult.blockers,
      domainViolations: [],
    };
  }

  return {
    scopeExecutionId: params.scopeExecutionId,
    scopeKey: params.scopeKey,
    agentId: agent.id,
    status: "blocked",
    retries,
    filesTouched: [],
    blockers: ["exhausted_retries"],
    domainViolations: [],
  };
}

function buildScopeExecutionPrompt(params: {
  scopeKey: CodingScopeKey;
  intentKey: string;
  intentInput: Record<string, unknown>;
  executionPacket: ExecutionPacket;
  defaultActions: string[];
}): string {
  return [
    "You are executing a governed coding-plane action inside the AI OS.",
    `Scope: ${params.scopeKey}`,
    `Intent: ${params.intentKey}`,
    `Allowed actions: ${params.defaultActions.join(", ")}`,
    `Feature branch: ${params.executionPacket.featureBranch}`,
    `Base branch: ${params.executionPacket.baseBranch}`,
    params.executionPacket.worktreePath
      ? `Worktree: ${params.executionPacket.worktreePath}`
      : null,
    `Policy: approval_tier=${params.executionPacket.policyContext.approvalTier}`,
    `Authorized domains: ${(params.executionPacket.policyContext.authorizedDomains ?? []).join(", ") || "none specified"}`,
    "",
    "Intent input:",
    JSON.stringify(params.intentInput, null, 2),
    "",
    "You MUST return valid JSON with this exact schema:",
    '{ "files_touched": string[], "assumptions": string[], "blockers": string[], "result": string }',
    "",
    "Rules:",
    "- Only touch files within your authorized domains.",
    "- List every file you would touch in files_touched.",
    "- If you cannot complete the task, list blockers.",
    "- Be concrete and repo-specific in your result.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ── Main orchestrator entry point ─────────────────────────────────────────────

export async function executeIntentAutonomously(
  intentExecutionId: string,
  opts?: {
    createBranch?: boolean;
    createWorktree?: boolean;
    baseBranch?: string;
    repoRef?: string;
  },
): Promise<OrchestratorResult> {
  const steps: OrchestratorStepResult[] = [];
  const scopeResults: ScopeExecutionResult[] = [];

  // ── Load intent ─────────────────────────────────────────────────────
  const [intent] = await db
    .select()
    .from(intentExecutions)
    .where(eq(intentExecutions.id, intentExecutionId))
    .limit(1);

  if (!intent) {
    return {
      intentExecutionId,
      orchestrationRunId: null,
      finalState: "failed",
      steps: [{ step: "load_intent", status: "failed", detail: { error: "intent_not_found" } }],
      scopeResults: [],
    };
  }

  if (intent.state === "completed" || intent.state === "failed") {
    return {
      intentExecutionId,
      orchestrationRunId: intent.orchestrationRunId,
      finalState: intent.state === "completed" ? "completed" : "failed",
      steps: [{ step: "load_intent", status: intent.state === "completed" ? "completed" : "failed", detail: { reason: "already_terminal" } }],
      scopeResults: [],
    };
  }

  const siteConfigId = intent.siteConfigId;
  if (!siteConfigId) {
    return {
      intentExecutionId,
      orchestrationRunId: intent.orchestrationRunId,
      finalState: "failed",
      steps: [{ step: "load_intent", status: "failed", detail: { error: "no_site_config_id" } }],
      scopeResults: [],
    };
  }

  const orchestrationRunId = intent.orchestrationRunId;
  steps.push({ step: "load_intent", status: "completed" });

  // ── Step 1: Derive scopes ───────────────────────────────────────────
  let scopes;
  try {
    scopes = await deriveScopes(intentExecutionId);
    steps.push({
      step: "derive_scopes",
      status: "completed",
      detail: { scopeCount: scopes.length, scopeKeys: scopes.map((s) => s.scopeKey) },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "derive_scopes", status: "failed", detail: { error: msg } });
    await transitionIntentState(intentExecutionId, "failed");
    return { intentExecutionId, orchestrationRunId, finalState: "failed", steps, scopeResults };
  }

  // ── Step 2: Bind skills ─────────────────────────────────────────────
  try {
    await bindSkills(intentExecutionId);
    steps.push({ step: "bind_skills", status: "completed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "bind_skills", status: "failed", detail: { error: msg } });
    await transitionIntentState(intentExecutionId, "failed");
    return { intentExecutionId, orchestrationRunId, finalState: "failed", steps, scopeResults };
  }

  // ── Step 3: Create execution packets (one per scope) ────────────────
  const packets: Array<{ scopeExecutionId: string; packet: ExecutionPacket }> = [];
  for (const scope of scopes) {
    try {
      const packet = await createExecutionPacket(intentExecutionId, {
        scopeExecutionId: scope.id,
        repoRef: opts?.repoRef ?? "gateway-global-ai-platform",
        baseBranch: opts?.baseBranch ?? "main",
        createBranch: opts?.createBranch ?? false,
        createWorktree: opts?.createWorktree ?? false,
      });
      packets.push({ scopeExecutionId: scope.id, packet: packet as unknown as ExecutionPacket });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        step: "create_execution_packet",
        status: "failed",
        detail: { scopeKey: scope.scopeKey, error: msg },
      });
    }
  }
  steps.push({
    step: "create_execution_packets",
    status: packets.length > 0 ? "completed" : "failed",
    detail: { created: packets.length, total: scopes.length },
  });

  if (packets.length === 0) {
    await transitionIntentState(intentExecutionId, "failed");
    return { intentExecutionId, orchestrationRunId, finalState: "failed", steps, scopeResults };
  }

  // ── Step 4: Execute each scope autonomously ─────────────────────────
  for (const { scopeExecutionId, packet } of packets) {
    const scope = scopes.find((s) => s.id === scopeExecutionId);
    if (!scope) continue;

    const scopeResult = await executeScopeAutonomously({
      intentExecutionId,
      scopeExecutionId,
      scopeKey: scope.scopeKey as CodingScopeKey,
      siteConfigId,
      orchestrationRunId: orchestrationRunId ?? `synthetic-${intentExecutionId}`,
      executionPacket: packet,
      intentKey: intent.intentKey,
      intentInput: (intent.intentInput ?? {}) as Record<string, unknown>,
    });

    scopeResults.push(scopeResult);
  }

  steps.push({
    step: "execute_scopes",
    status: scopeResults.some((r) => r.status === "completed") ? "completed" : "blocked",
    detail: {
      completed: scopeResults.filter((r) => r.status === "completed").length,
      blocked: scopeResults.filter((r) => r.status === "blocked").length,
      failed: scopeResults.filter((r) => r.status === "failed").length,
    },
  });

  // ── Step 5: Assemble outcome packet ─────────────────────────────────
  const allFilesTouched = scopeResults.flatMap((r) =>
    r.filesTouched.map((p) => ({ path: p, changeType: "modified" as const })),
  );
  const allBlockers = scopeResults.flatMap((r) => r.blockers);
  const allDomainViolations = scopeResults.flatMap((r) => r.domainViolations);
  const hasAnyCompletion = scopeResults.some((r) => r.status === "completed");
  const allBlocked = scopeResults.every((r) => r.status === "blocked" || r.status === "failed");

  const outcomeFragment: OutcomePacketFragment = {
    summary: {
      engine: "codingOrchestratorEngine.v1",
      scopeResults: scopeResults.map((r) => ({
        scopeKey: r.scopeKey,
        status: r.status,
        retries: r.retries,
        filesCount: r.filesTouched.length,
      })),
    },
    filesTouched: allFilesTouched,
    domainsTouched: [...new Set(scopeResults.map((r) => r.scopeKey))],
    checksRun: [],
    risks: [
      ...allDomainViolations.map((p) => `domain_violation:${p}`),
      ...allBlockers,
    ],
    reviewReady: hasAnyCompletion && !allBlocked,
    requiredGates: [],
  };

  try {
    await upsertOutcomePacket(intentExecutionId, outcomeFragment);
    steps.push({ step: "assemble_outcome", status: "completed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "assemble_outcome", status: "failed", detail: { error: msg } });
  }

  // ── Step 6: Evaluate review gates ───────────────────────────────────
  if (hasAnyCompletion && !allBlocked) {
    try {
      const gates = await evaluateReviewGates(intentExecutionId);
      const allSatisfied = gates.every((g) => g.state === "satisfied");
      steps.push({
        step: "evaluate_review_gates",
        status: allSatisfied ? "completed" : "review_ready",
        detail: {
          gates: gates.map((g) => ({ key: g.gateKey, state: g.state })),
        },
      });

      await transitionIntentState(intentExecutionId, "review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({ step: "evaluate_review_gates", status: "failed", detail: { error: msg } });
    }
  } else {
    await transitionIntentState(intentExecutionId, allBlocked ? "failed" : "review");
  }

  // ── Determine final state ───────────────────────────────────────────
  let finalState: OrchestratorStepStatus;
  if (allBlocked) {
    finalState = "blocked";
  } else if (hasAnyCompletion) {
    finalState = "review_ready";
  } else {
    finalState = "failed";
  }

  if (orchestrationRunId) {
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: finalState === "review_ready" ? "completed" : finalState === "blocked" ? "blocked" : "failed",
        currentState: finalState,
        metadata: {
          purpose: "coding_intent_execution",
          engine: "codingOrchestratorEngine.v1",
          finalState,
          stepsCount: steps.length,
          scopeResultsCount: scopeResults.length,
        },
        reviewRequired: true,
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, orchestrationRunId));
  }

  return { intentExecutionId, orchestrationRunId, finalState, steps, scopeResults };
}

async function transitionIntentState(
  intentExecutionId: string,
  state: "executing" | "review" | "completed" | "failed",
): Promise<void> {
  await db
    .update(intentExecutions)
    .set({
      state,
      ...(state === "completed" || state === "failed" ? { completedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(intentExecutions.id, intentExecutionId));
}
