import React from "react";

interface ConfirmationPanelProps {
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationPanel({
  message,
  onConfirm,
  onCancel,
}: ConfirmationPanelProps) {
  return (
    <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="text-sm font-semibold text-white">Confirmation Required</div>
      <div className="mt-1 text-sm text-slate-300">{message}</div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Confirm Update
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
