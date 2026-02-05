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
  excludedTypes?: string[];
}

export type ReportRequest = OwnerReportRequest | MarketingSearchRequest;

export interface BusinessReportRequest {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  businessTypes?: string[];
  businessName?: string;
  minRating?: number;
  maxRating?: number;
  priceLevels?: string[];
  excludedTypes?: string[];
  mode?: SearchMode;
}

export interface BusinessReport {
  businessName: string;
  generatedAt: string;
  location: { latitude: number; longitude: number };
  radiusMeters: number;
  radiusMiles: number;
  mode: SearchMode;
  category?: string;
  results: CategoryResult[];
  summary: ReportSummary;
  filters?: {
    minRating?: number;
    maxRating?: number;
    priceLevels?: string[];
  };
}

export interface CategoryResult {
  type: string;
  placeCount: number;
  highRatedCount: number;
  midRatedCount: number;
  lowRatedCount: number;
}

export interface ReportSummary {
  totalBusinesses: number;
  topCategory: string;
  priceLevelBreakdown: Record<string, number>;
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
    throw new Error('GOOGLE_CLOUD_API_KEY is not set. Add your Google Cloud API key to use Places Aggregate API.');
  }
  return key;
}

export function milesToMeters(miles: number): number {
  return Math.round(miles * MILES_TO_METERS);
}

export function metersToMiles(meters: number): number {
  return parseFloat((meters / MILES_TO_METERS).toFixed(1));
}

