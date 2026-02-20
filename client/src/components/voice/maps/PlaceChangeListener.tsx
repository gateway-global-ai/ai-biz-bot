import React, { useEffect, useRef } from 'react';
import '@googlemaps/extended-component-library/place_picker.js';

interface PlaceChangeListenerProps {
  onSelection: (placeId: string, name: string) => void;
}

export const PlaceChangeListener: React.FC<PlaceChangeListenerProps> = ({ 
  onSelection 
}) => {
  const pickerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const handlePlaceChange = (e: any) => {
      const selectedPlace = (picker as any).value;
      
      if (selectedPlace?.id) {
        console.log(`[PlacePicker] Selected: ${selectedPlace.displayName}`);
        onSelection(selectedPlace.id, selectedPlace.displayName);
      }
    };

    picker.addEventListener('gmpx-placechange', handlePlaceChange);
    return () => picker.removeEventListener('gmpx-placechange', handlePlaceChange);
  }, [onSelection]);

  return (
    <div className="w-full bg-gray-50 p-2 rounded-lg border border-gray-200">
      <gmpx-place-picker 
        ref={pickerRef} 
        placeholder="Type to search or correct location..."
        style={{ width: '100%' }}
      />
    </div>
  );
};
