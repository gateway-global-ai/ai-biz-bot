/**
 * Pitch Generation Utilities
 * 
 * Tools for generating AI-powered pitches for small businesses
 * using Google Places API data and review mining.
 */

import axios from 'axios';
import { getGooglePlaceDetails, getHotelReviewsPaginated } from '../mcp-hotels-logic.js';

/**
 * Extract Place ID from Google Maps URL
 */
export async function urlToPlaceId(mapUrl: string): Promise<string | null> {
  try {
    // Check for standard Place ID embedded in URL
    const placeIdRegex = /place\/([^\/]+)/;
    const match = mapUrl.match(placeIdRegex);
    
    if (match && match[1].startsWith('ChI')) {
      return match[1];
    }

    // Resolve Shortened Links
    if (mapUrl.includes('goo.gl') || mapUrl.includes('maps.app.goo.gl')) {
      const response = await axios.get(mapUrl, { maxRedirects: 5 });
      return urlToPlaceId(response.request.res.responseUrl);
    }

    // Fallback: Extract name and search via API
    const nameRegex = /maps\/place\/([^/]+)/;
    const nameMatch = mapUrl.match(nameRegex);
    const query = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : null;

    if (query) {
      const { getServerMapsApiKey } = await import("../config/mapsApiKey");
      const apiKey = getServerMapsApiKey();
      if (!apiKey) {
        throw new Error('Google Maps/Places API key not configured (set GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)');
      }

      const searchResponse = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        { textQuery: query },
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id',
          },
        }
      );
      return searchResponse.data.places?.[0]?.id || null;
    }

    return null;
  } catch (error: any) {
    console.error('[PitchGeneration] URL Resolution Error:', error.message);
    return null;
  }
}

/**
 * Gather business data from Google Places for pitch generation
 */
export async function gatherBusinessData(placeId: string): Promise<string> {
  try {
    // Fetch deep place details
    const googleData = await getGooglePlaceDetails(placeId, {
      fields: 'displayName,editorialSummary,websiteUri,regularOpeningHours,types',
    });

    // Fetch top reviews
    const reviewData = await getHotelReviewsPaginated(placeId, {
      maxReviews: 20,
      sortBy: 'qualityScore',
    });

    // Format as clean string for Gemini Prompt
    return `
BUSINESS NAME: ${googleData.displayName || 'N/A'}
WEBSITE DATA: ${googleData.websiteUri || 'No website provided'}
SUMMARY: ${googleData.editorialSummary || 'No summary available'}
TYPES: ${JSON.stringify(googleData.types || [])}

TOP REVIEWS:
${reviewData.reviews?.map((r: any) => `- [${r.rating} stars] ${r.snippet || r.text || ''}`).join('\n') || 'No reviews available'}
`;
  } catch (error: any) {
    console.error('[PitchGeneration] Error gathering data:', error.message);
    throw error;
  }
}

/**
 * Pitch Generation Prompt Template
 * 
 * Use this prompt with Gemini to generate ai_hook, ai_story, ai_tags, and ai_trigger_conditions
 */
export const PITCH_GENERATION_PROMPT = `### ROLE
You are an elite Digital Marketing Strategist and Creative Copywriter. Your mission is to transform raw business data into high-converting "Concierge Pitches" for a multimodal AI assistant.

### INPUT DATA
{INPUT_DATA}

### TASK
Analyze the inputs to identify the business's "Authentic Soul"—the specific things locals love that a corporate chain cannot replicate. Generate the following four fields for the database:

#### 1. ai_hook (The Proactive Intro)
- **Constraint**: Max 120 characters.
- **Goal**: A punchy, auditory-first sentence the AI speaks when a user is nearby or searching.
- **Style**: Avoid generic praise (e.g., "Great food"). Use specific sensory or social proof (e.g., "The only spot in Milan where you can eat handmade pasta while overlooking the 1st-century Arena.")

#### 2. ai_story (The Narrative Depth)
- **Constraint**: 2-3 short paragraphs in Markdown.
- **Goal**: Build an emotional connection.
- **Content**: Include the origin story (e.g., "Founded in 1924"), a unique tradition or "secret sauce," and a summary of the most common praise found in the reviews. Use a sophisticated yet warm tone.

#### 3. ai_tags (The Reasoning Logic)
- **Format**: JSON array of strings.
- **Goal**: Enable the AI to "reason" why it is recommending this.
- **Examples**: ["Roofbar", "Authentic", "FamilyOwned", "Historic", "PetFriendly", "LateNightDining"]

#### 4. ai_trigger_conditions (The Decision Engine)
- **Format**: JSON object.
- **Goal**: List keywords or user intents that should prioritize this business.
- **Example**: {"intents": ["local_culture", "romantic_view", "hidden_gem"], "keywords": ["authentic", "handmade", "history"]}

### OUTPUT FORMAT
Provide the final result as a clean JSON object ready for SQL insertion:
{
  "ai_hook": "...",
  "ai_story": "...",
  "ai_tags": [...],
  "ai_trigger_conditions": {...}
}`;

/**
 * Generate pitch using Gemini API
 */
export async function generatePitchWithGemini(businessData: string): Promise<{
  ai_hook: string;
  ai_story: string;
  ai_tags: string[];
  ai_trigger_conditions: Record<string, any>;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = PITCH_GENERATION_PROMPT.replace('{INPUT_DATA}', businessData);

  try {
    if (!process.env.GEMINI_MODEL_FALLBACK) console.error('[GOVERNANCE] GEMINI_MODEL_FALLBACK not set in Doppler');
    const textModel = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No valid JSON found in Gemini response');
  } catch (error: any) {
    console.error('[PitchGeneration] Gemini API error:', error.message);
    throw error;
  }
}
