import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../db";
import { workspaceConfigurations } from "@shared/schema";
import { createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "../mcp/googleWorkspace";
import type { WorkspaceAuthHealth, WorkspaceAuthState } from "@shared/workspaceAuthLifecycle";
import {
  getWorkspaceMcpAction,
  type WorkspaceMcpActionRegistryEntry,
} from "./workspaceMcpActionRegistry";
import { getWorkspaceAuthHealth, refreshWorkspaceAuthHealth } from "./workspaceAuthLifecycleService";

export type WorkspaceAdapterMode = "external_mcp" | "transitional_legacy";

export interface WorkspaceActionExecutionResult {
  ok: boolean;
  provider: WorkspaceAdapterMode;
  toolName: string;
  data?: unknown;
  error?: string;
  authState?: WorkspaceAuthState;
  recoverable?: boolean;
  degradedReason?: string | null;
  requiresApproval?: boolean;
  evidenceArtifacts: Array<{
    kind: string;
    uri: string;
    metadata: Record<string, unknown>;
  }>;
}

function adapterMode(): WorkspaceAdapterMode {
  return process.env.WORKSPACE_MCP_ADAPTER_MODE === "external_mcp"
    ? "external_mcp"
    : "transitional_legacy";
}

async function getWorkspaceCredentials(siteConfigId: string): Promise<GoogleWorkspaceCredentials | null> {
  const row = await db.query.workspaceConfigurations.findFirst({
    where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
  });
  if (!row?.accessToken) return null;
  return {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    expiryDate: row.tokenExpiry ? row.tokenExpiry.getTime() : undefined,
  };
}

function ensureRequiredParams(entry: WorkspaceMcpActionRegistryEntry, params: Record<string, unknown>): string | null {
  for (const key of entry.required_params ?? []) {
    const value = params[key];
    if (value === undefined || value === null || value === "") {
      return key;
    }
  }
  return null;
}

async function callExternalMcpTool(params: {
  siteConfigId: string;
  action: WorkspaceMcpActionRegistryEntry;
  input: Record<string, unknown>;
}): Promise<WorkspaceActionExecutionResult> {
  const baseUrl = process.env.WORKSPACE_MCP_URL?.trim();
  if (!baseUrl) {
    return {
      ok: false,
      provider: "external_mcp",
      toolName: params.action.external_tool_name,
      error: "workspace_mcp_url_missing",
      authState: "adapter_unconfigured",
      recoverable: true,
      degradedReason: "external_workspace_mcp_unconfigured",
      evidenceArtifacts: [],
    };
  }

  const credentials = await getWorkspaceCredentials(params.siteConfigId);
  const bearer = process.env.WORKSPACE_MCP_BEARER_TOKEN?.trim() || credentials?.accessToken;
  if (!bearer) {
    return {
      ok: false,
      provider: "external_mcp",
      toolName: params.action.external_tool_name,
      error: "workspace_mcp_bearer_missing",
      authState: "missing_credentials",
      recoverable: true,
      degradedReason: "external_workspace_mcp_missing_bearer",
      evidenceArtifacts: [],
    };
  }

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method: "tools/call",
        params: {
          name: params.action.external_tool_name,
          arguments: params.input,
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { result?: unknown; error?: { message?: string } }
      | null;

    if (!response.ok || payload?.error) {
      return {
        ok: false,
        provider: "external_mcp",
        toolName: params.action.external_tool_name,
        error: payload?.error?.message ?? `workspace_mcp_http_${response.status}`,
        authState: response.status === 401 || response.status === 403 ? "invalid_credentials" : "transport_error",
        recoverable: true,
        degradedReason: "external_workspace_tool_failed",
        evidenceArtifacts: [
          {
            kind: "workspace_auth_failure",
            uri: `workspace-mcp://${params.action.action_id}/auth-failure`,
            metadata: {
              provider: "external_mcp",
              httpStatus: response.status,
            },
          },
        ],
      };
    }

    return {
      ok: true,
      provider: "external_mcp",
      toolName: params.action.external_tool_name,
      data: payload?.result ?? payload,
      evidenceArtifacts: [
        {
          kind: "workspace_action_result",
          uri: `workspace-mcp://${params.action.action_id}`,
          metadata: {
            provider: "external_mcp",
            toolName: params.action.external_tool_name,
          },
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      provider: "external_mcp",
      toolName: params.action.external_tool_name,
      error: message,
      authState: "transport_error",
      recoverable: true,
      degradedReason: "external_workspace_transport_error",
      evidenceArtifacts: [
        {
          kind: "workspace_auth_failure",
          uri: `workspace-mcp://${params.action.action_id}/transport-error`,
          metadata: {
            provider: "external_mcp",
            error: message,
          },
        },
      ],
    };
  }
}

async function callTransitionalTool(params: {
  siteConfigId: string;
  action: WorkspaceMcpActionRegistryEntry;
  input: Record<string, unknown>;
}): Promise<WorkspaceActionExecutionResult> {
  if (!params.action.transitional_tool_name) {
    return {
      ok: false,
      provider: "transitional_legacy",
      toolName: params.action.external_tool_name,
      error: "transitional_tool_missing",
      authState: "degraded",
      recoverable: true,
      degradedReason: "transitional_tool_missing",
      evidenceArtifacts: [],
    };
  }

  const credentials = await getWorkspaceCredentials(params.siteConfigId);
  if (!credentials) {
    return {
      ok: false,
      provider: "transitional_legacy",
      toolName: params.action.transitional_tool_name,
      error: "workspace_credentials_missing",
      authState: "missing_credentials",
      recoverable: true,
      degradedReason: "transitional_workspace_missing_credentials",
      evidenceArtifacts: [],
    };
  }

  try {
    const service = createGoogleWorkspaceService(credentials);
    const result = await service.executeTool(params.action.transitional_tool_name, params.input);
    if (!result.success) {
      return {
        ok: false,
        provider: "transitional_legacy",
        toolName: params.action.transitional_tool_name,
        error: result.error ?? "workspace_tool_failed",
        authState: "degraded",
        recoverable: true,
        degradedReason: "transitional_workspace_tool_failed",
        evidenceArtifacts: [
          {
            kind: "workspace_auth_failure",
            uri: `workspace-legacy://${params.action.action_id}/tool-failed`,
            metadata: {
              provider: "transitional_legacy",
              error: result.error ?? "workspace_tool_failed",
            },
          },
        ],
      };
    }

    return {
      ok: true,
      provider: "transitional_legacy",
      toolName: params.action.transitional_tool_name,
      data: result.data,
      evidenceArtifacts: [
        {
          kind: "workspace_action_result",
          uri: `workspace-legacy://${params.action.action_id}`,
          metadata: {
            provider: "transitional_legacy",
            toolName: params.action.transitional_tool_name,
          },
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      provider: "transitional_legacy",
      toolName: params.action.transitional_tool_name,
      error: message,
      authState: "refresh_failed",
      recoverable: true,
      degradedReason: "transitional_workspace_auth_failed",
      evidenceArtifacts: [
        {
          kind: "workspace_auth_failure",
          uri: `workspace-legacy://${params.action.action_id}/auth-failed`,
          metadata: {
            provider: "transitional_legacy",
            error: message,
          },
        },
      ],
    };
  }
}

export async function executeWorkspaceGovernedAction(params: {
  siteConfigId: string;
  actionId: string;
  input: Record<string, unknown>;
}): Promise<WorkspaceActionExecutionResult> {
  const action = getWorkspaceMcpAction(params.actionId);
  if (!action) {
    return {
      ok: false,
      provider: adapterMode(),
      toolName: params.actionId,
      error: "workspace_action_not_registered",
      authState: "unknown",
      evidenceArtifacts: [],
    };
  }

  const missingParam = ensureRequiredParams(action, params.input);
  if (missingParam) {
    return {
      ok: false,
      provider: adapterMode(),
      toolName: action.external_tool_name,
      error: `missing_required_param:${missingParam}`,
      authState: "unknown",
      evidenceArtifacts: [],
    };
  }

  if (action.requires_approval) {
    return {
      ok: false,
      provider: adapterMode(),
      toolName: action.external_tool_name,
      requiresApproval: true,
      error: "workspace_action_requires_approval",
      authState: "unknown",
      evidenceArtifacts: [],
    };
  }

  if (adapterMode() === "external_mcp" && !process.env.WORKSPACE_MCP_URL?.trim()) {
    return {
      ok: false,
      provider: "external_mcp",
      toolName: action.external_tool_name,
      error: "workspace_mcp_url_missing",
      authState: "adapter_unconfigured",
      recoverable: true,
      degradedReason: "external_workspace_mcp_unconfigured",
      evidenceArtifacts: [
        {
          kind: "workspace_auth_failure",
          uri: `workspace-auth://${action.action_id}/adapter-unconfigured`,
          metadata: {
            provider: "external_mcp",
            authState: "adapter_unconfigured",
          },
        },
      ],
    };
  }

  const auth = await getWorkspaceAuthHealth(params.siteConfigId);
  const healthyStates: WorkspaceAuthState[] = ["valid", "expiring_soon", "bearer_override"];
  if (!healthyStates.includes(auth.authState)) {
    return {
      ok: false,
      provider: auth.mode,
      toolName: action.external_tool_name,
      error: auth.authErrorCode ?? auth.authState,
      authState: auth.authState,
      recoverable: auth.recoverable,
      degradedReason: auth.degradedReason,
      evidenceArtifacts: [
        {
          kind: "workspace_auth_failure",
          uri: `workspace-auth://${action.action_id}/${auth.authState}`,
          metadata: auth,
        },
      ],
    };
  }

  return adapterMode() === "external_mcp"
    ? callExternalMcpTool({ siteConfigId: params.siteConfigId, action, input: params.input })
    : callTransitionalTool({ siteConfigId: params.siteConfigId, action, input: params.input });
}

export async function getWorkspaceAdapterHealth(siteConfigId: string): Promise<WorkspaceAuthHealth> {
  return getWorkspaceAuthHealth(siteConfigId);
}

export async function refreshWorkspaceAdapterHealth(siteConfigId: string): Promise<WorkspaceAuthHealth> {
  return refreshWorkspaceAuthHealth(siteConfigId);
}
