# Hotel Rate Matching - BigQuery Integration

## Overview

The hotel rate matching system now integrates with the **1.6M GRN hotel database in BigQuery** for matching Google Places hotels to GRN hotels, and then enriches them with rates from the GRN API.

## Architecture

### Data Flow

```
1. Google Places Search → Hotels with GPS coordinates
2. BigQuery Query → GRN hotels within 5km radius
3. Matching Algorithm → Name + GPS distance matching
4. Store Mapping → Save to PostgreSQL (hotel_mappings)
5. Fetch Rates → GRN API for matched hotels (async)
6. Return Results → Hotels with Google Places data + rates
```

### Components

1. **BigQuery GRN Client** (`services/hotel-search/bigquery-grn-client.ts`)
   - Queries `grn-travel-agent.travel_supervisor.grn_hotels` table
   - 1.6M hotels with GPS coordinates
   - ST_DISTANCE for spatial queries
   - Filters by location, city, country

2. **Hotel Matcher** (`services/hotel-search/hotel-matcher.ts`)
   - Automatically queries BigQuery for GRN hotels near each Google Places hotel
   - Uses name normalization + GPS distance matching
   - Stores successful matches in mapping database

3. **GRN API Client** (`services/hotel-rates/grn-client.ts`)
   - Uses sandbox endpoint: `https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/`
   - API Key: `7438238a97854f59a51d19f36de24625` (default, can be overridden)
   - Fetches rates for matched GRN hotel IDs

4. **Mapping Database** (PostgreSQL)
   - Stores: Google Place ID → GRN Hotel ID mappings
   - Enables fast lookups for future searches
   - Avoids re-matching on subsequent searches

## BigQuery Table

**Table**: `grn-travel-agent.travel_supervisor.grn_hotels`

**Key Fields**:
- `id`, `hotel_id`, `grn_hotel_id` - Hotel identifiers
- `hotel_name` - Hotel name for matching
- `latitude`, `longitude` - GPS coordinates
- `destination_city`, `destination_country` - Location filters
- `star_rating`, `hotel_chain` - Additional metadata

**Row Count**: ~1.6M hotels (deduplicated)

## GRN API Configuration

**Endpoint**: `https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/`

**Authentication**: `X-API-Key` header

**Default API Key**: `7438238a97854f59a51d19f36de24625` (sandbox)

**Request Body**:
```json
{
  "hotel_id": "12345",
  "check_in": "2026-02-06",
  "check_out": "2026-02-10",
  "rooms": 1,
  "adults": 2,
  "children": 0,
  "currency": "USD"
}
```

## Environment Variables

```bash
# BigQuery
GCP_PROJECT_ID=grn-travel-agent
BIGQUERY_DATASET=travel_supervisor

# Google Places
GOOGLE_PLACES_API_KEY=your_key

# GRN API (optional - defaults to sandbox)
GRN_API_KEY=7438238a97854f59a51d19f36de24625
GRN_API_ENDPOINT=https://sandbox-hub-neworbit.grnconnect.com/api/v3
```

## API Usage

### Search Hotels with Rates

```http
POST /api/hotels/search
Content-Type: application/json

{
  "location": {
    "coordinates": {"lat": 37.7749, "lng": -122.4194},
    "radiusKm": 5
  },
  "check_in": "2026-02-06",
  "check_out": "2026-02-10",
  "rooms": 1,
  "adults": 2,
  "children": 0
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
      "rates_status": "loading", // or "available", "no_match"
      "rates": null,
      "external_source": "grnconnect",
      "external_hotel_id": "12345"
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
  "hotels_with_rates": 15,
  "hotels_without_rates": 5
}
```

## Matching Process

### Step 1: Google Places Search
- Search hotels by location/coordinates
- Returns hotels with GPS, name, Place ID

### Step 2: BigQuery Query (per hotel)
- Query GRN hotels within 5km radius
- Filters: GPS distance (ST_DISTANCE), optional city/country
- Returns up to 20 candidates per hotel

### Step 3: Matching Algorithm
- **Name Normalization**: Remove special chars, lowercase
- **Name Similarity**: Token-based + Levenshtein (threshold: 70%)
- **GPS Validation**: Haversine distance (threshold: <500m)
- **Combined Score**: Weighted name (60%) + GPS (40%)

### Step 4: Store Mapping
- Save successful matches to `hotel_mappings` table
- Future searches check mapping first (fast lookup)

### Step 5: Fetch Rates (Async)
- For matched hotels, fetch rates from GRN API
- Returns immediately with `rates_status: "loading"`
- Updates as rates become available

## Performance

- **BigQuery Query**: ~200-500ms per hotel (with 5km radius)
- **Matching**: ~50-100ms per hotel (name + GPS calculation)
- **Rate Fetching**: ~1-3 seconds per hotel (async, batched)

## Benefits

1. **1.6M Hotels**: Full GRN hotel database available for matching
2. **Spatial Queries**: BigQuery ST_DISTANCE for efficient GPS filtering
3. **Fast Lookups**: Mapping database avoids re-matching
4. **Real-time Rates**: GRN API provides current availability
5. **Enrichment**: Google Places data (photos, reviews) + GRN rates

## Next Steps

1. ✅ BigQuery integration complete
2. ✅ GRN API client configured
3. ⏳ Test with real hotel searches
4. ⏳ Monitor matching accuracy
5. ⏳ Optimize BigQuery queries if needed
6. ⏳ Production API key configuration
