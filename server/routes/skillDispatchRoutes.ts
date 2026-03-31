/**
 * Skill Dispatch Routes — Gateway Global AI OS
 *
 * Unified server endpoint for canvas skill actions triggered by the PTT AI.
 * The AI emits a canvas:dispatch event → client sends POST /api/skills/dispatch →
 * this route validates security level, calls the appropriate backend, and
 * returns a CanvasViewPayload for the canvas to render.
 *
 * Mount: app.use('/api/skills', skillDispatchRouter)
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { siteConfigs, agents, customerAccounts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import type { PhoneProvisioningPayload, AccountOverviewPayload } from "@shared/canvasViewContract";
import {
  runAgentSwarmProvisionOrchestrated,
  createSingleAgentOrchestrationRun,
} from "../services/agentOrchestration";
import { runAptitudePipelineWithRetry, type AgentAptitudeInput } from "../services/agentAptitudeService";

const router = Router();

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function resolveVisitorSecurityLevel(
  req: any
): Promise<{ level: "anonymous" | "phone_verified" | "admin"; customerId?: string; adminId?: string }> {
  const bearer = (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  if (bearer) {
    const adminSession = await storage.getValidAuthSession(bearer).catch(() => null);
    if (adminSession) return { level: "admin", adminId: adminSession.adminUserId };
    const customerSession = await storage.getValidCustomerSession(bearer).catch(() => null);
    if (customerSession) return { level: "phone_verified", customerId: customerSession.customerAccountId };
  }
  // Check visitor security level from visitor session
  const visitorSecurityLevel = (req.headers["x-visitor-security-level"] as string) ?? "anonymous";
  return { level: visitorSecurityLevel as "anonymous" | "phone_verified" | "admin" };
}

// ── POST /dispatch — unified skill action handler ─────────────────────────────

const dispatchSchema = z.object({
  skillId: z.enum([
    "provision_phone_number",
    "show_account",
    "build_agent",
    "configure_workspace",
    "render_component",
    "manage_agents",
    "run_aptitude_test",
  ]),
  action: z.string().optional(),
  siteConfigId: z.string().uuid().optional(),
  data: z.record(z.unknown()).optional(),
  visitorId: z.string().optional(),
});

router.post("/dispatch", async (req, res) => {
  const parsed = dispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { skillId, action, siteConfigId, data } = parsed.data;
  const auth = await resolveVisitorSecurityLevel(req);

  // Security level gate — anonymous can only use render_component
  const LEVEL_ORDER = { anonymous: 0, phone_verified: 1, admin: 2 };
  const SKILL_MIN_LEVEL: Record<string, number> = {
    render_component: 0,
    show_account: 1,
    provision_phone_number: 1,
    build_agent: 2,
    configure_workspace: 2,
    manage_agents: 2,
    run_aptitude_test: 2,
  };
  const minLevel = SKILL_MIN_LEVEL[skillId] ?? 1;
  if (LEVEL_ORDER[auth.level] < minLevel) {
    return res.status(403).json({
      error: `Skill '${skillId}' requires ${Object.keys(LEVEL_ORDER)[minLevel]} security level. Current level: ${auth.level}`,
    });
  }

  // ── provision_phone_number skill ─────────────────────────────────────────
  if (skillId === "provision_phone_number") {
    if (!siteConfigId) {
      return res.status(400).json({ error: "siteConfigId required for provision_phone_number" });
    }

    // Get voice plan status
    const [site] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId)).limit(1);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const voicePlanActive = !!(site as any).voicePlanActivatedAt;

    if (action === "search_numbers") {
      const areaCode = (data?.areaCode as string) ?? "";
      if (!areaCode || areaCode.length !== 3) {
        return res.status(400).json({ error: "Valid 3-digit area code required" });
      }

      try {
        const { getTwilioClient } = await import("../twilio");
        const twilio = await getTwilioClient();
        const numbers = await twilio.availablePhoneNumbers("US")
          .local.list({ areaCode: parseInt(areaCode, 10), limit: 8 });

        const available = numbers.map((n: any) => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          locality: n.locality ?? "",
        }));

        const payload: PhoneProvisioningPayload = {
          viewId: "phone_provisioning_form",
          title: "Choose Your Number",
          subtitle: `Available numbers in area code ${areaCode}`,
          sourceSkillId: "provision_phone_number",
          dismissible: true,
          siteConfigId,
          suggestedAreaCode: areaCode,
          availableNumbers: available,
          voicePlanActive,
        };
        return res.json({ ok: true, canvasPayload: payload });
      } catch (e: any) {
        return res.status(500).json({ error: e.message ?? "Twilio search failed" });
      }
    }

    // Default: return the provisioning form view
    const payload: PhoneProvisioningPayload = {
      viewId: "phone_provisioning_form",
      title: "Set Up Your Phone Number",
      subtitle: "Add a phone line to your AI Business Router",
      sourceSkillId: "provision_phone_number",
      dismissible: true,
      siteConfigId,
      voicePlanActive,
    };
    return res.json({ ok: true, canvasPayload: payload });
  }

  // ── show_account skill ───────────────────────────────────────────────────
  if (skillId === "show_account") {
    const businesses = auth.customerId
      ? await storage.getSiteConfigsByOwner(auth.customerId)
      : [];

    let plan = "free";
    if (auth.customerId) {
      const [acct] = await db.select().from(customerAccounts).where(eq(customerAccounts.id, auth.customerId)).limit(1);
      plan = acct?.plan ?? "free";
    }

    const payload: AccountOverviewPayload = {
      viewId: "account_overview",
      title: "Your Account",
      subtitle: `Plan: ${plan}`,
      sourceSkillId: "show_account",
      dismissible: true,
      plan,
      businesses: (businesses as any[]).map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        businessAddress: b.businessAddress ?? undefined,
      })),
    };
    return res.json({ ok: true, canvasPayload: payload });
  }

  // ── build_agent skill — async orchestration pipeline ─────────────────────
  if (skillId === "build_agent") {
    if (!siteConfigId) {
      return res.status(400).json({ error: "siteConfigId required for build_agent" });
    }

    const [site] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId)).limit(1);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const businessName = (site as any).name ?? "Business";
    const placeTypes: string[] = (data?.placeTypes as string[]) ?? ["establishment"];
    const agentName: string = (data?.agentName as string) ?? "";
    const roleType: string = (data?.roleType as string) ?? "concierge";

    // Create orchestration run immediately for job tracking
    const { runId } = await createSingleAgentOrchestrationRun({ siteConfigId });

    // Launch full swarm provision pipeline asynchronously — returns job ID to client
    void runAgentSwarmProvisionOrchestrated({
      siteConfigId,
      placeTypes,
      businessName,
      source: "single_agent_create",
    }).then((result) => {
      console.log(
        `[skillDispatch] build_agent pipeline completed for site=${siteConfigId} ` +
        `runId=${result.runId} status=${result.finalStatus} ` +
        `agents=${result.provisionResult.agentsCreated} skipped=${result.provisionResult.agentsSkipped}`
      );
    }).catch((err: unknown) => {
      console.error(`[skillDispatch] build_agent pipeline failed for site=${siteConfigId}:`, err);
    });

    return res.json({
      ok: true,
      jobId: runId,
      status: "in_progress",
      canvasPayload: {
        viewId: "agent_build_status",
        title: agentName ? `Building ${agentName}` : "Building Agent Roster",
        subtitle: `Role: ${roleType.replace(/_/g, " ")} | Running aptitude + provisioning pipeline…`,
        sourceSkillId: "build_agent",
        dismissible: false,
        siteConfigId,
        jobId: runId,
        pollingUrl: `/api/intelligence/orchestration-runs/${runId}`,
      },
    });
  }

  // ── manage_agents skill — list agents with status + QR routes ────────────
  if (skillId === "manage_agents") {
    if (!siteConfigId) {
      return res.status(400).json({ error: "siteConfigId required for manage_agents" });
    }

    const agentList = await db
      .select({
        id: agents.id,
        name: agents.name,
        roleType: agents.roleType,
        status: agents.status,
        visibility: agents.visibility,
        startupStatus: agents.startupStatus,
      })
      .from(agents)
      .where(eq(agents.siteConfigId, siteConfigId));

    return res.json({
      ok: true,
      canvasPayload: {
        viewId: "agent_roster",
        title: "Agent Roster",
        subtitle: `${agentList.length} agent(s) on this site`,
        sourceSkillId: "manage_agents",
        dismissible: true,
        siteConfigId,
        agents: agentList,
      },
    });
  }

  // ── run_aptitude_test skill — re-run aptitude for a specific agent ────────
  if (skillId === "run_aptitude_test") {
    const agentId = data?.agentId as string | undefined;
    if (!agentId) {
      return res.status(400).json({ error: "data.agentId required for run_aptitude_test" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const aptitudeInput: AgentAptitudeInput = {
      name: agent.name,
      roleType: agent.roleType,
      systemPrompt: agent.systemPrompt,
      operationalMode: agent.operationalMode,
      dominance: agent.dominance,
      influence: agent.influence,
      steadiness: agent.steadiness,
      conscientiousness: agent.conscientiousness,
      archProfile: agent.archProfile as AgentAptitudeInput["archProfile"],
      voiceCompanyName: agent.voiceCompanyName,
      siteConfigId: agent.siteConfigId,
    };

    const report = await runAptitudePipelineWithRetry(aptitudeInput);

    // If remediation improved the prompt, persist it
    if (report.remediationApplied && report.finalPrompt) {
      await db
        .update(agents)
        .set({ systemPrompt: report.finalPrompt, updatedAt: new Date() })
        .where(eq(agents.id, agentId));
    }

    return res.json({
      ok: true,
      canvasPayload: {
        viewId: "aptitude_test_runner",
        title: `Aptitude Report — ${agent.name}`,
        subtitle: `Score: ${report.finalScore}/100 | Status: ${report.passed ? "PASS ✓" : "FAIL ✗"} | Attempts: ${report.totalAttempts}`,
        sourceSkillId: "run_aptitude_test",
        dismissible: true,
        agentId,
        report,
      },
    });
  }

  // ── render_component / configure_workspace ───────────────────────────────
  return res.json({
    ok: true,
    canvasPayload: {
      viewId: skillId === "configure_workspace" ? "workspace_provisioning_form" : "dynamic",
      title: skillId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      sourceSkillId: skillId,
      dismissible: true,
      siteConfigId,
      ...(data ?? {}),
    },
  });
});

export default router;
