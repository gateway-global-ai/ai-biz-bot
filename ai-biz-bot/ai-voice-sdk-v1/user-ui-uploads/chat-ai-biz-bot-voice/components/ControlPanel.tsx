import React from 'react';
import { Briefcase, User, Building, MessageSquare, ShieldCheck, Info } from 'lucide-react';

interface ControlPanelProps {
  role: { company: string; position: string; task: string };
  setRole: (val: { company: string; position: string; task: string }) => void;
  manualInstruction: string;
  setManualInstruction: (val: string) => void;
  disabled: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  role,
  setRole,
  manualInstruction,
  setManualInstruction,
  disabled
}) => {
  return (
    <div className="flex flex-col gap-6 h-full">
       
       {/* Identity Card */}
       <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6 text-emerald-400 border-b border-gray-800 pb-4">
             <User size={24} />
             <div>
               <h2 className="font-bold tracking-wide text-lg">AGENT IDENTITY</h2>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Define who the AI is</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Company Name</label>
                 <div className="relative">
                   <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                   <input 
                     type="text" 
                     value={role.company}
                     onChange={(e) => setRole({...role, company: e.target.value})}
                     placeholder="e.g. Google Cloud"
                     disabled={disabled}
                     className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                   />
                 </div>
              </div>
              
              <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Agent Position</label>
                 <div className="relative">
                   <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                   <input 
                     type="text" 
                     value={role.position}
                     onChange={(e) => setRole({...role, position: e.target.value})}
                     placeholder="e.g. Senior Solutions Architect"
                     disabled={disabled}
                     className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                   />
                 </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Primary Objective</label>
                 <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        value={role.task}
                        onChange={(e) => setRole({...role, task: e.target.value})}
                        placeholder="e.g. Assist customers with enterprise billing inquiries"
                        disabled={disabled}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                     />
                 </div>
              </div>
          </div>
       </div>

       {/* Context Card */}
       <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3 text-blue-400">
               <MessageSquare size={24} />
               <div>
                  <h2 className="font-bold tracking-wide text-lg">SYSTEM PROMPT</h2>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Additional Context & Guardrails</p>
               </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            <textarea
               className="w-full flex-1 bg-gray-950 border border-gray-800 rounded-xl p-5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none leading-relaxed font-sans"
               value={manualInstruction}
               onChange={(e) => setManualInstruction(e.target.value)}
               disabled={disabled}
               placeholder="Enter detailed behavior instructions here..."
            />
            
            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
               <Info className="text-blue-400 shrink-0 mt-0.5" size={16} />
               <p className="text-[11px] text-gray-400 leading-relaxed">
                  The identity and prompt are injected into Gemini's system instruction. This defines the agent's knowledge limits, tone, and specific tasks during the live session.
               </p>
            </div>
          </div>
       </div>
    </div>
  );
};

export default ControlPanel;