/**
 * ManualDataInput.tsx - Captures specific user input for the AI
 * * This component is dynamically rendered when the AI needs 
 * manual data correction or specific field input.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'; 
import { Send, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ManualDataInputProps {
  prompt: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  fields?: string[];
}

export const ManualDataInput: React.FC<ManualDataInputProps> = ({ 
  prompt, 
  onSubmit, 
  onCancel,
  fields = ['value'],
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controls for the shake animation
  const controls = useAnimationControls();

  const triggerShake = async () => {
    // Shakes horizontally by moving x back and forth
    await controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validation for empty input
    if (!inputValue.trim()) {
      setError("Input cannot be empty");
      triggerShake();
      return;
    }

    try {
      // Logic for submission
      setIsSubmitted(true);
      
      setTimeout(() => {
        onSubmit(inputValue);
      }, 1500);
    } catch (err) {
      // 2. Handle server/logic errors
      setIsSubmitted(false);
      setError("Server error. Please try again.");
      triggerShake();
    }
  };

  return (
    <motion.div 
      animate={controls} // Attach shake controls
      className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-lg overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-gray-800">{prompt}</p>
              {error && <AlertCircle className="text-red-500 w-4 h-4 animate-pulse" />}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                      setInputValue(e.target.value);
                      if (error) setError(null); // Clear error on change
                  }}
                  className={`w-full px-4 py-2 text-sm border-2 rounded-lg outline-none transition-all ${
                    error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-400'
                  }`}
                  placeholder={`Enter ${fields[0]}...`}
                />
                
                {error && (
                  <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700">
                  <Send size={14} /> SUBMIT DATA
                </button>
                <button type="button" onClick={onCancel} className="w-12 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                  <X size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 text-green-600"
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M20 6L9 17L4 12"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </svg>
            <p className="text-xs font-bold mt-2 uppercase tracking-widest">Data Sent</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};