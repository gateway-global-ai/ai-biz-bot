/**
 * Governed Local Agent Plane — task dispatch, status, and sub-agent spawn.
 *
 * Entry point for all local (Ollama) agent calls. Enforces:
 *   - Agent jurisdiction check (allowed_domains / forbidden_domains from structuredControls)
 *   - Orchestration run creation before any LLM call
 *   - Structured output contract: { files_touched, assumptions, blockers, result }
 *   - Violation logging for governance breaches
 *   - Raw output + parse error + files_touched persistence for every run
 *   - review_required: true on all completions until the review loop is certified
 *   - spawn-sub-agent inherits parent agent's jurisdiction (child cannot widen scope)
 *
 * Auth: admin session (requireAuth) on all endpoints.
 * Model: LOCAL_LLM_BASE_URL + LOCAL_LLM_MODEL (see server/local-voice/config.ts)
 *
 * DO NOT add voice, SSE, or WebSocket handlers here. This is a JSON-only, async route.
 * See .cursor/rules/local-agent-governance.mdc for the full contract.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth";
import { db } from "../db";
import { actionRuns, agents, agentOrchestrationRuns, evidenceArtifacts } from "@shared/schema";
import {
  OutcomePacketFragmentSchema,
  UpgradedLocalAgentTaskBodySchema,
  type ActionRequest,
  type ExecutionPacket,
  type OutcomePacketFragment,
} from "@shared/intentExecutionPlane/contracts";
import {
  createSingleAgentOrchestrationRun,
  completeSingleAgentCreateRun,
  persistOrchestrationViolation,
} from "../services/agentOrchestration";
import {
  loadKnowledgeContext,
  loadSkillContext,
} from "../services/localAgentKnowledgeContext";
import { getLocalVoiceConfig } from "../local-voice/config";
import { upsertOutcomePacket } from "../services/intentExecutionService";

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const taskBody = UpgradedLocalAgentTaskBodySchema;

const spawnBody = z.object({
  parentRunId: z.string().min(1),
  taskType: z.enum(["governance", "code", "agent", "ui"]),
  prompt: z.string().min(1).max(60_000),
  agentId: z.string().min(1),
  siteConfigId: z.string().min(1),
});

// ── Structured output type ────────────────────────────────────────────────────

interface LocalAgentOutput {
  files_touched: string[];
  assumptions: string[];
  blockers: string[];
  result: string;
  review_required?: boolean;
}

function buildExecutionPrompt(params: {
  prompt?: string;
  actionRequest?: ActionRequest;
  executionPacket?: ExecutionPacket;
  responseSchemaId?: string;
  intentExecutionId?: string;
  scopeExecutionId?: string;
}): string {
  if (params.prompt) return params.prompt;

  const parts = [
    "You are executing a structured coding-plane action.",
    params.intentExecutionId ? `IntentExecutionId: ${params.intentExecutionId}` : null,
    params.scopeExecutionId ? `ScopeExecutionId: ${params.scopeExecutionId}` : null,
    params.executionPacket
      ? `ExecutionPacket: ${JSON.stringify(params.executionPacket)}`
      : null,
    params.actionRequest
      ? `ActionRequest: ${JSON.stringify(params.actionRequest)}`
      : null,
    params.responseSchemaId
      ? `Return schema: ${params.responseSchemaId}`
      : "Return schema: local_agent_output",
  ].filter(Boolean);

  return parts.join("\n");
}

function parseOutcomeFragment(raw: string): {
  output: OutcomePacketFragment | null;
  parseError: string | null;
} {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { output: null, parseError: "no_json_object_found" };
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = OutcomePacketFragmentSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        output: null,
        parseError: validated.error.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`).join("; "),
      };
    }
    return { output: validated.data, parseError: null };
  } catch (e) {
    return { output: null, parseError: `json_parse_error:${String(e).slice(0, 120)}` };
  }
}

function parseStructuredOutput(raw: string): {
  output: LocalAgentOutput | null;
  parseError: string | null;
} {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { output: null, parseError: "no_json_object_found" };
    const parsed = JSON.parse(jsonMatch[0]) as Partial<LocalAgentOutput>;
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
      return {
        output: null,
        parseError: `missing_fields:${missing.join(",")}`,
      };
    }
    return { output: parsed as LocalAgentOutput, parseError: null };
  } catch (e) {
    return { output: null, parseError: `json_parse_error:${String(e).slice(0, 120)}` };
  }
}

// ── Jurisdiction check ────────────────────────────────────────────────────────

const VOICE_LOCKDOWN_PATTERNS = [
  "geminiVoice",
  "voiceStream",
  "voiceGemini",
  "voiceSession",
  "audioCodec",
  "geminiLiveProtocol",
  "clear-voice-processor",
  "services/voice",
];

export function checkJurisdiction(
  prompt: string,
  structuredControls: Record<string, unknown>,
): { allowed: boolean; reason?: string } {
  for (const pattern of VOICE_LOCKDOWN_PATTERNS) {
    if (prompt.includes(pattern)) {
      return {
        allowed: false,
        reason: `Voice runtime reference detected: ${pattern}`,
      };
    }
  }

  const plane = structuredControls?.localAgentPlane as
    | { forbidden_domains?: string[]; prompt_patterns_forbidden?: string[] }
    | undefined;

  // Check agent-specific forbidden prompt patterns (e.g. inline styles, raw MUI imports)
  const promptPatterns = plane?.prompt_patterns_forbidden ?? [];
  for (const pattern of promptPatterns) {
    if (prompt.includes(pattern)) {
      return { allowed: false, reason: `UI governance violation: "${pattern}" is forbidden in this agent's scope` };
    }
  }

  const forbidden = plane?.forbidden_domains ?? [];

  for (const domain of forbidden) {
    const base = domain.replace("/**", "").replace("**", "");
    if (prompt.includes(base)) {
      return { allowed: false, reason: `Forbidden domain referenced: ${domain}` };
    }
  }

  return { allowed: true };
}

// ── Positive domain allow-list enforcement ────────────────────────────────────

/**
 * Validate that every file path returned by the model falls within the agent's
 * explicitly allowed domains. Returns paths that are NOT allowed.
 *
 * Unlike `checkJurisdiction` (prompt-text substring), this operates on the
 * actual file paths the model claims to have touched — post-execution truth,
 * not pre-execution heuristics.
 *
 * If `allowed_domains` is empty or unset, all paths are considered allowed
 * (the agent has no positive restriction — only `forbidden_domains` apply).
 */
