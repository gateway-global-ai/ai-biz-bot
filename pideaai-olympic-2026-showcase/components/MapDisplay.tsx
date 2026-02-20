
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, OverlayView } from '@react-google-maps/api';
import { DayItinerary, Poi, LocationType, FlightOffer, Coordinates } from '../types';
import { GOOGLE_MAPS_API_KEY } from '../constants';
import { 
  MapPin, BedDouble, Utensils, Ticket, Plane, 
  ArrowRight, Minimize2, Maximize2, 
  Star, Clock, Hourglass, Building, ChevronRight, ChevronLeft,
  Navigation, Globe, Eye, ChevronUp, ChevronDown, X, AlertTriangle
} from 'lucide-react';

interface MapDisplayProps {
  selectedDay: DayItinerary;
  allDays: DayItinerary[];
  onBookHotel?: (poi: Poi) => void;
  onSelectDay: (day: DayItinerary) => void;
  isDarkMode?: boolean;
  activePoiId?: string;
  onPoiSelect?: (poiId: string) => void;
  flyToFlight?: FlightOffer | null;
  hotelFlyAnimation?: { start: Coordinates, end: Coordinates } | null;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 45.4642,
  lng: 9.1900, // Milan
};

// Define libraries outside component to prevent re-renders
const LIBRARIES: ("geometry" | "places" | "drawing" | "visualization" | "localContext")[] = ['geometry'];

// Styles for standard map view
const darkMapStyles = [
  { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "lightness": -80 }] },
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

