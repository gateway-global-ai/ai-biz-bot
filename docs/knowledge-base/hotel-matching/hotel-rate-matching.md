# Hotel Rate Matching Integration Framework

## Overview

A hotel search and rate matching system that combines Google Places (for hotel discovery and location data) with external hotel APIs (like GRNConnect) to provide real-time rates and availability. Uses GPS-based matching for high-accuracy hotel identification across different data sources.

## Problem Statement

### Challenge
- **Google Places**: Has hotel names, locations, and basic info, but no rates/availability
- **Hotel APIs** (GRNConnect, etc.): Have rates and inventory, but hotel names may not match exactly
- **User Need**: Search hotels in an area and see both Google Places data (reviews, photos, amenities) AND real-time rates/availability

### Solution
1. Search hotels via Google Places (by location/area)
2. Match each hotel to external hotel database using:
   - Hotel name matching (normalized)
   - GPS coordinate validation (within 0.5KM)
3. If match found, fetch rates/inventory from external API
4. Display combined data: Google Places info + real-time rates
5. Store mappings in database for future lookups

## Architecture

### Components

1. **Hotel Search (Google Places)**
   - Search hotels by location (city, area, coordinates)
   - Extract: hotel name, GPS coordinates, Place ID, basic info
   - Return list of hotels in area

2. **Hotel Matching Engine**
   - Normalize hotel names (remove special chars, standardize)
   - Match against external hotel database
   - Validate GPS coordinates (within 0.5KM threshold)
   - Return matched hotel IDs

3. **Mapping Database**
   - Stores: External Source ID, External Hotel ID, Google Place ID
   - Enables fast lookups for future searches
   - Supports multiple external sources

4. **Rate Fetching Service**
   - Async function to fetch rates from external APIs
   - Applies filters: check-in, check-out, rooms, adults, children
   - Returns rates and availability
   - Handles errors gracefully

5. **Hotel Display System**
   - Shows Google Places data immediately
   - Displays loading state while fetching rates
   - Updates with rates when available
   - Handles hotels without rate data

## Matching Algorithm

### Step 1: Name Normalization
```
Original: "Hilton Garden Inn San Francisco Downtown"
Normalized: "hilton garden inn san francisco downtown"

Rules:
- Lowercase
- Remove special characters (., -, etc.)
- Standardize common words (hotel, inn, etc.)
- Remove location suffixes if in search area
```

### Step 2: Name Matching
```
Google Places: "Hilton Garden Inn SF Downtown"
External DB: "Hilton Garden Inn San Francisco Downtown"

Match Score: Calculate similarity (Levenshtein, fuzzy matching)
Threshold: >85% similarity
```

### Step 3: GPS Validation
```
Google Places GPS: (37.7749, -122.4194)
External DB GPS: (37.7750, -122.4195)

Distance: Calculate haversine distance
Threshold: < 0.5KM (500 meters)

If both name match AND GPS within threshold → MATCH
```

### Step 4: Store Mapping
```
If match found:
- Store in mapping table
- External Source ID: "grnconnect"
- External Hotel ID: "12345"
- Google Place ID: "ChIJ..."
- Match confidence: 0.95
- Matched at: timestamp
```

## Database Schema

### Hotel Mappings Table
```sql
CREATE TABLE hotel_mappings (
  mapping_id VARCHAR(255) PRIMARY KEY,
  google_place_id VARCHAR(255) NOT NULL UNIQUE,
  external_source_id VARCHAR(100) NOT NULL, -- 'grnconnect', 'booking', etc.
  external_hotel_id VARCHAR(255) NOT NULL,
  hotel_name_normalized VARCHAR(500),
  match_confidence DECIMAL(3,2),
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  last_verified TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(external_source_id, external_hotel_id, google_place_id)
);
```

### Hotel Search Cache
```sql
CREATE TABLE hotel_search_cache (
  cache_id VARCHAR(255) PRIMARY KEY,
  search_params JSONB, -- location, dates, filters
  google_places_results JSONB,
  matched_hotels JSONB, -- hotel_id -> mapping_id
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

## API Design

### Search Hotels with Rates
```http
POST /api/hotels/search
Content-Type: application/json

{
  "location": {
    "city": "San Francisco",
    "coordinates": {"lat": 37.7749, "lng": -122.4194},
    "radius_km": 5
  },
  "check_in": "2026-02-06",
  "check_out": "2026-02-10",
  "rooms": 1,
  "adults": 2,
  "children": 0,
  "external_sources": ["grnconnect"] // Optional: specific sources
}

Response (Initial - Google Places data):
{
  "search_id": "hotel_search_123",
  "hotels": [
    {
      "hotel_id": "hotel_1",
      "google_place_id": "ChIJ...",
      "name": "Hilton Garden Inn SF Downtown",
      "address": "123 Main St, San Francisco, CA",
      "gps": {"lat": 37.7749, "lng": -122.4194},
      "rating": 4.2,
      "photos": ["url1", "url2"],
      "amenities": ["wifi", "pool", "parking"],
      "rates_status": "loading", // "loading" | "available" | "unavailable" | "no_match"
      "rates": null
    }
  ],
  "rates_fetching": true
}

