/**
 * Google Workspace panel for the admin — connect OAuth, toggle apps, disconnect.
 * Data is stored in workspace_configurations keyed by siteConfigId.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";

const WORKSPACE_ITEMS = [
  { key: "gmail", label: "Gmail", desc: "Business email integration", icon: "M", color: "#ef4444" },
  { key: "calendar", label: "Google Calendar", desc: "Schedule & appointment syncing", icon: "C", color: "#3b82f6" },
  { key: "drive", label: "Google Drive", desc: "File storage & document sharing", icon: "D", color: "#f59e0b" },
  { key: "meet", label: "Google Meet", desc: "Video conferencing integration", icon: "V", color: "#10b981" },
  { key: "chat", label: "Google Chat", desc: "Team messaging & collaboration", icon: "G", color: "#22c55e" },
  { key: "sheets", label: "Google Sheets", desc: "Spreadsheet data synchronization", icon: "S", color: "#34d399" },
  { key: "docs", label: "Google Docs", desc: "Document creation & management", icon: "D", color: "#6366f1" },
  { key: "tasks", label: "Google Tasks", desc: "Task tracking & to-do lists", icon: "T", color: "#8b5cf6" },
  { key: "business", label: "Google My Business", desc: "Business Profile management", icon: "B", color: "#2563eb" },
];

const DEFAULT_TOGGLES: Record<string, boolean> = Object.fromEntries(
  WORKSPACE_ITEMS.map((item) => [item.key, false])
);

export interface GoogleWorkspacePanelProps {
  siteConfigId: string;
  onDone?: () => void;
}

export function GoogleWorkspacePanel({ siteConfigId, onDone }: GoogleWorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [toggles, setToggles] = useState<Record<string, boolean>>(DEFAULT_TOGGLES);

  const { data: status, isLoading } = useQuery({
    queryKey: ["workspace-status", siteConfigId],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/status/${encodeURIComponent(siteConfigId)}`);
      if (!res.ok) throw new Error("Failed to load workspace status");
      return res.json() as Promise<{ status: string; googleEmail: string | null; enabledApps: Record<string, boolean> }>;
    },
    enabled: !!siteConfigId,
  });

  useEffect(() => {
    if (status?.enabledApps && typeof status.enabledApps === "object") {
      setToggles((prev) => ({ ...DEFAULT_TOGGLES, ...prev, ...status.enabledApps }));
    }
  }, [status?.enabledApps]);

  const saveMutation = useMutation({
    mutationFn: async (enabledApps: Record<string, boolean>) => {
      const res = await fetch(`/api/workspace/save/${encodeURIComponent(siteConfigId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledApps }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-status", siteConfigId] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspace/connection/${encodeURIComponent(siteConfigId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-status", siteConfigId] });
    },
  });

  const handleToggle = (key: string) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    saveMutation.mutate(next);
  };

  const handleConnect = async () => {
    try {
      const res = await fetch(`/api/workspace/connect/${encodeURIComponent(siteConfigId)}`);
      const data = await res.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else throw new Error(data.error || "No auth URL");
    } catch (e) {
      console.error("Connect error:", e);
    }
  };

  const connected = status?.status === "connected" && !!status?.googleEmail;
  const activeCount = Object.values(toggles).filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-lg mx-auto bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
      data-testid="google-workspace-panel"
    >
      <div className="bg-emerald-600/90 px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Google Workspace</h3>
          <p className="text-emerald-100 text-xs">Manage your connected Google Apps</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{activeCount}</span>
          </div>
          {onDone && (
            <button type="button" onClick={onDone} className="p-1 rounded text-white/60 hover:text-white" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-600">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-slate-400">Not connected</span>
            </div>
            <p className="text-xs text-slate-500">Connect your Google account to enable Gmail, Calendar, Drive, and more for this site.</p>
            <button
              type="button"
              onClick={handleConnect}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
              data-testid="button-connect-workspace"
            >
              Connect Google Workspace
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-300">Connected & Active</span>
              <span className="text-[10px] text-slate-500 ml-auto">{activeCount} of {WORKSPACE_ITEMS.length} active</span>
            </div>
            {status?.googleEmail && (
              <p className="text-[10px] text-slate-500 mb-3">Account: {status.googleEmail}</p>
            )}
            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
              {WORKSPACE_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className={`p-3 rounded-xl border transition-all ${
                    toggles[item.key] ? "border-emerald-500/50 bg-emerald-950/30" : "border-slate-700 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: item.color }}
                      >
                        {item.icon}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle(item.key)}
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{ background: toggles[item.key] ? "#10b981" : "#475569" }}
                      data-testid={`toggle-${item.key}`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          toggles[item.key] ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                  <p className={`text-[10px] font-medium mt-1 ${toggles[item.key] ? "text-emerald-400" : "text-slate-500"}`}>
                    {toggles[item.key] ? "Syncing Active" : "Disconnected"}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="mt-4 w-full py-2 text-xs text-red-400 hover:text-red-300 border border-slate-600 hover:border-red-500/50 rounded-lg transition-colors"
              data-testid="button-disconnect-workspace"
            >
              {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect Google Workspace"}
            </button>
          </>
        )}
      </div>

      <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700 flex justify-end">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg"
            data-testid="button-workspace-done"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
