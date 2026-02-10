import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plane, Building, Star, Clock, ArrowRight } from 'lucide-react';
import { AgentMarkupComponent } from './AgentMarkupComponent';

interface LeadMetadata {
  id: string;
  price: number;
  currency: string;
  airline?: string;
  departure_id?: string;
  arrival_id?: string;
  duration?: string;
  stops?: number;
  name?: string;
  rating?: number;
  address?: string;
  booking_token?: string;
  hotel_code?: string;
}

interface DraggableLeadCardProps {
  lead: LeadMetadata;
}

/**
 * DraggableLeadCard
 * High-density card for B2B agents to organize API leads into itineraries.
 * Supports dnd-kit for drag-and-drop lifecycle and passes full metadata to targets.
 */
export const DraggableLeadCard: React.FC<DraggableLeadCardProps> = ({ lead }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead } // Passes full API metadata (booking_token/hotel_code) to the drop target
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
    opacity: 0.8
  } : undefined;

  const isFlight = !!lead.airline;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`
        bg-slate-800/50 border border-white/5 p-4 rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:bg-slate-800
        ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 scale-105' : 'shadow-md'}
      `}
    >
      <header className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${isFlight ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {isFlight ? <Plane size={16} /> : <Building size={16} />}
        </div>
        <div className="text-right">
          {/* Integrated B2B Pricing Engine */}
          <AgentMarkupComponent netPrice={lead.price} currency={lead.currency} />
        </div>
      </header>

      <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">
        {isFlight ? `${lead.airline} • ${lead.departure_id} → ${lead.arrival_id}` : lead.name}
      </h4>

      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
        {isFlight ? (
          <>
            <span className="flex items-center gap-1"><Clock size={10} /> {lead.duration}</span>
            <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
              {lead.stops === 0 ? 'Nonstop' : `${lead.stops} stops`}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1 text-yellow-500">
              <Star size={10} fill="currentColor" /> {lead.rating}
            </span>
            <span className="truncate max-w-[150px]">{lead.address}</span>
          </>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          Source: {isFlight ? 'SerpAPI' : 'GRN Connect'}
        </span>
        <button className="p-1.5 bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600 hover:text-white transition-colors">
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};
