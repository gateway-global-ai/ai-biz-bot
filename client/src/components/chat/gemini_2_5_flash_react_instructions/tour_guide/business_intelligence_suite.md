To implement this, we'll evolve your review logic into a **General Business Intelligence Engine**. This involves renaming your core function to be platform-agnostic, using **SERP API** for deep data retrieval, and creating a specialized **Gemini Analysis Prompt** for your premium "Executive Report" feature.

### **1. The Agnostic Review Function**

We'll rename `getHotelReviewsPaginated` to `getBusinessReviewsPaginated`. This function will now accept any `placeId` (restaurant, hotel, boutique) and return a unified review object.

```javascript
/**
 * Agnostic Business Review Fetcher (SERP API)
 * Fetches up to 100 reviews for any business type.
 */
export async function getBusinessReviewsPaginated(placeId, maxReviews = 100) {
  let allReviews = [];
  let nextPageToken = null;

  // SERP API loop to gather deep review data
  while (allReviews.length < maxReviews) {
    const params = {
      engine: "google_maps_reviews",
      place_id: placeId,
      api_key: process.env.SERP_API_KEY,
      next_page_token: nextPageToken
    };

    const response = await axios.get('https://serpapi.com/search', { params });
    const { reviews, next_page_token } = response.data;

    allReviews = [...allReviews, ...reviews];
    nextPageToken = next_page_token;

    if (!nextPageToken || allReviews.length >= maxReviews) break;
  }

  return allReviews.slice(0, maxReviews);
}

```

---

### **2. The Premium "Executive Report" Generator**

This is the core of your new feature. It feeds the 100 reviews into Gemini to generate a professional SWOT analysis and a cinematic narrative script.

```javascript
/**
 * Generates the Premium Business Intelligence Report.
 * deliverables: Summary, Amenities, Cinematic Narrative, and SWOT for Owners.
 */
export async function generatePremiumBusinessReport(placeName, reviews) {
  const prompt = `
    You are an elite Business Consultant and Creative Director. 
    Analyze these 100 reviews for "${placeName}" and provide a professional report in JSON format.
    
    REQUIRED FIELDS:
    1. executive_summary: A 2-paragraph overview of the brand "soul" and market position.
    2. amenity_list: A list of the top 10 features guests actually mention.
    3. cinematic_narrative: A 3-stop script for a 3D map tour (take-off, cruise, landing).
    4. owner_insights: 
       - strengths: What's working (top 3 themes).
       - blind_spots: Recurring subtle complaints to address.
       - action_plan: 3 specific steps to increase 5-star review frequency.
    
    REVIEWS DATA: ${JSON.stringify(reviews)}
  `;

  const report = await generateWithGemini(prompt);
  return JSON.parse(report);
}

```

---

### **3. Executive Summary UI (40% Window)**

To present this to owners, we’ll use a structured, scannable dashboard in your **Concierge Panel**.

| Section | UI Component | Visual Goal |
| --- | --- | --- |
| **Brand Soul** | Hero Typography | Immediate emotional resonance. |
| **Amenity Grid** | Icon-based Badge List | Fast verification of business features. |
| **Owner SWOT** | Red/Green Growth Cards | "At-a-glance" actionable items. |
| **Tour Preview** | Mini Map Playback | Show the owner how their "Cinematic Narrative" looks. |

### **Strategic Advantage: The "Review-to-Revenue" Cycle**

* **The Pitch**: You don't just sell an "AI map"—you sell a **Business Intelligence Suite**.
* **The Conversion**: You can send a "Mini-Report" to any local business as a cold-outreach tool. Once they see you've identified their "3rd-floor Wi-Fi issue" from 100 reviews, they'll know your platform is the real deal.
* **The Cinematic Lock-in**: By generating the **TourRunner** script directly from the reviews, the tour narrative is 100% authentic to what real customers love.

**We will also create a React "DashboardCard" component for the Concierge Panel to display this SWOT report to business owners?**

To move from raw business intelligence to a client-facing product, the **DashboardCard** needs to balance high-level "at-a-glance" stats for mobile users with deep "strategic" data for desktop users.

The following React component uses **Tailwind CSS** for a responsive, "mobile-first" layout. It features a vertical stack for small screens and a classic 2x2 grid for desktops, while including a subtle "Desktop Recommended" banner for business owners.

### **The DashboardCard Component**

