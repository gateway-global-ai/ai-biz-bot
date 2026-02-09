import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onPlaceSelect: (place: any) => void;
  isLoading: boolean;
}

declare global {
  interface Window {
    google?: typeof google;
    __GOOGLE_MAPS_KEY__?: string;
    __placeSearchMapsReady?: () => void;
  }
}

/** New Place API fields (camelCase) we request, mapped to legacy PlaceResult-like shape for onPlaceSelect. */
const NEW_PLACE_FIELDS = [
  'displayName',
  'formattedAddress',
  'id',
  'location',
  'rating',
  'userRatingCount',
  'websiteUri',
  'openingHours',
  'photos',
  'reviews',
  'types',
  'addressComponents',
  'adrFormatAddress',
  'businessStatus',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'plusCode',
  'priceLevel',
  'editorialSummary',
] as const;

function toLegacyPlace(place: any): any {
  const loc = place.location;
  const displayName =
    typeof place.displayName === 'string'
      ? place.displayName
      : place.displayName?.text ?? place.id ?? '';
  const editorialSummary =
    typeof place.editorialSummary === 'string'
      ? place.editorialSummary
      : place.editorialSummary?.text;
  return {
    name: displayName,
    formatted_address: place.formattedAddress ?? '',
    place_id: place.id ?? '',
    rating: place.rating ?? undefined,
    user_ratings_total: place.userRatingCount ?? undefined,
    url: place.websiteUri ?? undefined,
    website: place.websiteUri ?? undefined,
    opening_hours: place.openingHours ?? undefined,
    photos: place.photos ?? undefined,
    reviews: place.reviews ?? undefined,
    types: place.types ?? undefined,
    address_components: place.addressComponents ?? undefined,
    adr_address: place.adrFormatAddress ?? undefined,
    business_status: place.businessStatus ?? undefined,
    formatted_phone_number: place.nationalPhoneNumber ?? undefined,
    international_phone_number: place.internationalPhoneNumber ?? undefined,
    plus_code: place.plusCode ?? undefined,
    price_level: place.priceLevel ?? undefined,
    editorial_summary: editorialSummary ?? undefined,
    geometry: loc
      ? {
          location: { lat: () => (typeof loc.lat === 'function' ? loc.lat() : loc.lat), lng: () => (typeof loc.lng === 'function' ? loc.lng() : loc.lng) },
          viewport: undefined,
        }
      : undefined,
  };
}

const PlaceSearch: React.FC<Props> = ({ onPlaceSelect, isLoading }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
      setScriptLoaded(true);
      return;
    }

    const mapsKey = (window as any).__GOOGLE_MAPS_KEY__ || '';
    if (!mapsKey) {
      console.error('Google Maps API key not configured. Server should set window.__GOOGLE_MAPS_KEY__');
      return;
    }

    const callbackName = '__placeSearchMapsReady';
    (window as any)[callbackName] = async () => {
      try {
        const google = (window as any).google;
        if (google?.maps?.importLibrary) {
          await google.maps.importLibrary('places');
        }
        setScriptLoaded(true);
      } catch (e) {
        console.error('Failed to load Places library:', e);
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !(window as any).google?.maps?.places?.PlaceAutocompleteElement) return;

    const google = (window as any).google;
    const PlaceAutocompleteElement = google.maps.places.PlaceAutocompleteElement;
    const el = new PlaceAutocompleteElement({}) as HTMLElement;
    el.style.width = '100%';
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);

    const handler = async (e: Event & { placePrediction?: { toPlace: () => unknown } }) => {
      try {
        const pred = (e as CustomEvent).detail?.placePrediction ?? (e as any).placePrediction;
        if (!pred) return;
        const place = await Promise.resolve(pred.toPlace());
        await place.fetchFields({ fields: [...NEW_PLACE_FIELDS] });
        const legacy = toLegacyPlace(place);
        if (legacy.name) {
          onPlaceSelectRef.current(legacy);
        }
      } catch (err) {
        console.error('Place fetch error:', err);
      }
    };

    el.addEventListener('gmp-select', handler as EventListener);
    return () => {
      el.removeEventListener('gmp-select', handler as EventListener);
      if (containerRef.current?.contains(el)) {
        containerRef.current.removeChild(el);
      }
    };
  }, [scriptLoaded]);

  return (
    <div className="relative group w-full">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200" />
      <div className="relative flex items-center bg-white rounded-xl shadow-lg border border-slate-200 p-2">
        <div className="pl-4 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div ref={containerRef} className="flex-1 min-w-0" style={{ minHeight: 48 }} />
        {isLoading && (
          <div className="pr-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        )}
      </div>
      {!scriptLoaded && (
        <p className="text-slate-500 text-sm mt-1 px-2">Loading Google Maps...</p>
      )}
    </div>
  );
};

export default PlaceSearch;
