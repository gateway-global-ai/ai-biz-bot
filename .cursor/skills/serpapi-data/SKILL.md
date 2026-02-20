---
name: serpapi-data
description: Expert in SerpApi MCP — the universal data layer for all agents. Covers Google Flights, Google Maps, Google Search, Reviews, and more via the hosted MCP server at https://mcp.serpapi.com/.
---
# SerpApi Data Skill

SerpApi is the **universal search data layer** for every agent on this platform — not just Cursor agents. Via the hosted MCP server at `https://mcp.serpapi.com/`, agents can access Google Flights, Google Maps, Google Search, Reviews, Shopping, and more through a single, standardised tool interface.

## Secret Management

- **Secret name:** `SERP_API_KEY` (project-wide convention; matches `.env.example`, `gen-cursor-mcp.sh`, and Doppler — never committed)
- **Generate `.cursor/mcp.json`:** `npm run mcp:generate`
- **Reference:** `.cursor/MCP_SETUP.md` § 4

## Available Data Engines (MCP Tools)

| Engine | Use Case |
|---|---|
| `google_flights` | Flight search → powers Travel Agent + itinerary + cinematic animations |
| `google_maps` | POI search, business data, `data_id` / `serpapi_data_id` enrichment |
| `google_search` | General web search and grounding |
| `google_maps_reviews` | Business reviews for SWOT analysis |
| `google_local_results` | Local business ranking and insights |
| `google_shopping` | Product search for e-commerce agents |

## Flight Search Tool (Travel Agent Scope)

The `google_flights` engine is **scoped exclusively to the Travel Agent and Assistant** (`travel-flight` agent template in `server/agents/specialized-agents.ts`). Other agents must not call `google_flights` directly.

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

## Broader Agent Usage

All specialized agents (see `server/agents/specialized-agents.ts`) can request SerpApi data **through the Travel Agent** for flight context, or directly for:
- **AI Biz Bot** → `google_maps` for business competitor data
- **Google Places SWOT Agent** → `google_maps_reviews` for review sentiment
- **Master Orchestrator (Travel OS)** → `google_flights` delegated to the Travel Flight Agent

## References

- Hosted MCP: `https://mcp.serpapi.com/`
- Cursor config: `.cursor/mcp.example.json`, `.cursor/MCP_SETUP.md`
- Agent template: `server/agents/specialized-agents.ts` → `TRAVEL_FLIGHT_AGENT`
- B2B itinerary API: `server/routes/b2b-routes.ts`
- Flight types: `client/src/types/flight.ts`
- YAML parser: `server/tools/flightParser.ts`
- Animation docs: `client/src/components/chat/gemini_2_5_flash_react_instructions/maps/flight_visualizer.md`
- SerpApi Google Maps API docs: `client/src/components/chat/gemini_2_5_flash_react_instructions/serpAPI/serpAPI_google_maps/`
