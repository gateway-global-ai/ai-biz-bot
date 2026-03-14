import React, { lazy } from "react";

export const ViewRegistry = {
  OSHomeView: lazy(() => import("./shared/OSHomeView")),
  AdminHomeView: lazy(() => import("./admin/AdminHomeView")),
  AdminOnboardingView: lazy(() => import("./admin/AdminOnboardingView")),
  AdminCandidateSelectionView: lazy(
    () => import("./admin/AdminCandidateSelectionView")
  ),
  WorkspaceRouterView: lazy(() => import("./mission-control/MissionControlView")),
  AgentConfigView: lazy(() => import("./agent-builder/AgentConfigView")),
  BehaviorControllerView: lazy(
    () => import("./agent-builder/BehaviorControllerView")
  ),
  SupportEntryView: lazy(() => import("./support/SupportEntryView")),
  SystemSupportView: lazy(() => import("./support/SystemSupportView")),
  SystemTelemetryView: lazy(() => import("./system/SystemTelemetryView")),
  NotFoundView: lazy(() => import("./shared/NotFoundView")),
};

export type ViewRegistryKey = keyof typeof ViewRegistry;

export function getViewComponent(key: string) {
  return ViewRegistry[key as ViewRegistryKey] ?? ViewRegistry.NotFoundView;
}
