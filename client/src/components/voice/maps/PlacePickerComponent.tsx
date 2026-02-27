import React, { useRef, useEffect } from 'react';
import { ensureApiLoader, loadPlacesLibrary } from '@/utils/googleMapsLoader';

interface PlacePickerProps {
  onPlaceChange: (place: any) => void;
  placeholder?: string;
  mapsKey?: string;
}

export const PlacePickerComponent: React.FC<PlacePickerProps> = ({
  onPlaceChange,
  placeholder = 'Search for a location...',
  mapsKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (mapsKey) ensureApiLoader(mapsKey);

    let cancelled = false;

    const setup = async () => {
      const { PlaceAutocompleteElement } = await loadPlacesLibrary();
      if (cancelled || !container) return;

      const autocomplete = new PlaceAutocompleteElement();
      autocomplete.setAttribute('placeholder', placeholder);
      autocomplete.style.cssText = 'width:100%;display:block;';

      autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
        const { placePrediction } = event;
        if (!placePrediction) return;
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'rating', 'userRatingCount'],
        });
        onPlaceChange(place);
      });

      container.appendChild(autocomplete);
    };

    setup().catch(err => console.error('[PlacePickerComponent] Failed to load Places library:', err));

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [placeholder, mapsKey, onPlaceChange]);

  return (
    <div className="w-full p-2 bg-white border-b border-gray-200">
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
};
