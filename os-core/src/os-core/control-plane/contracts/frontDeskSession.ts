export type FrontDeskEntrySource = "qr" | "sms_link" | "website" | "phone";

export type FrontDeskIdentityState =
  | "unverified"
  | "otp_pending"
  | "verified"
  | "verification_failed";

export type FrontDeskWorkflowState =
  | "NEW"
  | "AI_ACTIVE"
  | "WAITING_FOR_CUSTOMER"
  | "ESCALATION_REQUESTED"
  | "OPERATOR_JOINED"
  | "RESOLVED";

export type FrontDeskAssistMode = "observe" | "coPilot" | "takeover";

export interface FrontDeskCommunicationEvent {
  timestamp: string;
  channel: "sms" | "voice" | "web" | "internal";
  direction: "inbound" | "outbound" | "system";
  summary: string;
}

export interface FrontDeskSession {
  sessionId: string;
  tenantId: string;
  siteConfigId: string;
  entrySource: FrontDeskEntrySource;
  customerId?: string;
  identityState: FrontDeskIdentityState;
  workflowState: FrontDeskWorkflowState;
  assignedAgentId: string;
  escalationState: "none" | "requested" | "active" | "closed";
  assistMode: FrontDeskAssistMode;
  transcriptPreview: string;
  humanAvailable: boolean;
  customerVerified: boolean;
  arrivalTime?: string;
  waitMinutes?: number;
  appointmentConfirmed: boolean;
  outcomeType?: "lead" | "booking" | "task" | "resolved_no_action" | "escalated";
  workflowFlags?: Record<string, boolean>;
  resolvedAt?: string;
  resolvedBy?: string;
  communicationHistory: FrontDeskCommunicationEvent[];
  lastActivityAt: string;
}

export function getFrontDeskQueuePriority(session: FrontDeskSession): number {
  if (session.workflowState === "ESCALATION_REQUESTED") return 1;
  if (session.workflowState === "OPERATOR_JOINED") return 2;
  if (session.workflowState === "AI_ACTIVE") return 3;
  if (session.workflowState === "WAITING_FOR_CUSTOMER") return 4;
  if (session.workflowState === "NEW") return 5;
  return 6;
}
