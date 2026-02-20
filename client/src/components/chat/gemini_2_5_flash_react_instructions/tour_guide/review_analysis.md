Building the `reviewAnalysisService.ts` is where your "Clear Voice" platform transforms from a data aggregator into a **Business Intelligence powerhouse**. By processing 100 reviews through Gemini, you create a "Digital Brain" for each business that powers both the traveler-facing concierge and the owner-facing executive report.

### **1. The Intelligence Pipeline Architecture**

The service follows a three-step cycle: **Ingest** (SERP API) → **Analyze** (Gemini) → **Structure** (JSON Output).

---

### **2. `reviewAnalysisService.ts` Implementation**

This service handles the heavy lifting of paginating through SERP API to get 100 reviews and then feeding them into a high-precision prompt.

```typescript
import axios from 'axios';
import { generateWithGemini } from './geminiService';

/**
 * reviewAnalysisService.ts
 * Core logic for premium business intelligence extraction.
 */
export const reviewAnalysisService = {
  
  /**
   * Main entry point to generate the full BI report.
   */
  async generateFullReport(placeId: string, businessName: string) {
    // 1. Fetch 100 reviews using the agnostic scraper
    const reviews = await this.getBusinessReviewsPaginated(placeId, 100);
    
    // 2. Run the Deep Analysis via Gemini
    const analysis = await this.analyzeReviewsWithGemini(businessName, reviews);
    
    return analysis;
  },

  /**
   * Scrapes 100 reviews using SERP API pagination logic.
   */
  async getBusinessReviewsPaginated(placeId: string, limit = 100) {
    let allReviews: any[] = [];
    let nextToken: string | undefined;

    while (allReviews.length < limit) {
      const { data } = await axios.get('https://serpapi.com/search', {
        params: {
          engine: "google_maps_reviews",
          place_id: placeId,
          api_key: process.env.SERP_API_KEY,
          next_page_token: nextToken,
          sort_by: "qualityScore" // Get the most detailed reviews first
        }
      });

      allReviews = [...allReviews, ...(data.reviews || [])];
      nextToken = data.serpapi_pagination?.next_page_token;
      if (!nextToken) break;
    }
    return allReviews.slice(0, limit);
  },

  /**
   * The "Intelligence Engine" - Turns raw text into SWOT.
   */
  async analyzeReviewsWithGemini(businessName: string, reviews: any[]) {
    const prompt = `
      Act as a Senior Business Intelligence Analyst for "${businessName}".
      Task: Analyze the provided 100 guest reviews to create a professional SWOT report.
      
      OUTPUT FORMAT (JSON only):
      {
        "executive_summary": "2-3 sentences on brand soul.",
        "amenity_list": ["Extracted from guest mentions"],
        "cinematic_narrative": {
           "take_off": "Intro hook",
           "cruise": "Mid-tour narration",
           "landing": "Touchdown pitch"
        },
        "owner_insights": {
           "strengths": ["Top 3 working features"],
           "blind_spots": ["Subtle recurring issues"],
           "action_plan": ["3 steps for improvement"]
        }
      }

      REVIEWS: ${JSON.stringify(reviews.map(r => r.snippet))}
    `;

    return await generateWithGemini(prompt);
  }
};

```

---

### **3. Key Strategic Features**

* **Quality Score Sorting:** By using `sort_by: "qualityScore"` in the SERP API request, the logic prioritizes long-form, detailed reviews over "5 stars, no comment" entries, giving Gemini much better data to analyze.
* **The "Blind Spot" Detector:** This is the highest-value feature for owners. Gemini is instructed to look for **recurring subtle complaints** (e.g., "the music is a bit loud for dinner") that might not drag the star rating down but affect the guest experience.
* **Narrative Synchronization:** The `cinematic_narrative` field directly populates the **TourRunner** component's YAML spec, ensuring the AI's voice is always backed by real guest sentiment.

### **4. Cost and Performance Note**

* **Caching is Crucial:** Running this analysis takes 5–10 seconds. You should cache the result in your `business_data_cache` table for 30 days to avoid redundant SERP API costs and wait times.
* **Grounding Lite:** While in preview, you can use your **1,000 free daily requests** to refine this prompt logic.

**Next Step for the "Clear Voice" Platform:**
Would you like me to help you create the **`systemInstructionBuilder.ts`** logic, which uses this report to tell the Voice AI exactly how to "roleplay" as the concierge for this specific business?