const AREA_INSIGHTS_URL = 'https://areainsights.googleapis.com/v1:computeInsights';
const MILES_TO_METERS = 1609.34;
const DEFAULT_RADIUS_MILES = 3;
const DEFAULT_RADIUS_METERS = Math.round(DEFAULT_RADIUS_MILES * MILES_TO_METERS);

export interface ComputeInsightsRequest {
  insights: ('INSIGHT_COUNT' | 'INSIGHT_PLACES')[];
  filter: {
    locationFilter: LocationFilter;
    typeFilter: TypeFilter;
    operatingStatus?: string[];
    priceLevels?: string[];
    ratingFilter?: {
      minRating?: number;
      maxRating?: number;
    };
  };
}

interface LocationFilter {
  circle?: {
    latLng?: { latitude: number; longitude: number };
    place?: string;
    radius: number;
  };
  region?: {
    place: string;
  };
  customArea?: {
    polygon: {
      coordinates: { latitude: number; longitude: number }[];
    };
  };
}

interface TypeFilter {
  includedTypes?: string[];
  excludedTypes?: string[];
  includedPrimaryTypes?: string[];
  excludedPrimaryTypes?: string[];
}

export interface ComputeInsightsResponse {
  count?: string;
  placeInsights?: { place: string }[];
}

export type SearchMode = 'owner' | 'marketing';

export interface OwnerReportRequest {
  mode: 'owner';
  businessName: string;
  radiusMiles?: number;
}

export interface MarketingSearchRequest {
  mode: 'marketing';
  address?: string;
  latitude?: number;
  longitude?: number;
  category: string;
  radiusMiles?: number;
  minRating?: number;
  maxRating?: number;
  priceLevels?: string[];
}

export type ReportRequest = OwnerReportRequest | MarketingSearchRequest;

export interface OwnerReport {
  businessName: string;
  category: string;
  generatedAt: string;
  location: { latitude: number; longitude: number };
  radiusMiles: number;
  mode: 'owner';
  competitors: {
    total: number;
    highRated: number;
    lowRated: number;
  };
}

export interface MarketingReport {
  locationName: string;
  category: string;
  generatedAt: string;
  location: { latitude: number; longitude: number };
  radiusMiles: number;
  mode: 'marketing';
  total: number;
  filters?: {
    minRating?: number;
    maxRating?: number;
    priceLevels?: string[];
  };
}

export interface PlaceLookupResult {
  placeId: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  primaryType?: string;
  displayName?: string;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_CLOUD_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_CLOUD_API_KEY is not set.');
  }
  return key;
}

export function milesToMeters(miles: number): number {
  return Math.round(miles * MILES_TO_METERS);
}

/** One nearby place with name and rating (for enrichment context). */
export interface NearbyPlaceRating {
  name: string;
  rating: number;
}

/**
 * Fetch nearby places of the same type with ratings; used to show "highest/lowest rated" examples.
 * Uses Places API (New) searchText with locationBias. Returns up to 20, sorted by rating.
 */
export async function fetchNearbyPlacesWithRatings(
  latitude: number,
  longitude: number,
  primaryType: string,
  radiusMiles: number = 1,
  apiKey?: string
): Promise<NearbyPlaceRating[]> {
  const key = apiKey || getApiKey();
  const radiusMeters = Math.round(radiusMiles * MILES_TO_METERS);

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating'
    },
    body: JSON.stringify({
      textQuery: primaryType.replace(/_/g, ' '),
      locationBias: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters
        }
      },
      maxResultCount: 20
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[Places Nearby] API error:', response.status, errText);
    return [];
  }

  const data = await response.json();
  const places = (data.places || []) as Array<{ displayName?: { text?: string }; rating?: number }>;
  const withRating = places
    .filter((p) => p.rating != null && p.rating >= 0)
    .map((p) => ({
      name: p.displayName?.text || 'Unknown',
      rating: p.rating!
    }));
  withRating.sort((a, b) => b.rating - a.rating);
  return withRating;
}

export function metersToMiles(meters: number): number {
  return parseFloat((meters / MILES_TO_METERS).toFixed(1));
}

