import React, { useState, useMemo } from 'react';
import { VoiceDetail, VoiceTechnology } from '../types';
import { Mic, User, Sparkles } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  disabled: boolean;
  mode?: 'compact' | 'grid';
}

// Only Gemini voices are supported by the Live API model
const ALL_VOICES: VoiceDetail[] = [
  { id: 'Puck', label: 'Puck', gender: 'Male', technology: 'Gemini', description: 'Soft, well-rounded, and somewhat playful.', recommendedFor: 'Storytelling' },
  { id: 'Charon', label: 'Charon', gender: 'Male', technology: 'Gemini', description: 'Deeper, authoritative, and steady.', recommendedFor: 'News / Factual' },
  { id: 'Kore', label: 'Kore', gender: 'Female', technology: 'Gemini', description: 'Gentle, soothing, and empathetic.', recommendedFor: 'Wellness / Support' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'Male', technology: 'Gemini', description: 'Energetic, fast-paced, and intense.', recommendedFor: 'Gaming / Action' },
  { id: 'Zephyr', label: 'Zephyr', gender: 'Female', technology: 'Gemini', description: 'Bright, clear, and professional.', recommendedFor: 'Assistant / Business' },
];

const TECH_INFO = {
  'Gemini': {
    icon: <Sparkles size={14} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    desc: 'Specialized voices optimized for high-throughput, low-latency conversational AI.'
  }
};

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onVoiceChange, disabled, mode = 'compact' }) => {
  // We default to Gemini since it's the only one supported now
  const activeTab = 'Gemini';

  const filteredVoices = useMemo(() => 
    ALL_VOICES.filter(v => v.technology === activeTab), 
  [activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Mic size={14} />
          Voice Persona
        </label>
      </div>

      {/* Technology Description Banner */}
      <div className={`text-[10px] px-3 py-2 rounded-lg border ${TECH_INFO['Gemini'].bg} ${TECH_INFO['Gemini'].border} ${TECH_INFO['Gemini'].color}`}>
         <div className="flex items-center gap-2 mb-1">
            {TECH_INFO['Gemini'].icon}
            <span className="font-bold">Gemini Native Voices</span>
         </div>
         {TECH_INFO['Gemini'].desc}
      </div>
      
      {/* Voice Grid */}
      <div className={`${mode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4' : 'grid grid-cols-2 md:grid-cols-3 gap-2'}`}>
        {filteredVoices.map((voice) => {
           const isSelected = selectedVoice === voice.id;
           const isMale = voice.gender === 'Male';
           
           let baseClasses = "rounded-lg border transition-all text-left group relative overflow-hidden";
           let colorClasses = "";
           
           if (isSelected) {
             colorClasses = isMale 
               ? "bg-blue-500/10 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
               : "bg-pink-500/10 border-pink-500 text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.3)]";
           } else {
             colorClasses = "bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800";
             if (!disabled) {
                colorClasses += isMale ? " hover:border-blue-500/50 hover:text-blue-300" : " hover:border-pink-500/50 hover:text-pink-300";
             }
           }

           const layoutClasses = mode === 'grid' 
             ? "p-4 flex flex-col gap-3 h-full" 
             : "px-3 py-2.5 flex items-center justify-between";

           return (
            <button
              key={voice.id}
              onClick={() => onVoiceChange(voice.id)}
              disabled={disabled}
              className={`${baseClasses} ${colorClasses} ${layoutClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`z-10 ${mode === 'grid' ? 'flex flex-col gap-2' : ''} w-full`}>
                <div className="flex items-center justify-between w-full">
                   <div className="font-bold tracking-wide flex items-center gap-2">
                      <User size={14} className="opacity-50"/>
                      {voice.label}
                   </div>
                   {mode === 'grid' && (
                     <div className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                       isSelected 
                         ? (isMale ? 'bg-blue-500/20 border-blue-400/30 text-blue-200' : 'bg-pink-500/20 border-pink-400/30 text-pink-200')
                         : 'bg-gray-800 border-gray-600 text-gray-500'
                     }`}>
                       {voice.gender}
                     </div>
                   )}
                </div>
                
                {mode === 'grid' && (
                  <>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                      {voice.description}
                    </p>
                    {voice.recommendedFor && (
                      <div className={`mt-auto pt-2 text-[10px] font-mono border-t ${isSelected ? 'border-gray-500/30 text-gray-300' : 'border-gray-800 text-gray-600'}`}>
                        Best for: {voice.recommendedFor}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {isSelected && (
                <div className={`absolute inset-0 opacity-20 ${
                    isMale 
                    ? 'bg-gradient-to-br from-blue-600 to-transparent' 
                    : 'bg-gradient-to-br from-pink-600 to-transparent'
                }`} />
              )}
            </button>
           );
        })}
      </div>
    </div>
  );
};

export default VoiceSelector;