export async function computeInsights(
  request: ComputeInsightsRequest,
  apiKey?: string
): Promise<ComputeInsightsResponse> {
  const key = apiKey || getApiKey();

  console.log('[Places Aggregate] computeInsights request:', JSON.stringify(request, null, 2));

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
  console.log('[Places Aggregate] Response:', JSON.stringify(data));
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

const OWNER_REPORT_CATEGORIES = ['lodging', 'restaurant', 'cafe', 'store', 'bar', 'gas_station'];

export async function generateOwnerReport(
  params: OwnerReportRequest,
  apiKey?: string
): Promise<BusinessReport> {
  const { businessName, radiusMiles = DEFAULT_RADIUS_MILES } = params;
  const radiusMeters = milesToMeters(radiusMiles);

  const place = await lookupPlaceByName(businessName, apiKey);
  if (!place) {
    throw new Error(`Could not find "${businessName}" on Google Maps.`);
  }

  const businessCategory = place.primaryType || 'business';
  const searchTypes = place.primaryType
    ? [place.primaryType, ...OWNER_REPORT_CATEGORIES.filter(t => t !== place.primaryType)]
    : OWNER_REPORT_CATEGORIES;

  const report = await generateBusinessReport({
    latitude: place.latitude,
    longitude: place.longitude,
    radiusMeters,
    businessTypes: searchTypes,
    businessName: place.displayName || businessName,
    mode: 'owner'
  }, apiKey);

  report.category = businessCategory;
  return report;
}

export async function generateMarketingSearch(
  params: MarketingSearchRequest,
  apiKey?: string
): Promise<BusinessReport> {
  const {
    address,
    latitude: rawLat,
    longitude: rawLng,
    category,
    radiusMiles = DEFAULT_RADIUS_MILES,
    minRating,
    maxRating,
    priceLevels,
    excludedTypes
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

  const report = await generateBusinessReport({
    latitude: lat!,
    longitude: lng!,
    radiusMeters,
    businessTypes: [category],
    businessName: locationName,
    minRating,
    maxRating,
    priceLevels,
    excludedTypes,
    mode: 'marketing'
  }, apiKey);

  report.category = category;
  if (minRating || maxRating || priceLevels) {
    report.filters = { minRating, maxRating, priceLevels };
  }
  return report;
}

export async function generateBusinessReport(
  params: BusinessReportRequest,
  apiKey?: string
): Promise<BusinessReport> {
  const {
    latitude,
    longitude,
    radiusMeters = DEFAULT_RADIUS_METERS,
    businessTypes = OWNER_REPORT_CATEGORIES,
    businessName = 'Business',
    minRating,
    maxRating,
    priceLevels: filterPriceLevels,
    excludedTypes,
    mode = 'owner'
  } = params;

  const locationFilter: LocationFilter = {
    circle: {
      latLng: { latitude, longitude },
      radius: radiusMeters
    }
  };

  const results: CategoryResult[] = [];

  for (const type of businessTypes) {
    let placeCount = 0;
    let highRatedCount = 0;
    let midRatedCount = 0;
    let lowRatedCount = 0;

    const baseTypeFilter: TypeFilter = { includedTypes: [type] };
    if (excludedTypes && excludedTypes.length > 0) {
      baseTypeFilter.excludedTypes = excludedTypes;
    }

    try {
      const countRequest: ComputeInsightsRequest = {
        insights: ['INSIGHT_COUNT'],
        filter: {
          locationFilter,
          typeFilter: baseTypeFilter,
          operatingStatus: ['OPERATING_STATUS_OPERATIONAL']
        }
      };
      if (minRating !== undefined || maxRating !== undefined) {
        countRequest.filter.ratingFilter = {};
        if (minRating !== undefined) countRequest.filter.ratingFilter.minRating = minRating;
        if (maxRating !== undefined) countRequest.filter.ratingFilter.maxRating = maxRating;
      }
      if (filterPriceLevels && filterPriceLevels.length > 0) {
        countRequest.filter.priceLevels = filterPriceLevels;
      }

      const countResult = await computeInsights(countRequest, apiKey);
      placeCount = parseInt(countResult.count || '0', 10);
    } catch (error: any) {
      console.warn(`[Places Aggregate] Count failed for "${type}":`, error.message);
    }

    if (placeCount > 0 && !minRating && !maxRating) {
      try {
        const highResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: baseTypeFilter,
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            ratingFilter: { minRating: 4.0, maxRating: 5.0 },
            ...(filterPriceLevels ? { priceLevels: filterPriceLevels } : {})
          }
        }, apiKey);
        highRatedCount = parseInt(highResult.count || '0', 10);
      } catch {}

      try {
        const midResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: baseTypeFilter,
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            ratingFilter: { minRating: 3.0, maxRating: 3.99 },
            ...(filterPriceLevels ? { priceLevels: filterPriceLevels } : {})
          }
        }, apiKey);
        midRatedCount = parseInt(midResult.count || '0', 10);
      } catch {}

      try {
        const lowResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: baseTypeFilter,
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            ratingFilter: { minRating: 1.0, maxRating: 2.99 },
            ...(filterPriceLevels ? { priceLevels: filterPriceLevels } : {})
          }
        }, apiKey);
        lowRatedCount = parseInt(lowResult.count || '0', 10);
      } catch {}
    } else if (placeCount > 0 && (minRating || maxRating)) {
      highRatedCount = placeCount;
    }

    results.push({ type, placeCount, highRatedCount, midRatedCount, lowRatedCount });
  }

  const totalBusinesses = results.reduce((sum, r) => sum + r.placeCount, 0);
  const topCategory = results.reduce((top, r) => r.placeCount > (top?.placeCount ?? 0) ? r : top, results[0]);

  const priceLevelBreakdown: Record<string, number> = {};
  if (!filterPriceLevels || filterPriceLevels.length === 0) {
    const priceLevels = ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'];
    for (const level of priceLevels) {
      try {
        const priceResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: { includedTypes: businessTypes },
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            priceLevels: [level],
            ...(minRating !== undefined || maxRating !== undefined ? {
              ratingFilter: {
                ...(minRating !== undefined ? { minRating } : {}),
                ...(maxRating !== undefined ? { maxRating } : {})
              }
            } : {})
          }
        }, apiKey);
        const count = parseInt(priceResult.count || '0', 10);
        if (count > 0) priceLevelBreakdown[level] = count;
      } catch {}
    }
  }

  return {
    businessName,
    generatedAt: new Date().toISOString(),
    location: { latitude, longitude },
    radiusMeters,
    radiusMiles: metersToMiles(radiusMeters),
    mode,
    results,
    summary: {
      totalBusinesses,
      topCategory: topCategory?.type || 'unknown',
      priceLevelBreakdown
    }
  };
}

