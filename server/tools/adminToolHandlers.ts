/**
 * adminToolHandlers.ts
 *
 * Admin-agent tool dispatcher.  Maps tool names to their server-side handlers.
 * Called from POST /api/admin/tool-call — separate from the voice assistant's
 * toolHandler.ts so the voice path is never affected.
 */

import {
  enrichBusinessProfile,
  type EnrichBusinessProfileInput,
  type EnrichBusinessProfileResult,
} from "../services/enrichBusinessProfile.js";

/**
 * Dispatch an admin tool call by name.
 *
 * Supported tools:
 *   - enrich_business_profile  { platformId, maxReviews?, force? }
 */
export async function handleAdminToolCall(
  toolName: string,
  args: unknown,
): Promise<unknown> {
  switch (toolName) {
    case "enrich_business_profile":
      return enrichBusinessProfile(args as EnrichBusinessProfileInput);

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
