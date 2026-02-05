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
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="relative mb-8">
        <div 
          className="w-32 h-32 bg-blue-500 rounded-full blur-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
          style={{ transform: `translate(-50%, -50%) scale(${scale})`, opacity: 0.5 }}
        ></div>
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center relative z-10 shadow-xl">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-blue-600">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
           </svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-semibold text-white mb-2">Concierge Active</h2>
      <p className="text-slate-400 mb-8">Listening...</p>
      
      <button 
        onClick={onStop}
        className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-colors flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        End Conversation
      </button>
    </div>
  );
};

export default VoiceIndicator;
