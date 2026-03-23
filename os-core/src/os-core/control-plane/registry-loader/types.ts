export type RenderMode =
  | "menu"
  | "view"
  | "confirmation"
  | "refusal"
  | "ptt_first"
  | "result";

export type RequiredRoleScope =
  | "platform"
  | "organization"
  | "location"
  | "team"
  | "personal";

export type RequiredVerificationState =
  | "unverified"
  | "pending"
  | "verified"
  | "elevated";

export interface LogicalRouteDef {
  routeId: string;
  domain: string;
  requiredContextKeys: string[];
  policyGate: string;
  linkedViewId: string;
  mode: RenderMode;
  // Governance-enriched fields (Phase 1 hardening).
  allowedActions?: string[];
  requiredRoleScope?: RequiredRoleScope | RequiredRoleScope[];
  requiredVerificationState?: RequiredVerificationState;
  optionalBrowserPath?: string;
}

export interface LogicalRoutesRegistry {
  version: number;
  routes: LogicalRouteDef[];
}

export interface ViewDef {
  viewId: string;
  // Legacy field retained for compatibility.
  viewType: string;
  // Governance-aligned synonym for viewType.
  category?: string;
  viewStateType: RenderMode;
  lazyImportKey: string;
  allowedModes: string[];
  requiredContextKeys?: string[];
  allowedActions?: string[];
  dataContract?: Record<string, unknown>;
  renderHints?: Record<string, unknown>;
  policyGate?: string;
}

export interface ViewsRegistry {
  version: number;
  views: ViewDef[];
}

export interface AgentPolicyDef {
  agentId: string;
  agentType: string;
  safeModeProfile: string;
  allowedEntities: string[];
  allowedActions: string[];
  allowedTools: string[];
  mayInventRoutes: boolean;
}

export interface AgentPoliciesRegistry {
  version: number;
  agents: AgentPolicyDef[];
}

export interface ActionsDef {
  actionId: string;
  // Legacy field retained for compatibility.
  entity: string;
  // Governance-aligned field name.
  allowedEntities?: string[];
  requiredContextKeys: string[];
  requiredPolicy: string;
  // Legacy field retained for compatibility.
  mutationClass: string;
  // Governance-aligned field name.
  mutationLevel?: "none" | "read_only" | "controlled" | "sensitive";
  // Legacy field retained for compatibility.
  handler: string;
  // Governance-aligned field name.
  domainHandler?: string;
  requiresConfirmation?: boolean;
  safeModeBehavior?: string;
  auditEvent?: string;
  description?: string;
  arguments?: Record<
    string,
    {
      type: string;
      required: boolean;
      description?: string;
    }
  >;
}

export interface ActionsRegistry {
  version: number;
  actions: ActionsDef[];
}

export interface UIElementDef {
  elementId: string;
  semantic_aliases: string[];
  required_route: string;
}

export interface UIElementsRegistry {
  version: number;
  elements: UIElementDef[];
}

export interface ActionResult {
  status: "success" | "error";
  actionId: string;
  entity: string;
  entityId: string;
  auditEvent?: string;
  changedFields: string[];
  change: {
    parameter: string;
    previousValue: number | string;
    newValue: number | string;
  };
  nextSuggestedActions: string[];
  message: string;
}
