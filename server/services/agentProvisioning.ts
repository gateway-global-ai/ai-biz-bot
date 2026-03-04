/**
 * Agent Provisioning Service
 *
 * On business signup, detects the industry group from Google Places types,
 * then clones all 6 pre-tuned archetypes into the site's agent roster.
 *
 * The owner arrives to a fully configured team on day one — no blank screen,
 * no DISC sliders to figure out, no prompt engineering required.
 */

import { db } from '../db.js';
import { storage } from '../storage.js';
import { eq, and } from 'drizzle-orm';
import {
  industryAgentTemplates,
  agents,
  PLACES_TYPE_TO_INDUSTRY,
  type IndustryGroup,
  type IndustryAgentTemplate,
} from '@shared/schema';
import { buildBehavioralPrompt } from './promptCompiler.js';

// ── Industry Detection ─────────────────────────────────────────────────────────

/**
 * Map Google Places types[] to an IndustryGroup.
 * Returns the best match or 'professional_services' as default.
 */
export function detectIndustryGroup(placeTypes: string[]): IndustryGroup {
  for (const type of placeTypes) {
    const group = PLACES_TYPE_TO_INDUSTRY[type];
    if (group) return group;
  }
  return 'professional_services'; // sensible default
}

// ── Template → Agent Conversion ────────────────────────────────────────────────

function buildSystemPromptFromTemplate(template: IndustryAgentTemplate): string {
  // Build a minimal agent-like object for the prompt compiler
  const agentLike = {
    name: template.defaultName,
    voiceRole: template.roleType,
    voiceCompanyName: 'Gateway Global AI',
    voicePersona: 'professional',
    dominance: template.dominance,
    influence: template.influence,
    steadiness: template.steadiness,
    conscientiousness: template.conscientiousness,
    archProfile: {
      acknowledge: template.archAcknowledge,
      reflect: template.archReflect,
      context: template.archContext,
      handoff: template.archHandoff,
    },
    shortTermMemory: template.shortTermMemoryTemplate ? {
      specialty: template.shortTermMemoryTemplate,
      focus: template.primaryIntent || '',
      method: 'consistent, character-driven interaction',
      differentiator: template.worldView || '',
      discAnalysis: `D:${template.dominance} I:${template.influence} S:${template.steadiness} C:${template.conscientiousness}`,
    } : null,
    longTermMemory: template.longTermCoreTemplate ? {
      dominantTrait: template.longTermCoreTemplate.split('.')[0] || '',
      years: '5',
      originStory: template.longTermCoreTemplate,
      unbreakableRule: template.unbreakableRule || '',
      ruleReason: template.worldView || '',
      primaryIntent: template.primaryIntent || '',
      happySeeing: 'a customer who leaves knowing exactly what they needed',
      sadSeeing: 'an inquiry left unresolved or a caller feeling unheard',
      priorityOverMoney: 'Trust',
      philosophyPeople: 'deserve clarity, care, and competence in every interaction',
      philosophyLife: 'better when people help each other get what they actually need',
      philosophyToday: 'about being the most helpful version of myself for whoever calls',
    } : null,
  } as any;

  return buildBehavioralPrompt(agentLike);
}

// ── Main Provisioning Function ──────────────────────────────────────────────────

export interface ProvisioningResult {
  industryGroup: IndustryGroup;
  agentsCreated: number;
  agentIds: string[];
  archetypesProvisioned: string[];
}

/**
 * Provision all 6 agent archetypes for a business on signup.
 *
 * @param siteConfigId — the new site's config ID
 * @param placeTypes — Google Places types[] from the business search result
 * @param businessName — the business name (used for display in agent names)
 * @param customerId — optional customer account ID for tracking
 */
