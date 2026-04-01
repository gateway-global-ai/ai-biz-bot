import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SovereignEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SovereignEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: SovereignEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 gap-4',
        className,
      )}
    >
      {Icon && <Icon className="h-12 w-12 text-slate-300" strokeWidth={1.5} />}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
