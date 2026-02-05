export interface PlacesAggregateInsightRequest {
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

export interface PlacesAggregateResponse {
  count?: string;
  placeInsights?: { place: string }[];
}

export interface BusinessReportRequest {
  placeId: string;
  businessType?: string;
  radiusMeters?: number;
  includeCompetitors?: boolean;
}

export interface BusinessReport {
  businessPlaceId: string;
  generatedAt: string;
  competitorCount: number;
  nearbyByType: Record<string, number>;
  ratingBreakdown: {
    fiveStarCount: number;
    fourStarCount: number;
    threeAndBelowCount: number;
  };
  priceLevelBreakdown: Record<string, number>;
  competitorPlaceIds?: string[];
}

const AREA_INSIGHTS_URL = 'https://areainsights.googleapis.com/v1:computeInsights';

export async function computeInsights(
  accessToken: string,
  request: PlacesAggregateInsightRequest
): Promise<PlacesAggregateResponse> {
  const response = await fetch(AREA_INSIGHTS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Places Aggregate] API error:', response.status, errorText);
    throw new Error(`Places Aggregate API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function generateBusinessReport(
  accessToken: string,
  params: BusinessReportRequest
): Promise<BusinessReport> {
  const { placeId, businessType, radiusMeters = 5000, includeCompetitors = false } = params;

  const placeRef = placeId.startsWith('places/') ? placeId : `places/${placeId}`;

  const locationFilter: LocationFilter = {
    circle: {
      place: placeRef,
      radius: radiusMeters
    }
  };

  const businessTypes = businessType
    ? [businessType]
    : ['restaurant', 'cafe', 'store', 'bar', 'beauty_salon', 'gym'];

  const nearbyByType: Record<string, number> = {};
  for (const type of businessTypes) {
    try {
      const result = await computeInsights(accessToken, {
        insights: ['INSIGHT_COUNT'],
        filter: {
          locationFilter,
          typeFilter: { includedTypes: [type] },
          operatingStatus: ['OPERATING_STATUS_OPERATIONAL']
        }
      });
      nearbyByType[type] = parseInt(result.count || '0', 10);
    } catch (error: any) {
      console.warn(`[Places Aggregate] Failed to get count for type ${type}:`, error.message);
      nearbyByType[type] = -1;
    }
  }

  const primaryType = businessType || 'restaurant';

  let competitorCount = 0;
  try {
    const compResult = await computeInsights(accessToken, {
      insights: ['INSIGHT_COUNT'],
      filter: {
        locationFilter,
        typeFilter: { includedTypes: [primaryType] },
        operatingStatus: ['OPERATING_STATUS_OPERATIONAL']
      }
    });
    competitorCount = parseInt(compResult.count || '0', 10);
  } catch (error: any) {
    console.warn('[Places Aggregate] Failed to get competitor count:', error.message);
  }

  let fiveStarCount = 0;
  let fourStarCount = 0;
  let threeAndBelowCount = 0;
  try {
    const fiveStar = await computeInsights(accessToken, {
      insights: ['INSIGHT_COUNT'],
      filter: {
        locationFilter,
        typeFilter: { includedTypes: [primaryType] },
        operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
        ratingFilter: { minRating: 4.5, maxRating: 5.0 }
      }
    });
    fiveStarCount = parseInt(fiveStar.count || '0', 10);

    const fourStar = await computeInsights(accessToken, {
      insights: ['INSIGHT_COUNT'],
      filter: {
        locationFilter,
        typeFilter: { includedTypes: [primaryType] },
        operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
        ratingFilter: { minRating: 3.5, maxRating: 4.49 }
      }
    });
    fourStarCount = parseInt(fourStar.count || '0', 10);

    const threeStar = await computeInsights(accessToken, {
      insights: ['INSIGHT_COUNT'],
      filter: {
        locationFilter,
        typeFilter: { includedTypes: [primaryType] },
        operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
        ratingFilter: { minRating: 1.0, maxRating: 3.49 }
      }
    });
    threeAndBelowCount = parseInt(threeStar.count || '0', 10);
  } catch (error: any) {
    console.warn('[Places Aggregate] Failed to get rating breakdown:', error.message);
  }

  const priceLevelBreakdown: Record<string, number> = {};
  const priceLevels = [
    'PRICE_LEVEL_FREE',
    'PRICE_LEVEL_INEXPENSIVE',
    'PRICE_LEVEL_MODERATE',
    'PRICE_LEVEL_EXPENSIVE',
    'PRICE_LEVEL_VERY_EXPENSIVE'
  ];
  for (const level of priceLevels) {
    try {
      const priceResult = await computeInsights(accessToken, {
        insights: ['INSIGHT_COUNT'],
        filter: {
          locationFilter,
          typeFilter: { includedTypes: [primaryType] },
          operatingStatus: ['OPERATING_STATUS_OPERATIONAL'],
          priceLevels: [level]
        }
      });
      priceLevelBreakdown[level] = parseInt(priceResult.count || '0', 10);
    } catch (error: any) {
      priceLevelBreakdown[level] = -1;
    }
  }

  let competitorPlaceIds: string[] | undefined;
  if (includeCompetitors) {
    try {
      const placesResult = await computeInsights(accessToken, {
        insights: ['INSIGHT_PLACES'],
        filter: {
          locationFilter,
          typeFilter: { includedTypes: [primaryType] },
          operatingStatus: ['OPERATING_STATUS_OPERATIONAL']
        }
      });
      competitorPlaceIds = placesResult.placeInsights?.map(p => p.place) || [];
    } catch (error: any) {
      console.warn('[Places Aggregate] Failed to get competitor place IDs:', error.message);
    }
  }

  return {
    businessPlaceId: placeRef,
    generatedAt: new Date().toISOString(),
    competitorCount,
    nearbyByType,
    ratingBreakdown: {
      fiveStarCount,
      fourStarCount,
      threeAndBelowCount
    },
    priceLevelBreakdown,
    competitorPlaceIds
  };
}

export function formatReportForSms(report: BusinessReport): string {
  const lines: string[] = [];
  lines.push('Business Area Report');
  lines.push('');

  lines.push(`Competitors nearby: ${report.competitorCount}`);
  lines.push('');

  lines.push('Nearby businesses:');
  for (const [type, count] of Object.entries(report.nearbyByType)) {
    if (count >= 0) {
      const label = type.replace(/_/g, ' ');
      lines.push(`  ${label}: ${count}`);
    }
  }
  lines.push('');

  lines.push('Rating breakdown:');
  lines.push(`  4.5-5 star: ${report.ratingBreakdown.fiveStarCount}`);
  lines.push(`  3.5-4.5 star: ${report.ratingBreakdown.fourStarCount}`);
  lines.push(`  Below 3.5: ${report.ratingBreakdown.threeAndBelowCount}`);
  lines.push('');

  const priceLabels: Record<string, string> = {
    'PRICE_LEVEL_FREE': 'Free',
    'PRICE_LEVEL_INEXPENSIVE': '$',
    'PRICE_LEVEL_MODERATE': '$$',
    'PRICE_LEVEL_EXPENSIVE': '$$$',
    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
  };
  lines.push('Price levels:');
  for (const [level, count] of Object.entries(report.priceLevelBreakdown)) {
    if (count >= 0) {
      lines.push(`  ${priceLabels[level] || level}: ${count}`);
    }
  }

  return lines.join('\n');
}

export function formatReportForChat(report: BusinessReport): string {
  const sections: string[] = [];

  sections.push(`**Business Area Insights Report**`);
  sections.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  sections.push('');

  sections.push(`**Competition Analysis**`);
  sections.push(`Total competitors in area: **${report.competitorCount}**`);
  sections.push('');

  sections.push(`**Nearby Business Density**`);
  for (const [type, count] of Object.entries(report.nearbyByType)) {
    if (count >= 0) {
      const label = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
      sections.push(`- ${label}: ${count}`);
    }
  }
  sections.push('');

  sections.push(`**Competitor Rating Breakdown**`);
  const total = report.ratingBreakdown.fiveStarCount + report.ratingBreakdown.fourStarCount + report.ratingBreakdown.threeAndBelowCount;
  if (total > 0) {
    sections.push(`- 4.5-5.0 stars: ${report.ratingBreakdown.fiveStarCount} (${Math.round(report.ratingBreakdown.fiveStarCount / total * 100)}%)`);
    sections.push(`- 3.5-4.5 stars: ${report.ratingBreakdown.fourStarCount} (${Math.round(report.ratingBreakdown.fourStarCount / total * 100)}%)`);
    sections.push(`- Below 3.5: ${report.ratingBreakdown.threeAndBelowCount} (${Math.round(report.ratingBreakdown.threeAndBelowCount / total * 100)}%)`);
  }
  sections.push('');

  const priceLabels: Record<string, string> = {
    'PRICE_LEVEL_FREE': 'Free',
    'PRICE_LEVEL_INEXPENSIVE': 'Budget ($)',
    'PRICE_LEVEL_MODERATE': 'Moderate ($$)',
    'PRICE_LEVEL_EXPENSIVE': 'Expensive ($$$)',
    'PRICE_LEVEL_VERY_EXPENSIVE': 'Very Expensive ($$$$)'
  };
  sections.push(`**Price Level Distribution**`);
  for (const [level, count] of Object.entries(report.priceLevelBreakdown)) {
    if (count >= 0) {
      sections.push(`- ${priceLabels[level] || level}: ${count}`);
    }
  }

  if (report.competitorPlaceIds && report.competitorPlaceIds.length > 0) {
    sections.push('');
    sections.push(`**Competitor Place IDs** (${report.competitorPlaceIds.length} found)`);
    sections.push(`Use Google Place Details to look up each competitor.`);
  }

  return sections.join('\n');
}
