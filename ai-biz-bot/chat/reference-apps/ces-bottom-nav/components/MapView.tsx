
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { MapPin, Navigation, Info, Hotel, Zap, Layers, Map as MapIcon } from 'lucide-react';
import L from 'leaflet';

const VENUES = [
  { name: 'Venetian Expo', address: '201 Sands Ave', type: 'Exhibits', coords: [36.1212, -115.1697] as [number, number], description: 'Main show floor for Smart Home and Tech.' },
  { name: 'Fontainebleau', address: '2777 S Las Vegas Blvd', type: 'Keynotes', coords: [36.1348, -115.1517] as [number, number], description: 'CES Foundry & Keynote programming hub.' },
  { name: 'LVCC North Hall', address: '3150 Paradise Rd', type: 'Tech East', coords: [36.1312, -115.1511] as [number, number], description: 'Automotive, Digital Health, and Robotics.' },
  { name: 'Westgate (LVH)', address: '3000 Paradise Rd', type: 'Showrooms', coords: [36.1360, -115.1510] as [number, number], description: 'Smart Cities and specialized tech showrooms.' },
  { name: 'Paris Las Vegas', address: '3655 Las Vegas Blvd S', type: 'Events', coords: [36.1125, -115.1707] as [number, number], description: 'Networking receptions and fine dining.' }
];

export const MapView: React.FC = () => {
  const [selected, setSelected] = useState(VENUES[0]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      center: selected.coords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Add Dark Mode Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

    // Custom Icon
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Add markers
    VENUES.forEach(venue => {
      const marker = L.marker(venue.coords, { icon: customIcon })
        .addTo(mapRef.current!)
        .on('click', () => setSelected(venue));
      
      markersRef.current[venue.name] = marker;
    });

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  // Sync map center when selected changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(selected.coords, 15, { duration: 1.5 });
    }
  }, [selected]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="px-6 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-blue-400">Global Navigation</h2>
            <p className="text-gray-400 text-xs font-medium">Real-time CES venue mapping active</p>
          </div>
          <div className="flex gap-2">
             <MapQuickAction icon={<Layers size={16} />} />
             <MapQuickAction icon={<MapIcon size={16} />} />
          </div>
        </div>
      </div>

      <div className="relative flex-1 bg-gray-900 mx-6 rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-2xl min-h-[400px]">
        {/* Interactive Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Map UI Overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <GlassCard className="!p-5 bg-black/70 backdrop-blur-2xl border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{selected.type}</div>
                <h3 className="font-bold text-xl text-white">{selected.name}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{selected.description || selected.address}</p>
              </div>
              <button 
                onClick={() => alert(`Redirecting to System Navigation for ${selected.name}`)}
                className="bg-blue-600 text-white rounded-2xl p-5 shadow-xl shadow-blue-600/30 active:scale-90 transition-all hover:bg-blue-500"
              >
                <Navigation className="w-7 h-7" />
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Floating Zoom Controls Replacement (Native Leaflet hidden) */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
            <button 
              onClick={() => mapRef.current?.zoomIn()}
              className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors border-white/10"
            >
              +
            </button>
            <button 
              onClick={() => mapRef.current?.zoomOut()}
              className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors border-white/10"
            >
              −
            </button>
        </div>
      </div>

      <div className="px-6 pb-28">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {VENUES.map((venue) => (
            <button
              key={venue.name}
              onClick={() => setSelected(venue)}
              className={`flex-shrink-0 px-6 py-4 rounded-2xl border transition-all duration-300 min-w-[160px] text-left ${
                selected.name === venue.name 
                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-600/10' 
                : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className={`text-[9px] font-black uppercase tracking-wider mb-1 ${selected.name === venue.name ? 'text-blue-400' : 'opacity-40'}`}>
                {venue.type}
              </div>
              <div className="font-bold text-sm">{venue.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MapQuickAction: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <button className="p-3 glass-panel rounded-xl border-white/10 text-blue-400 hover:bg-white/10 transition-colors active:scale-90 shadow-lg">
    {icon}
  </button>
);
