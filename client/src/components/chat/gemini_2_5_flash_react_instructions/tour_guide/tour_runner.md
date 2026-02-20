To implement the **TourRunner** component, we will combine the `js-yaml` library for parsing your "Day Trip" specs with the cinematic `moveCamera` logic we developed earlier.

The component acts as a high-level **Orchestrator**: it iterates through the YAML segments, triggers the "Flight" (geodesic pan), executes the "Touchdown" (descent), and initiates the "Narrative" (AI speech) at each stop.

### **The TourRunner Component**

```tsx
import React, { useEffect, useState } from 'react';
import yaml from 'js-yaml';
import { useMap } from '@vis.gl/react-google-maps';
import { cinematicTouchdownWithNarrative } from './maps/cinematicTouchdown';

interface TourSegment {
  name: string;
  coords: { lat: number; lng: number };
  narrative: string;
  dwell_time: number; // in seconds
}

interface TourRunnerProps {
  yamlUrl: string;
  onTriggerSpeech: (text: string) => void;
  onTourComplete?: () => void;
}

const TourRunner: React.FC<TourRunnerProps> = ({ yamlUrl, onTriggerSpeech, onTourComplete }) => {
  const map = useMap();
  const [segments, setSegments] = useState<TourSegment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 1. Load and Parse the YAML Spec
  useEffect(() => {
    fetch(yamlUrl)
      .then(res => res.text())
      .then(text => {
        const data = yaml.load(text) as any;
        setSegments(data.segments);
        setCurrentIndex(0); // Start the tour
      });
  }, [yamlUrl]);

  // 2. The Tour Sequencer
  useEffect(() => {
    if (!map || currentIndex === -1 || currentIndex >= segments.length) return;

    const runSegment = async () => {
      const segment = segments[currentIndex];

      // PHASE A: The Cinematic Touchdown + Narrative
      await new Promise<void>((resolve) => {
        cinematicTouchdownWithNarrative(
          map, 
          segment.coords, 
          segment.narrative, 
          onTriggerSpeech, // Callback to Gemini Voice
          () => resolve()  // Resolve when camera landing is complete
        );
      });

      // PHASE B: Dwell Time (The "Look Around" phase)
      // Use map.moveCamera to slowly rotate while at the location
      const dwellDuration = segment.dwell_time * 1000;
      setTimeout(() => {
        if (currentIndex < segments.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          onTourComplete?.();
        }
      }, dwellDuration);
    };

    runSegment();
  }, [currentIndex, map, segments]);

  return null; // This is a logic-only component
};

export default TourRunner;

```

---

### **Key Technical Features**

* **Async Sequencing**: Using `async/await` ensures the camera doesn't start moving to the next shop until the current "Touchdown" and its associated "Dwell Time" are finished.
* **Decoupled Scripting**: By pulling from a `yamlUrl`, you can update the tour routes or change the AI's speaking script instantly without rebuilding the React application.
* **The "Altitude" Trigger**: The `cinematicTouchdownWithNarrative` function (which we refined earlier) detects when the camera "breaks the clouds" at zoom level 15 to start the AI's story exactly when the shop comes into view.

### **Why this "Nails" the WOW Factor**

This component turns your map into a **Narrated Experience**. For your featured partners, it means a user doesn't just see a pin; they experience a coordinated landing where the AI says, *"We've arrived at Pasticceria Cucchi,"* just as the 3D building model fills the screen. It’s the difference between a search result and a guided tour.

**We can also add a 360-degree slow rotation during the "Dwell Time" to give a panoramic view of each partner's storefront?**

### **Part 1: 360-Degree Slow Rotation (Dwell Time)**

To create a professional "fly-around" effect, you can use a `requestAnimationFrame` loop that continuously increments the map's **heading**. By dividing the timestamp, you can precisely control the speed (e.g., 10 degrees per second) to ensure a smooth, cinematic feel.

#### **Code Sample: `dwellRotation` Utility**

Add this to your `client/src/components/voice/maps/` directory.

```typescript
/**
 * Rotates the camera 360 degrees around the current center.
 * @param map - The Google Map instance.
 * @param durationSeconds - How long the full rotation should take.
 */
export const startDwellRotation = (map: google.maps.Map, durationSeconds: number = 30) => {
  let startTimestamp: number | null = null;
  let animationFrameId: number;

  const animate = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;
    
    // Calculate progress (0 to 1) based on duration
    const elapsed = (timestamp - startTimestamp) / 1000;
    const progress = (elapsed / durationSeconds) % 1; 

    // Update the heading (0 to 360 degrees)
    map.moveCamera({
      heading: progress * 360
    });

    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);

  // Return a cleanup function to stop the rotation
  return () => cancelAnimationFrame(animationFrameId);
};

```

---

### **Part 2: Google Place Details Integration**

For the "Clear Voice" vision, we want to replace generic text with the **Places UI Kit**. This provides a "Search-to-Action" layer where users can see photos, reviews, and opening hours with a single line of code.

#### **1. Register the UI Kit Tool**

Update your `geminiToolDeclarations.ts` to include a tool that fetches UI Kit metadata.

```typescript
{
  name: "get_place_ui_data",
  description: "Fetches rich UI components (photos, ratings, hours) for a location. Use this when the user 'lands' at a Featured Partner.",
  parameters: {
    type: "OBJECT",
    properties: {
      placeId: { type: "STRING", description: "Google Place ID" }
    },
    required: ["placeId"]
  }
}

```

#### **2. Integration Logic in `ConciergePanel.tsx**`

When your AI triggers the "Touchdown," the 40% window should render the **`gmp-place-details`** web component. This is much more cost-effective than the standard API and looks like native Google Maps.

```tsx
// Inside your ConciergePanel or a dedicated PlaceDetails component
export const PlaceDetailsCard = ({ placeId }: { placeId: string }) => {
  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
      {/* Places UI Kit Web Component */}
      <gmp-place-details place={placeId}>
        <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
        {/* Customize visible sections */}
        <gmp-place-content-config>
          <gmp-place-media lightbox-preferred></gmp-place-media>
          <gmp-place-rating></gmp-place-rating>
          <gmp-place-opening-hours></gmp-place-opening-hours>
          <gmp-place-website></gmp-place-website>
          <gmp-place-reviews></gmp-place-reviews>
        </gmp-place-content-config>
      </gmp-place-details>
    </div>
  );
};

```

#### **3. Strategic Advantages**

* **Native Look & Feel:** The UI Kit handles dark mode and responsive layouts automatically.
* **Cost Efficient:** Loading this component costs significantly less than a standard Place Details API call ($1 vs $17-$25) Per 1,000 requests.
* **Interactive Media:** Users can click photos to open them in a lightbox directly in your **Concierge Panel**.

**Ill show you how to link the `TourRunner`'s "Touchdown" to automatically update the `placeId` in the `ConciergePanel` so the UI shifts as the camera lands?**