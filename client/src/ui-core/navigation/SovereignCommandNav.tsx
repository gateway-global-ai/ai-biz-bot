import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import type { LucideIcon } from 'lucide-react';

export interface SovereignCommandNavItem {
  id: string;
  label: string;
  category?: string;
  icon?: LucideIcon;
}

export interface SovereignCommandNavProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: SovereignCommandNavItem) => void;
  items: SovereignCommandNavItem[];
  placeholder?: string;
  className?: string;
}

export function SovereignCommandNav({
  open,
  onClose,
  onSelect,
  items,
  placeholder = 'Search…',
  className,
}: SovereignCommandNavProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = items.reduce<Record<string, SovereignCommandNavItem[]>>(
    (acc, item) => {
      const cat = item.category ?? '';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(8,17,32,0.48)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* command panel */}
      <div
        className={cn(
          'relative w-full max-w-lg mx-4 rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden',
          'animate-in fade-in slide-in-from-top-2 duration-150',
          className,
        )}
      >
        <Command shouldFilter>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty className="py-8 text-center text-sm text-slate-500">
              No results found.
            </CommandEmpty>

            {Object.entries(grouped).map(([category, categoryItems]) => (
              <CommandGroup
                key={category}
                heading={category || undefined}
              >
                {categoryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.label}
                      onSelect={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="flex items-center gap-3 min-h-[40px] cursor-pointer"
                    >
                      {Icon && <Icon className="h-4 w-4 text-slate-500 shrink-0" />}
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
