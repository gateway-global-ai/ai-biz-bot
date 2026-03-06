# Hospitality Package

One-page reference for the **hospitality / hotel** industry package: how to turn on voice AI, booking UI, and Cloudbeds for a new hotel site.

## What’s included

| Item | Location | Purpose |
|------|----------|---------|
| **Cloudbeds docs** | `docs/knowledge-base/cloudbeds/` | API reference, OAuth, booking flow, validation, workflows. |
| **Hospitality templates** | `scripts/seed-industry-templates.ts` → `hospitality_travel` | Six archetypes (concierge, booking_coordinator, lead_qualifier, retention_empath, billing_analyst, gatekeeper) with defaultTools: `get_business_details`, `get_place_ui_data`, `search_grn_hotels`, `enrich_hotels_with_rates`. |
| **Booking block (UI)** | `client/src/components/HotelBookingBlock.tsx` | Rates & availability below the hero on `WebsitePreview`; shown when `place.types` includes lodging/hotel and `siteConfigId` is present. |
| **Hotel availability API** | `GET /api/site-configs/:id/hotel-availability` | GRN-backed room/rates for a site linked via `platform_business_map` + `b2b_hotels`. |
| **Cloudbeds API** | `GET /api/cloudbeds/availability` | Cloudbeds getAvailableRoomTypes when `CLOUDBEDS_API_KEY` and `CLOUDBEDS_PROPERTY_ID` (or query `propertyId`) are set. |

## How to turn on for a new hotel

1. **Create the site** (e.g. via demo flow or owner dashboard) with a place that has `types` including `lodging` or `hotel` so the booking block shows.
2. **Pass `siteConfigId`** into `WebsitePreview` (BusinessPage and CustomerSiteManager already do this when the site exists).
3. **GRN path**: Link the site to GRN by creating a row in `platform_business_map` (siteConfigId → platformId) and a row in `b2b_hotels` (platformId, hotelCode). Then `GET /api/site-configs/:id/hotel-availability` returns live rates and the booking block displays them.
4. **Cloudbeds path**: Set Doppler (or env) `CLOUDBEDS_API_KEY`, `CLOUDBEDS_PROPERTY_ID`. Optionally store Cloudbeds property ID per site (e.g. in site config) and have the booking block or a proxy call `GET /api/cloudbeds/availability?propertyId=...&checkIn=...&checkOut=...`.
5. **Agent team**: On site create, `provisionAgentsForBusiness` runs with `placeTypes` from the business; if types map to `hospitality_travel`, the six hospitality archetypes are provisioned with the hotel tools above.

## Voice AI

- Voice uses the same site config and `knowledgeLibrary.agents` / `sovereignTruths` (see `server/geminiVoice.ts`). No extra step for voice beyond creating the site and (optionally) configuring agents in the Concierge Panel.
- Tools available to the voice agent for hospitality include `get_hotel_inventory` (GRN) and can be extended to Cloudbeds availability when configured.

## First run / demo

Boardwalk Suites Lafayette was the first run of the [Industry Package Playbook](INDUSTRY_PACKAGE_PLAYBOOK.md). Extract and analysis: `boardwalk-rewards-extract/`, `boardwalk-rewards-extract/ANALYSIS.md`.