export function validatePathsAgainstAllowList(
  filePaths: string[],
  structuredControls: Record<string, unknown>,
): { allowed: string[]; rejected: string[]; hasAllowList: boolean } {
  const plane = structuredControls?.localAgentPlane as
    | { allowed_domains?: string[]; forbidden_domains?: string[] }
    | undefined;

  const allowedDomains = plane?.allowed_domains ?? [];
  if (allowedDomains.length === 0) {
    return { allowed: filePaths, rejected: [], hasAllowList: false };
  }

  const normalizedAllowList = allowedDomains.map((d) =>
    d.replace(/\/\*\*$/, "").replace(/\*\*$/, "").replace(/\/$/, ""),
  );

  const allowed: string[] = [];
  const rejected: string[] = [];

  for (const filePath of filePaths) {
    const normalized = filePath.replace(/^\.\//, "").replace(/^\//, "");
    const isAllowed = normalizedAllowList.some(
      (domain) => normalized === domain || normalized.startsWith(`${domain}/`),
    );
    if (isAllowed) {
      allowed.push(filePath);
    } else {
      rejected.push(filePath);
    }
  }

  return { allowed, rejected, hasAllowList: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Merge two structuredControls objects, keeping the *more restrictive* set of forbidden_domains. */
function mergeControls(
  parentControls: Record<string, unknown>,
  childControls: Record<string, unknown>,
): Record<string, unknown> {
  const pPlane = (parentControls.localAgentPlane ?? {}) as {
    allowed_domains?: string[];
    forbidden_domains?: string[];
    governanceOverride?: boolean;
  };
  const cPlane = (childControls.localAgentPlane ?? {}) as {
    allowed_domains?: string[];
    forbidden_domains?: string[];
    governanceOverride?: boolean;
  };

  const mergedForbidden = Array.from(
    new Set([...(pPlane.forbidden_domains ?? []), ...(cPlane.forbidden_domains ?? [])]),
  );

  // Child's allowed_domains can only be a subset of parent's, never wider
  const parentAllowed = pPlane.allowed_domains ?? [];
  const childAllowed = cPlane.allowed_domains ?? [];
  const mergedAllowed =
    parentAllowed.length === 0
      ? childAllowed
      : childAllowed.length === 0
        ? parentAllowed
        : childAllowed.filter((d) =>
            parentAllowed.some((p) => d.startsWith(p.replace("/**", ""))),
          );

  return {
    ...childControls,
    localAgentPlane: {
      ...cPlane,
      allowed_domains: mergedAllowed,
      forbidden_domains: mergedForbidden,
      governanceOverride: false,
    },
  };
}

// ── POST /api/local-agent/task ────────────────────────────────────────────────

router.post("/task", requireAuth, async (req: Request, res: Response) => {
  const parsed = taskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const {
    taskType,
    prompt,
    siteConfigId,
    agentId,
    subAgentOf,
    workItemId,
    intentExecutionId,
    scopeExecutionId,
    executionPacket,
    actionRequest,
    responseSchemaId,
  } = parsed.data;
  const config = getLocalVoiceConfig();

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) {
    res.status(404).json({ error: "agent_not_found" });
    return;
  }

  if (agent.aiModelProvider !== "local") {
    res.status(400).json({ error: "agent_not_local_provider" });
    return;
  }

  let controls = (agent.structuredControls ?? {}) as Record<string, unknown>;

  // If this is a sub-agent call, look up the parent run's agent and merge
  // jurisdiction so the child can never widen scope beyond the parent.
  if (subAgentOf) {
    const [parentRun] = await db
      .select()
      .from(agentOrchestrationRuns)
      .where(eq(agentOrchestrationRuns.id, subAgentOf))
      .limit(1);

    if (parentRun?.agentId && parentRun.agentId !== agentId) {
      const [parentAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, parentRun.agentId))
        .limit(1);
      if (parentAgent?.structuredControls) {
        controls = mergeControls(
          parentAgent.structuredControls as Record<string, unknown>,
          controls,
        );
      }
    }
  }

  const effectivePrompt = buildExecutionPrompt({
    prompt,
    actionRequest,
    executionPacket,
    responseSchemaId,
    intentExecutionId,
    scopeExecutionId,
  });

  const jurisdiction = checkJurisdiction(effectivePrompt, controls);
  if (!jurisdiction.allowed) {
    await persistOrchestrationViolation({
      violationType: "unauthorized_domain_access",
      severity: "high",
      siteConfigId,
      routeOrSource: "POST /api/local-agent/task",
      actorHint: agentId,
      detail: {
        reason: jurisdiction.reason,
        taskType,
        promptSnippet: effectivePrompt.slice(0, 200),
        intentExecutionId: intentExecutionId ?? null,
        scopeExecutionId: scopeExecutionId ?? null,
      },
    });
    res.status(403).json({
      error: "jurisdiction_violation",
      reason: jurisdiction.reason,
    });
    return;
  }

  const { runId } = await createSingleAgentOrchestrationRun({ siteConfigId });

  let actionRunId: string | null = null;

  // Link to parent run and stamp violation_reason=null (clean start)
  await db
    .update(agentOrchestrationRuns)
    .set({
      agentId,
      metadata: subAgentOf
        ? {
            purpose: actionRequest ? "coding_action_execution" : "single_agent_create",
            parentRunId: subAgentOf,
            workItemId: workItemId ?? null,
            intentExecutionId: intentExecutionId ?? null,
            scopeExecutionId: scopeExecutionId ?? null,
            responseSchemaId: responseSchemaId ?? null,
          }
        : {
            purpose: actionRequest ? "coding_action_execution" : "single_agent_create",
            workItemId: workItemId ?? null,
            intentExecutionId: intentExecutionId ?? null,
            scopeExecutionId: scopeExecutionId ?? null,
            responseSchemaId: responseSchemaId ?? null,
          },
      reviewRequired: true,
      updatedAt: new Date(),
    })
    .where(eq(agentOrchestrationRuns.id, runId));

  if (scopeExecutionId && actionRequest) {
    const [createdActionRun] = await db
      .insert(actionRuns)
      .values({
        scopeExecutionId,
        orchestrationRunId: runId,
        agentId,
        actionKey: actionRequest.actionKey,
        state: "running",
        actionInput: actionRequest,
        startedAt: new Date(),
      })
      .returning({ id: actionRuns.id });
    actionRunId = createdActionRun.id;
  }

  try {
    const [knowledgeCtx, skillCtx] = await Promise.all([
      loadKnowledgeContext(taskType ?? "code"),
      loadSkillContext(taskType ?? "code"),
    ]);

    const systemBlock = [agent.systemPrompt ?? "", knowledgeCtx, skillCtx]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    let ollamaText = "";
    try {
      const r = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: agent.aiModelId || config.ollamaModel,
          prompt: `${systemBlock}\n\n---\n\nTask: ${effectivePrompt}`,
          stream: false,
          format: "json",
          options: { temperature: 0.1, num_predict: 4096 },
        }),
        signal: controller.signal,
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        throw new Error(`Ollama ${r.status}: ${errText.slice(0, 300)}`);
      }

      const payload = (await r.json()) as { response?: string };
      ollamaText = payload.response ?? "";
    } finally {
      clearTimeout(timeout);
    }

    const outcomeParse =
      responseSchemaId === "OutcomePacket.v1" ? parseOutcomeFragment(ollamaText) : { output: null, parseError: null };
    const { output: structured, parseError } =
      responseSchemaId === "OutcomePacket.v1"
        ? { output: null, parseError: outcomeParse.parseError }
        : parseStructuredOutput(ollamaText);

    if (!structured && !outcomeParse.output) {
      await persistOrchestrationViolation({
        violationType: "invalid_structured_output",
        severity: "medium",
        orchestrationRunId: runId,
        siteConfigId,
        routeOrSource: "POST /api/local-agent/task",
        actorHint: agentId,
        detail: { reason: "output_parse_failure", parseError, rawSnippet: ollamaText.slice(0, 300) },
      });

      await db
        .update(agentOrchestrationRuns)
        .set({
          status: "blocked",
          currentState: "blocked",
          blockers: [{ code: "output_parse_failure", message: "Response was not valid LocalAgentOutput JSON" }],
          rawModelOutput: ollamaText.slice(0, 8000),
          parseError: parseError ?? "unknown",
          reviewRequired: true,
          updatedAt: new Date(),
        })
        .where(eq(agentOrchestrationRuns.id, runId));

      res.status(422).json({
        error: "structured_output_parse_failure",
        runId,
        parseError,
        raw: ollamaText.slice(0, 500),
      });
      return;
    }

    // ── Positive allow-list enforcement on returned file paths ──────────
    const returnedPaths =
      responseSchemaId === "OutcomePacket.v1"
        ? (outcomeParse.output?.filesTouched.map((f) => f.path) ?? [])
        : (structured?.files_touched ?? []);

    const domainCheck = validatePathsAgainstAllowList(returnedPaths, controls);
    if (domainCheck.hasAllowList && domainCheck.rejected.length > 0) {
      await persistOrchestrationViolation({
        violationType: "domain_allowlist_violation",
        severity: "high",
        orchestrationRunId: runId,
        siteConfigId,
        routeOrSource: "POST /api/local-agent/task",
        actorHint: agentId,
        detail: {
          rejectedPaths: domainCheck.rejected,
          allowedPaths: domainCheck.allowed,
          intentExecutionId: intentExecutionId ?? null,
          scopeExecutionId: scopeExecutionId ?? null,
        },
      });

      await db
        .update(agentOrchestrationRuns)
        .set({
          status: "blocked",
          currentState: "blocked",
          rawModelOutput: ollamaText.slice(0, 8000),
          parseError: null,
          filesTouchedJson: returnedPaths,
          blockers: [{
            code: "domain_allowlist_violation",
            message: `Model returned paths outside allowed domains: ${domainCheck.rejected.join(", ")}`,
          }],
          reviewRequired: true,
          updatedAt: new Date(),
        })
        .where(eq(agentOrchestrationRuns.id, runId));

      res.status(403).json({
        error: "domain_allowlist_violation",
        runId,
        rejectedPaths: domainCheck.rejected,
        allowedPaths: domainCheck.allowed,
      });
      return;
    }

    // Persist audit data before completing the run
    await db
      .update(agentOrchestrationRuns)
      .set({
        rawModelOutput: ollamaText.slice(0, 8000),
        parseError: null,
        filesTouchedJson: returnedPaths,
        reviewRequired: true,
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));

    if (actionRunId) {
      await db
        .update(actionRuns)
        .set({
          state: "succeeded",
          actionOutput:
            responseSchemaId === "OutcomePacket.v1"
              ? (outcomeParse.output ?? {})
              : {
                  files_touched: structured?.files_touched ?? [],
                  assumptions: structured?.assumptions ?? [],
                  blockers: structured?.blockers ?? [],
                  result: structured?.result ?? "",
                },
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(actionRuns.id, actionRunId));
    }

    if (actionRunId && outcomeParse.output) {
      const diffArtifact = outcomeParse.output.checksRun
        .filter((check) => check.artifactUri)
        .map((check) => ({
          actionRunId,
          kind: "check_run_artifact",
          uri: check.artifactUri!,
          metadata: { cmd: check.cmd, status: check.status },
        }));
      if (diffArtifact.length > 0) {
        await db.insert(evidenceArtifacts).values(diffArtifact);
      }
    }

    if (intentExecutionId && outcomeParse.output) {
      await upsertOutcomePacket(intentExecutionId, outcomeParse.output);
    }

    await completeSingleAgentCreateRun({ runId, agentId });

    res.json({
      ok: true,
      runId,
      actionRunId: actionRunId ?? undefined,
      model: agent.aiModelId || config.ollamaModel,
      taskType: taskType ?? "code",
      review_required: true,
      ...(responseSchemaId === "OutcomePacket.v1"
        ? outcomeParse.output
        : {
            files_touched: structured!.files_touched,
            assumptions: structured!.assumptions,
            blockers: structured!.blockers,
            result: structured!.result,
          }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.toLowerCase().includes("abort");

    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "failed",
        currentState: "failed",
        blockers: [{ message: msg }],
        reviewRequired: true,
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));

    if (actionRunId) {
      await db
        .update(actionRuns)
        .set({
          state: "failed",
          actionOutput: { error: msg.slice(0, 400) },
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(actionRuns.id, actionRunId));
    }

    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? "local_llm_timeout" : "local_llm_error",
      runId,
      detail: msg.slice(0, 400),
    });
  }
});