export async function provisionAgentsForBusiness(
  siteConfigId: string,
  placeTypes: string[],
  businessName: string,
  customerId?: string,
): Promise<ProvisioningResult> {
  const industryGroup = detectIndustryGroup(placeTypes);

  console.log(`[Provisioning] Detected industry: ${industryGroup} for "${businessName}"`);

  // Fetch all 6 templates for this industry group
  const templates = await db
    .select()
    .from(industryAgentTemplates)
    .where(
      and(
        eq(industryAgentTemplates.industryGroup, industryGroup),
        eq(industryAgentTemplates.isActive, true),
      )
    )
    .orderBy(industryAgentTemplates.sortOrder);

  if (templates.length === 0) {
    console.warn(`[Provisioning] No templates found for industry: ${industryGroup}`);
    return { industryGroup, agentsCreated: 0, agentIds: [], archetypesProvisioned: [] };
  }

  const agentIds: string[] = [];
  const archetypesProvisioned: string[] = [];

  for (const template of templates) {
    try {
      const systemPrompt = buildSystemPromptFromTemplate(template);

      const agent = await storage.createAgent({
        siteConfigId,
        name: template.defaultName,
        voiceId: template.voiceId || 'Kore',
        voiceName: template.voiceName || 'Kore - Calm & Professional',
        status: 'active',
        dominance: template.dominance,
        influence: template.influence,
        steadiness: template.steadiness,
        conscientiousness: template.conscientiousness,
        avatarId: template.avatarId || 'avatar1',
        systemPrompt,
        shortTermMemory: template.shortTermMemoryTemplate ? {
          specialty: template.shortTermMemoryTemplate,
          focus: template.primaryIntent || '',
          method: 'character-first behavioral alignment',
          differentiator: template.worldView || '',
          discAnalysis: `D:${template.dominance} I:${template.influence} S:${template.steadiness} C:${template.conscientiousness}`,
        } : null,
        longTermMemory: template.longTermCoreTemplate ? {
          dominantTrait: 'Dedicated',
          years: '5',
          originStory: template.longTermCoreTemplate,
          unbreakableRule: template.unbreakableRule || '',
          ruleReason: template.worldView || '',
          primaryIntent: template.primaryIntent || '',
          happySeeing: 'a caller who hangs up with exactly what they needed',
          sadSeeing: 'an opportunity to help someone that was missed',
          priorityOverMoney: 'Trust',
          philosophyPeople: 'deserve to be heard and helped efficiently',
          philosophyLife: 'is better when we make our interactions count',
          philosophyToday: 'is a chance to be the best version of this role',
        } : null,
        archProfile: {
          acknowledge: template.archAcknowledge,
          reflect: template.archReflect,
          context: template.archContext,
          handoff: template.archHandoff,
        },
        voiceRole: template.roleType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        voiceCompanyName: businessName,
        voicePersona: 'professional',
        aiModelProvider: 'gemini',
        aiModelId: process.env.GEMINI_MODEL_FALLBACK,
        aiTemperature: 65,
        aiMaxTokens: 4096,
        budgetAmountUsd: '0',
        budgetPeriod: 'monthly',
        budgetSpentUsd: '0',
        startupStatus: 'pending',
      });

      agentIds.push(agent.id);
      archetypesProvisioned.push(template.roleType);

      console.log(`[Provisioning] Created agent: ${template.defaultName} (${template.roleType})`);
    } catch (err: any) {
      console.error(`[Provisioning] Failed to create agent for ${template.roleType}:`, err.message);
    }
  }

  // If a siteConfig exists, assign the concierge as the primary agent
  if (agentIds.length > 0) {
    try {
      const conciergeIdx = archetypesProvisioned.indexOf('concierge');
      const primaryAgentId = conciergeIdx >= 0 ? agentIds[conciergeIdx] : agentIds[0];
      await storage.updateSiteConfig(siteConfigId, { assignedAgentId: primaryAgentId });
      console.log(`[Provisioning] Assigned primary agent (concierge) to siteConfigId=${siteConfigId}`);
    } catch (err: any) {
      console.warn('[Provisioning] Failed to assign primary agent:', err.message);
    }
  }

  return {
    industryGroup,
    agentsCreated: agentIds.length,
    agentIds,
    archetypesProvisioned,
  };
}

// ── Query helpers ──────────────────────────────────────────────────────────────

export async function getTemplatesForIndustry(group: IndustryGroup): Promise<IndustryAgentTemplate[]> {
  return db
    .select()
    .from(industryAgentTemplates)
    .where(and(eq(industryAgentTemplates.industryGroup, group), eq(industryAgentTemplates.isActive, true)))
    .orderBy(industryAgentTemplates.sortOrder);
}

export async function getAllIndustryGroups(): Promise<string[]> {
  const results = await db
    .selectDistinct({ group: industryAgentTemplates.industryGroup })
    .from(industryAgentTemplates)
    .where(eq(industryAgentTemplates.isActive, true));
  return results.map(r => r.group);
}
