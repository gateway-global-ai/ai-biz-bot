import type {
  ActionsDef,
  AgentPolicyDef,
  LogicalRouteDef,
  RenderMode,
  UIElementDef,
  ViewDef,
} from "./types";

const VALID_MODES: ReadonlySet<string> = new Set([
  "menu",
  "view",
  "confirmation",
  "refusal",
  "ptt_first",
  "result",
]);

function assertStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function assertUniqueIds<T extends Record<string, unknown>>(
  entries: T[],
  idField: keyof T,
  registryName: string
) {
  const seen = new Set<string>();
  for (const entry of entries) {
    const idValue = entry[idField];
    if (typeof idValue !== "string") {
      throw new Error(`${registryName} entry is missing string ${String(idField)}.`);
    }
    if (seen.has(idValue)) {
      throw new Error(`${registryName} contains duplicate id: ${idValue}`);
    }
    seen.add(idValue);
  }
}

export function validateLogicalRoutes(routes: unknown): LogicalRouteDef[] {
  if (!Array.isArray(routes)) throw new Error("Logical routes registry must be an array.");
  const validated = routes.map((route) => {
    const r = route as Record<string, unknown>;
    const mode = (r.mode ?? r.renderMode) as unknown;
    if (
      typeof r.routeId !== "string" ||
      typeof r.domain !== "string" ||
      !Array.isArray(r.requiredContextKeys) ||
      typeof r.policyGate !== "string" ||
      typeof r.linkedViewId !== "string" ||
      typeof mode !== "string"
    ) {
      throw new Error("Logical route registry entry is invalid.");
    }

    if (!VALID_MODES.has(mode)) {
      throw new Error(`Logical route ${r.routeId} has invalid mode: ${mode}`);
    }

    if (
      r.allowedActions !== undefined &&
      (!Array.isArray(r.allowedActions) ||
        r.allowedActions.some((action) => typeof action !== "string"))
    ) {
      throw new Error(`Logical route ${r.routeId} has invalid allowedActions.`);
    }

    return {
      routeId: r.routeId,
      domain: r.domain,
      requiredContextKeys: assertStringArray(
        r.requiredContextKeys,
        `logical route ${r.routeId}.requiredContextKeys`
      ),
      policyGate: r.policyGate,
      linkedViewId: r.linkedViewId,
      mode: mode as RenderMode,
      optionalBrowserPath:
        typeof r.optionalBrowserPath === "string" ? r.optionalBrowserPath : undefined,
      allowedActions: Array.isArray(r.allowedActions)
        ? (r.allowedActions as string[])
        : undefined,
      requiredRoleScope:
        typeof r.requiredRoleScope === "string" || Array.isArray(r.requiredRoleScope)
          ? (r.requiredRoleScope as LogicalRouteDef["requiredRoleScope"])
          : undefined,
      requiredVerificationState:
        typeof r.requiredVerificationState === "string"
          ? (r.requiredVerificationState as LogicalRouteDef["requiredVerificationState"])
          : undefined,
    } satisfies LogicalRouteDef;
  });

  assertUniqueIds(validated, "routeId", "logical-routes.yaml");
  return validated;
}

export function validateViews(views: unknown): ViewDef[] {
  if (!Array.isArray(views)) throw new Error("View registry must be an array.");
  const validated = views.map((view) => {
    const v = view as Record<string, unknown>;
    const category = (v.category ?? v.viewType) as unknown;
    if (
      typeof v.viewId !== "string" ||
      typeof v.viewType !== "string" ||
      typeof v.viewStateType !== "string" ||
      typeof v.lazyImportKey !== "string" ||
      !Array.isArray(v.allowedModes)
    ) {
      throw new Error("View registry entry is invalid.");
    }

    if (!VALID_MODES.has(String(v.viewStateType))) {
      throw new Error(`View ${v.viewId} has invalid viewStateType: ${v.viewStateType}`);
    }

    const allowedModes = assertStringArray(
      v.allowedModes,
      `view ${v.viewId}.allowedModes`
    );
    for (const mode of allowedModes) {
      if (!VALID_MODES.has(mode)) {
        throw new Error(`View ${v.viewId} has invalid allowedModes entry: ${mode}`);
      }
    }

    if (
      v.allowedActions !== undefined &&
      (!Array.isArray(v.allowedActions) ||
        v.allowedActions.some((action) => typeof action !== "string"))
    ) {
      throw new Error(`View ${v.viewId} has invalid allowedActions.`);
    }

    return {
      viewId: v.viewId,
      viewType: v.viewType,
      category: typeof category === "string" ? category : v.viewType,
      viewStateType: v.viewStateType as RenderMode,
      lazyImportKey: v.lazyImportKey,
      allowedModes,
      requiredContextKeys: Array.isArray(v.requiredContextKeys)
        ? assertStringArray(v.requiredContextKeys, `view ${v.viewId}.requiredContextKeys`)
        : [],
      allowedActions: Array.isArray(v.allowedActions)
        ? (v.allowedActions as string[])
        : [],
      dataContract:
        typeof v.dataContract === "object" && v.dataContract !== null
          ? (v.dataContract as Record<string, unknown>)
          : undefined,
      renderHints:
        typeof v.renderHints === "object" && v.renderHints !== null
          ? (v.renderHints as Record<string, unknown>)
          : undefined,
      policyGate: typeof v.policyGate === "string" ? v.policyGate : undefined,
    } satisfies ViewDef;
  });

  assertUniqueIds(validated, "viewId", "views.yaml");
  return validated;
}

