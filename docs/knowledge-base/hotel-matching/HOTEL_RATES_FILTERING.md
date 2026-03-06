# Hotel Rates Filtering and Availability

## Overview

After Google Places returns hotels and we have the mapping (Google Place ID → GRN Hotel ID), we filter rates based on check_in, check_out, and rooms parameters. Every Google Places hotel checks the mapping to get rates, and displays "Rates Not Available" when inventory is sold out or unavailable.

## Flow

### Step 1: Google Places Search
- Returns hotels with Google Place IDs and coordinates

### Step 2: Hotel Matching (Mapping Creation)
- Match Google Places hotels to GRN hotels using GPS coordinates
- Store mapping: `hotel_mappings` table (Google Place ID → GRN Hotel ID)
- Every Google Places hotel checks for a mapping

### Step 3: Rate Fetching (After Mapping)
- For each matched hotel (with mapping), fetch rates using:
  - **GRN Hotel ID** (from mapping)
  - **check_in** date
  - **check_out** date
  - **rooms** count
  - **adults** count
  - **children** count

### Step 4: Rate Availability Checking
- GRN API returns rates with availability status
- Check if any rooms are available:
  - `availableRooms > 0`
  - `roomRates.some(room => room.availability === 'available' && room.rate > 0)`
- Set status:
  - `available`: Rates found with available rooms
  - `unavailable`: No rates or all rooms unavailable (sold out)
  - `no_match`: No GRN mapping found
  - `loading`: Rates being fetched

## Rate Status Messages

### Available Rates
```json
{
  "rates_status": "available",
  "rates_message": null,
  "rates": {
    "lowestRate": 150.00,
    "roomRates": [...]
  }
}
```

### Rates Not Available
```json
{
  "rates_status": "unavailable",
  "rates_message": "Rates Not Available",
  "rates": null
}
```

**Scenarios for "Rates Not Available"**:
1. **Sold Out**: All rooms unavailable for the dates
2. **No Inventory**: No rooms returned from GRN API
3. **Date Conflict**: Rates not available for requested dates
4. **No Match**: No GRN mapping exists for this Google Places hotel

## Database Schema

### `hotel_mappings`
Stores Google Place ID → GRN Hotel ID mappings:
```sql
mapping_id (PRIMARY KEY)
google_place_id (UNIQUE) -- From Google Places
external_source_id        -- 'grnconnect'
external_hotel_id         -- GRN Hotel ID
```

### `hotel_rate_requests`
Stores rate requests with filtering parameters:
```sql
request_id (PRIMARY KEY)
mapping_id (FK -> hotel_mappings)
search_id
check_in (DATE)           -- Filters availability
check_out (DATE)          -- Filters availability
rooms (INTEGER)           -- Filters room availability
adults (INTEGER)          -- Filters capacity
children (INTEGER)        -- Filters capacity
status ('pending' | 'fetching' | 'completed' | 'failed' | 'no_match')
rates_data (JSONB)        -- Actual rates returned
```

## API Response Format

### Hotel Search Response
```json
{
  "search_id": "hotel_search_123",
  "hotels": [
    {
      "hotel_id": "hotel_1",
      "google_place_id": "ChIJ...",
      "name": "Hilton Garden Inn",
      "rates_status": "loading" | "available" | "unavailable" | "no_match",
      "rates_message": "Rates Not Available" | null,
      "rates": null, // Will be populated when available
      "external_hotel_id": "12345", // GRN Hotel ID (if mapped)
      "match_confidence": 0.95
    }
  ]
}
```

### Rate Status Response
```json
{
  "search_id": "hotel_search_123",
  "hotels_with_rates": [
    {
      "google_place_id": "ChIJ...",
      "external_hotel_id": "12345",
      "check_in": "2026-02-06",
      "check_out": "2026-02-10",
      "rooms": 1,
      "rates_status": "available" | "unavailable",
      "rates_message": "Rates Not Available" | null,
      "rates": {
        "lowestRate": 150.00,
        "roomRates": [...]
      }
    }
  ]
}
```

## Filtering Logic

### Rate Fetching (GRN API)
The GRN API filters rates by:
- ✅ `check_in` date
- ✅ `check_out` date  
- ✅ `rooms` count
- ✅ `adults` count
- ✅ `children` count

If no rates match these criteria, GRN API returns empty or unavailable status.

### Our Application
We further filter by checking:
- ✅ Available rooms > 0
- ✅ Room rates with `availability === 'available'`
- ✅ Valid rate > 0

If no available rates found → Status: `unavailable`, Message: `"Rates Not Available"`

## Key Points

1. **Every Google Places hotel checks mapping**: All returned hotels attempt to find a GRN mapping for rates

2. **Mapping required for rates**: Only hotels with a GRN mapping can fetch rates

3. **Rates filtered by search params**: `check_in`, `check_out`, `rooms`, `adults`, `children` are all sent to GRN API

4. **"Rates Not Available" is normal**: Like other travel sites, this means sold out or unavailable inventory, not an error

5. **Status progression**:
   - `no_match` → No GRN mapping (won't get rates)
   - `loading` → Has mapping, fetching rates
   - `available` → Rates found with availability
   - `unavailable` → Rates checked, but sold out/unavailable

## Example Flow

```
1. Google Places: 20 hotels returned
   ↓
2. Matching: 15 hotels matched to GRN (mapping created)
   ↓
3. Rate Fetching (with check_in, check_out, rooms):
   - 12 hotels: Rates available
   - 2 hotels: Rates unavailable (sold out)
   - 1 hotel: API error
   ↓
4. Response:
   - 12 hotels: rates_status="available", rates={...}
   - 2 hotels: rates_status="unavailable", rates_message="Rates Not Available"
   - 1 hotel: rates_status="error"
   - 5 hotels: rates_status="no_match" (no GRN mapping)
```
