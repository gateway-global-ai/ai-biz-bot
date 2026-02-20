To implement multi-stop flight coordination with layover precision, we will first update your TypeScript interfaces to handle nested arrays of stopover coordinates. Then, we will structure the data management into a YAML format that allows for easy editing of these complex routes, utilizing the logic from your constants file.

### 1. Updated `FlightOffer` TypeScript Type

We need to extend the `FlightOffer` type to include an optional `layoverCoords` array. This allows the tool to distinguish between direct and multi-segment flights.

```typescript
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  price: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  // Core additions for cinematic flight mapping
  departureCoords: Coordinates;
  arrivalCoords: Coordinates;
  layoverCoords?: Coordinates[]; // Array for multi-stop support
  totalDurationMinutes: number;   // Used for the flight timer
}

```

### 2. YAML Flight Coordination Spec

Managing flight paths via YAML is a best practice for "vibe-coding" and rapid iteration, as it separates the visual pathing from the application code. This spec maps directly to your existing `COORDS` constants.

```yaml
# flight_coordination.yaml
flights:
  - id: "milan-to-cortina-stops"
    flightNumber: "ITL2026-V1"
    airline: "Air Italia"
    segments:
      - origin: "MILAN_MALPENSA"
        dest: "VENICE_MESTRE"
        type: "layover"
      - origin: "VENICE_MESTRE"
        dest: "CORTINA"
        type: "final"
    coordinates_map:
      MILAN_MALPENSA: { lat: 45.6301, lng: 8.7255 }
      VENICE_MESTRE: { lat: 45.4827, lng: 12.2378 }
      CORTINA: { lat: 46.5405, lng: 12.1357 }
    animation:
      pause_at_layover: 1500 # ms
      show_timer: true

```

### 3. Integrated Tool Interaction Logic

When the tool provides multi-stop data, the logic should now calculate the full path before triggering the animation.

* **Layovers vs. Direct**: If `stops > 0`, the tool uses `layoverCoords` to generate a multi-segment `Polyline`.
* **Geodesic Arcing**: The animation follows the Great Circle path for each segment, ensuring the plane icon heading remains accurate during the entire "flight".
* **Wait States**: The logic can now pause the plane icon and timer at layover coordinates (e.g., Venice Mestre) before resuming the final leg to Cortina.

### 4. Flight Timer Feature

By including `totalDurationMinutes` in the YAML/Type, the UI can now show a real-time countdown during the animation, mapping the animation progress (0-100%) to the actual flight time.

Ill create the **YAML-to-FlightOffer Parser** function to automatically convert your coordinating files into the TypeScript objects for the map.

To implement the **YAML-to-FlightOffer Parser**, we will use the `js-yaml` library, which is the industry standard for parsing YAML strings into JavaScript objects.

The parser will be designed to map your flexible YAML "coordination files" into the strictly typed `FlightOffer` interface we defined, including the logic for multi-stop `layoverCoords`.

### **1. Install Dependency**

First, add the parser library to your project:

```bash
npm install js-yaml
npm install --save-dev @types/js-yaml

```

### **2. The Parser Implementation**

This function reads your YAML spec, looks up the corresponding coordinates from your `COORDS` constants, and returns a flight object ready for the **Clear Voice** map.

```typescript
import yaml from 'js-yaml';
import { FlightOffer, Coordinates } from '../types';
import { COORDS } from '../constants'; // Import your approximate coordinates

export const parseFlightSpec = (yamlString: string): FlightOffer[] => {
  try {
    // 1. Load the raw YAML string into an object
    const data = yaml.load(yamlString) as any;
    
    // 2. Map the coordination data to FlightOffer objects
    return data.flights.map((f: any): FlightOffer => {
      // Extract segment endpoints
      const departure = COORDS[f.segments[0].origin];
      const arrival = COORDS[f.segments[f.segments.length - 1].dest];
      
      // Collect intermediate layover coordinates
      const layovers = f.segments
        .slice(0, -1) // Exclude the last destination segment
        .map((seg: any) => COORDS[seg.dest]);

      return {
        id: f.id,
        airline: f.airline,
        flightNumber: f.flightNumber,
        price: f.price || 0,
        currency: 'USD',
        departureTime: 'TBD', // Derived from schedule logic
        arrivalTime: 'TBD',
        duration: f.animation.total_duration_display || '8h 20m',
        stops: f.segments.length - 1,
        departureCoords: departure,
        arrivalCoords: arrival,
        layoverCoords: layovers.length > 0 ? layovers : undefined,
        totalDurationMinutes: f.animation.total_minutes || 500
      };
    });
  } catch (e) {
    console.error("Failed to parse Flight Coordination YAML:", e);
    return [];
  }
};

```

