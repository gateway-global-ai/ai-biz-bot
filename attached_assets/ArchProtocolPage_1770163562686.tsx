
import React from 'react';
import { 
  ArrowLeft, BrainCircuit, Network, Cpu, Activity, 
  Zap, Layers, Terminal, Database, 
  BarChart3, GraduationCap, FileText, Code, GitBranch,
  Users
} from 'lucide-react';

interface ArchProtocolPageProps {
  onBack: () => void;
}

export const ArchProtocolPage: React.FC<ArchProtocolPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-200 overflow-y-auto scrollbar-thin font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-violet-500" />
            ARCH<span className="text-slate-500">Protocol</span> <span className="text-xs border border-violet-500/30 bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded ml-2">v1.1</span>
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-20">
        
        {/* Header / Hero */}
        <header className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Production Ready: Enhanced Edition
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            Agent Response Control Hierarchy
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            An open standard for AI agent communication orchestration across modalities.
          </p>
        </header>

        {/* Critical Update */}
        <section className="bg-gradient-to-br from-violet-900/20 to-slate-900 border border-violet-500/30 rounded-3xl p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-yellow-400" />
              Critical Insight: The Missing Piece
            </h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <p className="text-slate-300 leading-relaxed">
                  After extensive testing, we discovered why ARCH works so profoundly well. It's not just structure; it's the <strong>exponential synergy</strong> of structure and personality.
                </p>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 font-mono text-center text-lg text-violet-300 shadow-inner">
                  ARCH × DISC = Human-Like Emergence
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Self-regulating communication</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Personality-consistent responses</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Predictable creativity</li>
                </ul>
              </div>
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs uppercase text-slate-500 font-bold">
                        <span>Traditional AI</span>
                        <span>ARCH Protocol</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full w-[30%] bg-slate-600"></div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full w-[95%] bg-gradient-to-r from-violet-500 to-emerald-500"></div>
                    </div>
                    <p className="text-xs text-right text-emerald-400 mt-1">Efficiency + Personality</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1. Architecture Diagram Representation */}
        <section className="space-y-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Network className="w-8 h-8 text-blue-500" />
                The Architecture
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 overflow-x-auto">
                <div className="flex flex-col items-center gap-4 min-w-[600px]">
                    <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700 text-slate-300 font-bold">User Input</div>
                    <div className="h-8 w-0.5 bg-slate-700"></div>
                    <div className="px-6 py-3 bg-violet-900/30 rounded-lg border border-violet-500/50 text-violet-300 font-bold">ARCH Analyzer</div>
                    <div className="h-8 w-0.5 bg-slate-700"></div>
                    <div className="grid grid-cols-2 gap-12 w-full max-w-2xl">
                        <div className="flex flex-col items-center gap-4">
                            <div className="px-4 py-2 bg-slate-800 rounded border border-slate-700 text-xs text-slate-400">Urgency Calc</div>
                        </div>
                         <div className="flex flex-col items-center gap-4">
                            <div className="px-4 py-2 bg-slate-800 rounded border border-slate-700 text-xs text-slate-400">Context Analysis</div>
                        </div>
                    </div>
                    <div className="h-8 w-0.5 bg-slate-700"></div>
                    <div className="px-6 py-3 bg-blue-900/30 rounded-lg border border-blue-500/50 text-blue-300 font-bold w-full max-w-md text-center">
                        Generate ARCH Profile + DISC Modifiers
                    </div>
                    <div className="h-8 w-0.5 bg-slate-700"></div>
                    <div className="flex gap-8 w-full max-w-3xl justify-center">
                         <div className="flex-1 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                            <h4 className="font-bold text-slate-300 mb-2">Voice Channel</h4>
                            <p className="text-xs text-slate-500">High Acknowledge, Low Context</p>
                         </div>
                         <div className="flex-1 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                            <h4 className="font-bold text-slate-300 mb-2">Browser Channel</h4>
                            <p className="text-xs text-slate-500">High Context, Visual Data</p>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* 2. Schema / Code */}
        <section className="space-y-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Code className="w-8 h-8 text-emerald-500" />
                Configuration Schema
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 font-mono text-xs overflow-x-auto">
                    <pre className="text-slate-300">
{`// Core Communication Structure
archProfile: {
  acknowledgement: {
    percentage: number;      // 0-100%
    minDurationMs: number;  
    contentTemplates: string[];
    discInfluence: {
      dominance: number;     // -30 to +30
      influence: number;
      steadiness: number;
      conscientiousness: number;
    };
  };
  reflection: {
    percentage: number;
    empathyLevel: number;    // 1-10
    validationTemplates: string[];
  };
  context: {
    percentage: number;
    structure: 'linear' | 'hierarchical';
    dataPresentation: {
      tables: boolean;
      visualizations: boolean;
    };
  };
  handoff: {
    percentage: number;
    actionOriented: boolean;
    conversionOptimized: boolean; 
  };
}`}
                    </pre>
                </div>
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white">Why Schema Matters</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Most AI responses are unstructured blobs of text. The ARCH schema forces the LLM to categorize its output into functional components, allowing for:
                    </p>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs shrink-0">A</div>
                            <div>
                                <strong className="text-slate-200 block">Acknowledgement</strong>
                                <span className="text-sm text-slate-500">Verbal nods, immediate recognition. Keeps the user feeling heard.</span>
                            </div>
                        </li>
                         <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">R</div>
                            <div>
                                <strong className="text-slate-200 block">Reflection</strong>
                                <span className="text-sm text-slate-500">Demonstrating understanding and empathy. Validates the user's intent.</span>
                            </div>
                        </li>
                         <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">C</div>
                            <div>
                                <strong className="text-slate-200 block">Context</strong>
                                <span className="text-sm text-slate-500">The meat of the answer, data, facts. The core information payload.</span>
                            </div>
                        </li>
                         <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">H</div>
                            <div>
                                <strong className="text-slate-200 block">Handoff</strong>
                                <span className="text-sm text-slate-500">Moving the conversation forward or ending it. Drives action.</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        {/* 3. Communication Matrix */}
        <section className="space-y-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Users className="w-8 h-8 text-amber-500" />
                The ARCH-DISC Matrix
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                <PersonalityCard 
                    title="The Director" 
                    disc="High D" 
                    color="red"
                    arch="[2, 3, 85, 10]"
                    traits={["Direct", "Outcome-focused", "Minimal small talk"]}
                />
                <PersonalityCard 
                    title="The Influencer" 
                    disc="High I" 
                    color="yellow"
                    arch="[15, 20, 50, 15]"
                    traits={["Enthusiastic", "Storyteller", "Relationship-focused"]}
                />
                <PersonalityCard 
                    title="The Supporter" 
                    disc="High S" 
                    color="green"
                    arch="[10, 15, 65, 10]"
                    traits={["Patient", "Trust-focused", "Step-by-step"]}
                />
                <PersonalityCard 
                    title="The Analyst" 
                    disc="High C" 
                    color="blue"
                    arch="[5, 5, 80, 10]"
                    traits={["Precise", "Data-driven", "Structured"]}
                />
            </div>
        </section>

        {/* 4. Modality Switching */}
         <section className="space-y-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Layers className="w-8 h-8 text-purple-500" />
                Intelligent Modality Switching
            </h2>
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                 <p className="text-slate-400 mb-8 max-w-2xl">
                     The protocol doesn't just decide <em>what</em> to say, but <em>where</em> to say it based on content complexity and user device context.
                 </p>
                 <div className="grid md:grid-cols-3 gap-6 text-center">
                     <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 hover:border-violet-500/30 transition-colors">
                         <div className="text-4xl mb-4">🗣️</div>
                         <h3 className="font-bold text-white text-lg">Voice</h3>
                         <div className="my-3 h-px bg-slate-800 w-1/2 mx-auto"></div>
                         <p className="text-xs text-slate-400 uppercase tracking-widest leading-loose">Low complexity<br/>High emotion<br/>Short Duration</p>
                     </div>
                      <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-colors">
                         <div className="text-4xl mb-4">💬</div>
                         <h3 className="font-bold text-white text-lg">Chat</h3>
                         <div className="my-3 h-px bg-slate-800 w-1/2 mx-auto"></div>
                         <p className="text-xs text-slate-400 uppercase tracking-widest leading-loose">Med complexity<br/>Async<br/>Referenceable</p>
                     </div>
                      <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
                         <div className="text-4xl mb-4">🖥️</div>
                         <h3 className="font-bold text-white text-lg">Browser/App</h3>
                         <div className="my-3 h-px bg-slate-800 w-1/2 mx-auto"></div>
                         <p className="text-xs text-slate-400 uppercase tracking-widest leading-loose">High complexity<br/>Visual Data<br/>Tables & Lists</p>
                     </div>
                 </div>
             </div>
         </section>
        
        {/* Footer */}
        <footer className="border-t border-slate-900 pt-12 pb-20 text-center space-y-4">
            <h3 className="text-xl font-bold text-white">The ARCH Manifesto</h3>
            <p className="text-slate-400 max-w-2xl mx-auto italic text-lg leading-relaxed">
                "ARCH isn't about making AI sound human. It's about giving AI the tools to communicate with the depth, nuance, and adaptability that human communication deserves."
            </p>
            <div className="flex items-center justify-center gap-6 mt-8">
                <button className="text-slate-500 hover:text-white transition-colors text-sm font-bold">Documentation</button>
                <button className="text-slate-500 hover:text-white transition-colors text-sm font-bold">GitHub</button>
                <button className="text-slate-500 hover:text-white transition-colors text-sm font-bold">Whitepaper</button>
            </div>
            <p className="text-xs text-slate-600 mt-8">
                Specification Version: 1.1.0 • License: Apache 2.0 • &copy; 2024 Gateway Global AI
            </p>
        </footer>

      </main>
    </div>
  );
};

const CheckCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const PersonalityCard = ({ title, disc, color, arch, traits }: { title: string, disc: string, color: 'red' | 'yellow' | 'green' | 'blue', arch: string, traits: string[] }) => {
    const colorClasses = {
        red: 'border-red-500/30 bg-red-500/5 text-red-400',
        yellow: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
        green: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
        blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400'
    };
    
    return (
        <div className={`p-6 rounded-2xl border ${colorClasses[color]} hover:bg-slate-900 transition-all cursor-default`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-white">{title}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded border bg-black/20 ${colorClasses[color]}`}>{disc}</span>
            </div>
            <div className="space-y-4">
                <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">ARCH Profile</div>
                    <div className="font-mono text-sm text-slate-300">{arch}</div>
                </div>
                <div>
                     <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Style</div>
                     <ul className="text-sm text-slate-400 space-y-1">
                        {traits.map((t, i) => <li key={i}>• {t}</li>)}
                     </ul>
                </div>
            </div>
        </div>
    );
};
