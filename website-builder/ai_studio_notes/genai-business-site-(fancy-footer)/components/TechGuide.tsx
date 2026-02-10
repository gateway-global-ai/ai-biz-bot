import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TechGuide: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Voice Architecture Guide</h2>
            <p className="text-slate-500 text-sm font-medium">Understanding Live vs. Push-to-Talk (PTT) for Small Business</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          {/* Comparison Table */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Live Column */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Live Voice (Full Duplex)</h3>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">●</span>
                    <span><strong>Continuous Stream:</strong> Microphone stays open 100% of the time.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">●</span>
                    <span><strong>Latency:</strong> Zero perceived lag, but higher data cost.</span>
                  </li>
                  <li className="flex gap-2 text-red-600 font-medium">
                    <span className="font-bold">×</span>
                    <span><strong>Phantom Processing:</strong> AI processes background noise and side conversations.</span>
                  </li>
                  <li className="flex gap-2 text-red-600 font-medium">
                    <span className="font-bold">×</span>
                    <span><strong>Privacy:</strong> Customer may forget the mic is on, leading to awkward moments.</span>
                  </li>
                </ul>
              </div>

              {/* PTT Column */}
              <div className="bg-blue-600 p-6 rounded-3xl border border-blue-700 text-white shadow-xl shadow-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                  </div>
                  <h3 className="font-bold text-lg">Push-to-Talk (Half Duplex)</h3>
                </div>
                <ul className="space-y-3 text-sm text-blue-50">
                  <li className="flex gap-2">
                    <span className="text-white font-bold">●</span>
                    <span><strong>Intentional Stream:</strong> Data only flows when the button is actively held.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white font-bold">●</span>
                    <span><strong>Accuracy:</strong> Near 100% since no background noise is captured.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white font-bold">●</span>
                    <span><strong>Cost Efficient:</strong> Business only pays for tokens generated during active speech.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white font-bold">●</span>
                    <span><strong>Privacy First:</strong> "Walkie-Talkie" style gives users full control over their mic.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">The PTT Signal Chain</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-blue-600 font-black text-2xl mb-2">01</div>
                <h4 className="font-bold text-slate-800 mb-1">Capture</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Microphone is initialized only on 'MouseDown'. High-pass filters remove room hiss.</p>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-blue-600 font-black text-2xl mb-2">02</div>
                <h4 className="font-bold text-slate-800 mb-1">Streaming</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Audio is converted to 16-bit PCM chunks and streamed via WebSocket to the Gemini Live API.</p>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-blue-600 font-black text-2xl mb-2">03</div>
                <h4 className="font-bold text-slate-800 mb-1">Response</h4>
                <p className="text-xs text-slate-500 leading-relaxed">On 'MouseUp', the AI closes the context window and returns a human-like voice response.</p>
              </div>
            </div>
          </section>

          {/* Business Verdict */}
          <section className="bg-slate-900 rounded-[2rem] p-8 text-white">
            <h3 className="text-xl font-bold mb-4">Why PTT wins for Main Street</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              For a high-end restaurant or a hair salon, a "Live" microphone is often intrusive. Customers feel watched. 
              <strong> Push-to-Talk </strong> transforms the AI from an "eavesdropper" into a "concierge." 
              It provides the luxury of a human assistant with the discretion of a digital interface.
            </p>
            <div className="flex gap-4">
               <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-blue-400 font-bold mb-1">60% Reduction</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">API Costs</div>
               </div>
               <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-green-400 font-bold mb-1">98% Retention</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Privacy Trust</div>
               </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
           <button onClick={onClose} className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Got it, thanks!</button>
        </div>
      </div>
    </div>
  );
};

export default TechGuide;