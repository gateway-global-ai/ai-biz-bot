/**
 * Structural validation: integration YAML ↔ TOOL_DECLARATIONS ↔ operationalModes.
 * No DB, no runtime mutation.
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";
import { OPERATIONAL_MODES, type OperationalModeId } from "../server/config/operationalModes.js";

const ROOT = path.resolve(import.meta.dirname, "..");

function readYaml(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw);
}

function listYamlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => path.join(dir, f));
}

function extractToolDeclarationKeys(): Set<string> {
  const declPath = path.join(ROOT, "server/config/geminiToolDeclarations.ts");
  const content = fs.readFileSync(declPath, "utf8");
  const keys = new Set<string>();
  const re = /^\s{2}([a-zA-Z0-9_]+):\s*\{\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    keys.add(m[1]);
  }
  if (keys.size < 10) {
    throw new Error(
      `[validate-integration-registry] Suspiciously few TOOL_DECLARATIONS keys (${keys.size}); check regex vs geminiToolDeclarations.ts`,
    );
  }
  return keys;
}

function modeToolMap(): Map<OperationalModeId, Set<string>> {
  const map = new Map<OperationalModeId, Set<string>>();
  for (const mode of OPERATIONAL_MODES) {
    map.set(mode.id, new Set(mode.allowedToolNames));
  }
  return map;
}

type CapRow = {
  capability_id: string;
  tool_name: string | null;
  required_anchors?: string[];
  operational_mode_allowlist?: string[];
  endpoint_flow?: { steps?: Array<{ endpoint_id: string }> };
};

type EndpointRow = { endpoint_id: string };

function main(): void {
  const errs: string[] = [];
  const toolKeys = extractToolDeclarationKeys();
  const modes = modeToolMap();

  const entitiesDir = path.join(ROOT, "registry-yaml/integration-entities");
  const endpointsDir = path.join(ROOT, "registry-yaml/integration-endpoints");
  const capsDir = path.join(ROOT, "registry-yaml/integration-capabilities");
  const adaptersDir = path.join(ROOT, "registry-yaml/integration-adapters");
  const setsPath = path.join(ROOT, "registry-yaml/integration-capability-sets.yaml");

  const entityIds = new Set<string>();
  for (const file of listYamlFiles(entitiesDir)) {
    const doc = readYaml(file) as { entities?: Array<{ canonical_entity_id?: string }> };
    if (!doc?.entities?.length) {
      errs.push(`${path.relative(ROOT, file)}: missing entities[]`);
      continue;
    }
    for (const e of doc.entities) {
      const id = e.canonical_entity_id;
      if (!id) errs.push(`${path.relative(ROOT, file)}: entity missing canonical_entity_id`);
      else if (entityIds.has(id)) errs.push(`duplicate canonical_entity_id across bundles: ${id}`);
      else entityIds.add(id);
    }
  }

  const endpointIds = new Set<string>();
  const anchorIds = new Set<string>();
  for (const file of listYamlFiles(endpointsDir)) {
    const doc = readYaml(file) as {
      endpoints?: EndpointRow[];
      anchors?: Array<{ anchor_id?: string; canonical_entity_id?: string }>;
    };
    if (!doc?.endpoints?.length) {
      errs.push(`${path.relative(ROOT, file)}: missing endpoints[]`);
      continue;
    }
    for (const a of doc.anchors || []) {
      if (a.anchor_id) anchorIds.add(a.anchor_id);
      if (a.canonical_entity_id && !entityIds.has(a.canonical_entity_id)) {
        errs.push(
          `${path.relative(ROOT, file)}: anchor ${a.anchor_id} references unknown canonical_entity_id ${a.canonical_entity_id}`,
        );
      }
    }
    for (const e of doc.endpoints) {
      if (!e.endpoint_id) errs.push(`${path.relative(ROOT, file)}: endpoint missing endpoint_id`);
      else endpointIds.add(e.endpoint_id);
    }
  }

  const capabilityById = new Map<string, CapRow>();
  for (const file of listYamlFiles(capsDir)) {
    const doc = readYaml(file) as { capabilities?: CapRow[] };
    if (!doc?.capabilities?.length) {
      errs.push(`${path.relative(ROOT, file)}: missing capabilities[]`);
      continue;
    }
    for (const c of doc.capabilities) {
      if (!c.capability_id) {
        errs.push(`${path.relative(ROOT, file)}: capability missing capability_id`);
        continue;
      }
      if (capabilityById.has(c.capability_id)) {
        errs.push(`duplicate capability_id: ${c.capability_id}`);
      }
      capabilityById.set(c.capability_id, c);

      if (c.tool_name != null && c.tool_name !== "") {
        if (!toolKeys.has(c.tool_name)) {
          errs.push(
            `capability ${c.capability_id}: tool_name "${c.tool_name}" not found in TOOL_DECLARATIONS`,
          );
        }
        const allow = c.operational_mode_allowlist;
        if (allow?.length) {
          for (const modeId of allow) {
            const allowed = modes.get(modeId as OperationalModeId);
            if (!allowed) {
              errs.push(
                `capability ${c.capability_id}: unknown operational mode "${modeId}" in operational_mode_allowlist`,
              );
              continue;
            }
            if (!allowed.has(c.tool_name)) {
              errs.push(
                `capability ${c.capability_id}: tool "${c.tool_name}" not in allowedToolNames for mode ${modeId}`,
              );
            }
          }
        }
      }

      const steps = c.endpoint_flow?.steps;
      if (steps?.length) {
        for (const s of steps) {
          if (!endpointIds.has(s.endpoint_id)) {
            errs.push(
              `capability ${c.capability_id}: endpoint_id "${s.endpoint_id}" not found in integration-endpoints bundles`,
            );
          }
        }
      }

      for (const aid of c.required_anchors || []) {
        if (!anchorIds.has(aid)) {
          errs.push(
            `capability ${c.capability_id}: required_anchors references unknown anchor_id "${aid}"`,
          );
        }
      }
    }
  }

  for (const file of listYamlFiles(adaptersDir)) {
    const doc = readYaml(file) as {
      capabilities_bound?: Array<{ capability_id: string }>;
    };
    const bound = doc?.capabilities_bound;
    if (!bound?.length) {
      errs.push(`${path.relative(ROOT, file)}: missing capabilities_bound[]`);
      continue;
    }
    for (const b of bound) {
      if (!capabilityById.has(b.capability_id)) {
        errs.push(
          `adapter ${path.relative(ROOT, file)}: unknown capability_id "${b.capability_id}"`,
        );
      }
    }
  }

  if (fs.existsSync(setsPath)) {
    const setsDoc = readYaml(setsPath) as {
      sets?: Array<{
        set_id: string;
        exposure_type?: string;
        requires_tool_resolution?: boolean;
        member_capabilities: string[];
        resolved_tool_names: string[];
        requires_modes_superset?: string[];
      }>;
    };
    if (!setsDoc?.sets?.length) {
      errs.push("integration-capability-sets.yaml: missing sets[]");
    } else {
      for (const s of setsDoc.sets) {
        const resolved = new Set<string>();
        for (const capId of s.member_capabilities || []) {
          if (!capabilityById.has(capId)) {
            errs.push(`set ${s.set_id}: unknown capability_id "${capId}"`);
            continue;
          }
          const cap = capabilityById.get(capId)!;
          if (cap.tool_name) resolved.add(cap.tool_name);
        }
        const expected = [...resolved].sort();
        const declared = [...(s.resolved_tool_names || [])].sort();
        if (JSON.stringify(expected) !== JSON.stringify(declared)) {
          errs.push(
            `set ${s.set_id}: resolved_tool_names mismatch.\n  expected: ${JSON.stringify(expected)}\n  declared: ${JSON.stringify(declared)}`,
          );
        }
        for (const t of s.resolved_tool_names || []) {
          if (t && !toolKeys.has(t)) {
            errs.push(`set ${s.set_id}: resolved tool "${t}" not in TOOL_DECLARATIONS`);
          }
        }

        // Set → capability: every resolved tool must be the tool_name of at least one member capability row
        // (closes chain: set → integration-capabilities → TOOL_DECLARATIONS → operationalModes)
        for (const tool of s.resolved_tool_names || []) {
          if (!tool) continue;
          const traced = (s.member_capabilities || []).some((capId) => {
            const cap = capabilityById.get(capId);
            return cap?.tool_name === tool;
          });
          if (!traced) {
            errs.push(
              `set ${s.set_id}: resolved_tool_name "${tool}" is not traceable to any capability in member_capabilities (must match tool_name on a row under registry-yaml/integration-capabilities/)`,
            );
          }
        }

        const exp = s.exposure_type;
        if (exp !== undefined && exp !== "model_facing" && exp !== "non_model_facing") {
          errs.push(
            `set ${s.set_id}: exposure_type must be model_facing or non_model_facing, got ${JSON.stringify(exp)}`,
          );
        }

        const tools = (s.resolved_tool_names || []).filter(Boolean);
        const supersetModes = s.requires_modes_superset;
        const declarativeOnly =
          exp === "non_model_facing" || s.requires_tool_resolution === false;

        if (tools.length > 0) {
          if (declarativeOnly) {
            errs.push(
              `set ${s.set_id}: cannot use exposure_type: non_model_facing or requires_tool_resolution: false when resolved_tool_names is non-empty (model-facing set)`,
            );
          }
          if (!Array.isArray(supersetModes) || supersetModes.length === 0) {
            errs.push(
              `set ${s.set_id}: requires_modes_superset MUST be a non-empty array when resolved_tool_names is non-empty (INTEGRATION_GRAPH_DISCIPLINE D3)`,
            );
          } else {
            for (const modeId of supersetModes) {
              const allowed = modes.get(modeId as OperationalModeId);
              if (!allowed) {
                errs.push(
                  `set ${s.set_id}: requires_modes_superset references unknown mode "${modeId}"`,
                );
                continue;
              }
              for (const tool of tools) {
                if (!allowed.has(tool)) {
                  errs.push(
                    `set ${s.set_id}: mode "${modeId}" must include all resolved tools; missing "${tool}" (modes drift / set misconfiguration)`,
                  );
                }
              }
            }
          }
        } else {
          if (!declarativeOnly) {
            errs.push(
              `set ${s.set_id}: empty resolved_tool_names requires exposure_type: non_model_facing OR requires_tool_resolution: false (otherwise wiring is likely broken)`,
            );
          }
          if (Array.isArray(supersetModes) && supersetModes.length > 0) {
            errs.push(
              `set ${s.set_id}: declarative/non-tool sets MUST NOT declare requires_modes_superset (meaningless; validator follows resolved_tool_names only)`,
            );
          }
        }
      }
    }
  } else {
    errs.push("integration-capability-sets.yaml not found");
  }

  if (errs.length) {
    console.error("[validate-integration-registry] FAILED:\n- " + errs.join("\n- "));
    process.exit(1);
  }
  console.log(
    `[validate-integration-registry] OK (${entityIds.size} entities, ${anchorIds.size} anchors, ${capabilityById.size} capabilities, ${endpointIds.size} endpoints)`,
  );
}

main();
