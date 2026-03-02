import React from 'react';

export interface BusinessData {
  name: string;
  tagline: string;
  description: string;
  /** Pre-resolved image URLs (e.g. from Google Places photo.getURI()) */
  images: string[];
}

interface Props {
  data: BusinessData;
  isVoiceActive: boolean;
  voiceVolume: number;
  onVoiceToggle: () => void;
  onChatClick: () => void;
}

const HeroSection: React.FC<Props> = ({ data, isVoiceActive, voiceVolume, onVoiceToggle, onChatClick }) => {
  const scale = 1 + (Math.min(voiceVolume, 1) * 1.5);
  const bgImage = data.images.length > 0 ? data.images[0] : 'https://picsum.photos/1600/900?grayscale&blur=2';

  return (
    <div className="relative h-[85vh] min-h-[600px] w-full bg-slate-900 text-white overflow-hidden rounded-[2rem] shadow-xl shadow-slate-200/5 transition-all duration-500 ease-in-out group">
      {/* Background Image with Zoom Effect */}
      <div className="absolute inset-0 select-none">
        <img
          src={bgImage}
          alt={data.name}
          className="w-full h-full object-cover transition-transform duration-[2s] ease-out scale-105 group-hover:scale-110 opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/60 to-slate-900" />
      </div>

      {/* Dynamic Overlay for Voice Mode */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-700 ${isVoiceActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center z-10">

        {/* Text Content */}
        <div className={`transition-all duration-500 ease-out origin-top flex flex-col items-center ${isVoiceActive ? 'scale-95 opacity-50 blur-[2px]' : 'scale-100 opacity-100'}`}>
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-8 border border-white/20 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {data.tagline}
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-white drop-shadow-sm leading-tight">
            {data.name}
          </h1>

          <p className="text-lg md:text-xl text-slate-200/90 max-w-2xl mb-12 leading-relaxed font-light">
            {data.description}
          </p>
        </div>

        {/* Interactive Control Area */}
        <div className="w-full mt-4 flex flex-col items-center">
          {!isVoiceActive ? (
            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <button
                onClick={onVoiceToggle}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 9.364 1.5 1.5 0 01-3 0 6.751 6.751 0 01-6-9.364v-1.5a.75.75 0 01.75-.75z" />
                  </svg>
                  Voice Concierge
                </span>
              </button>

              <button
                onClick={onChatClick}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-semibold transition-all backdrop-blur-sm border border-white/10 hover:border-white/20"
              >
                <span>Chat Concierge</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.355 0-2.697-.056-4.024-.166-1.137-.09-1.98-1.057-1.98-2.193v-4.286c0-.897.494-1.685 1.257-2.071m-6.429 1.256c.004-.326.244-.593.57-.615 1.355-.091 2.697-.167 4.024-.167 1.328 0 2.67.076 4.025.167.326.022.566.29.569.615v4.285c-.003.327-.243.594-.57.615-1.355.092-2.697.168-4.024.168-1.04 0-2.052-.046-3.045-.118H7.5v2.25l-2.25-2.25h-.75c-.327-.021-.567-.288-.569-.615V9.767z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
              {/* Visualizer UI */}
              <div className="relative flex items-center justify-center h-40">
                {/* Outer Glow — GAI Royal Blue (#1346A0) */}
                <div
                  className="absolute w-40 h-40 rounded-full blur-3xl transition-all duration-75 ease-linear will-change-transform"
                  style={{ transform: `scale(${scale})`, background: 'radial-gradient(circle, rgba(19,70,160,0.35) 0%, rgba(139,92,246,0.2) 100%)' }}
                />
                {/* Ripple/Ring Effect */}
                <div
                  className="absolute w-32 h-32 border-2 rounded-full transition-all duration-75 ease-linear"
                  style={{ transform: `scale(${scale * 1.1})`, borderColor: 'rgba(19,70,160,0.45)' }}
                />
                <div
                  className="absolute w-28 h-28 border rounded-full transition-all duration-75 ease-linear"
                  style={{ transform: `scale(${scale * 0.95})`, borderColor: 'rgba(19,70,160,0.65)' }}
                />

                {/* Stop Button */}
                <button
                  onClick={onVoiceToggle}
                  className="relative z-10 w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-500/30 hover:scale-105 transition-all group"
                  title="End Conversation"
                >
                  <div className="w-8 h-8 bg-white rounded-sm group-hover:rounded-md transition-all duration-300" />
                </button>
              </div>

              {/* Status Text */}
              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                  <span className="text-white font-medium tracking-wide">Concierge is Listening</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
