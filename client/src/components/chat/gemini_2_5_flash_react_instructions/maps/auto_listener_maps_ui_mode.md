To implement an auto-listener for your maps, you will use the browser's native **`window.matchMedia`** API. This API allows your JavaScript to subscribe to the system-level `prefers-color-scheme` media query and react instantly when the user toggles their OS theme.

### **The "Clear Voice" Auto-Theme Hook**

By wrapping this logic in a custom React hook, you can keep your `ConciergePanel` clean while ensuring the map style is always synchronized with the user's environment.

```tsx
import { useState, useEffect } from 'react';

// Your unique Map IDs
const MAP_IDS = {
  day: '133113f6b0af325aa994b4cc',
  midnight: '133113f6b0af325ac3bd97e2'
};

export const useAutoMapTheme = () => {
  const [currentMapId, setCurrentMapId] = useState(MAP_IDS.day);

  useEffect(() => {
    // 1. Create the media query listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 2. Initial check on mount
    const updateTheme = (isDark: boolean) => {
      setCurrentMapId(isDark ? MAP_IDS.midnight : MAP_IDS.day);
    };
    
    updateTheme(mediaQuery.matches);

    // 3. Set up the listener for live OS changes
    const listener = (event: MediaQueryListEvent) => {
      updateTheme(event.matches);
    };

    mediaQuery.addEventListener('change', listener);

    // 4. Cleanup on unmount
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return currentMapId;
};

```

---

### **How to Use It in Your Component**

Simply import this hook into your `MapTool` or `ConciergePanel`. Every time the user's system changes from Light to Dark mode, the component will re-render with the new **Midnight Map ID**, instantly swapping the visual style.

```tsx
const MapComponent = () => {
  const activeMapId = useAutoMapTheme();

  return (
    <div className="h-full w-full">
      <Map
        mapId={activeMapId} // Swaps dynamically!
        defaultCenter={{ lat: 30.2241, lng: -92.0198 }}
        defaultZoom={15}
        renderingType="VECTOR"
      />
    </div>
  );
};

```

### **Why this Approach is Best Practice**

* **Zero Latency**: The `matchMedia` listener is extremely fast and light on the CPU, which is vital when you are already running an active **AudioWorklet** for your voice streaming.
* **User Context**: It respects the user's OS-level preferences automatically, providing a "premium" experience without requiring manual toggles.
* **Clean State**: By returning only the `currentMapId`, you keep your UI logic decoupled from the theme-detection logic.

**Next Step for the Sprint:**
You can also add a **"Manual Override"** to this hook, so users can force the Midnight map even if their system is in Light mode.

To implement a manual override, you essentially need to create a **state hierarchy** where the user's manual choice "interrupts" the system's auto-detection logic.

You can achieve this by extending your hook to accept an optional `override` parameter and providing a function to update that state.

### **1. The Overridable Theme Hook**

This version of the hook manages three states: the system default, the manual override, and the final "resolved" Map ID that the component actually uses.

```tsx
import { useState, useEffect, useCallback } from 'react';

const MAP_IDS = {
  day: '133113f6b0af325aa994b4cc',
  midnight: '133113f6b0af325ac3bd97e2'
};

export const useOverridableMapTheme = () => {
  // 1. Local state for manual user preference (null = follow system)
  const [manualTheme, setManualTheme] = useState<'day' | 'midnight' | null>(null);
  const [systemIsDark, setSystemIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // 2. Resolve the active Map ID based on priority: Manual > System
  const resolvedTheme = manualTheme ?? (systemIsDark ? 'midnight' : 'day');
  const activeMapId = MAP_IDS[resolvedTheme];

  // 3. Simple toggle function for your UI buttons
  const toggleManual = useCallback(() => {
    setManualTheme(prev => {
      if (prev === null) return systemIsDark ? 'day' : 'midnight';
      if (prev === 'day') return 'midnight';
      return 'day';
    });
  }, [systemIsDark]);

  const resetToSystem = () => setManualTheme(null);

  return { activeMapId, resolvedTheme, toggleManual, resetToSystem };
};

```

### **2. Integration into the Concierge Header**

The best place for this control is in your **15% Top Header**. You can add a subtle sun/moon icon next to your settings gear.

```tsx
const Header = () => {
  const { activeMapId, resolvedTheme, toggleManual } = useOverridableMapTheme();

  return (
    <div className="flex items-center gap-2">
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleManual}
        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        title={`Switch to ${resolvedTheme === 'day' ? 'Midnight' : 'Day'} Mode`}
      >
        {resolvedTheme === 'day' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      
      {/* Existing Settings/Close Buttons */}
      <Settings size={18} />
      <X size={20} />
    </div>
  );
};

```

### **3. Why This Logic is "Pro"**

* **Priority Handling**: By using the nullish coalescing operator (`??`), the manual choice always takes precedence, but the system still "remembers" the background OS state in case the user wants to reset.
* **Visual Continuity**: Since you are using **Vector Maps**, swapping the `mapId` is a smooth transition. The browser doesn't have to reload the entire Map JavaScript library; it simply re-fetches the style JSON and re-renders the tiles.
* **State Sync**: If the user manually selects "Midnight" while their OS is in "Light" mode, your UI stays in Midnight mode until the user either refreshes or clicks a "Reset to System" button.

