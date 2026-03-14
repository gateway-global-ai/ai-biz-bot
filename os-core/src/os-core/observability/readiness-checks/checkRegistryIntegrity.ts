import type {
  ActionsRegistry,
  AgentPoliciesRegistry,
  LogicalRoutesRegistry,
  ViewsRegistry,
} from "../../control-plane/registry-loader/types";
import type { ReadinessCheckResult } from "./types";

interface RegistryIntegrityInput {
  routes: LogicalRoutesRegistry;
  agents: AgentPoliciesRegistry;
  actions: ActionsRegistry;
  views: ViewsRegistry;
}

export async function checkRegistryIntegrity({
  routes,
  agents,
  actions,
  views,
}: RegistryIntegrityInput): Promise<ReadinessCheckResult> {
  if (routes.routes.length === 0) {
    return { status: "FAIL", detail: "No logical routes found" };
  }

  if (agents.agents.length === 0) {
    return { status: "FAIL", detail: "No agent policies found" };
  }

  if (actions.actions.length === 0) {
    return { status: "FAIL", detail: "No action registry entries found" };
  }

  if (views.views.length === 0) {
    return { status: "FAIL", detail: "No view registry entries found" };
  }

  return { status: "PASS", detail: "Core registries are populated" };
}
