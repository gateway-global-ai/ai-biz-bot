import yaml from "js-yaml";

import policiesRaw from "../../../../../registry-yaml/agent-policies.yaml?raw";
import { ensureRegistryVersion, validateAgentPolicies } from "./validateRegistry";
import type { AgentPoliciesRegistry } from "./types";

interface AgentPoliciesYaml {
  version?: unknown;
  agents?: unknown;
}

export function loadAgentPolicies(): AgentPoliciesRegistry {
  const parsed = yaml.load(policiesRaw) as AgentPoliciesYaml;
  ensureRegistryVersion(parsed, "agent-policies.yaml");
  return {
    version: parsed.version as number,
    agents: validateAgentPolicies(parsed.agents ?? []),
  };
}
