/**
 * Registry-driven policy gate catalog — single authority.
 *
 * The **canonical source** is `registry-yaml/policy-gates.yaml`.
 * Secondary registries (actions.yaml, logical-routes.yaml, views.yaml) are
 * checked for consistency — any gate referenced there MUST also exist in
 * policy-gates.yaml. Drift is a doctrine violation (D10: single authority).
 *
 * Replaces:
 *   - ALPHA_ALLOWED_GATES hardcoded Set
 *   - SERVER_DEFINED_GATES array
 *   - POLICY_ROLE_ALLOWLIST in siteScopedAccess.ts
 *
 * Doctrine: docs-governance/canonical/AI_OS_OPERATING_DOCTRINE_V1.md § D10
 */

import { loadActions } from "../registry-loader/loadActions.js";
import { loadLogicalRoutes } from "../registry-loader/loadLogicalRoutes.js";
import { loadViews } from "../registry-loader/loadViews.js";

const IS_BROWSER = typeof window !== "undefined";
const IS_NODE = typeof process !== "undefined" && !!process.versions?.node;

export interface PolicyGateEntry {
  gateId: string;
  description: string;
  source: "policy-gates.yaml";
  allowedActorClasses: string[];
  anonymousAllowed: boolean;
  mutationLevel: "none" | "read_only" | "controlled" | "sensitive";
  escalationRule: "none" | "management_review" | "approval_required";
  doctrineRef: string;
}

export interface PolicyGateDriftWarning {
  gateId: string;
  referencedBy: "action" | "route" | "view";
  issue: string;
}

let _catalog: Map<string, PolicyGateEntry> | null = null;
let _driftWarnings: PolicyGateDriftWarning[] = [];

let _fsModule: typeof import("node:fs") | null = null;
let _pathModule: typeof import("node:path") | null = null;
let _urlModule: typeof import("node:url") | null = null;
let _nodeModulesLoaded = false;

function ensureNodeModules() {
  if (_nodeModulesLoaded || IS_BROWSER) return;
  _nodeModulesLoaded = true;
  try {
    // Dynamic requires only execute on Node.js — Vite tree-shakes this branch
    // @ts-expect-error dynamic require for Node.js only
    _fsModule = globalThis.__non_webpack_require__ ? globalThis.__non_webpack_require__("fs") : eval('require')("node:fs");
    // @ts-expect-error dynamic require for Node.js only
    _pathModule = globalThis.__non_webpack_require__ ? globalThis.__non_webpack_require__("path") : eval('require')("node:path");
    // @ts-expect-error dynamic require for Node.js only
    _urlModule = globalThis.__non_webpack_require__ ? globalThis.__non_webpack_require__("url") : eval('require')("node:url");
  } catch {
    // Running in browser — no node modules available
  }
}

function findRegistryRoot(): string {
  ensureNodeModules();
  if (!_pathModule || !_urlModule) return "";
  try {
    const __filename = _urlModule.fileURLToPath(import.meta.url);
    const __dirname = _pathModule.dirname(__filename);
    return _pathModule.resolve(__dirname, "../../../../../../registry-yaml");
  } catch {
    return _pathModule.resolve(process.cwd(), "registry-yaml");
  }
}

interface RawPolicyGateYaml {
  gates: Array<{
    gate_id: string;
    description: string;
    allowed_actor_classes: string[];
    anonymous_allowed: boolean;
    mutation_level: string;
    escalation_rule: string;
    doctrine_ref: string;
  }>;
}

function loadPolicyGatesYaml(): RawPolicyGateYaml {
  ensureNodeModules();
  if (!_fsModule || !_pathModule) return { gates: [] };
  const yamlPath = _pathModule.resolve(findRegistryRoot(), "policy-gates.yaml");
  const raw = _fsModule.readFileSync(yamlPath, "utf-8");

  const gates: RawPolicyGateYaml["gates"] = [];

  let current: Partial<RawPolicyGateYaml["gates"][0]> | null = null;
  let inActorClasses = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- gate_id:")) {
      if (current?.gate_id) {
        gates.push(current as RawPolicyGateYaml["gates"][0]);
      }
      current = {
        gate_id: trimmed.replace("- gate_id:", "").trim(),
        allowed_actor_classes: [],
        anonymous_allowed: false,
        mutation_level: "none",
        escalation_rule: "none",
        doctrine_ref: "",
        description: "",
      };
      inActorClasses = false;
      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith("description:")) {
      current.description = trimmed.replace("description:", "").trim();
      inActorClasses = false;
    } else if (trimmed.startsWith("allowed_actor_classes:")) {
      const inline = trimmed.replace("allowed_actor_classes:", "").trim();
      if (inline.startsWith("[")) {
        const inner = inline.slice(1, -1).trim();
        current.allowed_actor_classes = inner ? inner.split(",").map(s => s.trim()) : [];
        inActorClasses = false;
      } else {
        inActorClasses = true;
      }
    } else if (inActorClasses && trimmed.startsWith("- ")) {
      current.allowed_actor_classes!.push(trimmed.slice(2).trim());
    } else {
      inActorClasses = false;
      if (trimmed.startsWith("anonymous_allowed:")) {
        current.anonymous_allowed = trimmed.replace("anonymous_allowed:", "").trim() === "true";
      } else if (trimmed.startsWith("mutation_level:")) {
        current.mutation_level = trimmed.replace("mutation_level:", "").trim();
      } else if (trimmed.startsWith("escalation_rule:")) {
        current.escalation_rule = trimmed.replace("escalation_rule:", "").trim();
      } else if (trimmed.startsWith("doctrine_ref:")) {
        current.doctrine_ref = trimmed.replace("doctrine_ref:", "").trim();
      }
    }
  }

  if (current?.gate_id) {
    gates.push(current as RawPolicyGateYaml["gates"][0]);
  }

  return { gates };
}

