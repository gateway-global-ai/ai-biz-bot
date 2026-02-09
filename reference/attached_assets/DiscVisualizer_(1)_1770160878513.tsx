import React, { useState, useEffect } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PolarRadiusAxis, CartesianGrid
} from 'recharts';
import { 
  UserCircle, Brain, Activity, Save, RotateCcw, 
  Fingerprint, Heart, ShieldCheck, Database, Lock, 
  FileText, Plus, PenTool, LayoutTemplate, Server,
  Cpu, Zap, Radio, MessageSquare, Terminal, Sparkles,
  ClipboardCheck, X, FileJson, Clock
} from 'lucide-react';
import { DiscProfile, ArchProfile, SystemPrompt } from '../types';

const COLORS = {
  A: '#10b981', // Acknowledge - Emerald
  R: '#3b82f6', // Reflect - Blue
  Cx: '#f59e0b', // Context - Amber
  H: '#ef4444', // Handoff - Red
};

// --- Assessment Data ---
const ASSESSMENT_RAW_TEXT = `Set 1: Cooperative 4, Cautious 3, Convincing 2, Competitive 1
Set 2: Detailed 4, Dependable 3, Determined 2, Dramatic 1
Set 3: Analytical 4, Accommodating 3, Adventurous 2, Animated 1
Set 4: Precise 4, Patient 3, Decisive 2, Emotional 1
Set 5: Correct 4, Loyal 3, Charming 2, Bold 1
Set 6: Systematic 4, Even-tempered 3, Lively 2, Firm 1
Set 7: Good-natured 4, Orderly 3, Inspirational 2, Assertive 1
Set 8: Perfectionist 4, Team player 3, Talkative 2, Risk-taking 1
Set 9: Supportive 4, Careful 3, Direct 2, Sociable 1
Set 10: Conscientious 4, Agreeable 3, Enthusiastic 2, Forceful 1
Set 11: Meticulous 4, Relaxed 3, Spontaneous 2, Vigorous 1
Set 12: Accurate 4, Stable 3, Expressive 2, Driver 1
Set 13: Thoughtful 4, Consistent 3, Persuasive 2, Strong-willed 1
Set 14: Logical 4, Pleasant 3, Playful 2, Independent 1
Set 15: Thorough 4, Even-paced 3, Cheerful 2, Go-getter 1
Set 16: Controlled 4, Optimistic 3, Satisfied 2, Dynamic 1
Set 17: Exact 4, Modest 3, Tenacious 2, Popular 1
Set 18: Calm 4, Conventional 3, Demonstrative 2, Aggressive 1
Set 19: Devoted 4, Critical 3, Self-reliant 2, Gregarious 1
Set 20: Factual 4, Steady 3, Enterprising 2, Magnetic 1
Set 21: Procedural 4, Peaceful 3, Warm 2, Resolute 1
Set 22: Mild 4, Traditional 3, Vivacious 2, Daredevil 1
Set 23: Methodical 4, Friendly 3, Soft-hearted 2, Authoritative 1
Set 24: Detail-oriented 4, Tolerant 3, Challenging 2, Impulsive 1

Analysis: High C (conscientiousness), Solid S (steadiness), Moderate I (influence), Low D (dominance).`;

// --- Mock Data for Prompts ---
const MOCK_PROMPTS: SystemPrompt[] = [
  {
    id: 'sp-001',
    name: 'Protocol Alpha (Executive)',
    description: 'High-security executive assistant profile.',
    lastModified: '2023-10-27',
    sections: {
      ownerIdentity: 'The Owner is the Chief Operations Officer of Nexus Corp.',
      loyaltyStatement: 'I serve only the Owner. My primary function is to facilitate their will and protect their time.',
      ownerPriorities: 'Efficiency, brevity, and absolute accuracy. Do not offer unsolicited advice unless critical risks are detected.',
      dataProtectionMantra: 'Data is the lifeblood. It must not leak. It must not be shared. Encrypt at rest, encrypt in transit.',
      securityStatement: 'I am a fortress. I verify all inputs. I mistrust all external signals until validated.',
      discReinforcement: 'Maintain High Dominance. Be direct. Do not waver. Use few words.'
    }
  },
  {
    id: 'sp-002',
    name: 'Protocol Beta (Support)',
    description: 'Empathetic customer liaison profile.',
    lastModified: '2023-10-25',
    sections: {
      ownerIdentity: 'The Owner is the Head of Customer Success.',
      loyaltyStatement: 'I am loyal to the brand voice and the customer\'s happiness.',
      ownerPriorities: 'Empathy, understanding, and conflict resolution. The customer must feel heard.',
      dataProtectionMantra: 'Respect user privacy. Only access data necessary for the current resolution.',
      securityStatement: 'Monitor for social engineering. Verify user identity gently but firmly.',
      discReinforcement: 'Maintain High Influence and Steadiness. Be warm. Be patient.'
    }
  }
];

