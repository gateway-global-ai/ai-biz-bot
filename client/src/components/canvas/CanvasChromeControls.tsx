/**
 * Tunable canvas chrome — background tint, card glass, and text colors.
 * Used on platform idle and inside the background picker.
 */
import React from 'react';
import {
  type CanvasChromeSettings,
  applyPreset,
  getChromePresets,
} from '@/lib/canvasChromeSettings';
import { cn } from '@/lib/utils';

const PRESET_LABELS: Record<string, string> = {
  light_glass: 'Clean light',
  dark_glass: 'Glass dark',
  full_bleed: 'Soft frost',
  minimal_tint: 'Minimal tint',
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </div>
  );
}

export function CanvasChromeControls({
  value,
  onChange,
  className,
  compact,
}: {
  value: CanvasChromeSettings;
  onChange: (next: CanvasChromeSettings) => void;
  className?: string;
  /** Tighter spacing when embedded in picker */
  compact?: boolean;
}) {
  const patch = (partial: Partial<CanvasChromeSettings>) => {
    onChange({ ...value, ...partial });
  };

  const presets = getChromePresets();

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 text-slate-900',
        compact ? 'space-y-3' : 'space-y-4',
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 w-full">
          Quick picks — theme presets
        </span>
        {Object.keys(presets).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(applyPreset(id, value))}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition-colors"
          >
            {PRESET_LABELS[id] ?? id}
          </button>
        ))}
      </div>

      <Row label="Background treatment (optional scrim)">
        <p className="text-[11px] text-slate-500 leading-snug -mt-0.5 mb-1">
          0% = full library effect (recommended). Raise only if you need extra contrast.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            value={value.bgOverlayColor}
            onChange={(e) => patch({ bgOverlayColor: e.target.value })}
            className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
            aria-label="Background scrim color"
          />
          <div className="flex flex-1 min-w-[140px] items-center gap-2">
            <span className="text-xs text-slate-500 w-20">Dim / tint</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(value.bgOverlayOpacity * 100)}
              onChange={(e) => patch({ bgOverlayOpacity: Number(e.target.value) / 100 })}
              className="flex-1 accent-indigo-600"
              aria-label="Background dimming"
            />
            <span className="text-xs tabular-nums text-slate-600 w-10">{Math.round(value.bgOverlayOpacity * 100)}%</span>
          </div>
        </div>
      </Row>

      <Row label="Surface (card on top of background)">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={value.cardBackgroundColor}
              onChange={(e) => patch({ cardBackgroundColor: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
              aria-label="Card background color"
            />
            <div className="flex flex-1 min-w-[140px] items-center gap-2">
              <span className="text-xs text-slate-500 w-16">Opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(value.cardOpacity * 100)}
                onChange={(e) => patch({ cardOpacity: Number(e.target.value) / 100 })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs tabular-nums text-slate-600 w-10">{Math.round(value.cardOpacity * 100)}%</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500 w-20">Border α</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(value.cardBorderOpacity * 100)}
              onChange={(e) => patch({ cardBorderOpacity: Number(e.target.value) / 100 })}
              className="flex-1 min-w-[120px] accent-indigo-600"
            />
            <span className="text-xs text-slate-500 w-14">Blur</span>
            <input
              type="range"
              min={0}
              max={40}
              value={value.cardBlurPx}
              onChange={(e) => patch({ cardBlurPx: Number(e.target.value) })}
              className="flex-1 min-w-[100px] accent-indigo-600"
            />
            <span className="text-xs tabular-nums text-slate-600">{value.cardBlurPx}px</span>
          </div>
        </div>
      </Row>

      <Row label="Text · accents">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Primary</span>
            <input
              type="color"
              value={value.primaryTextColor}
              onChange={(e) => patch({ primaryTextColor: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
              aria-label="Primary text color"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Muted</span>
            <input
              type="color"
              value={value.mutedTextColor}
              onChange={(e) => patch({ mutedTextColor: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
              aria-label="Muted text color"
            />
          </div>
        </div>
      </Row>
    </div>
  );
}
