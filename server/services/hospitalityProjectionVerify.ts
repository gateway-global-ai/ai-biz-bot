/**
 * Deep read-only verification: hospitality Phase 4 projection + agents.* vs governed YAML.
 * Used by scripts/verify-hospitality-projection.ts and onboarding E2E tests.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "../db.js";
import {
  agents,
  siteConfigs,
  swarmSchematics,
  agentTemplates,
  swarmSchematicMembers,
} from "@shared/schema";
import {
  loadHospitalityCloudbedsRoleClassification,
  requireResolvedHospitalityRoleClassification,
} from "../config/loadHospitalityRoleClassification.js";

export const HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY = "hospitality_cloudbeds";

export const HOSPITALITY_SWARM_EXPECTED_ROLES = [
  "concierge",
  "booking_coordinator",
  "lead_qualifier",
  "retention_empath",
  "billing_analyst",
  "gatekeeper",
] as const;

const EXPECTED_TEMPLATE_KEYS = HOSPITALITY_SWARM_EXPECTED_ROLES.map(
  (r) => `${HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY}:${r}`,
);

function sameSortedStrings(a: string[] | null | undefined, b: string[]): boolean {
  const aa = [...(Array.isArray(a) ? a : [])].map(String).sort();
  const bb = [...b].map(String).sort();
  return aa.length === bb.length && aa.every((x, i) => x === bb[i]);
}

function classificationMatches(
  label: string,
  got: {
    primaryActorClass: string | null;
    secondaryActorClasses: string[] | unknown;
    primaryStageClass: string | null;
    secondaryStageClasses: string[] | unknown;
  },
  exp: {
    primaryActorClass: string;
    secondaryActorClasses: string[];
    primaryStageClass: string;
    secondaryStageClasses: string[];
  },
  errs: string[],
): void {
  if (got.primaryActorClass !== exp.primaryActorClass) {
    errs.push(`${label}: primaryActorClass "${got.primaryActorClass}" !== YAML "${exp.primaryActorClass}"`);
  }
  if (got.primaryStageClass !== exp.primaryStageClass) {
    errs.push(`${label}: primaryStageClass "${got.primaryStageClass}" !== YAML "${exp.primaryStageClass}"`);
  }
  const gSecA = Array.isArray(got.secondaryActorClasses) ? got.secondaryActorClasses : [];
  const gSecS = Array.isArray(got.secondaryStageClasses) ? got.secondaryStageClasses : [];
  if (!sameSortedStrings(gSecA as string[], exp.secondaryActorClasses)) {
    errs.push(
      `${label}: secondaryActorClasses ${JSON.stringify(got.secondaryActorClasses)} !== YAML ${JSON.stringify(exp.secondaryActorClasses)}`,
    );
  }
  if (!sameSortedStrings(gSecS as string[], exp.secondaryStageClasses)) {
    errs.push(
      `${label}: secondaryStageClasses ${JSON.stringify(got.secondaryStageClasses)} !== YAML ${JSON.stringify(exp.secondaryStageClasses)}`,
    );
  }
}

export type HospitalityProjectionVerifyResult =
  | { ok: true; summary: string; yamlVersion: string | undefined }
  | { ok: false; errors: string[] };

/**
 * Full hospitality_cloudbeds projection + roster checks for one site.
 */
