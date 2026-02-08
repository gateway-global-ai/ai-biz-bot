import React from 'react';
import { Language } from '../types';
import ModelSelector from './ModelSelector';
import VoiceSelector from './VoiceSelector';
import LanguageSelector from './LanguageSelector';
import { Sparkles } from 'lucide-react';

interface SetupPanelProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  disabled: boolean;
}

const SetupPanel: React.FC<SetupPanelProps> = ({
  selectedModel,
  onModelChange,
  selectedVoice,
  onVoiceChange,
  selectedLanguage,
  onLanguageChange,
  disabled
}) => {
  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
      
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
             <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">Session Configuration</h2>
            <p className="text-sm text-gray-500">Configure the AI model capabilities and voice persona.</p>
          </div>
        </div>

        <div className="space-y-8">
           {/* Section 1: Model */}
           <div>
             <ModelSelector 
               selectedModel={selectedModel}
               onModelChange={onModelChange}
               disabled={disabled}
             />
           </div>

           {/* Section 2: Language */}
           <div className="pt-4 border-t border-gray-800/50">
             <LanguageSelector 
               selectedLanguage={selectedLanguage}
               onLanguageChange={onLanguageChange}
               disabled={disabled}
             />
           </div>

           {/* Section 3: Voice (filtered by selected model per README) */}
           <div className="pt-4 border-t border-gray-800/50">
             <VoiceSelector 
               selectedVoice={selectedVoice}
               onVoiceChange={onVoiceChange}
               selectedModel={selectedModel}
               disabled={disabled}
               mode="grid"
             />
           </div>
        </div>
      </div>

    </div>
  );
};

export default SetupPanel;