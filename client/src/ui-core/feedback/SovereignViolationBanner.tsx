import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export interface SovereignViolationBannerProps {
  code: string;
  message: string;
  severity: 'warning' | 'critical';
  onDismiss?: () => void;
  className?: string;
}

const severityStyles = {
  warning: {
    banner: 'bg-amber-50 border-amber-300 text-amber-900',
    icon: 'text-amber-500',
  },
  critical: {
    banner: 'bg-red-50 border-red-300 text-red-900',
    icon: 'text-red-500',
  },
} as const;

export function SovereignViolationBanner({
  code,
  message,
  severity,
  onDismiss,
  className,
}: SovereignViolationBannerProps) {
  const styles = severityStyles[severity];
  const Icon = severity === 'critical' ? ShieldAlert : AlertTriangle;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        styles.banner,
        className,
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', styles.icon)} />
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono font-semibold">{code}</code>
        <p className="text-sm mt-0.5">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
