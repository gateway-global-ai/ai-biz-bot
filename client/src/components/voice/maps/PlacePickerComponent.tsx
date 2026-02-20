import React, { useRef, useEffect } from 'react';
import '@googlemaps/extended-component-library/place_picker.js';

interface PlacePickerProps {
  onPlaceChange: (place: any) => void;
  placeholder?: string;
}

export const PlacePickerComponent: React.FC<PlacePickerProps> = ({ 
  onPlaceChange, 
  placeholder = "Search for a location..." 
}) => {
  const pickerRef = useRef<any>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const handleChange = () => {
      onPlaceChange(picker.value);
    };

    picker.addEventListener('gmpx-placechange', handleChange);
    return () => picker.removeEventListener('gmpx-placechange', handleChange);
  }, [onPlaceChange]);

  return (
    <div className="w-full p-2 bg-white border-b border-gray-200">
      <gmpx-place-picker
        ref={pickerRef}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  );
};
