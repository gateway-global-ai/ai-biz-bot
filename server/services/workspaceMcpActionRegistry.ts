import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

export type WorkspaceMcpActionRegistryEntry = {
  action_id: string;
  scope_key: string;
  mutation_level: "read" | "write";
  external_tool_name: string;
  transitional_tool_name?: string;
  requires_approval?: boolean;
  required_params?: string[];
  evidence_kinds?: string[];
  description?: string;
};

type WorkspaceMcpActionRegistryFile = {
  spec: string;
  version: string;
  actions?: WorkspaceMcpActionRegistryEntry[];
};

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "registry-yaml/workspace-mcp-actions/manifest.v1.yaml");

let cached: Map<string, WorkspaceMcpActionRegistryEntry> | null = null;

export function loadWorkspaceMcpActionRegistry(): Map<string, WorkspaceMcpActionRegistryEntry> {
  if (cached) return cached;
  const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
  const data = yaml.load(raw) as WorkspaceMcpActionRegistryFile;
  cached = new Map((data.actions ?? []).map((entry) => [entry.action_id, entry]));
  return cached;
}

export function getWorkspaceMcpAction(actionId: string): WorkspaceMcpActionRegistryEntry | undefined {
  return loadWorkspaceMcpActionRegistry().get(actionId);
}

export function resetWorkspaceMcpActionRegistryCache(): void {
  cached = null;
}
