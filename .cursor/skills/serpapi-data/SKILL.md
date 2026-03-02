---
name: serpapi-data
description: Expert in SerpApi MCP — the universal data layer for all agents. Covers Google Flights, Google Maps, Google Search, Reviews, Social Media, Shopping, Travel, Restaurants, and more via the hosted MCP server at https://mcp.serpapi.com/.
---
# SerpApi Data Skill

SerpApi is the **universal search data layer** for every agent on this platform. Via the hosted MCP server at `https://mcp.serpapi.com/`, agents access Google Flights, Google Maps, Google Search, Reviews, Social Media, Shopping, and Restaurants through a single standardised tool interface.

Each agent has an **explicit allow-list** of SerpApi engines (`serpApiTools` in its configuration). Admins control this per-agent via:

```
GET  /api/agents/:id/serp-tools   → returns current allow-list
PATCH /api/agents/:id/serp-tools  → body: { "serpApiTools": ["engine_a", "engine_b"] }
```

## Secret Management

- **Secret name:** `SERP_API_KEY` (project-wide convention; matches `.env.example`, `gen-cursor-mcp.sh`, and Doppler — never committed)
- **Generate `.cursor/mcp.json`:** `npm run mcp:generate`
- **Reference:** `.cursor/MCP_SETUP.md` § 4

## Available Data Engines (MCP Tools)

| Engine | Category | Owning Agent Template | SerpApi Reference |
|---|---|---|---|
| `google_flights` | Travel | `travel-flight` (exclusive) | https://serpapi.com/google-flights-api |
| `tripadvisor_search` | Travel | `travel-flight` | https://serpapi.com/tripadvisor-search-api |
| `google_hotels` | Travel | `travel-flight` | https://serpapi.com/google-hotels-api |
| `google_travel_explore` | Travel | `travel-flight` | https://serpapi.com/google-travel-explore-api |
| `google_maps` | Local / Business | `google-places-swot`, `ai-biz-bot` | https://serpapi.com/google-maps-api |
| `google_maps_reviews` | Local / Business | `google-places-swot` | https://serpapi.com/google-maps-reviews |
| `google_local_results` | Local / Business | `ai-biz-bot` | https://serpapi.com/google-local-results |
| `google_search` | General | Any | https://serpapi.com/search-api |
| `facebook_profile` | Social Media | `social-media` (exclusive) | https://serpapi.com/facebook-profile-api |
| `amazon_search` | Shopping | `shopping` | https://serpapi.com/amazon-search-api |
| `home_depot_search` | Shopping | `shopping` | https://serpapi.com/home-depot-search-api |
| `walmart_search` | Shopping | `shopping` | https://serpapi.com/walmart-search-api |
| `google_shopping` | Shopping | `shopping` | https://serpapi.com/google-shopping-api |
| `open_table` | Restaurants | `restaurant` (exclusive) | https://serpapi.com/open-table-reviews-api |

## Per-Agent Tool Control

Every agent template declares a default `serpApiTools` allow-list. Admins can override the list per deployed agent via the API:

```bash
# See which SerpApi engines agent "agent-abc" can call
curl /api/agents/agent-abc/serp-tools

# Grant only Google Maps to this agent
curl -X PATCH /api/agents/agent-abc/serp-tools \
  -H "Content-Type: application/json" \
  -d '{"serpApiTools": ["google_maps"]}'

# Disable all SerpApi access
curl -X PATCH /api/agents/agent-abc/serp-tools \
  -H "Content-Type: application/json" \
  -d '{"serpApiTools": []}'
```

Default allow-lists by template:

| Template | Default `serpApiTools` |
|---|---|
| `travel-flight` | `google_flights`, `tripadvisor_search`, `google_hotels`, `google_travel_explore` |
| `social-media` | `facebook_profile` |
| `shopping` | `amazon_search`, `home_depot_search`, `walmart_search` |
| `restaurant` | `open_table` |
| `google-places-swot` | `google_maps`, `google_maps_reviews` |
| `ai-biz-bot` | `google_maps`, `google_local_results` |

