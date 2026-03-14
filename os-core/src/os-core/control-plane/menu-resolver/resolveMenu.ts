import type { LogicalRouteDef } from "../registry-loader/types";
import { evaluatePolicyGate } from "../policy-registry/evaluatePolicyGate";

export interface MenuOption {
  label: string;
  routeId: string;
  browserPath: string;
}

export interface MenuResolution {
  breadcrumb: string[];
  options: MenuOption[];
  suggestedActions: string[];
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelForRoute(route: LogicalRouteDef): string {
  const [, leaf = route.domain] = route.routeId.split(".");
  return titleCase(leaf);
}

function routeHasRequiredContext(
  route: LogicalRouteDef,
  contextKeys: Record<string, string>
): boolean {
  return route.requiredContextKeys.every((key) => Boolean(contextKeys[key]));
}

function materializeBrowserPath(
  path: string,
  contextKeys: Record<string, string>
): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    return contextKeys[key] ?? `:${key}`;
  });
}

export function resolveMenu(
  currentRouteId: string,
  routes: LogicalRouteDef[],
  contextKeys: Record<string, string> = {}
): MenuResolution {
  const currentRoute = routes.find((route) => route.routeId === currentRouteId);
  const rootOptions = routes
    .filter(
      (route) =>
        route.routeId !== currentRouteId &&
        Boolean(route.optionalBrowserPath) &&
        evaluatePolicyGate(route.policyGate) &&
        routeHasRequiredContext(route, contextKeys)
    )
    .map((route) => ({
      label: labelForRoute(route),
      routeId: route.routeId,
      browserPath: materializeBrowserPath(route.optionalBrowserPath as string, contextKeys),
    }));

  if (!currentRoute) {
    return {
      breadcrumb: ["Home"],
      options: rootOptions,
      suggestedActions: ["Review Available Routes"],
    };
  }

  const breadcrumb = ["Home"];
  if (currentRoute.domain !== "os") {
    breadcrumb.push(titleCase(currentRoute.domain));
  }
  const routeParts = currentRoute.routeId.split(".");
  if (routeParts.length > 1) {
    breadcrumb.push(titleCase(routeParts[1]));
  }

  const suggestedActions =
    currentRoute.allowedActions && currentRoute.allowedActions.length > 0
      ? currentRoute.allowedActions
      : ["Review Next Action"];

  return {
    breadcrumb,
    options: rootOptions,
    suggestedActions,
  };
}
