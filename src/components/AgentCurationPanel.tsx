import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { AgentMarkupSlider } from './AgentMarkupSlider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Hotel, GripVertical, Plus, Calendar } from 'lucide-react';

interface DiscoveryItem {
  id: string;
  type: 'flight' | 'hotel';
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  details: any;
}

/**
 * Agent Curation Panel
 * The "Command Center" for B2B agents to build itineraries.
 * Bridges API results (Leads) to the final Itinerary Canvas.
 */
export const AgentCurationPanel: React.FC<{ initialLeads: DiscoveryItem[] }> = ({ initialLeads }) => {
  const [leads, setLeads] = useState<DiscoveryItem[]>(initialLeads);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.id === 'itinerary-drop-zone') {
      const draggedItem = leads.find(item => item.id === active.id);
      if (draggedItem) {
        setItinerary(prev => [...prev, { ...draggedItem, itineraryId: crypto.randomUUID() }]);
        // In a real app, we would trigger a "Neural Refresh" here to update travel times
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-slate-950 p-6 gap-6 overflow-hidden">
        {/* COLUMN A: DISCOVERY FEED */}
        <div className="w-1/3 flex flex-col gap-4 bg-slate-900/50 rounded-3xl p-6 border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Leads & Inventory</h3>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
              {leads.length} Results
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {leads.map((item) => (
              <DraggableLeadItem key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800">
            <AgentMarkupSlider netPrice={180} currency="USD" />
          </div>
        </div>

        {/* COLUMN B: ITINERARY CANVAS */}
        <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Client Itinerary</h2>
              <p className="text-sm text-slate-500">Drag leads here to build the quote</p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1">
                <Calendar className="w-3 h-3 mr-1" /> Dec 2026
              </Badge>
            </div>
          </div>

          <div 
            id="itinerary-drop-zone"
            className={`flex-1 p-8 overflow-y-auto space-y-6 transition-colors duration-300 ${
              activeId ? 'bg-purple-50/50' : 'bg-transparent'
            }`}
          >
            {itinerary.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">Drop items here to start building</p>
              </div>
            ) : (
              itinerary.map((item, idx) => (
                <div key={item.itineraryId} className="flex gap-6 items-start group">
                  <div className="w-1 bg-purple-200 self-stretch rounded-full group-hover:bg-purple-500 transition-colors" />
                  <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {item.type === 'flight' ? <Plane className="w-4 h-4 text-blue-500" /> : <Hotel className="w-4 h-4 text-orange-500" />}
                        <span className="font-bold text-slate-800">{item.title}</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {item.currency} {item.price}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.subtitle}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
};

// Internal Draggable Component
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const DraggableLeadItem = ({ item }: { item: DiscoveryItem }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="bg-slate-800/80 border-slate-700 hover:border-purple-500/50 transition-all group">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 group-hover:bg-purple-900/50 transition-colors">
            {item.type === 'flight' ? <Plane className="w-4 h-4 text-blue-400" /> : <Hotel className="w-4 h-4 text-orange-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
            <p className="text-[10px] text-slate-500 truncate">{item.subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono font-bold text-purple-400">
              {item.currency} {item.price}
            </div>
            <GripVertical className="w-3 h-3 text-slate-600 ml-auto mt-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
