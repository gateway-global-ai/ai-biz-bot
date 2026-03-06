# Hotel Matching Algorithm

## Overview

Detailed algorithm for matching hotels between Google Places and external hotel databases (like GRNConnect) using name normalization and GPS coordinate validation.

## Matching Process

### Step 1: Name Normalization

#### Rules
1. **Lowercase**: Convert to lowercase
2. **Remove Special Characters**: Remove punctuation (., -, _, etc.)
3. **Standardize Common Words**:
   - "hotel" → "hotel"
   - "inn" → "inn"
   - "resort" → "resort"
   - "suites" → "suites"
   - "lodge" → "lodge"
4. **Remove Location Suffixes** (if location is in search context):
   - "San Francisco" → remove if searching in SF
   - "Downtown" → remove if not needed for disambiguation
5. **Remove Common Prefixes**:
   - "The" → remove
   - "A" → remove (if standalone)

#### Examples
```
Original: "Hilton Garden Inn San Francisco Downtown"
Normalized: "hilton garden inn san francisco downtown"

Original: "The Ritz-Carlton, San Francisco"
Normalized: "ritz carlton san francisco"

Original: "Marriott Marquis SF"
Normalized: "marriott marquis sf"
```

### Step 2: Name Similarity Calculation

#### Methods

**1. Levenshtein Distance**
```typescript
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  // Calculate edit distance
  // Return similarity score (0-1)
}
```

**2. Fuzzy Matching (FuzzyWuzzy-like)**
```typescript
function fuzzyMatch(str1: string, str2: string): number {
  // Token-based matching
  // Partial string matching
  // Return similarity score (0-1)
}
```

**3. Combined Score**
```typescript
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeHotelName(name1);
  const normalized2 = normalizeHotelName(name2);
  
  const levenshtein = levenshteinSimilarity(normalized1, normalized2);
  const fuzzy = fuzzyMatchSimilarity(normalized1, normalized2);
  
  // Weighted average
  return (levenshtein * 0.4) + (fuzzy * 0.6);
}
```

#### Thresholds
- **High Match**: >90% similarity
- **Medium Match**: 80-90% similarity
- **Low Match**: 70-80% similarity
- **No Match**: <70% similarity

### Step 3: GPS Distance Calculation

#### Haversine Formula
```typescript
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance * 1000; // Convert to meters
}
```

#### Distance Thresholds
- **Exact Match**: < 100 meters
- **High Confidence**: < 300 meters
- **Medium Confidence**: < 500 meters (0.5KM)
- **Low Confidence**: < 1000 meters
- **No Match**: > 1000 meters

### Step 4: Combined Matching Score

```typescript
interface MatchResult {
  externalHotelId: string;
  nameSimilarity: number;
  gpsDistance: number; // in meters
  combinedScore: number;
  confidence: 'high' | 'medium' | 'low' | 'no_match';
}

function calculateMatchScore(
  nameSimilarity: number,
  gpsDistance: number
): MatchResult {
  // Normalize GPS distance to 0-1 score
  const gpsScore = gpsDistance < 500 
    ? 1 - (gpsDistance / 500) 
    : 0;
  
  // Combined score (weighted)
  const combinedScore = (nameSimilarity * 0.6) + (gpsScore * 0.4);
  
  let confidence: 'high' | 'medium' | 'low' | 'no_match';
  if (nameSimilarity > 0.9 && gpsDistance < 300) {
    confidence = 'high';
  } else if (nameSimilarity > 0.8 && gpsDistance < 500) {
    confidence = 'medium';
  } else if (nameSimilarity > 0.7 && gpsDistance < 500) {
    confidence = 'low';
  } else {
    confidence = 'no_match';
  }
  
  return {
    nameSimilarity,
    gpsDistance,
    combinedScore,
    confidence
  };
}
```

## Matching Algorithm Flow