/**
 * Build the gate catalog from policy-gates.yaml (canonical) and validate
 * against secondary registries for drift.
 */
export function loadPolicyGateCatalog(): Map<string, PolicyGateEntry> {
  if (_catalog) return _catalog;
  if (IS_BROWSER) {
    _catalog = new Map();
    return _catalog;
  }

  const catalog = new Map<string, PolicyGateEntry>();
  _driftWarnings = [];

  const yamlData = loadPolicyGatesYaml();
  for (const gate of yamlData.gates) {
    catalog.set(gate.gate_id, {
      gateId: gate.gate_id,
      description: gate.description,
      source: "policy-gates.yaml",
      allowedActorClasses: gate.allowed_actor_classes,
      anonymousAllowed: gate.anonymous_allowed,
      mutationLevel: gate.mutation_level as PolicyGateEntry["mutationLevel"],
      escalationRule: gate.escalation_rule as PolicyGateEntry["escalationRule"],
      doctrineRef: gate.doctrine_ref,
    });
  }

  // Drift detection: gates referenced in secondary registries MUST exist in primary
  try {
    const actions = loadActions();
    for (const action of actions.actions) {
      if (action.requiredPolicy && !catalog.has(action.requiredPolicy)) {
        _driftWarnings.push({
          gateId: action.requiredPolicy,
          referencedBy: "action",
          issue: `Action "${action.actionId}" references gate "${action.requiredPolicy}" which is not in policy-gates.yaml`,
        });
      }
    }
  } catch { /* actions registry may not be available */ }

  try {
    const routes = loadLogicalRoutes();
    for (const route of routes.routes) {
      if (route.policyGate && !catalog.has(route.policyGate)) {
        _driftWarnings.push({
          gateId: route.policyGate,
          referencedBy: "route",
          issue: `Route "${route.routeId}" references gate "${route.policyGate}" which is not in policy-gates.yaml`,
        });
      }
    }
  } catch { /* routes registry may not be available */ }

  try {
    const views = loadViews();
    for (const view of views.views) {
      if (view.policyGate && !catalog.has(view.policyGate)) {
        _driftWarnings.push({
          gateId: view.policyGate,
          referencedBy: "view",
          issue: `View "${view.viewId}" references gate "${view.policyGate}" which is not in policy-gates.yaml`,
        });
      }
    }
  } catch { /* views registry may not be available */ }

  if (_driftWarnings.length > 0) {
    console.warn(
      `[PolicyGateCatalog] ${_driftWarnings.length} drift warning(s) detected:\n` +
      _driftWarnings.map(w => `  - ${w.issue}`).join("\n")
    );
  }

  _catalog = catalog;
  return catalog;
}

/**
 * Check if a gate is in the catalog.
 */
export function isRegisteredGate(gateId: string): boolean {
  return loadPolicyGateCatalog().has(gateId);
}

/**
 * Get the full entry for a gate.
 */
export function getGateEntry(gateId: string): PolicyGateEntry | undefined {
  return loadPolicyGateCatalog().get(gateId);
}

/**
 * Get all registered gate IDs (for diagnostics/audit).
 */
export function getAllRegisteredGateIds(): string[] {
  return [...loadPolicyGateCatalog().keys()].sort();
}

/**
 * Get drift warnings from the last catalog load.
 */
export function getPolicyGateDriftWarnings(): readonly PolicyGateDriftWarning[] {
  loadPolicyGateCatalog();
  return _driftWarnings;
}

/**
 * Force catalog reload (for tests or hot-reload scenarios).
 */
export function resetPolicyGateCatalog(): void {
  _catalog = null;
  _driftWarnings = [];
}
