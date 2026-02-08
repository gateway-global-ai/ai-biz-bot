# Demo Enrichment & Research Pipeline

## Primary Goal

**Learn the customer’s business so well that when they try the AI agent (voice or chat), they are blown away.**  
Reviews, Google Places, and (if present) their website tell the story. If the agent clearly knows more about their business and area than they expect, the owner is impressed and more likely to sign up.

## Our Pipeline (After OTP Verification)

Enrichment runs in **POST /api/demo/verify-and-enrich** and uses:

1. **Reviews** – Last 5 (or 5 most relevant) from Google Places. Fed into the model for summary and SWOT.
2. **Google Places** – Name, address, type, rating, review count, phone, website. Stored and passed to the model.
3. **Website** – If URL is present, we fetch the page, strip HTML, and use the first ~2,500 characters as context so the bot can reference services, offerings, and tone.
4. **1-mile competitor context** – When we have lat/lng and business type:
   - **Counts** – Same-category businesses within 1 mile; how many are 4–5★ vs below 3★ (Area Insights API).
   - **Examples** – Nearby search returns places with ratings; we take the **highest-rated** and **lowest-rated** (excluding the business itself) so the model can reason about “what works” and “what doesn’t” in the area.
5. **SWOT** – Generated **after** the above information is collected. The model produces strengths, weaknesses, opportunities, and threats using reviews, website excerpt, and competitor context.

6. **Vibe check + DISC** – The same model run analyzes the **tone/vibe** of the business from the reviews (e.g. friendly, professional, quirky, luxury, casual, family-oriented) and produces a **DISC profile** (Dominance, Influence, Steadiness, Conscientiousness, each 0–100) tailored to that vibe and to the **role** (website/voice concierge). That profile is baked into the system prompt so the agent’s personality matches the business—e.g. cozy cafe → higher I and S; law firm → higher D and C. The owner gets a bot that not only knows the business but *sounds* like it.

7. **SerpAPI (optional)** – When **SERPAPI_API_KEY** is set and we have a **place_id**, we call SerpAPI’s **Google Maps Reviews** engine with a configurable **`num`** (reviews per request; default 20, env **SERPAPI_NUM_REVIEWS**). The more reviews we fetch, the more the model knows about the business—and the more direct and accurate the SWOT and vibe can be. We use: **place_info** (title, address, rating, review count, type), **topics** (keyword + mention counts) as “signature items,” and **reviews** (snippet, rating, details like meal_type, price_per_person, food/service/atmosphere). When SerpAPI is used, up to **20** of those review snippets are sent to Gemini for summary/SWOT/vibe (vs. 5 when using only Google Places). Pagination (**next_page_token**) is supported in the fetcher if you want to add a second page of reviews later.

All of this is summarized into a **system prompt override** for the website chat/voice agent so it sounds knowledgeable about the business, the area, and the local market, and matches the business’s vibe and DISC-tailored personality.

## Implementation Notes

- **Enrichment service:** `server/services/demo-enrichment.ts`  
  - `runDemoEnrichment()` – builds summary, **vibe summary**, **suggested DISC profile**, SWOT, competitor summary, optional website excerpt, and (when **SERPAPI_API_KEY** + place_id exist) **SerpAPI reviews + topics** via `server/services/serpapi-reviews.ts`. Calls Gemini once (summary + vibe + disc + SWOT; prompt includes topics when from SerpAPI) and (when available) `getCompetitorCounts` and `fetchNearbyPlacesWithRatings` from `server/mcp/placesAggregate.ts`. The system prompt override includes personality (vibe + DISC) and, when present, “Popular items customers mention” from SerpAPI topics.
- **SerpAPI (optional):** `server/services/serpapi-reviews.ts` – `fetchSerpApiReviews(placeId)` calls `https://serpapi.com/search?engine=google_maps_reviews&place_id=...`. Returns place_info, topics (keyword + mentions), and reviews (snippet, rating, details). Used only when `SERPAPI_API_KEY` is set and enrichment receives a place_id (e.g. from demo lead).
- **Places helpers:** `server/mcp/placesAggregate.ts`  
  - `getCompetitorCounts(lat, lng, primaryType, radiusMiles)` – competitor counts in radius.  
  - `fetchNearbyPlacesWithRatings(lat, lng, primaryType, radiusMiles)` – nearby places with ratings for top/bottom examples.
- **Geometry** – The client sends `placeData.geometry` (lat/lng) when the user selects a place; verify-and-enrich passes it into enrichment so 1-mile competitor logic can run.

## Comparing With “Kimi Researcher” (Autopilot Research)

Kimi has a **researcher** that can run similar research on autopilot (business + area + competition). To compare:

1. **Summarize this pipeline** – One paragraph: we use reviews, Places, optional website crawl, 1-mile competitor counts + highest/lowest rated examples, then SWOT, and bake it into the agent’s system prompt.
2. **Run it by the model** – Ask Kimi (or another model) to perform equivalent research for a given business (name, address, type) and output a summary + SWOT + competitive context.
3. **Compare** – Contrast structure, depth, and usefulness of our automated pipeline vs. the model’s ad-hoc research. Use that to refine prompts, add fields, or add a “research pass” that mirrors what the researcher does.

This doc is the reference for what “our side” does so the comparison is apples-to-apples.