// ── GET /api/local-agent/status/:runId ───────────────────────────────────────

router.get("/status/:runId", requireAuth, async (req: Request, res: Response) => {
  const runIdRaw = req.params.runId;
  const runId = typeof runIdRaw === "string" ? runIdRaw : runIdRaw?.[0];
  if (!runId) {
    res.status(400).json({ error: "run_id_required" });
    return;
  }

  const [run] = await db
    .select()
    .from(agentOrchestrationRuns)
    .where(eq(agentOrchestrationRuns.id, runId))
    .limit(1);

  if (!run) {
    res.status(404).json({ error: "run_not_found" });
    return;
  }

  res.json({ ok: true, run });
});

// ── POST /api/local-agent/spawn-sub-agent ────────────────────────────────────
// Child inherits parent agent's structuredControls merged with its own.
// A child CANNOT widen scope beyond what the parent permits.

router.post("/spawn-sub-agent", requireAuth, async (req: Request, res: Response) => {
  const parsed = spawnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { parentRunId, taskType, prompt, agentId, siteConfigId } = parsed.data;

  const [parentRun] = await db
    .select()
    .from(agentOrchestrationRuns)
    .where(eq(agentOrchestrationRuns.id, parentRunId))
    .limit(1);

  if (!parentRun) {
    res.status(404).json({ error: "parent_run_not_found" });
    return;
  }

  const [childAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!childAgent || childAgent.aiModelProvider !== "local") {
    res.status(400).json({ error: "child_agent_not_found_or_not_local" });
    return;
  }

  // Resolve effective jurisdiction: child cannot exceed parent's limits
  let effectiveControls = (childAgent.structuredControls ?? {}) as Record<string, unknown>;
  if (parentRun.agentId && parentRun.agentId !== agentId) {
    const [parentAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, parentRun.agentId))
      .limit(1);
    if (parentAgent?.structuredControls) {
      effectiveControls = mergeControls(
        parentAgent.structuredControls as Record<string, unknown>,
        effectiveControls,
      );
    }
  }

  // Pre-flight jurisdiction check on the spawn prompt
  const jurisdiction = checkJurisdiction(prompt, effectiveControls);
  if (!jurisdiction.allowed) {
    await persistOrchestrationViolation({
      violationType: "unauthorized_domain_access",
      severity: "high",
      orchestrationRunId: parentRunId,
      siteConfigId,
      routeOrSource: "POST /api/local-agent/spawn-sub-agent",
      actorHint: agentId,
      detail: { reason: jurisdiction.reason, taskType, promptSnippet: prompt.slice(0, 200) },
    });
    res.status(403).json({
      error: "jurisdiction_violation",
      reason: jurisdiction.reason,
      parentRunId,
    });
    return;
  }

  const { runId: childRunId } = await createSingleAgentOrchestrationRun({ siteConfigId });

  await db
    .update(agentOrchestrationRuns)
    .set({
      agentId,
      metadata: {
        purpose: "single_agent_create",
        parentRunId,
        taskType,
        promptSnippet: prompt.slice(0, 200),
        inheritedJurisdiction: true,
      },
      reviewRequired: true,
      updatedAt: new Date(),
    })
    .where(eq(agentOrchestrationRuns.id, childRunId));

  res.json({
    ok: true,
    childRunId,
    parentRunId,
    jurisdiction: "inherited_from_parent",
    note: "Call POST /api/local-agent/task with subAgentOf=childRunId to dispatch.",
  });
});

export default router;
