/**
 * Business Data Service
 *
 * Orchestrates business data enrichment by combining:
 * - General business data (Google Places API)
 * - Review analysis (SERP API + Gemini)
 * - Owner-specific data (from database)
 *
 * This service provides the foundation for rich system instructions and tool responses.
 */

import { getPlaceDetails } from '../tools/placesHandler.js';
import { generateFullReport } from './reviewAnalysisService.js';
import { getOwnerDataByPlaceId } from './ownerDataService.js';
import {
  businessDataMemoryCache,
  CACHE_PREFIX,
  CACHE_TTL_MINUTES,
} from '../config/cacheConfig.js';

export interface GeneralBusinessData {
  placeId: string;
  name: string;
  formattedAddress: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: unknown;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  photos?: unknown[];
}

export interface OwnerSpecificData {
  customDescription?: string;
  specialOffers?: string[];
  ownerStory?: string;
  customHours?: string;
  contactPreferences?: Record<string, unknown>;
  /** Owner-curated amenity labels for voice/instruction copy (subset of review-derived list). */
  publicAmenities?: string[];
}

/** Business intelligence from review mining (SerpAPI + Gemini). Amenities are from reviews, not GMP. */
export interface BusinessIntelligence {
  executive_summary: string;
  /** Extracted from guest mentions in reviews (SerpAPI); not from Places API. */
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

export interface EnrichedBusinessData {
  general: GeneralBusinessData;
  owner?: OwnerSpecificData;
  intelligence?: BusinessIntelligence;
}

/**
 * Fetch general business data from Google Places API.
 */
export async function getGeneralBusinessData(placeId: string): Promise<GeneralBusinessData> {
  return getPlaceDetails(placeId);
}

/**
 * Fetch owner-specific data by place ID (from owner_business_data table).
 */
export async function getOwnerSpecificData(placeId: string): Promise<OwnerSpecificData | null> {
  return getOwnerDataByPlaceId(placeId);
}

/**
 * Fetch business intelligence report (in-memory cache by placeId when useCache is true).
 */
export async function getBusinessIntelligence(
  placeId: string,
  businessName: string,
  useCache = true
): Promise<BusinessIntelligence | null> {
  const cacheKey = `${CACHE_PREFIX.REVIEW_REPORT}:${placeId}`;
  if (useCache) {
    const cached = businessDataMemoryCache.get<BusinessIntelligence>(cacheKey);
    if (cached) return cached;
  }
  try {
    const report = await generateFullReport(placeId, businessName);
    if (report) {
      businessDataMemoryCache.set(cacheKey, report, CACHE_TTL_MINUTES.REVIEW_ANALYSIS);
    }
    return report;
  } catch (error) {
    console.error('[BusinessDataService] Failed to generate intelligence:', error);
    return null;
  }
}

/**
 * Main enrichment function: combines all data sources.
 * Uses in-memory cache for the full enriched payload when options match default usage.
 */
export async function enrichBusinessData(
  placeId: string,
  options?: {
    includeIntelligence?: boolean;
    includeOwnerData?: boolean;
    businessName?: string;
    skipCache?: boolean;
  }
): Promise<EnrichedBusinessData> {
  const cacheKey = `${CACHE_PREFIX.BUSINESS_DATA}:${placeId}:${options?.includeIntelligence ?? false}:${options?.includeOwnerData ?? false}`;
  if (!options?.skipCache) {
    const cached = businessDataMemoryCache.get<EnrichedBusinessData>(cacheKey);
    if (cached) return cached;
  }

  const general = await getGeneralBusinessData(placeId);
  const businessName = options?.businessName ?? general.name;

  const enriched: EnrichedBusinessData = { general };

  if (options?.includeIntelligence) {
    enriched.intelligence = await getBusinessIntelligence(placeId, businessName) ?? undefined;
  }

  if (options?.includeOwnerData) {
    enriched.owner = await getOwnerSpecificData(placeId) ?? undefined;
  }

  businessDataMemoryCache.set(cacheKey, enriched, CACHE_TTL_MINUTES.BUSINESS_DATA);
  return enriched;
}

/**
 * Merge general and owner data into a single context string for system instructions.
 */
export function mergeBusinessContext(
  general: GeneralBusinessData,
  owner?: OwnerSpecificData
): string {
  let context = `Business: ${general.name}\n`;
  context += `Address: ${general.formattedAddress}\n`;
  if (general.rating) {
    context += `Rating: ${general.rating} (${general.userRatingCount ?? 0} reviews)\n`;
  }
  if (general.websiteUri) {
    context += `Website: ${general.websiteUri}\n`;
  }
  if (general.internationalPhoneNumber) {
    context += `Phone: ${general.internationalPhoneNumber}\n`;
  }

  if (owner) {
    if (owner.customDescription) {
      context += `\nOwner Description: ${owner.customDescription}\n`;
    }
    if (owner.specialOffers && owner.specialOffers.length > 0) {
      context += `Special Offers: ${owner.specialOffers.join(', ')}\n`;
    }
    if (owner.ownerStory) {
      context += `Owner Story: ${owner.ownerStory}\n`;
    }
  }

  return context;
}
