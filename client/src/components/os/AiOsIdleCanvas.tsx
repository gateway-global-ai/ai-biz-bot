/**
 * Minimal idle canvas for shellPresentation="ai_os_simple" — logo, prompt, text entry.
 * Voice PTT remains in ConciergePanel footer; this mirrors typed chat entry.
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { CANVAS, BRAND } from '@/config/brand';

export function AiOsIdleCanvas({
  businessName,
  onSubmitLine,
  connectionStatus,
}: {
  businessName: string;
  onSubmitLine: (text: string) => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}) {
  const [line, setLine] = useState('');
  const disabled = connectionStatus !== 'connected';

  const submit = useCallback(() => {
    const t = line.trim();
    if (!t || disabled) return;
    onSubmitLine(t);
    setLine('');
  }, [line, disabled, onSubmitLine]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center w-full max-w-md mx-auto text-center gap-6"
    >
      <img
        src="/branding/ai-os-logo.png"
        alt="AI OS"
        className="w-[min(85vw,280px)] h-auto object-contain select-none"
        draggable={false}
      />
      <div className="space-y-1">
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: CANVAS.textMuted }}
        >
          What would you like to do today?
        </p>
        {businessName ? (
          <p className="text-sm font-medium" style={{ color: CANVAS.text }}>
            {businessName}
          </p>
        ) : null}
      </div>
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="ai-os-search" className="sr-only">
          Ask or search
        </label>
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-sm"
          style={{ borderColor: CANVAS.border, backgroundColor: CANVAS.bg }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: CANVAS.textMuted }} aria-hidden />
          <input
            id="ai-os-search"
            type="search"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder={disabled ? 'Connecting…' : 'Type a question or request…'}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
            style={{ color: CANVAS.text }}
            autoComplete="off"
          />
        </div>
        <p className="mt-2 text-[11px]" style={{ color: CANVAS.textMuted }}>
          {connectionStatus === 'connected'
            ? 'Or hold Push to talk below.'
            : connectionStatus === 'connecting'
              ? 'Connecting voice…'
              : 'Voice offline — reconnect from the footer.'}
        </p>
      </form>
      <div
        className="h-1 w-16 rounded-full opacity-40"
        style={{ backgroundColor: BRAND.green }}
        aria-hidden
      />
    </motion.div>
  );
}
