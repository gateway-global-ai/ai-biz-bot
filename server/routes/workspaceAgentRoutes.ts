/**
 * Workspace Agent Routes — Phase 5 Governed Dispatch Harness
 *
 * Entry point for all workspace provisioning tasks executed by the workspace_provisioning_agent.
 *
 * Security model:
 *   1. requireAuth on every endpoint — no public trigger surface
 *   2. Agent roleType must be "workspace_provisioning_agent" — no role confusion
 *   3. Every action validated against WORKSPACE_TOOL_REGISTRY before execution
 *   4. gmail.sendWelcome: templateId resolved server-side; free-form body never reaches sendEmail()
 *   5. workspace.updateStatus: DB write only; never reaches executeTool()
 *   6. review_required: true enforced on all deferred (requiresApproval) actions
 *   7. All violations logged to orchestration_violations
 *   8. Full execution result written back to agent_orchestration_runs
 *
 * Two-Plane Doctrine: This route is NEVER called by the Gemini Concierge.
 * It is triggered deterministically by operator actions or system events only.
 *
 * DO NOT add voice, SSE, WebSocket, or conversational AI handlers here.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../auth";
import { db } from "../db";
import { agents, agentOrchestrationRuns, workspaceConfigurations } from "@shared/schema";
import {
  createSingleAgentOrchestrationRun,
  persistOrchestrationViolation,
} from "../services/agentOrchestration";
import { createGoogleWorkspaceService } from "../mcp/googleWorkspace";
import type { GoogleWorkspaceCredentials } from "../mcp/googleWorkspace";
import { getLocalVoiceConfig } from "../local-voice/config";
import {
  WORKSPACE_TOOL_REGISTRY,
  WORKSPACE_WELCOME_TEMPLATES,
  WORKSPACE_ALLOWED_STATUSES,
  WORKSPACE_GOAL_CONTEXT,
  workspaceActionsArraySchema,
  type WorkspaceAction,
} from "@shared/workspaceToolRegistry";
import { checkJurisdiction } from "./localAgentRoutes";

const router = Router();

// ── Request schema ────────────────────────────────────────────────────────────

const provisionBody = z.object({
  agentId: z.string().min(1),
  siteConfigId: z.string().min(1),
  goal: z.enum(["setup_full", "verify_only", "calendar_only", "drive_only"]),
  businessName: z.string().max(200).optional(),
});

// ── Structured output parser ──────────────────────────────────────────────────

interface WorkspaceAgentOutput {
  files_touched: string[];
  assumptions: string[];
  blockers: string[];
  result: string;
  review_required: boolean;
  workspace_actions: WorkspaceAction[];
}

function parseWorkspaceOutput(raw: string): {
  output: WorkspaceAgentOutput | null;
  parseError: string | null;
} {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { output: null, parseError: "no_json_object_found" };
    const parsed = JSON.parse(jsonMatch[0]) as Partial<WorkspaceAgentOutput>;

    const missing: string[] = [];
    if (!Array.isArray(parsed.files_touched)) missing.push("files_touched");
    if (!Array.isArray(parsed.assumptions)) missing.push("assumptions");
    if (!Array.isArray(parsed.blockers)) missing.push("blockers");
    if (typeof parsed.result !== "string") missing.push("result");
    if (!Array.isArray(parsed.workspace_actions)) missing.push("workspace_actions");

    if (missing.length > 0) {
      return { output: null, parseError: `missing_fields:${missing.join(",")}` };
    }

    return { output: parsed as WorkspaceAgentOutput, parseError: null };
  } catch (e) {
    return { output: null, parseError: `json_parse_error:${String(e).slice(0, 120)}` };
  }
}

// ── Tool dispatch ─────────────────────────────────────────────────────────────

type ActionOutcome =
  | { status: "completed"; tool: string; data?: unknown }
  | { status: "deferred"; tool: string; reason: string }
  | { status: "skipped"; tool: string; reason: string }
  | { status: "error"; tool: string; error: string };

async function dispatchAction(
  action: WorkspaceAction,
  workspaceService: ReturnType<typeof createGoogleWorkspaceService>,
  siteConfigId: string,
  runId: string,
): Promise<ActionOutcome> {
  const registryEntry = WORKSPACE_TOOL_REGISTRY[action.tool];

  // ── Registry check ────────────────────────────────────────────────────────
  if (!registryEntry) {
    await persistOrchestrationViolation({
      violationType: "workspace_tool_unauthorized",
      severity: "high",
      orchestrationRunId: runId,
      siteConfigId,
      routeOrSource: "POST /api/workspace-agent/provision",
      detail: { tool: action.tool, params: action.params },
    });
    return { status: "skipped", tool: action.tool, reason: "tool_not_in_registry" };
  }

  // ── Required params check ─────────────────────────────────────────────────
  for (const required of registryEntry.requiredParams) {
    if (
      action.params[required] === undefined ||
      action.params[required] === null ||
      action.params[required] === ""
    ) {
      await persistOrchestrationViolation({
        violationType: "workspace_tool_unauthorized",
        severity: "medium",
        orchestrationRunId: runId,
        siteConfigId,
        routeOrSource: "POST /api/workspace-agent/provision",
        detail: { tool: action.tool, missingParam: required, params: action.params },
      });
      return { status: "skipped", tool: action.tool, reason: `missing_required_param:${required}` };
    }
  }

  // ── Approval gate ─────────────────────────────────────────────────────────
  if (registryEntry.requiresApproval) {
    return {
      status: "deferred",
      tool: action.tool,
      reason: "requires_operator_approval",
    };
  }

  // ── Internal DB-only tools (workspace.updateStatus) ───────────────────────
  if (registryEntry.gswTool === "_internal_db_only_") {
    if (action.tool === "workspace.updateStatus") {
      const newStatus = String(action.params["status"] ?? "");
      if (!WORKSPACE_ALLOWED_STATUSES.has(newStatus)) {
        return {
          status: "skipped",
          tool: action.tool,
          reason: `invalid_status_value:${newStatus}`,
        };
      }
      await db
        .update(workspaceConfigurations)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      return { status: "completed", tool: action.tool, data: { status: newStatus } };
    }
    return { status: "skipped", tool: action.tool, reason: "unknown_db_only_tool" };
  }

  // ── gmail.sendWelcome: resolve template server-side ───────────────────────
  if (action.tool === "gmail.sendWelcome") {
    const templateId = String(action.params["templateId"] ?? "");
    const template = WORKSPACE_WELCOME_TEMPLATES[templateId];
    if (!template) {
      return { status: "skipped", tool: action.tool, reason: `unknown_templateId:${templateId}` };
    }
    // Strip any body the agent may have tried to inject — template only
    const safeParams = {
      to: action.params["to"],
      subject: template.subject,
      body: template.body,
    };
    const result = await workspaceService.executeTool("sendEmail", safeParams);
    if (!result.success) {
      return { status: "error", tool: action.tool, error: result.error ?? "send_failed" };
    }
    return { status: "completed", tool: action.tool, data: result.data };
  }

  // ── Standard executeTool() dispatch ──────────────────────────────────────
  try {
    const result = await workspaceService.executeTool(registryEntry.gswTool, action.params);
    if (!result.success) {
      return { status: "error", tool: action.tool, error: result.error ?? "executeTool_failed" };
    }
    return { status: "completed", tool: action.tool, data: result.data };
  } catch (err) {
    return { status: "error", tool: action.tool, error: String(err).slice(0, 300) };
  }
}

// ── POST /api/workspace-agent/provision ──────────────────────────────────────

router.post("/provision", requireAuth, async (req: Request, res: Response) => {
  const parsed = provisionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { agentId, siteConfigId, goal, businessName } = parsed.data;
  const config = getLocalVoiceConfig();

  // ── 1. Load and validate agent ────────────────────────────────────────────
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) {
    return res.status(404).json({ error: "agent_not_found" });
  }

  if (agent.roleType !== "workspace_provisioning_agent") {
    await persistOrchestrationViolation({
      violationType: "governance_violation",
      severity: "high",
      siteConfigId,
      routeOrSource: "POST /api/workspace-agent/provision",
      actorHint: agentId,
      detail: { reason: "wrong_role_type", actualRole: agent.roleType },
    });
    return res.status(403).json({ error: "agent_role_mismatch", expected: "workspace_provisioning_agent" });
  }

  if (agent.aiModelProvider !== "local") {
    return res.status(400).json({ error: "agent_not_local_provider" });
  }

  // ── 2. Jurisdiction check ─────────────────────────────────────────────────
  const taskContext = `Workspace provisioning for siteConfigId: ${siteConfigId}, goal: ${goal}`;
  const controls = (agent.structuredControls ?? {}) as Record<string, unknown>;
  const jurisdiction = checkJurisdiction(taskContext, controls);

  if (!jurisdiction.allowed) {
    await persistOrchestrationViolation({
      violationType: "unauthorized_domain_access",
      severity: "high",
      siteConfigId,
      routeOrSource: "POST /api/workspace-agent/provision",
      actorHint: agentId,
      detail: { reason: jurisdiction.reason },
    });
    return res.status(403).json({ error: "jurisdiction_violation", reason: jurisdiction.reason });
  }

  // ── 3. Create orchestration run ───────────────────────────────────────────
  const { runId } = await createSingleAgentOrchestrationRun({ siteConfigId });
  await db
    .update(agentOrchestrationRuns)
    .set({
      agentId,
      metadata: { purpose: "workspace_provisioning", goal },
      reviewRequired: true,
      updatedAt: new Date(),
    })
    .where(eq(agentOrchestrationRuns.id, runId));

  // ── 4. Load workspaceConfiguration — must have OAuth credentials ──────────
  const [workspaceConfig] = await db
    .select()
    .from(workspaceConfigurations)
    .where(eq(workspaceConfigurations.siteConfigId, siteConfigId))
    .limit(1);

  if (!workspaceConfig) {
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "blocked",
        currentState: "blocked",
        blockers: [{ code: "no_workspace_config", message: "No workspaceConfiguration found for this site" }],
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));
    return res.status(422).json({ error: "no_workspace_configuration", runId });
  }

  if (workspaceConfig.status === "disconnected" || !workspaceConfig.accessToken) {
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "blocked",
        currentState: "blocked",
        blockers: [{ code: "workspace_not_connected", message: "Workspace OAuth not connected. Complete OAuth flow first." }],
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));
    return res.status(422).json({ error: "workspace_not_connected", runId });
  }

  // ── 5. Build system prompt with tool registry and goal context ────────────
  const toolSummary = Object.entries(WORKSPACE_TOOL_REGISTRY)
    .map(([key, entry]) => `  ${key} — ${entry.description}`)
    .join("\n");

  const goalContext = WORKSPACE_GOAL_CONTEXT[goal] ?? `Your goal is: ${goal}`;

  const fullPrompt = `${agent.systemPrompt ?? ""}

## Registered Tools (ONLY these are permitted)
${toolSummary}

## Business Context
- siteConfigId: ${siteConfigId}
- businessName: ${businessName ?? "Unknown Business"}
- Workspace status: ${workspaceConfig.status}
- Gmail connected: ${workspaceConfig.googleEmail ?? "unknown"}

## Goal
${goalContext}`;

  // ── 6. Call local LLM ─────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  let rawOutput = "";
  let ollamaError: string | null = null;

  try {
    const r = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: agent.aiModelId || config.ollamaModel,
        prompt: fullPrompt,
        stream: false,
        format: "json",
        options: { temperature: 0.05, num_predict: 4096 },
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      throw new Error(`Ollama ${r.status}: ${errText.slice(0, 300)}`);
    }

    const payload = (await r.json()) as { response?: string };
    rawOutput = payload.response ?? "";
  } catch (err) {
    ollamaError = String(err).slice(0, 300);
  } finally {
    clearTimeout(timeout);
  }

  if (ollamaError || !rawOutput) {
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "failed",
        currentState: "failed",
        blockers: [{ code: "llm_call_failed", message: ollamaError ?? "empty_response" }],
        rawModelOutput: rawOutput.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));
    return res.status(502).json({ error: "llm_call_failed", detail: ollamaError, runId });
  }

  // ── 7. Parse structured output ────────────────────────────────────────────
  const { output: structured, parseError } = parseWorkspaceOutput(rawOutput);

  if (!structured) {
    await persistOrchestrationViolation({
      violationType: "missing_orchestration_run",
      severity: "medium",
      orchestrationRunId: runId,
      siteConfigId,
      routeOrSource: "POST /api/workspace-agent/provision",
      actorHint: agentId,
      detail: { reason: "output_parse_failure", parseError, rawSnippet: rawOutput.slice(0, 300) },
    });
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "blocked",
        currentState: "blocked",
        blockers: [{ code: "output_parse_failure", message: "Response was not valid WorkspaceAgentOutput JSON" }],
        rawModelOutput: rawOutput.slice(0, 8000),
        parseError: parseError ?? "unknown",
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));
    return res.status(422).json({ error: "structured_output_parse_failure", runId, parseError, raw: rawOutput.slice(0, 500) });
  }

  // Validate workspace_actions against schema
  const actionsValidation = workspaceActionsArraySchema.safeParse(structured.workspace_actions);
  if (!actionsValidation.success) {
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "blocked",
        currentState: "blocked",
        blockers: [{ code: "invalid_workspace_actions", message: actionsValidation.error.message }],
        rawModelOutput: rawOutput.slice(0, 8000),
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));
    return res.status(422).json({ error: "invalid_workspace_actions_schema", runId });
  }

  // ── 8. Dispatch each action ───────────────────────────────────────────────
  const credentials: GoogleWorkspaceCredentials = {
    accessToken: workspaceConfig.accessToken!,
    refreshToken: workspaceConfig.refreshToken ?? undefined,
    expiryDate: workspaceConfig.tokenExpiry
      ? workspaceConfig.tokenExpiry.getTime()
      : undefined,
  };
  const workspaceService = createGoogleWorkspaceService(credentials);

  const completed: ActionOutcome[] = [];
  const deferred: ActionOutcome[] = [];
  const violations: { tool: string; reason: string }[] = [];

  // Write back IDs from Drive/Calendar creation
  const dbWriteback: Partial<typeof workspaceConfigurations.$inferInsert> = {};

  for (const action of structured.workspace_actions) {
    const outcome = await dispatchAction(action, workspaceService, siteConfigId, runId);

    if (outcome.status === "completed") {
      completed.push(outcome);
      // Capture resource IDs for DB writeback
      const data = outcome.data as Record<string, unknown> | undefined;
      if (data) {
        if (action.tool === "drive.createSheet" && data["spreadsheetId"]) {
          dbWriteback.leadTrackingSheetId = String(data["spreadsheetId"]);
        }
        if (action.tool === "drive.createFolder" && data["id"]) {
          dbWriteback.driveFolderId = String(data["id"]);
        }
        if (action.tool === "workspace.createStructure" && data["calendarId"]) {
          dbWriteback.calendarId = String(data["calendarId"]);
        }
      }
    } else if (outcome.status === "deferred") {
      deferred.push(outcome);
    } else if (outcome.status === "skipped" || outcome.status === "error") {
      violations.push({ tool: outcome.tool, reason: (outcome as { reason?: string; error?: string }).reason ?? (outcome as { error?: string }).error ?? "unknown" });
    }
  }

  // ── 9. Write back resource IDs and update workspace status ───────────────
  if (Object.keys(dbWriteback).length > 0) {
    await db
      .update(workspaceConfigurations)
      .set({ ...dbWriteback, updatedAt: new Date() })
      .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
  }

  // ── 10. Finalize orchestration run ────────────────────────────────────────
  const finalStatus = violations.length > 0 && completed.length === 0
    ? "blocked"
    : deferred.length > 0
    ? "deferred"
    : "completed";

  const [existingRunRow] = await db
    .select({ metadata: agentOrchestrationRuns.metadata })
    .from(agentOrchestrationRuns)
    .where(eq(agentOrchestrationRuns.id, runId))
    .limit(1);
  const priorMeta = (existingRunRow?.metadata ?? {}) as Record<string, unknown>;

  await db
    .update(agentOrchestrationRuns)
    .set({
      status: finalStatus,
      currentState: finalStatus,
      rawModelOutput: rawOutput.slice(0, 8000),
      filesTouchedJson: structured.files_touched,
      metadata: {
        ...priorMeta,
        workspaceAgentAssumptions: structured.assumptions,
      },
      blockers: violations.length > 0
        ? violations.map((v) => ({ code: "action_blocked", message: `${v.tool}: ${v.reason}` }))
        : [],
      reviewRequired: true,
      updatedAt: new Date(),
    })
    .where(eq(agentOrchestrationRuns.id, runId));

  return res.json({
    runId,
    status: finalStatus,
    completed: completed.map((c) => ({ tool: c.tool })),
    deferred: deferred.map((d) => ({ tool: d.tool, reason: (d as { reason: string }).reason })),
    violations,
    assumptions: structured.assumptions,
    blockers: structured.blockers,
    review_required: true,
  });
});

// ── GET /api/workspace-agent/status/:runId ────────────────────────────────────

router.get("/status/:runId", requireAuth, async (req: Request, res: Response) => {
  const runIdRaw = req.params.runId;
  const runId = typeof runIdRaw === "string" ? runIdRaw : runIdRaw?.[0];
  if (!runId) {
    return res.status(400).json({ error: "run_id_required" });
  }

  const [run] = await db
    .select()
    .from(agentOrchestrationRuns)
    .where(eq(agentOrchestrationRuns.id, runId))
    .limit(1);

  if (!run) {
    return res.status(404).json({ error: "run_not_found" });
  }

  const meta = (run.metadata ?? {}) as Record<string, unknown>;
  const assumptions = meta.workspaceAgentAssumptions;

  return res.json({
    runId: run.id,
    status: run.status,
    agentId: run.agentId,
    siteConfigId: run.siteConfigId,
    reviewRequired: run.reviewRequired,
    blockers: run.blockers,
    assumptions: Array.isArray(assumptions) ? assumptions : [],
    filesTouched: run.filesTouchedJson,
    metadata: run.metadata,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  });
});

export default router;
