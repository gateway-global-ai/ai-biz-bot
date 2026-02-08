import React from 'react';
import { Language } from '../types';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  disabled: boolean;
}

const LANGUAGES = [
  { id: Language.English, label: 'English', flag: '🇺🇸' },
  { id: Language.Spanish, label: 'Spanish', flag: '🇪🇸' },
  { id: Language.French, label: 'French', flag: '🇫🇷' },
  { id: Language.German, label: 'German', flag: '🇩🇪' },
  { id: Language.Hindi, label: 'Hindi', flag: '🇮🇳' },
  { id: Language.Russian, label: 'Russian', flag: '🇷🇺' },
  { id: Language.Japanese, label: 'Japanese', flag: '🇯🇵' },
  { id: Language.Portuguese, label: 'Portuguese', flag: '🇧🇷' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onLanguageChange, disabled }) => {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Globe size={14} />
        Spoken Language
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => onLanguageChange(lang.id)}
            disabled={disabled}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
              ${selectedLanguage === lang.id
                ? 'bg-blue-500/10 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-800 hover:border-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="text-sm font-medium">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;