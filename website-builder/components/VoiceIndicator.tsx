import React, { useEffect, useState } from 'react';

interface Props {
  isActive: boolean;
  volume: number;
  onStop: () => void;
}

const VoiceIndicator: React.FC<Props> = ({ isActive, volume, onStop }) => {
  if (!isActive) return null;

  // Scale volume 0-1 to simpler visual scale
  const scale = 1 + (Math.min(volume, 1) * 2);

  return (
    <div className="fixed inset-0 z-[100] bg-surface-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* PROFESSIONAL DARK BLUE HEADER ANCHOR */}
      <div className="absolute top-0 left-0 right-0 bg-[#1E3A8A] p-4 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">AI</div>
          <span className="font-semibold tracking-tight">Voice Concierge</span>
        </div>
        <button onClick={onStop} className="hover:bg-white/10 p-1 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative mb-12">
        {/* PINK PULSE: Brand Action Color */}
        <div 
          className="w-48 h-48 bg-brand-pink rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-out"
          style={{ transform: `translate(-50%, -50%) scale(${scale})`, opacity: 0.15 }}
        ></div>
        <div className="w-32 h-32 bg-surface-white rounded-full flex items-center justify-center relative z-10 shadow-2xl border border-slate-100">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-brand-pink animate-pulse">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3-3z" />
           </svg>
        </div>
      </div>
      
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Concierge Active</h2>
        <p className="text-text-secondary text-lg">I'm listening... How can I help with your journey?</p>
      </div>
      
      <div className="absolute bottom-12">
        <button 
          onClick={onStop}
          className="px-10 py-4 bg-brand-pink hover:bg-brand-darkPink text-white rounded-full font-bold transition-all shadow-xl shadow-brand-pink/20 flex items-center gap-3 hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          End Conversation
        </button>
      </div>
    </div>
  );
};

export default VoiceIndicator;
