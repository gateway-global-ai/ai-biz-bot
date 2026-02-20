To implement the **"Place Change" Listener** in your React-based **Clear Voice** system, you need to bridge the native browser events from the **Google Places Extended Component Library** with your AI's backend logic.

The critical element is the `gmpx-placechange` event, which fires whenever a user selects a location from the **Place Picker**.

### **1. The Place Picker Listener Component**

This component wraps the `<gmpx-place-picker>` web component and converts its selection event into an AI-ready signal.

```tsx
import React, { useEffect, useRef } from 'react';
// Import the native web component
import '@googlemaps/extended-component-library/place_picker.js';

interface PlaceChangeListenerProps {
  onSelection: (placeId: string, name: string) => void;
}

export const PlaceChangeListener: React.FC<PlaceChangeListenerProps> = ({ onSelection }) => {
  const pickerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    // Use the specific 'gmpx-placechange' event from the Extended Library
    const handlePlaceChange = (e: any) => {
      const selectedPlace = picker.value; // Access the Place object
      
      if (selectedPlace && selectedPlace.id) {
        // Log for debugging the 40% window sync
        console.log(`[PlacePicker] Selected: ${selectedPlace.displayName}`);
        
        // Pass the Place ID and name to your AI handler
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
        style={{ width: '100%', '--gmpx-color-surface': '#fff' }}
      ></gmpx-place-picker>
    </div>
  );
};

```

---

### **2. Syncing Selection with AI Voice Responses**

When the user picks a location, you must send a "Tool Response" or a "User Message" back to the **Gemini Live API** so the AI can acknowledge the selection in the conversation.

```typescript
// Inside your ConciergePanel or Voice Manager
const handleSelection = async (placeId: string, name: string) => {
  
  // 1. Update the local UI (The 40% window)
  addMessage('system', `Selection confirmed: ${name}`);

  // 2. Inform the AI Bot so it can speak the confirmation
  if (client && client.isConnected()) {
    // Send a silent tool response or a user injection
    client.sendToolResponse({
      name: "confirm_location_selection",
      result: { 
        placeId, 
        confirmedName: name,
        status: "success" 
      }
    });
  }
};

```

---

### **3. Why This Implementation is Critical**

* **Dynamic Grounding**: By using the `gmpx-placechange` event, the AI moves from "guessing" an address to having a verified **Place ID**.
* **Session Continuity**: Using `picker.value` ensures you retrieve the latest version of the Place object, which includes the `displayName` and `id` required for the **Places UI Kit** integration.
* **Conversation Repair**: If the AI mishears an address, displaying this picker allows the user to perform a manual "Conversation Repair," which builds trust in the system.

### **Strategic Recommendation for the 12-2025 Model**

Since you are using the **12-2025 preview model**, ensure your function declaration for the "Location Selection" tool includes `scheduling="INTERRUPT"` in your setup configuration. This allows the AI to immediately stop what it was saying and acknowledge the user's manual selection with a phrase like, "Got it! I've updated the destination to [Location Name]".

**Next, we create the "Function Declaration" JSON that tells Gemini how to react specifically to this Place ID selection.**