/**
 * Governed canvas view: Canvas appearance = background library + theme/surface controls.
 * Runtime effects use CanvasBackgroundLayer — no install commands in customer UI.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { BackgroundPickerViewModel } from '@shared/canvasViewContract';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CanvasBackgroundLibrarySection } from '@/components/canvas/CanvasBackgroundLibrarySection';
import { CanvasChromeControls } from '@/components/canvas/CanvasChromeControls';
import type { CanvasChromeSettings } from '@/lib/canvasChromeSettings';

export function ShadcnBackgroundPickerView({
  title,
  data,
  onAction,
  onCancel,
  canvasChrome,
  onCanvasChromeChange,
  /** Active canvas background id (from parent) — highlights selection + “Current effect”. */
  selectedBackgroundId,
}: {
  title: string;
  data: BackgroundPickerViewModel;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  onCancel?: () => void;
  canvasChrome?: CanvasChromeSettings;
  onCanvasChromeChange?: (next: CanvasChromeSettings) => void;
  selectedBackgroundId?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative z-10 w-full min-h-[min(360px,62vh)] max-h-[min(72vh,560px)] rounded-sui overflow-hidden flex flex-col',
        'bg-white/88 backdrop-blur-2xl border border-white/60 shadow-[0_16px_50px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/5 text-slate-900',
      )}
    >
      <div className="px-4 pt-4 pb-3 border-b border-slate-200/70 flex items-start justify-between gap-2 shrink-0 bg-white/50 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mt-0.5">Surface styling</p>
          <p className="text-slate-600 text-sm mt-1 leading-relaxed">
            {data.helperText ??
              'Pick an effect first, then a theme preset or fine-tune readability. Optional scrim only for contrast.'}
          </p>
        </div>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="min-h-[14rem] max-h-[min(58vh,520px)] flex-1 overflow-y-auto overscroll-contain p-3 space-y-4 bg-white/30 backdrop-blur-[2px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2 px-1">
            1 · Background library
          </p>
          <CanvasBackgroundLibrarySection
            onAction={onAction}
            selectedBackgroundId={selectedBackgroundId}
          />
        </div>

        {canvasChrome && onCanvasChromeChange && (
          <div className="pt-2 border-t border-slate-200/80 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2 px-1">
              {'2 · Theme & readability'}
            </p>
            <CanvasChromeControls value={canvasChrome} onChange={onCanvasChromeChange} compact />
          </div>
        )}
      </div>
    </motion.div>
  );
}
