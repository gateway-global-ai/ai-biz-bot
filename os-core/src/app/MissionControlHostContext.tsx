import React, { createContext, useContext } from "react";
import type { MissionControlConciergePanelComponent } from "../contracts/missionControlConcierge";

export interface MissionControlHostValue {
  ConciergePanel?: MissionControlConciergePanelComponent;
}

const MissionControlHostContext = createContext<MissionControlHostValue>({});

export function MissionControlHostProvider({
  children,
  conciergePanel,
}: {
  children: React.ReactNode;
  conciergePanel?: MissionControlConciergePanelComponent;
}) {
  return (
    <MissionControlHostContext.Provider
      value={{ ConciergePanel: conciergePanel }}
    >
      {children}
    </MissionControlHostContext.Provider>
  );
}

export function useMissionControlHost(): MissionControlHostValue {
  return useContext(MissionControlHostContext);
}
