const AREA_INSIGHTS_URL = 'https://areainsights.googleapis.com/v1:computeInsights';

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
  highRatedCount: number;
  midRatedCount: number;
  lowRatedCount: number;
}

export interface ReportSummary {
  totalBusinesses: number;
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

    try {
      const countResult = await computeInsights({
        insights: ['INSIGHT_COUNT'],
        filter: {
          locationFilter,
          typeFilter: { includedTypes: [type] },
          operatingStatus: ['OPERATING_STATUS_OPERATIONAL']
        }
      }, apiKey);
      placeCount = parseInt(countResult.count || '0', 10);
    } catch (error: any) {
      console.warn(`[Places Aggregate] Count failed for "${type}":`, error.message);
    }

    if (placeCount > 0) {
      try {
        const highResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: { includedTypes: [type] },
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            ratingFilter: { minRating: 4.0, maxRating: 5.0 }
          }
        }, apiKey);
        highRatedCount = parseInt(highResult.count || '0', 10);
      } catch {}

      try {
        const midResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: { includedTypes: [type] },
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            ratingFilter: { minRating: 3.0, maxRating: 3.99 }
          }
        }, apiKey);
        midRatedCount = parseInt(midResult.count || '0', 10);
      } catch {}

      try {
        const lowResult = await computeInsights({
          insights: ['INSIGHT_COUNT'],
          filter: {
            locationFilter,
            typeFilter: { includedTypes: [type] },
            operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
            ratingFilter: { minRating: 1.0, maxRating: 2.99 }
          }
        }, apiKey);
        lowRatedCount = parseInt(lowResult.count || '0', 10);
      } catch {}
    }

    results.push({ type, placeCount, highRatedCount, midRatedCount, lowRatedCount });
  }

  const totalBusinesses = results.reduce((sum, r) => sum + r.placeCount, 0);
  const topCategory = results.reduce((top, r) => r.placeCount > (top?.placeCount ?? 0) ? r : top, results[0]);

  const priceLevelBreakdown: Record<string, number> = {};
  const priceLevels = ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'];
  for (const level of priceLevels) {
    try {
      const priceResult = await computeInsights({
        insights: ['INSIGHT_COUNT'],
        filter: {
          locationFilter,
          typeFilter: { includedTypes: businessTypes },
          operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
          priceLevels: [level]
        }
      }, apiKey);
      const count = parseInt(priceResult.count || '0', 10);
      if (count > 0) priceLevelBreakdown[level] = count;
    } catch {}
  }

  return {
    businessName,
    generatedAt: new Date().toISOString(),
    location: { latitude, longitude },
    radiusMeters,
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
  lines.push(`Area Report: ${report.businessName}`);
  lines.push(`Radius: ${(report.radiusMeters / 1000).toFixed(1)}km`);
  lines.push('');
  lines.push(`Total nearby: ${report.summary.totalBusinesses}`);
  lines.push('');

  lines.push('By category:');
  for (const r of report.results) {
    if (r.placeCount > 0) {
      const label = r.type.replace(/_/g, ' ');
      lines.push(`  ${label}: ${r.placeCount} (${r.highRatedCount} highly rated)`);
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
  sections.push(`- Most common category: **${report.summary.topCategory.replace(/_/g, ' ')}**`);
  sections.push('');

  sections.push(`**Business Density by Category**`);
  for (const r of report.results) {
    const label = r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, ' ');
    if (r.placeCount > 0) {
      sections.push(`- ${label}: ${r.placeCount} places (4-5 stars: ${r.highRatedCount}, 3-4 stars: ${r.midRatedCount}, below 3: ${r.lowRatedCount})`);
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