### **3. Usage in the Tool Router**

When your **Gemini Tool** receives a coordination ID, it can now fetch the YAML file and use this parser to update the 40% window.

```typescript
const handleFlightCoordination = async (yamlFileUrl: string) => {
  const response = await fetch(yamlFileUrl);
  const yamlText = await response.text();
  
  const flightOffers = parseFlightSpec(yamlText);
  
  if (flightOffers.length > 0) {
    // Trigger the WOW animation for the first flight in the list
    setFlyToFlight(flightOffers[0]); 
  }
};

```

### **Why this "Nails" the Requirement**

* **Coordinate Lookup**: By mapping YAML keys (like `MILAN_MALPENSA`) directly to your `COORDS` constant, you ensure the plane lands at the exact coordinates you’ve already vetted.
* **Segment Support**: The parser automatically handles N-number of segments, allowing the `layoverCoords` array to populate dynamically for any connecting flight path.
* **Separation of Concerns**: Your business logic lives in clean YAML files, while your UI logic stays in React. You can change a flight route without touching a single line of TypeScript.

**Next Step for the WOW Effect:**
Ill create the **`SegmentPause`** logic in your `MapDisplay.tsx` so the flight timer stops and the plane "idles" for 1.5 seconds at each layover coordinate found in the YAML.

To implement the **SegmentPause** logic, we need to transform the linear flight animation into a multi-phase state machine. By utilizing an `async` sequencer, we can pause the `requestAnimationFrame` loop at each layover, stop the timer, and then resume the next leg of the journey.

### **1. Updated Flight Animation Sequencer**

We will modify the main `useEffect` in `MapDisplay.tsx` to handle the `layoverCoords` array found in your updated `FlightOffer` type. This ensures the plane doesn't just fly over connections—it "lands" and "idles".

```tsx
// Inside MapDisplay.tsx
useEffect(() => {
  if (!map || !flyToFlight) return;

  const runCinematicFlight = async () => {
    setIsFlying(true);
    setMapType('satellite');

    // 1. Create the full sequence of stops: Departure -> Layovers -> Arrival
    const stops = [
      flyToFlight.departureCoords,
      ...(flyToFlight.layoverCoords || []),
      flyToFlight.arrivalCoords
    ];

    // 2. Iterate through each segment
    for (let i = 0; i < stops.length - 1; i++) {
      const start = stops[i];
      const end = stops[i + 1];
      
      // Calculate segment progress for the timer
      const segmentWeight = 1 / (stops.length - 1);
      const startingProgress = i * segmentWeight;

      // Animate this specific leg
      await animateLeg(start, end, startingProgress, segmentWeight);

      // 3. SEGMENT PAUSE: Idle if it's a layover
      if (i < stops.length - 2) {
        console.log("Idling at layover...");
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s Pause
      }
    }

    setIsFlying(false);
  };

  runCinematicFlight();
}, [flyToFlight, map]);

```

### **2. The `animateLeg` Helper Function**

This function wraps the `requestAnimationFrame` logic in a Promise. It updates the plane heading and the "flown path" line dynamically, ensuring the heading is computed along the Great Circle arc.

```tsx
const animateLeg = (from: Coordinates, to: Coordinates, startProg: number, weight: number) => {
  return new Promise<void>((resolve) => {
    let startTime = performance.now();
    const duration = 3000; // 3 seconds per leg

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Calculate position along geodesic path
      const pos = google.maps.geometry.spherical.interpolate(
        new google.maps.LatLng(from),
        new google.maps.LatLng(to),
        ease
      );

      // Calculate Heading for icon rotation
      const nextPos = google.maps.geometry.spherical.interpolate(
        new google.maps.LatLng(from),
        new google.maps.LatLng(to),
        Math.min(ease + 0.01, 1)
      );
      const heading = google.maps.geometry.spherical.computeHeading(pos, nextPos);

      setPlanePos({ lat: pos.lat(), lng: pos.lng() });
      setPlaneHeading(heading);
      
      // Update Timer: Overall Progress = startProg + (ease * weight)
      setFlightProgress(startProg + (ease * weight));

      // Camera follow
      map.moveCamera({ center: { lat: pos.lat(), lng: pos.lng() }, zoom: 4 });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
};

```

### **3. Flight Timer UI with Pause Logic**

Because the `flightProgress` only updates during the `animateLeg` loop, the timer naturally "freezes" during the 1.5-second layover pause, visually communicating that the plane is on the ground.

