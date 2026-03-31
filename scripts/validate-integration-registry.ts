/**
 * Structural validation: integration YAML ↔ TOOL_DECLARATIONS ↔ operationalModes.
 * No DB, no runtime mutation.
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";
import { OPERATIONAL_MODES, type OperationalModeId } from "../server/config/operationalModes.js";
import {
  isValidExpectedSha256,
  verifyFileMatchesExpectedSha256,
} from "./lib/integrationVendorSpecIngest.js";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Must stay aligned with validate-swarm-schematic.ts API_LANES and broker. */
const INTEGRATION_API_VERSION_LANES = new Set([
  "cloudbeds_v1_2",
  "cloudbeds_v1_3",
  /** Discovery-only GraphQL alignment rows — no shipped REST/GraphQL execution. */
  "cloudbeds_gql_discovery_v1",
]);

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
  vendor_id?: string;
  tool_name: string | null;
  required_anchors?: string[];
  credential_anchor_ref?: string;
  required_scope_ids?: string[];
  allowed_version_lanes?: string[];
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
  /** Top-level `vendor_id` on integration-entities bundles — each MUST have integration-vendor-metadata. */
  const entityVendorIds = new Set<string>();
  /** Must match integration-vendor-metadata `reference_openapi_path` for the same vendor_id. */
  const entityOpenapiRefByVendor = new Map<string, string>();
  for (const file of listYamlFiles(entitiesDir)) {
    const doc = readYaml(file) as {
      vendor_id?: string;
      authority?: { openapi_reference?: string };
      entities?: Array<{ canonical_entity_id?: string }>;
    };
    if (!doc?.entities?.length) {
      errs.push(`${path.relative(ROOT, file)}: missing entities[]`);
      continue;
    }
    if (typeof doc.vendor_id === "string" && doc.vendor_id.trim()) {
      const vid = doc.vendor_id.trim();
      entityVendorIds.add(vid);
      const oar = doc.authority?.openapi_reference?.trim();
      if (oar) entityOpenapiRefByVendor.set(vid, oar);
    }
    for (const e of doc.entities) {
      const id = e.canonical_entity_id;
      if (!id) errs.push(`${path.relative(ROOT, file)}: entity missing canonical_entity_id`);
      else if (entityIds.has(id)) errs.push(`duplicate canonical_entity_id across bundles: ${id}`);
      else entityIds.add(id);
    }
  }

  type VendorMetaDoc = {
    spec?: string;
    vendor_id?: string;
    developer_portal_url?: string;
    reference_openapi_path?: string;
    api_version_label?: string;
    spec_ingest?: {
      mode?: string;
      source_url?: string | null;
      checksum_required?: boolean;
      expected_sha256?: string | null;
    };
  };

  const INGEST_MODES = new Set(["manual_promote", "url_fetch", "disabled"]);
  const vendorMetaDir = path.join(ROOT, "registry-yaml/integration-vendor-metadata");
  const vendorMetaByVendor = new Map<string, string>();
  for (const file of listYamlFiles(vendorMetaDir)) {
    const doc = readYaml(file) as VendorMetaDoc;
    const rel = path.relative(ROOT, file);
    if (doc.spec !== "integration_vendor_metadata_v1") {
      errs.push(`${rel}: spec must be integration_vendor_metadata_v1`);
    }
    const vid = typeof doc.vendor_id === "string" ? doc.vendor_id.trim() : "";
    if (!vid) {
      errs.push(`${rel}: missing vendor_id`);
      continue;
    }
    if (vendorMetaByVendor.has(vid)) {
      errs.push(`duplicate integration-vendor-metadata for vendor_id: ${vid}`);
      continue;
    }
    vendorMetaByVendor.set(vid, file);

    const portal = doc.developer_portal_url;
    if (typeof portal !== "string" || !portal.startsWith("https://")) {
      errs.push(`${rel}: developer_portal_url must be an https URL`);
    }
    const openapiPath = doc.reference_openapi_path;
    if (typeof openapiPath !== "string" || !openapiPath.trim()) {
      errs.push(`${rel}: missing reference_openapi_path`);
    } else {
      const trimmed = openapiPath.trim();
      const abs = path.join(ROOT, trimmed);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        errs.push(`${rel}: reference_openapi_path not a file: ${openapiPath}`);
      }
      const fromEntity = entityOpenapiRefByVendor.get(vid);
      if (fromEntity && fromEntity !== trimmed) {
        errs.push(
          `${rel}: reference_openapi_path must match integration-entities authority.openapi_reference for vendor "${vid}" (got ${trimmed}, entity has ${fromEntity})`,
        );
      }
    }
    if (typeof doc.api_version_label !== "string" || !doc.api_version_label.trim()) {
      errs.push(`${rel}: missing api_version_label`);
    }
    const ingest = doc.spec_ingest;
    if (!ingest || typeof ingest !== "object") {
      errs.push(`${rel}: missing spec_ingest`);
    } else {
      if (!ingest.mode || !INGEST_MODES.has(ingest.mode)) {
        errs.push(
          `${rel}: spec_ingest.mode must be one of: ${[...INGEST_MODES].join(", ")}`,
        );
      }
      if (typeof ingest.checksum_required !== "boolean") {
        errs.push(`${rel}: spec_ingest.checksum_required must be a boolean`);
      }
      if (
        ingest.source_url != null &&
        (typeof ingest.source_url !== "string" || (ingest.source_url && !ingest.source_url.startsWith("https://")))
      ) {
        errs.push(`${rel}: spec_ingest.source_url must be null or an https URL`);
      }
      if (ingest.mode === "url_fetch") {
        if (!ingest.source_url?.trim() || !ingest.source_url.startsWith("https://")) {
          errs.push(`${rel}: spec_ingest.mode url_fetch requires non-empty https source_url`);
        }
      }
      const exp = ingest.expected_sha256?.trim();
      if (exp != null && exp !== "") {
        if (!isValidExpectedSha256(exp)) {
          errs.push(`${rel}: spec_ingest.expected_sha256 must be 64 hex chars`);
        }
      }
      if (ingest.checksum_required === true && (!exp || exp === "")) {
        errs.push(`${rel}: spec_ingest.checksum_required true requires expected_sha256`);
      }
      if (exp && isValidExpectedSha256(exp) && typeof openapiPath === "string" && openapiPath.trim()) {
        const absOpenapi = path.join(ROOT, openapiPath.trim());
        if (ingest.mode === "manual_promote" && fs.existsSync(absOpenapi) && fs.statSync(absOpenapi).isFile()) {
          const v = verifyFileMatchesExpectedSha256(absOpenapi, exp);
          if (!v.ok) {
            errs.push(
              `${rel}: reference_openapi_path SHA256 mismatch (run npm run ingest:integration-vendor-specs or update expected_sha256)\n  expected: ${v.expected}\n  actual:   ${v.actual}`,
            );
          }
        }
      }
    }
  }

  for (const v of entityVendorIds) {
    if (!vendorMetaByVendor.has(v)) {
      errs.push(
        `integration-entities declares vendor_id "${v}" but missing registry-yaml/integration-vendor-metadata/<vendor>.yaml`,
      );
    }
  }
  for (const [v, file] of vendorMetaByVendor) {
    if (!entityVendorIds.has(v)) {
      errs.push(
        `${path.relative(ROOT, file)}: vendor_id "${v}" has no matching integration-entities bundle (orphan vendor metadata)`,
      );
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

  const cloudbedsProfilePath = path.join(ROOT, "registry-yaml/integration-auth-profiles/cloudbeds.v1.yaml");
  let cloudbedsScopeCatalogIds = new Set<string>();
  if (fs.existsSync(cloudbedsProfilePath)) {
    const prof = readYaml(cloudbedsProfilePath) as {
      scope_catalog?: Array<{ scope_id?: string }>;
    };
    for (const row of prof.scope_catalog ?? []) {
      if (row.scope_id) cloudbedsScopeCatalogIds.add(row.scope_id);
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

      for (const lane of c.allowed_version_lanes ?? []) {
        if (!INTEGRATION_API_VERSION_LANES.has(lane)) {
          errs.push(
            `capability ${c.capability_id}: unknown allowed_version_lanes entry "${lane}" (expected cloudbeds_v1_2|cloudbeds_v1_3|cloudbeds_gql_discovery_v1)`,
          );
        }
      }

      if (c.vendor_id === "cloudbeds" && cloudbedsScopeCatalogIds.size > 0) {
        for (const sid of c.required_scope_ids ?? []) {
          if (!cloudbedsScopeCatalogIds.has(sid)) {
            errs.push(
              `capability ${c.capability_id}: required_scope_ids references unknown scope_id "${sid}" (not in integration-auth-profiles/cloudbeds.v1.yaml scope_catalog)`,
            );
          }
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
    `[validate-integration-registry] OK (${entityIds.size} entities, ${anchorIds.size} anchors, ${capabilityById.size} capabilities, ${endpointIds.size} endpoints, ${vendorMetaByVendor.size} vendor metadata)`,
  );
}

main();
