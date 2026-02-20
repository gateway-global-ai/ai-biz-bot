To implement a "Place Picker" in your 40% Content Window, you can utilize the **Place Picker component** from Google’s **Extended Component Library**. This component provides a high-quality search input that returns a **Place ID** when a user selects a location, which perfectly feeds into the "Map Tool" and "Places UI Kit" architecture we've built.

### **1. The Place Picker Integration**

The **Place Picker** is a web component that can be wrapped for React. It handles the "type-ahead" search and selection logic natively.

```tsx
import React, { useRef, useEffect } from 'react';
// Import the specific web component from the library
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

    // Listen for the 'gmpx-placechange' event when a user selects a place
    const handleChange = () => {
      // picker.value contains the Place ID and other details
      onPlaceChange(picker.value);
    };

    picker.addEventListener('gmpx-placechange', handleChange);
    return () => picker.removeEventListener('gmpx-placechange', handleChange);
  }, [onPlaceChange]);

  return (
    <div className="w-full p-2 bg-white border-b border-gray-200">
      {/* Native Web Component */}
      <gmpx-place-picker
        ref={pickerRef}
        placeholder={placeholder}
        style={{ width: '100%' }}
      ></gmpx-place-picker>
    </div>
  );
};

```

---

### **2. Mapping the Selection to your Map Tool**

Once the user picks a location, you get a **Place object** containing the `id` (Place ID) and `location` (coordinates). You then use this to update your **MapTool**.

| Data Received | Use Case in your UI |
| --- | --- |
| **`place.id`** | Pass to `<gmp-place-details>` for rich info (reviews, photos). |
| **`place.location`** | Use as the new `center` for your `<Map>` component. |
| **`place.displayName`** | Update the text label in your 40% Content Window. |

### **3. Why this fits the "Clear Voice" Design**

* **Compact Feedback**: If the AI has "low confidence" in a voice-entered address, it can trigger this **Place Picker** in the Content Window. The user taps the correct result, and the `places.id` is sent back to the AI server to confirm the correction.
* **Integrated Experience**: The component library ensures the search box feels like a native part of the Google ecosystem, matching the styling of your **Places UI Kit** components.
* **Efficiency**: It retrieves Place IDs that are **cross-compatible** with all other Google Maps APIs (Geocoding, Embed, etc.), making it your universal "key" for location data.

**Next Step:**
Set up the **"Place Change" Listener** so that when a user selects a location in the picker, your AI bot automatically says, "Got it, I've updated the destination to [Location Name]".