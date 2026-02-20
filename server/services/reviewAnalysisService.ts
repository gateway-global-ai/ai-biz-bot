/**
 * Review Analysis Service
 *
 * Core logic for premium business intelligence extraction.
 * Spec: client/src/components/chat/gemini_2_5_flash_react_instructions/tour_guide/review_analysis.md
 *
 * Pipeline: Ingest (SERP API) → Analyze (Gemini) → Structure (JSON Output).
 * Business amenities come from this pipeline only; GMP data is masked to reduce cost and does not include amenities.
 */

import axios from 'axios';
import { generateJsonWithGemini } from './geminiService.js';

export interface ReviewAnalysisResult {
  executive_summary: string;
  amenity_list: string[];
  cinematic_narrative: {
    take_off: string;
    cruise: string;
    landing: string;
  };
  owner_insights: {
    strengths: string[];
    blind_spots: string[];
    action_plan: string[];
  };
}

/**
 * Scrapes reviews using SERP API pagination with qualityScore sort.
 */
export async function getBusinessReviewsPaginated(
  placeId: string,
  limit = 100
): Promise<Array<{ snippet?: string; [key: string]: unknown }>> {
  const apiKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  if (!apiKey) {
    throw new Error('SERP API key not configured (set SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY)');
  }

  let allReviews: Array<{ snippet?: string; [key: string]: unknown }> = [];
  let nextToken: string | undefined;

  while (allReviews.length < limit) {
    const params: Record<string, string> = {
      engine: 'google_maps_reviews',
      place_id: placeId,
      api_key: apiKey,
      sort_by: 'qualityScore',
    };
    if (nextToken) {
      params.next_page_token = nextToken;
    }

    const { data } = await axios.get<{
      reviews?: Array<{ snippet?: string; [key: string]: unknown }>;
      serpapi_pagination?: { next_page_token?: string };
    }>('https://serpapi.com/search', { params });

    allReviews = [...allReviews, ...(data.reviews || [])];
    nextToken = data.serpapi_pagination?.next_page_token;
    if (!nextToken) break;
  }

  return allReviews.slice(0, limit);
}

/**
 * Analyzes reviews with Gemini and returns structured SWOT report.
 */
export async function analyzeReviewsWithGemini(
  businessName: string,
  reviews: Array<{ snippet?: string; [key: string]: unknown }>
): Promise<ReviewAnalysisResult> {
  const snippets = reviews.map((r) => r.snippet ?? '').filter(Boolean);

  const prompt = `
Act as a Senior Business Intelligence Analyst for "${businessName}".
Task: Analyze the provided guest reviews to create a professional SWOT report.

OUTPUT FORMAT (JSON only, no markdown):
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

REVIEWS: ${JSON.stringify(snippets)}
`;

  return generateJsonWithGemini<ReviewAnalysisResult>(prompt);
}

/**
 * Main entry point: fetch up to 100 reviews and run full BI analysis.
 * Callers should cache the result (e.g. 30 days) to avoid redundant SERP cost and latency.
 */
export async function generateFullReport(
  placeId: string,
  businessName: string
): Promise<ReviewAnalysisResult> {
  const reviews = await getBusinessReviewsPaginated(placeId, 100);
  const analysis = await analyzeReviewsWithGemini(businessName, reviews);
  return analysis;
}
