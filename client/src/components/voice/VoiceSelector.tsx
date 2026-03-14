/**
 * VoiceSelector — Gender-coded Gemini voice grid
 *
 * Pink = Female, Blue = Male (matched to the Gemini 2.5 Native Audio voice set).
 * Supports compact (2-col) and grid (full-width) layout modes.
 */
import React from 'react';
import { Mic, User } from 'lucide-react';

export interface VoiceOption {
  id: string;
  label: string;
  gender: 'Male' | 'Female';
  description: string;
  recommendedFor: string;
}

export const GEMINI_VOICES: VoiceOption[] = [
  // Female — pink
  { id: 'Aoede',  label: 'Aoede',  gender: 'Female', description: 'Warm and expressive.',          recommendedFor: 'Concierge / Luxury' },
  { id: 'Kore',   label: 'Kore',   gender: 'Female', description: 'Clear and articulate.',          recommendedFor: 'Assistant / Business' },
  { id: 'Leda',   label: 'Leda',   gender: 'Female', description: 'Soft and soothing.',             recommendedFor: 'Wellness / Support' },
  { id: 'Zephyr', label: 'Zephyr', gender: 'Female', description: 'Bright and energetic.',          recommendedFor: 'Sales / Outreach' },
  // Male — blue
  { id: 'Charon', label: 'Charon', gender: 'Male',   description: 'Deep and authoritative.',        recommendedFor: 'News / Executive' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'Male',   description: 'Strong and confident.',          recommendedFor: 'Security / Action' },
  { id: 'Orus',   label: 'Orus',   gender: 'Male',   description: 'Professional and clear.',        recommendedFor: 'Legal / Financial' },
  { id: 'Puck',   label: 'Puck',   gender: 'Male',   description: 'Friendly and approachable.',     recommendedFor: 'Retail / Hospitality' },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  disabled?: boolean;
  /** 'compact' = 2-col small cards (for menus), 'grid' = 2-col full cards with descriptions */
  mode?: 'compact' | 'grid';
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  disabled = false,
  mode = 'compact',
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic size={13} className="text-slate-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Voice Persona</span>
      </div>

      {/* Gemini badge */}
      <div className="text-[10px] px-3 py-2 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400 flex items-center gap-2">
        <span className="text-[11px]">✦</span>
        <span className="font-bold">Gemini Native Voices</span>
        <span className="opacity-60 ml-1">— 24 kHz Premium HD</span>
      </div>

      {/* Voice grid */}
      <div className="grid grid-cols-2 gap-2">
        {GEMINI_VOICES.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isFemale = voice.gender === 'Female';

          const baseClasses =
            'relative rounded-xl border transition-all text-left overflow-hidden group';

          let colorClasses: string;
          if (isSelected) {
            colorClasses = isFemale
              ? 'bg-pink-500/10 border-pink-500 text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.25)]'
              : 'bg-blue-500/10 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.25)]';
          } else {
            colorClasses = 'bg-slate-900/50 border-slate-700 text-slate-400';
            if (!disabled) {
              colorClasses += isFemale
                ? ' hover:border-pink-500/50 hover:text-pink-300 hover:bg-pink-900/10'
                : ' hover:border-blue-500/50 hover:text-blue-300 hover:bg-blue-900/10';
            }
          }

          const layoutClasses =
            mode === 'grid'
              ? 'p-3.5 flex flex-col gap-2'
              : 'px-3 py-2.5 flex items-center gap-2';

          return (
            <button
              key={voice.id}
              onClick={() => onVoiceChange(voice.id)}
              disabled={disabled}
              className={`${baseClasses} ${colorClasses} ${layoutClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Selected gradient overlay */}
              {isSelected && (
                <div
                  className={`absolute inset-0 opacity-15 pointer-events-none ${
                    isFemale
                      ? 'bg-gradient-to-br from-pink-500 to-transparent'
                      : 'bg-gradient-to-br from-blue-500 to-transparent'
                  }`}
                />
              )}

              <div className="relative z-10 flex items-center gap-2 w-full">
                {/* Avatar dot */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${
                    isSelected
                      ? isFemale
                        ? 'bg-pink-950 border-pink-500/40'
                        : 'bg-blue-950 border-blue-500/40'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <User
                    size={12}
                    className={
                      isSelected
                        ? isFemale
                          ? 'text-pink-400'
                          : 'text-blue-400'
                        : 'text-slate-500'
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs font-bold truncate ${
                      isSelected
                        ? isFemale
                          ? 'text-pink-300'
                          : 'text-blue-300'
                        : ''
                    }`}
                  >
                    {voice.label}
                  </div>
                  {/* Gender badge */}
                  <div
                    className={`text-[9px] uppercase font-bold tracking-wider ${
                      isSelected
                        ? isFemale
                          ? 'text-pink-400'
                          : 'text-blue-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {voice.gender}
                  </div>
                </div>

                {/* Selected indicator dot */}
                {isSelected && (
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isFemale
                        ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]'
                        : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                    }`}
                  />
                )}
              </div>

              {/* Grid mode extra info */}
              {mode === 'grid' && (
                <div className="relative z-10 space-y-1">
                  <p
                    className={`text-[11px] leading-relaxed ${
                      isSelected ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {voice.description}
                  </p>
                  <div
                    className={`text-[10px] font-mono border-t pt-1 ${
                      isSelected ? 'border-slate-600/40 text-slate-400' : 'border-slate-800 text-slate-600'
                    }`}
                  >
                    Best for: {voice.recommendedFor}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VoiceSelector;
