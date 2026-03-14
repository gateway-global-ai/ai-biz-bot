export interface NativeAgentDef {
  agentId: string;
  displayName: string;
  role: string;
  safeModeDefault: boolean;
  description: string;
}

export const NATIVE_AGENTS: NativeAgentDef[] = [
  {
    agentId: "ClearVoiceOSNativeAgent",
    displayName: "ClearVoice OS",
    role: "native_os_guide",
    safeModeDefault: true,
    description:
      "Default governed runtime guide for shell navigation, route explanation, and PTT-first interaction.",
  },
  {
    agentId: "ClearVoiceOSSupportAgent",
    displayName: "OS Support",
    role: "developer_enterprise_support",
    safeModeDefault: true,
    description:
      "Gateway-hosted installation and enterprise support companion reachable from docs and QR entry points.",
  },
  {
    agentId: "ClearVoiceOSAdminPilotAgent",
    displayName: "OS Pilot",
    role: "admin_pilot",
    safeModeDefault: false,
    description:
      "Non-strict pilot agent used to validate governed incoming route actions without bypassing policy enforcement.",
  },
];
