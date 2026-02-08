
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, ArrowLeft, BarChart3, CheckCircle2, Copy, 
  Cpu, Database, Eye, GitBranch, Globe, LineChart, 
  RefreshCw, Server, ShieldCheck, User, Zap, Terminal,
  AlertTriangle, Check, ArrowRight, Play, Pause, SkipForward,
  XCircle, Mic, Volume2, Timer, VolumeX
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, Cell, AreaChart, Area
} from 'recharts';
import { COLORS } from '../constants';
import { DiscRadar } from './Charts';

interface NeuralTelemetryDashboardProps {
  onBack: () => void;
}

// --- Mock Data ---

const MOCK_STREAM = [
  { id: 'evt_1', time: '10:42:05', agent: 'Concierge', userState: 'Angry', endState: 'Calm', duration: '2m 14s', outcome: 'Resolved' },
  { id: 'evt_2', time: '10:42:18', agent: 'Sales', userState: 'Curious', endState: 'Excited', duration: '5m 01s', outcome: 'Conversion' },
  { id: 'evt_3', time: '10:43:45', agent: 'Support', userState: 'Frustrated', endState: 'Neutral', duration: '12m 30s', outcome: 'Escalated' },
  { id: 'evt_4', time: '10:44:02', agent: 'Concierge', userState: 'Neutral', endState: 'Happy', duration: '1m 12s', outcome: 'Resolved' },
  { id: 'evt_5', time: '10:44:55', agent: 'Tech Ops', userState: 'Confused', endState: 'Clarity', duration: '8m 45s', outcome: 'Resolved' },
];

const ALIGNMENT_DATA = [
  { subject: 'Dominance', user: 80, agent: 40, fullMark: 100 },
  { subject: 'Influence', user: 50, agent: 70, fullMark: 100 },
  { subject: 'Steadiness', user: 30, agent: 80, fullMark: 100 },
  { subject: 'Conscientious', user: 90, agent: 60, fullMark: 100 },
];

const TOOL_DATA = [
  { name: 'Knowledge Base', usage: 450, success: 85 },
  { name: 'Calendar', usage: 320, success: 92 },
  { name: 'Maps/Geo', usage: 180, success: 78 },
  { name: 'Payment', usage: 120, success: 65 },
];

const RECIPES = [
  { 
    id: 1, 
    trigger: 'High-D (Dominant) User', 
    insight: 'Agents using concise context (<50 chars) have a 40% higher CSAT.',
    action: 'Enforce Brevity Protocol',
    applied: false 
  },
  { 
    id: 2, 
    trigger: 'High Frustration Signal', 
    insight: 'Early "Validation" statements reduce call duration by average 3.5 mins.',
    action: 'Auto-inject Empathy Layer',
    applied: true 
  }
];

// --- Simulation Data & Components ---

const SIM_SCENARIO = [
  {
    id: 1,
    phase: "Phase 1: Panic (High Stress)",
    context: "User running late for flight UA123. Worried about traffic.",
    userText: "I'm stuck in traffic and freaking out! Is flight UA123 still on time? I literally cannot miss this meeting!",
    agentText: "I'm checking UA123 now. It is currently delayed by 30 minutes. You have a buffer.",
    duration: 7,
    userArch: { a: 1.0, r: 0.5, c: 4.0, h: 1.5 },
    agentArch: { a: 1.0, r: 0.8, c: 3.7, h: 1.5 }, // Green sync (<1s diff)
    disc: { dominance: 85, influence: 70, steadiness: 10, conscientiousness: 15 }
  },
  {
    id: 2,
    phase: "Phase 2: Relief (Task Oriented)",
    context: "User calming down. Needs security wait times.",
    userText: "Oh thank god. Okay. What about security lines? I'm at the north checkpoint entrance.",
    agentText: "North checkpoint wait time is currently 12 minutes. You will clear it easily with the delay.",
    duration: 15,
    userArch: { a: 3.0, r: 3.0, c: 6.0, h: 3.0 },
    agentArch: { a: 3.2, r: 2.8, c: 6.5, h: 2.5 }, // Green sync
    disc: { dominance: 40, influence: 50, steadiness: 60, conscientiousness: 40 }
  },
  {
    id: 3,
    phase: "Phase 3: Social (Planning)",
    context: "User relaxed. Looking for food/drink recommendations.",
    userText: "Awesome. Hey, since I have time now, is there anywhere decent to grab a sandwich? Maybe a cocktail?",
    agentText: "Absolutely. 'Cloud Cafe' is by Gate 42. 4.6 stars. They have great pre-made paninis and espresso martinis.",
    duration: 20,
    userArch: { a: 5.0, r: 4.0, c: 8.0, h: 3.0 },
    agentArch: { a: 5.5, r: 3.5, c: 8.5, h: 2.5 }, // Yellow/Green sync
    disc: { dominance: 20, influence: 85, steadiness: 75, conscientiousness: 20 }
  }
];

