import React, { useEffect } from "react";
import { useSharedCanvasDispatch } from "../../shell/SharedCanvasProvider";

export default function SupportEntryView() {
  const dispatch = useSharedCanvasDispatch();

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "support.entry",
        viewId: "support-entry-view",
        shellMode: "menu",
        breadcrumb: ["Home", "Support"],
      },
    });
  }, [dispatch]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">OS Support</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Gateway-hosted install and enterprise support surface for developers and
        enterprise clients. This will connect to the ClearVoice OS Support Agent
        through governed support views and intake flows.
      </p>
    </div>
  );
}
