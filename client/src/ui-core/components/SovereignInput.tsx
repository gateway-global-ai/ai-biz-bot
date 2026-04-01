import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SovereignInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const SovereignInput = React.forwardRef<
  HTMLInputElement,
  SovereignInputProps
>(({ label, error, className, id, ...props }, ref) => {
  const inputId = id ?? React.useId();

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-400 focus-visible:ring-red-400/70',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});
SovereignInput.displayName = 'SovereignInput';
