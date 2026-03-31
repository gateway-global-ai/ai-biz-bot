import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  actionRuns,
  agentOrchestrationRuns,
  evidenceArtifacts,
  executionPackets,
  intentExecutions,
  outcomePackets,
  pullRequestLinks,
  reviewGates,
  scopeExecutions,
  skillBindings,
  workItems,
} from "@shared/schema";
import type { CommandCenterViewModel } from "@shared/canvasViewContract";
import {
  type ApprovalTier,
  type CreateCodingIntentRequest,
  type CreateExecutionPacketRequest,
  type ExecutionPacket,
  type OutcomePacketFragment,
  type RequiredCheck,
  type CodingScopeKey,
} from "@shared/intentExecutionPlane/contracts";
import { createFeatureBranch, createWorktree } from "./gitWorkspaceService";
import {
  derivePolicyForScopes,
  evaluateOutcomePolicy,
  getScopePolicy,
} from "./domainPolicyEvaluator";
import { getWorkspaceAdapterHealth } from "./workspaceMcpAdapter";

const DEFAULT_SCOPE_KEYS: CodingScopeKey[] = ["governance_scope", "verification_scope"];

function sanitizeBranchPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "coding-intent";
}

function deriveScopesFromIntent(intentKey: string, intentInput: Record<string, unknown>): CodingScopeKey[] {
  const explicit = Array.isArray(intentInput.scopes)
    ? intentInput.scopes.filter((scope): scope is CodingScopeKey =>
        typeof scope === "string" &&
        [
          "workspace_scope",
          "ui_scope",
          "voice_scope",
          "canvas_scope",
          "routing_scope",
          "governance_scope",
          "verification_scope",
          "migration_scope",
        ].includes(scope),
      )
    : [];
  if (explicit.length > 0) {
    return Array.from(new Set([...explicit, ...DEFAULT_SCOPE_KEYS]));
  }

  const haystack = `${intentKey} ${JSON.stringify(intentInput)}`.toLowerCase();
  const derived = new Set<CodingScopeKey>(DEFAULT_SCOPE_KEYS);

  if (/(workspace|google|gmail|drive|calendar|docs|sheets|forms|tasks|chat|apps script)/.test(haystack)) {
    derived.add("workspace_scope");
  }
  if (/(ui|layout|design|component|page|shadcn|visual)/.test(haystack)) {
    derived.add("ui_scope");
  }
  if (/(canvas|view|surface|render|command center|concierge)/.test(haystack)) {
    derived.add("canvas_scope");
  }
  if (/(route|routing|api|handler|contract)/.test(haystack)) {
    derived.add("routing_scope");
  }
  if (/(voice|ptt|audio|gemini live|twilio)/.test(haystack)) {
    derived.add("voice_scope");
  }
  if (/(migration|schema|database|sql|drizzle)/.test(haystack)) {
    derived.add("migration_scope");
  }

  if (derived.size === DEFAULT_SCOPE_KEYS.length) {
    derived.add("routing_scope");
  }

  return [...derived];
}

async function createCodingOrchestrationRun(siteConfigId: string, intentKey: string): Promise<string> {
  const [run] = await db
    .insert(agentOrchestrationRuns)
    .values({
      siteConfigId,
      currentState: "coding_intent",
      step: "orchestrator",
      status: "in_progress",
      aptitudeStatus: "deferred",
      requiredForDeploy: false,
      metadata: {
        purpose: "coding_intent_execution",
        intentKey,
        pipeline: ["intent_loop", "scope_derivation", "skill_binding", "execution_packet", "review_plane"],
      },
    })
    .returning({ id: agentOrchestrationRuns.id });

  return run.id;
}

export async function createCodingIntent(input: CreateCodingIntentRequest) {
  return db.transaction(async (tx) => {
    const [workItem] = await tx
      .insert(workItems)
      .values({
        siteConfigId: input.siteConfigId ?? null,
        title: input.title,
        description: input.description ?? null,
        requestedBy: input.requestedBy ?? null,
        status: "queued",
      })
      .returning();

    const runId = input.siteConfigId ? await createCodingOrchestrationRun(input.siteConfigId, input.intentKey) : null;

    const [intentExecution] = await tx
      .insert(intentExecutions)
      .values({
        workItemId: workItem.id,
        siteConfigId: input.siteConfigId ?? null,
        orchestrationRunId: runId,
        intentKey: input.intentKey,
        intentInput: input.intentInput,
        state: "planning",
      })
      .returning();

    return { workItem, intentExecution };
  });
}

