/**
 * Governed actor/stage classification for hospitality_cloudbeds swarm roles.
 * @see registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CLASSIFICATION_REL =
  "registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml";

export type HospitalityRoleClassificationEntryV1 = {
  primary_actor_class: string;
  secondary_actor_classes: string[];
  primary_stage_class: string;
  secondary_stage_classes: string[];
};

export type HospitalityCloudbedsRoleClassificationFileV1 = {
  spec: string;
  version: string;
  schematic_id: string;
  defaults: HospitalityRoleClassificationEntryV1;
  roles: Record<string, HospitalityRoleClassificationEntryV1>;
};

export function loadHospitalityCloudbedsRoleClassification(): HospitalityCloudbedsRoleClassificationFileV1 | null {
  const abs = path.join(ROOT, CLASSIFICATION_REL);
  if (!fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, "utf8");
  return yaml.load(raw) as HospitalityCloudbedsRoleClassificationFileV1;
}

/** Maps registry snake_case fields to Drizzle / agents column camelCase. */
export function classificationEntryToAgentFields(entry: HospitalityRoleClassificationEntryV1): {
  primaryActorClass: string;
  secondaryActorClasses: string[];
  primaryStageClass: string;
  secondaryStageClasses: string[];
} {
  return {
    primaryActorClass: entry.primary_actor_class,
    secondaryActorClasses: [...(entry.secondary_actor_classes ?? [])],
    primaryStageClass: entry.primary_stage_class,
    secondaryStageClasses: [...(entry.secondary_stage_classes ?? [])],
  };
}

export function resolveHospitalityRoleClassification(
  doc: HospitalityCloudbedsRoleClassificationFileV1,
  roleType: string,
): {
  primaryActorClass: string;
  secondaryActorClasses: string[];
  primaryStageClass: string;
  secondaryStageClasses: string[];
} {
  const roleEntry = doc.roles?.[roleType];
  const base = doc.defaults;
  const merged: HospitalityRoleClassificationEntryV1 = roleEntry
    ? {
        primary_actor_class: roleEntry.primary_actor_class ?? base.primary_actor_class,
        secondary_actor_classes: roleEntry.secondary_actor_classes ?? base.secondary_actor_classes ?? [],
        primary_stage_class: roleEntry.primary_stage_class ?? base.primary_stage_class,
        secondary_stage_classes: roleEntry.secondary_stage_classes ?? base.secondary_stage_classes ?? [],
      }
    : base;
  return classificationEntryToAgentFields(merged);
}

/** Each schematic member must have an explicit `roles.<role_type>` row (defaults apply only to partial fields). */
export function requireResolvedHospitalityRoleClassification(
  doc: HospitalityCloudbedsRoleClassificationFileV1,
  roleType: string,
): ReturnType<typeof resolveHospitalityRoleClassification> {
  if (doc.roles?.[roleType] === undefined) {
    throw new Error(
      `[hospitality_role_classification] missing explicit roles.${roleType} in hospitality_cloudbeds_role_classification.v1.yaml`,
    );
  }
  return resolveHospitalityRoleClassification(doc, roleType);
}
