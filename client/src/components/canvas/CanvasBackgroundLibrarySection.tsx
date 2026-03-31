/**
 * Background catalog: quick actions, favorites, categorized accordion — primary object for Canvas appearance.
 * Shared by ShadcnBackgroundPickerView (in-shell) and ConciergePanel idle stack.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Star, RotateCcw, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  SHADCN_BACKGROUND_CATEGORIES,
  SHADCN_BACKGROUND_ITEMS,
  CANVAS_BG_FAVORITES_STORAGE_KEY,
  getBackgroundItemById,
  type BackgroundCategoryId,
} from './shadcnBackgroundCatalog';

export function CanvasBackgroundLibrarySection({
  onAction,
  selectedBackgroundId,
  /** Tighter scroll area when embedded in idle stack */
  compact,
}: {
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  selectedBackgroundId?: string | null;
  compact?: boolean;
}) {
  const [openCategory, setOpenCategory] = useState<BackgroundCategoryId | null>(null);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  const [favoritesTick, setFavoritesTick] = useState(0);
  const favorites = useMemo(() => {
    try {
      const raw = localStorage.getItem(CANVAS_BG_FAVORITES_STORAGE_KEY);
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set<string>();
    }
  }, [favoritesTick]);

  const persistFavorite = useCallback((id: string) => {
    try {
      const raw = localStorage.getItem(CANVAS_BG_FAVORITES_STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      const next = Array.from(new Set([...(Array.isArray(arr) ? arr : []), id]));
      localStorage.setItem(CANVAS_BG_FAVORITES_STORAGE_KEY, JSON.stringify(next));
      setFavoritesTick((x) => x + 1);
    } catch {
      /* ignore */
    }
  }, []);

  const itemsByCategory = useMemo(() => {
    const m = new Map<BackgroundCategoryId, typeof SHADCN_BACKGROUND_ITEMS>();
    for (const c of SHADCN_BACKGROUND_CATEGORIES) {
      m.set(
        c.id,
        SHADCN_BACKGROUND_ITEMS.filter((i) => i.categoryId === c.id),
      );
    }
    return m;
  }, []);

  const scrollToCatalog = () => {
    catalogTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const accordionValue = openCategory ?? undefined;
  const currentItem = getBackgroundItemById(selectedBackgroundId ?? null);

  return (
    <div className={cn('space-y-3', compact && 'max-h-[min(52vh,480px)] overflow-y-auto overscroll-contain pr-0.5')}>
      <div className="rounded-xl border border-slate-200/90 bg-white/70 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Current effect</p>
        <p className="text-sm font-semibold text-slate-900 mt-0.5">
          {currentItem ? currentItem.label : 'Default — no animated background'}
        </p>
        {currentItem ? (
          <p className="text-xs text-slate-600 mt-1 leading-snug">{currentItem.description}</p>
        ) : (
          <p className="text-xs text-slate-500 mt-1">Choose a catalog effect below, or leave default.</p>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-1 mb-1.5">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-slate-800 border-slate-300 bg-white/80"
            onClick={() => onAction?.('canvas_bg_default', {})}
          >
            <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
            Set to default
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-slate-800 border-slate-300 bg-white/80"
            onClick={() => {
              const last = sessionStorage.getItem('gateway_canvas_bg_last');
              if (last) {
                persistFavorite(last);
                onAction?.('canvas_bg_favorite_saved', { backgroundId: last });
              }
            }}
          >
            <Star className="h-3.5 w-3.5 text-emerald-600" />
            Save to favorites
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-slate-800 border-slate-300 bg-white/80"
            onClick={scrollToCatalog}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
            Browse catalog
          </Button>
        </div>
      </div>

      <div ref={catalogTopRef}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 px-1 mb-2">Favorites &amp; catalog</p>
        {favorites.size > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 mb-2">Favorites</p>
            <div className="flex flex-wrap gap-1.5">
              {SHADCN_BACKGROUND_ITEMS.filter((i) => favorites.has(i.id)).map((i) => (
                <Button
                  key={i.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={cn(
                    'h-8 text-xs border',
                    selectedBackgroundId === i.id
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-950 ring-1 ring-indigo-300'
                      : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-100',
                  )}
                  onClick={() => {
                    sessionStorage.setItem('gateway_canvas_bg_last', i.id);
                    onAction?.('canvas_bg_select', { backgroundId: i.id });
                  }}
                >
                  {i.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={(v) => setOpenCategory((v as BackgroundCategoryId) || null)}
          className="space-y-2"
        >
          {SHADCN_BACKGROUND_CATEGORIES.map((cat) => {
            const items = itemsByCategory.get(cat.id) ?? [];
            return (
              <AccordionItem
                key={cat.id}
                value={cat.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-1 border-b-0 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="px-3 py-3 text-left hover:no-underline rounded-xl hover:bg-slate-100/80">
                  <div className="flex flex-col items-start gap-0.5 pr-2">
                    <span className="text-sm font-semibold text-slate-900">{cat.title}</span>
                    <span className="text-xs font-normal text-slate-600 leading-snug">{cat.blurb}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <ul className="border-t border-slate-200 bg-white rounded-b-xl">
                    {items.map((item) => (
                      <li key={item.id} className="border-b border-slate-100 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('gateway_canvas_bg_last', item.id);
                            onAction?.('canvas_bg_select', { backgroundId: item.id });
                          }}
                          className={cn(
                            'w-full text-left px-4 py-3 transition-colors',
                            selectedBackgroundId === item.id
                              ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200'
                              : 'hover:bg-indigo-50',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-inset',
                          )}
                        >
                          <p className="text-sm font-medium text-slate-900">{item.label}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{item.description}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
