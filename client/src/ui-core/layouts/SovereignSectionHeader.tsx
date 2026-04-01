import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SovereignSectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  status?: React.ReactNode;
  className?: string;
}

export const SovereignSectionHeader = React.forwardRef<
  HTMLDivElement,
  SovereignSectionHeaderProps
>(({ title, subtitle, actions, status, className }, ref) => (
  <div ref={ref} className={cn('flex justify-between items-start', className)}>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-900 truncate">
          {title}
        </h2>
        {status}
      </div>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex gap-2 shrink-0 ml-4">{actions}</div>
    )}
  </div>
));
SovereignSectionHeader.displayName = 'SovereignSectionHeader';