export async function deriveScopes(intentExecutionId: string) {
  const [intent] = await db
    .select()
    .from(intentExecutions)
    .where(eq(intentExecutions.id, intentExecutionId))
    .limit(1);
  if (!intent) {
    throw new Error("intent_execution_not_found");
  }

  const scopeKeys = deriveScopesFromIntent(intent.intentKey, (intent.intentInput ?? {}) as Record<string, unknown>);

  for (const scopeKey of scopeKeys) {
    await db
      .insert(scopeExecutions)
      .values({
        intentExecutionId,
        scopeKey,
        state: "queued",
        scopePlan: {
          intentKey: intent.intentKey,
          defaultSkill: getScopePolicy(scopeKey).default_skill,
          approvalTierHint: getScopePolicy(scopeKey).approval_tier,
        },
      })
      .onConflictDoNothing();
  }

  const scopes = await db
    .select()
    .from(scopeExecutions)
    .where(eq(scopeExecutions.intentExecutionId, intentExecutionId));

  await db
    .update(intentExecutions)
    .set({ state: "executing", updatedAt: new Date() })
    .where(eq(intentExecutions.id, intentExecutionId));

  await db
    .update(workItems)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(workItems.id, intent.workItemId));

  return scopes;
}

export async function bindSkills(intentExecutionId: string, replaceExisting = false) {
  const scopes = await db
    .select()
    .from(scopeExecutions)
    .where(eq(scopeExecutions.intentExecutionId, intentExecutionId));

  if (replaceExisting && scopes.length > 0) {
    await db.delete(skillBindings).where(inArray(skillBindings.scopeExecutionId, scopes.map((scope) => scope.id)));
  }

  for (const scope of scopes) {
    const scopePolicy = getScopePolicy(scope.scopeKey as CodingScopeKey);
    const skillKey = scopePolicy.default_skill;
    if (!skillKey) continue;
    await db
      .insert(skillBindings)
      .values({
        scopeExecutionId: scope.id,
        skillKey,
        skillConfig: {
          scopeKey: scope.scopeKey,
          defaultActions: scopePolicy.default_actions ?? [],
        },
      })
      .onConflictDoNothing();
  }

  return db
    .select()
    .from(skillBindings)
    .where(
      inArray(
        skillBindings.scopeExecutionId,
        scopes.map((scope) => scope.id),
      ),
    );
}

export async function createExecutionPacket(
  intentExecutionId: string,
  request: CreateExecutionPacketRequest,
) {
  const [intent] = await db
    .select()
    .from(intentExecutions)
    .where(eq(intentExecutions.id, intentExecutionId))
    .limit(1);
  if (!intent) throw new Error("intent_execution_not_found");

  const [scope] = await db
    .select()
    .from(scopeExecutions)
    .where(
      and(
        eq(scopeExecutions.id, request.scopeExecutionId),
        eq(scopeExecutions.intentExecutionId, intentExecutionId),
      ),
    )
    .limit(1);
  if (!scope) throw new Error("scope_execution_not_found");

  const scopeKey = scope.scopeKey as CodingScopeKey;
  const scopeKeys = [scopeKey];
  const policy = derivePolicyForScopes(scopeKeys);
  const approvalTier = policy.approvalTier;
  const branchName = sanitizeBranchPart(
    request.featureBranchName ?? `intent/${intent.intentKey}/${scope.scopeKey}`,
  );
  const featureBranch = request.createBranch
    ? await createFeatureBranch(request.baseBranch, branchName)
    : branchName;
  const worktreePath = request.createWorktree ? await createWorktree(featureBranch) : undefined;

  const packet = {
    intentExecutionId,
    scopeExecutionId: scope.id,
    repoRef: request.repoRef,
    baseBranch: request.baseBranch,
    featureBranch,
    worktreePath,
    policyContext: {
      approvalTier,
      authorizedDomains: policy.authorizedDomains,
      evidenceRequirements: policy.evidenceRequirements,
      requiredReviewGates: policy.requiredReviewGates,
    },
    requiredChecks: policy.requiredChecks,
  } satisfies Omit<ExecutionPacket, "id">;

  const [saved] = await db
    .insert(executionPackets)
    .values(packet)
    .returning();

  await db
    .update(scopeExecutions)
    .set({
      state: "active",
      updatedAt: new Date(),
      assignedAgentRoleType: getScopePolicy(scopeKey).specialist_role,
    })
    .where(eq(scopeExecutions.id, scope.id));

  return saved;
}

