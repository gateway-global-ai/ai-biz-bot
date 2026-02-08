import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onPlaceSelect: (place: any) => void;
  isLoading: boolean;
}

const PlaceSearch: React.FC<Props> = ({ onPlaceSelect, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if ((window as any).google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    // Get Google Maps API key from window config (set by server) or environment
    const mapsKey = (window as any).__GOOGLE_MAPS_KEY__ || ''; 
    if (!mapsKey) {
      console.error('Google Maps API key not configured. Server should set window.__GOOGLE_MAPS_KEY__');
      return;
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || !((window as any).google)) return;

    const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
      // Extensive list of fields to populate the Admin Panel
      fields: [
        'name', 
        'formatted_address', 
        'place_id', 
        'rating', 
        'user_ratings_total', 
        'url', 
        'website', 
        'opening_hours', 
        'photos', 
        'reviews', 
        'types',
        'address_components',
        'adr_address',
        'business_status',
        'formatted_phone_number',
        'international_phone_number',
        'plus_code',
        'price_level',
        'utc_offset_minutes',
        'vicinity',
        'editorial_summary' // Try to fetch summary
      ],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.name) {
        onPlaceSelect(place);
      }
    });
  }, [scriptLoaded, onPlaceSelect]);

  return (
    <div className="relative group w-full">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
      <div className="relative flex items-center bg-white rounded-xl shadow-lg border border-slate-200 p-2">
        <div className="pl-4 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input 
          ref={inputRef}
          type="text"
          disabled={!scriptLoaded || isLoading}
          placeholder={scriptLoaded ? "Search for a business (e.g. Starbucks in Seattle)" : "Loading Google Maps..."}
          className="w-full px-4 py-4 bg-transparent text-lg focus:outline-none text-slate-800 placeholder:text-slate-400"
        />
        {isLoading && (
           <div className="pr-4">
             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
           </div>
        )}
      </div>
    </div>
  );
};

export default PlaceSearch;