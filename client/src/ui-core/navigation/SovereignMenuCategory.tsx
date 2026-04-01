import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SovereignMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

export interface SovereignMenuCategoryProps {
  title: string;
  items: SovereignMenuItem[];
  className?: string;
}

export function SovereignMenuCategory({
  title,
  items,
  className,
}: SovereignMenuCategoryProps) {
  return (
    <div className={cn('', className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2">
        {title}
      </h3>
      <ul role="menu" className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={item.onClick}
                className={cn(
                  'flex items-center gap-3 w-full min-h-[44px] px-3 py-2 rounded-lg text-sm text-slate-700 transition-colors text-left',
                  'hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {Icon && <Icon className="h-4 w-4 text-slate-500 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
