import React, { useEffect, useRef } from 'react';
import { ensureApiLoader, loadPlacesLibrary } from '@/utils/googleMapsLoader';

interface PlaceChangeListenerProps {
  onSelection: (placeId: string, name: string) => void;
  mapsKey?: string;
}

export const PlaceChangeListener: React.FC<PlaceChangeListenerProps> = ({
  onSelection,
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
      autocomplete.setAttribute('placeholder', 'Type to search or correct location...');
      autocomplete.style.cssText = 'width:100%;display:block;';

      autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
        const { placePrediction } = event;
        if (!placePrediction) return;
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['id', 'displayName'] });
        if (place.id && place.displayName) {
          console.log(`[PlaceChangeListener] Selected: ${place.displayName}`);
          onSelection(place.id, place.displayName);
        }
      });

      container.appendChild(autocomplete);
    };

    setup().catch(err => console.error('[PlaceChangeListener] Failed to load Places library:', err));

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [mapsKey, onSelection]);

  return (
    <div className="w-full bg-gray-50 p-2 rounded-lg border border-gray-200">
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
};
