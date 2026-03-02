import React, { useState, useRef, useEffect } from 'react';
import { Message } from './types';
import { generateLessonPlan } from './classroomService';

interface Props {
  onLessonReady: (plan: any) => void;
}

const ChatInterface: React.FC<Props> = ({ onLessonReady }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "System Online. Initializing Knowledge Core... \nWhat subject shall we explore today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<number | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const loadingMsgId = Date.now() + 1 + "";
      setMessages(prev => [...prev, { id: loadingMsgId, role: 'model', text: "Analysing request... Accessing Neural Archives..." }]);

      // Set a timer to update the message if it takes too long (image generation is slow)
      loadingTimerRef.current = window.setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === loadingMsgId 
            ? { ...m, text: "Analysing request... Accessing Neural Archives...\n\n[STATUS]: Generating visual assets. This may take a moment..." } 
            : m
        ));
      }, 8000);

      const plan = await generateLessonPlan(userMsg.text);
      
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId ? { ...m, text: `Parameters accepted. Initiating lesson module: "${plan.topic}". Stand by for immersion.` } : m
      ));

      setTimeout(() => {
        onLessonReady(plan);
      }, 2000);

    } catch (err) {
      console.error(err);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      // Show actual error message
      const errorMessage = err instanceof Error ? err.message : "Connection interrupted";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Error: ${errorMessage}. Please try again.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-[#050510] text-cyan-50 font-sans selection:bg-cyan-500/30">
      
      {/* Animated Background Grid & Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
           }}>
      </div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 shadow-[0_0_20px_#06b6d4]"></div>

      {/* HEADER: Fixed at top (flex-none) */}
      <div className="flex-none pt-6 pb-2 z-10 flex flex-col items-center animate-[fadeIn_1s_ease-out]">
        <div className="relative w-24 h-24 mb-4 scale-75 md:scale-100">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-cyan-400/40 animate-[spin_5s_linear_infinite_reverse]" />
          <div className="absolute inset-8 rounded-full bg-cyan-500/5 backdrop-blur-md animate-pulse shadow-[0_0_40px_rgba(6,182,212,0.3)] flex items-center justify-center border border-cyan-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.24 50.552 50.552 0 00-2.658.814m-15.482 0A50.55 50.55 0 0112 13.489a50.55 50.55 0 0112-3.342" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl md:text-3xl font-bold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-blue-400 to-purple-300 drop-shadow-lg font-mono text-center">
          NEXUS CLASSROOM
        </h1>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mt-2 md:mt-4" />
      </div>

      {/* CHAT LOG: Flexible middle area (flex-1) */}
      <div className="flex-1 w-full max-w-2xl relative z-10 min-h-0 px-4 mx-auto flex flex-col">
         {/* Top fade mask */}
         <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#050510] to-transparent z-20 pointer-events-none" />
         
         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 py-4">
            {messages.map((msg, idx) => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]`}>
                  <div className={`
                    max-w-[85%] p-4 rounded-xl border backdrop-blur-md shadow-lg relative overflow-hidden group transition-all duration-300
                    ${msg.role === 'user' 
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-100 rounded-br-none hover:bg-blue-600/20 hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                      : 'bg-slate-800/40 border-cyan-500/20 text-cyan-50 rounded-bl-none hover:bg-slate-800/60 hover:border-cyan-400/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    }
                  `}>
                     {/* Decorative corner accents */}
                     <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20 opacity-50" />
                     <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20 opacity-50" />
                     
                     <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{msg.text}</p>
                     
                     {/* Timestamp decoration */}
                     <span className="text-[9px] text-white/20 block mt-2 font-mono uppercase tracking-wider text-right">
                       {msg.role === 'user' ? 'USR_CMD' : 'SYS_CORE'} // T-{idx}
                     </span>
                  </div>
               </div>
            ))}
            {loading && (
               <div className="flex justify-start animate-pulse">
                  <div className="bg-slate-800/20 border border-cyan-500/10 text-cyan-400/60 p-3 rounded-lg text-xs font-mono">
                     <span className="animate-[pulse_1s_infinite]">▋</span> Processing_Data_Stream...
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
         </div>
         
         {/* Bottom fade mask */}
         <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#050510] to-transparent z-20 pointer-events-none" />
      </div>

      {/* FOOTER: Fixed at bottom (flex-none) */}
      <div className="flex-none w-full max-w-xl z-20 px-4 pb-6 pt-2 mx-auto bg-gradient-to-t from-[#050510] via-[#050510]/90 to-transparent">
        <form onSubmit={handleSubmit} className="w-full relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-lg blur opacity-20 group-hover:opacity-60 transition duration-500 group-hover:duration-200 animate-pulse"></div>
          <div className="relative flex bg-[#0a0a16] ring-1 ring-white/10 rounded-lg shadow-2xl overflow-hidden">
             <div className="pl-4 py-4 text-cyan-500/50 select-none font-mono flex items-center justify-center">
                <svg className="w-4 h-4 animate-[pulse_2s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
             </div>
             <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter subject protocol..."
              className="w-full bg-transparent text-white p-4 focus:outline-none font-mono placeholder-slate-600 text-sm tracking-wide"
              autoFocus
             />
             <button 
               type="submit" 
               disabled={loading || !input.trim()}
               className="px-6 text-cyan-400 hover:text-white hover:bg-cyan-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed uppercase text-[10px] font-bold tracking-[0.2em] border-l border-white/5"
             >
               Initialize
             </button>
          </div>
        </form>
        <p className="text-center text-slate-600 text-[10px] mt-4 font-mono tracking-[0.3em] opacity-60">
           GEMINI-3 QUANTUM LINK ESTABLISHED
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;