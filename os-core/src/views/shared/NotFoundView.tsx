import React from "react";

export default function NotFoundView() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div>
        <div className="mb-2 text-xl font-semibold text-white">Route Not Found</div>
        <div className="text-sm text-slate-400">
          The browser route adapter could not resolve a governed OS view for this
          path.
        </div>
      </div>
    </div>
  );
}
