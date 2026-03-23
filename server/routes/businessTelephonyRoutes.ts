/**
 * Business Telephony Routes
 *
 * Per-business phone number management:
 *   - Voice plan gate ($50/mo required to provision)
 *   - Owner creates their Twilio sub-account
 *   - Owner searches and provisions numbers from their sub-account
 *   - Admin can assign numbers from master platform pool
 *   - 1 number per agent, max 10 agents per business
 *
 * Mount: app.use('/api/telephony/business', businessTelephonyRouter)
 */
import { Router } from "express";
import { db } from "../db";
import {
  siteConfigs,
  agents,
  agentPhoneAssignments,
  platformNumberPool,
} from "@shared/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { getTwilioClient } from "../twilio";

const router = Router();
const MAX_AGENTS_PER_BUSINESS = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated?.() && !req.user) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

async function getSiteConfig(siteConfigId: string) {
  const [site] = await db
    .select()
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId))
    .limit(1);
  return site ?? null;
}

async function getAgentCount(siteConfigId: string): Promise<number> {
  const [row] = await db
    .select({ cnt: count() })
    .from(agents)
    .where(and(eq(agents.siteConfigId, siteConfigId)));
  return Number(row?.cnt ?? 0);
}

async function getActiveAssignments(siteConfigId: string) {
  return db
    .select()
    .from(agentPhoneAssignments)
    .where(
      and(
        eq(agentPhoneAssignments.siteConfigId, siteConfigId),
        isNull(agentPhoneAssignments.releasedAt)
      )
    );
}

function buildWebhookUrl(path: string): string {
  const base =
    process.env.WEBHOOK_BASE_URL ||
    process.env.PLATFORM_URL ||
    "https://twilio.gatewayglobal.ai";
  return `${base.replace(/\/$/, "")}${path}`;
}

