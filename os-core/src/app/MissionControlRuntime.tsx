import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";

import type { MissionControlConciergePanelComponent } from "../contracts/missionControlConcierge";
import { AppProviders, queryClient } from "./AppProviders";
import { MissionControlHostProvider } from "./MissionControlHostContext";
import { configureBridgeSettings } from "../os-core/execution-plane/gemini-live-engine/bridgeRuntime";
import { EventLogProvider } from "../os-core/observability/EventLogProvider";
import { ContextBar } from "../shell/ContextBar";
import { BrowserRouteAdapter } from "../routes/browser/BrowserRouteAdapter";
import { ConversationalNavController } from "../shell/ConversationalNavController";
import { InspectorPanel } from "../shell/InspectorPanel";
import {
  SharedCanvasProvider,
  useSharedCanvasDispatch,
} from "../shell/SharedCanvasProvider";

function MissionControlBootstrap() {
  const dispatch = useSharedCanvasDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const siteConfigId =
      params.get("siteConfigId") || "0a1df8ad-edcf-4f35-95be-e0f304b14b97";
    const agentId =
      params.get("agentId") || "ClearVoiceOSAdminPilotAgent";

    // If mission-control is opened with query params, route directly to the
    // governed workspace view so users don't land on OS home by mistake.
    if (window.location.pathname === "/mission-control" && params.get("siteConfigId")) {
      window.location.replace(`/mission-control/workspace/${encodeURIComponent(siteConfigId)}`);
      return;
    }

    configureBridgeSettings({ mode: "local" });
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: {
        key: "agentId",
        value: agentId,
      },
    });
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: {
        key: "siteConfigId",
        value: siteConfigId,
      },
    });
  }, [dispatch]);

  return null;
}

function MissionControlShell({
  conciergePanel,
}: {
  conciergePanel?: MissionControlConciergePanelComponent;
}) {
  const [inspectorOpen, setInspectorOpen] = React.useState(false);

  return (
    <MissionControlHostProvider conciergePanel={conciergePanel}>
      <EventLogProvider>
        <SharedCanvasProvider>
          <MissionControlBootstrap />
          <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-50">
            <ContextBar onToggleInspector={() => setInspectorOpen((open) => !open)} />
            <main className="relative flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <BrowserRouteAdapter />
              </div>
              <ConversationalNavController />
              <InspectorPanel
                open={inspectorOpen}
                onClose={() => setInspectorOpen(false)}
              />
            </main>
          </div>
        </SharedCanvasProvider>
      </EventLogProvider>
    </MissionControlHostProvider>
  );
}

export interface MissionControlRuntimeProps {
  conciergePanel?: MissionControlConciergePanelComponent;
}

export default function MissionControlRuntime({
  conciergePanel,
}: MissionControlRuntimeProps = {}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Router base="/mission-control">
          <MissionControlShell conciergePanel={conciergePanel} />
        </Router>
      </AppProviders>
    </QueryClientProvider>
  );
}
