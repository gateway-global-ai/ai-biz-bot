/**
 * Agent orchestration — control-plane entry for swarm provisioning and agent create gate.
 * Persists agent_orchestration_runs + orchestration_violations.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import {
  agentOrchestrationRuns,
  orchestrationViolations,
  agents,
} from "@shared/schema";
import {
  provisionAgentsForBusiness,
  type ProvisioningResult,
} from "./agentProvisioning.js";
import type { OrchestrationRunStatus, OrchestrationViolationType } from "@shared/agentOrchestrationConstants";
import {
  runAptitudePipelineWithRetry,
  type AgentAptitudeInput,
} from "./agentAptitudeService.js";

export type OrchestrationSource =
  | "site_config_create"
  | "intelligence_provision"
  | "storefront_demo"
  | "script"
  | "single_agent_create";

const PIPELINE_STEPS = [
  "orchestrator",
  "skill_mapping",
  "aptitude_test",
  "governance_gate",
  "provisioning",
] as const;

function envAptitudeRequired(): boolean {
  return process.env.ORCHESTRATION_APTITUDE_REQUIRED_FOR_DEPLOY === "true";
}

function envOutcomeRequired(): boolean {
  return process.env.ORCHESTRATION_CUSTOMER_OUTCOME_REQUIRED === "true";
}

function envAgentCreateBypass(): boolean {
  return process.env.ORCHESTRATION_AGENT_CREATE_BYPASS === "true";
}

export async function persistOrchestrationViolation(params: {
  violationType: OrchestrationViolationType;
  severity: "critical" | "high" | "medium" | "low";
  orchestrationRunId?: string | null;
  siteConfigId?: string | null;
  routeOrSource: string;
  actorHint?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(orchestrationViolations).values({
    orchestrationRunId: params.orchestrationRunId ?? null,
    siteConfigId: params.siteConfigId ?? null,
    severity: params.severity,
    violationType: params.violationType,
    routeOrSource: params.routeOrSource,
    actorHint: params.actorHint ?? null,
    detail: params.detail ?? {},
  });
}

/** @deprecated Prefer persistOrchestrationViolation */
export function recordOrchestrationViolation(params: {
  kind: string;
  detail: string;
  siteConfigId?: string;
}): void {
  console.warn("[OrchestrationViolation]", params.detail, params);
  void persistOrchestrationViolation({
    violationType: "governance_violation",
    severity: "medium",
    siteConfigId: params.siteConfigId,
    routeOrSource: "legacy_recordOrchestrationViolation",
    detail: { kind: params.kind, message: params.detail },
  }).catch((e) => console.error("[OrchestrationViolation] persist failed", e));
}

async function finalizeProvisionRun(params: {
  runId: string;
  primaryAgentId: string | null;
  aptitudeRequired: boolean;
  outcomeRequired: boolean;
}): Promise<OrchestrationRunStatus> {
  const [run] = await db
    .select()
    .from(agentOrchestrationRuns)
    .where(eq(agentOrchestrationRuns.id, params.runId))
    .limit(1);

  if (!run) return "failed";

  const blockers: { code: string; message: string }[] = [];
  let status: OrchestrationRunStatus = "completed";

  if (params.aptitudeRequired && run.aptitudeStatus !== "pass") {
    status = "blocked";
    blockers.push({
      code: "aptitude",
      message: "Aptitude required for deploy but status is not pass",
    });
    await persistOrchestrationViolation({
      violationType: "aptitude_failure",
      severity: "high",
      orchestrationRunId: params.runId,
      siteConfigId: run.siteConfigId,
      routeOrSource: "runAgentSwarmProvisionOrchestrated",
      detail: { aptitudeStatus: run.aptitudeStatus },
    });
  }

  if (params.outcomeRequired) {
    const misses: string[] = [];
    if (run.clarityScore == null || run.clarityScore < 80) misses.push("clarity_score");
    if (run.configurationCompleteness == null || run.configurationCompleteness < 90) {
      misses.push("configuration_completeness");
    }
    if (run.fallbackDefined !== true) misses.push("fallback_defined");
    if (run.firstValuePathPresent !== true) misses.push("first_value_path_present");
    if (misses.length) {
      status = "blocked";
      blockers.push({
        code: "customer_outcome",
        message: `Missing or below threshold: ${misses.join(", ")}`,
      });
      await persistOrchestrationViolation({
        violationType: "customer_outcome_threshold_miss",
        severity: "high",
        orchestrationRunId: params.runId,
        siteConfigId: run.siteConfigId,
        routeOrSource: "runAgentSwarmProvisionOrchestrated",
        detail: { misses },
      });
    }
  }

  const prevBlockers = Array.isArray(run.blockers) ? (run.blockers as object[]) : [];
  const mergedBlockers = blockers.length ? [...prevBlockers, ...blockers] : prevBlockers;

  await db
    .update(agentOrchestrationRuns)
    .set({
      status,
      currentState: status === "completed" ? "complete" : status,
      agentId: params.primaryAgentId,
      blockers: mergedBlockers.length ? mergedBlockers : [],
      updatedAt: new Date(),
    })
    .where(eq(agentOrchestrationRuns.id, params.runId));

  return status;
}

