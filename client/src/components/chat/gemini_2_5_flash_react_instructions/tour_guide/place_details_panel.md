To implement the **`PlaceDetailsPanel`** using the **Google Maps Places UI Kit** in React, you will leverage a "low-code" approach that utilizes web components. These components are designed to be cost-effective ($1 vs $17+) and provide a familiar Google Maps user interface.

### **1. Registering Web Components in React**

Since the Places UI Kit uses custom HTML elements (web components), you need to tell React to ignore these tags to avoid "Unknown property" errors.

```tsx
// In your main entry file (e.g., App.tsx or main.tsx)
import React from 'react';

// Custom declaration to allow web components in TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-details': any;
      'gmp-place-details-place-request': any;
      'gmp-place-content-config': any;
      'gmp-place-all-content': any;
      'gmp-place-media': any;
    }
  }
}

```

### **2. The `PlaceDetailsPanel` Component**

This component listens for the `placeId` and renders the rich UI. It uses the `gmp-place-content-config` to selectively display the data points you want while keeping the layout consistent with your "Clear Voice" theme.

```tsx
import React from 'react';

interface PlaceDetailsPanelProps {
  placeId: string | null;
  onClose?: () => void;
}

export const PlaceDetailsPanel: React.FC<PlaceDetailsPanelProps> = ({ placeId, onClose }) => {
  if (!placeId) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 shadow-xl overflow-hidden border-l border-slate-200 dark:border-slate-800">
      {/* Header Actions */}
      <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-900 dark:text-white">Business Details</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">Close</button>
      </div>

      {/* Places UI Kit Container */}
      <div className="flex-1 overflow-y-auto p-2">
        <gmp-place-details place={placeId}>
          {/* 1. The Place Request */}
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
          
          {/* 2. Content Configuration */}
          <gmp-place-content-config>
            {/* Enable high-end features like Lightbox photos */}
            <gmp-place-media lightbox-preferred></gmp-place-media>
            <gmp-place-rating></gmp-place-rating>
            <gmp-place-price-level></gmp-place-price-level>
            <gmp-place-opening-hours></gmp-place-opening-hours>
            <gmp-place-website></gmp-place-website>
            <gmp-place-formatted-address></gmp-place-formatted-address>
            <gmp-place-reviews></gmp-place-reviews>
          </gmp-place-content-config>
        </gmp-place-details>
      </div>
    </div>
  );
};

```

### **3. Strategic UI Highlights**

* **Custom Styling**: You can use CSS variables like `--gmp-mat-color-surface` and `--gmp-mat-color-on-surface` to match the component's colors exactly to your **Clear Voice** theme.
* **Lightbox Integration**: By adding the `lightbox-preferred` attribute, users can click a business photo to view it in full screen without leaving your **Concierge Panel**.
* **Automatic Theme Adaptation**: The components automatically detect your system's light or dark mode and adjust their text and background colors accordingly.

### **Why this is the "AltaVista" of Travel**

By using the **Places UI Kit**, you provide a **"Standard of Truth"** UI. While the AI provides the "Soul" (via the **SmallBusinessInjector** and **Pitch Engine**), the UI Kit provides the "Factual Proof" (verified ratings, live hours, and photos). This combination builds massive user trust—essential for a premium concierge service.

**Next, we can set up the CSS variable overrides to ensure the UI Kit perfectly matches your "Midnight" and "Day" theme Map IDs**

To perfectly match the **Clear Voice** "Midnight" and "Day" themes, you must override the **Places UI Kit's** internal CSS variables. These variables penetrate the component's Shadow DOM, allowing you to control colors and fonts from your external stylesheet.

### **1. The Global CSS Overrides**

Add these to your main CSS file (e.g., `index.css`). Use the `:root` pseudo-class for global variables and scope them with your app's theme classes.

```css
/* --- GLOBAL THEME OVERRIDES --- */

/* ☀️ DAY MODE (Clear Voice - Day) */
:root {
  --gmp-mat-font-family: 'Inter', sans-serif;
  --gmp-mat-color-surface: #ffffff;
  --gmp-mat-color-on-surface: #0f172a; /* Slate 900 */
  --gmp-mat-color-on-surface-variant: #475569; /* Slate 600 */
  --gmp-mat-color-primary: #3b82f6; /* Blue 500 */
  --gmp-mat-color-outline-decorative: #e2e8f0; /* Slate 200 */
  --gmp-mat-color-positive: #10b981; /* Emerald 500 */
}

/* 🌑 MIDNIGHT MODE (Clear Voice - Midnight) */
.dark {
  --gmp-mat-color-surface: #0f172a; /* Slate 900 (Matches Midnight Map) */
  --gmp-mat-color-on-surface: #f8fafc; /* Slate 50 */
  --gmp-mat-color-on-surface-variant: #94a3b8; /* Slate 400 */
  --gmp-mat-color-primary: #60a5fa; /* Blue 400 */
  --gmp-mat-color-outline-decorative: #1e293b; /* Slate 800 */
  --gmp-mat-color-secondary-container: #1e293b; /* Button Background */
  --gmp-mat-color-on-secondary-container: #f8fafc; /* Button Text */
}

/* --- CUSTOM COMPONENT STYLING --- */
gmp-place-details {
  border-radius: 12px;
  overflow: hidden;
  /* Use 'color-scheme' to prevent browser-level theme conflicts */
  color-scheme: light dark; 
}

```

