/**
 * Production Itinerary Sidebar – timeline + B2B Markup Slider per POI.
 * Persists markup via PATCH /api/b2b/itinerary-items/:id/markup (markupApplied).
 */
import React, { useCallback } from "react";
import { Bed, Plane, MapPin, DollarSign } from "lucide-react";

export type DayForSidebar = {
  id?: string | number;
  dayNumber: number;
  date?: string;
  title: string;
  description?: string;
  pois: Array<{
    id: string;
    name: string;
    type?: "hotel" | "flight" | string;
    price?: number;
    /** Markup % (0–50); stored in DB as string, display as number. */
    markup_applied?: number | string;
  }>;
};

type ItinerarySidebarProps = {
  days: DayForSidebar[];
  isEditable?: boolean;
  onMarkupUpdated?: (itemId: string, value: number) => void;
};

const API = "/api/b2b";

export function ItinerarySidebar({ days, isEditable, onMarkupUpdated }: ItinerarySidebarProps) {
  const updateMarkup = useCallback(
    async (itemId: string, value: number) => {
      await fetch(`${API}/itinerary-items/${itemId}/markup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markupApplied: String(value) }),
      });
      onMarkupUpdated?.(itemId, value);
    },
    [onMarkupUpdated]
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 space-y-6">
      {days.map((day) => (
        <div key={day.dayNumber ?? day.id ?? day.title} className="relative pl-6 border-l-2 border-slate-100">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
          <h3 className="font-bold text-slate-900 uppercase text-sm mb-4">{day.title}</h3>

          <div className="space-y-3">
            {day.pois.map((poi) => {
              const markupPct = Number(poi.markup_applied ?? 15);
              const sellingPrice = (poi.price ?? 0) * (1 + markupPct / 100);
              return (
                <div
                  key={poi.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800">{poi.name}</span>
                    <span className="text-emerald-600 font-bold">
                      ${sellingPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Agent Markup Engine */}
                  <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                      <span>Net: ${(poi.price ?? 0).toFixed(2)}</span>
                      <span className="text-blue-600">Com: {markupPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      defaultValue={markupPct}
                      onChange={(e) => updateMarkup(poi.id, parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none accent-[#E91E63]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ItinerarySidebar;