// Helper for generating mock data stream sounds
class ToneGenerator {
  ctx: AudioContext | null = null;
  osc: OscillatorNode | null = null;
  gain: GainNode | null = null;
  isPlaying: boolean = false;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  start(type: 'user' | 'agent') {
    if (this.isPlaying || !this.ctx) return;
    this.ctx.resume();
    
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    
    this.osc.type = type === 'user' ? 'sawtooth' : 'sine';
    this.osc.frequency.value = type === 'user' ? 120 : 440; // Lower for user, higher/cleaner for agent
    
    // Modulation LFO for "speech-like" amplitude
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8; // 8Hz modulation
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300; 

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    
    this.osc.start();
    this.isPlaying = true;
    
    // Random volume flutter
    this.gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
  }

  stop() {
    if (!this.isPlaying) return;
    const now = this.ctx?.currentTime || 0;
    this.gain?.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    this.osc?.stop(now + 0.1);
    setTimeout(() => {
        this.osc = null;
        this.gain = null;
        this.isPlaying = false;
    }, 150);
  }
}

const StreamVisualizer = ({ isActive, color = '#8b5cf6' }: { isActive: boolean; color?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 40;
    
    const draw = () => {
      // Setup canvas scaling for retina displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, rect.width, rect.height);
      
      if (!isActive) {
        // Draw flat line
        ctx.beginPath();
        ctx.moveTo(0, rect.height / 2);
        ctx.lineTo(rect.width, rect.height / 2);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      const barWidth = rect.width / bars;
      const time = Date.now() / 100;

      for (let i = 0; i < bars; i++) {
        // Perlin-ish noise
        const noise = Math.sin(i * 0.5 + time) * Math.cos(i * 0.2 - time) * Math.sin(time * 2);
        const height = Math.abs(noise) * rect.height * 0.8;
        
        const x = i * barWidth;
        const y = (rect.height - height) / 2;
        
        ctx.fillStyle = color;
        // Gradient opacity for tail effect
        ctx.globalAlpha = 0.5 + (Math.sin(i / bars * Math.PI) * 0.5); 
        
        // Rounded bars
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, height, 4);
        ctx.fill();
      }
      
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, color]);

  return <canvas ref={canvasRef} className="w-full h-12 rounded-lg" />;
};

const ArchBar = ({ data, totalDuration, label, colorSet, isPlaying, progress }: any) => {
  // progress is 0-100
  const widthPercent = (val: number) => (val / totalDuration) * 100;
  
  return (
    <div className="relative mb-6">
      <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
         <span>{label}</span>
         <span className="font-mono">{totalDuration}s Window</span>
      </div>
      <div className="h-12 bg-slate-900 rounded-lg border border-slate-800 flex overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 flex">
           {Array.from({ length: totalDuration }).map((_, i) => (
             <div key={i} className="flex-1 border-r border-slate-800/30" />
           ))}
        </div>

        {/* Segments */}
        <div 
           className="h-full flex transition-all duration-300 ease-linear"
           style={{ width: isPlaying ? `${progress}%` : '100%' }}
        >
           <div style={{ width: `${widthPercent(data.a)}%`, backgroundColor: COLORS.A }} className="h-full flex items-center justify-center text-[10px] font-bold text-white/90 border-r border-black/20 overflow-hidden whitespace-nowrap">A</div>
           <div style={{ width: `${widthPercent(data.r)}%`, backgroundColor: COLORS.R }} className="h-full flex items-center justify-center text-[10px] font-bold text-white/90 border-r border-black/20 overflow-hidden whitespace-nowrap">R</div>
           <div style={{ width: `${widthPercent(data.c)}%`, backgroundColor: COLORS.Cx }} className="h-full flex items-center justify-center text-[10px] font-bold text-white/90 border-r border-black/20 overflow-hidden whitespace-nowrap">C</div>
           <div style={{ width: `${widthPercent(data.h)}%`, backgroundColor: COLORS.H }} className="h-full flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden whitespace-nowrap">H</div>
        </div>
      </div>
    </div>
  );
};

