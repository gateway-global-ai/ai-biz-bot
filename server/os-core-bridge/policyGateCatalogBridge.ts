/**
 * Bridge: server → os-core policy gate catalog.
 *
 * The os-core catalog reads policy-gates.yaml and validates against
 * secondary registries. This bridge re-exports catalog functions
 * so the server middleware can consume them without direct os-core
 * path dependencies in every route file.
 *
 * Doctrine D10: Single authority — all gate lookups go through this bridge
 * to the canonical registry-yaml/policy-gates.yaml source.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface PolicyGateEntry {
  gateId: string;
  description: string;
  allowedActorClasses: string[];
  anonymousAllowed: boolean;
  mutationLevel: "none" | "read_only" | "controlled" | "sensitive";
  escalationRule: "none" | "management_review" | "approval_required";
  doctrineRef: string;
}

let _catalog: Map<string, PolicyGateEntry> | null = null;

function findRegistryRoot(): string {
  return resolve(process.cwd(), "registry-yaml");
}

function loadCatalog(): Map<string, PolicyGateEntry> {
  if (_catalog) return _catalog;

  const yamlPath = resolve(findRegistryRoot(), "policy-gates.yaml");
  const raw = readFileSync(yamlPath, "utf-8");

  const catalog = new Map<string, PolicyGateEntry>();

  let current: Partial<PolicyGateEntry> | null = null;
  let inActorClasses = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- gate_id:")) {
      if (current?.gateId) {
        catalog.set(current.gateId, current as PolicyGateEntry);
      }
      current = {
        gateId: trimmed.replace("- gate_id:", "").trim(),
        description: "",
        allowedActorClasses: [],
        anonymousAllowed: false,
        mutationLevel: "none",
        escalationRule: "none",
        doctrineRef: "",
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
        current.allowedActorClasses = inner ? inner.split(",").map(s => s.trim()) : [];
        inActorClasses = false;
      } else {
        inActorClasses = true;
      }
    } else if (inActorClasses && trimmed.startsWith("- ")) {
      current.allowedActorClasses!.push(trimmed.slice(2).trim());
    } else {
      inActorClasses = false;
      if (trimmed.startsWith("anonymous_allowed:")) {
        current.anonymousAllowed = trimmed.replace("anonymous_allowed:", "").trim() === "true";
      } else if (trimmed.startsWith("mutation_level:")) {
        current.mutationLevel = trimmed.replace("mutation_level:", "").trim() as PolicyGateEntry["mutationLevel"];
      } else if (trimmed.startsWith("escalation_rule:")) {
        current.escalationRule = trimmed.replace("escalation_rule:", "").trim() as PolicyGateEntry["escalationRule"];
      } else if (trimmed.startsWith("doctrine_ref:")) {
        current.doctrineRef = trimmed.replace("doctrine_ref:", "").trim();
      }
    }
  }

  if (current?.gateId) {
    catalog.set(current.gateId, current as PolicyGateEntry);
  }

  _catalog = catalog;
  return catalog;
}

export function isRegisteredGate(gateId: string): boolean {
  return loadCatalog().has(gateId);
}

export function getGateEntry(gateId: string): PolicyGateEntry | undefined {
  return loadCatalog().get(gateId);
}

export function getAllRegisteredGateIds(): string[] {
  return [...loadCatalog().keys()].sort();
}

export function loadPolicyGateCatalog(): Map<string, PolicyGateEntry> {
  return loadCatalog();
}

export function resetPolicyGateCatalog(): void {
  _catalog = null;
}
