import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SovereignInspectorLayoutProps {
  header: React.ReactNode;
  metadata?: React.ReactNode;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export const SovereignInspectorLayout = React.forwardRef<
  HTMLDivElement,
  SovereignInspectorLayoutProps
>(({ header, metadata, children, sidebar, className }, ref) => (
  <div ref={ref} className={cn('max-w-5xl mx-auto', className)}>
    {/* header */}
    <div className="mb-6">{header}</div>

    {/* metadata strip */}
    {metadata && (
      <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
        {metadata}
      </div>
    )}

    {/* main + optional sidebar */}
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 min-w-0">{children}</div>
      {sidebar && (
        <aside className="w-full lg:w-80 shrink-0">{sidebar}</aside>
      )}
    </div>
  </div>
));
SovereignInspectorLayout.displayName = 'SovereignInspectorLayout';
