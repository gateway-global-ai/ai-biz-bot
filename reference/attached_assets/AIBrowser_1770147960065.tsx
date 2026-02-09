
import React, { useState } from 'react';
import { VisualContext, VisualItem } from '../types';
import { Globe, Map, Search, ExternalLink, Star, Navigation, X, LayoutGrid } from 'lucide-react';

interface AIBrowserProps {
  context: VisualContext;
  onClose: () => void;
}

export const AIBrowser: React.FC<AIBrowserProps> = ({ context, onClose }) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'map'>(context.mode);

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-500">
      {/* Browser Toolbar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
        </div>
        
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-mono text-slate-400">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate">{context.query || "Agent Search..."}</span>
        </div>

        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('browser')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'browser' ? 'bg-slate-800 text-violet-400 border-b-2 border-violet-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Globe className="w-3.5 h-3.5" /> Web View
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'map' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Map className="w-3.5 h-3.5" /> Map View
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50 relative">
        {/* Abstract Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
        />

        {activeTab === 'browser' ? (
          <div className="space-y-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-400 mb-2">Search Results</h3>
            {context.content.map((item, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-violet-500/30 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 font-medium text-sm line-clamp-1 group-hover:underline decoration-violet-500/50">
                      {item.title}
                    </a>
                    <div className="text-[10px] text-emerald-500/80 mt-1 font-mono truncate">{item.url}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-3">{item.snippet}</p>
              </div>
            ))}
            {context.content.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs">No web results found.</div>
            )}
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
             {/* Simulated Map Header */}
             <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-3 mb-4">
               <Navigation className="w-4 h-4 text-emerald-500" />
               <span className="text-xs text-emerald-400 font-mono">Simulated Map View: {context.query}</span>
             </div>

             <div className="grid grid-cols-1 gap-3">
               {context.content.map((item, i) => (
                 <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-4 hover:bg-slate-800 transition-colors">
                   <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 font-bold text-slate-500 text-lg">
                     {i + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                       <h4 className="font-bold text-slate-200 text-sm truncate">{item.title}</h4>
                       {item.rating && (
                         <div className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                           <Star className="w-3 h-3 fill-current" /> {item.rating}
                         </div>
                       )}
                     </div>
                     <p className="text-xs text-slate-400 mt-1 truncate">{item.address || item.snippet}</p>
                     <div className="flex gap-2 mt-3">
                       <button className="text-[10px] bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-full font-bold transition-colors">
                         Directions
                       </button>
                       <button className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full font-bold transition-colors">
                         Details
                       </button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
             {context.content.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs">No map locations found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
