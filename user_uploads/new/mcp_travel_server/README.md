# Hotel Search MCP Server

Hotel search functionality integrated with the Gateway Global AI platform. Communicates with **Google Maps**, **Google Places**, and **GRN Connect** to provide hotel search, availability, and rates for the chat interface and PTT (Push-to-Talk) voice technology.

## Features

### Core Capabilities

- **POI Autocomplete** – Google Places Autocomplete for locations, airports, landmarks
- **Hotel Search** – Search by location or near a Point of Interest (POI)
- **GRN Database Search** – Direct query of the GRN Connect hotel database by city
- **Hotel Availability** – Live rates and availability from GRN Connect
- **Combined Search + Rates** – One-shot enrichment: search hotels and get rates
- **Reviews** – Hotel reviews from Google Maps via SERP API
- **Place Details** – Google Place details for UI Kit integration

### Integrations

| Service        | Purpose                         |
|----------------|---------------------------------|
| Google Maps    | Maps Grounding Lite hotel search|
| Google Places  | Autocomplete, place details     |
| GRN Connect    | Live rates and availability     |
| SERP API       | Google Maps reviews             |
| GRN Database   | Static hotel master data        |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Chat / Voice   │────▶│  Gemini 3.0      │────▶│  MCP Hotels     │
│  (PTT Widget)   │     │  Flash + Tools   │     │  Executor       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cursor / Other │────▶│  MCP Streamable  │────▶│  mcp-hotels-    │
│  MCP Clients    │     │  HTTP /mcp/hotels│     │  logic (APIs)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Deployment

### MCP Server URL

- **Development:** `https://aibizbot-dev.gatewayglobal.ai/mcp/hotels`
- **Production:** `https://aibizbot.gatewayglobal.ai/mcp/hotels`

### Endpoints

| Method | Path        | Description                    |
|--------|-------------|--------------------------------|
| POST   | /mcp/hotels | MCP JSON-RPC (init, requests)  |
| GET    | /mcp/hotels | SSE stream (server events)     |
| DELETE | /mcp/hotels | Session termination            |

### Environment Variables

| Variable           | Description                          |
|--------------------|--------------------------------------|
| GRN_API_KEY        | GRN Connect API key                  |
| GOOGLE_MAPS_API_KEY| Google Maps API key                  |
| GOOGLE_PLACES_KEY  | Google Places API key                |
| SERPAPI_KEY        | SERP API key (reviews)               |
| DB_HOST            | GRN static DB host                   |
| DB_PORT            | GRN DB port                          |
| DB_NAME            | Database name (e.g. static_master)   |
| DB_USER            | DB user                              |
| GRN_STATIC_KEY     | DB password                          |

## Cursor Configuration

Add the Hotel MCP server to Cursor’s MCP config (`~/.cursor/mcp.json` or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "hotels": {
      "url": "https://aibizbot-dev.gatewayglobal.ai/mcp/hotels"
    }
  }
}
```

## Chat Integration

Hotel search is wired into:

1. **PTT Voice** – Gemini 3.0 Flash with hotel tools; user can ask for hotels by voice.
2. **Text Chat** – Same tools available when the chat backend uses Gemini with tools.

## SDK Definitions

See the root project’s `sdk-definitions.yaml` for parameter specs, types, and required fields for each tool.

## Project Structure

```
user_uploads/new/mcp_travel_server/
├── hotel-mcp-server/     # Original standalone MCP (stdio)
│   └── src/index.js
├── hotel-search-ui/      # React UI for hotel search
├── README.md             # This file

# Integrated into main app:
server/
├── mcp-hotels.ts         # MCP server + Streamable HTTP routes
├── mcp-hotels-logic.ts   # API logic (Google, GRN, SERP)
├── mcp-hotels-executor.ts# Tool executor for voice/chat
```

## Testing

Use the project root’s `tests/test-mcp-hotels.ts` to exercise the MCP endpoint and tool execution.
