import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SovereignSelectOption {
  value: string;
  label: string;
}

export interface SovereignSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SovereignSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export const SovereignSelect = React.forwardRef<
  HTMLSelectElement,
  SovereignSelectProps
>(({ options, value, onChange, label, error, className, id, disabled, ...props }, ref) => {
  const selectId = id ?? React.useId();

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat',
          error && 'border-red-400 focus-visible:ring-red-400/70',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});
SovereignSelect.displayName = 'SovereignSelect';
