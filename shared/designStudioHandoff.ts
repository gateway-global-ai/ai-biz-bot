/**
 * Design Studio handoff — typed context when the primary agent transfers
 * the business owner to Chad (design_studio). See AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md §5.
 */

import { z } from "zod";
import { designIntentSummarySchema } from "./designStudioState";

export const DESIGN_HANDOFF_REASONS = ["user_requested_design"] as const;
export type DesignHandoffReason = (typeof DESIGN_HANDOFF_REASONS)[number];

export type DesignStudioEntrySurface = "voice" | "text";

export const designStudioHandoffRequestSchema = z
  .object({
    handoffReason: z.enum(["user_requested_design"]),
    intentSummary: designIntentSummarySchema,
    referringAgentId: z.string().min(1),
    siteConfigId: z.string().min(1),
    designProjectId: z.string().min(1).optional(),
    entrySurface: z.enum(["voice", "text"]),
  })
  .strict();

export type DesignHandoffPayload = z.infer<typeof designStudioHandoffRequestSchema>;

export function isDesignHandoffPayload(value: unknown): value is DesignHandoffPayload {
  return designStudioHandoffRequestSchema.safeParse(value).success;
}