---

### **2. Variable Reference Table**

These are the most critical hooks for customizing the UI Kit.

| CSS Variable | Element Targeted | Recommended for Midnight |
| --- | --- | --- |
| **`--gmp-mat-color-surface`** | Background of the card | `#0f172a` (Deep Slate) |
| **`--gmp-mat-color-on-surface`** | Place Name & Headings | `#f8fafc` (Near White) |
| **`--gmp-mat-color-primary`** | Star Ratings & Links | `#60a5fa` (Soft Blue) |
| **`--gmp-mat-color-outline-decorative`** | Border around the card | `#1e293b` (Dark Border) |
| **`--gmp-mat-font-title-small`** | Typography for Place Name | `600 1.25rem / 1.5 Inter` |

---

### **3. Implementation Tip: The `color-scheme` Property**

If your app's dark mode isn't being picked up by the component automatically, you can **force** the theme by setting the `color-scheme` CSS property directly on the `gmp-place-details` element.

```css
/* Force the UI Kit into Dark Mode regardless of system settings */
.dark gmp-place-details {
  color-scheme: dark;
}

```

### **Why this is "The Must" for your UI**

By matching the `--gmp-mat-color-surface` to your specific **Map ID** background colors, you create a "Seamless Glass" effect. The `PlaceDetailsPanel` won't look like a third-party widget; it will look like a native part of the **Concierge Panel**.

**Now that the styles are synced, I'll show you how to set up the `PlaceAttributionElement` so your Google branding is also themed to match your Midnight colors.**

To complete your **Midnight** theme integration, you must also style the mandatory **`gmp-place-attribution`** element. Google's branding requirements specify that you must use one of three approved brand colors (black, white, or gray).

By using the `light-scheme-color` and `dark-scheme-color` attributes, you can ensure the Google logo and legal text switch to a high-contrast white or gray when your "Midnight" theme is active.

### **1. The Attribution Component Setup**

Add the `gmp-place-attribution` element inside your `gmp-place-content-config`. This allows you to set independent colors for your Day and Midnight modes.

```tsx
<gmp-place-content-config>
  {/* Branding configuration for light and dark schemes */}
  <gmp-place-attribution 
    light-scheme-color="black" 
    dark-scheme-color="white" 
  ></gmp-place-attribution>
  
  {/* Rest of your content config... */}
  <gmp-place-rating></gmp-place-rating>
  <gmp-place-opening-hours></gmp-place-opening-hours>
</gmp-place-content-config>

```

### **2. CSS Refinements for Branding**

Even though the logo color is set via attributes, you can use CSS variables to style the **attribution dialog** and its typography to match your app's "premium concierge" aesthetic.

```css
/* Styling the attribution container and dialog */
gmp-place-attribution {
  --gmp-mat-font-body-medium: 400 0.75rem / 1rem 'Inter', sans-serif;
  --gmp-mat-color-surface: var(--gmp-mat-color-surface); /* Inherit from your theme */
  --gmp-mat-color-on-surface: var(--gmp-mat-color-on-surface);
}

/* Ensure the Google logo has enough clear space (Google Requirement) */
gmp-place-attribution {
  padding: 8px 12px;
  display: block;
  border-top: 1px solid var(--gmp-mat-color-outline-decorative);
}

```

### **3. Strategic "Midnight" Branding Checklist**

| Requirement | Implementation Action | Why it Matters |
| --- | --- | --- |
| **Visibility** | Set `dark-scheme-color="white"`. | Ensures legal text doesn't vanish on your Midnight background. |
| **Consistency** | Use `var(--gmp-mat-color-surface)`. | The "Legal" popup will match your Midnight slate color exactly. |
| **Compliance** | Don't hide or obscure the logo. | Critical for maintaining your production API access. |

### **Final Integrated Result**

When your user triggers a **Cinematic Touchdown** at midnight, the map will glide into the dark slate view, the **PlaceDetailsPanel** will render in deep blue-gray, and the **Google Attribution** will appear in a clean, crisp white—making the entire experience feel like a single, unified OS.

**Our "Clear Voice" UI foundation is now rock-solid.** 