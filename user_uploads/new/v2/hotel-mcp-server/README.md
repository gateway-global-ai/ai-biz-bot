# Hotel MCP Server

An MCP (Model Context Protocol) server that integrates Google Maps Grounding Lite for hotel search, GRN Connect for rates and availability, and SERP API for reviews.

## Features

- **Hotel Search**: Search hotels using Google Maps Grounding Lite
- **Hotel Matching**: Automatically match Google hotels to GRN Connect database
- **Rates & Availability**: Get real-time rates from GRN Connect API
- **Reviews**: Fetch and search Google Maps reviews via SERP API
- **Unified Data**: Combine data from all sources into enriched hotel information

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Hotel MCP Server                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Google Maps   │  │ GRN Connect   │  │   SERP API    │       │
│  │ Grounding     │  │    API        │  │   (Reviews)   │       │
│  │ Lite          │  │               │  │               │       │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘       │
│          │                  │                  │               │
│          ▼                  ▼                  ▼               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Hotel Matching Engine                   │       │
│  │         (Fuzzy name + geo-coordinate matching)       │       │
│  └─────────────────────────────────────────────────────┘       │
│          │                                                     │
│          ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                 GRN Database                         │       │
│  │     (hotel, city, country tables)                   │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### Required API Keys

| Key | Description | How to Get |
|-----|-------------|------------|
| `SERP_API_KEY` | SERP API key for Google Maps reviews | [serpapi.com](https://serpapi.com) |
| `GOOGLE_MAPS_API_KEY` | Google Maps Grounding Lite API key | [Google Cloud Console](https://console.cloud.google.com) |

### Pre-configured Credentials

The GRN Connect sandbox credentials are pre-configured:
- **API Endpoint**: `https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/`
- **Agency**: Jason Travel
- **Agent**: Jason

## Usage

### Running the Server

```bash
npm start
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "hotel-search": {
      "command": "node",
      "args": ["/path/to/hotel-mcp-server/src/index.js"],
      "env": {
        "SERP_API_KEY": "your_serp_api_key",
        "GOOGLE_MAPS_API_KEY": "your_google_maps_api_key"
      }
    }
  }
}
```

## Available Tools

### 1. `search_hotels`
Search hotels using Google Maps and match with GRN database.

```json
{
  "location": "Miami Beach, FL",
  "query": "luxury beachfront",
  "limit": 20
}
```

### 2. `search_hotels_db`
Search hotels directly in the GRN database.

```json
{
  "cityName": "Miami",
  "countryCode": "US",
  "limit": 50
}
```

### 3. `get_hotel_availability`
Get rates and availability for specific GRN hotel codes.

```json
{
  "hotelCodes": ["H!0049396", "H!0018105"],
  "checkin": "2025-03-15",
  "checkout": "2025-03-18",
  "rooms": [{"adults": 2}],
  "currency": "USD"
}
```

### 4. `get_hotel_reviews`
Fetch reviews for a hotel using its Google Place ID.

```json
{
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "sortBy": "newestFirst",
  "limit": 10
}
```

### 5. `search_reviews`
Search within hotel reviews for specific topics.

```json
{
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "query": "breakfast quality",
  "fetchLimit": 20
}
```

### 6. `enrich_hotels_with_rates`
Combined search: Find hotels, match with GRN, get availability.

```json
{
  "location": "New York City",
  "query": "Times Square",
  "checkin": "2025-04-01",
  "checkout": "2025-04-05",
  "rooms": [{"adults": 2}, {"adults": 2, "childrenAges": [5, 8]}],
  "currency": "USD"
}
```

### 7. `get_full_hotel_details`
Get complete hotel info: Google data, rates, and reviews.

```json
{
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "grnHotelCode": "H!0049396",
  "checkin": "2025-03-15",
  "checkout": "2025-03-18",
  "rooms": [{"adults": 2}],
  "reviewLimit": 5
}
```

## Hotel Matching Algorithm

The server uses a sophisticated matching algorithm to link Google hotels with GRN database entries:

1. **Fuzzy Name Matching**: Uses Fuse.js for approximate string matching on hotel names
2. **Address Matching**: Secondary matching on address components
3. **Geo-coordinate Proximity**: Boosts match confidence for hotels within 500m
4. **Match Score**: Returns confidence score (0-100%) for each match

## Response Examples

### Enriched Hotel Response

```json
{
  "success": true,
  "searchId": "abc123",
  "hotels": [
    {
      "google": {
        "placeId": "ChIJ...",
        "name": "Grand Hyatt Miami",
        "address": "123 Beach Blvd",
        "latitude": 25.7617,
        "longitude": -80.1918
      },
      "grn": {
        "hotel_code": "H!0049396",
        "name": "Grand Hyatt Miami Beach",
        "star_rating": 5
      },
      "matchScore": 92.5,
      "availability": {
        "available": true,
        "minRate": {
          "price": 299.00,
          "currency": "USD"
        },
        "rates": [...]
      }
    }
  ]
}
```

## Database Schema

The server connects to the GRN static database:

| Table | Purpose |
|-------|---------|
| `hotel` | Hotel master data with codes, names, coordinates |
| `city` | City reference data |
| `country` | Country reference data |

## Error Handling

All tools return structured error responses:

```json
{
  "success": false,
  "error": "Description of error",
  "stack": "..." // Only in DEBUG mode
}
```

## Rate Limiting

- **SERP API**: Check your plan limits at serpapi.com
- **Google Maps Grounding Lite**: 100 QPM/project, 1,000/day
- **GRN Connect**: Sandbox has limited inventory

## License

MIT

## Author

MiniMax Agent
