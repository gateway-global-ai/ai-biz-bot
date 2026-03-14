import { Heart } from 'lucide-react';

export type LiveEmotion = 'calm' | 'engaged' | 'focused' | 'energized' | 'empathetic';

export const LIVE_EMOTION_OPTIONS: LiveEmotion[] = ['calm', 'engaged', 'focused', 'energized', 'empathetic'];

const EMOTION_COLORS: Record<LiveEmotion, { bg: string; glow: string; label: string }> = {
  calm: { bg: 'bg-emerald-500', glow: 'shadow-[0_0_12px_2px_rgba(16,185,129,0.4)]', label: 'Calm' },
  engaged: { bg: 'bg-blue-500', glow: 'shadow-[0_0_12px_2px_rgba(59,130,246,0.4)]', label: 'Engaged' },
  focused: { bg: 'bg-amber-500', glow: 'shadow-[0_0_12px_2px_rgba(245,158,11,0.4)]', label: 'Focused' },
  energized: { bg: 'bg-orange-500', glow: 'shadow-[0_0_12px_2px_rgba(249,115,22,0.4)]', label: 'Energized' },
  empathetic: { bg: 'bg-pink-500', glow: 'shadow-[0_0_12px_2px_rgba(236,72,153,0.4)]', label: 'Empathetic' },
};

interface LiveEmotionControlProps {
  value: LiveEmotion | null | undefined;
  onChange: (emotion: LiveEmotion) => void;
  disabled?: boolean;
  className?: string;
}

export function LiveEmotionControl({ value, onChange, disabled = false, className = '' }: LiveEmotionControlProps) {
  const selected = value && LIVE_EMOTION_OPTIONS.includes(value) ? value : null;

  return (
    <div className={className}>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Heart className="w-3 h-3" /> Live Emotion Control
      </p>
      <div className="flex flex-wrap gap-2">
        {LIVE_EMOTION_OPTIONS.map((emotion) => {
          const config = EMOTION_COLORS[emotion];
          const isSelected = selected === emotion;
          return (
            <button
              key={emotion}
              type="button"
              onClick={() => !disabled && onChange(emotion)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                isSelected
                  ? `${config.bg} text-white shadow-lg ${config.glow}`
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-indigo-500/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid={`button-emotion-${emotion}`}
            >
              {emotion}
            </button>
          );
        })}
      </div>
    </div>
  );
}
