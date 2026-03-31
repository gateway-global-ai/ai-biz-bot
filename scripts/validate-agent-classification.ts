/**
 * Validates agent classification policy YAML + swarm manifest limits + hospitality schematic bounds.
 * Write-capable counts derive from integration capability mutation_level / side_effect_level.
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const POLICY_DIR = path.join(ROOT, "registry-yaml/agent-classification-policy");
const TEMPLATES_GLOB = path.join(ROOT, "registry-yaml/agent-templates");
const MANIFEST_PATH = path.join(ROOT, "registry-yaml/swarm-schematics-registry/manifest.v1.yaml");
const SETS_PATH = path.join(ROOT, "registry-yaml/integration-capability-sets.yaml");
const CAPS_PATH = path.join(ROOT, "registry-yaml/integration-capabilities/cloudbeds.v1.yaml");

function readYaml<T>(filePath: string): T {
  return yaml.load(fs.readFileSync(filePath, "utf8")) as T;
}

function listYaml(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => path.join(dir, f));
}

type SwarmLimits = {
  swarm?: { hard_max_agents?: number; recommended_max_agents?: number };
  lists?: {
    max_capability_set_ids_per_agent?: number;
    max_skill_ids_per_agent?: number;
    max_required_probe_ids_per_agent?: number;
    max_write_capable_agents_per_swarm_v1?: number;
  };
  write_capable_mutation_levels?: string[];
  write_capable_side_effect_levels?: string[];
};

type CapRow = {
  capability_id: string;
  mutation_level?: string;
  side_effect_level?: string;
};

type SetRow = {
  set_id: string;
  member_capabilities?: string[];
};

type HospitalityMember = {
  role_type: string;
  integration_capability_set_ids?: string[];
  optional_skill_dispatch_ids?: string[];
  required_proficiency_probe_ids?: string[];
};

type RoleClassEntry = {
  primary_actor_class?: string;
  secondary_actor_classes?: string[];
  primary_stage_class?: string;
  secondary_stage_classes?: string[];
};

type RoleClassDoc = {
  spec?: string;
  schematic_id?: string;
  defaults?: RoleClassEntry;
  roles?: Record<string, RoleClassEntry>;
};

type SchematicManifestEntry = {
  schematic_id?: string;
  yaml_path?: string;
  member_count_expected?: number;
  role_classification_yaml_path?: string;
};

function mergeRoleClassification(defaults: RoleClassEntry, r: RoleClassEntry): {
  primary_actor_class: string;
  secondary_actor_classes: string[];
  primary_stage_class: string;
  secondary_stage_classes: string[];
} {
  return {
    primary_actor_class: r.primary_actor_class ?? defaults.primary_actor_class ?? "",
    secondary_actor_classes: r.secondary_actor_classes ?? defaults.secondary_actor_classes ?? [],
    primary_stage_class: r.primary_stage_class ?? defaults.primary_stage_class ?? "",
    secondary_stage_classes: r.secondary_stage_classes ?? defaults.secondary_stage_classes ?? [],
  };
}

function main(): void {
  const errs: string[] = [];
  const warns: string[] = [];

  const requiredPolicy = [
    "enums.v1.yaml",
    "composition_rules.v1.yaml",
    "restricted_combinations.v1.yaml",
    "swarm_limits.v1.yaml",
    "override_policy.v1.yaml",
  ];
  for (const f of requiredPolicy) {
    const p = path.join(POLICY_DIR, f);
    if (!fs.existsSync(p)) errs.push(`missing policy file: ${f}`);
  }
  if (errs.length) {
    console.error("[validate-agent-classification]", errs.join("\n"));
    process.exit(1);
  }

  const limits = readYaml<SwarmLimits>(path.join(POLICY_DIR, "swarm_limits.v1.yaml"));
  const hardMax = limits.swarm?.hard_max_agents ?? 24;
  const recMax = limits.swarm?.recommended_max_agents ?? 12;
  const maxSets = limits.lists?.max_capability_set_ids_per_agent ?? 8;
  const maxSkills = limits.lists?.max_skill_ids_per_agent ?? 12;
  const maxProbes = limits.lists?.max_required_probe_ids_per_agent ?? 20;
  const maxWriteAgents = limits.lists?.max_write_capable_agents_per_swarm_v1 ?? 4;
  const writeMut = new Set(limits.write_capable_mutation_levels ?? ["write"]);
  const writeSide = new Set(limits.write_capable_side_effect_levels ?? ["financial"]);

  const capsDoc = readYaml<{ capabilities?: CapRow[] }>(CAPS_PATH);
  const capById = new Map<string, CapRow>();
  for (const c of capsDoc.capabilities ?? []) {
    if (c.capability_id) capById.set(c.capability_id, c);
  }

  const setsDoc = readYaml<{ sets?: SetRow[] }>(SETS_PATH);
  const setById = new Map<string, SetRow>();
  for (const s of setsDoc.sets ?? []) {
    if (s.set_id) setById.set(s.set_id, s);
  }

  function setIsWriteCapable(setId: string): boolean {
    const s = setById.get(setId);
    if (!s?.member_capabilities?.length) return false;
    for (const cid of s.member_capabilities) {
      const cap = capById.get(cid);
      if (!cap) continue;
      if (cap.mutation_level && writeMut.has(cap.mutation_level)) return true;
      if (cap.side_effect_level && writeSide.has(cap.side_effect_level)) return true;
    }
    return false;
  }

  const enumsDoc = readYaml<{
    actor_classes?: string[];
    lifecycle_stage_classes?: string[];
    control_classes?: string[];
  }>(path.join(POLICY_DIR, "enums.v1.yaml"));
  const validActors = new Set(enumsDoc.actor_classes ?? []);
  const validStages = new Set([
    ...(enumsDoc.lifecycle_stage_classes ?? []),
    ...(enumsDoc.control_classes ?? []),
  ]);

  const manifest = readYaml<{
    schematics?: SchematicManifestEntry[];
  }>(MANIFEST_PATH);
  const schematics = manifest.schematics ?? [];
  if (!schematics.length) errs.push("swarm-schematics-registry/manifest.v1.yaml: missing schematics[]");

  for (const sch of schematics) {
    const rel = sch.yaml_path;
    if (!rel) {
      errs.push(`schematic ${sch.schematic_id}: missing yaml_path`);
      continue;
    }
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      errs.push(`schematic ${sch.schematic_id}: file not found ${rel}`);
      continue;
    }
    const doc = readYaml<{ members?: HospitalityMember[] }>(abs);
    const members = doc.members ?? [];
    const n = members.length;
    if (sch.member_count_expected != null && n !== sch.member_count_expected) {
      errs.push(
        `schematic ${sch.schematic_id}: member count ${n} !== manifest member_count_expected ${sch.member_count_expected}`,
      );
    }
    if (n > hardMax) {
      errs.push(`schematic ${sch.schematic_id}: ${n} members exceeds hard_max_agents ${hardMax}`);
    }
    if (n > recMax) {
      warns.push(`schematic ${sch.schematic_id}: ${n} members exceeds recommended_max_agents ${recMax}`);
    }

    let writeCapableAgents = 0;
    for (const m of members) {
      const setIds = m.integration_capability_set_ids ?? [];
      if (setIds.length > maxSets) {
        errs.push(`schematic ${sch.schematic_id} role ${m.role_type}: too many capability sets (${setIds.length} > ${maxSets})`);
      }
      const skills = m.optional_skill_dispatch_ids ?? [];
      if (skills.length > maxSkills) {
        errs.push(`schematic ${sch.schematic_id} role ${m.role_type}: too many skill ids (${skills.length} > ${maxSkills})`);
      }
      const probes = m.required_proficiency_probe_ids ?? [];
      if (probes.length > maxProbes) {
        errs.push(`schematic ${sch.schematic_id} role ${m.role_type}: too many probe ids (${probes.length} > ${maxProbes})`);
      }
      const anyWrite = setIds.some((sid) => setIsWriteCapable(sid));
      if (anyWrite) writeCapableAgents += 1;
    }
    if (writeCapableAgents > maxWriteAgents) {
      errs.push(
        `schematic ${sch.schematic_id}: ${writeCapableAgents} write-capable agents exceeds limit ${maxWriteAgents}`,
      );
    }

    const clsRel = sch.role_classification_yaml_path;
    if (clsRel) {
      const clsAbs = path.join(ROOT, clsRel);
      if (!fs.existsSync(clsAbs)) {
        errs.push(`schematic ${sch.schematic_id}: role classification file not found ${clsRel}`);
      } else {
        const clsDoc = readYaml<RoleClassDoc>(clsAbs);
        if (clsDoc.spec !== "swarm_schematic_role_classification_v1") {
          errs.push(
            `schematic ${sch.schematic_id}: role classification spec must be swarm_schematic_role_classification_v1`,
          );
        }
        if (clsDoc.schematic_id !== sch.schematic_id) {
          errs.push(
            `schematic ${sch.schematic_id}: role classification schematic_id ${clsDoc.schematic_id} mismatch`,
          );
        }
        if (!clsDoc.defaults) {
          errs.push(`schematic ${sch.schematic_id}: role classification missing defaults`);
        }
        const memberRoleTypes = new Set(members.map((m) => m.role_type));
        for (const m of members) {
          const row = clsDoc.roles?.[m.role_type];
          if (!row) {
            errs.push(
              `schematic ${sch.schematic_id}: role classification missing explicit roles.${m.role_type}`,
            );
            continue;
          }
          const eff = mergeRoleClassification(clsDoc.defaults ?? {}, row);
          if (!validActors.has(eff.primary_actor_class)) {
            errs.push(
              `schematic ${sch.schematic_id} role ${m.role_type}: invalid primary_actor_class "${eff.primary_actor_class}"`,
            );
          }
          if (eff.secondary_actor_classes.length > 2) {
            errs.push(
              `schematic ${sch.schematic_id} role ${m.role_type}: secondary_actor_classes length ${eff.secondary_actor_classes.length} > 2`,
            );
          }
          for (const a of eff.secondary_actor_classes) {
            if (!validActors.has(a)) {
              errs.push(
                `schematic ${sch.schematic_id} role ${m.role_type}: invalid secondary_actor_class "${a}"`,
              );
            }
          }
          if (!validStages.has(eff.primary_stage_class)) {
            errs.push(
              `schematic ${sch.schematic_id} role ${m.role_type}: invalid primary_stage_class "${eff.primary_stage_class}"`,
            );
          }
          if (eff.secondary_stage_classes.length > 3) {
            errs.push(
              `schematic ${sch.schematic_id} role ${m.role_type}: secondary_stage_classes length ${eff.secondary_stage_classes.length} > 3`,
            );
          }
          for (const s of eff.secondary_stage_classes) {
            if (!validStages.has(s)) {
              errs.push(
                `schematic ${sch.schematic_id} role ${m.role_type}: invalid secondary_stage_class "${s}"`,
              );
            }
          }
        }
        for (const rk of Object.keys(clsDoc.roles ?? {})) {
          if (!memberRoleTypes.has(rk)) {
            warns.push(
              `schematic ${sch.schematic_id}: role classification defines unused role "${rk}" (not in swarm members)`,
            );
          }
        }
      }
    }
  }

  for (const file of listYaml(TEMPLATES_GLOB)) {
    const doc = readYaml<{ templates?: Array<Record<string, unknown>> }>(file);
    const templates = doc.templates ?? [];
    for (const t of templates) {
      const pk = String(t.template_key ?? "?");
      const secA = (t.secondary_actor_classes as string[] | undefined) ?? [];
      const secS = (t.secondary_stage_classes as string[] | undefined) ?? [];
      if (secA.length > 2) errs.push(`template ${pk}: secondary_actor_classes length ${secA.length} > 2`);
      if (secS.length > 3) errs.push(`template ${pk}: secondary_stage_classes length ${secS.length} > 3`);
      const dcap = (t.default_capability_set_ids as string[] | undefined) ?? [];
      const dskills = (t.default_skill_ids as string[] | undefined) ?? [];
      if (dcap.length > maxSets) errs.push(`template ${pk}: default_capability_set_ids too long`);
      if (dskills.length > maxSkills) errs.push(`template ${pk}: default_skill_ids too long`);
    }
  }

  for (const w of warns) console.warn("[validate-agent-classification] WARN:", w);

  if (errs.length) {
    console.error("[validate-agent-classification]\n" + errs.join("\n"));
    process.exit(1);
  }

  console.log("[validate-agent-classification] OK");
}

main();
