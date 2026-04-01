import * as React from 'react';
import { cn } from '@/lib/utils';

const statusColors: Record<SovereignStatusDotStatus, string> = {
  online: 'bg-emerald-500',
  success: 'bg-emerald-500',
  away: 'bg-amber-400',
  warning: 'bg-amber-400',
  busy: 'bg-red-500',
  danger: 'bg-red-500',
  offline: 'bg-slate-400',
};

type SovereignStatusDotStatus =
  | 'online'
  | 'away'
  | 'busy'
  | 'offline'
  | 'success'
  | 'warning'
  | 'danger';

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
} as const;

export interface SovereignStatusDotProps {
  status: SovereignStatusDotStatus;
  size?: keyof typeof sizeMap;
  pulse?: boolean;
  className?: string;
}

export function SovereignStatusDot({
  status,
  size = 'sm',
  pulse = false,
  className,
}: SovereignStatusDotProps) {
  return (
    <span
      role="status"
      aria-label={status}
      className={cn(
        'inline-block rounded-full shrink-0',
        sizeMap[size],
        statusColors[status],
        pulse && 'animate-pulse',
        className,
      )}
    />
  );
}
