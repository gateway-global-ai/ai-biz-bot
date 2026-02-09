import React, { useEffect, useState, useRef } from 'react';
import { LessonPlan, BoardContent } from './types';
import { ClassroomSession, generateSpeech, generateClassroomImage } from './kimiClassroomService';
import { decodeAudioData } from './audioUtils';
import AudioVisualizer from './AudioVisualizer';
import QuizView from './QuizView';

interface Props {
  plan: LessonPlan;
  onEndClass: () => void;
}

const ClassroomInterface: React.FC<Props> = ({ plan, onEndClass }) => {
  const [board, setBoard] = useState<BoardContent>(plan.initialContent);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  
  // Image State
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [lastProcessedImagePrompt, setLastProcessedImagePrompt] = useState<string | null>(null);

  // Audio State
  const outputCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sessionRef = useRef<ClassroomSession | null>(null);
  const [nextStartTime, setNextStartTime] = useState<number>(0);
  
  // Force a re-render for visualizer when analyser is attached
  const [analyserState, setAnalyserState] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    // Initialize Audio Context on mount
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    outputCtxRef.current = ctx;
    
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64; 
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    setAnalyserState(analyser);

    // Initialize Gemini Live Session
    const session = new ClassroomSession({
      onContentUpdate: (content) => {
        setBoard(content);
      },
      onAudioData: (buffer) => {
        playAudioBuffer(buffer);
      },
      onClose: () => setIsConnected(false),
      onError: (err) => setError(err.message || "Connection failed")
    }, ctx);

    sessionRef.current = session;

    session.connect(plan).then(() => {
      setIsConnected(true);
    });

    return () => {
      session.disconnect();
      if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
        outputCtxRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Handle Image Generation when board updates
  useEffect(() => {
    const handleImageGeneration = async () => {
      if (board.imageUrl) {
        setCurrentImageUrl(board.imageUrl);
        setIsGeneratingImage(false);
        return;
      }

      if (board.imagePrompt && board.imagePrompt !== lastProcessedImagePrompt) {
        setIsGeneratingImage(true);
        setLastProcessedImagePrompt(board.imagePrompt);
        setCurrentImageUrl(null);

        try {
          const base64Image = await generateClassroomImage(board.imagePrompt);
          setCurrentImageUrl(base64Image);
        } catch (err) {
          console.error("Failed to generate image:", err);
        } finally {
          setIsGeneratingImage(false);
        }
      } else if (!board.imagePrompt && !board.imageUrl) {
        setCurrentImageUrl(null);
        setLastProcessedImagePrompt(null);
      }
    };

    handleImageGeneration();
  }, [board.imagePrompt, board.imageUrl, lastProcessedImagePrompt]);


  const ensureAudioContext = async () => {
    if (outputCtxRef.current && outputCtxRef.current.state === 'suspended') {
      try {
        await outputCtxRef.current.resume();
      } catch (e) {
        console.error("Failed to resume audio context", e);
      }
    }
  };

  const playAudioBuffer = async (buffer: AudioBuffer) => {
    await ensureAudioContext();
    if (!outputCtxRef.current || !analyserRef.current) return;
    
    const ctx = outputCtxRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current);
    
    const currentTime = ctx.currentTime;
    const start = Math.max(nextStartTime, currentTime);
    
    source.start(start);
    setNextStartTime(start + buffer.duration);
  };

  const handleNarrate = async () => {
    await ensureAudioContext();
    if (!board.content || isNarrating || !outputCtxRef.current || !analyserRef.current) return;
    
    setIsNarrating(true);
    try {
      const textToRead = [
        `Title: ${board.title}`,
        board.content,
        board.bulletPoints?.length ? `Key points: ${board.bulletPoints.join(". ")}` : ""
      ].filter(Boolean).join(". ");

      const audioData = await generateSpeech(textToRead);
      const buffer = await decodeAudioData(audioData, outputCtxRef.current, 24000, 1);
      
      const source = outputCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(analyserRef.current);
      source.onended = () => setIsNarrating(false);
      source.start();
    } catch (e) {
      console.error("Narration failed", e);
      setIsNarrating(false);
    }
  };

  const handleEndClass = () => {
    sessionRef.current?.disconnect();
    onEndClass();
  };

  const handleQuizClose = () => {
    setShowQuiz(false);
    ensureAudioContext(); // Resume audio context just in case
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    sessionRef.current?.setMute(!newState);
  };

  const handleNextSlide = () => {
    sessionRef.current?.sendText("Please move to the next slide or concept in the lesson plan immediately.");
  };

  const handlePrevSlide = () => {
    sessionRef.current?.sendText("Please go back to the previous slide or concept.");
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-slate-100 font-sans" onClick={ensureAudioContext}>
      {/* 1. Immersive Background Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 transform scale-105"
        style={{ 
          backgroundImage: plan.backgroundImageUrl 
            ? `url(${plan.backgroundImageUrl})` 
            : 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop)' 
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      
      {/* Futuristic Grid & Motion Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
         <div className="absolute inset-0" 
              style={{ 
                backgroundImage: 'linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)', 
                backgroundSize: '50px 50px',
                maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)'
              }}>
         </div>
         {/* Moving Scan Line */}
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-[scan_6s_linear_infinite]" />
      </div>

      {/* 2. Floating Header Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-40 pointer-events-none">
        {/* TOC Toggle */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsTocOpen(!isTocOpen); ensureAudioContext(); }}
          className={`pointer-events-auto p-2 md:p-3 backdrop-blur-md border rounded-full transition-all shadow-lg flex items-center gap-2
            ${isTocOpen 
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800/80 text-white'}`
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          {isTocOpen && <span className="hidden md:inline text-xs font-mono font-bold uppercase tracking-wider pr-1">Syllabus</span>}
        </button>

        <div className="flex gap-2">
          {!showQuiz && plan.quiz && plan.quiz.length > 0 && (
            <button
              onClick={() => { setShowQuiz(true); ensureAudioContext(); }}
              className="pointer-events-auto px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30 rounded-full text-white text-xs md:text-sm transition-all uppercase tracking-wider font-mono shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse"
            >
              Start Quiz
            </button>
          )}

          <button 
            onClick={handleEndClass}
            className="pointer-events-auto px-3 py-2 md:px-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 backdrop-blur-md rounded-full text-red-100 text-xs md:text-sm transition-all uppercase tracking-wider font-mono"
          >
            Abort
          </button>
        </div>
      </div>

      {/* 3. Main Stage with Integrated TOC Wing */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4 md:p-8 pb-32 md:pb-40">
        <div className="relative flex items-stretch w-full md:max-w-[90vw] h-full justify-center">
          
          {/* QUIZ OVERLAY */}
          {showQuiz ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center">
               <QuizView questions={plan.quiz} onClose={handleQuizClose} />
            </div>
          ) : (
            <>
              {/* TOC Wing (Left Attachment) */}
              <div className={`
                absolute right-[100%] top-4 bottom-4 w-64 md:w-72 
                bg-slate-950/80 backdrop-blur-xl border-y border-l border-cyan-500/30 rounded-l-2xl 
                transform transition-all duration-500 ease-out origin-right z-0 flex flex-col overflow-hidden
                ${isTocOpen ? 'translate-x-4 opacity-100 scale-100 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]' : 'translate-x-20 opacity-0 scale-90 pointer-events-none'}
              `}>
                 <div className="p-4 bg-cyan-950/30 border-b border-white/5">
                    <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Flight Plan</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                   {plan.syllabus.map((item, idx) => (
                     <div key={idx} className={`p-3 rounded border transition-all ${board.title === item.title ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-slate-500 font-mono">STEP 0{idx + 1}</span>
                          {board.title === item.title && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"/>}
                       </div>
                       <h4 className={`text-xs font-bold ${board.title === item.title ? 'text-cyan-100' : 'text-slate-300'}`}>{item.title}</h4>
                     </div>
                   ))}
                 </div>
                 {/* Tech decoration */}
                 <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
              </div>

              {/* Main Slide Board (Center) */}
              <div className="flex-1 max-w-full md:w-[55rem] max-h-[70vh] md:max-h-[75vh] overflow-y-auto bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col z-20 transition-all duration-500 mx-auto my-auto">
                 
                 {/* Tech Corners */}
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-xl"></div>
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-xl"></div>
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-xl"></div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/50 rounded-br-xl"></div>

                 {/* Slide Header */}
                 <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-black/20 sticky top-0 backdrop-blur-xl z-30">
                    <div>
                       <span className="text-[9px] md:text-[10px] font-mono text-cyan-500 uppercase tracking-[0.2em] mb-1 block">Current Module</span>
                       <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-md truncate max-w-[200px] md:max-w-md">{board.title}</h2>
                    </div>
                    <button
                       onClick={(e) => { e.stopPropagation(); handleNarrate(); }}
                       disabled={isNarrating}
                       className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-1.5 rounded bg-cyan-900/30 border border-cyan-500/30 hover:bg-cyan-800/40 text-cyan-200 text-xs font-mono transition-colors disabled:opacity-50"
                     >
                       {isNarrating ? <span className="animate-spin text-cyan-400">❖</span> : <span>► <span className="hidden md:inline">READ_LOG</span></span>}
                    </button>
                 </div>

                 {/* Slide Content */}
                 <div className="p-4 md:p-8 space-y-6 text-base md:text-lg leading-relaxed text-slate-200 font-light">
                    <p className="border-l-2 border-cyan-500/30 pl-4">{board.content}</p>

                    {/* Dynamic Image */}
                    {isGeneratingImage && (
                      <div className="w-full h-48 md:h-64 bg-cyan-900/10 rounded border border-cyan-500/20 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-[scan_2s_linear_infinite]"></div>
                         <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3 relative z-10"></div>
                         <p className="text-cyan-400 text-xs font-mono relative z-10 animate-pulse">RENDERING_VISUAL_ASSET...</p>
                      </div>
                    )}
                    
                    {currentImageUrl && !isGeneratingImage && (
                      <div className="w-full rounded border border-cyan-500/20 shadow-lg overflow-hidden group">
                        <div className="relative">
                           <img src={currentImageUrl} alt={board.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                           <div className="absolute inset-0 ring-1 ring-inset ring-cyan-500/20 pointer-events-none"></div>
                        </div>
                      </div>
                    )}

                    {board.diagramType === 'list' && board.bulletPoints && (
                      <ul className="grid gap-3">
                        {board.bulletPoints.map((point, i) => (
                          <li key={i} className="flex gap-3 bg-white/5 p-3 md:p-4 rounded border border-white/5 hover:border-cyan-500/30 transition-colors">
                            <span className="text-cyan-400 mt-1 font-mono text-xs">{`0${i+1}`}</span>
                            <span className="text-slate-300 text-sm md:text-base">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {board.diagramType === 'code' && board.codeSnippet && (
                      <div className="bg-black/60 rounded p-4 md:p-6 border border-cyan-500/20 font-mono text-xs md:text-sm text-cyan-300 overflow-x-auto shadow-inner">
                         <pre>{board.codeSnippet}</pre>
                      </div>
                    )}
                 </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* 5. Bottom COMMAND DECK & Virtual Instructor */}
      <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center items-end px-4 pointer-events-none">
        
        {/* Virtual Instructor Avatar (Absolute Left) */}
        {!showQuiz && plan.instructorImageUrl && (
          <div className="absolute left-6 bottom-0 hidden md:flex flex-col items-center group scale-100 origin-bottom-left pointer-events-auto">
             <div className={`relative w-24 h-24 rounded-full border-2 ${isConnected ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'} overflow-hidden bg-slate-800 transition-all duration-300 group-hover:scale-105`}>
                <img src={plan.instructorImageUrl} alt="Instructor" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-[scan_3s_linear_infinite] opacity-50"></div>
             </div>
             <span className="mt-2 text-[10px] font-mono text-cyan-400 bg-black/50 px-2 py-0.5 rounded border border-cyan-500/30">AI_INSTRUCTOR</span>
          </div>
        )}

        {/* INTEGRATED COMMAND MODULE (Center) */}
        <div className="pointer-events-auto flex items-center gap-4 p-2 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all hover:border-cyan-400/50">
           
           {/* Prev Button */}
           <button 
             onClick={handlePrevSlide}
             className="p-3 rounded-xl hover:bg-white/10 text-cyan-400 transition-colors border border-transparent hover:border-white/10 group"
             title="Previous Slide"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform">
               <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
             </svg>
           </button>

           {/* Central Visualizer & Status */}
           <div className="relative flex flex-col items-center px-4 py-1 border-x border-white/5 min-w-[180px]">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center gap-2 mb-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-500 animate-pulse'}`} />
                 <span className={`text-[9px] font-mono uppercase tracking-[0.2em] ${isConnected ? 'text-green-400/80' : 'text-red-400/80'}`}>
                    {isConnected ? 'VOICE_MODULE_ONLINE' : 'LINK_OFFLINE'}
                 </span>
              </div>
              
              <div className="h-10 w-full flex items-center justify-center opacity-90">
                 <AudioVisualizer analyser={analyserState} isActive={isConnected || isNarrating} accentColor={isConnected ? "#22d3ee" : "#ef4444"} />
              </div>
           </div>

           {/* Mic Toggle */}
           <button 
             onClick={toggleMic}
             className={`p-3 rounded-xl transition-all border ${isMicOn ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
             title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
           >
             {isMicOn ? (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
               </svg>
             )}
           </button>

           {/* Next Button */}
           <button 
             onClick={handleNextSlide}
             className="p-3 rounded-xl hover:bg-white/10 text-cyan-400 transition-colors border border-transparent hover:border-white/10 group"
             title="Next Slide"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 group-hover:translate-x-0.5 transition-transform">
               <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
             </svg>
           </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500/50 backdrop-blur text-red-100 px-6 py-3 rounded shadow-xl z-50 text-xs font-mono uppercase tracking-wide w-max max-w-[90vw] text-center">
           [ERR]: {error}
        </div>
      )}
    </div>
  );
};

export default ClassroomInterface;