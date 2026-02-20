Since you now have your unique **Map IDs** for both Day and Midnight themes, you can control the map's appearance and data flow by dynamically switching these IDs in your `MapTool` component and feeding them structured data from your Gemini tool calls.

### **1. Programmatic Style Control (The Theme Switcher)**

Because you are using Vector maps, the **Map ID** is what determines the style. You can create a state in your `ConciergePanel` to toggle between these two IDs based on system settings or a manual toggle.

```tsx
// Inside your ConciergePanel or a Theme Provider
const MAP_IDS = {
  day: '133113f6b0af325aa994b4cc',
  midnight: '133113f6b0af325ac3bd97e2'
};

// Use this state to drive the MapTool
const [currentMapId, setCurrentMapId] = useState(MAP_IDS.day);

// Logic to toggle based on time or user preference
const toggleTheme = () => {
  setCurrentMapId(prev => prev === MAP_IDS.day ? MAP_IDS.midnight : MAP_IDS.day);
};

```

### **2. Linking in Data Sets**

To link your business data to the map, you need to structure your datasets as an array of **Marker Objects** that the `AdvancedMarker` component can consume.

#### **A. The Data Structure**

Your data should be normalized so it matches the parameters expected by your `search_local_business` tool.

| Field | Purpose |
| --- | --- |
| **`id`** | A unique string (like a Google Place ID) used for React keys and UI Kit lookups. |
| **`position`** | An object `{ lat, lng }` that places the marker precisely. |
| **`title`** | The business name displayed on hover or in the info window. |
| **`metadata`** | Custom fields like `phone`, `rating`, or `price_level` for your 40% window. |

#### **B. Feeding the Map from Gemini**

When Gemini executes a tool call, your server-side `placesHandler.ts` fetches this data and sends it to the frontend.

```typescript
// How the data arrives from your ToolRouter
const mapData = {
  center: { lat: 30.2241, lng: -92.0198 },
  zoom: 15,
  markers: [
    { id: 'place_01', title: 'Gateway Global HQ', position: { lat: 30.225, lng: -92.020 } },
    { id: 'place_02', title: 'Lafayette Branch', position: { lat: 30.223, lng: -92.018 } }
  ]
};

```

---

### **3. Advanced Programmatic Interaction**

With **Vector Maps**, you don't just "set" the center; you can manipulate the camera for a more cinematic experience.

* **Camera Control**: Use the `moveCamera` method to change `tilt` and `heading` dynamically when a user clicks a list item in your 40% window.
* **Marker Animations**: Because you are using **Advanced Markers**, you can drop pins with a "bounce" effect using CSS animations or GSAP, making the data feel interactive.
* **Filtering**: You can programmatically show/hide markers based on the AI's current conversation state (e.g., only showing "Open Now" locations).

### **4. Why This Integration is "Clear Voice" Optimized**

* **Consistency**: By using your custom **Map IDs**, the map colors will always match your UI's indigo/purple palette, regardless of whether it's Day or Midnight mode.
* **Efficiency**: Using the `Place ID` as your primary key allows you to use the **Places UI Kit** to show rich details (photos, reviews) without having to store that data yourself.

**I'll show you how to set up the "Auto-Theme" listener so the map automatically switches to your Midnight ID (133113f6b0af325ac3bd97e2) when the user's OS enters Dark Mode**