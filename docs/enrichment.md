# Business Enrichment – Manual Snapshots

## Overview

Business enrichment in AI Biz Bot is an **admin-only, explicitly triggered** workflow.
It is **not** automated or run on every request.

The voice assistant path (real-time discovery) continues to use Google Maps Grounding
Lite / the Google ecosystem. Enrichment is a separate admin-controlled path used to
build a persistent business knowledge library for analytics and competitive insight.

---

## When Enrichment Runs

Enrichment runs only when an admin explicitly triggers it, either via:

- The admin panel "Enrich this business" button (calls `POST /api/admin/enrich-business`)
- A future admin agent workflow tool (`enrich_business_profile`)

---

## Database Tables

### `platform_business_map`

One row per onboarded platform (business). Acts as the stable identity anchor.

| Column            | Type        | Description                                             |
|-------------------|-------------|---------------------------------------------------------|
| `platform_id`     | varchar PK  | Stable UUID assigned at onboarding (the `platformId`)   |
| `site_config_id`  | varchar FK  | FK to `site_configs(id)` ON DELETE CASCADE              |
| `serpapi_data_id` | text        | Cached SerpApi `data_id` for google_maps engines        |
| `google_place_id` | text        | Google Place ID (if known)                              |
| `created_at`      | timestamptz | Row creation time                                       |
| `updated_at`      | timestamptz | Last update time                                        |

### `platform_business_enrichment_snapshots`

Raw provider payloads stored per `platformId`. Append-only; each enrichment run
inserts new rows (use `force=true` to re-enrich after an existing snapshot exists).

| Column         | Type        | Description                                                   |
|----------------|-------------|---------------------------------------------------------------|
| `id`           | varchar PK  | Auto-generated UUID                                           |
| `platform_id`  | varchar FK  | FK to `platform_business_map(platform_id)` ON DELETE CASCADE  |
| `provider`     | text        | Provider identifier (see below)                               |
| `provider_ref` | text        | Optional provider-specific key (e.g. SerpApi `data_id`)       |
| `payload`      | jsonb       | Raw provider response or merged response                      |
| `created_at`   | timestamptz | Snapshot creation time                                        |

**Indexes:** `platform_id`, `provider`, `(platform_id, provider)` composite.

---

## Providers

| Provider string                       | Description                                              |
|---------------------------------------|----------------------------------------------------------|
| `serpapi_google_maps_place`           | SerpApi `google_maps` engine with `type=place` response  |
| `serpapi_google_maps_reviews_merged`  | Merged SerpApi `google_maps_reviews` pages (paginated)   |

---

## Admin API

### `POST /api/admin/enrich-business`

Requires admin authentication (`x-admin-token` header or `admin_session` cookie).

**Request body:**

```json
{
  "platformId": "uuid-of-platform",
  "maxReviews": 100,
  "force": false
}
```

| Field        | Type    | Default | Description                                          |
|--------------|---------|---------|------------------------------------------------------|
| `platformId` | string  | —       | Required. Must match an existing `platform_business_map` row. |
| `maxReviews` | integer | 100     | Max reviews to fetch (1–500). Paginated internally.  |
| `force`      | boolean | false   | If `false`, skips if a place-profile snapshot exists. |

**Response (200 / 422):**

```json
{
  "status": "enriched",
  "platformId": "uuid-of-platform",
  "artifacts": {
    "serpPlaceProfileStored": true,
    "serpReviewsStored": true,
    "reviewCount": 87,
    "serpapiDataId": "0x..."
  }
}
```

`status` is one of:
- `enriched` – new snapshots stored
- `already_enriched` – snapshot exists and `force=false`
- `failed` – see `reason` field

---

## SerpApi `data_id` Resolution

1. If `platform_business_map.serpapi_data_id` is already set, it is used directly.
2. Otherwise the service calls SerpApi `google_maps` engine with:
   - `q` = business name (from `site_configs.name`)
   - `ll` = `@lat,lng,14z` if geometry is available in `site_configs.place_data`
   - `type=search`
3. If a `data_id` is found, it is saved back to `platform_business_map`.
4. If no coordinates are available but `site_configs.place_id` is set, that value is
   used as a fallback `data_id`.

---

## Required Environment Variables

| Variable          | Purpose                              |
|-------------------|--------------------------------------|
| `SERPAPI_API_KEY` | Primary SerpApi key (preferred name) |
| `SERPAPI_KEY`     | Alternative name (also accepted)     |
| `SERP_API_KEY`    | Alternative name (also accepted)     |

---

## Security Notes

- This endpoint is admin-only. It must never be exposed to end users or the voice path.
- Full SerpApi payloads are **not** logged; only `platformId`, `provider`, `data_id`,
  and review counts are logged.
- Snapshots are stored as-is (raw JSON) for maximum flexibility in downstream analysis.