export function validateAgentPolicies(policies: unknown): AgentPolicyDef[] {
  if (!Array.isArray(policies)) throw new Error("Agent policy registry must be an array.");
  return policies.map((policy) => {
    const p = policy as Record<string, unknown>;
    if (
      typeof p.agentId !== "string" ||
      typeof p.agentType !== "string" ||
      typeof p.safeModeProfile !== "string" ||
      !Array.isArray(p.allowedEntities) ||
      !Array.isArray(p.allowedActions) ||
      !Array.isArray(p.allowedTools) ||
      typeof p.mayInventRoutes !== "boolean"
    ) {
      throw new Error("Agent policy registry entry is invalid.");
    }
    return p as unknown as AgentPolicyDef;
  });
}

export function validateActions(actions: unknown): ActionsDef[] {
  if (!Array.isArray(actions)) throw new Error("Action registry must be an array.");
  const validated = actions.map((action) => {
    const a = action as Record<string, unknown>;
    const mutationClass = (a.mutationClass ?? a.mutationLevel) as unknown;
    const handler = (a.handler ?? a.domainHandler) as unknown;
    const allowedEntities = (a.allowedEntities ??
      (typeof a.entity === "string" ? [a.entity] : undefined)) as unknown;
    if (
      typeof a.actionId !== "string" ||
      typeof a.entity !== "string" ||
      !Array.isArray(a.requiredContextKeys) ||
      typeof a.requiredPolicy !== "string" ||
      typeof mutationClass !== "string" ||
      typeof handler !== "string"
    ) {
      throw new Error("Action registry entry is invalid.");
    }

    if (!Array.isArray(allowedEntities) || allowedEntities.some((entry) => typeof entry !== "string")) {
      throw new Error(`Action ${a.actionId} has invalid allowedEntities.`);
    }

    if (
      a.requiresConfirmation !== undefined &&
      typeof a.requiresConfirmation !== "boolean"
    ) {
      throw new Error(`Action ${a.actionId} has invalid requiresConfirmation.`);
    }
    if (a.auditEvent !== undefined && typeof a.auditEvent !== "string") {
      throw new Error(`Action ${a.actionId} has invalid auditEvent.`);
    }

    return {
      actionId: a.actionId,
      entity: a.entity,
      allowedEntities: allowedEntities as string[],
      requiredContextKeys: assertStringArray(
        a.requiredContextKeys,
        `action ${a.actionId}.requiredContextKeys`
      ),
      requiredPolicy: a.requiredPolicy,
      mutationClass,
      mutationLevel: mutationClass as ActionsDef["mutationLevel"],
      handler,
      domainHandler: handler,
      requiresConfirmation:
        typeof a.requiresConfirmation === "boolean" ? a.requiresConfirmation : false,
      safeModeBehavior:
        typeof a.safeModeBehavior === "string" ? a.safeModeBehavior : "respect_agent_policy",
      auditEvent: typeof a.auditEvent === "string" ? a.auditEvent : undefined,
      description: typeof a.description === "string" ? a.description : undefined,
      arguments:
        typeof a.arguments === "object" && a.arguments !== null
          ? (a.arguments as ActionsDef["arguments"])
          : undefined,
    } satisfies ActionsDef;
  });

  assertUniqueIds(validated, "actionId", "actions.yaml");
  return validated;
}

export function validateUIElements(elements: unknown): UIElementDef[] {
  if (!Array.isArray(elements)) throw new Error("UI element registry must be an array.");
  return elements.map((element) => {
    const e = element as Record<string, unknown>;
    if (
      typeof e.elementId !== "string" ||
      !Array.isArray(e.semantic_aliases) ||
      typeof e.required_route !== "string"
    ) {
      throw new Error("UI element registry entry is invalid.");
    }
    return e as unknown as UIElementDef;
  });
}

function ensureVersion(parsed: unknown, registryName: string) {
  const version = (parsed as { version?: unknown })?.version;
  if (typeof version !== "number") {
    throw new Error(`${registryName} must declare a numeric version.`);
  }
}

export function ensureRegistryVersion(parsed: unknown, registryName: string) {
  ensureVersion(parsed, registryName);
}