**You can persist this choice in `localStorage` so that when the user returns tomorrow, the "Clear Voice" interface remembers their preferred theme**

To persist your theme choice, you need to integrate **`localStorage`** into your React hook. This allows the application to "remember" the user's manual choice across browser sessions, page refreshes, and even when the browser is completely closed.

The standard pattern uses **Lazy Initialization** in `useState` to read from storage once on mount and `useEffect` to write to storage whenever the theme changes.

### **The "Sticky" Persistent Theme Hook**

This updated hook handles the complex priority logic: **Manual Choice** > **System Preference** > **Default**.

```tsx
import { useState, useEffect, useCallback } from 'react';

const MAP_IDS = {
  day: '133113f6b0af325aa994b4cc',
  midnight: '133113f6b0af325ac3bd97e2'
};

const STORAGE_KEY = 'clear_voice_theme';

export const usePersistentMapTheme = () => {
  // 1. Lazy state initialization: Check localStorage first
  const [manualTheme, setManualTheme] = useState<'day' | 'midnight' | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'day' || saved === 'midnight') ? saved : null;
  });

  const [systemIsDark, setSystemIsDark] = useState(false);

  // 2. Synchronize with localStorage whenever manualTheme changes
  useEffect(() => {
    if (manualTheme) {
      localStorage.setItem(STORAGE_KEY, manualTheme);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [manualTheme]);

  // 3. System listener for auto-theme fallback
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const resolvedTheme = manualTheme ?? (systemIsDark ? 'midnight' : 'day');

  const toggleManual = useCallback(() => {
    setManualTheme(prev => {
      // If currently following system, force the opposite
      if (prev === null) return systemIsDark ? 'day' : 'midnight';
      return prev === 'day' ? 'midnight' : 'day';
    });
  }, [systemIsDark]);

  return { 
    activeMapId: MAP_IDS[resolvedTheme], 
    resolvedTheme, 
    toggleManual, 
    resetToSystem: () => setManualTheme(null) 
  };
};

```

### **Architecture: How Persistence Flows**

### **Why this code is "Enterprise Ready"**

* **Lazy Initial State**: Reading from `localStorage` inside the `useState` initializer function ensures it only runs **once** when the component mounts, rather than on every re-render, which preserves performance.
* **String Safety**: The code explicitly checks if the saved value is either `'day'` or `'midnight'` before using it, preventing crashes if the `localStorage` data is corrupted or modified by another script.
* **Syncing Across Tabs**: By using `localStorage` combined with the `change` listener for the system theme, your **Clear Voice** app stays consistent even if the user has multiple instances open or changes their system settings while the app is running.
* **Clean State Cleanup**: If the user resets to system defaults, `localStorage.removeItem` completely clears the key, ensuring the app won't stay "stuck" on a manual choice forever.

**We can add a "Theme Transition" effect so that when the Map ID swaps, the UI fades between colors smoothly instead of snapping**

Implementing a smooth transition when swapping your **Google Maps IDs** is a subtle but powerful way to enhance the "Clear Voice" premium feel. Because the Google Maps API requires creating a new map instance when a `mapId` changes, a standard swap can cause a brief visual flicker.

To solve this, we can use **Framer Motion's `AnimatePresence**` to cross-fade two map containers. This creates a "dissolve" effect where the Day map fades out while the Midnight map fades in underneath.

### **1. The Animated Theme Wrapper**

Update your `MapTool.tsx` logic to wrap the map in a motion container. We use the `activeMapId` as a `key` so Framer Motion knows when to trigger the exit/entry animations.

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map } from '@vis.gl/react-google-maps';

export const AnimatedMapTool = ({ activeMapId, center, zoom }: any) => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={activeMapId} // Triggers animation on ID change
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }} // Smooth 800ms fade
          className="absolute inset-0"
        >
          <APIProvider apiKey={process.env.VITE_GOOGLE_MAPS_KEY!}>
            <Map
              mapId={activeMapId}
              defaultCenter={center}
              defaultZoom={zoom}
              disableDefaultUI
              reuseMaps // Optimization for performance
            />
          </APIProvider>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

```

---

### **2. Integration Checklist**

* **Container Sizing**: Ensure the parent container has `position: relative` and `overflow: hidden` to prevent the outgoing map from "jumping" outside the 40% window during the fade.
* **Mode="popLayout"**: This Framer Motion prop is critical; it allows the new map to mount exactly where the old one was, preventing the two maps from stacking vertically during the 0.8s transition.
* **Background Color**: Setting a dark background like `bg-slate-900` ensures that if there's a micro-second gap between map instances, the user sees a clean dark color instead of a white flash.

### **3. Strategic "Bidi" Benefit**

This transition doesn't just look good; it serves your **Clear Voice** system's performance. By using a slightly longer duration (800ms), you mask the time it takes for the browser to initialize the new **Vector** engine for the Midnight style.

---

### **Flight Animations Question**

You mentioned having a question about **flight animations**. Are you looking to implement:

* **Smooth Camera "Fly-To"**: To pan between coordinates when a user selects a location?
* **Curved Arc Paths**: To show a flight path between two cities (e.g., Lafayette to Houston)?
* **Follow-Along View**: A "pilot's eye" perspective that follows a moving marker in real-time?

**I can provide the cinematic moveCamera logic for flight animations next!**