### Complete Process
```typescript
async function matchHotel(
  googlePlace: GooglePlaceHotel,
  externalHotels: ExternalHotel[]
): Promise<MatchResult | null> {
  
  // Step 1: Normalize Google Places hotel name
  const normalizedGoogleName = normalizeHotelName(googlePlace.name);
  
  // Step 2: For each external hotel, calculate match
  const matches: MatchResult[] = [];
  
  for (const externalHotel of externalHotels) {
    // Normalize external hotel name
    const normalizedExternalName = normalizeHotelName(externalHotel.name);
    
    // Calculate name similarity
    const nameSimilarity = calculateNameSimilarity(
      normalizedGoogleName,
      normalizedExternalName
    );
    
    // Calculate GPS distance
    const gpsDistance = calculateDistance(
      googlePlace.gps.lat, googlePlace.gps.lng,
      externalHotel.gps.lat, externalHotel.gps.lng
    );
    
    // Calculate combined score
    const matchResult = calculateMatchScore(nameSimilarity, gpsDistance);
    
    if (matchResult.confidence !== 'no_match') {
      matches.push({
        ...matchResult,
        externalHotelId: externalHotel.id
      });
    }
  }
  
  // Step 3: Return best match (highest combined score)
  if (matches.length === 0) {
    return null;
  }
  
  matches.sort((a, b) => b.combinedScore - a.combinedScore);
  return matches[0];
}
```

## Edge Cases

### 1. Multiple Hotels with Same Name
```
Google Places: "Hilton San Francisco"
External DB: 
  - "Hilton San Francisco Union Square" (0.2KM away)
  - "Hilton San Francisco Financial District" (1.5KM away)

Solution: Use GPS distance to disambiguate
→ Match to Union Square (closer)
```

### 2. Name Variations
```
Google Places: "The Ritz-Carlton San Francisco"
External DB: "Ritz Carlton San Francisco"

Normalized: Both become "ritz carlton san francisco"
→ High name similarity
→ Match if GPS within threshold
```

### 3. Missing GPS in External DB
```
If external hotel has no GPS:
→ Use name matching only
→ Lower confidence threshold
→ May require manual verification
```

### 4. Chain Hotels with Similar Names
```
Google Places: "Hilton Garden Inn SF Downtown"
External DB: "Hilton Garden Inn San Francisco Downtown"

→ Normalize both
→ Check GPS distance
→ High confidence if both match
```

## Validation Rules

### Match Acceptance Criteria
1. **Name Similarity**: ≥ 70%
2. **GPS Distance**: ≤ 500 meters
3. **Combined Score**: ≥ 0.65

### High Confidence Match
- Name Similarity: ≥ 90%
- GPS Distance: ≤ 300 meters
- Auto-accept and store in mapping

### Medium Confidence Match
- Name Similarity: ≥ 80%
- GPS Distance: ≤ 500 meters
- Store in mapping, flag for verification

### Low Confidence Match
- Name Similarity: ≥ 70%
- GPS Distance: ≤ 500 meters
- Store but require manual verification

## Performance Optimization

### Pre-filtering
```typescript
// Before detailed matching, filter by:
// 1. Location (within search radius)
// 2. Hotel type/category
// 3. Name prefix (first word match)

function preFilterHotels(
  googlePlace: GooglePlaceHotel,
  externalHotels: ExternalHotel[],
  searchRadius: number
): ExternalHotel[] {
  return externalHotels.filter(hotel => {
    // GPS within search radius
    const distance = calculateDistance(
      googlePlace.gps.lat, googlePlace.gps.lng,
      hotel.gps.lat, hotel.gps.lng
    );
    
    if (distance > searchRadius) return false;
    
    // First word of name matches (quick check)
    const googleFirstWord = normalizeHotelName(googlePlace.name).split(' ')[0];
    const hotelFirstWord = normalizeHotelName(hotel.name).split(' ')[0];
    
    return googleFirstWord === hotelFirstWord;
  });
}
```

### Caching
- Cache normalized names
- Cache GPS distance calculations
- Cache match results

## Testing

### Test Cases

1. **Exact Match**
   - Name: 100% similar
   - GPS: 50 meters
   - Expected: High confidence match

2. **Name Variation**
   - Name: 85% similar (punctuation differences)
   - GPS: 200 meters
   - Expected: High confidence match

3. **Close Location, Different Name**
   - Name: 60% similar
   - GPS: 100 meters
   - Expected: No match (name too different)

4. **Similar Name, Far Location**
   - Name: 90% similar
   - GPS: 2KM away
   - Expected: No match (GPS too far)

5. **Chain Hotel**
   - Name: "Hilton Garden Inn SF" vs "Hilton Garden Inn San Francisco"
   - GPS: 300 meters
   - Expected: High confidence match

## Implementation Notes

- Use efficient string matching libraries (fuzzywuzzy, string-similarity)
- Batch process multiple hotels
- Log all matching attempts for analysis
- Allow manual override for edge cases
- Periodically re-verify matches