export async function verifyHospitalityProjectionDeep(siteConfigId: string): Promise<HospitalityProjectionVerifyResult> {
  const errs: string[] = [];
  const clsDoc = loadHospitalityCloudbedsRoleClassification();
  if (!clsDoc) {
    errs.push("missing hospitality_cloudbeds_role_classification.v1.yaml (cannot verify actor/stage authority)");
  }

  const [site] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId)).limit(1);
  if (!site) {
    errs.push(`site_configs id=${siteConfigId} not found`);
  }

  const schRows = await db
    .select()
    .from(swarmSchematics)
    .where(eq(swarmSchematics.schematicKey, HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY));
  if (schRows.length !== 1) {
    errs.push(
      `expected exactly 1 swarm_schematics row for schematic_key=${HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY}, found ${schRows.length}`,
    );
  }
  const sch = schRows[0];

  const templateRows = await db
    .select()
    .from(agentTemplates)
    .where(inArray(agentTemplates.templateKey, [...EXPECTED_TEMPLATE_KEYS]));
  if (templateRows.length !== HOSPITALITY_SWARM_EXPECTED_ROLES.length) {
    errs.push(
      `expected ${HOSPITALITY_SWARM_EXPECTED_ROLES.length} agent_templates rows for hospitality_cloudbeds:* keys, found ${templateRows.length}`,
    );
  }

  let memberRows: (typeof swarmSchematicMembers.$inferSelect)[] = [];
  if (sch) {
    memberRows = await db
      .select()
      .from(swarmSchematicMembers)
      .where(eq(swarmSchematicMembers.swarmSchematicId, sch.id));
    if (memberRows.length !== HOSPITALITY_SWARM_EXPECTED_ROLES.length) {
      errs.push(
        `expected ${HOSPITALITY_SWARM_EXPECTED_ROLES.length} swarm_schematic_members for schematic, found ${memberRows.length}`,
      );
    }
  }

  const roster = site
    ? await db.select().from(agents).where(eq(agents.siteConfigId, siteConfigId))
    : [];
  const byRole = new Map<string, (typeof agents.$inferSelect)[]>();
  for (const a of roster) {
    const rt = a.roleType ?? "";
    if (!rt) continue;
    const list = byRole.get(rt) ?? [];
    list.push(a);
    byRole.set(rt, list);
  }

  if (site) {
    for (const role of HOSPITALITY_SWARM_EXPECTED_ROLES) {
      const list = byRole.get(role) ?? [];
      if (list.length !== 1) {
        errs.push(`role ${role}: expected exactly 1 agent for site, found ${list.length}`);
      }
    }
  }

  const roleRosterOk =
    site &&
    HOSPITALITY_SWARM_EXPECTED_ROLES.every((role) => (byRole.get(role) ?? []).length === 1);

  if (clsDoc && sch && roleRosterOk) {
    for (const role of HOSPITALITY_SWARM_EXPECTED_ROLES) {
      const list = byRole.get(role);
      const a = list?.[0];
      if (!a) continue;

      let expected: ReturnType<typeof requireResolvedHospitalityRoleClassification>;
      try {
        expected = requireResolvedHospitalityRoleClassification(clsDoc, role);
      } catch (e) {
        errs.push(`YAML resolve failed for ${role}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      if (!a.agentTemplateId) {
        errs.push(`agent ${a.id} (${role}): agent_template_id is null`);
      }
      if (!a.swarmSchematicMemberId) {
        errs.push(`agent ${a.id} (${role}): swarm_schematic_member_id is null`);
      }
      if (a.deploymentStatus !== "active_deployable") {
        errs.push(
          `agent ${a.id} (${role}): deployment_status="${a.deploymentStatus}" (expected active_deployable)`,
        );
      }

      classificationMatches(
        `agent ${a.id} (${role})`,
        {
          primaryActorClass: a.primaryActorClass ?? null,
          secondaryActorClasses: a.secondaryActorClasses as string[],
          primaryStageClass: a.primaryStageClass ?? null,
          secondaryStageClasses: a.secondaryStageClasses as string[],
        },
        expected,
        errs,
      );

      const sc = a.structuredControls as { swarm_role_contract?: { schematic_id?: string } } | null;
      if (sc?.swarm_role_contract?.schematic_id !== HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY) {
        errs.push(
          `agent ${a.id} (${role}): swarm_role_contract.schematic_id expected "${HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY}", got ${JSON.stringify(sc?.swarm_role_contract?.schematic_id)}`,
        );
      }

      if (a.agentTemplateId) {
        const [tpl] = await db
          .select()
          .from(agentTemplates)
          .where(eq(agentTemplates.id, a.agentTemplateId))
          .limit(1);
        if (!tpl) {
          errs.push(`agent ${a.id}: agent_templates row missing for id=${a.agentTemplateId}`);
        } else {
          const wantKey = `${HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY}:${role}`;
          if (tpl.templateKey !== wantKey) {
            errs.push(`agent ${a.id}: template.templateKey "${tpl.templateKey}" (expected ${wantKey})`);
          }
          classificationMatches(`template ${tpl.templateKey}`, tpl, expected, errs);
        }
      }

      if (a.swarmSchematicMemberId && sch) {
        const [mem] = await db
          .select()
          .from(swarmSchematicMembers)
          .where(eq(swarmSchematicMembers.id, a.swarmSchematicMemberId))
          .limit(1);
        if (!mem) {
          errs.push(`agent ${a.id}: swarm_schematic_members row missing for id=${a.swarmSchematicMemberId}`);
        } else {
          if (mem.swarmSchematicId !== sch.id) {
            errs.push(`agent ${a.id}: member.swarmSchematicId does not match hospitality schematic`);
          }
          if (mem.roleKey !== role) {
            errs.push(`agent ${a.id}: member.roleKey "${mem.roleKey}" (expected ${role})`);
          }
          if (a.agentTemplateId && mem.agentTemplateId !== a.agentTemplateId) {
            errs.push(`agent ${a.id}: member.agentTemplateId !== agent.agentTemplateId`);
          }
          classificationMatches(`member ${mem.roleKey}`, mem, expected, errs);
        }
      }
    }
  }

  if (sch) {
    for (const role of HOSPITALITY_SWARM_EXPECTED_ROLES) {
      const m = memberRows.find((r) => r.roleKey === role);
      if (!m) {
        errs.push(`swarm_schematic_members missing role_key=${role}`);
      }
    }
  }

  if (errs.length) {
    return { ok: false, errors: errs };
  }

  const schematicIdShort = sch?.id ? `${sch.id.slice(0, 8)}…` : "?";
  const summary =
    `[verify-hospitality-projection] OK site=${siteConfigId} roles=${HOSPITALITY_SWARM_EXPECTED_ROLES.length} ` +
    `schematic=${HOSPITALITY_CLOUDBEDS_SCHEMATIC_KEY} id=${schematicIdShort} templates=${templateRows.length} members=${memberRows.length} ` +
    `yaml_version=${clsDoc?.version ?? "?"}`;

  return { ok: true, summary, yamlVersion: clsDoc?.version };
}