// ── GET /status/:siteConfigId ─────────────────────────────────────────────
// Returns voice plan status, sub-account info, agent count, and assignments
router.get("/status/:siteConfigId", async (req, res) => {
  try {
    const site = await getSiteConfig(req.params.siteConfigId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const agentCount = await getAgentCount(site.id);
    const assignments = await getActiveAssignments(site.id);

    res.json({
      voicePlanActive: site.voicePlanActive ?? false,
      voicePlanActivatedAt: site.voicePlanActivatedAt ?? null,
      hasSubAccount: !!(site.voiceSubAccountSid),
      subAccountSid: site.voiceSubAccountSid ?? null,
      subAccountFriendlyName: site.voiceSubAccountFriendlyName ?? null,
      agentCount,
      maxAgents: MAX_AGENTS_PER_BUSINESS,
      activeAssignments: assignments.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        phoneNumber: a.phoneNumber,
        phoneSid: a.phoneSid,
        friendlyName: a.friendlyName,
        isPrimary: a.isPrimary,
        assignedAt: a.assignedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /activate-plan/:siteConfigId ─────────────────────────────────────
// Admin-only: activate the voice plan for a business
// In production this would be triggered by a Stripe webhook; exposed here for admin override
router.post("/activate-plan/:siteConfigId", async (req, res) => {
  try {
    const site = await getSiteConfig(req.params.siteConfigId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    await db
      .update(siteConfigs)
      .set({ voicePlanActive: true, voicePlanActivatedAt: new Date() })
      .where(eq(siteConfigs.id, site.id));

    res.json({ success: true, message: "Voice AI Package activated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /create-sub-account/:siteConfigId ────────────────────────────────
// Owner or admin creates a Twilio sub-account for this business
router.post("/create-sub-account/:siteConfigId", async (req, res) => {
  try {
    const site = await getSiteConfig(req.params.siteConfigId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    if (!site.voicePlanActive) {
      return res.status(403).json({
        error: "Voice AI Package required",
        requiresVoicePlan: true,
        upgradeMessage:
          "A Voice AI Package ($50/mo) is required to provision a phone number. Upgrade in the Billing section to continue.",
      });
    }

    if (site.voiceSubAccountSid) {
      return res.status(409).json({
        error: "Sub-account already exists",
        subAccountSid: site.voiceSubAccountSid,
      });
    }

    const client = getTwilioClient();
    const businessName =
      (site as any).name ||
      (site as any).voiceCompanyName ||
      site.id;
    const friendlyName =
      req.body.friendlyName || `${businessName} — Gateway Global AI`;

    const subAccount = await client.api.v2010.accounts.create({
      friendlyName,
    });

    await db
      .update(siteConfigs)
      .set({
        voiceSubAccountSid: subAccount.sid,
        voiceSubAccountAuthToken: subAccount.authToken,
        voiceSubAccountFriendlyName: subAccount.friendlyName,
      })
      .where(eq(siteConfigs.id, site.id));

    res.json({
      success: true,
      subAccountSid: subAccount.sid,
      friendlyName: subAccount.friendlyName,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /search-numbers/:siteConfigId ─────────────────────────────────────
// Search available numbers from business sub-account (or master if no sub-account)
router.get("/search-numbers/:siteConfigId", async (req, res) => {
  try {
    const site = await getSiteConfig(req.params.siteConfigId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    if (!site.voicePlanActive) {
      return res.status(403).json({
        error: "Voice AI Package required",
        requiresVoicePlan: true,
        upgradeMessage:
          "Upgrade to the Voice AI Package ($50/mo) to search and provision phone numbers.",
      });
    }

    const { areaCode, country = "US" } = req.query as Record<string, string>;
    if (!areaCode || areaCode.length < 3) {
      return res.status(400).json({ error: "Area code (3 digits) required" });
    }

    // Use sub-account client if available, otherwise master
    let client = getTwilioClient();
    if (site.voiceSubAccountSid && site.voiceSubAccountAuthToken) {
      const twilio = await import("twilio");
      client = twilio.default(
        site.voiceSubAccountSid,
        site.voiceSubAccountAuthToken
      ) as any;
    }

    const numbers = await (client as any).availablePhoneNumbers(country).local.list({
      areaCode,
      limit: 20,
      voiceEnabled: true,
      smsEnabled: true,
    });

    res.json(
      numbers.map((n: any) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality,
        region: n.region,
        capabilities: n.capabilities,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /assign-number/:siteConfigId ─────────────────────────────────────
// Provision a number from Twilio and assign it to a specific agent
router.post("/assign-number/:siteConfigId", async (req, res) => {
  try {
    const site = await getSiteConfig(req.params.siteConfigId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    if (!site.voicePlanActive) {
      return res.status(403).json({
        error: "Voice AI Package required",
        requiresVoicePlan: true,
      });
    }

    const { phoneNumber, agentId, friendlyName } = req.body as {
      phoneNumber: string;
      agentId: string;
      friendlyName?: string;
    };

    if (!phoneNumber || !agentId) {
      return res.status(400).json({ error: "phoneNumber and agentId required" });
    }

    // Enforce max agents per business
    const agentCount = await getAgentCount(site.id);
    if (agentCount >= MAX_AGENTS_PER_BUSINESS) {
      return res.status(409).json({
        error: `Maximum ${MAX_AGENTS_PER_BUSINESS} agents per business`,
      });
    }

    // Check the agent belongs to this site
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.siteConfigId, site.id)))
      .limit(1);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found for this site" });
    }

    // Check agent doesn't already have a number
    const [existingAssignment] = await db
      .select()
      .from(agentPhoneAssignments)
      .where(
        and(
          eq(agentPhoneAssignments.agentId, agentId),
          isNull(agentPhoneAssignments.releasedAt)
        )
      )
      .limit(1);
    if (existingAssignment) {
      return res.status(409).json({
        error: "Agent already has an assigned number",
        existing: existingAssignment.phoneNumber,
      });
    }

    const voiceUrl = buildWebhookUrl("/webhook/voice");
    const smsUrl = buildWebhookUrl("/webhook/sms");

    // Purchase number using sub-account client (or master)
    let client = getTwilioClient();
    if (site.voiceSubAccountSid && site.voiceSubAccountAuthToken) {
      const twilio = await import("twilio");
      client = twilio.default(
        site.voiceSubAccountSid,
        site.voiceSubAccountAuthToken
      ) as any;
    }

    const purchased = await (client as any).incomingPhoneNumbers.create({
      phoneNumber,
      friendlyName:
        friendlyName || `${(agent as any).name || "Agent"} — ${(site as any).name || site.id}`,
      voiceUrl,
      voiceMethod: "POST",
      smsUrl,
      smsMethod: "POST",
      statusCallbackUrl: buildWebhookUrl("/webhook/voice/status"),
    });

    // Check if this should be primary (first number for site)
    const existing = await getActiveAssignments(site.id);
    const isPrimary = existing.length === 0;

    const [assignment] = await db
      .insert(agentPhoneAssignments)
      .values({
        siteConfigId: site.id,
        agentId,
        phoneNumber: purchased.phoneNumber,
        phoneSid: purchased.sid,
        subAccountSid: site.voiceSubAccountSid || null,
        friendlyName: purchased.friendlyName,
        voiceUrl,
        smsUrl,
        isPrimary,
      })
      .returning();

    // If primary, also update site_configs.provisioned_phone_number for backward compat
    if (isPrimary) {
      await db
        .update(siteConfigs)
        .set({
          provisionedPhoneNumber: purchased.phoneNumber,
          provisionedPhoneSid: purchased.sid,
        })
        .where(eq(siteConfigs.id, site.id));
    }

    res.json({
      success: true,
      assignment: {
        id: assignment.id,
        phoneNumber: assignment.phoneNumber,
        phoneSid: assignment.phoneSid,
        agentId: assignment.agentId,
        isPrimary: assignment.isPrimary,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /release-number/:assignmentId ────────────────────────────────────
// Release a number assignment (soft delete + Twilio release)
router.post("/release-number/:assignmentId", async (req, res) => {
  try {
    const [assignment] = await db
      .select()
      .from(agentPhoneAssignments)
      .where(eq(agentPhoneAssignments.id, req.params.assignmentId))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (assignment.releasedAt) {
      return res.status(409).json({ error: "Number already released" });
    }

    const site = await getSiteConfig(assignment.siteConfigId);

    // Release in Twilio
    try {
      let client = getTwilioClient();
      if (site?.voiceSubAccountSid && site?.voiceSubAccountAuthToken) {
        const twilio = await import("twilio");
        client = twilio.default(
          site.voiceSubAccountSid,
          site.voiceSubAccountAuthToken
        ) as any;
      }
      await (client as any).incomingPhoneNumbers(assignment.phoneSid).remove();
    } catch (twilioErr: any) {
      console.warn(
        "[businessTelephony] Twilio release error (continuing):",
        twilioErr.message
      );
    }

    // Soft-delete assignment
    await db
      .update(agentPhoneAssignments)
      .set({
        releasedAt: new Date(),
        releasedBy: req.body.releasedBy || "owner",
        updatedAt: new Date(),
      })
      .where(eq(agentPhoneAssignments.id, assignment.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /assignments/:siteConfigId ───────────────────────────────────────
// All active number assignments for a site, with agent names joined
router.get("/assignments/:siteConfigId", async (req, res) => {
  try {
    const assignments = await db
      .select({
        id: agentPhoneAssignments.id,
        agentId: agentPhoneAssignments.agentId,
        phoneNumber: agentPhoneAssignments.phoneNumber,
        phoneSid: agentPhoneAssignments.phoneSid,
        friendlyName: agentPhoneAssignments.friendlyName,
        isPrimary: agentPhoneAssignments.isPrimary,
        assignedAt: agentPhoneAssignments.assignedAt,
        agentName: agents.name,
        agentRoleType: agents.roleType,
      })
      .from(agentPhoneAssignments)
      .leftJoin(agents, eq(agentPhoneAssignments.agentId, agents.id))
      .where(
        and(
          eq(agentPhoneAssignments.siteConfigId, req.params.siteConfigId),
          isNull(agentPhoneAssignments.releasedAt)
        )
      );

    res.json(assignments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: GET /admin/all-sub-accounts ────────────────────────────────────
// Platform admin: all businesses with voice sub-accounts
router.get("/admin/all-sub-accounts", async (req, res) => {
  try {
    const sites = await db
      .select({
        id: siteConfigs.id,
        name: (siteConfigs as any).name,
        voicePlanActive: siteConfigs.voicePlanActive,
        voicePlanActivatedAt: siteConfigs.voicePlanActivatedAt,
        voiceSubAccountSid: siteConfigs.voiceSubAccountSid,
        voiceSubAccountFriendlyName: siteConfigs.voiceSubAccountFriendlyName,
        provisionedPhoneNumber: siteConfigs.provisionedPhoneNumber,
      })
      .from(siteConfigs)
      .where(eq(siteConfigs.voicePlanActive, true));

    res.json(sites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: GET /admin/number-pool ─────────────────────────────────────────
// Platform admin: numbers in the master pool
router.get("/admin/number-pool", async (req, res) => {
  try {
    const pool = await db
      .select()
      .from(platformNumberPool)
      .orderBy(platformNumberPool.status);
    res.json(pool);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: POST /admin/number-pool/add ────────────────────────────────────
// Admin adds a number from Twilio master account into the managed pool
router.post("/admin/number-pool/add", async (req, res) => {
  try {
    const { phoneNumber, areaCode, country = "US" } = req.body as {
      phoneNumber?: string;
      areaCode?: string;
      country?: string;
    };

    const client = getTwilioClient();
    let purchased: any;

    if (phoneNumber) {
      // Purchase a specific number
      purchased = await (client as any).incomingPhoneNumbers.create({
        phoneNumber,
        voiceUrl: buildWebhookUrl("/webhook/voice"),
        smsUrl: buildWebhookUrl("/webhook/sms"),
      });
    } else if (areaCode) {
      // Search and buy first available in area code
      const available = await (client as any).availablePhoneNumbers(country).local.list({
        areaCode,
        limit: 1,
        voiceEnabled: true,
        smsEnabled: true,
      });
      if (!available.length) {
        return res.status(404).json({ error: `No numbers available in area code ${areaCode}` });
      }
      purchased = await (client as any).incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
        voiceUrl: buildWebhookUrl("/webhook/voice"),
        smsUrl: buildWebhookUrl("/webhook/sms"),
      });
    } else {
      return res.status(400).json({ error: "phoneNumber or areaCode required" });
    }

    const [poolEntry] = await db
      .insert(platformNumberPool)
      .values({
        phoneNumber: purchased.phoneNumber,
        phoneSid: purchased.sid,
        areaCode: areaCode || purchased.phoneNumber.slice(2, 5),
        friendlyName: purchased.friendlyName,
        accountSid: process.env.SYSTEM_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || "",
        status: "available",
      })
      .returning();

    res.json({ success: true, number: poolEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: POST /admin/number-pool/assign ─────────────────────────────────
// Admin assigns a pool number directly to a business agent (bypasses sub-account flow)
router.post("/admin/number-pool/assign", async (req, res) => {
  try {
    const { poolNumberId, siteConfigId, agentId } = req.body as {
      poolNumberId: string;
      siteConfigId: string;
      agentId: string;
    };

    if (!poolNumberId || !siteConfigId || !agentId) {
      return res.status(400).json({ error: "poolNumberId, siteConfigId, agentId required" });
    }

    const [poolNumber] = await db
      .select()
      .from(platformNumberPool)
      .where(eq(platformNumberPool.id, poolNumberId))
      .limit(1);

    if (!poolNumber) {
      return res.status(404).json({ error: "Pool number not found" });
    }
    if (poolNumber.status !== "available") {
      return res.status(409).json({ error: `Number is ${poolNumber.status}` });
    }

    const site = await getSiteConfig(siteConfigId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.siteConfigId, siteConfigId)))
      .limit(1);
    if (!agent) return res.status(404).json({ error: "Agent not found for this site" });

    // Check agent doesn't already have a number
    const [existing] = await db
      .select()
      .from(agentPhoneAssignments)
      .where(
        and(
          eq(agentPhoneAssignments.agentId, agentId),
          isNull(agentPhoneAssignments.releasedAt)
        )
      )
      .limit(1);
    if (existing) {
      return res.status(409).json({
        error: "Agent already has a number",
        existing: existing.phoneNumber,
      });
    }

    const activeAssignments = await getActiveAssignments(siteConfigId);
    const isPrimary = activeAssignments.length === 0;

    // Update Twilio webhooks to point to this business
    const client = getTwilioClient();
    await (client as any).incomingPhoneNumbers(poolNumber.phoneSid).update({
      voiceUrl: buildWebhookUrl("/webhook/voice"),
      smsUrl: buildWebhookUrl("/webhook/sms"),
      friendlyName: `${(agent as any).name || "Agent"} — ${(site as any).name || siteConfigId}`,
    });

    const [assignment] = await db
      .insert(agentPhoneAssignments)
      .values({
        siteConfigId,
        agentId,
        phoneNumber: poolNumber.phoneNumber,
        phoneSid: poolNumber.phoneSid,
        subAccountSid: poolNumber.accountSid,
        friendlyName: poolNumber.friendlyName,
        voiceUrl: buildWebhookUrl("/webhook/voice"),
        smsUrl: buildWebhookUrl("/webhook/sms"),
        isPrimary,
      })
      .returning();

    await db
      .update(platformNumberPool)
      .set({
        status: "assigned",
        assignedToSiteConfigId: siteConfigId,
        assignedToAgentId: agentId,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(platformNumberPool.id, poolNumberId));

    if (isPrimary) {
      await db
        .update(siteConfigs)
        .set({
          provisionedPhoneNumber: poolNumber.phoneNumber,
          provisionedPhoneSid: poolNumber.phoneSid,
        })
        .where(eq(siteConfigs.id, siteConfigId));
    }

    res.json({ success: true, assignment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