## Flight Search Tool (Travel Agent Scope)

The `google_flights` engine is **scoped exclusively to the Travel Flight Agent** (`travel-flight` template). Other agents must not call `google_flights` directly.

### Key Parameters

```typescript
{
  engine: "google_flights",
  departure_id: "LAS",          // IATA code
  arrival_id: "MXP",            // IATA code
  outbound_date: "2026-02-04",  // YYYY-MM-DD
  return_date: "2026-02-22",    // YYYY-MM-DD (omit for one-way)
  currency: "USD",
  hl: "en",
  api_key: process.env.SERP_API_KEY
}
```

### Response → Itinerary Integration

Flight results from SerpApi map directly to `FlightOffer` in `client/src/types/flight.ts` and the B2B storage at `server/routes/b2b-routes.ts` (`POST /api/b2b/flights`):

```typescript
// server/tools/flightParser.ts already handles YAML-spec flights.
// For live SerpApi results, map the response fields:
{
  bookingToken: result.booking_token,
  departureId:  result.flights[0].departure_airport.id,   // IATA
  arrivalId:    result.flights[result.flights.length-1].arrival_airport.id,
  rawResponse:  result
}
```

### Flight Animations → Gemini 2.5 Flash Native Audio

When a flight is selected in an itinerary, the Travel Agent triggers the cinematic flight animation pipeline:

1. **Map `FlightOffer`** coords (`departureCoords`, `arrivalCoords`, `layoverCoords`) from the SerpApi result
2. **`parseFlightSpec()`** in `server/tools/flightParser.ts` can parse YAML coordination specs into `FlightOffer[]`
3. **`animateNavigation()`** (see `client/src/components/chat/gemini_2_5_flash_react_instructions/maps/flight_visualizer.md`) drives the map camera
4. **Audio narration** is injected at "descent altitude" (zoom > 15) via the `models/gemini-2.5-flash-native-audio-preview-12-2025` pipeline (see `.cursor/skills/gemini-live-engine/SKILL.md`)

## Google Maps Tool (Business Enrichment)

The `google_maps` engine powers business data enrichment. The `data_id` field from results maps to `serpapi_data_id` in `platform_business_map` (see `serpapi/README.md`).

## Social Media Agent (Facebook Profile)

The `social-media` agent uses the `facebook_profile` engine to look up Facebook business pages via the chat input field. Input: a Facebook profile URL, username, or business name.

## Shopping Agent (Amazon · Home Depot · Walmart)

The `shopping` agent searches across all three retailers and presents a price comparison table. It automatically selects the best engine(s) based on product category (e.g., Home Depot for construction supplies).

## Restaurant Agent (OpenTable)

The `restaurant` agent uses the `open_table` engine for reservation availability and review data. When invoked inside a travel itinerary, it auto-routes to restaurants near the hotel or event venue using the waypoint logic: Hotel → Breakfast → Event → Lunch → Dinner → Hotel.

## References

- Hosted MCP: `https://mcp.serpapi.com/`
- Cursor config: `.cursor/mcp.example.json`, `.cursor/MCP_SETUP.md`
- Agent templates: `server/agents/specialized-agents.ts`
- Tool control schema: `server/agents/agent-types.ts` → `serpApiTools`
- Tool control API: `server/agents/agent-routes.ts` → `GET/PATCH /api/agents/:id/serp-tools`
- B2B itinerary API: `server/routes/b2b-routes.ts`
- Flight types: `client/src/types/flight.ts`
- YAML parser: `server/tools/flightParser.ts`
- Animation docs: `client/src/components/chat/gemini_2_5_flash_react_instructions/maps/flight_visualizer.md`
- SerpApi Google Maps API docs: `client/src/components/chat/gemini_2_5_flash_react_instructions/serpAPI/serpAPI_google_maps/`