export async function upsertOutcomePacket(intentExecutionId: string, fragment: OutcomePacketFragment) {
  const [existing] = await db
    .select()
    .from(outcomePackets)
    .where(eq(outcomePackets.intentExecutionId, intentExecutionId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(outcomePackets)
      .set({
        summary: fragment.summary ?? existing.summary,
        filesTouched: fragment.filesTouched,
        domainsTouched: fragment.domainsTouched,
        checksRun: fragment.checksRun,
        risks: fragment.risks,
        reviewReady: fragment.reviewReady,
        requiredGates: fragment.requiredGates,
        updatedAt: new Date(),
      })
      .where(eq(outcomePackets.intentExecutionId, intentExecutionId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(outcomePackets)
    .values({
      intentExecutionId,
      summary: fragment.summary ?? {},
      filesTouched: fragment.filesTouched,
      domainsTouched: fragment.domainsTouched,
      checksRun: fragment.checksRun,
      risks: fragment.risks,
      reviewReady: fragment.reviewReady,
      requiredGates: fragment.requiredGates,
    })
    .returning();
  return created;
}

export async function startScopeActionRun(params: {
  scopeExecutionId: string;
  actionKey: string;
  agentId?: string | null;
  orchestrationRunId?: string | null;
  actionInput?: Record<string, unknown>;
}) {
  const [created] = await db
    .insert(actionRuns)
    .values({
      scopeExecutionId: params.scopeExecutionId,
      actionKey: params.actionKey,
      agentId: params.agentId ?? null,
      orchestrationRunId: params.orchestrationRunId ?? null,
      state: "running",
      actionInput: params.actionInput ?? {},
      startedAt: new Date(),
    })
    .returning();
  return created;
}

export async function completeScopeActionRun(params: {
  actionRunId: string;
  output: Record<string, unknown>;
  state?: "succeeded" | "blocked";
}) {
  const [updated] = await db
    .update(actionRuns)
    .set({
      state: params.state ?? "succeeded",
      actionOutput: params.output,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(actionRuns.id, params.actionRunId))
    .returning();
  return updated;
}

export async function failScopeActionRun(params: { actionRunId: string; error: string }) {
  const [updated] = await db
    .update(actionRuns)
    .set({
      state: "failed",
      actionOutput: { error: params.error },
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(actionRuns.id, params.actionRunId))
    .returning();
  return updated;
}

export async function addEvidenceArtifacts(
  actionRunId: string,
  artifacts: Array<{ kind: string; uri: string; metadata?: Record<string, unknown> }>,
) {
  if (artifacts.length === 0) return [];
  return db
    .insert(evidenceArtifacts)
    .values(
      artifacts.map((artifact) => ({
        actionRunId,
        kind: artifact.kind,
        uri: artifact.uri,
        metadata: artifact.metadata ?? {},
      })),
    )
    .returning();
}

export async function evaluateReviewGates(intentExecutionId: string) {
  const [outcome] = await db
    .select()
    .from(outcomePackets)
    .where(eq(outcomePackets.intentExecutionId, intentExecutionId))
    .limit(1);
  if (!outcome) throw new Error("outcome_packet_not_found");

  const scopes = await db
    .select()
    .from(scopeExecutions)
    .where(eq(scopeExecutions.intentExecutionId, intentExecutionId));
  const scopeKeys = scopes.map((scope) => scope.scopeKey as CodingScopeKey);

  const evaluation = evaluateOutcomePolicy({
    scopeKeys,
    filesTouched: Array.isArray(outcome.filesTouched) ? (outcome.filesTouched as typeof outcome.filesTouched) : [],
    existingDomainsTouched: Array.isArray(outcome.domainsTouched) ? (outcome.domainsTouched as string[]) : [],
    checksRun: Array.isArray(outcome.checksRun) ? (outcome.checksRun as typeof outcome.checksRun) : [],
    reviewReady: outcome.reviewReady,
  });

  await db
    .update(outcomePackets)
    .set({
      domainsTouched: evaluation.domainsTouched,
      requiredGates: evaluation.requiredGates,
      risks: uniq([
        ...((Array.isArray(outcome.risks) ? (outcome.risks as string[]) : []) ?? []),
        ...evaluation.checkFailures.map((cmd) => `check_failure:${cmd}`),
        ...evaluation.missingEvidence.map((item) => `missing_evidence:${item}`),
      ]),
      reviewReady: outcome.reviewReady && evaluation.missingEvidence.length === 0 && evaluation.checkFailures.length === 0,
      updatedAt: new Date(),
    })
    .where(eq(outcomePackets.id, outcome.id));

  const requiredGates = evaluation.requiredGates;
  for (const gateKey of requiredGates) {
    await db
      .insert(reviewGates)
      .values({
        outcomePacketId: outcome.id,
        gateKey,
        state:
          outcome.reviewReady && evaluation.missingEvidence.length === 0 && evaluation.checkFailures.length === 0
            ? "satisfied"
            : "pending",
        requirements: {
          reviewReady: outcome.reviewReady,
          domainsTouched: evaluation.domainsTouched,
          requiredReviewers: evaluation.requiredReviewers,
          evidenceRequirements: evaluation.evidenceRequirements,
          missingEvidence: evaluation.missingEvidence,
          checkFailures: evaluation.checkFailures,
          approvalTier: evaluation.approvalTier,
        },
      })
      .onConflictDoUpdate({
        target: [reviewGates.outcomePacketId, reviewGates.gateKey],
        set: {
          state:
            outcome.reviewReady && evaluation.missingEvidence.length === 0 && evaluation.checkFailures.length === 0
              ? "satisfied"
              : "pending",
          requirements: {
            reviewReady: outcome.reviewReady,
            domainsTouched: evaluation.domainsTouched,
            requiredReviewers: evaluation.requiredReviewers,
            evidenceRequirements: evaluation.evidenceRequirements,
            missingEvidence: evaluation.missingEvidence,
            checkFailures: evaluation.checkFailures,
            approvalTier: evaluation.approvalTier,
          },
          updatedAt: new Date(),
        },
      });
  }

  return db
    .select()
    .from(reviewGates)
    .where(eq(reviewGates.outcomePacketId, outcome.id));
}

export async function getCodingIntent(intentExecutionId: string) {
  const [intent] = await db
    .select()
    .from(intentExecutions)
    .where(eq(intentExecutions.id, intentExecutionId))
    .limit(1);
  if (!intent) return null;

  const [workItem] = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, intent.workItemId))
    .limit(1);
  const scopes = await db.select().from(scopeExecutions).where(eq(scopeExecutions.intentExecutionId, intentExecutionId));
  const scopeIds = scopes.map((scope) => scope.id);
  const bindings = scopeIds.length
    ? await db.select().from(skillBindings).where(inArray(skillBindings.scopeExecutionId, scopeIds))
    : [];
  const packets = await db.select().from(executionPackets).where(eq(executionPackets.intentExecutionId, intentExecutionId));
  const actions = scopeIds.length
    ? await db.select().from(actionRuns).where(inArray(actionRuns.scopeExecutionId, scopeIds))
    : [];
  const [outcome] = await db.select().from(outcomePackets).where(eq(outcomePackets.intentExecutionId, intentExecutionId)).limit(1);
  const gates = outcome
    ? await db.select().from(reviewGates).where(eq(reviewGates.outcomePacketId, outcome.id))
    : [];
  const prLinks = await db.select().from(pullRequestLinks).where(eq(pullRequestLinks.intentExecutionId, intentExecutionId));
  const actionIds = actions.map((action) => action.id);
  const artifacts = actionIds.length
    ? await db.select().from(evidenceArtifacts).where(inArray(evidenceArtifacts.actionRunId, actionIds))
    : [];

  return { workItem, intent, scopes, bindings, packets, actions, artifacts, outcome, gates, prLinks };
}

export async function buildCodingCommandCenter(intentExecutionId: string): Promise<CommandCenterViewModel> {
  const snapshot = await getCodingIntent(intentExecutionId);
  if (!snapshot || !snapshot.workItem) {
    throw new Error("coding_intent_not_found");
  }

  const approvalTier = derivePolicyForScopes(
    snapshot.scopes.map((scope) => scope.scopeKey as CodingScopeKey),
  ).approvalTier;
  const workspaceScope = snapshot.scopes.find((scope) => scope.scopeKey === "workspace_scope");
  const workspaceHealth =
    workspaceScope && snapshot.intent.siteConfigId
      ? await getWorkspaceAdapterHealth(snapshot.intent.siteConfigId)
      : null;
  const runningActions = snapshot.actions.filter((action) => action.state === "running").length;

  return {
    headline: snapshot.workItem.title,
    contextSummary: snapshot.workItem.description ?? undefined,
    statusItems: [
      { id: "intent", label: "Intent state", value: snapshot.intent.state, tone: "neutral" },
      { id: "tier", label: "Approval tier", value: approvalTier, tone: approvalTier === "tier3" ? "danger" : approvalTier === "tier2" ? "warning" : "success" },
      { id: "scopes", label: "Scopes", value: String(snapshot.scopes.length), tone: "neutral" },
      {
        id: "review",
        label: "Review ready",
        value: snapshot.outcome?.reviewReady ? "Yes" : "No",
        tone: snapshot.outcome?.reviewReady ? "success" : "warning",
      },
      { id: "actions", label: "Running actions", value: String(runningActions), tone: runningActions > 0 ? "warning" : "neutral" },
      ...(workspaceHealth
        ? [
            {
              id: "workspace-mode",
              label: "Workspace mode",
              value: workspaceHealth.mode,
              tone: workspaceHealth.mode === "external_mcp" ? "success" : "warning",
            },
            {
              id: "workspace-auth",
              label: "Workspace auth",
              value: workspaceHealth.authState,
              tone:
                workspaceHealth.authState === "valid" || workspaceHealth.authState === "bearer_override"
                  ? "success"
                  : workspaceHealth.authState === "expiring_soon"
                    ? "warning"
                    : "danger",
            },
            {
              id: "workspace-expiry",
              label: "Workspace expiry",
              value:
                workspaceHealth.tokenExpiresInSec == null
                  ? "n/a"
                  : `${workspaceHealth.tokenExpiresInSec}s`,
              tone:
                workspaceHealth.tokenExpiresInSec == null
                  ? "neutral"
                  : workspaceHealth.tokenExpiresInSec < 0
                    ? "danger"
                    : workspaceHealth.tokenExpiresInSec < 900
                      ? "warning"
                      : "neutral",
            },
          ]
        : []),
    ],
    workItems: snapshot.scopes.map((scope) => ({
      id: scope.id,
      title: scope.scopeKey,
      subtitle: `state=${scope.state}${scope.assignedAgentRoleType ? ` • agent=${scope.assignedAgentRoleType}` : ""}${
        scope.scopeKey === "workspace_scope" && workspaceHealth
          ? ` • mode=${workspaceHealth.mode}${workspaceHealth.degradedReason ? ` • degraded=${workspaceHealth.degradedReason}` : ""}`
          : ""
      }`,
    })),
    approvals: (snapshot.gates ?? [])
      .filter((gate) => gate.state !== "satisfied")
      .map((gate) => ({
        id: gate.id,
        label: `Resolve ${gate.gateKey}`,
        actionId: "coding_intents.review_gates.evaluate",
      })),
  };
}
