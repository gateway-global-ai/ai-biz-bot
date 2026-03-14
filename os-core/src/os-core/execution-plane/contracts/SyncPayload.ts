export type GeminiSyncUpdateType =
  | "BEHAVIORAL_SLIDER"
  | "SAFE_MODE_PROFILE"
  | "GROUNDING_POLICY"
  | "ROUTE_NAVIGATION";

export interface GeminiOsState {
  shell_mode:
    | "menu"
    | "view"
    | "confirmation"
    | "refusal"
    | "ptt_first"
    | "result";
  active_route_id: string;
  active_view_id: string;
  breadcrumbs: string[];
}

export interface GeminiContextSyncPayload {
  timestamp: string;
  target_agent_id: string;
  update_type: GeminiSyncUpdateType;
  changes?: {
    parameter: string;
    previous_value: number | string;
    new_value: number | string;
  };
  os_state: GeminiOsState;
  system_injection: string;
}
