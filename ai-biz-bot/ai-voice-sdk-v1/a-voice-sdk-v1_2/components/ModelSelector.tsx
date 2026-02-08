import React from 'react';
import { Bot, ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled: boolean;
}

const MODELS = [
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', label: 'Gemini 2.5 Flash (Native Audio)', desc: 'Optimized for low-latency speech' },
  { id: 'gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro', desc: 'Complex reasoning & large context' },
  { id: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash', desc: 'Fast multimodal reasoning' },
];

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange, disabled }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Bot size={14} />
        Gemini Model
      </label>
      
      <div className="relative group">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full appearance-none bg-gray-950 border rounded-lg px-4 py-3 pr-10 text-sm font-medium transition-all outline-none
            ${disabled 
              ? 'border-gray-800 text-gray-500 cursor-not-allowed opacity-50' 
              : 'border-gray-700 text-gray-200 hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50'
            }
          `}
        >
          {MODELS.map((model) => (
            <option key={model.id} value={model.id} className="bg-gray-900 text-gray-300 py-2">
              {model.label}
            </option>
          ))}
        </select>
        
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${disabled ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-300'}`}>
          <ChevronDown size={16} />
        </div>
      </div>
      
      {/* Description helper text */}
      <div className="text-[10px] text-gray-500 px-1">
        {MODELS.find(m => m.id === selectedModel)?.desc}
      </div>
    </div>
  );
};

export default ModelSelector;