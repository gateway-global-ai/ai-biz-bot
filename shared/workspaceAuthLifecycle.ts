import { z } from "zod";

export const WORKSPACE_AUTH_STATES = [
  "unknown",
  "missing_credentials",
  "adapter_unconfigured",
  "valid",
  "expiring_soon",
  "expired",
  "refresh_failed",
  "invalid_credentials",
  "transport_error",
  "degraded",
  "bearer_override",
] as const;

export type WorkspaceAuthState = (typeof WORKSPACE_AUTH_STATES)[number];

export const WorkspaceAuthHealthSchema = z.object({
  mode: z.enum(["external_mcp", "transitional_legacy"]),
  authState: z.enum(WORKSPACE_AUTH_STATES),
  configured: z.boolean(),
  hasStoredCredentials: z.boolean(),
  usingBearerOverride: z.boolean().default(false),
  tokenExpiresAt: z.string().datetime().nullable().optional(),
  tokenExpiresInSec: z.number().int().nullable().optional(),
  lastCheckedAt: z.string().datetime().nullable().optional(),
  lastRefreshAttemptAt: z.string().datetime().nullable().optional(),
  lastRefreshSucceededAt: z.string().datetime().nullable().optional(),
  authErrorCode: z.string().nullable().optional(),
  authErrorDetail: z.string().nullable().optional(),
  degradedReason: z.string().nullable().optional(),
  fallbackAvailable: z.boolean().default(false),
  recoverable: z.boolean().default(false),
  externalUrl: z.string().nullable().optional(),
});

export type WorkspaceAuthHealth = z.infer<typeof WorkspaceAuthHealthSchema>;
