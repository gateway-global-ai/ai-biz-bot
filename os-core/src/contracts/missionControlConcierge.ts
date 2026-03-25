/**
 * Minimal concierge surface contract for mission-control views.
 * Host apps map their real ConciergePanel (client) onto this shape via injection.
 */

import type { ComponentType } from "react";

export interface MissionControlBusinessContext {
  id: string;
  placeId: string;
  name: string;
  address: string;
  hours?: string | string[];
  phone?: string;
  services?: string[];
}

export interface MissionControlAgentConfig {
  name?: string;
  role: string;
  personality: string;
  objectives: string[];
  constraints: string[];
}

export interface MissionControlVoiceConfig {
  mode: "clear_voice" | "standard_ptt";
  latency: "ultra-low" | "standard";
  bufferDelay?: number;
  silenceThreshold?: number;
  enableAnalysis: {
    emotion: boolean;
    sentiment: boolean;
    disc: boolean;
  };
  analysis?: {
    emotion: boolean;
    sentiment: boolean;
    disc: boolean;
  };
  model: string;
  voiceName?: string;
}

/** Props MissionControlView passes into the injected concierge component. */
export interface MissionControlConciergePanelProps {
  isOpen: boolean;
  onClose: () => void;
  layoutMode?: "floating" | "fixed" | "fullscreen";
  onCycleLayout?: () => void;
  business: MissionControlBusinessContext;
  agent: MissionControlAgentConfig;
  voiceConfig: MissionControlVoiceConfig;
  agentName?: string;
  variant?: "default" | "sovereign";
  ownerMode?: boolean;
  showOwnerControls?: boolean;
  isAuthenticated?: boolean;
  className?: string;
}

export type MissionControlConciergePanelComponent =
  ComponentType<MissionControlConciergePanelProps>;
