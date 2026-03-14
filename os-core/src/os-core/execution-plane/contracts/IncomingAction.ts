export type GeminiIncomingAction =
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "switch_view";
      args: {
        target_logical_route: string;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "highlight_ui_element";
      args: {
        element_id: string;
        duration_ms: number;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "focus_behavior_control";
      args: {
        target_setting: "dominance" | "safe_mode" | "grounding";
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "request_human_assistance";
      args: {};
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "draft_support_ticket";
      args: {
        ticket_body: string;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "mutate_agent_behavior";
      args: {
        setting: "dominance" | "grounding" | "safe_mode";
        value: number | string;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "mutate_chaos_settings";
      args: {
        enabled: boolean;
        drop_rate: number;
        max_latency_ms: number;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "ground_business_candidates";
      args: {
        search_name: string;
        city?: string;
        state?: string;
        zip?: string;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "ground_business_candidates";
      args: {
        search_name: string;
        city?: string;
        state?: string;
        zip?: string;
      };
    }
  | {
      timestamp: string;
      target_agent_id: string;
      tool_name: "stage_business_onboarding";
      args: {
        business_name: string;
        city?: string;
        state?: string;
        zip?: string;
        contact_email?: string;
        category?: string;
      };
    };
