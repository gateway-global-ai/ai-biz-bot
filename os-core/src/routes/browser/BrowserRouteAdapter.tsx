import React, { Suspense } from "react";
import { Route, Switch } from "wouter";

import { getViewComponent, ViewRegistry } from "../../views/ViewRegistry";
import { loadLogicalRoutes } from "../../os-core/control-plane/registry-loader/loadLogicalRoutes";
import { loadViews } from "../../os-core/control-plane/registry-loader/loadViews";

function assertRouteViewIntegrity() {
  const logicalRoutes = loadLogicalRoutes();
  const viewDefs = loadViews();
  const viewLookup = new Map(viewDefs.views.map((view) => [view.viewId, view]));

  for (const route of logicalRoutes.routes) {
    const linkedView = viewLookup.get(route.linkedViewId);
    if (!linkedView) {
      throw new Error(
        `Route ${route.routeId} references unknown view ${route.linkedViewId}.`
      );
    }

    if (!linkedView.allowedModes.includes(route.mode)) {
      throw new Error(
        `Route ${route.routeId} uses mode ${route.mode}, but view ${linkedView.viewId} allows ${linkedView.allowedModes.join(", ")}.`
      );
    }
  }
}

export function BrowserRouteAdapter() {
  assertRouteViewIntegrity();
  const logicalRoutes = loadLogicalRoutes();
  const viewDefs = loadViews();
  const viewLookup = new Map(
    viewDefs.views.map((view) => [view.viewId, view.lazyImportKey])
  );

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Loading OS module...
        </div>
      }
    >
      <Switch>
        {logicalRoutes.routes
          .filter((route) => route.optionalBrowserPath)
          .map((route) => {
            const lazyImportKey = viewLookup.get(route.linkedViewId);
            const component = lazyImportKey
              ? getViewComponent(lazyImportKey)
              : ViewRegistry.NotFoundView;

            return (
              <Route
                key={route.routeId}
                path={route.optionalBrowserPath as string}
                component={component}
              />
            );
          })}
        <Route component={ViewRegistry.NotFoundView} />
      </Switch>
    </Suspense>
  );
}
