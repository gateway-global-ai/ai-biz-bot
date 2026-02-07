import React, { useState, useMemo } from 'react';
import { VoiceDetail, VoiceTechnology } from '../types';
import { Mic, User, Sparkles, Zap, Activity, Waves } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  disabled: boolean;
  mode?: 'compact' | 'grid';
}

// Extended voice database
const ALL_VOICES: VoiceDetail[] = [
  // Gemini Live Voices
  { id: 'Puck', label: 'Puck', gender: 'Male', technology: 'Gemini', description: 'Soft, well-rounded, and somewhat playful.', recommendedFor: 'Storytelling' },
  { id: 'Charon', label: 'Charon', gender: 'Male', technology: 'Gemini', description: 'Deeper, authoritative, and steady.', recommendedFor: 'News / Factual' },
  { id: 'Kore', label: 'Kore', gender: 'Female', technology: 'Gemini', description: 'Gentle, soothing, and empathetic.', recommendedFor: 'Wellness / Support' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'Male', technology: 'Gemini', description: 'Energetic, fast-paced, and intense.', recommendedFor: 'Gaming / Action' },
  { id: 'Zephyr', label: 'Zephyr', gender: 'Female', technology: 'Gemini', description: 'Bright, clear, and professional.', recommendedFor: 'Assistant / Business' },

  // Chirp 3 HD (Examples)
  { id: 'en-US-Chirp3-HD-Fenrir', label: 'Chirp HD 1', gender: 'Male', technology: 'Chirp 3 HD', description: 'Ultra-realistic foundation model voice with rich prosody.' },
  { id: 'en-US-Chirp3-HD-Kore', label: 'Chirp HD 2', gender: 'Female', technology: 'Chirp 3 HD', description: 'High-fidelity voice optimized for long-form content.' },
  
  // Neural2
  { id: 'en-US-Neural2-A', label: 'Neural2-A', gender: 'Male', technology: 'Neural2', description: 'Transformer-based voice with customizable pitch/rate.' },
  { id: 'en-US-Neural2-C', label: 'Neural2-C', gender: 'Female', technology: 'Neural2', description: 'Smooth, professional neural synthesis.' },
  { id: 'en-US-Neural2-F', label: 'Neural2-F', gender: 'Female', technology: 'Neural2', description: 'Warm and expressive, good for narration.' },

  // WaveNet
  { id: 'en-US-Wavenet-A', label: 'WaveNet-A', gender: 'Male', technology: 'WaveNet', description: 'Deep generative model, the classic high-quality standard.' },
  { id: 'en-US-Wavenet-D', label: 'WaveNet-D', gender: 'Male', technology: 'WaveNet', description: 'Robust and clear, widely used for IVR.' },
];

const TECH_INFO = {
  'Gemini': {
    icon: <Sparkles size={14} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    desc: 'Specialized voices optimized for high-throughput, low-latency conversational AI.'
  },
  'Chirp 3 HD': {
    icon: <Activity size={14} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    desc: 'Latest foundation models trained on 2M+ hours of audio for peak realism.'
  },
  'Neural2': {
    icon: <Zap size={14} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    desc: 'Transformer-based architecture offering efficient, high-quality synthesis.'
  },
  'WaveNet': {
    icon: <Waves size={14} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    desc: 'Deep generative models that simulate raw audio waveforms directly.'
  }
};

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onVoiceChange, disabled, mode = 'compact' }) => {
  const [activeTab, setActiveTab] = useState<VoiceTechnology>('Gemini');

  const filteredVoices = useMemo(() => 
    ALL_VOICES.filter(v => v.technology === activeTab), 
  [activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Mic size={14} />
          Voice Technology & Persona
        </label>
      </div>

      {/* Technology Tabs */}
      <div className="flex p-1 bg-gray-950 border border-gray-800 rounded-xl overflow-x-auto custom-scrollbar">
        {(Object.keys(TECH_INFO) as VoiceTechnology[]).map((tech) => (
          <button
            key={tech}
            onClick={() => setActiveTab(tech)}
            disabled={disabled}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
              ${activeTab === tech 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className={activeTab === tech ? TECH_INFO[tech].color : ''}>
               {TECH_INFO[tech].icon}
            </span>
            {tech}
          </button>
        ))}
      </div>

      {/* Technology Description Banner */}
      <div className={`text-[10px] px-3 py-2 rounded-lg border ${TECH_INFO[activeTab].bg} ${TECH_INFO[activeTab].border} ${TECH_INFO[activeTab].color}`}>
         <span className="font-bold mr-1">Technology:</span> {TECH_INFO[activeTab].desc}
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