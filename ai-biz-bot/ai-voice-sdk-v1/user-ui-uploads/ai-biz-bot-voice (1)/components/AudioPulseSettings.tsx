import React, { useState } from 'react';
import { Activity, Mic, Speaker, Info, X, MicOff } from 'lucide-react';
import Visualizer from './Visualizer';
import { VisualizerType } from '../types';

interface AudioPulseSettingsProps {
  volume: number;
  isConnected: boolean;
  visualizerType: VisualizerType;
  isMuted?: boolean;
}

const AudioPulseSettings: React.FC<AudioPulseSettingsProps> = ({ volume, isConnected, visualizerType, isMuted }) => {
  const [showInfo, setShowInfo] = useState<'input' | 'output' | null>(null);

  const isActive = isConnected && !isMuted;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm min-h-[350px] flex flex-col relative overflow-hidden transition-all duration-300 shadow-xl group/card">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 z-10 relative">
        <div className="flex items-center gap-2 text-purple-400">
          <Activity size={18} />
          <span className="text-xs font-bold tracking-wide">LIVE SIGNAL & PIPELINE</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isConnected ? (isMuted ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400') : 'bg-gray-800 text-gray-500'}`}>
          {isConnected ? (isMuted ? 'HALF-DUPLEX (IDLE)' : 'TRANSMITTING') : 'IDLE'}
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 flex items-center justify-center min-h-[120px] relative z-0">
          <Visualizer volume={volume} isActive={isActive} type={visualizerType} />
      </div>

      {/* Sample Rate Controls */}
      <div className="grid grid-cols-2 gap-4 mt-6 z-10 relative">
        {/* Input Card */}
        <button 
          onClick={() => setShowInfo('input')}
          className={`bg-gray-950/50 border rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-gray-900 transition-all group text-left relative ${isMuted ? 'border-orange-500/30' : 'border-gray-800 hover:border-blue-500/50'}`}
        >
           <div className={`p-2 rounded-full transition-transform group-hover:scale-110 ${isMuted ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
             {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
           </div>
           <div>
             <div className="text-[10px] text-gray-500 font-bold uppercase text-center mb-0.5">Input</div>
             <div className={`text-sm font-mono font-bold ${isMuted ? 'text-orange-300' : 'text-blue-300'}`}>16,000 Hz</div>
           </div>
           <Info size={12} className="absolute top-2 right-2 text-gray-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
        </button>

        {/* Output Card */}
        <button 
           onClick={() => setShowInfo('output')}
           className="bg-gray-950/50 border border-gray-800 rounded-xl p-3 flex flex-col items-center gap-2 hover:border-purple-500/50 hover:bg-gray-900 transition-all group text-left relative"
        >
           <div className="p-2 rounded-full bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
             <Speaker size={16} />
           </div>
           <div>
             <div className="text-[10px] text-gray-500 font-bold uppercase text-center mb-0.5">Output</div>
             <div className="text-sm font-mono text-purple-300 font-bold">24,000 Hz</div>
           </div>
           <Info size={12} className="absolute top-2 right-2 text-gray-600 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
        </button>
      </div>

      {/* Info Overlay */}
      {showInfo && (
        <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-md z-20 flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
           <button 
             onClick={(e) => { e.stopPropagation(); setShowInfo(null); }}
             className="absolute top-4 right-4 p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
           >
             <X size={16} />
           </button>
           
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
             {showInfo === 'input' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-blue-400 mb-2 border-b border-blue-500/20 pb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><Mic size={20} /></div>
                    <h3 className="font-bold text-lg font-mono">Input: 16kHz</h3>
                  </div>
                  <p className="text-xs text-blue-200/80 leading-relaxed font-medium">
                    Native sample rate for Gemini Live API Speech-to-Text (STT).
                  </p>
                  <ul className="space-y-3 text-xs text-gray-400">
                    <li className="flex gap-2 items-start">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong className="text-gray-200">Optimal Accuracy:</strong><br/>STT models are optimized for 16kHz audio, ensuring the best possible transcription of user speech.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong className="text-gray-200">Low Latency:</strong><br/>Providing native 16kHz audio prevents server-side resampling, reducing processing overhead.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong className="text-gray-200">Noise Shield:</strong><br/>In PTT mode, input is physically muted at 16kHz until triggered, protecting context from noise.</span>
                    </li>
                  </ul>
                </div>
             ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-purple-400 mb-2 border-b border-purple-500/20 pb-2">
                     <div className="p-2 bg-purple-500/10 rounded-lg"><Speaker size={20} /></div>
                    <h3 className="font-bold text-lg font-mono">Output: 24kHz</h3>
                  </div>
                   <p className="text-xs text-purple-200/80 leading-relaxed font-medium">
                    Native sample rate for Gemini Live API synthesized speech.
                  </p>
                  <ul className="space-y-3 text-xs text-gray-400">
                    <li className="flex gap-2 items-start">
                      <span className="text-purple-500 font-bold mt-0.5">•</span>
                      <span><strong className="text-gray-200">Native Quality:</strong><br/>Playback matches the model generation rate, avoiding client-side resampling artifacts.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-purple-500 font-bold mt-0.5">•</span>
                      <span><strong className="text-gray-200">High Fidelity:</strong><br/>24kHz captures a broader frequency range than standard 16kHz, resulting in a richer, more natural AI voice.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-purple-500 font-bold mt-0.5">•</span>
                      <span><strong className="text-gray-200">Uninterrupted:</strong><br/>In half-duplex mode, output flows cleanly without risk of interruption from microphone background levels.</span>
                    </li>
                  </ul>
                </div>
             )}
           </div>
        </div>
      )}

    </div>
  );
};

export default AudioPulseSettings;