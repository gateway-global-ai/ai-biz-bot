# Hotel Matching Logic: Google Places to GRN Database

## Overview

The integration matches hotels from Google Places API to the GRN hotels database using:
1. **Primary Hotel Name Matching** - Extracts and matches primary hotel names
2. **Location Proximity** - Ensures hotels are within 1KM of each other
3. **Fuzzy Name Matching** - Handles variations in hotel names

## Matching Process

### Step 1: Extract Primary Hotel Names from Places

**Purpose**: Normalize hotel names for better matching

**Process**:
1. Extract hotel name from `displayName.text`
2. Remove common hotel suffixes:
   - "Hotel", "Resort", "Inn", "Lodge", "Suites", "Motel", "Hostel"
3. Remove brand qualifiers:
   - "by Marriott", "by Hilton", etc.
4. Store both primary name and full name

**Example**:
```
Full Name: "Marriott Las Vegas Hotel"
Primary Name: "Marriott Las Vegas"

Full Name: "Hilton Garden Inn by Hilton"
Primary Name: "Hilton Garden"
```

### Step 2: Query GRN Hotels Database

**Purpose**: Find matching hotels in GRN database

**Matching Criteria**:
1. **Name Matching** (one of):
   - Exact match: `LOWER(TRIM(places_primary_name)) = LOWER(TRIM(grn_primary_name))`
   - Contains match: `places_primary_name LIKE '%grn_primary_name%'` OR `grn_primary_name LIKE '%places_primary_name%'`

2. **Distance Constraint**:
   - Hotels must be within **1KM** (1000 meters) of each other
   - Uses BigQuery `ST_DISTANCE` function

**SQL Query Structure**:
```sql
SELECT 
  places.place_id,
  places.primary_name AS places_primary_name,
  grn.hotel_id AS grn_hotel_id,
  grn.primary_name AS grn_primary_name,
  ST_DISTANCE(
    ST_GEOGPOINT(places.longitude, places.latitude),
    ST_GEOGPOINT(grn.longitude, grn.latitude)
  ) AS distance_meters,
  name_similarity_score
FROM places_hotels places
CROSS JOIN grn_hotels grn
WHERE 
  -- Name matching (fuzzy)
  (name matches)
  AND 
  -- Distance constraint
  ST_DISTANCE(...) <= 1000  -- 1KM
QUALIFY 
  ROW_NUMBER() OVER (
    PARTITION BY places.place_id 
    ORDER BY name_similarity DESC, distance_meters ASC
  ) = 1  -- Best match per Places hotel
```

### Step 3: Process Matching Results

**Purpose**: Combine Places hotels with GRN matches

**Process**:
1. Create a map of `place_id` → GRN match
2. For each Places hotel:
   - Look up GRN match
   - Include match metadata (distance, similarity)
   - Calculate distance from search center
3. Sort hotels:
   - Priority 1: Hotels with GRN matches
   - Priority 2: Name similarity (higher is better)
   - Priority 3: Match distance (closer is better)
   - Priority 4: Rating and distance from search center

## BigQuery Schema Requirements

### GRN Hotels Table

**Required Columns**:
- `hotel_id` (STRING) - GRN hotel ID
- `hotel_name` (STRING) - Hotel name
- `latitude` (FLOAT64) - Hotel latitude
- `longitude` (FLOAT64) - Hotel longitude
- `address` (STRING) - Hotel address

**Actual Schema** (from `grn_hotels` table):
```sql
CREATE TABLE `grn-travel-agent.travel_supervisor.grn_hotels` (
  hotel_id STRING NOT NULL,
  hotel_name STRING,
  destination_city STRING,
  destination_country STRING,
  destination_state STRING,
  hotel_chain STRING,
  star_rating INT64,
  base_price_per_night FLOAT64,
  amenities ARRAY<STRING>,
  latitude FLOAT64,
  longitude FLOAT64,
  address STRING,
  phone STRING,
  website STRING,
  grn_sync_timestamp TIMESTAMP
);
```

### Places Hotels Array (Input)

