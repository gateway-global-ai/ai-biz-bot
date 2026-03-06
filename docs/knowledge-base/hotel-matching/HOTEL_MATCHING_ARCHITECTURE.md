# Hotel Matching Architecture - Corrected Flow

## Overview

This document describes the correct architecture for matching Google Places hotels with GRN hotels using radius-based searches.

## Architecture Flow

### Step 1: Google Places Grounding Lite Search
**Purpose**: Get hotels around a POI/location  
**API**: Google Places Grounding Lite (`search_places` tool)  
**Input**: Location/POI (coordinates or place name)  
**Output**: List of hotels with coordinates

```
Google Places Grounding Lite
  ↓
"hotels near Eiffel Tower, Paris"
  ↓
[Hotel1: {placeId, name, coordinates: {lat, lng}}, 
 Hotel2: {placeId, name, coordinates: {lat, lng}},
 ...]
```

**Key Point**: We search around a **specific POI/location**, not a broad city search.

### Step 2: Radius-Based GRN Search (Per Google Places Hotel)
**Purpose**: For each Google Places hotel, find GRN hotels within a small radius  
**API**: BigQuery spatial query with `ST_DISTANCE`  
**Input**: Google Places hotel coordinates  
**Output**: Curated list of GRN hotels within radius

```
For each Google Places hotel:
  BigQuery: ST_DISTANCE within 0.5-1km radius
    ↓
  [GRN Hotel1, GRN Hotel2, ...] (curated by radius, not count-limited)
```

**Key Points**:
- **Radius-based filtering**: We use distance (e.g., 0.5-1km), not result count limits
- **Small radius**: Creates a curated list, making matching easier
- **Per-hotel search**: Each Google Places hotel gets its own GRN radius search

### Step 3: Matching Algorithm
**Purpose**: Match Google Places hotel with GRN hotels from the curated radius list  
**Algorithm**: Name similarity + GPS distance  
**Output**: Best match (if confidence threshold met)

```
Google Places Hotel + GRN Hotels (from radius)
  ↓
Matching Algorithm (name + GPS)
  ↓
Best Match (if confidence >= threshold)
```

**Key Point**: Matching is easier because we have a **small, curated list** from the radius search.

### Step 4: Store Mapping & Fetch Rates
**Purpose**: Save successful matches and fetch rates asynchronously  
**Storage**: PostgreSQL `hotel_mappings` table  
**Rates**: GRN API (async, non-blocking)

## Current Implementation

### Synchronous Approach (Current)
```typescript
// In matchHotels() function
for (batch of googlePlaceHotels) {
  for (googlePlaceHotel of batch) {
    // 1. Query GRN hotels within radius
    const grnHotels = await bqClient.queryHotelsNearLocation({
      centerLat: googlePlaceHotel.coordinates.lat,
      centerLng: googlePlaceHotel.coordinates.lng,
      radiusKm: 1.0, // Small radius for curated list
      maxResults: 100 // High limit to get all in radius
    });
    
    // 2. Match immediately
    const match = await matchHotel(pool, googlePlaceHotel, grnHotels);
  }
}
```

**Pros**:
- Immediate matching
- Can return results synchronously
- Simpler error handling

**Cons**:
- Slower for many hotels (sequential radius searches)
- BigQuery queries happen during request handling

### Alternative: Async Approach (Optional Optimization)
```typescript
// Send Google Places results to async worker
async function matchHotelsAsync(
  pool: Pool,
  googlePlaceHotels: GooglePlaceHotel[]
) {
  // Process in background
  for (googlePlaceHotel of googlePlaceHotels) {
    // 1. Query GRN hotels within radius
    const grnHotels = await bqClient.queryHotelsNearLocation({
      centerLat: googlePlaceHotel.coordinates.lat,
      centerLng: googlePlaceHotel.coordinates.lng,
      radiusKm: 1.0,
      maxResults: 100
    });
    
    // 2. Match and store
    await matchHotel(pool, googlePlaceHotel, grnHotels);
  }
}
```

**Pros**:
- Non-blocking for user
- Can process many hotels without timeout
- Better for large result sets

**Cons**:
- Results not immediately available
- Requires polling/status endpoint
- More complex

## Recommendation

**Use the current synchronous approach** for hotel search because:

1. **Small curated lists**: Each Google Places hotel gets a small radius (0.5-1km), so the GRN query returns a manageable number of results (typically 1-10 hotels within 1km)

2. **Fast matching**: With a curated list, matching is fast (name + GPS comparison)

3. **Immediate results**: Users get Google Places hotels immediately, with rates loading asynchronously

4. **Scalability**: If we have 20 Google Places hotels, we do 20 small radius searches (each ~100ms), total ~2 seconds - acceptable for a search request

## Key Configuration

### Radius Settings
- **Google Places search**: 5-10km radius (for initial hotel discovery)
- **GRN matching search**: 0.5-1km radius (for precise matching)
- **Why smaller for GRN?**: Creates a curated list, reduces false matches

### Result Limits
- **Google Places**: 20-50 hotels (reasonable for display)
- **GRN radius search**: 100 limit (shouldn't be needed - typically 1-10 hotels within 1km)

## Example Flow

```
1. User: "hotels near Eiffel Tower"
   
2. Google Places Grounding Lite:
   → "hotels near Eiffel Tower, Paris"
   → Returns 15 hotels with coordinates
   
3. For each of 15 Google Places hotels:
   → BigQuery: GRN hotels within 1km of hotel.coordinates
   → Returns 1-5 GRN hotels (curated list)
   → Match: name + GPS distance
   → Store mapping if match found
   
4. Return results:
   → 15 Google Places hotels (immediate)
   → Matches indicated (loading/no_match)
   → Rates fetch asynchronously
```

## Summary

✅ **Current implementation is correct**:
- Radius-based filtering (not city-wide search)
- Small radius for curated GRN lists
- Per-hotel radius search
- Matching against small curated lists

The architecture matches your requirements. The radius-based approach creates curated lists that make matching easier and more accurate.