/**
 * Runs industry template swarm provision behind the orchestration pipeline.
 */
export async function runAgentSwarmProvisionOrchestrated(params: {
  siteConfigId: string;
  placeTypes: string[];
  businessName: string;
  source: OrchestrationSource;
}): Promise<{ runId: string; provisionResult: ProvisioningResult; finalStatus: OrchestrationRunStatus }> {
  const aptitudeRequired = envAptitudeRequired();
  const outcomeRequired = envOutcomeRequired();

  const [run] = await db
    .insert(agentOrchestrationRuns)
    .values({
      siteConfigId: params.siteConfigId,
      currentState: "provisioning",
      step: PIPELINE_STEPS[0],
      status: "in_progress",
      aptitudeStatus: "deferred",
      requiredForDeploy: aptitudeRequired,
      metadata: {
        source: params.source,
        pipeline: [...PIPELINE_STEPS],
      },
    })
    .returning();

  if (!run) {
    throw new Error("Failed to create orchestration run");
  }

  const runId = run.id;

  const advance = async (step: (typeof PIPELINE_STEPS)[number]) => {
    await db
      .update(agentOrchestrationRuns)
      .set({ step, updatedAt: new Date() })
      .where(eq(agentOrchestrationRuns.id, runId));
  };

  try {
    // ── Step: orchestrator / skill_mapping / governance_gate ─────────────────
    // These steps advance the run state — substantive logic is in aptitude_test
    // and provisioning. skill_mapping and governance_gate are reserved for
    // future tool/permission assignment and policy validation expansions.
    for (const step of PIPELINE_STEPS) {
      await advance(step);

      // ── Step: aptitude_test — evaluate the site's primary / template prompts ──
      if (step === "aptitude_test") {
        // Build a representative agent input from the first active concierge-like
        // agent on this site (if one already exists from a prior pass), or fall
        // back to a minimal context so the service can at least score config.
        const [existingAgent] = await db
          .select()
          .from(agents)
          .where(eq(agents.siteConfigId, params.siteConfigId))
          .limit(1);

        const aptitudeInput: AgentAptitudeInput = existingAgent
          ? {
              name: existingAgent.name,
              roleType: existingAgent.roleType,
              systemPrompt: existingAgent.systemPrompt,
              operationalMode: existingAgent.operationalMode,
              dominance: existingAgent.dominance,
              influence: existingAgent.influence,
              steadiness: existingAgent.steadiness,
              conscientiousness: existingAgent.conscientiousness,
              archProfile: existingAgent.archProfile as AgentAptitudeInput["archProfile"],
              voiceCompanyName: existingAgent.voiceCompanyName ?? params.businessName,
              siteConfigId: params.siteConfigId,
            }
          : {
              // No agents yet — evaluate against minimal context so the run records
              // a deferred aptitude score and does not hard-block new swarm creation.
              name: params.businessName,
              roleType: "concierge",
              systemPrompt: null,
              voiceCompanyName: params.businessName,
              siteConfigId: params.siteConfigId,
            };

        const aptitudeReport = await runAptitudePipelineWithRetry(aptitudeInput);

        // Persist outcome fields onto the run row
        await db
          .update(agentOrchestrationRuns)
          .set({
            aptitudeStatus: aptitudeReport.passed ? "pass" : "fail",
            clarityScore: aptitudeReport.clarityScore,
            configurationCompleteness: aptitudeReport.configurationCompleteness,
            fallbackDefined: aptitudeReport.fallbackDefined,
            firstValuePathPresent: aptitudeReport.firstValuePathPresent,
            metadata: {
              source: params.source,
              pipeline: [...PIPELINE_STEPS],
              aptitudeAttempts: aptitudeReport.totalAttempts,
              aptitudeRemediationApplied: aptitudeReport.remediationApplied,
              aptitudeFinalScore: aptitudeReport.finalScore,
            },
            updatedAt: new Date(),
          })
          .where(eq(agentOrchestrationRuns.id, runId));

        // If remediation improved the system prompt, persist it on the agent
        if (aptitudeReport.remediationApplied && aptitudeReport.finalPrompt && existingAgent) {
          await db
            .update(agents)
            .set({ systemPrompt: aptitudeReport.finalPrompt, updatedAt: new Date() })
            .where(eq(agents.id, existingAgent.id));
        }

        console.log(
          `[agentOrchestration] Aptitude step for site=${params.siteConfigId}: ` +
          `score=${aptitudeReport.finalScore} attempts=${aptitudeReport.totalAttempts} ` +
          `remediation=${aptitudeReport.remediationApplied} status=${aptitudeReport.passed ? "pass" : "fail"}`
        );
      }
    }

    const provisionResult = await provisionAgentsForBusiness(
      params.siteConfigId,
      params.placeTypes,
      params.businessName,
    );
    const conciergeIdx = provisionResult.archetypesProvisioned.indexOf("concierge");
    const primaryAgentId =
      conciergeIdx >= 0 ? provisionResult.agentIds[conciergeIdx] : provisionResult.agentIds[0] ?? null;

    const finalStatus = await finalizeProvisionRun({
      runId,
      primaryAgentId,
      aptitudeRequired,
      outcomeRequired,
    });

    return { runId, provisionResult, finalStatus };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(agentOrchestrationRuns)
      .set({
        status: "failed",
        currentState: "failed",
        blockers: [{ message }],
        failureRefs: [
          {
            trigger: "skill_failure",
            severity: "high",
            at: new Date().toISOString(),
          },
        ],
        updatedAt: new Date(),
      })
      .where(eq(agentOrchestrationRuns.id, runId));
    throw err;
  }
}

