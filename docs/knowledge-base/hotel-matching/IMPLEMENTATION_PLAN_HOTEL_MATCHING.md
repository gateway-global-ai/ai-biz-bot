# Hotel Rate Matching - Implementation Plan

## Overview

Implement hotel search and rate matching system that combines Google Places with external hotel APIs (GRNConnect) using GPS-based matching for accurate hotel identification.

## Architecture Components

### 1. Hotel Search Service
**Location**: `mcp-orchestrator/services/hotel-search/`
**Purpose**: Search hotels via Google Places and match to external APIs

**Files**:
- `google-places-search.ts` - Search hotels by location
- `hotel-matcher.ts` - Match hotels to external databases
- `rate-fetcher.ts` - Fetch rates from external APIs

### 2. Matching Engine
**Location**: `mcp-orchestrator/services/hotel-matching/`
**Purpose**: Core matching algorithm

**Files**:
- `name-normalizer.ts` - Normalize hotel names
- `gps-validator.ts` - Validate GPS coordinates
- `match-scorer.ts` - Calculate match scores
- `mapping-store.ts` - Store/retrieve mappings

### 3. Rate Fetching Service
**Location**: `mcp-orchestrator/services/hotel-rates/`
**Purpose**: Async rate fetching from external APIs

**Files**:
- `grnconnect-client.ts` - GRNConnect API integration
- `rate-cache.ts` - Cache rate responses
- `rate-aggregator.ts` - Combine rates from multiple sources

### 4. Database Integration
**Location**: Extend `init_schema.ts`
**Purpose**: Store hotel mappings and cache

**Schema**: `hotel_mapping_schema.sql` (already created)

## Implementation Steps

### Step 1: Hotel Matching Algorithm (Week 1)

1. Implement name normalization
   ```typescript
   // mcp-orchestrator/services/hotel-matching/name-normalizer.ts
   export function normalizeHotelName(name: string): string {
     return name
       .toLowerCase()
       .replace(/[^\w\s]/g, '')
       .replace(/\bthe\b|\ba\b/g, '')
       .trim();
   }
   ```

2. Implement GPS distance calculation
   ```typescript
   // mcp-orchestrator/services/hotel-matching/gps-validator.ts
   export function calculateDistance(
     lat1: number, lon1: number,
     lat2: number, lon2: number
   ): number {
     // Haversine formula
   }
   ```

3. Implement matching algorithm
   ```typescript
   // mcp-orchestrator/services/hotel-matching/match-scorer.ts
   export async function matchHotel(
     googlePlace: GooglePlaceHotel,
     externalHotels: ExternalHotel[]
   ): Promise<MatchResult | null> {
     // Normalize names
     // Calculate similarity
     // Validate GPS
     // Return best match
   }
   ```

### Step 2: Google Places Integration (Week 2)

1. Search hotels by location
   ```typescript
   // mcp-orchestrator/services/hotel-search/google-places-search.ts
   export async function searchHotels(
     location: Location,
     radius: number
   ): Promise<GooglePlaceHotel[]> {
     // Use Google Places API
     // Filter for hotels/lodging
     // Extract: name, GPS, Place ID, basic info
   }
   ```

2. Get hotel details
   - Photos, reviews, amenities
   - Full address
   - Rating

### Step 3: External API Integration (Week 3)

1. GRNConnect API client
   ```typescript
   // mcp-orchestrator/services/hotel-rates/grnconnect-client.ts
   export async function fetchHotelRates(
     hotelId: string,
     checkIn: string,
     checkOut: string,
     rooms: number,
     adults: number,
     children: number
   ): Promise<HotelRates> {
     // Call GRNConnect API
     // Parse response
     // Return structured rates
   }
   ```

2. Error handling
   - API failures
   - Rate limiting
   - Timeout handling

### Step 4: Mapping Database (Week 4)

1. Deploy schema
   - Add to `init_schema.ts`
   - Create tables
   - Add indexes

2. Implement mapping store
   ```typescript
   // mcp-orchestrator/services/hotel-matching/mapping-store.ts
   export async function storeMapping(
     mapping: HotelMapping
   ): Promise<void> {
     // Store in database
   }
   
   export async function getMapping(
     googlePlaceId: string
   ): Promise<HotelMapping | null> {
     // Retrieve from database
   }
   ```

### Step 5: Async Rate Fetching (Week 5)

1. Implement async rate fetcher
   ```typescript
   // mcp-orchestrator/services/hotel-rates/rate-fetcher.ts
   export async function fetchRatesAsync(
     hotels: MatchedHotel[],
     searchParams: SearchParams
   ): Promise<void> {
     // For each matched hotel:
     //   - Fetch rates in background
     //   - Update hotel object
     //   - Cache results
   }
   ```

2. Rate caching
   - Cache successful responses
   - Expire based on check-in date
   - Invalidate on date change

