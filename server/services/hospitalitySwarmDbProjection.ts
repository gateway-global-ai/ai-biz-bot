/**
 * Phase 4 (minimal): project hospitality_cloudbeds YAML into agent_templates,
 * swarm_schematics, and swarm_schematic_members — idempotent upserts.
 * Used by agentProvisioning to link new agents to classification rows.
 */
import { db } from "../db.js";
import {
  agentTemplates,
  swarmSchematics,
  swarmSchematicMembers,
} from "@shared/schema";
import { loadHospitalityCloudbedsSchematic } from "../config/loadHospitalitySwarmSchematic.js";
import type { HospitalityCloudbedsSchematicFileV1, HospitalitySwarmMemberV1 } from "../config/loadHospitalitySwarmSchematic.js";
import {
  loadHospitalityCloudbedsRoleClassification,
  requireResolvedHospitalityRoleClassification,
} from "../config/loadHospitalityRoleClassification.js";
import { getHospitalityCharacterDefault } from "../config/hospitalityCharacterDefaults.js";

export type HospitalityProvisionLink = {
  agentTemplateId: string;
  swarmSchematicMemberId: string;
  primaryActorClass: string;
  secondaryActorClasses: string[];
  primaryStageClass: string;
  secondaryStageClasses: string[];
};

function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function memberSkillIds(m: HospitalitySwarmMemberV1): string[] {
  return [...m.resolved_tool_names, ...m.optional_skill_dispatch_ids];
}

/**
 * Upserts schematic + templates + members from hospitality_cloudbeds.v1.yaml.
 * Safe to call on every hospitality provision.
 */
export async function ensureHospitalityCloudbedsDbProjection(): Promise<{
  doc: HospitalityCloudbedsSchematicFileV1;
  linkByRoleType: Map<string, HospitalityProvisionLink>;
}> {
  const doc = loadHospitalityCloudbedsSchematic();
  if (!doc) {
    throw new Error(
      "[hospitalitySwarmDbProjection] Missing registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml",
    );
  }

  const classificationDoc = loadHospitalityCloudbedsRoleClassification();
  if (!classificationDoc) {
    throw new Error(
      "[hospitalitySwarmDbProjection] Missing registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml",
    );
  }
  if (classificationDoc.schematic_id !== doc.schematic_id) {
    throw new Error(
      `[hospitalitySwarmDbProjection] role classification schematic_id=${classificationDoc.schematic_id} !== swarm schematic_id=${doc.schematic_id}`,
    );
  }

  const now = new Date();
  const schematicKey = doc.schematic_id;
  const memberCount = doc.members?.length ?? 0;

  const [schematic] = await db
    .insert(swarmSchematics)
    .values({
      schematicKey,
      name: `Hospitality × Cloudbeds (v${doc.version})`,
      industryGroup: doc.industry_group,
      minAgents: 1,
      defaultAgents: memberCount || 6,
      maxAgents: 12,
      hardMaxAgents: 24,
      status: "published",
    })
    .onConflictDoUpdate({
      target: swarmSchematics.schematicKey,
      set: {
        updatedAt: now,
        name: `Hospitality × Cloudbeds (v${doc.version})`,
        industryGroup: doc.industry_group,
        defaultAgents: memberCount || 6,
        status: "published",
      },
    })
    .returning();

  if (!schematic) {
    throw new Error("[hospitalitySwarmDbProjection] Failed to upsert swarm_schematics row");
  }

  const linkByRoleType = new Map<string, HospitalityProvisionLink>();

  for (let i = 0; i < doc.members.length; i++) {
    const m = doc.members[i];
    const cls = requireResolvedHospitalityRoleClassification(classificationDoc, m.role_type);
    const templateKey = `${schematicKey}:${m.role_type}`;
    const skillIds = memberSkillIds(m);
    const display = humanizeRole(m.role_type);

    const characterProfile = getHospitalityCharacterDefault(m.role_type);

    const [tpl] = await db
      .insert(agentTemplates)
      .values({
        templateKey,
        name: `Hospitality · ${display}`,
        primaryActorClass: cls.primaryActorClass,
        secondaryActorClasses: cls.secondaryActorClasses,
        primaryStageClass: cls.primaryStageClass,
        secondaryStageClasses: cls.secondaryStageClasses,
        defaultOperationalMode: m.default_operational_mode,
        defaultCapabilitySetIds: m.integration_capability_set_ids,
        defaultSkillIds: skillIds,
        characterProfile,
        status: "published",
      })
      .onConflictDoUpdate({
        target: agentTemplates.templateKey,
        set: {
          updatedAt: now,
          name: `Hospitality · ${display}`,
          primaryActorClass: cls.primaryActorClass,
          secondaryActorClasses: cls.secondaryActorClasses,
          primaryStageClass: cls.primaryStageClass,
          secondaryStageClasses: cls.secondaryStageClasses,
          defaultOperationalMode: m.default_operational_mode,
          defaultCapabilitySetIds: m.integration_capability_set_ids,
          defaultSkillIds: skillIds,
          characterProfile,
          status: "published",
        },
      })
      .returning();

    if (!tpl) {
      throw new Error(`[hospitalitySwarmDbProjection] Failed to upsert agent_template ${templateKey}`);
    }

    const [mem] = await db
      .insert(swarmSchematicMembers)
      .values({
        swarmSchematicId: schematic.id,
        roleKey: m.role_type,
        name: display,
        agentTemplateId: tpl.id,
        primaryActorClass: cls.primaryActorClass,
        secondaryActorClasses: cls.secondaryActorClasses,
        primaryStageClass: cls.primaryStageClass,
        secondaryStageClasses: cls.secondaryStageClasses,
        defaultOperationalMode: m.default_operational_mode,
        capabilitySetIds: m.integration_capability_set_ids,
        skillIds,
        requiredProbeIds: m.required_proficiency_probe_ids,
        deployPosture: m.deploy_posture,
        positionIndex: i,
      })
      .onConflictDoUpdate({
        target: [swarmSchematicMembers.swarmSchematicId, swarmSchematicMembers.roleKey],
        set: {
          updatedAt: now,
          name: display,
          agentTemplateId: tpl.id,
          primaryActorClass: cls.primaryActorClass,
          secondaryActorClasses: cls.secondaryActorClasses,
          primaryStageClass: cls.primaryStageClass,
          secondaryStageClasses: cls.secondaryStageClasses,
          defaultOperationalMode: m.default_operational_mode,
          capabilitySetIds: m.integration_capability_set_ids,
          skillIds,
          requiredProbeIds: m.required_proficiency_probe_ids,
          deployPosture: m.deploy_posture,
          positionIndex: i,
        },
      })
      .returning();

    if (!mem) {
      throw new Error(
        `[hospitalitySwarmDbProjection] Failed to upsert swarm_schematic_member ${m.role_type}`,
      );
    }

    linkByRoleType.set(m.role_type, {
      agentTemplateId: tpl.id,
      swarmSchematicMemberId: mem.id,
      primaryActorClass: cls.primaryActorClass,
      secondaryActorClasses: cls.secondaryActorClasses,
      primaryStageClass: cls.primaryStageClass,
      secondaryStageClasses: cls.secondaryStageClasses,
    });
  }

  return { doc, linkByRoleType };
}