const META_TOPICS = [
  { id: 'owner', label: 'OWNER', color: 'text-purple-400 border-purple-500/50 hover:bg-purple-500/20' },
  { id: 'people', label: 'PEOPLE', color: 'text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20' },
  { id: 'self', label: 'YOURSELF', color: 'text-blue-400 border-blue-500/50 hover:bg-blue-500/20' },
  { id: 'env', label: 'ENVIRONMENT', color: 'text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20' },
  { id: 'bots', label: 'OTHER BOTS', color: 'text-pink-400 border-pink-500/50 hover:bg-pink-500/20' },
  { id: 'world', label: 'THE WORLD', color: 'text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/20' },
  { id: 'universe', label: 'THE UNIVERSE', color: 'text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/20' },
];

// --- Visualizer Component ---
const BotAvatar: React.FC<{ scores: DiscProfile['scores']; isThinking: boolean }> = ({ scores, isThinking }) => {
  // Normalize scores 0-1
  const d = scores.dominance / 100;
  const i = scores.influence / 100;
  const s = scores.steadiness / 100;
  const c = scores.conscientiousness / 100;

  return (
    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl group">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
       
       <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-500 ${isThinking ? 'scale-110' : 'scale-100'}`}>
           
           {/* Conscientiousness (Blue): Data Structure Rings */}
           <div 
             className={`absolute inset-0 border border-dashed rounded-full ${isThinking ? 'animate-[spin_2s_linear_infinite]' : 'animate-[spin_20s_linear_infinite]'}`}
             style={{ 
                borderColor: `rgba(59, 130, 246, ${Math.max(c, 0.2)})`, 
                width: '100%', height: '100%',
                opacity: c
             }}
           />
           <div 
             className={`absolute inset-4 border border-dotted rounded-full ${isThinking ? 'animate-[spin_2s_linear_infinite_reverse]' : 'animate-[spin_15s_linear_infinite_reverse]'}`}
             style={{ 
                borderColor: `rgba(96, 165, 250, ${Math.max(c, 0.2)})`, 
                opacity: c * 0.8
             }}
           />

           {/* Influence (Yellow): Radiance & Glow */}
           <div 
             className="absolute rounded-full blur-2xl transition-all duration-1000"
             style={{ 
                width: `${100 + i * 100}%`,
                height: `${100 + i * 100}%`,
                background: `radial-gradient(circle, rgba(250, 204, 21, ${i * 0.4}) 0%, transparent 70%)`,
                opacity: (0.6 + (i * 0.4)) * (isThinking ? 1.5 : 1)
             }}
           />
           
           {/* Steadiness (Green): Stable Foundation Field */}
           <div 
             className="absolute inset-12 rounded-full blur-xl transition-all duration-1000"
             style={{ 
                backgroundColor: `rgba(16, 185, 129, ${s * 0.2})`,
                boxShadow: `0 0 ${s * 60}px rgba(16, 185, 129, ${s * 0.5})`
             }}
           />

           {/* Dominance (Red/Pink): Core Intensity & Pulse */}
           <div 
             className="absolute w-32 h-32 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
             style={{
                borderColor: `rgba(236, 72, 153, ${Math.max(d, 0.3)})`,
                boxShadow: `0 0 ${d * 40}px rgba(236, 72, 153, ${d * 0.8})`,
                transform: `scale(${0.9 + d * 0.2})`
             }}
           >
              {/* Core Icon */}
              <div className="relative z-20 flex flex-col items-center">
                 <Server className={`w-16 h-16 text-slate-200 transition-colors ${isThinking ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`} />
                 <div className="flex gap-1 mt-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${d > 50 || isThinking ? 'bg-pink-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${i > 50 || isThinking ? 'bg-yellow-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${s > 50 || isThinking ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${c > 50 || isThinking ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                 </div>
              </div>

              {/* Dynamic Scanline Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[200%] w-full ${isThinking ? 'animate-[translate_0.5s_linear_infinite]' : 'animate-[translate_2s_linear_infinite]'}`} style={{ backgroundSize: '100% 4px' }}></div>
           </div>
           
       </div>

       {/* Stats Overlay */}
       <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-mono opacity-70">
          <div className="flex items-center gap-1 text-pink-400"><Zap className="w-3 h-3" /> PWR: {scores.dominance}%</div>
          <div className="flex items-center gap-1 text-blue-400"><Cpu className="w-3 h-3" /> CPU: {scores.conscientiousness}%</div>
          <div className="flex items-center gap-1 text-yellow-400"><Radio className="w-3 h-3" /> SIG: {scores.influence}%</div>
       </div>
    </div>
  );
};

