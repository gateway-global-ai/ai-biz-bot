/**
 * SovereignPromptInput — AI block wrapper
 *
 * Governed text input for chat/prompt entry.
 * Used as the chat-mode fallback when voice is unavailable.
 *
 * SDK reference: shadcn.io/ai/prompt-input
 * Registry: gateway-sdk-manifest.yaml → ai-prompt-input
 */

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { ICON_SIZES, TOUCH_TARGETS } from '@/config/brand';

interface SovereignPromptInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SovereignPromptInput({
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  className,
}: SovereignPromptInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
    inputRef.current?.focus();
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className={`flex items-end gap-2 p-3 border-t border-slate-200 bg-white ${className ?? ''}`}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-50 bg-slate-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors"
        style={{ minHeight: TOUCH_TARGETS.chip, minWidth: TOUCH_TARGETS.chip }}
        aria-label="Send message"
      >
        <Send size={ICON_SIZES.canvasControl} />
      </button>
    </div>
  );
}
