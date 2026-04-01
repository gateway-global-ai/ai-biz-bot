import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface SovereignTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface SovereignTabsProps {
  tabs: SovereignTab[];
  defaultTab?: string;
  className?: string;
}

export const SovereignTabs = React.forwardRef<HTMLDivElement, SovereignTabsProps>(
  ({ tabs, defaultTab, className }, ref) => {
    const visibleTabs = tabs.slice(0, 4);
    const defaultValue = defaultTab ?? visibleTabs[0]?.id;

    if (visibleTabs.length === 0) return null;

    return (
      <Tabs ref={ref} defaultValue={defaultValue} className={cn('w-full', className)}>
        <TabsList
          className={cn(
            'inline-flex h-10 w-full items-center justify-start gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1',
          )}
        >
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors',
                'hover:text-slate-900',
                'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2',
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-3">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    );
  },
);
SovereignTabs.displayName = 'SovereignTabs';
