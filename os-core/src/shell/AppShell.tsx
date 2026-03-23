import React, { useState } from "react";

import { EventLogProvider } from "../os-core/observability/EventLogProvider";
import { ContextBar } from "./ContextBar";
import { BrowserRouteAdapter } from "../routes/browser/BrowserRouteAdapter";
import { ConversationalNavController } from "./ConversationalNavController";
import { InspectorPanel } from "./InspectorPanel";
import { SharedCanvasProvider } from "./SharedCanvasProvider";

export function AppShell() {
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <EventLogProvider>
      <SharedCanvasProvider>
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
  );
}
