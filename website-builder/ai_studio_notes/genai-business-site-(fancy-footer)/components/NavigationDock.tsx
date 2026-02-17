import React from 'react';
import { AgentRole, ViewState } from '../types';

const ChevronLeft = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
);
const DollarSign = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const Mic = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75V3m3.75 18h-7.5" /></svg>
);

interface NavigationDockProps {
  viewState: ViewState;
  activeRole: AgentRole;
  isVoiceActive: boolean;
  isRecording: boolean;
  voiceVolume: number;
  onReset: () => void;
  onSwitchRole: (role: AgentRole) => void;
  onPTTStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onPTTEnd: (e: React.MouseEvent | React.TouchEvent) => void;
  onEnableVoice: () => void;
  onBuy: () => void;
}

const ModernFooterPtt = ({ recording, volume }: { recording: boolean; volume: number }) => (
  <div
    className={`
    relative w-full h-full rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 border-[1.5px] group
    ${recording
      ? 'bg-emerald-900/80 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-[0.98]'
      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-lg backdrop-blur-md'}
  `}
  >
    <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
      <span
        className={`text-[11px] font-black uppercase tracking-[0.25em] ${recording ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
      >
        {recording ? 'Transmitting' : 'Push to Talk'}
      </span>
      <div className="flex items-end justify-center gap-1 h-3">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`w-0.5 rounded-full transition-all duration-75 ${recording ? 'bg-emerald-400' : 'bg-slate-600/50'}`}
            style={{
              height: `${recording ? Math.max(20, Math.random() * 100 * (volume * 8)) : 15}%`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

const NavigationDock: React.FC<NavigationDockProps> = ({
  viewState,
  activeRole,
  isVoiceActive,
  isRecording,
  voiceVolume,
  onReset,
  onSwitchRole,
  onPTTStart,
  onPTTEnd,
  onEnableVoice,
  onBuy,
}) => {
  const isGenerated = viewState === ViewState.GENERATED;
  const isLanding = viewState === ViewState.LANDING;

  return (
    <footer className="fixed bottom-0 left-0 w-full h-[18vh] min-h-[140px] bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 z-[100] flex items-center shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
      {/* Left: Back Action */}
      <div className="flex-1 flex justify-start h-full items-center">
        {!isLanding ? (
          <button
            onClick={onReset}
            className="h-full px-12 flex flex-col items-center justify-center gap-1 group hover:bg-white/5 border-r border-white/5 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-white" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 group-hover:text-white">
              Back
            </span>
          </button>
        ) : (
          <div className="px-12 opacity-10 text-[9px] font-black uppercase text-slate-500">Standby</div>
        )}
      </div>

      {/* Center: PTT & Role Toggle */}
      <div className="w-[50%] h-full flex flex-col items-center justify-center gap-3">
        {!isVoiceActive && isLanding ? (
          <button
            onClick={onEnableVoice}
            className="px-10 py-5 bg-blue-600/10 border border-blue-500/30 rounded-full hover:bg-blue-600/20 flex flex-col items-center gap-1 shadow-xl"
          >
            <Mic className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Enable Voice</span>
          </button>
        ) : (
          <>
            {!isLanding && (
              <div className="flex bg-white/5 rounded-full p-0.5 border border-white/10 backdrop-blur-md scale-90">
                <button
                  onClick={() => onSwitchRole('customer')}
                  className={`px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeRole === 'customer' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >
                  Customer
                </button>
                <button
                  onClick={() => onSwitchRole('owner')}
                  className={`px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeRole === 'owner' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                >
                  Owner
                </button>
              </div>
            )}
            <div
              className="w-full max-w-md h-20 relative select-none"
              onMouseDown={onPTTStart}
              onMouseUp={onPTTEnd}
              onMouseLeave={onPTTEnd}
              onTouchStart={onPTTStart}
              onTouchEnd={onPTTEnd}
            >
              <ModernFooterPtt recording={isRecording} volume={voiceVolume} />
            </div>
          </>
        )}
      </div>

      {/* Right: Buy Action */}
      <div className="flex-1 flex justify-end h-full items-center">
        {isGenerated ? (
          <button
            onClick={onBuy}
            className="h-full px-12 flex flex-col items-center justify-center gap-1 group hover:bg-white/5 border-l border-white/5 transition-all"
          >
            <DollarSign className="w-5 h-5 text-slate-500 group-hover:text-white" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 group-hover:text-white">
              Buy
            </span>
          </button>
        ) : (
          <div className="px-12 opacity-10 text-[9px] font-black uppercase text-slate-500">Protected</div>
        )}
      </div>
    </footer>
  );
};

export default NavigationDock;
