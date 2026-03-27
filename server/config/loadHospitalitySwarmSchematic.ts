/**
 * Load hospitality × Cloudbeds swarm schematic (governed YAML).
 * Used by agentProvisioning for hospitality_travel.
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SCHEMATIC_REL = "registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml";

export type HospitalitySwarmMemberV1 = {
  role_type: string;
  default_operational_mode: string;
  integration_capability_set_ids: string[];
  resolved_tool_names: string[];
  optional_skill_dispatch_ids: string[];
  knowledge_claim_classes: string[];
  required_proficiency_probe_ids: string[];
  api_version_lane: string;
  deploy_posture: string;
  storage_target: string;
};

export type HospitalityCloudbedsSchematicFileV1 = {
  spec: string;
  version: string;
  schematic_id: string;
  industry_group: string;
  members: HospitalitySwarmMemberV1[];
};

export function loadHospitalityCloudbedsSchematic(): HospitalityCloudbedsSchematicFileV1 | null {
  const abs = path.join(ROOT, SCHEMATIC_REL);
  if (!fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, "utf8");
  return yaml.load(raw) as HospitalityCloudbedsSchematicFileV1;
}

export function getHospitalitySchematicMember(
  doc: HospitalityCloudbedsSchematicFileV1,
  roleType: string,
): HospitalitySwarmMemberV1 | undefined {
  return doc.members?.find((m) => m.role_type === roleType);
}