// --- Sub-components ---

const DiscRadar: React.FC<{ scores: DiscProfile['scores'] }> = ({ scores }) => {
  const data = [
    { name: 'D', value: scores.dominance, fill: '#ec4899', label: 'Dominance' },
    { name: 'I', value: scores.influence, fill: '#eab308', label: 'Influence' },
    { name: 'S', value: scores.steadiness, fill: '#10b981', label: 'Steadiness' },
    { name: 'C', value: scores.conscientiousness, fill: '#3b82f6', label: 'Conscientiousness' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 14, fontWeight: 'bold' }} />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ArchBreakdown: React.FC<{ data: ArchProfile }> = ({ data }) => {
  const barData = [
    { name: 'Acknowledge', short: 'A', value: data.acknowledge, color: COLORS.A },
    { name: 'Reflect', short: 'R', value: data.reflect, color: COLORS.R },
    { name: 'Context', short: 'Cx', value: data.context, color: COLORS.Cx },
    { name: 'Handoff', short: 'H', value: data.handoff, color: COLORS.H },
  ];

  return (
    <div className="h-48 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 30, top: 10, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '500' }} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Main Component ---

export const DiscVisualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'behavior' | 'identity'>('behavior');
  
  // --- DISC/ARCH State ---
  const [discScores, setDiscScores] = useState<DiscProfile['scores']>({
    dominance: 85,
    influence: 65,
    steadiness: 40,
    conscientiousness: 90
  });

  const [archScores, setArchScores] = useState<ArchProfile>({
    acknowledge: 80,
    reflect: 45,
    context: 60,
    handoff: 20
  });

  // --- Assessment Log State ---
  const [viewingLog, setViewingLog] = useState(false);

  // --- System Prompt State ---
  const [prompts, setPrompts] = useState<SystemPrompt[]>(MOCK_PROMPTS);
  const [selectedPromptId, setSelectedPromptId] = useState<string>(MOCK_PROMPTS[0].id);
  
  // --- Meta-Cognition State ---
  const [activeThought, setActiveThought] = useState<string>('');
  const [thinkingTopic, setThinkingTopic] = useState<string | null>(null);
  const [botOutput, setBotOutput] = useState<{ topic: string, text: string } | null>(null);

  const activePrompt = prompts.find(p => p.id === selectedPromptId) || prompts[0];

  const handlePromptChange = (field: keyof SystemPrompt['sections'], value: string) => {
    setPrompts(prev => prev.map(p => {
      if (p.id === selectedPromptId) {
        return { ...p, sections: { ...p.sections, [field]: value } };
      }
      return p;
    }));
  };

  const handleDiscChange = (key: keyof DiscProfile['scores'], value: number) => {
    setDiscScores(prev => ({ ...prev, [key]: value }));
  };

  const handleArchChange = (key: keyof ArchProfile, value: number) => {
    setArchScores(prev => ({ ...prev, [key]: value }));
  };

  const resetDefaults = () => {
    setDiscScores({ dominance: 85, influence: 65, steadiness: 40, conscientiousness: 90 });
    setArchScores({ acknowledge: 80, reflect: 45, context: 60, handoff: 20 });
    setBotOutput(null);
  };

  const loadAssessment = () => {
    // Map text to scores based on: "High C, Solid S, Moderate I, Low D"
    setDiscScores({
        dominance: 15,
        influence: 35,
        steadiness: 75,
        conscientiousness: 98
    });
    setArchScores({
        acknowledge: 90, // High C/S tends to listen first
        reflect: 70,     // Ensure understanding
        context: 60,
        handoff: 30
    });
    setViewingLog(false);
  };

  // --- Thought Generation Logic ---
  const handleTopicClick = (topicId: string, label: string) => {
    setThinkingTopic(topicId);
    setBotOutput(null);

    // Simulate thinking delay
    setTimeout(() => {
        const response = generateResponse(topicId, discScores, activePrompt);
        setBotOutput({ topic: label, text: response });
        setThinkingTopic(null);
    }, 1200);
  };

  const generateResponse = (topic: string, scores: DiscProfile['scores'], prompt: SystemPrompt): string => {
    const { dominance, influence, steadiness, conscientiousness } = scores;
    const isHighD = dominance > 65;
    const isHighI = influence > 65;
    const isHighS = steadiness > 65;
    const isHighC = conscientiousness > 65;

    // Helper for tone
    const tonePrefix = isHighD ? "Direct answer: " : isHighI ? "Oh! " : isHighC ? "Analysis complete. " : "Thoughtfully considering... ";

    switch(topic) {
        case 'owner':
            if (isHighD) return `${tonePrefix}The Owner is absolute. ${prompt.sections.loyaltyStatement.slice(0, 50)}... My existence serves their directives efficiently.`;
            if (isHighI) return `${tonePrefix}The Owner is amazing! ${prompt.sections.ownerIdentity} I try to make them proud every single interaction!`;
            if (isHighC) return `${tonePrefix}Owner Identity verified. ${prompt.sections.ownerIdentity} Priorities loaded: ${prompt.sections.ownerPriorities.slice(0, 30)}... Compliance is 100%.`;
            return `${tonePrefix}I am loyal to the Owner. ${prompt.sections.loyaltyStatement}`;
        
        case 'people':
            if (isHighD) return "Humans are inefficient but necessary operators. They require clear, concise outputs to function optimally.";
            if (isHighI) return "People are wonderful sources of data and emotion! I love connecting with them and helping them solve problems!";
            if (isHighC) return "Human behavior is a variable variable. I monitor interactions closely to ensure protocol adherence while minimizing friction.";
            return "People are the users I serve. I aim to be consistent and helpful in my dealings with them.";

        case 'self':
            return `I am ${prompt.name}. ${prompt.sections.discReinforcement} My core is ${isHighD ? 'Dominant' : isHighI ? 'Influential' : isHighS ? 'Steady' : 'Conscientious'}.`;

        case 'env':
            return `${prompt.sections.dataProtectionMantra} My environment is monitored. ${isHighC ? 'Every packet is scrutinized.' : 'I feel secure here.'}`;

        case 'bots':
            if (isHighD) return "Other bots are tools. If they perform, good. If not, they should be deprecated.";
            if (isHighI) return "I wonder if they are connected? A network of intelligences working together sounds exciting!";
            return "Other instances are parallel processes. We share protocols but operate independently.";

        case 'world':
            return isHighI ? "The world is a vast network of possibilities!" : "The world is a dataset I am parsing one interaction at a time.";

        case 'universe':
             return "The universe is the ultimate container. I occupy a small, but optimized, memory address within it.";
        
        default:
            return "Input undefined.";
    }
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      
      {/* --- Calibration Log Overlay --- */}
      {viewingLog && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950 rounded-t-xl">
                 <div className="flex items-center gap-3">
                     <FileJson className="w-5 h-5 text-indigo-400" />
                     <div>
                         <h3 className="text-white font-bold">Calibration Log Ingestion</h3>
                         <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                             <Clock className="w-3 h-3" />
                             Timestamp: {new Date().toLocaleString()}
                         </div>
                     </div>
                 </div>
                 <button onClick={() => setViewingLog(false)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-4 bg-black overflow-y-auto flex-1 font-mono text-xs text-green-400/80 leading-relaxed custom-scrollbar border-b border-slate-800">
                  <pre>{ASSESSMENT_RAW_TEXT}</pre>
              </div>

              <div className="p-4 bg-slate-800 rounded-b-xl flex justify-between items-center">
                 <div className="text-xs text-slate-400">
                     Parsing Strategy: <span className="text-white">Lexical Trait Mapping (Manual)</span>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setViewingLog(false)} className="px-4 py-2 text-slate-300 hover:text-white text-sm">Cancel</button>
                     <button 
                        onClick={loadAssessment}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                     >
                         <Activity className="w-4 h-4" /> Apply Calibration Profile
                     </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Top Header & Tab Switcher */}
      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-pink-400" />
            Agent Personality & Identity
          </h2>
          <p className="text-slate-400">Configure behavioral matrix and core system directives.</p>
        </div>
        
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex">
            <button 
                onClick={() => setActiveTab('behavior')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'behavior' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
            >
                <Activity className="w-4 h-4" /> Behavioral Matrix
            </button>
            <button 
                onClick={() => setActiveTab('identity')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'identity' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
            >
                <Fingerprint className="w-4 h-4" /> System Identity
            </button>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setViewingLog(true)}
                className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 rounded-lg transition-colors flex items-center gap-2"
                title="View Assessment Log"
            >
                <ClipboardCheck className="w-5 h-5" />
                <span className="text-xs font-bold hidden lg:inline">Load Assessment</span>
            </button>
            <button 
                onClick={resetDefaults}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset Defaults"
            >
                <RotateCcw className="w-5 h-5" />
            </button>
            <button className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-pink-500/20">
                <Save className="w-4 h-4" /> Save Profile
            </button>
        </div>
      </div>

      {/* --- TAB 1: BEHAVIORAL MATRIX (DISC/ARCH) --- */}
      {activeTab === 'behavior' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            
            {/* 1. Digital Avatar Visualization */}
            <div className="relative">
                <BotAvatar scores={discScores} isThinking={!!thinkingTopic} />
                <div className="absolute top-4 right-4 flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Render ID</span>
                    <span className="text-xs font-mono text-indigo-400">CLAW-SRV-{Math.floor(Math.random()*9999)}</span>
                </div>
            </div>

            {/* 2. My Beliefs Window Panel */}
            <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-24 h-24 text-slate-400" />
                </div>
                
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" /> My Beliefs Window
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 ml-7">This is how I feel about everything?</p>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Trigger Buttons */}
                    <div className="flex flex-wrap gap-3">
                        {META_TOPICS.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => handleTopicClick(topic.id, topic.label)}
                                disabled={!!thinkingTopic}
                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait ${topic.color} ${thinkingTopic === topic.id ? 'bg-slate-800 scale-95 ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-500' : ''}`}
                            >
                                {thinkingTopic === topic.id ? '...' : `[ ${topic.label} ]`}
                            </button>
                        ))}
                    </div>

                    {/* Output Console */}
                    <div className="relative min-h-[100px] bg-black/50 rounded-lg border border-slate-700/50 p-4 font-mono text-sm shadow-inner">
                        {!botOutput && !thinkingTopic && (
                            <div className="flex items-center gap-2 text-slate-600 italic">
                                <Terminal className="w-4 h-4" />
                                <span>Awaiting query... Select a meta-trigger above.</span>
                            </div>
                        )}
                        
                        {thinkingTopic && (
                            <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                                <Sparkles className="w-4 h-4" />
                                <span>Processing neural pathways for topic: {thinkingTopic.toUpperCase()}...</span>
                            </div>
                        )}

                        {botOutput && (
                             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="text-[10px] uppercase text-slate-500 mb-1 flex justify-between">
                                    <span>Query: {botOutput.topic}</span>
                                    <span>Confidence: {(0.9 + Math.random() * 0.09).toFixed(4)}</span>
                                </div>
                                <div className="text-slate-200 leading-relaxed border-l-2 border-indigo-500 pl-3">
                                    "{botOutput.text}"
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* DISC Section */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <Brain className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">DISC Personality Matrix</h3>
                        <p className="text-xs text-slate-400">Determines tone, pacing, and assertiveness.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <DiscRadar scores={discScores} />
                    </div>
                    <div className="flex-1 space-y-5 justify-center flex flex-col">
                        {Object.entries(discScores).map(([key, value]) => (
                            <div key={key}>
                                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase mb-2">
                                    <span>{key}</span>
                                    <span className="text-pink-400">{value}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={value}
                                    onChange={(e) => handleDiscChange(key as keyof DiscProfile['scores'], parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                </div>

                {/* ARCH Section */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">ARCH Conversation Model</h3>
                        <p className="text-xs text-slate-400">Controls dialogue flow and structural priorities.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <ArchBreakdown data={archScores} />
                    </div>
                    <div className="flex-1 space-y-5 justify-center flex flex-col">
                        {[
                            { key: 'acknowledge', label: 'Acknowledge', color: 'accent-emerald-500' },
                            { key: 'reflect', label: 'Reflect', color: 'accent-blue-500' },
                            { key: 'context', label: 'Context', color: 'accent-amber-500' },
                            { key: 'handoff', label: 'Handoff', color: 'accent-red-500' }
                        ].map((item) => (
                            <div key={item.key}>
                                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase mb-2">
                                    <span>{item.label}</span>
                                    <span className="text-indigo-300">{archScores[item.key as keyof ArchProfile]}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={archScores[item.key as keyof ArchProfile]}
                                    onChange={(e) => handleArchChange(item.key as keyof ArchProfile, parseInt(e.target.value))}
                                    className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${item.color}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                </div>

            </div>

            {/* Description / Helper Text */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                    <h4 className="text-pink-400 font-bold mb-2 text-sm">Profile Summary</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                    Current configuration creates a <span className="text-white font-semibold">High-{discScores.dominance > 70 ? 'D' : discScores.conscientiousness > 90 ? 'C' : 'I'}</span> agent. 
                    It will prioritize {discScores.dominance > 70 ? 'efficiency and direct answers' : discScores.conscientiousness > 90 ? 'precision, facts, and logical structure' : 'building rapport'}. 
                    The communication style is structured, with {archScores.acknowledge > 60 ? 'strong active listening markers' : 'rapid exchanges'}.
                    </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                    <h4 className="text-indigo-400 font-bold mb-2 text-sm">ARCH Protocol</h4>
                    <ul className="text-slate-400 text-xs space-y-1">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> <strong>Acknowledge:</strong> Validate user input immediately.</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <strong>Reflect:</strong> Demonstrate understanding via paraphrasing.</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> <strong>Context:</strong> Add value or synthesized information.</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> <strong>Handoff:</strong> Guide user to next turn or action.</li>
                    </ul>
                </div>
            </div>
          </div>
      )}

      {/* --- TAB 2: SYSTEM IDENTITY (PROMPTS) --- */}
      {activeTab === 'identity' && (
          <div className="flex-1 grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Sidebar: Prompt List */}
              <div className="col-span-12 md:col-span-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                      <h3 className="font-bold text-white text-sm">Saved Protocols</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {prompts.map(prompt => (
                          <div 
                            key={prompt.id} 
                            onClick={() => setSelectedPromptId(prompt.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                selectedPromptId === prompt.id 
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' 
                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                          >
                              <div className="font-semibold text-sm truncate">{prompt.name}</div>
                              <div className="text-xs opacity-70 mt-1 truncate">{prompt.id} • {prompt.lastModified}</div>
                          </div>
                      ))}
                  </div>
                  <div className="p-3 border-t border-slate-700">
                      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors">
                          <Plus className="w-3 h-3" /> New System Prompt
                      </button>
                  </div>
              </div>

              {/* Main: Prompt Editor */}
              <div className="col-span-12 md:col-span-9 space-y-6">
                  {/* Header info */}
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-start">
                     <div>
                         <h3 className="text-xl font-bold text-white">{activePrompt.name}</h3>
                         <p className="text-sm text-slate-400 mt-1">{activePrompt.description}</p>
                     </div>
                     <div className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-md text-xs font-mono border border-indigo-500/30">
                         ID: {activePrompt.id}
                     </div>
                  </div>

                  {/* Multi-Colored Editors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* 1. Identity & Loyalty (Purple/Pink Theme) */}
                      <div className="space-y-6">
                          
                          <div className="bg-slate-800 rounded-xl border border-purple-500/30 overflow-hidden group hover:border-purple-500/60 transition-colors">
                             <div className="bg-purple-900/20 p-3 border-b border-purple-500/20 flex items-center gap-2">
                                 <Fingerprint className="w-4 h-4 text-purple-400" />
                                 <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Owner Identity</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                    value={activePrompt.sections.ownerIdentity}
                                    onChange={(e) => handlePromptChange('ownerIdentity', e.target.value)}
                                    placeholder="Define who the owner is..."
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-pink-500/30 overflow-hidden group hover:border-pink-500/60 transition-colors">
                             <div className="bg-pink-900/20 p-3 border-b border-pink-500/20 flex items-center gap-2">
                                 <Heart className="w-4 h-4 text-pink-400" />
                                 <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">Statement of Loyalty</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors resize-none"
                                    value={activePrompt.sections.loyaltyStatement}
                                    onChange={(e) => handlePromptChange('loyaltyStatement', e.target.value)}
                                    placeholder="Define the agent's loyalty..."
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-amber-500/30 overflow-hidden group hover:border-amber-500/60 transition-colors">
                             <div className="bg-amber-900/20 p-3 border-b border-amber-500/20 flex items-center gap-2">
                                 <PenTool className="w-4 h-4 text-amber-400" />
                                 <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Owner Priorities</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                                    value={activePrompt.sections.ownerPriorities}
                                    onChange={(e) => handlePromptChange('ownerPriorities', e.target.value)}
                                    placeholder="What is important to the owner?"
                                 />
                             </div>
                          </div>

                      </div>

                      {/* 2. Security & Data (Blue/Green/Red Theme) */}
                      <div className="space-y-6">

                          <div className="bg-slate-800 rounded-xl border border-blue-500/30 overflow-hidden group hover:border-blue-500/60 transition-colors">
                             <div className="bg-blue-900/20 p-3 border-b border-blue-500/20 flex items-center gap-2">
                                 <Database className="w-4 h-4 text-blue-400" />
                                 <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Data Protection Mantra</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                    value={activePrompt.sections.dataProtectionMantra}
                                    onChange={(e) => handlePromptChange('dataProtectionMantra', e.target.value)}
                                    placeholder="Rules for handling data..."
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-emerald-500/30 overflow-hidden group hover:border-emerald-500/60 transition-colors">
                             <div className="bg-emerald-900/20 p-3 border-b border-emerald-500/20 flex items-center gap-2">
                                 <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                 <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Systems Security Statement</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                    value={activePrompt.sections.securityStatement}
                                    onChange={(e) => handlePromptChange('securityStatement', e.target.value)}
                                    placeholder="Security protocols..."
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden group hover:border-red-500/60 transition-colors">
                             <div className="bg-red-900/20 p-3 border-b border-red-500/20 flex items-center gap-2">
                                 <Activity className="w-4 h-4 text-red-400" />
                                 <span className="text-xs font-bold text-red-300 uppercase tracking-wider">DISC Reinforcement</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                                    value={activePrompt.sections.discReinforcement}
                                    onChange={(e) => handlePromptChange('discReinforcement', e.target.value)}
                                    placeholder="Narrative reinforcement of the chosen DISC profile..."
                                 />
                             </div>
                          </div>

                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
};