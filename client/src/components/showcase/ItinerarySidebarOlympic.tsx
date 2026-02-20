/**
 * S-Class Itinerary Sidebar – full Olympic multi-day timeline with B2B Markup Slider in POI cards.
 * When a POI is bound to a B2B itinerary item (b2bByPoiId), the card shows Net / Markup % / Slider / Selling Price
 * and persists changes via PATCH /api/b2b/itinerary-items/:id/markup so refresh keeps the value.
 */
import React, { useState, useCallback } from "react";
import {
  DayItinerary,
  Poi,
  LocationType,
  FlightOffer,
  B2bPoiBinding,
} from "@/types/olympic";
import {
  MapPin,
  Utensils,
  Bed,
  Ticket,
  Bus,
  ArrowRight,
  Clock,
  Hourglass,
  DollarSign,
  Plane,
  Repeat,
  PlusCircle,
  CalendarPlus,
} from "lucide-react";

const B2B_API = "/api/b2b";

interface ItinerarySidebarOlympicProps {
  days: DayItinerary[];
  selectedDayNumber: number;
  onSelectDay: (day: DayItinerary) => void;
  onBookHotel?: (poi: Poi) => void;
  activePoiId?: string | null;
  onPoiSelect?: (poiId: string) => void;
  showHacks?: boolean;
  onBookFlight?: (mode: "arrival" | "departure", poiId: string) => void;
  selectedFlights?: Record<string, FlightOffer>;
  isEditable?: boolean;
  onAddPoi?: (dayNumber: number, type: LocationType) => void;
  onAddDay?: () => void;
  /** When provided, POIs with an entry here show the B2B Markup Slider and persist to PostgreSQL. */
  b2bByPoiId?: Record<string, B2bPoiBinding>;
  /** Called after markup is persisted (so parent can refresh item list if needed). */
  onMarkupSaved?: (poiId: string, itemId: string, value: number) => void;
}