const SimulationView = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'user' | 'agent' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const timerRef = useRef<number>(0);
  const toneGen = useRef<ToneGenerator>(new ToneGenerator());

  const currentScenario = SIM_SCENARIO[step];
  
  const startSimulation = () => {
    setPhase('user');
    setProgress(0);
  };

  useEffect(() => {
    // Phase 1: User Speaking
    if (phase === 'user') {
      if (soundEnabled) toneGen.current.start('user');
      
      const interval = 50; 
      const durationMs = currentScenario.duration * 1000; 
      const speedFactor = 2; // 2x speed
      const stepSize = (interval / durationMs) * 100 * speedFactor;

      timerRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timerRef.current);
            setPhase('agent');
            setProgress(0); // Reset for agent bar
            return 100;
          }
          return prev + stepSize;
        });
      }, interval);

      return () => {
        clearInterval(timerRef.current);
        toneGen.current.stop();
      };
    }

    // Phase 2: Agent Speaking
    if (phase === 'agent') {
      if (soundEnabled) toneGen.current.start('agent');
      
      // Agent speaks for roughly 60% of user time in this sim
      const durationMs = (currentScenario.duration * 0.6) * 1000;
      const interval = 50;
      const speedFactor = 2;
      const stepSize = (interval / durationMs) * 100 * speedFactor;

      timerRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timerRef.current);
            setPhase('done');
            return 100;
          }
          return prev + stepSize;
        });
      }, interval);

      return () => {
        clearInterval(timerRef.current);
        toneGen.current.stop();
      };
    }
  }, [phase, currentScenario, soundEnabled]);

  const handleNext = () => {
    if (step < SIM_SCENARIO.length - 1) {
      setStep(prev => prev + 1);
      setPhase('idle');
      setProgress(0);
    } else {
      setStep(0);
      setPhase('idle');
      setProgress(0);
    }
  };

  // Calculate Sync Quality
  const userTotal = Object.values(currentScenario.userArch).reduce((a, b) => a + b, 0);
  const agentTotal = Object.values(currentScenario.agentArch).reduce((a, b) => a + b, 0);
  const diff = Math.abs(userTotal - agentTotal);
  
  let syncColor = 'text-emerald-400';
  let syncBorder = 'border-emerald-500';
  if (diff > 2) {
    syncColor = 'text-red-400';
    syncBorder = 'border-red-500';
  } else if (diff > 1) {
    syncColor = 'text-amber-400';
    syncBorder = 'border-amber-500';
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      {/* Simulation Header */}
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-6">
           <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
             <XCircle className="w-8 h-8" />
           </button>
           <div>
             <h2 className="text-2xl font-black text-white flex items-center gap-3">
               <Cpu className="w-6 h-6 text-violet-500" />
               Live Interaction Simulator
             </h2>
             <p className="text-slate-400 font-mono text-sm flex items-center gap-2 mt-1">
               <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
               RECORDING SESSION #934-Alpha
             </p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setSoundEnabled(!soundEnabled)}
             className={`p-2 rounded-lg border transition-all ${soundEnabled ? 'bg-slate-800 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
             title="Toggle Audio Feedback"
           >
             {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
           </button>
           <div className="h-10 w-px bg-slate-800" />
           <div className="text-right">
             <div className="text-sm font-bold text-slate-300">{currentScenario.phase}</div>
             <div className="text-xs text-slate-500">{currentScenario.context}</div>
           </div>
           <div className="h-10 w-px bg-slate-800" />
           <div className={`px-4 py-2 rounded-lg border ${phase === 'done' ? 'bg-slate-900 ' + syncBorder : 'bg-slate-900 border-slate-800'}`}>
              <div className={`text-xl font-black ${phase === 'done' ? syncColor : 'text-slate-600'}`}>
                 {phase === 'done' ? `${diff.toFixed(1)}s` : '--'}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Latency Delta</div>
           </div>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 overflow-y-auto p-8 grid grid-cols-12 gap-8">
        
        {/* Left: ARCH Bars & Dialogue */}
        <div className="col-span-8 flex flex-col gap-8">
           
           {/* Visualizer Container */}
           <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                 <Activity className="w-32 h-32 text-slate-700" />
              </div>

              {/* User Track */}
              <div className="mb-10 relative z-10">
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-white">User Audio Stream</span>
                        {phase === 'user' && <span className="text-[10px] bg-red-500 text-white px-2 rounded animate-pulse">LIVE</span>}
                    </div>
                    {phase === 'user' && <span className="font-mono text-xs text-slate-500">Processing Input...</span>}
                 </div>
                 
                 <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-12">
                         <ArchBar 
                            data={currentScenario.userArch} 
                            totalDuration={currentScenario.duration} 
                            label="ARCH Window Recording" 
                            isPlaying={phase === 'user'}
                            progress={phase === 'user' ? progress : 100}
                         />
                    </div>
                 </div>

                 <div className="flex gap-4 mt-2">
                    <div className="w-1/4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Voice Amplitude</div>
                        <StreamVisualizer isActive={phase === 'user'} color="#f43f5e" />
                    </div>
                    <div className="flex-1">
                        <div className={`h-full bg-slate-950/50 p-4 rounded-xl border border-slate-800 transition-all duration-500 flex items-center ${phase !== 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                            <p className="text-lg font-medium text-slate-200">"{currentScenario.userText}"</p>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Connection Lines */}
              {(phase === 'agent' || phase === 'done') && (
                 <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-16 flex justify-between px-[10%] opacity-30 pointer-events-none">
                    <div className="w-px h-full bg-gradient-to-b from-slate-500 to-violet-500 dashed" />
                    <div className="w-px h-full bg-gradient-to-b from-slate-500 to-violet-500 dashed" />
                    <div className="w-px h-full bg-gradient-to-b from-slate-500 to-violet-500 dashed" />
                 </div>
              )}

              {/* Agent Track */}
              <div className={`transition-all duration-700 ${phase === 'agent' || phase === 'done' ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 grayscale'}`}>
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Cpu className="w-5 h-5 text-violet-400" />
                        <span className="text-sm font-bold text-white">Agent Response (Mirroring)</span>
                        {phase === 'agent' && <span className="text-[10px] bg-emerald-500 text-white px-2 rounded animate-pulse">GENERATING</span>}
                    </div>
                    {phase === 'agent' && <span className="font-mono text-xs text-emerald-400">Matching ARCH Pattern...</span>}
                 </div>

                 <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-12">
                         <ArchBar 
                            data={currentScenario.agentArch} 
                            totalDuration={currentScenario.duration} 
                            label="Target Window Response" 
                            isPlaying={phase === 'agent'}
                            progress={phase === 'agent' ? progress : (phase === 'done' ? 100 : 0)}
                         />
                    </div>
                 </div>

                 <div className="flex gap-4 mt-2">
                    <div className="w-1/4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Output Stream</div>
                        <StreamVisualizer isActive={phase === 'agent'} color="#8b5cf6" />
                    </div>
                    <div className="flex-1">
                        <div className={`h-full bg-violet-900/10 p-4 rounded-xl border border-violet-500/20 flex items-center transition-all duration-500 ${phase === 'done' ? 'opacity-100' : 'opacity-0'}`}>
                            <p className="text-lg font-medium text-violet-200">"{currentScenario.agentText}"</p>
                        </div>
                    </div>
                 </div>
              </div>

           </div>

           {/* Controls */}
           <div className="flex justify-center gap-4">
              {phase === 'idle' && (
                 <button onClick={startSimulation} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                    <Play className="w-5 h-5" /> Start Simulation
                 </button>
              )}
              {(phase === 'user' || phase === 'agent') && (
                 <button className="px-8 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold flex items-center gap-2 cursor-wait border border-slate-700">
                    <Activity className="w-5 h-5 animate-spin" /> Processing Audio Stream...
                 </button>
              )}
              {phase === 'done' && (
                 <button onClick={handleNext} className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-violet-900/20 transition-all hover:scale-105">
                    <SkipForward className="w-5 h-5" /> Next Phase
                 </button>
              )}
           </div>

        </div>

        {/* Right: DISC Tuning Fork */}
        <div className="col-span-4 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col">
           <div className="mb-6 pb-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                 <GitBranch className="w-5 h-5 text-amber-400" /> Real-time Profiling
              </h3>
              <p className="text-xs text-slate-400">
                 Analyzing vocal tone, pace, and sentiment to construct a behavioral model.
              </p>
           </div>
           
           <div className="flex-1 flex flex-col items-center justify-center relative">
              {/* The "Tuning Fork" Effect */}
              {phase !== 'idle' && phase !== 'done' && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-violet-500/20 rounded-full animate-ping" />
                    <div className="w-48 h-48 border-4 border-emerald-500/20 rounded-full animate-ping [animation-delay:0.2s]" />
                 </div>
              )}
              
              <div className={`transition-all duration-1000 ${phase !== 'done' && phase !== 'idle' ? 'opacity-50 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'}`}>
                 <DiscRadar data={currentScenario.disc} />
              </div>

              <div className="w-full mt-8 space-y-3">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Dominance</span>
                    <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${currentScenario.disc.dominance}%` }} />
                    </div>
                    <span className="font-mono text-red-400 w-8 text-right">{currentScenario.disc.dominance}%</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Influence</span>
                    <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${currentScenario.disc.influence}%` }} />
                    </div>
                    <span className="font-mono text-amber-400 w-8 text-right">{currentScenario.disc.influence}%</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Steadiness</span>
                    <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${currentScenario.disc.steadiness}%` }} />
                    </div>
                    <span className="font-mono text-emerald-400 w-8 text-right">{currentScenario.disc.steadiness}%</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold">Compliance</span>
                    <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${currentScenario.disc.conscientiousness}%` }} />
                    </div>
                    <span className="font-mono text-blue-400 w-8 text-right">{currentScenario.disc.conscientiousness}%</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export const NeuralTelemetryDashboard: React.FC<NeuralTelemetryDashboardProps> = ({ onBack }) => {
  const [showWebhook, setShowWebhook] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [recipes, setRecipes] = useState(RECIPES);
  const [isSimulating, setIsSimulating] = useState(false);

  const copyWebhook = () => {
    navigator.clipboard.writeText("https://api.gateway.ai/v1/ingest/key_live_938475");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleRecipe = (id: number) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, applied: !r.applied } : r));
  };

  if (isSimulating) {
    return <SimulationView onClose={() => setIsSimulating(false)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-200 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Neural Telemetry <span className="text-slate-600">|</span> <span className="text-slate-400 font-mono text-sm">Insights Console</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
             onClick={() => setIsSimulating(true)}
             className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 border border-violet-500 rounded-lg transition-all text-sm font-bold text-white shadow-lg shadow-violet-900/20"
          >
            <Play className="w-4 h-4" />
            Run Simulation
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Ingesting Events</span>
          </div>
          <button 
            onClick={() => setShowWebhook(!showWebhook)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all text-sm font-bold text-white"
          >
            <Terminal className="w-4 h-4" />
            Connect Stream
          </button>
        </div>
      </nav>

      {/* Webhook Popover */}
      {showWebhook && (
        <div className="absolute top-20 right-6 z-50 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in slide-in-from-top-2">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Data Ingestion Endpoint</h3>
              <button onClick={() => setShowWebhook(false)}><ArrowLeft className="w-4 h-4 rotate-180 text-slate-500" /></button>
           </div>
           <p className="text-xs text-slate-400 mb-4">Send raw JSON conversation logs to this endpoint to populate the dashboard.</p>
           <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-xs text-emerald-400 mb-2 break-all">
              https://api.gateway.ai/v1/ingest/key_live_938475
           </div>
           <button 
             onClick={copyWebhook}
             className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-xs transition-all"
           >
             {isCopied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
             {isCopied ? 'Copied to Clipboard' : 'Copy Endpoint URL'}
           </button>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Row 1: Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[
             { label: 'Total Interactions', value: '14,205', icon: Database, color: 'text-violet-400', sub: '+12% vs last week' },
             { label: 'Behavioral Shift Rate', value: '94.2%', icon: RefreshCw, color: 'text-emerald-400', sub: 'Successful de-escalations' },
             { label: 'Top Performing Profile', value: 'High-I / High-S', icon: User, color: 'text-amber-400', sub: 'Influence & Steadiness' },
             { label: 'Avg Latency', value: '840ms', icon: Zap, color: 'text-blue-400', sub: 'Voice-to-Voice' },
           ].map((stat, i) => (
             <div key={i} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                   <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${stat.color}`}>
                     <stat.icon className="w-5 h-5" />
                   </div>
                   {i === 1 && <div className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">ELITE</div>}
                </div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
                <div className="text-[10px] text-slate-600 mt-2 font-mono">{stat.sub}</div>
             </div>
           ))}
        </div>

        {/* Row 2: Main Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
           
           {/* Left: Neural Stream (Logs) */}
           <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                 <h3 className="font-bold text-white flex items-center gap-2">
                   <Server className="w-4 h-4 text-violet-500" /> Live Neural Stream
                 </h3>
                 <span className="text-[10px] font-mono text-slate-500">REALTIME</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                 {MOCK_STREAM.map((log) => (
                   <div key={log.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800 transition-colors group">
                      <div className="flex justify-between items-center mb-1.5">
                         <span className="font-mono text-[10px] text-slate-500">{log.time}</span>
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${log.outcome === 'Resolved' || log.outcome === 'Conversion' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                           {log.outcome}
                         </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs mb-1">
                         <span className="text-violet-300 font-bold">{log.agent}</span>
                         <span className="text-slate-600">vs</span>
                         <span className={`font-bold ${log.userState === 'Angry' || log.userState === 'Frustrated' ? 'text-red-400' : 'text-slate-300'}`}>{log.userState}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                         <ArrowRight className="w-3 h-3" />
                         Transitioned to: <span className="text-emerald-400 font-bold">{log.endState}</span>
                         <span className="ml-auto font-mono text-slate-600">{log.duration}</span>
                      </div>
                   </div>
                 ))}
                 {/* Fade out bottom */}
                 <div className="h-12 bg-gradient-to-t from-slate-900 to-transparent sticky bottom-0 pointer-events-none" />
              </div>
           </div>

           {/* Right: Charts & Insights */}
           <div className="lg:col-span-8 space-y-6 flex flex-col h-full overflow-y-auto pr-2">
              
              {/* Winning Recipes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {recipes.map(recipe => (
                   <div key={recipe.id} className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${recipe.applied ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                      {recipe.applied && <div className="absolute top-0 right-0 p-2"><CheckCircle2 className="w-16 h-16 text-emerald-500/10" /></div>}
                      <div className="flex items-center gap-2 mb-3">
                         <Zap className={`w-4 h-4 ${recipe.applied ? 'text-emerald-400' : 'text-amber-400'}`} />
                         <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Detected Pattern</span>
                      </div>
                      <h4 className="text-white font-bold mb-1">{recipe.trigger}</h4>
                      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{recipe.insight}</p>
                      <button 
                        onClick={() => toggleRecipe(recipe.id)}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${recipe.applied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}`}
                      >
                        {recipe.applied ? <><Check className="w-3 h-3" /> Protocol Active</> : 'Apply Optimization'}
                      </button>
                   </div>
                 ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                 
                 {/* Radar Chart: Alignment Gap */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                       <GitBranch className="w-4 h-4 text-violet-400" /> Profile Alignment Gap
                    </h4>
                    <div className="flex-1 min-h-[200px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={ALIGNMENT_DATA}>
                             <PolarGrid stroke="#334155" />
                             <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                             <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                             <Radar name="User" dataKey="user" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                             <Radar name="Agent" dataKey="agent" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                             <Legend wrapperStyle={{ fontSize: '10px' }} />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '12px', color: '#f8fafc' }}
                                itemStyle={{ color: '#e2e8f0' }}
                             />
                          </RadarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Bar Chart: Tool Effectiveness */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                       <Cpu className="w-4 h-4 text-blue-400" /> Tool Impact Score
                    </h4>
                    <div className="flex-1 min-h-[200px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={TOOL_DATA} layout="vertical" margin={{ left: 20 }}>
                             <XAxis type="number" hide />
                             <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                             <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '12px', color: '#f8fafc' }}
                             />
                             <Bar dataKey="success" name="Success Rate %" radius={[0, 4, 4, 0]} barSize={20}>
                                {TOOL_DATA.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

              </div>
           </div>

        </div>
      </div>
    </div>
  );
};
