export type RenderMode =
  | "menu"
  | "view"
  | "confirmation"
  | "refusal"
  | "ptt_first";

export interface LogicalRouteDef {
  routeId: string;
  requiredContextKeys: string[];
  renderMode: RenderMode;
  linkedViewId: string;
  optionalBrowserPath?: string;
}

export const LOGICAL_ROUTES: Record<string, LogicalRouteDef> = {
  os_home: {
    routeId: "os.home",
    requiredContextKeys: [],
    renderMode: "ptt_first",
    linkedViewId: "os-home-view",
    optionalBrowserPath: "/",
  },
  admin_home: {
    routeId: "admin.home",
    requiredContextKeys: [],
    renderMode: "menu",
    linkedViewId: "admin-home-view",
    optionalBrowserPath: "/admin",
  },
  workspace_router: {
    routeId: "workspace.detail",
    requiredContextKeys: ["siteConfigId"],
    renderMode: "view",
    linkedViewId: "workspace-router-view",
    optionalBrowserPath: "/workspace/:siteId",
  },
  agent_config: {
    routeId: "agent.config",
    requiredContextKeys: ["siteConfigId", "agentId"],
    renderMode: "view",
    linkedViewId: "agent-config-view",
    optionalBrowserPath: "/workspace/:siteId/agent/:agentId",
  },
  support_entry: {
    routeId: "support.entry",
    requiredContextKeys: [],
    renderMode: "menu",
    linkedViewId: "support-entry-view",
    optionalBrowserPath: "/support",
  },
};