export function formatReportForSms(report: BusinessReport): string {
  const lines: string[] = [];

  if (report.mode === 'marketing') {
    lines.push(`Market Search: ${report.category?.replace(/_/g, ' ') || 'All'}`);
    lines.push(`Near: ${report.businessName}`);
  } else {
    lines.push(`Area Report: ${report.businessName}`);
    if (report.category) {
      lines.push(`Category: ${report.category.replace(/_/g, ' ')}`);
    }
  }
  lines.push(`Radius: ${report.radiusMiles} mi`);

  if (report.filters) {
    if (report.filters.minRating || report.filters.maxRating) {
      const min = report.filters.minRating || 1;
      const max = report.filters.maxRating || 5;
      lines.push(`Rating: ${min}-${max} stars`);
    }
  }

  lines.push('');
  lines.push(`Total: ${report.summary.totalBusinesses}`);
  lines.push('');

  lines.push('By category:');
  for (const r of report.results) {
    if (r.placeCount > 0) {
      const label = r.type.replace(/_/g, ' ');
      if (report.mode === 'marketing' && report.filters?.minRating) {
        lines.push(`  ${label}: ${r.placeCount}`);
      } else {
        lines.push(`  ${label}: ${r.placeCount} (${r.highRatedCount} highly rated)`);
      }
    }
  }

  const priceLabels: Record<string, string> = {
    'PRICE_LEVEL_INEXPENSIVE': '$',
    'PRICE_LEVEL_MODERATE': '$$',
    'PRICE_LEVEL_EXPENSIVE': '$$$',
    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
  };
  const priceEntries = Object.entries(report.summary.priceLevelBreakdown).filter(([, v]) => v > 0);
  if (priceEntries.length > 0) {
    lines.push('');
    lines.push('Price levels:');
    for (const [level, count] of priceEntries) {
      lines.push(`  ${priceLabels[level] || level}: ${count}`);
    }
  }

  return lines.join('\n');
}

export function formatReportForChat(report: BusinessReport): string {
  const sections: string[] = [];

  if (report.mode === 'marketing') {
    sections.push(`**Market Search: ${report.category?.replace(/_/g, ' ') || 'All Categories'}**`);
    sections.push(`Location: ${report.businessName}`);
  } else {
    sections.push(`**Area Insights Report: ${report.businessName}**`);
    if (report.category) {
      sections.push(`Business category: ${report.category.replace(/_/g, ' ')}`);
    }
  }
  sections.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  sections.push(`Search radius: ${report.radiusMiles} miles`);

  if (report.filters) {
    const filterParts: string[] = [];
    if (report.filters.minRating || report.filters.maxRating) {
      filterParts.push(`Rating: ${report.filters.minRating || 1}-${report.filters.maxRating || 5} stars`);
    }
    if (report.filters.priceLevels && report.filters.priceLevels.length > 0) {
      const priceLabels: Record<string, string> = {
        'PRICE_LEVEL_INEXPENSIVE': '$',
        'PRICE_LEVEL_MODERATE': '$$',
        'PRICE_LEVEL_EXPENSIVE': '$$$',
        'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
      };
      filterParts.push(`Price: ${report.filters.priceLevels.map(p => priceLabels[p] || p).join(', ')}`);
    }
    if (filterParts.length > 0) {
      sections.push(`Filters: ${filterParts.join(' | ')}`);
    }
  }

  sections.push('');
  sections.push(`**Summary**`);
  sections.push(`- Total businesses found: **${report.summary.totalBusinesses}**`);
  sections.push(`- Most common category: **${report.summary.topCategory.replace(/_/g, ' ')}**`);
  sections.push('');

  sections.push(`**Business Density by Category**`);
  for (const r of report.results) {
    const label = r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, ' ');
    if (r.placeCount > 0) {
      if (report.mode === 'marketing' && report.filters?.minRating) {
        sections.push(`- ${label}: ${r.placeCount} places`);
      } else {
        sections.push(`- ${label}: ${r.placeCount} places (4-5 stars: ${r.highRatedCount}, 3-4 stars: ${r.midRatedCount}, below 3: ${r.lowRatedCount})`);
      }
    } else {
      sections.push(`- ${label}: 0 places`);
    }
  }

  const priceLabels: Record<string, string> = {
    'PRICE_LEVEL_INEXPENSIVE': 'Budget ($)',
    'PRICE_LEVEL_MODERATE': 'Moderate ($$)',
    'PRICE_LEVEL_EXPENSIVE': 'Expensive ($$$)',
    'PRICE_LEVEL_VERY_EXPENSIVE': 'Premium ($$$$)'
  };
  const priceEntries = Object.entries(report.summary.priceLevelBreakdown).filter(([, v]) => v > 0);
  if (priceEntries.length > 0) {
    sections.push('');
    sections.push(`**Price Level Distribution**`);
    for (const [level, count] of priceEntries) {
      sections.push(`- ${priceLabels[level] || level}: ${count}`);
    }
  }

  return sections.join('\n');
}