const lightMapStyles = [
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }] },
    { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#ffffff" }, { "lightness": 29 }, { "weight": 0.2 }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "visibility": "on" }, { "color": "#ffffff" }, { "lightness": 16 }] },
    { "elementType": "labels.text.fill", "stylers": [{ "saturation": 36 }, { "color": "#333333" }, { "lightness": 40 }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#f2f2f2" }, { "lightness": 19 }] },
    { "featureType": "administrative", "elementType": "geometry.fill", "stylers": [{ "color": "#fefefe" }, { "lightness": 20 }] },
    { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#fefefe" }, { "lightness": 17 }, { "weight": 1.2 }] }
];

// Fallback Helper for Linear Interpolation
const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

const lerpGeo = (start: {lat: number, lng: number}, end: {lat: number, lng: number}, t: number) => {
    return {
        lat: lerp(start.lat, end.lat, t),
        lng: lerp(start.lng, end.lng, t)
    };
};

const PlaneIcon = ({ rotation }: { rotation: number }) => (
    <div style={{ 
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`, 
        filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="planeGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" /> {/* blue-400 */}
            <stop offset="1" stopColor="#2563EB" /> {/* blue-600 */}
          </linearGradient>
        </defs>
        <path 
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
          fill="url(#planeGradient)" 
          stroke="white" 
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
);

const MobilePoiOverlay = ({ poi, isExpanded, onToggleExpand, onNext, onPrev, hasPrev, hasNext, isLastOfDay, onBookHotel, onEnterStreetView, dayNumber, index, total }: any) => {
    let Icon = <MapPin className="w-5 h-5" />;
    const name = poi.name.toLowerCase();
    if (name.includes('airport') || name.includes('flight')) Icon = <Plane className="w-5 h-5" />;
    else if (poi.type === LocationType.HOTEL) Icon = <Building className="w-5 h-5" />;
    else if (poi.type === LocationType.DINING) Icon = <Utensils className="w-5 h-5" />;
    else if (poi.type === LocationType.EVENT) Icon = <Ticket className="w-5 h-5" />;

    return (
        <div className={`absolute left-0 right-0 transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 shadow-[0_-5px_20px_rgba(0,0,0,0.2)] flex flex-col z-[45] ${isExpanded ? 'inset-0 z-50' : 'bottom-0 rounded-t-2xl'}`}>
             {/* Header Handle / Controls */}
             <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-2 flex items-center justify-between" onClick={onToggleExpand}>
                <div className="flex-1 flex justify-start">
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 pl-2">
                        Day {dayNumber} • Stop {index + 1}/{total}
                     </span>
                </div>
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
                <div className="flex-1 flex justify-end gap-2 pr-2">
                    <button onClick={(e) => { e.stopPropagation(); onEnterStreetView(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
             </div>

             {/* Content Area */}
             <div className="flex-1 overflow-y-auto relative">
                {/* Hero Image (Only when expanded) */}
                {isExpanded && poi.imageUrl && (
                     <div className="h-48 w-full relative shrink-0">
                        <img src={poi.imageUrl} className="w-full h-full object-cover" alt={poi.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEnterStreetView(); }}
                            className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-white/30 transition-colors"
                        >
                            <Eye className="w-3 h-3" /> Street View
                        </button>
                    </div>
                )}
                
                <div className="p-4">
                     <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0 ${!isExpanded ? 'shadow-sm' : ''}`}>
                            {Icon}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{poi.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                {poi.rating && (
                                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-600 dark:text-yellow-500" />
                                        <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">{poi.rating}</span>
                                    </div>
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">{poi.type}</span>
                            </div>
                        </div>
                     </div>

                     <div className={`mt-4 space-y-4 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{poi.description}</p>
                        
                        {(isExpanded || !poi.imageUrl) && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                {poi.time && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <Clock className="w-4 h-4" /> {poi.time}
                                    </div>
                                )}
                                {poi.duration && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <Hourglass className="w-4 h-4" /> {poi.duration}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {isExpanded && poi.type === LocationType.HOTEL && onBookHotel && (
                            <button 
                                onClick={() => onBookHotel(poi)} 
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-4"
                            >
                                <BedDouble className="w-4 h-4" /> Check Availability
                            </button>
                        )}
                     </div>
                </div>
             </div>

             {/* Navigation Footer */}
             <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
                 <button onClick={onPrev} disabled={!hasPrev} className="py-3 flex items-center justify-center gap-2 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> Previous
                 </button>
                 <button onClick={onNext} className="py-3 flex items-center justify-center gap-2 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200">
                    {isLastOfDay && !hasNext ? "Next Day" : "Next Stop"} <ArrowRight className="w-4 h-4" />
                 </button>
             </div>
        </div>
    );
};

const ItineraryTile = ({ poi, index, total, dayNumber, isActive, status, isExpanded, onActivate, onToggleExpand, onNext, onPrev, hasPrev, hasNext, isLastOfDay, onBookHotel, onEnterStreetView }: any) => {
    const name = poi.name.toLowerCase();
    let Icon = <MapPin className="w-4 h-4" />;
    if (name.includes('airport') || name.includes('flight')) Icon = <Plane className="w-4 h-4" />;
    else if (poi.type === LocationType.HOTEL) Icon = <Building className="w-4 h-4" />;
    else if (poi.type === LocationType.DINING) Icon = <Utensils className="w-4 h-4" />;
    else if (poi.type === LocationType.EVENT) Icon = <Ticket className="w-4 h-4" />;

    if (!isActive) {
        let bubbleClasses = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400";
        if (status === 'past') bubbleClasses = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 opacity-80";
        else if (status === 'future') bubbleClasses = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-400";
        else if (status === 'active') bubbleClasses = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20";

        return (
            <OverlayView position={poi.coordinates} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:z-50 transition-transform hover:scale-110 group" style={{ zIndex: isActive ? 50 : 1 }} onClick={(e) => { e.stopPropagation(); onActivate(); }}>
                    <div className={`w-8 h-8 rounded-full shadow-md border-2 flex items-center justify-center transition-colors ${bubbleClasses}`}>{Icon}</div>
                </div>
            </OverlayView>
        );
    }

    return (
        <OverlayView position={poi.coordinates} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="absolute flex flex-col items-center pointer-events-none" style={{ transform: 'translate(-50%, -100%)', zIndex: 100 }}>
                {/* Desktop Card - Hidden on Mobile */}
                <div className="pointer-events-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-[280px] sm:w-[320px] overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 flex-col mb-0 hidden md:flex" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Day {dayNumber} <span className="text-slate-400 mx-1">|</span> Destination {index + 1} of {total}</span>
                        <div className="flex gap-1">
                             <button onClick={(e) => { e.stopPropagation(); onEnterStreetView(); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition-colors" title="Street View">
                                <Eye className="w-3 h-3"/>
                             </button>
                             <button onClick={onToggleExpand} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500" title={isExpanded ? "Collapse" : "Expand Details"}>
                                {isExpanded ? <Minimize2 className="w-3 h-3"/> : <Maximize2 className="w-3 h-3"/>}
                             </button>
                        </div>
                    </div>
                    <div className="relative">
                        {isExpanded && poi.imageUrl && (
                            <div 
                                className="h-32 w-full relative cursor-pointer group" 
                                onClick={(e) => { e.stopPropagation(); onEnterStreetView(); }}
                                title="Click for Street View"
                            >
                                <img src={poi.imageUrl} className="w-full h-full object-cover" alt={poi.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover:bg-black/10 transition-colors"></div>
                                <div className="absolute bottom-2 left-2 text-white text-xs font-bold px-2 py-0.5 bg-blue-600/90 rounded-full backdrop-blur-sm flex items-center gap-1 group-hover:bg-blue-500 transition-colors">
                                    <Eye className="w-3 h-3" />
                                    Street View
                                </div>
                            </div>
                        )}
                        <div className="p-4" onClick={!isExpanded ? onToggleExpand : undefined} style={{ cursor: !isExpanded ? 'pointer' : 'default' }}>
                            <div className="flex items-start gap-3 mb-2">
                                <div className={`p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0`}>{Icon}</div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{poi.name}</h3>
                                    {poi.rating && (<div className="flex items-center gap-1 mt-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-xs font-bold text-slate-600 dark:text-slate-400">{poi.rating}</span></div>)}
                                </div>
                            </div>
                            {!isExpanded && (<p className="text-xs text-slate-400 mt-1 pl-[44px]">Click to view details...</p>)}
                            {isExpanded && (
                                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{poi.description}</p>
                                    {(poi.time || poi.duration) && (<div className="flex gap-3 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">{poi.time && <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {poi.time}</div>}{poi.duration && <div className="flex items-center gap-1"><Hourglass className="w-3 h-3" /> {poi.duration}</div>}</div>)}
                                    {poi.type === LocationType.HOTEL && onBookHotel && (<button onClick={(e) => { e.stopPropagation(); onBookHotel(poi); }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 mt-2 shadow-sm"><BedDouble className="w-3 h-3" /> Check Rates</button>)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 border-t border-slate-200 dark:border-slate-700 divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={!hasPrev} className={`p-3 flex items-center justify-center gap-2 text-xs font-bold transition-colors ${!hasPrev ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><ChevronLeft className="w-4 h-4" /> Prev</button>
                        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className={`p-3 flex items-center justify-center gap-2 text-xs font-bold transition-colors ${(!hasNext && !isLastOfDay) ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'}`}>{isLastOfDay && !hasNext ? (<>Next Day <ArrowRight className="w-4 h-4" /></>) : (<>Next <ChevronRight className="w-4 h-4" /></>)}</button>
                    </div>
                </div>
                
                {/* Mobile Pin - Always visible on mobile to show location, but card is handled by MobilePoiOverlay */}
                <div className="w-0.5 h-4 bg-blue-500 dark:bg-blue-400 md:block hidden"></div>
                <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 ring-4 ring-white dark:ring-slate-900 shadow-sm md:block hidden"></div>
                
                {/* Mobile Simplified Pin for Active State */}
                <div className="md:hidden flex flex-col items-center">
                     <div className="w-0.5 h-4 bg-blue-500 dark:bg-blue-400"></div>
                     <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 ring-4 ring-white dark:ring-slate-900 shadow-sm animate-bounce"></div>
                </div>
            </div>
        </OverlayView>
    );
};

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

const MapDisplay: React.FC<MapDisplayProps> = ({ selectedDay, allDays, onBookHotel, onSelectDay, isDarkMode = true, activePoiId, onPoiSelect, flyToFlight, hotelFlyAnimation }) => {
  const { isLoaded, loadError } = useJsApiLoader({ 
      id: 'google-map-script', 
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      version: "beta",
      libraries: LIBRARIES
  });
  const [map, setMap] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isRouteKeyExpanded, setIsRouteKeyExpanded] = useState(false);
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Flight Animation State
  const [isFlying, setIsFlying] = useState(false);
  const [planePos, setPlanePos] = useState<{ lat: number; lng: number } | null>(null);
  const [planeHeading, setPlaneHeading] = useState(0);

  // Hotel Fly Animation State
  const [isTransferringToHotel, setIsTransferringToHotel] = useState(false);

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Global handler for authentication failure
    window.gm_authFailure = () => {
      setAuthError(true);
    };
  }, []);

  const mapOptions = useMemo(() => ({ 
      disableDefaultUI: true, 
      zoomControl: true, 
      styles: isDarkMode ? darkMapStyles : lightMapStyles,
      mapTypeId: mapType,
      tilt: 0,
      heading: 0,
      mapId: 'DEMO_MAP_ID' 
  }), [isDarkMode, mapType]);

  const displayedPois = selectedDay.pois;
  const activePoiIndex = useMemo(() => activePoiId ? Math.max(0, displayedPois.findIndex(p => p.id === activePoiId)) : 0, [displayedPois, activePoiId]);
  const activePoi = displayedPois[activePoiIndex];
  
  const prevDay = useMemo(() => allDays.find(d => d.dayNumber === selectedDay.dayNumber - 1), [allDays, selectedDay]);
  const nextDay = useMemo(() => allDays.find(d => d.dayNumber === selectedDay.dayNumber + 1), [allDays, selectedDay]);

  useEffect(() => { setExpandedId(null); }, [selectedDay.dayNumber]);

  // Sync Street View State
  useEffect(() => {
    if (map) {
      const sv = map.getStreetView();
      if (sv) {
        const listener = sv.addListener('visible_changed', () => {
           setIsStreetViewActive(sv.getVisible());
        });
        return () => {
            if ((window as any).google && (window as any).google.maps && (window as any).google.maps.event) {
                (window as any).google.maps.event.removeListener(listener);
            }
        };
      }
    }
  }, [map]);

  // --- HOTEL TRANSFER CINEMATIC SEQUENCE ---
  useEffect(() => {
    if (!map || !hotelFlyAnimation) return;

    // Reset Flight State
    setIsTransferringToHotel(true);
    setMapType('satellite');
    
    // Animation Config
    let startTime = performance.now();
    let phase = 'PREP'; 

    const animate = (time: number) => {
        const elapsed = time - startTime;
        
        if (phase === 'PREP') {
             // 1. Prepare: Center on start, Zoom reasonably in
             map.moveCamera({ center: hotelFlyAnimation.start, zoom: 16, tilt: 45, heading: 0 });
             if (elapsed > 500) {
                 phase = 'LIFT_OFF';
                 startTime = time;
             }
        } else if (phase === 'LIFT_OFF') {
            // 2. Lift camera up to see surrounding area
            const t = Math.min(elapsed / 1500, 1);
            const ease = 1 - Math.pow(1 - t, 3); // Ease out cubic
            
            const currentZoom = lerp(16, 12, ease); // Zoom out
            const currentTilt = lerp(45, 0, ease); // Look down

            map.moveCamera({ center: hotelFlyAnimation.start, zoom: currentZoom, tilt: currentTilt });
            
            if (t >= 1) {
                phase = 'PAN_TO_HOTEL';
                startTime = time;
            }
        } else if (phase === 'PAN_TO_HOTEL') {
            // 3. Pan to destination while elevated
            const t = Math.min(elapsed / 2000, 1);
            // Ease in-out
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const currentCenter = lerpGeo(hotelFlyAnimation.start, hotelFlyAnimation.end, ease);
            // Add a slight arc in zoom if distance is far? For now linear
            
            map.moveCamera({ center: currentCenter, zoom: 12, tilt: 0 });

            if (t >= 1) {
                phase = 'DROP_IN';
                startTime = time;
            }
        } else if (phase === 'DROP_IN') {
             // 4. Drop down to the hotel
             const t = Math.min(elapsed / 2000, 1);
             const ease = 1 - Math.pow(1 - t, 3);

             const currentZoom = lerp(12, 17, ease);
             const currentTilt = lerp(0, 60, ease); // Dramatic angle
             const currentHeading = lerp(0, 45, ease); // Slight rotation

             map.moveCamera({ center: hotelFlyAnimation.end, zoom: currentZoom, tilt: currentTilt, heading: currentHeading });

             if (t >= 1) {
                 setIsTransferringToHotel(false);
                 // Keep map type satellite for effect or switch back? Let's switch back after a delay
                 setTimeout(() => {
                     setMapType(isDarkMode ? 'roadmap' : 'roadmap');
                 }, 3000);
                 return;
             }
        }

        animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

  }, [hotelFlyAnimation, map, isDarkMode]);

  // --- CINEMATIC FLIGHT SEQUENCER (Existing) ---
  useEffect(() => {
    if (!map || !flyToFlight) return;

    // Reset State
    setIsFlying(true);
    setPlanePos(flyToFlight.departureCoords);
    setMapType('satellite'); // Switch to satellite for Earth view
    
    // Animation Config
    let startTime = performance.now();
    let phase = 'INIT_GLOBE'; 

    const animate = (time: number) => {
        const elapsed = time - startTime;
        
        if (phase === 'INIT_GLOBE') {
            // 1. Zoom out to Globe View
            map.moveCamera({ center: { lat: 30, lng: -40 }, zoom: 2, tilt: 0, heading: 0 });
            if (elapsed > 1000) {
                phase = 'ZOOM_DEPARTURE';
                startTime = time;
            }
        } else if (phase === 'ZOOM_DEPARTURE') {
            // 2. Zoom in to Departure
            const t = Math.min(elapsed / 2500, 1);
            const ease = 1 - Math.pow(1 - t, 3); // Ease out cubic
            
            const currentZoom = lerp(2, 13, ease);
            const currentCenter = lerpGeo({ lat: 30, lng: -40 }, flyToFlight.departureCoords, ease);
            const currentTilt = lerp(0, 45, ease);

            map.moveCamera({ center: currentCenter, zoom: currentZoom, tilt: currentTilt, heading: 0 });
            
            if (t >= 1) {
                phase = 'WAIT_DEPARTURE';
                startTime = time;
            }
        } else if (phase === 'WAIT_DEPARTURE') {
            // 3. Wait 1 second at departure
            if (elapsed > 1000) {
                phase = 'ZOOM_OUT_TRANSIT';
                startTime = time;
            }
        } else if (phase === 'ZOOM_OUT_TRANSIT') {
            // 4. Zoom out to High Altitude & Show Route
            const t = Math.min(elapsed / 2000, 1);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease in out

            const currentZoom = lerp(13, 4, ease); // Zoom out to 4 for flight view
            // Move center towards midpoint of flight
            const midpoint = {
                lat: (flyToFlight.departureCoords.lat + flyToFlight.arrivalCoords.lat) / 2,
                lng: (flyToFlight.departureCoords.lng + flyToFlight.arrivalCoords.lng) / 2
            };
            const currentCenter = lerpGeo(flyToFlight.departureCoords, midpoint, ease);
            const currentTilt = lerp(45, 0, ease);

            map.moveCamera({ center: currentCenter, zoom: currentZoom, tilt: currentTilt });
            
            if (t >= 1) {
                phase = 'FLY_ACROSS';
                startTime = time;
            }
        } else if (phase === 'FLY_ACROSS') {
            // 5. Pan across the globe to destination
            const t = Math.min(elapsed / 4000, 1); // 4s flight time

            // Calculate Plane Position & Heading
            if ((window as any).google && (window as any).google.maps && (window as any).google.maps.geometry) {
                const from = new (window as any).google.maps.LatLng(flyToFlight.departureCoords);
                const to = new (window as any).google.maps.LatLng(flyToFlight.arrivalCoords);
                
                // Interpolate along Great Circle
                const pos = (window as any).google.maps.geometry.spherical.interpolate(from, to, t);
                setPlanePos({ lat: pos.lat(), lng: pos.lng() });

                // Calculate heading for rotation
                // Use a slightly future point to get instant heading along the curve
                const futurePos = (window as any).google.maps.geometry.spherical.interpolate(from, to, Math.min(t + 0.01, 1));
                const heading = (window as any).google.maps.geometry.spherical.computeHeading(pos, futurePos);
                setPlaneHeading(heading);

                // Camera follows plane
                map.moveCamera({ center: { lat: pos.lat(), lng: pos.lng() }, zoom: 4, tilt: 0 });
            } else {
                 // Fallback if geometry not loaded
                 const pos = lerpGeo(flyToFlight.departureCoords, flyToFlight.arrivalCoords, t);
                 setPlanePos(pos);
                 map.moveCamera({ center: pos, zoom: 4, tilt: 0 });
            }

            if (t >= 1) {
                phase = 'ZOOM_ARRIVAL';
                startTime = time;
            }
        } else if (phase === 'ZOOM_ARRIVAL') {
            // 6. Zoom in to Arrival Airport
            const t = Math.min(elapsed / 2500, 1);
            const ease = 1 - Math.pow(1 - t, 3);

            const currentZoom = lerp(4, 14, ease);
            const currentTilt = lerp(0, 45, ease);
            
            map.moveCamera({ center: flyToFlight.arrivalCoords, zoom: currentZoom, tilt: currentTilt });

            if (t >= 1) {
                phase = 'FINAL_DESTINATION';
                startTime = time;
            }
        } else if (phase === 'FINAL_DESTINATION') {
             // 7. Pan to First Day POI (if exists)
             if (selectedDay.pois.length > 0) {
                 const dest = selectedDay.pois[0].coordinates;
                 const t = Math.min(elapsed / 2000, 1);
                 const ease = 1 - Math.pow(1 - t, 3);
                 
                 const currentCenter = lerpGeo(flyToFlight.arrivalCoords, dest, ease);
                 const currentZoom = lerp(14, 18, ease); 
                 const currentTilt = lerp(45, 67.5, ease);
                 const currentHeading = lerp(0, 45, ease);

                 map.moveCamera({ center: currentCenter, zoom: currentZoom, tilt: currentTilt, heading: currentHeading });

                 if (t >= 1) {
                     setIsFlying(false); // End animation loop
                     return; 
                 }
             } else {
                 setIsFlying(false);
                 return;
             }
        }

        animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [flyToFlight, map]); 

  // Normal Map Movement (when not flying)
  useEffect(() => {
    if (map && !isFlying && !isTransferringToHotel && displayedPois[activePoiIndex]) {
        const poi = displayedPois[activePoiIndex];
        map.panTo(poi.coordinates);
        map.setZoom(15);
        map.moveCamera({ tilt: 0, heading: 0 });
        setMapType(isDarkMode ? 'roadmap' : 'roadmap'); // Reset to roadmap
    }
  }, [map, activePoiIndex, isFlying, isTransferringToHotel, isDarkMode]);

  const segments = useMemo(() => {
    const segs = [];
    if (prevDay && prevDay.pois.length > 0 && displayedPois.length > 0) {
        segs.push({ path: [prevDay.pois[prevDay.pois.length - 1].coordinates, displayedPois[0].coordinates], color: "#94a3b8", isIncoming: true, zIndex: 0 });
    }
    if (displayedPois.length >= 2) {
        for (let i = 0; i < displayedPois.length - 1; i++) {
            let color = "#3b82f6";
            let zIndex = 1;
            if (i < activePoiIndex) color = "#ef4444";
            else if (i === activePoiIndex) { color = "#10b981"; zIndex = 10; }
            segs.push({ path: [displayedPois[i].coordinates, displayedPois[i+1].coordinates], color, zIndex, isIncoming: false });
        }
    }
    return segs;
  }, [displayedPois, activePoiIndex, prevDay]);

  const onLoad = useCallback((map: any) => {
    setMap(map);
    if (displayedPois.length > 0) { 
        map.moveCamera({ center: displayedPois[0].coordinates, zoom: 14 });
    }
  }, [displayedPois]);

  const onUnmount = useCallback(() => { setMap(null); }, []);
  const handleNext = () => { if (activePoiIndex < displayedPois.length - 1) { onPoiSelect?.(displayedPois[activePoiIndex + 1].id); setExpandedId(null); } else if (nextDay) onSelectDay(nextDay); };
  const handlePrev = () => { if (activePoiIndex > 0) { onPoiSelect?.(displayedPois[activePoiIndex - 1].id); setExpandedId(null); } else if (prevDay) onSelectDay(prevDay); };
  
  const handleEnterStreetView = (coords: {lat: number, lng: number}) => {
    if (map) {
        const streetView = map.getStreetView();
        streetView.setOptions({
            position: coords,
            visible: true,
            addressControl: false, // Removes default "Untitled Map" box
            fullscreenControl: false,
            enableCloseButton: false, // We use a custom button
            linksControl: true,
            panControl: true,
            zoomControl: true
        });
        setIsStreetViewActive(true);
    }
  };

  const handleExitStreetView = () => {
    if (map) {
        const sv = map.getStreetView();
        sv.setVisible(false);
        setIsStreetViewActive(false);
    }
  };

  if (loadError || authError || !GOOGLE_MAPS_API_KEY) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-8 text-center animate-in fade-in">
              <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4 shadow-sm">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Interactive Map Unavailable</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                  {authError 
                    ? "The Google Maps API key provided is not authorized for this domain (ApiTargetBlockedMapError). Please update your API key restrictions or provide a valid key." 
                    : "Unable to load Google Maps. Please check your network connection and API configuration."}
              </p>
              <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 p-2 rounded font-mono">
                 Key: {GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 8)}...` : 'Missing'}
              </div>
          </div>
      );
  }

  if (!isLoaded) return <div className="w-full h-full bg-slate-100 dark:bg-slate-900 animate-pulse"></div>;

  return (
    <div className="relative w-full h-full group">
        <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={8} onLoad={onLoad} onUnmount={onUnmount} options={mapOptions}>
            
            {/* --- FLIGHT ANIMATION LAYER --- */}
            {isFlying && flyToFlight && (
                <>
                    {/* 1. Glow Effect Line (Underneath) */}
                    <Polyline
                        path={[flyToFlight.departureCoords, flyToFlight.arrivalCoords]}
                        options={{
                            strokeColor: "#60a5fa", // Bright Blue
                            strokeOpacity: 0.3,
                            strokeWeight: 10,
                            geodesic: true,
                            zIndex: 90
                        }}
                    />
                    
                    {/* 2. Dashed Main Route */}
                    <Polyline
                        path={[flyToFlight.departureCoords, flyToFlight.arrivalCoords]}
                        options={{
                            strokeOpacity: 0, // Hide solid line
                            geodesic: true,
                            zIndex: 91,
                            icons: [{
                                icon: { 
                                    path: 'M 0,-1 0,1', 
                                    strokeOpacity: 1, 
                                    scale: 2, 
                                    strokeColor: '#bfdbfe', // Light Blue/White
                                    strokeWeight: 2
                                },
                                offset: '0',
                                repeat: '15px' // Dashed pattern
                            }]
                        }}
                    />

                    {/* 3. High Quality Plane Icon */}
                    {planePos && (
                        <OverlayView 
                            position={planePos} 
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                            <PlaneIcon rotation={planeHeading} />
                        </OverlayView>
                    )}
                </>
            )}

            {/* Standard Route Segments */}
            {!isFlying && !isTransferringToHotel && segments.map((segment, idx) => (
                <React.Fragment key={`route-${idx}`}>
                    <Polyline
                        path={segment.path}
                        options={{
                            strokeColor: segment.isIncoming ? (isDarkMode ? '#334155' : '#cbd5e1') : (isDarkMode ? '#020617' : '#334155'), 
                            strokeOpacity: segment.isIncoming ? 0.4 : 0.8,
                            strokeWeight: 6,
                            zIndex: segment.zIndex,
                        }}
                    />
                    <Polyline
                        path={segment.path}
                        options={{
                            strokeOpacity: 0,
                            zIndex: segment.zIndex + 1,
                            icons: [{
                                icon: { path: 'M 0,-1 0,1', strokeOpacity: segment.isIncoming ? 0.6 : 1, scale: 3, strokeColor: segment.color, strokeWeight: 2 },
                                offset: '0', repeat: '10px'
                            }, {
                                icon: !segment.isIncoming && segment.color === "#10b981" ? { path: 2, scale: 3, strokeColor: '#ffffff', fillColor: segment.color, fillOpacity: 1 } : { path: '' },
                                offset: '50%', repeat: '100px'
                            }]
                        }}
                    />
                </React.Fragment>
            ))}

            {!isFlying && !isTransferringToHotel && !isStreetViewActive && displayedPois.map((poi, index) => {
                const isActive = index === activePoiIndex;
                const isExpanded = expandedId === poi.id || (isActive && expandedId === null && index === 0); 
                let status = 'future';
                if (index < activePoiIndex) status = 'past';
                if (index === activePoiIndex) status = 'active';

                return (
                    <ItineraryTile
                        key={`${poi.id}-${index}`}
                        poi={poi}
                        index={index}
                        total={displayedPois.length}
                        dayNumber={selectedDay.dayNumber}
                        isActive={isActive}
                        status={status}
                        isExpanded={expandedId === poi.id}
                        onActivate={() => { onPoiSelect?.(poi.id); setExpandedId(null); }}
                        onToggleExpand={() => setExpandedId(expandedId === poi.id ? null : poi.id)}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        hasPrev={index > 0 || !!prevDay}
                        hasNext={index < displayedPois.length - 1 || !!nextDay}
                        isLastOfDay={index === displayedPois.length - 1}
                        onBookHotel={onBookHotel}
                        onEnterStreetView={() => handleEnterStreetView(poi.coordinates)}
                    />
                );
            })}
        </GoogleMap>

        {/* Mobile Full Screen Overlay for Active POI */}
        {!isFlying && !isTransferringToHotel && !isStreetViewActive && activePoi && (
            <div className="md:hidden">
                <MobilePoiOverlay 
                    poi={activePoi}
                    isExpanded={expandedId === activePoi.id}
                    onToggleExpand={() => setExpandedId(expandedId === activePoi.id ? null : activePoi.id)}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    hasPrev={activePoiIndex > 0 || !!prevDay}
                    hasNext={activePoiIndex < displayedPois.length - 1 || !!nextDay}
                    isLastOfDay={activePoiIndex === displayedPois.length - 1}
                    onBookHotel={onBookHotel}
                    onEnterStreetView={() => handleEnterStreetView(activePoi.coordinates)}
                    dayNumber={selectedDay.dayNumber}
                    index={activePoiIndex}
                    total={displayedPois.length}
                />
            </div>
        )}

        {isStreetViewActive && (
            <button 
                onClick={handleExitStreetView}
                className="absolute top-4 left-4 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-all animate-in fade-in slide-in-from-top-2"
            >
                <X className="w-4 h-4" />
                Exit Street View
            </button>
        )}

        {/* View Toggle Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button 
                onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Toggle Satellite View"
            >
                <Globe className="w-5 h-5" />
            </button>
        </div>
        
        {/* Route Key (Collapsible) - Hidden on Mobile Active to avoid clutter */}
        {!isFlying && !isTransferringToHotel && !isStreetViewActive && (!activePoiId || window.innerWidth >= 768) && (
            <div className="absolute bottom-6 left-6 z-[5] flex flex-col items-start gap-2 hidden md:flex">
                {isRouteKeyExpanded && (
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl w-48 animate-in slide-in-from-bottom-2 duration-300 mb-1">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-1.5 bg-slate-900 dark:bg-slate-950 rounded-full relative overflow-hidden flex items-center justify-center"><div className="w-full border-t-2 border-dashed border-emerald-500"></div></div>
                                <span className="text-xs font-medium text-slate-700 dark:text-emerald-400">Current Leg</span>
                            </div>
                            <div className="flex items-center gap-3">
                                    <div className="w-8 h-1.5 bg-slate-900 dark:bg-slate-950 rounded-full relative overflow-hidden flex items-center justify-center"><div className="w-full border-t-2 border-dashed border-blue-500"></div></div>
                                <span className="text-xs font-medium text-slate-700 dark:text-blue-400">Upcoming</span>
                            </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-1.5 bg-slate-900 dark:bg-slate-950 rounded-full relative overflow-hidden flex items-center justify-center"><div className="w-full border-t-2 border-dashed border-red-500"></div></div>
                                <span className="text-xs font-medium text-slate-700 dark:text-red-400">Completed</span>
                            </div>
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => setIsRouteKeyExpanded(!isRouteKeyExpanded)}
                    className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                    <Navigation className="w-3 h-3" /> 
                    Route Key
                    {isRouteKeyExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
            </div>
        )}
    </div>
  );
};

export default React.memo(MapDisplay);
