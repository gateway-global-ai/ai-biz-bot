const PLACES_AGGREGATE_URL = 'https://places.googleapis.com/places/v1:aggregateSearch';

export interface AggregateSearchRequest {
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  includedTypes?: string[];
  priceLevels?: PriceLevel[];
  openNow?: boolean;
}

export type PriceLevel =
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export interface AggregateSearchResponse {
  places: AggregatePlace[];
  aggregationInfo?: {
    aggregationInterval?: string;
    placeCount?: number;
  };
}

export interface AggregatePlace {
  displayName?: { text: string };
  placeTypeCount?: number;
  averageRating?: number;
  ratingCount?: number;
  priceLevelHistogram?: Record<string, number>;
  accessibilityOptions?: Record<string, number>;
}

export interface BusinessReportRequest {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  businessTypes?: string[];
  businessName?: string;
}

export interface BusinessReport {
  businessName: string;
  generatedAt: string;
  location: { latitude: number; longitude: number };
  radiusMeters: number;
  results: CategoryResult[];
  summary: ReportSummary;
}

export interface CategoryResult {
  type: string;
  placeCount: number;
  averageRating: number | null;
  ratingCount: number;
  priceLevelHistogram: Record<string, number>;
}

export interface ReportSummary {
  totalBusinesses: number;
  overallAverageRating: number | null;
  topCategory: string;
  priceLevelBreakdown: Record<string, number>;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_CLOUD_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_CLOUD_API_KEY is not set. Add your Google Cloud API key to use Places Aggregate API.');
  }
  return key;
}

export async function aggregateSearch(
  request: AggregateSearchRequest,
  apiKey?: string
): Promise<AggregateSearchResponse> {
  const key = apiKey || getApiKey();

  console.log('[Places Aggregate] Request:', JSON.stringify(request, null, 2));

  const response = await fetch(PLACES_AGGREGATE_URL, {
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
  console.log('[Places Aggregate] Response:', JSON.stringify(data, null, 2));
  return data;
}

export async function generateBusinessReport(
  params: BusinessReportRequest,
  apiKey?: string
): Promise<BusinessReport> {
  const {
    latitude,
    longitude,
    radiusMeters = 5000,
    businessTypes = ['lodging', 'restaurant', 'cafe', 'store', 'bar', 'gas_station'],
    businessName = 'Business'
  } = params;

  const results: CategoryResult[] = [];

  for (const type of businessTypes) {
    try {
      const response = await aggregateSearch({
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: radiusMeters
          }
        },
        includedTypes: [type]
      }, apiKey);

      const place = response.places?.[0];
      const placeCount = place?.placeTypeCount ?? response.aggregationInfo?.placeCount ?? 0;

      results.push({
        type,
        placeCount,
        averageRating: place?.averageRating ?? null,
        ratingCount: place?.ratingCount ?? 0,
        priceLevelHistogram: place?.priceLevelHistogram ?? {}
      });
    } catch (error: any) {
      console.warn(`[Places Aggregate] Failed for type "${type}":`, error.message);
      results.push({
        type,
        placeCount: 0,
        averageRating: null,
        ratingCount: 0,
        priceLevelHistogram: {}
      });
    }
  }

  const totalBusinesses = results.reduce((sum, r) => sum + r.placeCount, 0);

  const ratedResults = results.filter(r => r.averageRating !== null);
  const overallAverageRating = ratedResults.length > 0
    ? Math.round((ratedResults.reduce((sum, r) => sum + (r.averageRating ?? 0), 0) / ratedResults.length) * 10) / 10
    : null;

  const topCategory = results.reduce((top, r) => r.placeCount > (top?.placeCount ?? 0) ? r : top, results[0]);

  const priceLevelBreakdown: Record<string, number> = {};
  for (const r of results) {
    for (const [level, count] of Object.entries(r.priceLevelHistogram)) {
      priceLevelBreakdown[level] = (priceLevelBreakdown[level] || 0) + count;
    }
  }

  return {
    businessName,
    generatedAt: new Date().toISOString(),
    location: { latitude, longitude },
    radiusMeters,
    results,
    summary: {
      totalBusinesses,
      overallAverageRating,
      topCategory: topCategory?.type || 'unknown',
      priceLevelBreakdown
    }
  };
}

export function formatReportForSms(report: BusinessReport): string {
  const lines: string[] = [];
  lines.push(`Area Report: ${report.businessName}`);
  lines.push(`Radius: ${(report.radiusMeters / 1000).toFixed(1)}km`);
  lines.push('');

  lines.push(`Total nearby businesses: ${report.summary.totalBusinesses}`);
  if (report.summary.overallAverageRating !== null) {
    lines.push(`Avg rating: ${report.summary.overallAverageRating}/5`);
  }
  lines.push('');

  lines.push('By category:');
  for (const r of report.results) {
    if (r.placeCount > 0) {
      const label = r.type.replace(/_/g, ' ');
      const rating = r.averageRating !== null ? ` (${r.averageRating}/5)` : '';
      lines.push(`  ${label}: ${r.placeCount}${rating}`);
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

  sections.push(`**Area Insights Report: ${report.businessName}**`);
  sections.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  sections.push(`Search radius: ${(report.radiusMeters / 1000).toFixed(1)} km`);
  sections.push('');

  sections.push(`**Summary**`);
  sections.push(`- Total businesses found: **${report.summary.totalBusinesses}**`);
  if (report.summary.overallAverageRating !== null) {
    sections.push(`- Overall average rating: **${report.summary.overallAverageRating}/5**`);
  }
  sections.push(`- Most common category: **${report.summary.topCategory.replace(/_/g, ' ')}**`);
  sections.push('');

  sections.push(`**Business Density by Category**`);
  for (const r of report.results) {
    const label = r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, ' ');
    const rating = r.averageRating !== null ? ` | Avg rating: ${r.averageRating}/5` : '';
    const ratingCount = r.ratingCount > 0 ? ` (${r.ratingCount} reviews)` : '';
    sections.push(`- ${label}: ${r.placeCount} places${rating}${ratingCount}`);
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

export async function lookupPlaceByName(
  name: string,
  apiKey?: string
): Promise<{ placeId: string; latitude: number; longitude: number; formattedAddress: string } | null> {
  const key = apiKey || getApiKey();

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
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
    formattedAddress: place.formattedAddress || ''
  };
}
