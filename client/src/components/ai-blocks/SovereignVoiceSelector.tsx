/**
 * SovereignVoiceSelector — AI block wrapper
 *
 * Governed voice selection panel for choosing agent voices.
 * Renders voice options with preview playback and selection state.
 *
 * SDK reference: shadcn.io/ai/voice-selector
 * Registry: gateway-sdk-manifest.yaml → ai-voice-selector
 */

import { useState } from 'react';
import { AudioLines, Check, Play } from 'lucide-react';
import { ICON_SIZES, TOUCH_TARGETS } from '@/config/brand';

interface VoiceOption {
  id: string;
  name: string;
  description?: string;
  locale?: string;
  gender?: 'male' | 'female' | 'neutral';
}

interface SovereignVoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoiceId: string | null;
  onSelect: (voiceId: string) => void;
  onPreview?: (voiceId: string) => void;
  className?: string;
}

export function SovereignVoiceSelector({
  voices,
  selectedVoiceId,
  onSelect,
  onPreview,
  className,
}: SovereignVoiceSelectorProps) {
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  return (
    <div className={`flex flex-col h-full bg-white ${className ?? ''}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <AudioLines size={ICON_SIZES.canvasControl} className="text-emerald-500" />
        <span className="text-sm font-semibold text-slate-800">Voice Selector</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {voices.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => onSelect(voice.id)}
              className={`w-full flex items-center gap-3 px-3 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
              style={{ minHeight: TOUCH_TARGETS.menuItem }}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {voice.name}
                </p>
                {voice.description && (
                  <p className="text-[11px] text-slate-400 truncate">{voice.description}</p>
                )}
              </div>
              {onPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewingId(voice.id);
                    onPreview(voice.id);
                    setTimeout(() => setPreviewingId(null), 3000);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={`Preview ${voice.name}`}
                >
                  <Play size={ICON_SIZES.statusIndicator} className={previewingId === voice.id ? 'text-emerald-500' : ''} />
                </button>
              )}
              {isSelected && <Check size={ICON_SIZES.canvasControl} className="text-emerald-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