### Step 6: API Endpoints (Week 6)

1. Hotel search endpoint
   ```typescript
   // mcp-orchestrator/server.ts
   app.post("/api/hotels/search", async (req, res) => {
     const { location, check_in, check_out, rooms, adults, children } = req.body;
     
     // 1. Search Google Places
     const hotels = await searchHotels(location);
     
     // 2. Match to external sources
     const matchedHotels = await matchHotels(hotels);
     
     // 3. Return initial results (with loading state)
     res.json({
       hotels: matchedHotels.map(h => ({
         ...h,
         rates_status: "loading"
       })),
       rates_fetching: true
     });
     
     // 4. Fetch rates async (don't await)
     fetchRatesAsync(matchedHotels, { check_in, check_out, rooms, adults, children });
   });
   ```

2. Get rates status
   ```typescript
   app.get("/api/hotels/search/:search_id/rates", async (req, res) => {
     // Return updated rates status
   });
   ```

3. Get hotel details
   ```typescript
   app.get("/api/hotels/:hotel_id", async (req, res) => {
     // Return full hotel details with rates
   });
   ```

## Code Structure

```
mcp-orchestrator/
├── services/
│   ├── hotel-search/
│   │   ├── google-places-search.ts
│   │   ├── hotel-matcher.ts
│   │   └── rate-fetcher.ts
│   ├── hotel-matching/
│   │   ├── name-normalizer.ts
│   │   ├── gps-validator.ts
│   │   ├── match-scorer.ts
│   │   └── mapping-store.ts
│   └── hotel-rates/
│       ├── grnconnect-client.ts
│       ├── rate-cache.ts
│       └── rate-aggregator.ts
└── server.ts (add hotel endpoints)
```

## API Design

### Search Hotels
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
  "external_sources": ["grnconnect"]
}

Response:
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
      "photos": ["url1"],
      "amenities": ["wifi", "pool"],
      "rates_status": "loading",
      "rates": null
    }
  ],
  "rates_fetching": true
}
```

### Get Updated Rates
```http
GET /api/hotels/search/:search_id/rates

Response:
{
  "search_id": "hotel_search_123",
  "rates_loaded": true,
  "hotels": [
    {
      "hotel_id": "hotel_1",
      "rates_status": "available",
      "rates": {
        "currency": "USD",
        "room_types": [
          {
            "room_type": "Standard King",
            "rate": 189.00,
            "total": 214.00,
            "availability": "available"
          }
        ],
        "lowest_rate": 189.00
      }
    }
  ]
}
```

## Integration with Event Search

### Combined Endpoint
```http
POST /api/events/research-with-hotels
Content-Type: application/json

{
  "event_query": "2026 Winter Olympics",
  "hotel_search": {
    "near_venue": true, // Search near event venues
    "check_in_offset_days": 0, // Days before event start
    "check_out_offset_days": 4, // Days after event start
    "rooms": 1,
    "adults": 2
  }
}

Response:
{
  "event_report": { ... },
  "hotels": [
    {
      "name": "...",
      "distance_to_venue_km": 2.5,
      "rates": { ... }
    }
  ],
  "total_trip_cost": {
    "events": 500.00,
    "hotels": 856.00,
    "total": 1356.00
  }
}
```

## Testing Strategy

### Unit Tests
- Name normalization
- GPS distance calculation
- Match scoring algorithm
- Rate parsing

### Integration Tests
- Google Places search
- GRNConnect API calls
- Database operations
- Async rate fetching

### End-to-End Tests
- Full hotel search flow
- Matching accuracy
- Rate display
- Error handling

## Success Metrics

- **Matching Accuracy**: >95% for hotels with GPS data
- **Rate Fetch Success**: >90% for matched hotels
- **Response Time**: <5 seconds for initial results
- **Rate Load Time**: <30 seconds for 20 hotels
- **Cache Hit Rate**: >60% for repeated searches

## Dependencies

- Google Places API (already available via MCP)
- GRNConnect API (needs integration)
- Nexus-DB (already integrated)
- String similarity library (fuzzy matching)

## Timeline

- **Week 1**: Matching algorithm
- **Week 2**: Google Places integration
- **Week 3**: External API integration
- **Week 4**: Database and mapping
- **Week 5**: Async rate fetching
- **Week 6**: API endpoints and testing

**Total**: 6 weeks to production-ready hotel matching system

## Next Actions

1. ✅ Create hotel matching framework
2. ✅ Design database schema
3. ✅ Create matching algorithm documentation
4. ⏳ Implement name normalizer
5. ⏳ Implement GPS validator
6. ⏳ Implement match scorer
7. ⏳ Integrate Google Places
8. ⏳ Integrate GRNConnect API
9. ⏳ Build async rate fetcher
10. ⏳ Create API endpoints
11. ⏳ Test matching accuracy
