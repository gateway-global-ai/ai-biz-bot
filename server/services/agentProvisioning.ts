/**
 * Agent provisioning from industry templates: maps place types to industry group,
 * clones industry_agent_templates into live agents for a site.
 */
import { and, eq } from "drizzle-orm";
import {
  industryAgentTemplates,
  INDUSTRY_GROUPS,
  PLACES_TYPE_TO_INDUSTRY,
  siteConfigs,
  type InsertAgent,
} from "@shared/schema";
import { db } from "../db";
import { storage } from "../storage";

const DEFAULT_VOICE_ID = "default";
const DEFAULT_VOICE_NAME = "Default";

export type IndustryGroup = (typeof INDUSTRY_GROUPS)[number];

export interface ProvisionResult {
  industryGroup: string;
  agentsCreated: number;
  archetypesProvisioned: string[];
  agentIds: string[];
}

/**
 * Resolve industry group from place types (e.g. ["restaurant","food"] -> food_beverage).
 */
function resolveIndustryGroup(placeTypes: string[]): IndustryGroup {
  const normalized = placeTypes.map((t) => t.toLowerCase().replace(/\s+/g, "_"));
  for (const t of normalized) {
    const group = PLACES_TYPE_TO_INDUSTRY[t];
    if (group) return group;
  }
  return "professional_services";
}

/**
 * Fetch all templates for an industry group.
 */
export async function getTemplatesForIndustry(
  industryGroup: string
): Promise<typeof industryAgentTemplates.$inferSelect[]> {
  const rows = await db
    .select()
    .from(industryAgentTemplates)
    .where(eq(industryAgentTemplates.industryGroup, industryGroup));
  return rows;
}

/**
 * Return the list of industry group slugs.
 */
export async function getAllIndustryGroups(): Promise<string[]> {
  return [...INDUSTRY_GROUPS];
}

/**
 * Provision agents for a business: map placeTypes to industry, clone templates into agents.
 * Idempotent: if 6+ agents already exist for this site, returns existing roster (no duplicates).
 */
export async function provisionAgentsForBusiness(
  siteConfigId: string,
  placeTypes: string[],
  businessName: string
): Promise<ProvisionResult> {
  const industryGroup = resolveIndustryGroup(placeTypes);
  const templates = await getTemplatesForIndustry(industryGroup);

  // Idempotency guard: if agents already exist for this site, return them and ensure Concierge is assigned
  const existing = await storage.getAgentsBySiteConfigId(siteConfigId);
  if (existing.length >= 6) {
    const concierge = existing.find((a) => (a.roleType ?? '').toLowerCase() === 'concierge') ?? existing[0];
    if (concierge) {
      await storage.updateSiteConfig(siteConfigId, { assignedAgentId: concierge.id } as any);
    }
    return {
      industryGroup,
      agentsCreated: 0,
      archetypesProvisioned: existing.map((a) => a.roleType ?? 'unknown'),
      agentIds: existing.map((a) => a.id),
    };
  }

  const createdAgents: Awaited<ReturnType<typeof storage.createAgent>>[] = [];
  for (const t of templates) {
    const name = `${t.defaultName} (${businessName})`;
    const agent: InsertAgent = {
      siteConfigId,
      roleType: t.roleType,
      name,
      voiceId: DEFAULT_VOICE_ID,
      voiceName: DEFAULT_VOICE_NAME,
      status: "active",
      dominance: t.dominance,
      influence: t.influence,
      steadiness: t.steadiness,
      conscientiousness: t.conscientiousness,
      systemPrompt: t.primaryIntent ?? undefined,
    };
    const created = await storage.createAgent(agent);
    createdAgents.push(created);
  }

  // Workspace lifecycle: flip demo -> provisioned after successful agent creation.
  // Only flips when currently 'demo'; does not overwrite claimed/active/archived.
  try {
    await db
      .update(siteConfigs)
      .set({ workspaceState: "provisioned", updatedAt: new Date() })
      .where(
        and(
          eq(siteConfigs.id, siteConfigId),
          eq(siteConfigs.workspaceState, "demo")
        )
      );
  } catch (err) {
    console.error("[agentProvisioning] workspace_state flip failed:", err);
  }

  // Concierge assignment: by roleType (re-fetch so we have DB-backed roleType)
  const createdRoster = await storage.getAgentsBySiteConfigId(siteConfigId);
  const concierge = createdRoster.find((a) => (a.roleType ?? '').toLowerCase() === 'concierge');
  if (concierge) {
    await storage.updateSiteConfig(siteConfigId, { assignedAgentId: concierge.id } as any);
  }

  return {
    industryGroup,
    agentsCreated: createdAgents.length,
    archetypesProvisioned: createdAgents.map((a) => a.roleType).filter(Boolean) as string[],
    agentIds: createdAgents.map((a) => a.id),
  };
}