export async function computeInsights(
  request: ComputeInsightsRequest,
  apiKey?: string
): Promise<ComputeInsightsResponse> {
  const key = apiKey || getApiKey();

  const response = await fetch(AREA_INSIGHTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Places Aggregate] API error:', response.status, errorText);
    throw new Error(`Places Aggregate API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data;
}

export async function lookupPlaceByName(
  name: string,
  apiKey?: string
): Promise<PlaceLookupResult | null> {
  const key = apiKey || getApiKey();

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types'
    },
    body: JSON.stringify({ textQuery: name })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Places Lookup] API error:', response.status, errorText);
    throw new Error(`Places lookup error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const place = data.places?.[0];
  if (!place) return null;

  return {
    placeId: place.id,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    formattedAddress: place.formattedAddress || '',
    primaryType: place.primaryType || place.types?.[0] || undefined,
    displayName: place.displayName?.text || name
  };
}

async function countInsights(
  locationFilter: LocationFilter,
  typeFilter: TypeFilter,
  ratingFilter?: { minRating?: number; maxRating?: number },
  priceLevels?: string[],
  apiKey?: string
): Promise<number> {
  const filter: ComputeInsightsRequest['filter'] = {
    locationFilter,
    typeFilter,
    operatingStatus: ['OPERATING_STATUS_OPERATIONAL']
  };
  if (ratingFilter) filter.ratingFilter = ratingFilter;
  if (priceLevels && priceLevels.length > 0) filter.priceLevels = priceLevels;

  const result = await computeInsights({ insights: ['INSIGHT_COUNT'], filter }, apiKey);
  return parseInt(result.count || '0', 10);
}

/** Competitor counts within a radius (for enrichment / demo). */
export interface CompetitorCounts {
  total: number;
  highRated: number;
  lowRated: number;
}

/**
 * Get competitor counts by location and category (e.g. 1 mile around business).
 * Uses Area Insights API; does not return individual place names.
 */
export async function getCompetitorCounts(
  latitude: number,
  longitude: number,
  primaryType: string,
  radiusMiles: number = 1,
  apiKey?: string
): Promise<CompetitorCounts> {
  const radiusMeters = milesToMeters(radiusMiles);
  const locationFilter: LocationFilter = {
    circle: { latLng: { latitude, longitude }, radius: radiusMeters }
  };
  const typeFilter: TypeFilter = { includedPrimaryTypes: [primaryType] };

  const total = await countInsights(locationFilter, typeFilter, undefined, undefined, apiKey);
  let highRated = 0;
  let lowRated = 0;
  if (total > 0) {
    highRated = await countInsights(locationFilter, typeFilter, { minRating: 4.0, maxRating: 5.0 }, undefined, apiKey);
    lowRated = await countInsights(locationFilter, typeFilter, { minRating: 1.0, maxRating: 2.99 }, undefined, apiKey);
  }
  return { total, highRated, lowRated };
}

export async function generateOwnerReport(
  params: OwnerReportRequest,
  apiKey?: string
): Promise<OwnerReport> {
  const { businessName, radiusMiles = DEFAULT_RADIUS_MILES } = params;

  const place = await lookupPlaceByName(businessName, apiKey);
  if (!place) {
    throw new Error(`Could not find "${businessName}" on Google Maps.`);
  }

  const category = place.primaryType || 'business';
  const counts = await getCompetitorCounts(place.latitude, place.longitude, category, radiusMiles, apiKey);

  return {
    businessName: place.displayName || businessName,
    category,
    generatedAt: new Date().toISOString(),
    location: { latitude: place.latitude, longitude: place.longitude },
    radiusMiles,
    mode: 'owner',
    competitors: counts
  };
}

export async function generateMarketingSearch(
  params: MarketingSearchRequest,
  apiKey?: string
): Promise<MarketingReport> {
  const {
    address,
    latitude: rawLat,
    longitude: rawLng,
    category,
    radiusMiles = DEFAULT_RADIUS_MILES,
    minRating,
    maxRating,
    priceLevels
  } = params;

  let lat = rawLat;
  let lng = rawLng;
  let locationName = address || 'Custom Location';

  if (lat === undefined || lng === undefined) {
    if (!address) {
      throw new Error('Either address or latitude/longitude is required for marketing search.');
    }
    const place = await lookupPlaceByName(address, apiKey);
    if (!place) {
      throw new Error(`Could not find "${address}" on Google Maps.`);
    }
    lat = place.latitude;
    lng = place.longitude;
    locationName = place.displayName || address;
  }

  const radiusMeters = milesToMeters(radiusMiles);
  const locationFilter: LocationFilter = {
    circle: { latLng: { latitude: lat!, longitude: lng! }, radius: radiusMeters }
  };
  const typeFilter: TypeFilter = { includedTypes: [category] };

  let ratingFilter: { minRating?: number; maxRating?: number } | undefined;
  if (minRating !== undefined || maxRating !== undefined) {
    ratingFilter = {};
    if (minRating !== undefined) ratingFilter.minRating = minRating;
    if (maxRating !== undefined) ratingFilter.maxRating = maxRating;
  }

  const total = await countInsights(locationFilter, typeFilter, ratingFilter, priceLevels, apiKey);

  const report: MarketingReport = {
    locationName,
    category,
    generatedAt: new Date().toISOString(),
    location: { latitude: lat!, longitude: lng! },
    radiusMiles,
    mode: 'marketing',
    total
  };

  if (minRating || maxRating || (priceLevels && priceLevels.length > 0)) {
    report.filters = { minRating, maxRating, priceLevels };
  }

  return report;
}

export function formatOwnerReportForSms(report: OwnerReport): string {
  const lines: string[] = [];
  const catLabel = report.category.replace(/_/g, ' ');

  lines.push(`${report.businessName}`);
  lines.push(`Google category: ${catLabel}`);
  lines.push(`Radius: ${report.radiusMiles} mi`);
  lines.push('');
  lines.push(`Direct competitors (${catLabel}): ${report.competitors.total}`);
  if (report.competitors.total > 0) {
    lines.push(`  4-5 stars: ${report.competitors.highRated}`);
    const midRated = report.competitors.total - report.competitors.highRated - report.competitors.lowRated;
    lines.push(`  3-4 stars: ${midRated}`);
    lines.push(`  Below 3: ${report.competitors.lowRated}`);
  }

  return lines.join('\n');
}

export function formatOwnerReportForChat(report: OwnerReport): string {
  const sections: string[] = [];
  const catLabel = report.category.replace(/_/g, ' ');

  sections.push(`**Area Report: ${report.businessName}**`);
  sections.push(`Google category: ${catLabel}`);
  sections.push(`Search radius: ${report.radiusMiles} miles`);
  sections.push('');
  sections.push(`**Direct Competitors (${catLabel})**`);
  sections.push(`- Total: **${report.competitors.total}**`);
  if (report.competitors.total > 0) {
    const midRated = report.competitors.total - report.competitors.highRated - report.competitors.lowRated;
    sections.push(`- 4-5 stars: ${report.competitors.highRated}`);
    sections.push(`- 3-4 stars: ${midRated}`);
    sections.push(`- Below 3 stars: ${report.competitors.lowRated}`);
  }

  return sections.join('\n');
}

export function formatMarketingReportForSms(report: MarketingReport): string {
  const lines: string[] = [];
  const catLabel = report.category.replace(/_/g, ' ');

  lines.push(`Market Search: ${catLabel}`);
  lines.push(`Near: ${report.locationName}`);
  lines.push(`Radius: ${report.radiusMiles} mi`);

  if (report.filters) {
    if (report.filters.minRating || report.filters.maxRating) {
      lines.push(`Rating: ${report.filters.minRating || 1}-${report.filters.maxRating || 5} stars`);
    }
    if (report.filters.priceLevels && report.filters.priceLevels.length > 0) {
      const priceLabels: Record<string, string> = {
        'PRICE_LEVEL_INEXPENSIVE': '$', 'PRICE_LEVEL_MODERATE': '$$',
        'PRICE_LEVEL_EXPENSIVE': '$$$', 'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
      };
      lines.push(`Price: ${report.filters.priceLevels.map(p => priceLabels[p] || p).join(', ')}`);
    }
  }

  lines.push('');
  lines.push(`Found: ${report.total}`);

  return lines.join('\n');
}

export function formatMarketingReportForChat(report: MarketingReport): string {
  const sections: string[] = [];
  const catLabel = report.category.replace(/_/g, ' ');

  sections.push(`**Market Search: ${catLabel}**`);
  sections.push(`Location: ${report.locationName}`);
  sections.push(`Search radius: ${report.radiusMiles} miles`);

  if (report.filters) {
    const filterParts: string[] = [];
    if (report.filters.minRating || report.filters.maxRating) {
      filterParts.push(`Rating: ${report.filters.minRating || 1}-${report.filters.maxRating || 5} stars`);
    }
    if (report.filters.priceLevels && report.filters.priceLevels.length > 0) {
      const priceLabels: Record<string, string> = {
        'PRICE_LEVEL_INEXPENSIVE': '$', 'PRICE_LEVEL_MODERATE': '$$',
        'PRICE_LEVEL_EXPENSIVE': '$$$', 'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
      };
      filterParts.push(`Price: ${report.filters.priceLevels.map(p => priceLabels[p] || p).join(', ')}`);
    }
    if (filterParts.length > 0) {
      sections.push(`Filters: ${filterParts.join(' | ')}`);
    }
  }

  sections.push('');
  sections.push(`**Results:** ${report.total} ${catLabel} businesses found`);

  return sections.join('\n');
}
