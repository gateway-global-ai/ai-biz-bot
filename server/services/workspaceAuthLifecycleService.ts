import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../db";
import { workspaceConfigurations } from "@shared/schema";
import { createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "../mcp/googleWorkspace";
import type { WorkspaceAuthHealth, WorkspaceAuthState } from "@shared/workspaceAuthLifecycle";

const EXPIRING_SOON_MS = 15 * 60 * 1000;

export type WorkspaceAdapterMode = "external_mcp" | "transitional_legacy";

function adapterMode(): WorkspaceAdapterMode {
  return process.env.WORKSPACE_MCP_ADAPTER_MODE === "external_mcp"
    ? "external_mcp"
    : "transitional_legacy";
}

function toIso(date?: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function secondsUntil(date?: Date | null): number | null {
  if (!date) return null;
  return Math.round((date.getTime() - Date.now()) / 1000);
}

function classifyAuthError(message: string): {
  authState: WorkspaceAuthState;
  authErrorCode: string;
  recoverable: boolean;
} {
  const lower = message.toLowerCase();
  if (lower.includes("workspace_mcp_url_missing")) {
    return { authState: "adapter_unconfigured", authErrorCode: "workspace_mcp_url_missing", recoverable: true };
  }
  if (lower.includes("workspace_mcp_bearer_missing") || lower.includes("credentials_missing")) {
    return { authState: "missing_credentials", authErrorCode: "workspace_credentials_missing", recoverable: true };
  }
  if (lower.includes("invalid_grant") || lower.includes("invalid credentials") || lower.includes("authenticate") || lower.includes("401") || lower.includes("403")) {
    return { authState: "invalid_credentials", authErrorCode: "invalid_credentials", recoverable: true };
  }
  if (lower.includes("refresh")) {
    return { authState: "refresh_failed", authErrorCode: "refresh_failed", recoverable: true };
  }
  return { authState: "transport_error", authErrorCode: "transport_error", recoverable: true };
}

export function computeTokenState(tokenExpiry: Date | null | undefined): WorkspaceAuthState {
  if (!tokenExpiry) return "unknown";
  const delta = tokenExpiry.getTime() - Date.now();
  if (delta <= 0) return "expired";
  if (delta <= EXPIRING_SOON_MS) return "expiring_soon";
  return "valid";
}

async function loadWorkspaceConfig(siteConfigId: string) {
  return db.query.workspaceConfigurations.findFirst({
    where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
  });
}

async function updateWorkspaceAuthState(siteConfigId: string, patch: Partial<typeof workspaceConfigurations.$inferInsert>) {
  await db
    .update(workspaceConfigurations)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
}

function rowCredentials(row: Awaited<ReturnType<typeof loadWorkspaceConfig>>): GoogleWorkspaceCredentials | null {
  if (!row?.accessToken) return null;
  return {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    expiryDate: row.tokenExpiry ? row.tokenExpiry.getTime() : undefined,
  };
}

async function validateExternalMcp(params: {
  siteConfigId: string;
  row: Awaited<ReturnType<typeof loadWorkspaceConfig>>;
  forceCheck?: boolean;
}): Promise<WorkspaceAuthHealth> {
  const externalUrl = process.env.WORKSPACE_MCP_URL?.trim() || null;
  const usingBearerOverride = Boolean(process.env.WORKSPACE_MCP_BEARER_TOKEN?.trim());
  const tokenExpiry = params.row?.tokenExpiry ?? null;
  const tokenState = computeTokenState(tokenExpiry);
  const hasStoredCredentials = Boolean(params.row?.accessToken);

  if (!externalUrl) {
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: "adapter_unconfigured",
      authErrorCode: "workspace_mcp_url_missing",
      authErrorDetail: "External Workspace MCP URL is not configured.",
      degradedReason: "external_workspace_mcp_unconfigured",
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "external_mcp",
      authState: "adapter_unconfigured",
      configured: false,
      hasStoredCredentials,
      usingBearerOverride,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      authErrorCode: "workspace_mcp_url_missing",
      authErrorDetail: "External Workspace MCP URL is not configured.",
      degradedReason: "external_workspace_mcp_unconfigured",
      fallbackAvailable: Boolean(params.row?.refreshToken),
      recoverable: true,
      externalUrl,
    };
  }

  const bearer = process.env.WORKSPACE_MCP_BEARER_TOKEN?.trim() || params.row?.accessToken || null;
  if (!bearer) {
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: "missing_credentials",
      authErrorCode: "workspace_mcp_bearer_missing",
      authErrorDetail: "No bearer token available for external Workspace MCP.",
      degradedReason: "external_workspace_mcp_missing_bearer",
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "external_mcp",
      authState: "missing_credentials",
      configured: true,
      hasStoredCredentials,
      usingBearerOverride,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      authErrorCode: "workspace_mcp_bearer_missing",
      authErrorDetail: "No bearer token available for external Workspace MCP.",
      degradedReason: "external_workspace_mcp_missing_bearer",
      fallbackAvailable: Boolean(params.row?.refreshToken),
      recoverable: true,
      externalUrl,
    };
  }

  if (!usingBearerOverride && tokenState === "expired") {
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: "expired",
      authErrorCode: "workspace_access_token_expired",
      authErrorDetail: "Stored Workspace access token is expired.",
      degradedReason: "token_expired",
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "external_mcp",
      authState: "expired",
      configured: true,
      hasStoredCredentials,
      usingBearerOverride,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      authErrorCode: "workspace_access_token_expired",
      authErrorDetail: "Stored Workspace access token is expired.",
      degradedReason: "token_expired",
      fallbackAvailable: Boolean(params.row?.refreshToken),
      recoverable: true,
      externalUrl,
    };
  }

  try {
    const response = await fetch(externalUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method: "tools/list",
        params: {},
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    if (!response.ok || payload?.error) {
      const classified = classifyAuthError(payload?.error?.message ?? `workspace_mcp_http_${response.status}`);
      await updateWorkspaceAuthState(params.siteConfigId, {
        authState: classified.authState,
        authErrorCode: classified.authErrorCode,
        authErrorDetail: payload?.error?.message ?? `workspace_mcp_http_${response.status}`,
        degradedReason: "external_workspace_probe_failed",
        lastAuthCheckedAt: new Date(),
      });
      return {
        mode: "external_mcp",
        authState: classified.authState,
        configured: true,
        hasStoredCredentials,
        usingBearerOverride,
        tokenExpiresAt: toIso(tokenExpiry),
        tokenExpiresInSec: secondsUntil(tokenExpiry),
        lastCheckedAt: new Date().toISOString(),
        authErrorCode: classified.authErrorCode,
        authErrorDetail: payload?.error?.message ?? `workspace_mcp_http_${response.status}`,
        degradedReason: "external_workspace_probe_failed",
        fallbackAvailable: Boolean(params.row?.refreshToken),
        recoverable: classified.recoverable,
        externalUrl,
      };
    }

    const finalState: WorkspaceAuthState = usingBearerOverride ? "bearer_override" : tokenState;
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: finalState,
      authErrorCode: null,
      authErrorDetail: null,
      degradedReason: null,
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "external_mcp",
      authState: finalState,
      configured: true,
      hasStoredCredentials,
      usingBearerOverride,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      fallbackAvailable: Boolean(params.row?.refreshToken),
      recoverable: false,
      externalUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const classified = classifyAuthError(message);
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: classified.authState,
      authErrorCode: classified.authErrorCode,
      authErrorDetail: message,
      degradedReason: "external_workspace_transport_error",
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "external_mcp",
      authState: classified.authState,
      configured: true,
      hasStoredCredentials,
      usingBearerOverride,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      authErrorCode: classified.authErrorCode,
      authErrorDetail: message,
      degradedReason: "external_workspace_transport_error",
      fallbackAvailable: Boolean(params.row?.refreshToken),
      recoverable: classified.recoverable,
      externalUrl,
    };
  }
}

