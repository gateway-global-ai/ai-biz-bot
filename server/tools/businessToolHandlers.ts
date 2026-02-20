/**
 * Business tool handlers for Gemini voice tool calls.
 * Used by geminiVoice.ts when Gemini invokes get_business_details, get_business_reviews, get_business_intelligence, get_place_ui_data.
 */

import { getPlaceDetails } from './placesHandler.js';
import {
  getBusinessReviewsPaginated,
  generateFullReport,
} from '../services/reviewAnalysisService.js';

export async function handleGetBusinessDetails(args: {
  place_id: string;
}): Promise<unknown> {
  const placeId = args.place_id;
  if (!placeId) throw new Error('place_id is required');
  return getPlaceDetails(placeId);
}

export async function handleGetBusinessReviews(args: {
  place_id: string;
  max_reviews?: number;
}): Promise<unknown> {
  const placeId = args.place_id;
  const maxReviews = Math.min(100, Math.max(1, args.max_reviews ?? 20));
  if (!placeId) throw new Error('place_id is required');
  const reviews = await getBusinessReviewsPaginated(placeId, maxReviews);
  return {
    count: reviews.length,
    reviews: reviews.map((r) => ({ snippet: r.snippet })),
  };
}

export async function handleGetBusinessIntelligence(args: {
  place_id: string;
  business_name: string;
}): Promise<unknown> {
  const { place_id, business_name } = args;
  if (!place_id || !business_name) {
    throw new Error('place_id and business_name are required');
  }
  return generateFullReport(place_id, business_name);
}

export async function handleGetPlaceUiData(args: { place_id: string }): Promise<unknown> {
  const placeId = args.place_id;
  if (!placeId) throw new Error('place_id is required');
  const details = await getPlaceDetails(placeId);
  return {
    placeId: details.placeId,
    name: details.name,
    formattedAddress: details.formattedAddress,
    rating: details.rating,
    userRatingCount: details.userRatingCount,
  };
}