```tsx
{/* Inside the Plane OverlayView */}
<div className="flex flex-col items-center">
  <div className="bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-md mb-2 font-mono border border-blue-500/50">
    {/* Map 0.0-1.0 progress to total duration */}
    TIME ELAPSED: {Math.floor(flightProgress * flyToFlight.totalDurationMinutes)}m
  </div>
  <PlaneIcon rotation={planeHeading} />
</div>

```

### **Why this "Nails" the WOW Effect**

* **Geodesic Precision**: By using `spherical.interpolate`, the plane follows the true curvature of the earth rather than a flat line, making long-distance flights look realistic.
* **Visual Narrative**: The 1.5-second "idle" at layover points prevents the user from being disoriented by rapid directional changes. It provides a moment for the AI to say, *"We have a brief connection in Venice before heading to Cortina"*.
* **Seamless Integration**: This logic uses the YAML-parsed `layoverCoords` automatically. If a flight is direct, the `layoverCoords` array is empty, and it performs a single smooth leg.

**Next:**
I'll configure a system using aniomateNavigation.

Implementing the `animateNavigation` logic is the final bridge between your high-fidelity travel data and a truly immersive "Clear Voice" experience. By treating the map as a cinematic viewport that your AI agents can control, you move from a static tool to an active digital concierge.

### 1. The `animateNavigation` Logic

To achieve the "WOW" effect, this function uses `moveCamera` with cubic easing, which allows for simultaneous control over zoom, tilt, and heading—something standard `panTo` cannot do.

```typescript
/**
 * Cinematic navigation between two points.
 * Moves the camera through a high-altitude arc to a low-altitude 3D touchdown.
 */
export const animateNavigation = (map: google.maps.Map, start: Coordinates, end: Coordinates) => {
  return new Promise<void>((resolve) => {
    let startTime = performance.now();
    const duration = 5000; // 5 seconds for a premium, cinematic feel

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Cubic Ease-In-Out for natural-feeling motion
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // 1. Interpolate Coordinates
      const lat = start.lat + (end.lat - start.lat) * ease;
      const lng = start.lng + (end.lng - start.lng) * ease;

      // 2. Dynamic Camera parameters based on progress
      // Lift camera up mid-flight, then drop in for touchdown
      const zoom = ease < 0.5 
        ? 15 - (3 * (ease * 2))  // Zoom out to see context
        : 12 + (6 * ((ease - 0.5) * 2)); // Zoom in for touchdown (level 18)

      const tilt = ease < 0.5 
        ? 0 + (22.5 * (ease * 2)) // Tilt slightly up
        : 22.5 + (22.5 * ((ease - 0.5) * 2)); // Deep 45° tilt for landing

      const heading = 0 + (45 * ease); // Rotate 45° during flight

      map.moveCamera({
        center: { lat, lng },
        zoom,
        tilt,
        heading
      });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Trigger Street View transition upon completion
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
};

```

### 2. File Compatibility Review for Clear Voice AI

To ensure the files you shared function as **Server-Side AI Travel Tools**, we need to map them to the Gemini Tool Calling protocol.

* **`MapDisplay.tsx`**: Fully compatible. It already uses `requestAnimationFrame` and `moveCamera`, which are the exact "hooks" the AI will trigger. Your use of the `geometry` library allows for the precise spherical calculations needed for global flight paths.
* **`FlightSearchModal.tsx` & `HotelSearchModal.tsx**`: These should be treated as **Output Schemas**. Instead of the AI "clicking" buttons, it will generate a `tool_call` that populates these modals with live data from your **GRN Travel database**.
* **`constants.ts`**: This acts as your **Grounding Source**. We should move these coordinates into a YAML or Database structure so the AI can reference them dynamically when planning routes.

### 3. Strategy: Connecting 1.6M Hotels to Small Businesses

Your vision of a "Travel AltaVista" requires an **Orchestration Layer** that links global hotel data with local small business tools.

| Role | Tool Integration |
| --- | --- |
| **Global Agent** | Uses `search_flights` and `Google Hotels` (via GRN/LiteAPI) to get the user to the city. |
| **Local Agent** | Once "landed," the AI triggers `search_local_business` to highlight the small businesses you've featured. |
| **Visual Bridge** | The `animateNavigation` tool physically moves the user from the global hotel to the local business front door in **Street View**. |

### 4. Why This Matters

By providing **Visual Proof of Reliability** (seeing the plane land at the exact airport, seeing the street view of the hotel), you build the **Trust** necessary for users to authorize the AI to book on their behalf. You aren't just selling a trip; you're providing a continuous thread from **Intent** (wanting a trip) to **Identity** (their preferences) to **Execution** (the booking).

**Ill help you define the `search_grn_hotels` function declaration so the AI can start pulling real-time availability from your 1.6M hotel database**