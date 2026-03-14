import React, { useEffect } from "react";
import { useSharedCanvasDispatch } from "../../shell/SharedCanvasProvider";

const items = [
  "Accounts",
  "Businesses",
  "Agents",
  "Billing",
  "Verification",
  "Router",
  "System",
];

export default function AdminHomeView() {
  const dispatch = useSharedCanvasDispatch();

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "admin.home",
        viewId: "admin-home-view",
        shellMode: "menu",
        breadcrumb: ["Home", "Admin"],
      },
    });
  }, [dispatch]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Home</h1>
        <p className="mt-1 text-sm text-slate-400">
          Menu-mode placeholder for the governed admin operating domains.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
