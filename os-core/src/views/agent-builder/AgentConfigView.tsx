import React, { useEffect } from "react";
import { Link } from "wouter";
import { useParams } from "wouter";
import { useSharedCanvasDispatch } from "../../shell/SharedCanvasProvider";

export default function AgentConfigView() {
  const params = useParams<{ siteId: string; agentId: string }>();
  const dispatch = useSharedCanvasDispatch();

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "agent.config",
        viewId: "agent-config-view",
        shellMode: "view",
        breadcrumb: ["Home", "Workspace", params.siteId, "Agent", params.agentId],
      },
    });
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: { key: "siteConfigId", value: params.siteId },
    });
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: { key: "agentId", value: params.agentId },
    });
  }, [dispatch, params.agentId, params.siteId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Agent Config</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
          <div className="mb-2 font-semibold text-white">Context</div>
          <div className="font-mono text-xs">
            siteConfigId: {params.siteId}
            <br />
            agentId: {params.agentId}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
          Behavior controls, mode permissions, and prompt preview will mount here
          through governed view/action contracts.
          <div className="mt-4">
            <Link href={`/workspace/${params.siteId}/agent/${params.agentId}/behavior`}>
              <a className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                Open Behavior Controls
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
