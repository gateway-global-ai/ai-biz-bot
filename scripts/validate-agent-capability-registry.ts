/**
 * Structural validation only for registry-yaml/agent-capabilities/*.yaml
 * No DB, no codegen, no runtime mutation (GOVERNANCE_EXECUTION_PLAN_V1).
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "registry-yaml", "agent-capabilities");

const SPEC = "agent_capability_v0";
const ALLOWED_PLANES = ["customer_facing_runtime", "internal_worker_runtime"] as const;
const RESERVED_PLANE = "background_scheduled";
const ESCALATION_MODES = ["fail_closed", "queue_for_review"] as const;
const CAP_ACTIONS = new Set(["create", "modify", "refactor", "read", "delete"]);

type YamlDoc = Record<string, unknown>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim().length > 0);
}

function validateFile(filePath: string, relName: string): string[] {
  const errs: string[] = [];
  const raw = fs.readFileSync(filePath, "utf8");
  let doc: YamlDoc;
  try {
    doc = yaml.load(raw) as YamlDoc;
  } catch (e) {
    return [`${relName}: YAML parse error: ${e instanceof Error ? e.message : String(e)}`];
  }
  if (!doc || typeof doc !== "object") {
    return [`${relName}: root must be an object`];
  }

  const req = [
    "spec",
    "id",
    "version",
    "display_name",
    "plane",
    "authority",
    "capabilities",
    "boundaries",
    "contracts",
    "execution",
    "orchestration",
    "escalation",
    "tests",
    "scoring",
    "governance",
  ] as const;
  for (const k of req) {
    if (!(k in doc)) errs.push(`${relName}: missing top-level key "${k}"`);
  }
  if (doc.spec !== SPEC) {
    errs.push(`${relName}: spec must be "${SPEC}", got ${JSON.stringify(doc.spec)}`);
  }
  if (!isNonEmptyString(doc.id)) errs.push(`${relName}: id must be non-empty string`);
  if (!isNonEmptyString(doc.version)) errs.push(`${relName}: version must be non-empty string`);
  if (!isNonEmptyString(doc.display_name)) errs.push(`${relName}: display_name must be non-empty string`);

  const plane = doc.plane;
  if (plane === RESERVED_PLANE) {
    errs.push(
      `${relName}: plane "${RESERVED_PLANE}" is reserved_v1 — not allowed as active agent plane in v0 registry files`,
    );
  } else if (!ALLOWED_PLANES.includes(plane as (typeof ALLOWED_PLANES)[number])) {
    errs.push(
      `${relName}: plane must be one of ${[...ALLOWED_PLANES, RESERVED_PLANE].join(", ")} (excluding ${RESERVED_PLANE} for active entries)`,
    );
  }

  const auth = doc.authority;
  if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
    errs.push(`${relName}: authority must be an object`);
  } else {
    const a = auth as Record<string, unknown>;
    if (!isNonEmptyString(a.source_of_truth)) {
      errs.push(`${relName}: authority.source_of_truth must be non-empty string`);
    } else {
      const st = a.source_of_truth as string;
      const expected = `registry-yaml/agent-capabilities/${path.basename(filePath)}`;
      if (st !== expected) {
        errs.push(`${relName}: authority.source_of_truth must equal "${expected}" (got "${st}")`);
      }
    }
    if (!Array.isArray(a.derived_fields)) {
      errs.push(`${relName}: authority.derived_fields must be an array`);
    }
  }

  if (doc.plane_status !== undefined) {
    const ps = doc.plane_status;
    if (!ps || typeof ps !== "object" || Array.isArray(ps)) {
      errs.push(`${relName}: plane_status must be an object when present`);
    } else {
      const p = ps as Record<string, unknown>;
      if (p.background_scheduled !== undefined && p.background_scheduled !== "reserved_v1") {
        errs.push(
          `${relName}: plane_status.background_scheduled must be "reserved_v1" when set (got ${JSON.stringify(p.background_scheduled)})`,
        );
      }
    }
  }

  const caps = doc.capabilities;
  if (!Array.isArray(caps) || caps.length === 0) {
    errs.push(`${relName}: capabilities must be a non-empty array`);
  } else {
    caps.forEach((c, i) => {
      if (!c || typeof c !== "object" || Array.isArray(c)) {
        errs.push(`${relName}: capabilities[${i}] must be an object`);
        return;
      }
      const cap = c as Record<string, unknown>;
      if (!isNonEmptyString(cap.id)) errs.push(`${relName}: capabilities[${i}].id required`);
      if (!isNonEmptyString(cap.description)) errs.push(`${relName}: capabilities[${i}].description required`);
      const scope = cap.scope;
      if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
        errs.push(`${relName}: capabilities[${i}].scope must be an object`);
      } else {
        const sc = scope as Record<string, unknown>;
        if (!isStringArray(sc.paths) || sc.paths.length === 0) {
          errs.push(`${relName}: capabilities[${i}].scope.paths must be non-empty string array`);
        }
        if (!isStringArray(sc.actions) || sc.actions.length === 0) {
          errs.push(`${relName}: capabilities[${i}].scope.actions must be non-empty string array`);
        } else {
          for (const act of sc.actions as string[]) {
            if (!CAP_ACTIONS.has(act)) {
              errs.push(
                `${relName}: capabilities[${i}].scope.actions contains unknown action "${act}" (allowed: ${[...CAP_ACTIONS].join(", ")})`,
              );
            }
          }
        }
      }
    });
  }

  const b = doc.boundaries;
  if (!b || typeof b !== "object" || Array.isArray(b)) {
    errs.push(`${relName}: boundaries must be an object`);
  } else {
    const bd = b as Record<string, unknown>;
    if (!Array.isArray(bd.forbidden_logical_domains)) {
      errs.push(`${relName}: boundaries.forbidden_logical_domains must be an array`);
    } else if (!(bd.forbidden_logical_domains as unknown[]).every((x) => typeof x === "string" && x.trim())) {
      errs.push(`${relName}: boundaries.forbidden_logical_domains must be strings only`);
    }
    if (!Array.isArray(bd.forbidden_paths)) {
      errs.push(`${relName}: boundaries.forbidden_paths must be an array`);
    } else if (!(bd.forbidden_paths as unknown[]).every((x) => typeof x === "string" && x.trim())) {
      errs.push(`${relName}: boundaries.forbidden_paths must be strings only`);
    } else if (plane === "internal_worker_runtime" && (bd.forbidden_paths as string[]).length === 0) {
      errs.push(`${relName}: internal_worker_runtime requires non-empty boundaries.forbidden_paths (voice hard stops)`);
    }
    if (bd.allowed_logical_domains !== undefined && !Array.isArray(bd.allowed_logical_domains)) {
      errs.push(`${relName}: boundaries.allowed_logical_domains must be an array when present`);
    }
    if (bd.allowed_paths !== undefined && !Array.isArray(bd.allowed_paths)) {
      errs.push(`${relName}: boundaries.allowed_paths must be an array when present`);
    }
  }

  const contracts = doc.contracts;
  if (!contracts || typeof contracts !== "object" || Array.isArray(contracts)) {
    errs.push(`${relName}: contracts must be an object`);
  } else {
    const co = contracts as Record<string, unknown>;
    const inp = co.input;
    const out = co.output;
    if (!inp || typeof inp !== "object") errs.push(`${relName}: contracts.input must be an object`);
    else {
      const i = inp as Record<string, unknown>;
      if (!isNonEmptyString(i.taskType)) errs.push(`${relName}: contracts.input.taskType required`);
    }
    if (!out || typeof out !== "object") errs.push(`${relName}: contracts.output must be an object`);
    else {
      const o = out as Record<string, unknown>;
      if (o.format !== "local_agent_output") {
        errs.push(`${relName}: contracts.output.format must be "local_agent_output" for v0 internal workers`);
      }
      if (o.parse_required !== true) {
        errs.push(`${relName}: contracts.output.parse_required must be true for v0`);
      }
    }
  }

  const ex = doc.execution;
  if (!ex || typeof ex !== "object") {
    errs.push(`${relName}: execution must be an object`);
  } else {
    const e = ex as Record<string, unknown>;
    if (e.deterministic_output_required !== true) {
      errs.push(`${relName}: execution.deterministic_output_required must be true`);
    }
    if (e.structured_output_only !== true) {
      errs.push(`${relName}: execution.structured_output_only must be true`);
    }
  }

  const orch = doc.orchestration;
  if (!orch || typeof orch !== "object") {
    errs.push(`${relName}: orchestration must be an object`);
  } else {
    const o = orch as Record<string, unknown>;
    if (o.requires_run_row !== true) errs.push(`${relName}: orchestration.requires_run_row must be true`);
    if (!Array.isArray(o.violation_types) || o.violation_types.length === 0) {
      errs.push(`${relName}: orchestration.violation_types must be non-empty array`);
    }
  }

  const esc = doc.escalation;
  if (!esc || typeof esc !== "object") {
    errs.push(`${relName}: escalation must be an object`);
  } else {
    const e = esc as Record<string, unknown>;
    if (!ESCALATION_MODES.includes(e.on_boundary_hit as (typeof ESCALATION_MODES)[number])) {
      errs.push(
        `${relName}: escalation.on_boundary_hit must be one of ${ESCALATION_MODES.join(", ")}`,
      );
    }
    if (!Array.isArray(e.handoff_to) || !e.handoff_to.every((x) => typeof x === "string" && x.trim())) {
      errs.push(`${relName}: escalation.handoff_to must be non-empty string array`);
    }
  }

  const tests = doc.tests;
  if (!tests || typeof tests !== "object") errs.push(`${relName}: tests must be an object`);
  else {
    const t = tests as Record<string, unknown>;
    if (!Array.isArray(t.npm_scripts)) errs.push(`${relName}: tests.npm_scripts must be an array`);
    if (!Array.isArray(t.scenarios)) errs.push(`${relName}: tests.scenarios must be an array`);
  }

  const scoring = doc.scoring;
  if (!scoring || typeof scoring !== "object") errs.push(`${relName}: scoring must be an object`);

  const gov = doc.governance;
  if (!gov || typeof gov !== "object") errs.push(`${relName}: governance must be an object`);
  else {
    const g = gov as Record<string, unknown>;
    if (!Array.isArray(g.policy_refs) || (g.policy_refs as unknown[]).length === 0) {
      errs.push(`${relName}: governance.policy_refs must be non-empty array`);
    }
    if (g.review_required !== true) {
      errs.push(`${relName}: governance.review_required must be true for v0 exemplars`);
    }
  }

  return errs;
}

function main(): void {
  if (!fs.existsSync(DIR)) {
    console.error("validate-agent-capability-registry: missing directory", DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  if (files.length === 0) {
    console.error("validate-agent-capability-registry: no YAML files in", DIR);
    process.exit(1);
  }

  const allErrors: string[] = [];
  for (const f of files.sort()) {
    const fp = path.join(DIR, f);
    allErrors.push(...validateFile(fp, f));
  }

  if (allErrors.length) {
    console.error("validate-agent-capability-registry: FAILED\n" + allErrors.join("\n"));
    process.exit(1);
  }
  console.log("validate-agent-capability-registry: ok", files.length, "file(s)");
}

main();
