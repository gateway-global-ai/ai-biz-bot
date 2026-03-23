import { z } from "zod";

export const frontDeskEntrySourceSchema = z.enum(["web_chat", "voice_call", "sms", "qr", "manual"]);
export const frontDeskVerificationStateSchema = z.enum([
  "unknown",
  "required",
  "otp_sent",
  "verified",
  "failed",
  "bypass_allowed",
  "unverified",
]);
export const frontDeskWorkflowStateSchema = z.enum([
  "NEW",
  "AI_ACTIVE",
  "WAITING_FOR_CUSTOMER",
  "ESCALATION_REQUESTED",
  "OPERATOR_JOINED",
  "RESOLVED",
]);
export const frontDeskAssistModeSchema = z.enum(["none", "observe", "coPilot", "takeover"]);
export const frontDeskOutcomeTypeSchema = z.enum([
  "booking",
  "lead",
  "task",
  "escalated",
  "resolved_no_action",
]);

export const frontDeskSessionSchema = z.object({
  sessionId: z.string().min(1),
  siteConfigId: z.string().min(1),
  customerId: z.string().nullable().optional(),
  entrySource: frontDeskEntrySourceSchema,
  verificationState: frontDeskVerificationStateSchema,
  workflowState: frontDeskWorkflowStateSchema,
  escalationState: z.string().min(1).default("none"),
  operatorJoined: z.boolean().default(false),
  assistMode: frontDeskAssistModeSchema.default("none"),
  transcriptPreview: z.string().optional(),
  workflowFlags: z
    .object({
      newPatientIntakeComplete: z.boolean().optional(),
      insuranceInfoPendingReview: z.boolean().optional(),
      painAssessmentComplete: z.boolean().optional(),
      consentFormsPending: z.boolean().optional(),
      consentFormsComplete: z.boolean().optional(),
      appointmentBookingRequested: z.boolean().optional(),
      rescheduleRequested: z.boolean().optional(),
      verificationRequired: z.boolean().optional(),
      otpSent: z.boolean().optional(),
      verificationFailed: z.boolean().optional(),
      verificationBypassAllowed: z.boolean().optional(),
      verificationVerified: z.boolean().optional(),
      idDocumentVerified: z.boolean().optional(),
      selfiePhotoMatchVerified: z.boolean().optional(),
      insuranceCardVerified: z.boolean().optional(),
      identityVerified: z.boolean().optional(),
      insuranceCaptured: z.boolean().optional(),
      attorneyCaptured: z.boolean().optional(),
      consentSigned: z.boolean().optional(),
    })
    .optional(),
  outcomeType: frontDeskOutcomeTypeSchema.optional(),
  resolvedAt: z.string().datetime().optional(),
  resolvedBy: z.string().optional(),
  lastActivityAt: z.string().datetime(),
});

export type FrontDeskSession = z.infer<typeof frontDeskSessionSchema>;

export const frontDeskOutcomeEventTypeSchema = z.enum([
  "frontdesk.assist_joined",
  "frontdesk.assist_ended",
  "frontdesk.outcome_captured",
]);

export const frontDeskOutcomeEventRequestSchema = z.object({
  sessionId: z.string().min(1),
  eventType: frontDeskOutcomeEventTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

export type FrontDeskOutcomeEventRequest = z.infer<typeof frontDeskOutcomeEventRequestSchema>;
