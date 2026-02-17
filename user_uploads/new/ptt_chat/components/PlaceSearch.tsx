
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onPlaceSelect: (place: any) => void;
  isLoading: boolean;
}

const PlaceSearch: React.FC<Props> = ({ onPlaceSelect, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    const mapsKey = "AIzaSyBJfirFVIBMNvM0LQulSiV4f4MKrVKeL-M"; 
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || !((window as any).google)) return;

    const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
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
        'editorial_summary'
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
    <div className="relative group w-full max-w-2xl mx-auto selection:bg-blue-500/30">
      {/* High-tech glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-500 group-focus-within:opacity-100"></div>
      
      <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-2xl p-1.5 shadow-2xl">
        <div className="pl-5 text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        
        <input 
          ref={inputRef}
          type="text"
          disabled={!scriptLoaded || isLoading}
          placeholder={scriptLoaded ? "Enter Business Name or Website..." : "Initializing Satellite Link..."}
          className="w-full px-5 py-5 bg-transparent text-xl md:text-2xl font-bold focus:outline-none text-white placeholder:text-slate-600 placeholder:font-light tracking-tight"
        />
        
        {isLoading && (
           <div className="pr-6">
             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
           </div>
        )}
      </div>
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/20 -translate-x-1 -translate-y-1 rounded-tl-lg"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/20 translate-x-1 -translate-y-1 rounded-tr-lg"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/20 -translate-x-1 translate-y-1 rounded-bl-lg"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/20 translate-x-1 translate-y-1 rounded-br-lg"></div>
    </div>
  );
};

export default PlaceSearch;
