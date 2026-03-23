import React from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type StatusVariant = "pass" | "checking" | "fail" | "info";

export function StatusBadge({
  variant,
  label,
}: {
  variant: StatusVariant;
  label?: string;
}) {
  const content =
    label ??
    (variant === "pass"
      ? "PASS"
      : variant === "checking"
        ? "CHECKING..."
        : variant === "info"
          ? "DROPPED"
          : "FAIL");

  const classes =
    variant === "pass"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : variant === "checking"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : variant === "info"
          ? "border-sky-500/20 bg-sky-500/10 text-sky-200"
          : "border-rose-500/20 bg-rose-500/10 text-rose-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${classes}`}
    >
      {variant === "pass" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : variant === "checking" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : variant === "info" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {content}
    </span>
  );
}
