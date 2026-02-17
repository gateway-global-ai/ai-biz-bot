
import React from 'react';
import { DayItinerary, Poi, LocationType, FlightOffer } from '../types';
import { MapPin, Utensils, Bed, Ticket, Bus, ArrowRight, Clock, Hourglass, DollarSign, Plane, Repeat, PlusCircle, CalendarPlus } from 'lucide-react';

interface ItinerarySidebarProps {
  days: DayItinerary[];
  selectedDayNumber: number;
  onSelectDay: (day: DayItinerary) => void;
  onBookHotel?: (poi: Poi) => void;
  activePoiId?: string | null;
  onPoiSelect?: (poiId: string) => void;
  showHacks?: boolean;
  onBookFlight?: (mode: 'arrival' | 'departure', poiId: string) => void;
  selectedFlights?: Record<string, FlightOffer>;
  isEditable?: boolean;
  onAddPoi?: (dayNumber: number, type: LocationType) => void;
  onAddDay?: () => void;
}

const ItinerarySidebar: React.FC<ItinerarySidebarProps> = ({ days, selectedDayNumber, onSelectDay, onBookHotel, activePoiId, onPoiSelect, showHacks, onBookFlight, selectedFlights, isEditable, onAddPoi, onAddDay }) => {
  
  const getIcon = (type: LocationType) => {
    switch (type) {
      case LocationType.HOTEL: return <Bed className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      case LocationType.DINING: return <Utensils className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case LocationType.EVENT: return <Ticket className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case LocationType.TRANSPORT: return <Bus className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case LocationType.FLIGHT_START: 
      case LocationType.FLIGHT_END: return <Plane className="w-4 h-4 text-sky-500 dark:text-sky-400" />;
      default: return <MapPin className="w-4 h-4 text-slate-400" />;
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
                ${isActiveDay ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}
              `}
              onClick={() => onSelectDay(day)}
            >
              {/* Dot on timeline */}
              <div className={`
                absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-colors
                ${isActiveDay 
                  ? 'bg-blue-600 border-white dark:border-slate-900' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500'}
              `}></div>

              <div className="mb-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    {getDayLabel(day.dayNumber)} • {day.date}
                </span>
                <h3 className={`text-lg font-bold transition-colors ${isActiveDay ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{day.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{day.description}</p>
                
                {/* Hack Tip Rendering */}
                {showHacks && day.hackTip && (
                    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-1">
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-full h-fit shrink-0 mt-0.5">
                            <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Smart Travel Tip</h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{day.hackTip}</p>
                        </div>
                    </div>
                )}
              </div>

              {/* POI List (Compact) */}
              <div className={`space-y-2 transition-opacity ${isActiveDay ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}>
                {day.pois.map((poi) => {
                  const isPoiActive = poi.id === activePoiId;
                  const isFlight = poi.type === LocationType.FLIGHT_START || poi.type === LocationType.FLIGHT_END;
                  const selectedFlight = selectedFlights?.[poi.id];

                  return (
                  <div 
                    key={poi.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPoiSelect?.(poi.id);
                    }}
                    className={`
                        p-2 rounded-md transition-all border
                        ${isPoiActive 
                            ? 'bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20' 
                            : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getIcon(poi.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                           <div className={`text-sm font-medium ${isPoiActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>{poi.name}</div>
                           
                           {/* Price Badge for Non-Flight */}
                           {poi.price !== undefined && !isFlight && (
                             <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                               {poi.currency === 'USD' ? '$' : '€'}{poi.price}
                             </div>
                           )}

                           {/* Compare Button for Flight (Only if selected) */}
                           {isFlight && selectedFlight && onBookFlight && (
                               <button 
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       onBookFlight(poi.type === LocationType.FLIGHT_START ? 'arrival' : 'departure', poi.id);
                                   }}
                                   className="text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 rounded transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                               >
                                   <Repeat className="w-3 h-3" /> Compare
                               </button>
                           )}
                        </div>
                        
                        {!isFlight && poi.rating && <div className="text-xs text-yellow-600 dark:text-yellow-500 mb-0.5">{poi.rating}</div>}
                        
                        {/* Time and Duration Badges */}
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

                    {/* LiteAPI Integration for Hotels */}
                    {poi.type === LocationType.HOTEL && onBookHotel && (
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

                    {/* Flight Search Button / Selected Flight Card */}
                    {isFlight && onBookFlight && (
                       <>
                         {selectedFlight ? (
                             <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded p-2.5 animate-in fade-in">
                                 <div className="flex justify-between items-center mb-1.5">
                                     <div className="flex items-center gap-2">
                                         <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedFlight.airline}</span>
                                         <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-1 rounded">{selectedFlight.flightNumber}</span>
                                     </div>
                                     <div className="text-xs font-bold text-slate-900 dark:text-white">{selectedFlight.currency} {selectedFlight.price}</div>
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
                                  onBookFlight(poi.type === LocationType.FLIGHT_START ? 'arrival' : 'departure', poi.id);
                                }}
                                className="mt-2 w-full text-xs bg-sky-600 hover:bg-sky-500 text-white py-2 px-2 rounded shadow-sm shadow-sky-500/20 transition-all flex items-center justify-center gap-2 group/btn"
                              >
                                <Plane className="w-3 h-3" />
                                <span>{poi.type === LocationType.FLIGHT_START ? 'Find Arrival Flights' : 'Find Return Flights'}</span>
                              </button>
                         )}
                       </>
                    )}

                  </div>
                );})}

                {/* Build Your Own Controls */}
                {isEditable && !isTravelDay && onAddPoi && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAddPoi(day.dayNumber, LocationType.DINING); }}
                            className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-700/50 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                            <PlusCircle className="w-3 h-3" /> Restaurant
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAddPoi(day.dayNumber, LocationType.EVENT); }}
                            className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 border border-dashed border-rose-300 dark:border-rose-700/50 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                            <PlusCircle className="w-3 h-3" /> Activity
                        </button>
                    </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Day Button (Only for Editable) */}
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
};

export default ItinerarySidebar;
