import React, { useState, useEffect, useRef } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ManualCorrectionBoxProps {
  label: string;
  fieldType: 'address' | 'business_name' | 'email' | 'phone';
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const ManualCorrectionBox: React.FC<ManualCorrectionBoxProps> = ({
  label,
  fieldType,
  initialValue = '',
  onSubmit,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSubmit(value);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={16} className="text-blue-600" />
        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeydown}
          placeholder={`Please type the correct ${fieldType.replace('_', ' ')}...`}
          className="w-full h-12 px-4 pr-24 bg-white border-2 border-blue-200 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
        />
        
        <div className="absolute right-1.5 top-1.5 bottom-1.5 flex gap-1">
          <button
            onClick={onCancel}
            className="px-2 hover:bg-gray-100 rounded-md text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => onSubmit(value)}
            className="px-3 bg-blue-600 text-white rounded-md flex items-center gap-1 text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Check size={16} />
            SAVE
          </button>
        </div>
      </div>
      
      <p className="text-[10px] text-blue-400 mt-2 italic">
        Press Enter to confirm or ESC to cancel.
      </p>
    </motion.div>
  );
};
