/**
 * Itinerary OS sidebar – Corporate Lock styling.
 * Shows B2B itinerary items with Markup Slider; net rate locked, selling price live.
 */
import { Bed, Plane } from "lucide-react";

export type B2bItineraryItem = {
  id: string;
  leadType: "hotel" | "flight";
  name: string;
  netRate: number;
  markupApplied: string;
  hotelId?: string | null;
  flightId?: string | null;
};

type B2bItinerarySidebarProps = {
  tripAnchor: string | null;
  items: B2bItineraryItem[];
  onUpdateMarkup: (itemId: string, markupPct: number) => void;
  onRemoveItem: (itemId: string) => void;
  onExportPdf?: () => void;
  className?: string;
};

export function B2bItinerarySidebar({
  tripAnchor,
  items,
  onUpdateMarkup,
  onRemoveItem,
  onExportPdf,
  className = "",
}: B2bItinerarySidebarProps) {
  return (
    <div className={`w-96 flex flex-col border-l border-slate-200 bg-white shadow-xl ${className}`}>
      <div className="p-4 bg-[#1E3A8A] text-white flex justify-between items-center shrink-0">
        <h2 className="font-bold">Itinerary OS</h2>
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            className="bg-[#E91E63] px-3 py-1 rounded text-xs font-bold hover:bg-[#d81b60] transition-colors"
          >
            Export PDF
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tripAnchor && (
          <p className="text-xs text-slate-500 mb-3">
            Trip anchor: <span className="font-medium text-slate-700">{tripAnchor}</span>
          </p>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 py-6">No items yet. Search hotels and add to itinerary.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const pct = Number(item.markupApplied) || 0;
              const selling = item.netRate * (1 + pct / 100);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.leadType === "hotel" ? (
                        <Bed className="w-4 h-4 text-indigo-500 shrink-0" />
                      ) : (
                        <Plane className="w-4 h-4 text-sky-500 shrink-0" />
                      )}
                      <span className="font-medium text-slate-900 truncate">{item.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs text-slate-400 hover:text-red-600 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Agent markup (commission %)</div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={pct}
                    onChange={(e) => onUpdateMarkup(item.id, Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-indigo-600"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-slate-500">Net ${item.netRate.toFixed(0)}</span>
                    <span className="font-semibold text-emerald-600">Selling ${selling.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
