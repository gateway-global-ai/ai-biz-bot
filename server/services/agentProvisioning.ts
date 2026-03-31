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
  agentTemplates,
  siteConfigs,
  PLACES_TYPE_TO_INDUSTRY,
  type IndustryGroup,
  type IndustryAgentTemplate,
  type Agent,
} from '@shared/schema';
import { buildMergedCognitionContract, type MergedCognitionContractV1 } from '@shared/cognitionContract';
import { generateQrForRoute } from './qrRoutingService.js';
import { buildBehavioralPrompt } from './promptCompiler.js';
import type { StructuredControls } from '@shared/schema';
import { getHospitalitySchematicMember } from '../config/loadHospitalitySwarmSchematic.js';
import { getArchetypeCharacterProfile } from '../config/archetypeCharacterDefaults.js';
import { ensureHospitalityCloudbedsDbProjection } from './hospitalitySwarmDbProjection.js';


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
  /** New rows inserted this run. */
  agentsCreated: number;
  /** Existing agents reused (same site + roleType); no duplicate create. */
  agentsSkipped: number;
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

  // Resolve site slug for QR route destination
  const appUrl = process.env.APP_URL ?? 'https://aibizbot-dev.gatewayglobal.ai';
  const [siteRow] = await db.select({ slug: siteConfigs.slug }).from(siteConfigs).where(eq(siteConfigs.id, siteConfigId)).limit(1);
  const siteSlug = siteRow?.slug ?? null;

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
    return { industryGroup, agentsCreated: 0, agentsSkipped: 0, agentIds: [], archetypesProvisioned: [] };
  }

  let hospitalityProjection:
    | Awaited<ReturnType<typeof ensureHospitalityCloudbedsDbProjection>>
    | null = null;
  if (industryGroup === 'hospitality_travel') {
    try {
      hospitalityProjection = await ensureHospitalityCloudbedsDbProjection();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[Provisioning] Hospitality DB projection failed: ${msg}`);
      return { industryGroup, agentsCreated: 0, agentsSkipped: 0, agentIds: [], archetypesProvisioned: [] };
    }
  }

  const existingRoster = await storage.getAgentsBySiteConfigId(siteConfigId);
  const existingByRole = new Map<string, Agent>();
  for (const a of existingRoster) {
    if (a.roleType && !existingByRole.has(a.roleType)) {
      existingByRole.set(a.roleType, a);
    }
  }

  const agentIds: string[] = [];
  const archetypesProvisioned: string[] = [];
  let agentsCreated = 0;
  let agentsSkipped = 0;

  for (const template of templates) {
    try {
      let hospitalityOperationalMode: string | undefined;
      let hospitalityStructuredControls: StructuredControls | undefined;
      const classificationLink = hospitalityProjection?.linkByRoleType.get(template.roleType);
      if (industryGroup === 'hospitality_travel' && hospitalityProjection) {
        const schDoc = hospitalityProjection.doc;
        const sm = getHospitalitySchematicMember(schDoc, template.roleType);
        if (!sm) {
          throw new Error(
            `[Provisioning] swarm schematic has no member for role_type=${template.roleType}`,
          );
        }
        if (!classificationLink) {
          throw new Error(
            `[Provisioning] classification projection missing link for role_type=${template.roleType}`,
          );
        }
        hospitalityOperationalMode = sm.default_operational_mode;
        hospitalityStructuredControls = {
          swarm_role_contract: {
            schematic_id: schDoc.schematic_id,
            bundle_version: schDoc.version,
            role_type: template.roleType,
            integration_capability_set_ids: sm.integration_capability_set_ids,
            deploy_posture: sm.deploy_posture,
            api_version_lane: sm.api_version_lane,
          },
        };
      }

      const existing = template.roleType ? existingByRole.get(template.roleType) : undefined;
      if (existing) {
        if (industryGroup === 'hospitality_travel' && hospitalityProjection) {
          const existingSc = (existing.structuredControls ?? {}) as StructuredControls;
          const needsClassification =
            !!classificationLink &&
            (!existing.agentTemplateId ||
              !existing.swarmSchematicMemberId ||
              existing.deploymentStatus === 'legacy');
          const needsSwarmContract =
            !!hospitalityStructuredControls && !existingSc.swarm_role_contract?.schematic_id;

          let mergedForUpdate: MergedCognitionContractV1 | undefined;
          if (classificationLink && hospitalityProjection && (needsClassification || needsSwarmContract)) {
            const [tplRow] = await db
              .select()
              .from(agentTemplates)
              .where(eq(agentTemplates.id, classificationLink.agentTemplateId))
              .limit(1);
            mergedForUpdate = buildMergedCognitionContract({
              templateCharacter: tplRow?.characterProfile ?? undefined,
              provenance: {
                agent_template_id: classificationLink.agentTemplateId,
                swarm_schematic_member_id: classificationLink.swarmSchematicMemberId,
                schematic_id: hospitalityProjection.doc.schematic_id,
                schematic_version: hospitalityProjection.doc.version,
              },
              schematicVersion: hospitalityProjection.doc.version,
            });
          }

          if ((needsClassification && classificationLink) || needsSwarmContract) {
            await storage.updateAgent(existing.id, {
              ...(needsClassification && classificationLink
                ? {
                    agentTemplateId: classificationLink.agentTemplateId,
                    swarmSchematicMemberId: classificationLink.swarmSchematicMemberId,
                    primaryActorClass: classificationLink.primaryActorClass,
                    secondaryActorClasses: [...classificationLink.secondaryActorClasses],
                    primaryStageClass: classificationLink.primaryStageClass,
                    secondaryStageClasses: [...classificationLink.secondaryStageClasses],
                    deploymentStatus: 'active_deployable',
                  }
                : {}),
              ...(mergedForUpdate ? { mergedCognitionContract: mergedForUpdate } : {}),
              ...(needsSwarmContract && hospitalityStructuredControls
                ? {
                    structuredControls: {
                      ...existingSc,
                      ...hospitalityStructuredControls,
                    },
                    ...(hospitalityOperationalMode ? { operationalMode: hospitalityOperationalMode } : {}),
                  }
                : {}),
            } as any);
          }
        } else if (!existing.mergedCognitionContract) {
          const mergedIndustry = buildMergedCognitionContract({
            templateCharacter: getArchetypeCharacterProfile(template.roleType),
            provenance: {
              agent_template_id: template.id,
              swarm_schematic_member_id: null,
            },
          });
          await storage.updateAgent(existing.id, {
            mergedCognitionContract: mergedIndustry,
          } as any);
        }
        agentIds.push(existing.id);
        archetypesProvisioned.push(template.roleType);
        agentsSkipped += 1;
        console.log(`[Provisioning] Skipped existing agent: ${template.defaultName} (${template.roleType})`);
        continue;
      }

      const systemPrompt = buildSystemPromptFromTemplate(template);

      let mergedCognitionContract: MergedCognitionContractV1 | undefined;
      if (industryGroup === 'hospitality_travel' && hospitalityProjection && classificationLink) {
        const [tplRow] = await db
          .select()
          .from(agentTemplates)
          .where(eq(agentTemplates.id, classificationLink.agentTemplateId))
          .limit(1);
        mergedCognitionContract = buildMergedCognitionContract({
          templateCharacter: tplRow?.characterProfile ?? undefined,
          provenance: {
            agent_template_id: classificationLink.agentTemplateId,
            swarm_schematic_member_id: classificationLink.swarmSchematicMemberId,
            schematic_id: hospitalityProjection.doc.schematic_id,
            schematic_version: hospitalityProjection.doc.version,
          },
          schematicVersion: hospitalityProjection.doc.version,
        });
      } else {
        mergedCognitionContract = buildMergedCognitionContract({
          templateCharacter: getArchetypeCharacterProfile(template.roleType),
          provenance: {
            agent_template_id: template.id,
            swarm_schematic_member_id: null,
          },
        });
      }

      const agent = await storage.createAgent({
        siteConfigId,
        name: template.defaultName,
        roleType: template.roleType,
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
        ...(hospitalityOperationalMode ? { operationalMode: hospitalityOperationalMode } : {}),
        ...(hospitalityStructuredControls ? { structuredControls: hospitalityStructuredControls } : {}),
        ...(classificationLink
          ? {
              agentTemplateId: classificationLink.agentTemplateId,
              swarmSchematicMemberId: classificationLink.swarmSchematicMemberId,
              primaryActorClass: classificationLink.primaryActorClass,
              secondaryActorClasses: [...classificationLink.secondaryActorClasses],
              primaryStageClass: classificationLink.primaryStageClass,
              secondaryStageClasses: [...classificationLink.secondaryStageClasses],
              deploymentStatus: 'active_deployable',
            }
          : {}),
        ...(mergedCognitionContract ? { mergedCognitionContract } : {}),
      });

      agentIds.push(agent.id);
      archetypesProvisioned.push(template.roleType);
      agentsCreated += 1;
      if (template.roleType) {
        existingByRole.set(template.roleType, agent);
      }

      // ── Create QR route for this agent (destination: /agent/{site-slug}) ───
      if (siteSlug) {
        try {
          const destination = `${appUrl}/agent/${siteSlug}`;
          const route = await storage.createQrRoute({
            destination,
            siteConfigId,
            label: `${template.defaultName} — ${template.roleType.replace(/_/g, ' ')}`,
            isActive: true,
          });
          // Generate the QR code PNG for the route
          await generateQrForRoute(route.id).catch((e: unknown) =>
            console.warn(`[Provisioning] QR PNG generation failed for routeId=${route.id}:`, e)
          );
          console.log(`[Provisioning] QR route created: routeId=${route.id} → ${destination}`);
        } catch (qrErr: unknown) {
          console.warn(`[Provisioning] QR route creation failed for agent ${template.defaultName}:`, qrErr);
        }
      }

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
      const siteRow = await storage.getSiteConfig(siteConfigId);
      const ws = siteRow?.workspaceState ?? 'demo';
      const shouldMarkProvisioned = ws === 'demo' || ws === 'provisioned';
      await storage.updateSiteConfig(siteConfigId, {
        assignedAgentId: primaryAgentId,
        ...(shouldMarkProvisioned ? { workspaceState: 'provisioned' as const } : {}),
      } as any);
      console.log(`[Provisioning] Assigned primary agent (concierge) to siteConfigId=${siteConfigId}`);
    } catch (err: any) {
      console.warn('[Provisioning] Failed to assign primary agent:', err.message);
    }
  }

  return {
    industryGroup,
    agentsCreated,
    agentsSkipped,
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
