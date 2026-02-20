/**
 * adminToolHandlers.ts
 *
 * Admin-agent tool dispatcher.  Maps tool names to their server-side handlers.
 * Called from POST /api/admin/tool-call — separate from the voice assistant's
 * toolHandler.ts so the voice path is never affected.
 */

import { z } from "zod";
import {
  enrichBusinessProfile,
  type EnrichBusinessProfileResult,
} from "../services/enrichBusinessProfile.js";

// ---------------------------------------------------------------------------
// Per-tool Zod schemas — runtime validation before any service call
// ---------------------------------------------------------------------------

const enrichBusinessProfileSchema = z.object({
  platformId: z.string().uuid("platformId must be a valid UUID"),
  maxReviews: z.number().int().min(1).max(500).optional(),
  force: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch an admin tool call by name.
 * Validates args at runtime before forwarding to the service layer.
 *
 * Supported tools:
 *   - enrich_business_profile  { platformId, maxReviews?, force? }
 */
export async function handleAdminToolCall(
  toolName: string,
  args: unknown,
  context?: { adminId?: string; ip?: string },
): Promise<unknown> {
  switch (toolName) {
    case "enrich_business_profile": {
      const parsed = enrichBusinessProfileSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid args for ${toolName}: ${parsed.error.message}`);
      }
      // Audit log — no sensitive payload, just the operation and who triggered it
      console.log(
        `[AdminTool] enrich_business_profile triggered`,
        `platformId=${parsed.data.platformId}`,
        `maxReviews=${parsed.data.maxReviews ?? 100}`,
        `force=${parsed.data.force ?? false}`,
        `adminId=${context?.adminId ?? "unknown"}`,
        `ip=${context?.ip ?? "unknown"}`,
      );
      return enrichBusinessProfile(parsed.data);
    }

    default:
      throw new Error(`Unknown admin tool: ${toolName}`);
  }
}

/** Tool definitions for admin function-calling (OpenAI-compatible schema). */
export const ADMIN_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "enrich_business_profile",
      description:
        "Fetch raw SerpApi place profile and paginated reviews for a business and store them as immutable snapshots. Admin-only. Requires an existing platform_business_map row.",
      parameters: {
        type: "object",
        properties: {
          platformId: {
            type: "string",
            format: "uuid",
            description: "UUID from platform_business_map.platform_id",
          },
          maxReviews: {
            type: "integer",
            description: "Maximum reviews to fetch (1–500, default 100)",
            minimum: 1,
            maximum: 500,
          },
          force: {
            type: "boolean",
            description:
              "Re-enrich even if a snapshot already exists (default false)",
          },
        },
        required: ["platformId"],
      },
    },
  },
] as const;

export type AdminToolResult = EnrichBusinessProfileResult | { error: string };
