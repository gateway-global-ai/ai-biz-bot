
import React, { useState } from 'react';
import { GroundingChunk } from '../types';
import { MapPin, PlusCircle, CreditCard, Eye, Anchor, Check } from 'lucide-react';

interface GroundingChipProps {
  chunk: GroundingChunk;
  onAddToCanvas: (text: string) => void;
  onBook: (title: string, uri: string) => void;
  onSetAnchor: (title: string, uri: string) => void;
}

export const GroundingChip: React.FC<GroundingChipProps> = ({ chunk, onAddToCanvas, onBook, onSetAnchor }) => {
  const [isSaved, setIsSaved] = useState(false);

  if (!chunk.maps) return null;

  const { title, uri, placeAnswerSources } = chunk.maps;
  
  // Extract a snippet if available from reviews
  const snippet = placeAnswerSources?.reviewSnippets?.[0]?.snippet;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Add as a checklist item for comparison
    const noteContent = `- [ ] 🏨 **[${title}](${uri})**`;
    onAddToCanvas(noteContent);
    setIsSaved(true);
  };

  const handleBook = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onBook(title, uri);
  }

  const handleSetAnchor = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSetAnchor(title, uri);
  }

  // Construct a URL that attempts to open Street View layer or search
  const streetViewUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&layer=c`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 my-2 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 max-w-sm group w-full">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-2">
            <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 mt-0.5 shrink-0">
                <MapPin size={16} />
            </div>
            <div className="min-w-0">
                <a 
                    href={uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-800 hover:text-blue-600 hover:underline block leading-tight truncate"
                    title={title}
                >
                    {title}
                </a>
                {snippet && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                        "{snippet}"
                    </p>
                )}
            </div>
        </div>
      </div>
      
      {/* Actions Row */}
      <div className="flex flex-wrap items-center justify-between mt-2 pt-2 border-t border-slate-100 gap-y-2">
         <div className="flex gap-2">
             <a 
                href={streetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
                title="Open Street View"
             >
                <Eye size={12} />
                View
             </a>
             <button
                onClick={handleSetAnchor}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors"
                title="Set as Trip Anchor (Point of Interest)"
             >
                <Anchor size={12} />
                Anchor
             </button>
         </div>
         
         <div className="flex gap-2">
             <button
                onClick={handleBook}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                title="Book this place"
             >
                <CreditCard size={12} />
                Book
             </button>
             <button
                onClick={handleAdd}
                disabled={isSaved}
                className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                    isSaved 
                    ? 'text-emerald-700 bg-emerald-100 cursor-default' 
                    : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
                title={isSaved ? "Saved to Notes" : "Save to Compare"}
             >
                {isSaved ? <Check size={12} /> : <PlusCircle size={12} />}
                {isSaved ? 'Saved' : 'Save'}
             </button>
         </div>
      </div>
    </div>
  );
};