export function ItinerarySidebarOlympic({
  days,
  selectedDayNumber,
  onSelectDay,
  onBookHotel,
  activePoiId,
  onPoiSelect,
  showHacks,
  onBookFlight,
  selectedFlights,
  isEditable,
  onAddPoi,
  onAddDay,
  b2bByPoiId = {},
  onMarkupSaved,
}: ItinerarySidebarOlympicProps) {
  const [markups, setMarkups] = useState<Record<string, number>>({});

  const updateMarkup = useCallback(
    async (poiId: string, b2b: B2bPoiBinding, value: number) => {
      setMarkups((prev) => ({ ...prev, [poiId]: value }));
      try {
        const r = await fetch(`${B2B_API}/itinerary-items/${b2b.itemId}/markup`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markupApplied: String(value) }),
        });
        if (r.ok) {
          onMarkupSaved?.(poiId, b2b.itemId, value);
        }
      } catch (_) {
        setMarkups((prev) => ({ ...prev, [poiId]: Number(b2b.markupApplied) || 15 }));
      }
    },
    [onMarkupSaved]
  );

  const getIcon = (type: LocationType) => {
    switch (type) {
      case LocationType.HOTEL:
        return <Bed className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      case LocationType.DINING:
        return <Utensils className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case LocationType.EVENT:
        return <Ticket className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case LocationType.TRANSPORT:
        return <Bus className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case LocationType.FLIGHT_START:
      case LocationType.FLIGHT_END:
        return <Plane className="w-4 h-4 text-sky-500 dark:text-sky-400" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-400" />;
    }
  };

  const getDayLabel = (dayNumber: number) => {
    if (dayNumber === 0) return "Travel Day";
    if (dayNumber === 999) return "Return Day";
    return `Day ${dayNumber}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 custom-scrollbar pb-20 transition-colors duration-300">
      <div className="p-4 space-y-6">
        {days.map((day) => {
          const isActiveDay = selectedDayNumber === day.dayNumber;
          const isTravelDay = day.dayNumber === 0 || day.dayNumber === 999;

          return (
            <div
              key={day.dayNumber}
              id={`day-${day.dayNumber}`}
              className={`
                relative pl-6 border-l-2 transition-all cursor-pointer group
                ${isActiveDay ? "border-blue-500" : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"}
              `}
              onClick={() => onSelectDay(day)}
            >
              <div
                className={`
                absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-colors
                ${isActiveDay ? "bg-blue-600 border-white dark:border-slate-900" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500"}
              `}
              />

              <div className="mb-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {getDayLabel(day.dayNumber)} • {day.date}
                </span>
                <h3
                  className={`text-lg font-bold transition-colors ${isActiveDay ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
                >
                  {day.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{day.description}</p>

                {showHacks && day.hackTip && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-full h-fit shrink-0 mt-0.5">
                      <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                        Smart Travel Tip
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{day.hackTip}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className={`space-y-2 transition-opacity ${isActiveDay ? "opacity-100" : "opacity-70 group-hover:opacity-90"}`}>
                {day.pois.map((poi) => {
                  const isPoiActive = poi.id === activePoiId;
                  const isFlight = poi.type === LocationType.FLIGHT_START || poi.type === LocationType.FLIGHT_END;
                  const selectedFlight = selectedFlights?.[poi.id];
                  const b2b = b2bByPoiId[poi.id];
                  const currentMarkup = b2b ? (markups[poi.id] ?? (Number(b2b.markupApplied) || 15)) : 15;
                  const netRate = b2b?.netRate ?? (poi.price ?? 0);
                  const sellingPrice = netRate * (1 + currentMarkup / 100);

                  return (
                    <div
                      key={poi.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPoiSelect?.(poi.id);
                      }}
                      className={`
                        p-3 rounded-md transition-all border
                        ${isPoiActive ? "bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20" : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getIcon(poi.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <span
                              className={`text-sm font-medium truncate ${isPoiActive ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"}`}
                            >
                              {poi.name}
                            </span>
                            {(b2b || (poi.price !== undefined && !isFlight)) && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                                ${(b2b ? sellingPrice : (poi.price ?? 0)).toFixed(2)}
                              </span>
                            )}
                            {!b2b && poi.price !== undefined && !isFlight && (
                              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                {poi.currency === "USD" ? "$" : "€"}
                                {poi.price}
                              </div>
                            )}
                            {isFlight && selectedFlight && onBookFlight && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookFlight(poi.type === LocationType.FLIGHT_START ? "arrival" : "departure", poi.id);
                                }}
                                className="text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 rounded transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                              >
                                <Repeat className="w-3 h-3" /> Compare
                              </button>
                            )}
                          </div>

                          {!isFlight && poi.rating && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-500 mb-0.5">{poi.rating}</div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {poi.time && (
                              <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-700/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600/50">
                                <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{poi.time}</span>
                              </div>
                            )}
                            {poi.duration && (
                              <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-700/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600/50">
                                <Hourglass className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                <span className="text-[10px] text-slate-600 dark:text-slate-300">{poi.duration}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* B2B Pricing Engine – injected into POI card when this POI is backed by a B2B item */}
                      {b2b && (
                        <div className="mt-3 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            <span>Net: ${netRate.toFixed(2)}</span>
                            <span className="text-blue-600 dark:text-blue-400">Markup: {currentMarkup}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={currentMarkup}
                            onChange={(e) => updateMarkup(poi.id, b2b, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#E91E63]"
                          />
                          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>Selling price</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${sellingPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {poi.type === LocationType.HOTEL && onBookHotel && !b2b && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookHotel(poi);
                          }}
                          className="mt-2 w-full text-xs bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-600 text-indigo-600 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white py-1.5 px-2 rounded border border-indigo-100 dark:border-transparent transition-colors flex items-center justify-between group/btn"
                        >
                          <span>Check Rates</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        </button>
                      )}

                      {isFlight && onBookFlight && (
                        <>
                          {selectedFlight ? (
                            <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded p-2.5">
                              <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {selectedFlight.airline}
                                  </span>
                                  <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-1 rounded">
                                    {selectedFlight.flightNumber}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                  {selectedFlight.currency} {selectedFlight.price}
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                                <span>{selectedFlight.departureTime}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span>{selectedFlight.duration}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span>{selectedFlight.arrivalTime}</span>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onBookFlight(poi.type === LocationType.FLIGHT_START ? "arrival" : "departure", poi.id);
                              }}
                              className="mt-2 w-full text-xs bg-sky-600 hover:bg-sky-500 text-white py-2 px-2 rounded shadow-sm shadow-sky-500/20 transition-all flex items-center justify-center gap-2 group/btn"
                            >
                              <Plane className="w-3 h-3" />
                              <span>
                                {poi.type === LocationType.FLIGHT_START ? "Find Arrival Flights" : "Find Return Flights"}
                              </span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {isEditable && !isTravelDay && onAddPoi && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPoi(day.dayNumber, LocationType.DINING);
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-700/50 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    <PlusCircle className="w-3 h-3" /> Restaurant
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPoi(day.dayNumber, LocationType.EVENT);
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 border border-dashed border-rose-300 dark:border-rose-700/50 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <PlusCircle className="w-3 h-3" /> Activity
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {isEditable && onAddDay && (
          <button
            onClick={onAddDay}
            className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold">Add Another Day</span>
          </button>
        )}
      </div>
    </div>
  );
}
