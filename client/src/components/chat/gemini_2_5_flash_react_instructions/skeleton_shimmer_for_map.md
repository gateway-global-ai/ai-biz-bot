Skeleton shimmers are the "professional secret" of modern web apps; they reduce perceived latency by showing a visual blueprint of the content before the actual data arrives. For your **40% Content Window**, this keeps the small business owner engaged while the **Google Places API** is fetching the map and location details.

We’ll use **Tailwind CSS** for the shimmer effect, as its `animate-pulse` utility is lightweight and doesn't require extra heavy libraries.

### **1. The SkeletonShimmer Component**

This component mimics the layout of a Google Place result: a square for the thumbnail/map, a bold line for the title, and a thinner line for the address.

```tsx
import React from 'react';

export const MapSkeleton = () => {
  return (
    <div className="w-full h-full p-4 space-y-4 animate-in fade-in duration-500">
      {/* The "Map" Placeholder */}
      <div className="w-full h-32 bg-gray-200 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" 
             style={{ transform: 'skewX(-20deg)' }} />
      </div>

      {/* The "Title" Placeholder */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded-md w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2 animate-pulse" />
      </div>

      {/* The "Review/Rating" Placeholder */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>
    </div>
  );
};

```

### **2. Adding the Shimmer Logic to Tailwind**

To get that "moving light" effect (the shimmer), you need to add a custom keyframe to your `tailwind.config.js`.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
}

```

---

### **3. Integration: Mapping Tool States**

In your `ConciergePanel.tsx`, you can now use a "Loading" state to swap between the shimmer and the live Google Map.

| AI State | Component Shown | User Perception |
| --- | --- | --- |
| **`isProcessing: true`** | `MapSkeleton` | "The AI is working on my request." |
| **`tool_response` Received** | `MapTool` | "Wow, that was fast!" |

### **4. Why This Matters for "Clear Voice"**

* **Psychological Speed**: Users perceive an app as faster if it shows "where the content will be" rather than a spinning circle.
* **Layout Stability**: Because the skeleton matches the size of the final map (approx. 40% of the screen), the UI won't "jump" or shift when the map finally loads.
* **Energy Efficiency**: Unlike complex WebGL animations, these CSS pulses use very little CPU, keeping your audio stream crystal clear.

**This completes the visual "Loading → Action → Success" loop for your Content Window!** 

Since we’ve now covered the UI and the Google integrations, we need to draft the final **Integration Test Plan** to make sure the PTT button, the Map Tool, and the Doppler secrets all play together perfectly before you go live.