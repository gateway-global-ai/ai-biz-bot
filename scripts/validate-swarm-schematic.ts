/**
 * Cross-validates swarm schematic ↔ integration capability sets ↔ TOOL_DECLARATIONS ↔ operationalModes ↔ skill dispatch ↔ proficiency probes.
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";
import { OPERATIONAL_MODES, type OperationalModeId } from "../server/config/operationalModes.js";

const ROOT = path.resolve(import.meta.dirname, "..");

function readYaml(p: string): unknown {
  return yaml.load(fs.readFileSync(p, "utf8"));
}

function toolDeclarationKeys(): Set<string> {
  const declPath = path.join(ROOT, "server/config/geminiToolDeclarations.ts");
  const content = fs.readFileSync(declPath, "utf8");
  const keys = new Set<string>();
  const re = /^\s{2}([a-zA-Z0-9_]+):\s*\{\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) keys.add(m[1]);
  if (keys.size < 10) throw new Error("TOOL_DECLARATIONS parse failed");
  return keys;
}

function modeMap(): Map<OperationalModeId, Set<string>> {
  const m = new Map<OperationalModeId, Set<string>>();
  for (const def of OPERATIONAL_MODES) m.set(def.id, new Set(def.allowedToolNames));
  return m;
}

type IntSet = {
  set_id: string;
  resolved_tool_names: string[];
};

type ProbeFile = { probes?: Array<{ id: string }> };

const DEPLOY_POSTURES = new Set(["draft", "review_required", "publish_blocked", "deployable"]);
const API_LANES = new Set(["cloudbeds_v1_3", "cloudbeds_v1_2"]);
const STORAGE_LITERAL = "structured_controls.swarm_role_contract";

function main(): void {
  const errs: string[] = [];
  const tools = toolDeclarationKeys();
  const modes = modeMap();

  const setsPath = path.join(ROOT, "registry-yaml/integration-capability-sets.yaml");
  const setsDoc = readYaml(setsPath) as { sets?: IntSet[] };
  const setTools = new Map<string, string[]>();
  for (const s of setsDoc.sets || []) {
    if (s.set_id) setTools.set(s.set_id, [...(s.resolved_tool_names || [])].filter(Boolean));
  }

  const skillPath = path.join(ROOT, "registry-yaml/skill-dispatch-registry.yaml");
  const skillDoc = readYaml(skillPath) as { skills?: Array<{ skillId?: string }> };
  const skillIds = new Set<string>();
  for (const sk of skillDoc.skills || []) {
    if (sk.skillId) skillIds.add(sk.skillId);
  }

  const probePath = path.join(ROOT, "registry-yaml/swarm-schematics/hospitality_proficiency_probes.v1.yaml");
  const probeDoc = readYaml(probePath) as ProbeFile;
  const probeIds = new Set((probeDoc.probes || []).map((p) => p.id).filter(Boolean));

  const schPath = path.join(ROOT, "registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml");
  if (!fs.existsSync(schPath)) {
    console.error("[validate-swarm-schematic] MISSING " + schPath);
    process.exit(1);
  }
  const sch = readYaml(schPath) as {
    spec?: string;
    members?: Array<{
      role_type: string;
      default_operational_mode: string;
      integration_capability_set_ids: string[];
      resolved_tool_names: string[];
      optional_skill_dispatch_ids: string[];
      required_proficiency_probe_ids: string[];
      api_version_lane: string;
      deploy_posture: string;
      storage_target: string;
    }>;
  };

  if (sch.spec !== "hospitality_swarm_schematic_v1") {
    errs.push(`schematic spec must be hospitality_swarm_schematic_v1`);
  }

  const seenRoles = new Set<string>();
  for (const mrow of sch.members || []) {
    const label = mrow.role_type || "?";
    if (!mrow.role_type) {
      errs.push("member missing role_type");
      continue;
    }
    if (seenRoles.has(mrow.role_type)) errs.push(`duplicate role_type ${mrow.role_type}`);
    seenRoles.add(mrow.role_type);

    if (!DEPLOY_POSTURES.has(mrow.deploy_posture)) {
      errs.push(`member ${label}: invalid deploy_posture ${JSON.stringify(mrow.deploy_posture)}`);
    }
    if (!API_LANES.has(mrow.api_version_lane)) {
      errs.push(`member ${label}: invalid api_version_lane ${JSON.stringify(mrow.api_version_lane)}`);
    }
    if (mrow.storage_target !== STORAGE_LITERAL) {
      errs.push(
        `member ${label}: storage_target must be "${STORAGE_LITERAL}"`,
      );
    }

    const mode = modes.get(mrow.default_operational_mode as OperationalModeId);
    if (!mode) {
      errs.push(`member ${label}: unknown default_operational_mode ${mrow.default_operational_mode}`);
    }

    const union = new Set<string>();
    for (const sid of mrow.integration_capability_set_ids || []) {
      const rt = setTools.get(sid);
      if (!rt) {
        errs.push(`member ${label}: unknown integration_capability_set_id "${sid}"`);
        continue;
      }
      for (const t of rt) union.add(t);
    }
    const expected = [...union].sort();
    const declared = [...(mrow.resolved_tool_names || [])].sort();
    if (JSON.stringify(expected) !== JSON.stringify(declared)) {
      errs.push(
        `member ${label}: resolved_tool_names must equal union of integration sets.\n  expected ${JSON.stringify(expected)}\n  declared ${JSON.stringify(declared)}`,
      );
    }

    for (const t of mrow.resolved_tool_names || []) {
      if (!t) continue;
      if (!tools.has(t)) errs.push(`member ${label}: tool "${t}" not in TOOL_DECLARATIONS`);
      if (mode && !mode.has(t)) {
        errs.push(
          `member ${label}: tool "${t}" not allowed in default_operational_mode ${mrow.default_operational_mode}`,
        );
      }
    }

    for (const sk of mrow.optional_skill_dispatch_ids || []) {
      if (sk && !skillIds.has(sk)) {
        errs.push(`member ${label}: optional_skill_dispatch_id "${sk}" not in skill-dispatch-registry.yaml`);
      }
    }

    for (const pid of mrow.required_proficiency_probe_ids || []) {
      if (pid && !probeIds.has(pid)) {
        errs.push(`member ${label}: required_proficiency_probe_id "${pid}" not in hospitality_proficiency_probes.v1.yaml`);
      }
    }
  }

  if (errs.length) {
    console.error("[validate-swarm-schematic] FAILED:\n- " + errs.join("\n- "));
    process.exit(1);
  }
  console.log(`[validate-swarm-schematic] OK (${seenRoles.size} roles)`);
}

main();