```tsx
import React from 'react';
import { TrendingUp, AlertCircle, Lightbulb, ShieldAlert, Monitor } from 'lucide-react';

interface SwotSection {
  title: string;
  items: string[];
  icon: React.ReactNode;
  colorClass: string;
}

export const DashboardCard: React.FC<{ data: any }> = ({ data }) => {
  const sections: SwotSection[] = [
    { title: 'Strengths', items: data.owner_insights.strengths, icon: <TrendingUp />, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { title: 'Weaknesses', items: data.owner_insights.blind_spots, icon: <AlertCircle />, colorClass: 'bg-amber-50 text-amber-700 border-amber-100' },
    { title: 'Opportunities', items: data.owner_insights.action_plan, icon: <Lightbulb />, colorClass: 'bg-blue-50 text-blue-700 border-blue-100' },
    { title: 'Threats', items: ['Market Volatility', 'New Local Competitor'], icon: <ShieldAlert />, colorClass: 'bg-rose-50 text-rose-700 border-rose-100' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* 1. Desktop Recommendation Banner (Visible on Mobile Only) */}
      <div className="md:hidden flex items-center gap-3 p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600">
        <Monitor size={16} />
        <span>For detailed reporting and deeper insights, we recommend using a <b>Desktop display</b>.</span>
      </div>

      {/* 2. Executive Summary Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-2">Executive Brand Soul</h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {data.executive_summary}
        </p>
      </div>

      {/* 3. SWOT Matrix (Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div key={section.title} className={`p-5 rounded-xl border ${section.colorClass} transition-all hover:shadow-md`}>
            <div className="flex items-center gap-2 mb-3">
              {section.icon}
              <h3 className="font-bold uppercase tracking-wider text-sm">{section.title}</h3>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug">
                  <span className="opacity-50">•</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

```

### **Design Principles for Your "Executive View"**

* **Progressive Disclosure:** On mobile, we prioritize the **Executive Summary** and high-level **SWOT bullets**. On desktop, the 2x2 grid allows the owner to see the "Internal vs. External" relationships between quadrants at a glance.
* **Touch-Friendly Navigation:** Bullet points are spaced out with `space-y-2` to ensure they are readable even on smaller mobile screens under direct sunlight (common for local business owners on the move).
* **Visual Hierarchy:** We use **Emerald** for Strengths and **Rose** for Threats to trigger immediate emotional recognition of "Good" vs. "Needs Attention."

### **Why the "Desktop Recommendation" Matters**

By explicitly suggesting a larger screen for the "Detailed Report," you set a professional expectation. It signals to the business owner that the data you are providing is **High-Resolution Intelligence**—something worth sitting down to study rather than just a casual notification.

**We will also integrate the "Interactive Map Tour" preview button directly into this DashboardCard so owners can see their cinematic narrative in action**

To integrate the **"Interactive Map Tour"** preview button into your **DashboardCard**, we'll create a dedicated UI action that bridges your React state with the `TourRunner` component. This button acts as the "Play" trigger for the cinematic experience we've built.

### **DashboardCard with Interactive Tour Integration**

This updated version of the `DashboardCard` includes a primary action button that triggers the tour. It also handles the **Conditional Rendering** to ensure the tour logic only runs when the owner clicks "Start Tour."

```tsx
import React, { useState } from 'react';
import { Play, Map as MapIcon, Monitor, TrendingUp, AlertCircle, Lightbulb, ShieldAlert } from 'lucide-react';
import TourRunner from './TourRunner'; // The component we built earlier

export const DashboardCard: React.FC<{ data: any }> = ({ data }) => {
  const [isTourActive, setIsTourActive] = useState(false);

  // Helper to handle AI voice triggers
  const handleTriggerSpeech = (text: string) => {
    console.log("AI Narrating:", text);
    // Logic to push text to your Gemini Voice WebSocket
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* 1. Interactive Tour Preview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-8 shadow-2xl border border-slate-800">
        <div className="relative z-10 space-y-4 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <MapIcon size={14} />
            Experience Preview
          </div>
          <h2 className="text-3xl font-bold">Your Cinematic Concierge Tour</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            See exactly how our AI presents your business to travelers. This 60-second tour demonstrates the 3D touchdown and local narration hooks generated from your reviews.
          </p>
          
          <button 
            onClick={() => setIsTourActive(true)}
            disabled={isTourActive}
            className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" />
            {isTourActive ? 'Tour in Progress...' : 'Start Interactive Tour'}
          </button>
        </div>

        {/* Decorative background visual */}
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
      </div>

      {/* 2. SWOT Matrix (The data section from previous step) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... (Strengths, Weaknesses, etc. from previous code) */}
      </div>

      {/* 3. The Tour Runner Logic (Hidden) */}
      {isTourActive && (
        <TourRunner 
          yamlUrl={`/api/tours/${data.partner_id}`} 
          onTriggerSpeech={handleTriggerSpeech}
          onTourComplete={() => setIsTourActive(false)}
        />
      )}
    </div>
  );
};

```

---

### **Implementation Details for the "WOW" Factor**

* **State Control**: The `isTourActive` state ensures that the `TourRunner` (and its heavy map animations) only initializes when needed.
* **Visual Feedback**: The button changes to "Tour in Progress" and dims out to prevent double-clicking while the camera is in motion.
* **Narrative Hand-off**: The `handleTriggerSpeech` prop is the "hand-off" point where the map tells your AI exactly what to say based on the YAML script we generated from the reviews.

### **Next Step: Google Place Details Integration**

Now that the UI for the tour is ready, we can move on to the **Google Place Details Integration**. This will allow the **Concierge Panel** to automatically display rich business data (photos, star ratings, and "Open Now" status) the moment the camera "touches down" at a location.

**Next, we will build the `PlaceDetailsPanel` component that listens for the touchdown event to update its data?**