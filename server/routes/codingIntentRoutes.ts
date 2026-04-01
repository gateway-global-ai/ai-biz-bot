import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth";
import {
  BindSkillsRequestSchema,
  CreateCodingIntentRequestSchema,
  CreateExecutionPacketRequestSchema,
  OutcomePacketFragmentSchema,
} from "@shared/intentExecutionPlane/contracts";
import { assertSiteAccessForSession } from "../utils/siteScopedAccess";
import {
  addEvidenceArtifacts,
  bindSkills,
  buildCodingCommandCenter,
  completeScopeActionRun,
  createCodingIntent,
  createExecutionPacket,
  deriveScopes,
  evaluateReviewGates,
  failScopeActionRun,
  getCodingIntent,
  startScopeActionRun,
  upsertOutcomePacket,
} from "../services/intentExecutionService";
import {
  executeWorkspaceGovernedAction,
  getWorkspaceAdapterHealth,
  refreshWorkspaceAdapterHealth,
} from "../services/workspaceMcpAdapter";
import { executeIntentAutonomously } from "../services/codingOrchestratorEngine";

const router = Router();

function firstRouteParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const workspaceDispatchSchema = z.object({
  scopeExecutionId: z.string().uuid(),
  actionId: z.string().min(1),
  input: z.record(z.unknown()).default({}),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateCodingIntentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (parsed.data.siteConfigId) {
    const access = await assertSiteAccessForSession(req, parsed.data.siteConfigId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, code: "SITE_ACCESS_DENIED" });
    }
  }

  try {
    const result = await createCodingIntent(parsed.data);
    return res.json({
      ok: true,
      workItem: result.workItem,
      intentExecution: result.intentExecution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.get("/:intentExecutionId", requireAuth, async (req, res) => {
  const id = firstRouteParam(req.params.intentExecutionId);
  if (!id) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const snapshot = await getCodingIntent(id);
  if (!snapshot) {
    return res.status(404).json({ error: "intent_execution_not_found" });
  }
  const commandCenter = await buildCodingCommandCenter(id);
  return res.json({ ok: true, snapshot, commandCenter });
});

router.post("/:intentExecutionId/derive-scopes", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  try {
    const scopes = await deriveScopes(intentExecutionId);
    return res.json({ ok: true, scopes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/bind-skills", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = BindSkillsRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const bindings = await bindSkills(intentExecutionId, parsed.data.replaceExisting);
    return res.json({ ok: true, bindings });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/create-execution-packet", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = CreateExecutionPacketRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const packet = await createExecutionPacket(intentExecutionId, parsed.data);
    return res.json({ ok: true, executionPacket: packet });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/outcome", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = OutcomePacketFragmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const outcomePacket = await upsertOutcomePacket(intentExecutionId, parsed.data);
    const reviewGates = await evaluateReviewGates(intentExecutionId);
    return res.json({ ok: true, outcomePacket, reviewGates });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/review-gates/evaluate", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  try {
    const gates = await evaluateReviewGates(intentExecutionId);
    return res.json({ ok: true, reviewGates: gates });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.get("/:intentExecutionId/command-center", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  try {
    const payload = await buildCodingCommandCenter(intentExecutionId);
    return res.json({
      ok: true,
      canvasPayload: {
        viewId: "command_center",
        title: "Dev Execution Command Center",
        renderMode: "replace",
        data: payload,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.get("/:intentExecutionId/workspace-health", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const snapshot = await getCodingIntent(intentExecutionId);
  if (!snapshot?.intent?.siteConfigId) {
    return res.status(404).json({ error: "intent_site_config_not_found" });
  }
  const health = await getWorkspaceAdapterHealth(snapshot.intent.siteConfigId);
  return res.json({ ok: true, workspaceHealth: health });
});

router.post("/:intentExecutionId/workspace-auth/refresh", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const snapshot = await getCodingIntent(intentExecutionId);
  if (!snapshot?.intent?.siteConfigId) {
    return res.status(404).json({ error: "intent_site_config_not_found" });
  }
  const health = await refreshWorkspaceAdapterHealth(snapshot.intent.siteConfigId);
  return res.json({ ok: true, workspaceHealth: health });
});

router.post("/:intentExecutionId/workspace-actions/dispatch", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = workspaceDispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const snapshot = await getCodingIntent(intentExecutionId);
  if (!snapshot?.intent?.siteConfigId) {
    return res.status(404).json({ error: "intent_site_config_not_found" });
  }

  const scope = snapshot.scopes.find((row) => row.id === parsed.data.scopeExecutionId);
  if (!scope) {
    return res.status(404).json({ error: "scope_execution_not_found" });
  }
  if (scope.scopeKey !== "workspace_scope") {
    return res.status(400).json({ error: "scope_not_workspace_scope" });
  }

  const actionRun = await startScopeActionRun({
    scopeExecutionId: parsed.data.scopeExecutionId,
    actionKey: parsed.data.actionId,
    actionInput: parsed.data.input,
  });

  const result = await executeWorkspaceGovernedAction({
    siteConfigId: snapshot.intent.siteConfigId,
    actionId: parsed.data.actionId,
    input: parsed.data.input,
  });

  if (!result.ok) {
    await addEvidenceArtifacts(actionRun.id, result.evidenceArtifacts);
    const existingFilesTouched = (snapshot.outcome?.filesTouched as typeof snapshot.outcome.filesTouched | undefined) ?? [];
    const existingChecks = (snapshot.outcome?.checksRun as typeof snapshot.outcome.checksRun | undefined) ?? [];
    const existingRisks = (snapshot.outcome?.risks as string[] | undefined) ?? [];
    const existingDomains = (snapshot.outcome?.domainsTouched as string[] | undefined) ?? [];
    const existingGates = (snapshot.outcome?.requiredGates as string[] | undefined) ?? [];
    const existingSummary = (snapshot.outcome?.summary as Record<string, unknown> | undefined) ?? {};

    if (result.requiresApproval) {
      await completeScopeActionRun({
        actionRunId: actionRun.id,
        state: "blocked",
        output: {
          error: result.error,
          requiresApproval: true,
          provider: result.provider,
          toolName: result.toolName,
        },
      });
      const outcomePacket = await upsertOutcomePacket(intentExecutionId, {
        summary: {
          ...existingSummary,
          workspaceLastAction: parsed.data.actionId,
          workspaceProvider: result.provider,
        },
        filesTouched: existingFilesTouched,
        domainsTouched: [...new Set([...existingDomains, "workspace_integration"])],
        checksRun: [
          ...existingChecks,
          {
            cmd: `workspace:${parsed.data.actionId}`,
            status: "skipped",
            artifactUri: result.evidenceArtifacts[0]?.uri,
          },
        ],
        risks: [...new Set([...existingRisks, "workspace_action_requires_approval"])],
        reviewReady: false,
        requiredGates: existingGates,
      });
      const reviewGates = await evaluateReviewGates(intentExecutionId);
      return res.status(409).json({
        ok: false,
        actionRunId: actionRun.id,
        error: result.error,
        requiresApproval: true,
        outcomePacket,
        reviewGates,
      });
    }
    await failScopeActionRun({
      actionRunId: actionRun.id,
      error: result.error ?? "workspace_action_failed",
    });
    const outcomePacket = await upsertOutcomePacket(intentExecutionId, {
      summary: {
        ...existingSummary,
        workspaceLastAction: parsed.data.actionId,
        workspaceProvider: result.provider,
        workspaceAuthState: result.authState ?? null,
      },
      filesTouched: existingFilesTouched,
      domainsTouched: [...new Set([...existingDomains, "workspace_integration"])],
      checksRun: [
        ...existingChecks,
        {
          cmd: `workspace:${parsed.data.actionId}`,
          status: "failed",
          artifactUri: result.evidenceArtifacts[0]?.uri,
        },
      ],
      risks: [
        ...new Set([
          ...existingRisks,
          ...(result.authState ? [`workspace_auth:${result.authState}`] : []),
          ...(result.degradedReason ? [`workspace_degraded:${result.degradedReason}`] : []),
        ]),
      ],
      reviewReady: false,
      requiredGates: existingGates,
    });
    const reviewGates = await evaluateReviewGates(intentExecutionId);
    return res.status(502).json({
      ok: false,
      actionRunId: actionRun.id,
      error: result.error ?? "workspace_action_failed",
      authState: result.authState,
      outcomePacket,
      reviewGates,
    });
  }

  await completeScopeActionRun({
    actionRunId: actionRun.id,
    output: {
      provider: result.provider,
      toolName: result.toolName,
      data: result.data,
    },
  });
  await addEvidenceArtifacts(actionRun.id, result.evidenceArtifacts);

  const existingFilesTouched = (snapshot.outcome?.filesTouched as typeof snapshot.outcome.filesTouched | undefined) ?? [];
  const existingChecks = (snapshot.outcome?.checksRun as typeof snapshot.outcome.checksRun | undefined) ?? [];
  const existingRisks = (snapshot.outcome?.risks as string[] | undefined) ?? [];
  const existingDomains = (snapshot.outcome?.domainsTouched as string[] | undefined) ?? [];
  const existingGates = (snapshot.outcome?.requiredGates as string[] | undefined) ?? [];
  const existingSummary = (snapshot.outcome?.summary as Record<string, unknown> | undefined) ?? {};

  const outcome = await upsertOutcomePacket(intentExecutionId, {
    summary: {
      ...existingSummary,
      workspaceLastAction: parsed.data.actionId,
      workspaceProvider: result.provider,
    },
    filesTouched: existingFilesTouched,
    domainsTouched: [...new Set([...existingDomains, "workspace_integration"])],
    checksRun: [
      ...existingChecks,
      {
        cmd: `workspace:${parsed.data.actionId}`,
        status: "passed",
        artifactUri: result.evidenceArtifacts[0]?.uri,
      },
    ],
    risks: [
      ...new Set([
        ...existingRisks,
        ...(result.provider === "transitional_legacy" ? ["transitional_workspace_path"] : []),
      ]),
    ],
    reviewReady: snapshot.outcome?.reviewReady ?? false,
    requiredGates: existingGates,
  });

  const reviewGates = await evaluateReviewGates(intentExecutionId);

  return res.json({
    ok: true,
    actionRunId: actionRun.id,
    provider: result.provider,
    toolName: result.toolName,
    result: result.data,
    evidenceArtifacts: result.evidenceArtifacts,
    outcomePacket: outcome,
    reviewGates,
  });
});

// ── Autonomous execution endpoint ─────────────────────────────────────────────
//
// POST /api/coding-intents/:intentExecutionId/execute
//
// Triggers the Coding Orchestrator Engine v1 to drive the full intent-to-review
// loop autonomously. The engine chains:
//   derive scopes → bind skills → create execution packets → call local agent →
//   validate output → enforce domain allow-list → persist evidence →
//   submit outcome → evaluate review gates
//
// Autonomy terminates at review-ready or blocked. It never self-merges.

const executeBodySchema = z.object({
  createBranch: z.boolean().default(false),
  createWorktree: z.boolean().default(false),
  baseBranch: z.string().min(1).default("main"),
  repoRef: z.string().min(1).default("gateway-global-ai-platform"),
}).default({});

router.post("/:intentExecutionId/execute", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }

  const parsed = executeBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await executeIntentAutonomously(intentExecutionId, {
      createBranch: parsed.data.createBranch,
      createWorktree: parsed.data.createWorktree,
      baseBranch: parsed.data.baseBranch,
      repoRef: parsed.data.repoRef,
    });

    const httpStatus = result.finalState === "failed" ? 500
      : result.finalState === "blocked" ? 409
      : 200;

    return res.status(httpStatus).json({
      ok: result.finalState === "review_ready" || result.finalState === "completed",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

export default router;
