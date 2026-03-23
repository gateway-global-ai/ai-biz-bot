import React from "react";

export function ChatOSContainer() {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur-xl">
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-white">Chat OS Container</div>
        <div className="text-xs text-slate-400">
          Shared digital table for the user and native OS agent.
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-slate-300">
        Primary governed conversation surface. View rendering, menu navigation,
        and PTT state will live here behind registry-driven contracts.
      </div>
      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        Hold-to-talk surface placeholder
      </div>
    </section>
  );
}