/**
 * Start a run for a single manual agent create (POST /api/agents).
 */
export async function createSingleAgentOrchestrationRun(params: {
  siteConfigId: string;
}): Promise<{ runId: string }> {
  const [run] = await db
    .insert(agentOrchestrationRuns)
    .values({
      siteConfigId: params.siteConfigId,
      currentState: "manual_agent_create",
      step: "orchestrator",
      status: "in_progress",
      aptitudeStatus: "deferred",
      requiredForDeploy: false,
      metadata: { purpose: "single_agent_create" },
    })
    .returning();

  if (!run) throw new Error("Failed to create orchestration run");
  return { runId: run.id };
}

/**
 * Validates run for POST /api/agents and returns run row or null.
 */
export async function assertRunAllowsSingleAgentCreate(params: {
  orchestrationRunId: string;
  siteConfigId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [run] = await db
    .select()
    .from(agentOrchestrationRuns)
    .where(
      and(
        eq(agentOrchestrationRuns.id, params.orchestrationRunId),
        eq(agentOrchestrationRuns.siteConfigId, params.siteConfigId),
      ),
    )
    .limit(1);

  if (!run) {
    return { ok: false, reason: "orchestration_run_not_found_or_site_mismatch" };
  }
  if (run.status !== "in_progress") {
    return { ok: false, reason: `run_not_in_progress:${run.status}` };
  }
  const purpose = (run.metadata as Record<string, unknown>)?.purpose;
  if (purpose !== "single_agent_create") {
    return { ok: false, reason: "run_purpose_not_single_agent_create" };
  }
  return { ok: true };
}

export async function completeSingleAgentCreateRun(params: {
  runId: string;
  agentId: string;
}): Promise<void> {
  await db
    .update(agentOrchestrationRuns)
    .set({
      status: "completed",
      currentState: "complete",
      agentId: params.agentId,
      updatedAt: new Date(),
    })
    .where(eq(agentOrchestrationRuns.id, params.runId));
}

export { envAgentCreateBypass };