Response (Updated - With Rates):
{
  "search_id": "hotel_search_123",
  "hotels": [
    {
      "hotel_id": "hotel_1",
      "google_place_id": "ChIJ...",
      "name": "Hilton Garden Inn SF Downtown",
      // ... Google Places data ...
      "rates_status": "available",
      "rates": {
        "currency": "USD",
        "room_types": [
          {
            "room_type": "Standard King",
            "rate": 189.00,
            "taxes": 25.00,
            "total": 214.00,
            "availability": "available",
            "cancellation_policy": "Free cancellation until 48h before check-in"
          }
        ],
        "lowest_rate": 189.00,
        "total_nights": 4,
        "total_estimate": 856.00
      },
      "external_source": "grnconnect",
      "external_hotel_id": "12345"
    }
  ],
  "rates_fetching": false
}
```

### Get Hotel Rates (Async)
```http
GET /api/hotels/search/:search_id/rates

Response:
{
  "search_id": "hotel_search_123",
  "rates_loaded": true,
  "hotels_with_rates": 15,
  "hotels_without_rates": 5,
  "updated_at": "2026-01-17T09:30:00Z"
}
```

## Implementation Flow

### 1. Hotel Search Request
```
User: "Find hotels near the 2026 Winter Olympics venues"
→ Extract location from event research report
→ Search Google Places for hotels in area
→ Return initial hotel list with Google Places data
```

### 2. Matching Process (Async)
```
For each hotel from Google Places:
  1. Check mapping database for existing match
  2. If not found:
     a. Normalize hotel name
     b. Search external hotel database
     c. Calculate name similarity
     d. Validate GPS distance
     e. If match: Store mapping
  3. If match found: Fetch rates
```

### 3. Rate Fetching (Async)
```
For each matched hotel:
  1. Get external hotel ID from mapping
  2. Call external API (GRNConnect) with:
     - Hotel ID
     - Check-in date
     - Check-out date
     - Rooms, adults, children
  3. Parse rates and availability
  4. Return structured rate data
```

### 4. Display Update
```
Initial: Show hotels with "rates_status: loading"
Async: Update hotels as rates become available
Final: All hotels show rates or "unavailable" status
```

## Integration with Event Search

### Combined Event + Hotel Search
```
User: "Plan a trip to the 2026 Winter Olympics"

1. Generate event research report
   → Event dates: 2026-02-06 to 2026-02-22
   → Venues: Milan, Cortina d'Ampezzo

2. Search hotels near venues
   → Location: Milan (for opening ceremony)
   → Dates: 2026-02-06 to 2026-02-10
   → Match hotels and fetch rates

3. Return combined itinerary:
   → Event schedule
   → Hotel recommendations with rates
   → Total trip cost estimate
```

## External API Integration (GRNConnect Example)

### API Call Structure
```typescript
async function fetchHotelRates(
  externalHotelId: string,
  checkIn: string,
  checkOut: string,
  rooms: number,
  adults: number,
  children: number
): Promise<HotelRates> {
  const response = await fetch('https://api.grnconnect.com/hotels/rates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GRNCONNECT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      hotel_id: externalHotelId,
      check_in: checkIn,
      check_out: checkOut,
      rooms: rooms,
      adults: adults,
      children: children
    })
  });
  
  return response.json();
}
```

## Matching Confidence Levels

- **High (0.9-1.0)**: Name match >90% AND GPS < 0.3KM
- **Medium (0.7-0.9)**: Name match >80% AND GPS < 0.5KM
- **Low (0.5-0.7)**: Name match >70% AND GPS < 0.5KM
- **No Match (<0.5)**: No valid match found

Only High and Medium confidence matches are stored in mapping database.

## Error Handling

### No Match Found
- Hotel displayed with Google Places data only
- `rates_status: "no_match"`
- User can still see hotel info, photos, reviews

### Rate Fetch Failed
- Hotel displayed with Google Places data
- `rates_status: "unavailable"`
- Option to retry rate fetch

### External API Error
- Log error
- Continue with other hotels
- Show partial results

## Performance Optimization

### Caching
- Cache Google Places results (5 minutes)
- Cache hotel mappings (permanent until invalidated)
- Cache rates (1 hour, or until check-in date changes)

### Async Processing
- Return Google Places data immediately
- Fetch rates in background
- Update UI as rates arrive

### Batch Processing
- Batch rate requests when possible
- Parallel API calls for multiple hotels
- Rate limiting to respect API quotas

## Benefits

1. **Accurate Matching**: GPS validation ensures correct hotel identification
2. **Rich Data**: Combines Google Places (photos, reviews) with rates
3. **Real-time Rates**: Current availability and pricing
4. **Fast Lookups**: Mapping database speeds up future searches
5. **Multiple Sources**: Supports multiple hotel API providers
6. **User Experience**: Immediate hotel list, rates load asynchronously

## Use Cases

### Event Trip Planning
```
Event: 2026 Winter Olympics
→ Search hotels near venues
→ Match to rate providers
→ Display with event schedule
→ Total trip cost
```

### City Hotel Search
```
Query: "Hotels in San Francisco for Feb 6-10"
→ Search Google Places
→ Match to rate providers
→ Display with rates
```

### Area Hotel Search
```
Query: "Hotels near Golden Gate Park"
→ Search by coordinates
→ Match hotels
→ Fetch rates
```

## Next Steps

1. Implement hotel matching algorithm
2. Create mapping database schema
3. Integrate Google Places hotel search
4. Build GRNConnect API integration
5. Create async rate fetching service
6. Build hotel search API endpoints
7. Integrate with event search system
8. Add caching and optimization