async function validateTransitionalLegacy(params: {
  siteConfigId: string;
  row: Awaited<ReturnType<typeof loadWorkspaceConfig>>;
  forceRefresh?: boolean;
}): Promise<WorkspaceAuthHealth> {
  const credentials = rowCredentials(params.row);
  const hasStoredCredentials = Boolean(credentials?.accessToken);
  const tokenExpiry = params.row?.tokenExpiry ?? null;

  if (!credentials) {
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: "missing_credentials",
      authErrorCode: "workspace_credentials_missing",
      authErrorDetail: "No stored Workspace OAuth credentials.",
      degradedReason: "transitional_workspace_missing_credentials",
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "transitional_legacy",
      authState: "missing_credentials",
      configured: true,
      hasStoredCredentials,
      usingBearerOverride: false,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      authErrorCode: "workspace_credentials_missing",
      authErrorDetail: "No stored Workspace OAuth credentials.",
      degradedReason: "transitional_workspace_missing_credentials",
      fallbackAvailable: false,
      recoverable: true,
      externalUrl: null,
    };
  }

  const service = createGoogleWorkspaceService(credentials);
  try {
    await updateWorkspaceAuthState(params.siteConfigId, {
      lastAuthRefreshAttemptAt: new Date(),
    });

    const fresh = await service.ensureFreshCredentials();
    if (!fresh?.accessToken) {
      throw new Error("refresh_failed_no_access_token");
    }

    const result = await service.listCalendarEvents(1);
    if (!result.success) {
      throw new Error(result.error ?? "workspace_validation_failed");
    }

    const refreshedExpiry = fresh.expiryDate ? new Date(fresh.expiryDate) : tokenExpiry;
    const finalState = computeTokenState(refreshedExpiry);
    await updateWorkspaceAuthState(params.siteConfigId, {
      accessToken: fresh.accessToken,
      refreshToken: fresh.refreshToken ?? params.row?.refreshToken ?? null,
      tokenExpiry: refreshedExpiry,
      authState: finalState,
      authErrorCode: null,
      authErrorDetail: null,
      degradedReason: null,
      lastAuthCheckedAt: new Date(),
      lastAuthRefreshSucceededAt: new Date(),
    });

    return {
      mode: "transitional_legacy",
      authState: finalState,
      configured: true,
      hasStoredCredentials: true,
      usingBearerOverride: false,
      tokenExpiresAt: toIso(refreshedExpiry),
      tokenExpiresInSec: secondsUntil(refreshedExpiry),
      lastCheckedAt: new Date().toISOString(),
      lastRefreshAttemptAt: new Date().toISOString(),
      lastRefreshSucceededAt: new Date().toISOString(),
      fallbackAvailable: false,
      recoverable: false,
      externalUrl: process.env.WORKSPACE_MCP_URL?.trim() || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const classified = classifyAuthError(message);
    await updateWorkspaceAuthState(params.siteConfigId, {
      authState: classified.authState,
      authErrorCode: classified.authErrorCode,
      authErrorDetail: message,
      degradedReason: "transitional_workspace_auth_failed",
      lastAuthCheckedAt: new Date(),
    });
    return {
      mode: "transitional_legacy",
      authState: classified.authState,
      configured: true,
      hasStoredCredentials,
      usingBearerOverride: false,
      tokenExpiresAt: toIso(tokenExpiry),
      tokenExpiresInSec: secondsUntil(tokenExpiry),
      lastCheckedAt: new Date().toISOString(),
      lastRefreshAttemptAt: new Date().toISOString(),
      authErrorCode: classified.authErrorCode,
      authErrorDetail: message,
      degradedReason: "transitional_workspace_auth_failed",
      fallbackAvailable: false,
      recoverable: classified.recoverable,
      externalUrl: process.env.WORKSPACE_MCP_URL?.trim() || null,
    };
  }
}

export async function getWorkspaceAuthHealth(siteConfigId: string): Promise<WorkspaceAuthHealth> {
  const row = await loadWorkspaceConfig(siteConfigId);
  if (adapterMode() === "external_mcp") {
    return validateExternalMcp({ siteConfigId, row });
  }
  return validateTransitionalLegacy({ siteConfigId, row });
}

export async function refreshWorkspaceAuthHealth(siteConfigId: string): Promise<WorkspaceAuthHealth> {
  const row = await loadWorkspaceConfig(siteConfigId);
  if (adapterMode() === "external_mcp") {
    return validateExternalMcp({ siteConfigId, row, forceCheck: true });
  }
  return validateTransitionalLegacy({ siteConfigId, row, forceRefresh: true });
}