**Structure**:
```json
[
  {
    "place_id": "ChIJ...",
    "primary_name": "Marriott Las Vegas",
    "full_name": "Marriott Las Vegas Hotel",
    "latitude": 36.1699,
    "longitude": -115.1398,
    "address": "123 Main St, Las Vegas, NV"
  }
]
```

## Matching Examples

### Example 1: Exact Match

**Places Hotel**:
- Name: "Marriott Las Vegas"
- Location: 36.1699, -115.1398

**GRN Hotel**:
- Name: "Marriott Las Vegas"
- Location: 36.1700, -115.1399
- Distance: 100 meters

**Result**: ✅ Match (exact name, within 1KM)

### Example 2: Contains Match

**Places Hotel**:
- Name: "Marriott Las Vegas Hotel"
- Location: 36.1699, -115.1398

**GRN Hotel**:
- Name: "Marriott Las Vegas"
- Location: 36.1700, -115.1399
- Distance: 100 meters

**Result**: ✅ Match (name contains, within 1KM)

### Example 3: Too Far Away

**Places Hotel**:
- Name: "Marriott Las Vegas"
- Location: 36.1699, -115.1398

**GRN Hotel**:
- Name: "Marriott Las Vegas"
- Location: 36.1800, -115.1500
- Distance: 1500 meters

**Result**: ❌ No Match (distance > 1KM)

### Example 4: Different Name

**Places Hotel**:
- Name: "Marriott Las Vegas"
- Location: 36.1699, -115.1398

**GRN Hotel**:
- Name: "Hilton Las Vegas"
- Location: 36.1700, -115.1399
- Distance: 100 meters

**Result**: ❌ No Match (name doesn't match)

## Benefits

### ✅ Advantages

1. **Accurate Matching**: Name + location ensures correct hotel matches
2. **Prevents False Matches**: 1KM distance constraint avoids incorrect links
3. **Handles Variations**: Fuzzy name matching handles name differences
4. **Prioritizes Quality**: Best match per Places hotel (highest similarity, closest distance)

### ⚠️ Considerations

1. **Database Schema**: Requires GRN hotels table with name and location columns
2. **Performance**: BigQuery query may be slow with large datasets (consider indexing)
3. **Name Normalization**: Primary name extraction may need refinement
4. **Distance Threshold**: 1KM may need adjustment based on data quality

## Alternative: Simplified Matching (No BigQuery)

If BigQuery is not available, use a simplified approach:

```javascript
// For each Places hotel, search GRN hotels by name
// This requires GRN hotels to be loaded into memory or accessible via API
const grnHotels = await fetchGRNHotels(); // Load from API or cache

placesHotels.forEach(placesHotel => {
  const matches = grnHotels.filter(grnHotel => {
    // Name matching
    const nameMatch = 
      placesHotel.primaryName.toLowerCase().includes(grnHotel.primaryName.toLowerCase()) ||
      grnHotel.primaryName.toLowerCase().includes(placesHotel.primaryName.toLowerCase());
    
    // Distance check (within 1KM)
    const distance = calculateDistance(
      { lat: placesHotel.location.latitude, lng: placesHotel.location.longitude },
      { lat: grnHotel.latitude, lng: grnHotel.longitude }
    );
    
    return nameMatch && distance <= 1.0; // 1KM
  });
  
  // Use best match (closest distance)
  if (matches.length > 0) {
    matches.sort((a, b) => a.distance - b.distance);
    placesHotel.grnHotelId = matches[0].hotelId;
  }
});
```

## Testing

### Test Cases

1. **Exact Match Within 1KM**: Should match
2. **Fuzzy Match Within 1KM**: Should match
3. **Exact Match Beyond 1KM**: Should NOT match
4. **Different Name Within 1KM**: Should NOT match
5. **Multiple GRN Matches**: Should use best match (highest similarity, closest distance)

### Validation

- Verify `grnHotelId` is set for matched hotels
- Verify `matchDistanceMeters` <= 1000
- Verify `nameSimilarity` > 0 for matches
- Verify hotels without matches have `grnHotelId = null`

