# Platform Identity Layer

## Overview

The **platform identity layer** introduces a stable internal UUID (`platform_id`) that
acts as the canonical anchor for every business in the system.

Previously, `place_id` (a Google-issued string) was used as a natural key across
multiple tables (`site_configs`, `business_data_cache`, `owner_business_data`, etc.).
This is brittle because:

- Google periodically rotates place IDs.
- Some businesses do not have a Google Places presence.
- Integrating additional data providers (e.g. SerpApi) creates conflicting keys.

## Architecture

```
site_configs (id = UUID)
        │
        │ 1:1
        ▼
platform_business_map
  ├── platform_id       ← stable internal UUID (primary key)
  ├── site_config_id    ← FK → site_configs.id (ON DELETE CASCADE)
  ├── google_cid        ← Google CID (unique, nullable)
  ├── google_place_id   ← Google place_id (nullable, indexed)
  ├── serpapi_data_id   ← SerpApi data_id (nullable, indexed)
  └── category_slug     ← optional category hint
```

The relationship is **1:1**: each `site_config` maps to at most one row in
`platform_business_map`.

## Migration

`migrations/0003_platform_business_map.sql` creates the table, indexes, and runs a
one-time backfill that copies `site_configs.place_id → google_place_id` for every
existing row that has a non-null `place_id`.  The backfill uses
`ON CONFLICT (site_config_id) DO NOTHING` and is therefore **idempotent**.

## Server Helper

`server/platformIdentity.ts` exposes three functions:

| Function | Description |
|---|---|
| `resolvePlatformId(siteConfigId)` | Returns the existing `platform_id` for the given site config, or lazily creates one (copying `google_place_id` from `site_configs.place_id` if present). |
| `findBySiteConfigId(siteConfigId)` | Returns the full mapping row or `null`. |
| `findByGooglePlaceId(googlePlaceId)` | Finds the mapping row by `google_place_id` or `null`. |

### Example

```typescript
import { resolvePlatformId, findByGooglePlaceId } from './platformIdentity';

// Resolve (or create) the platform_id for a site:
const platformId = await resolvePlatformId('site-config-uuid');

// Look up by Google place_id:
const mapping = await findByGooglePlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4');
if (mapping) {
  console.log(mapping.platformId); // stable internal UUID
}
```

## SerpApi Integration (Option A)

See [`../serpapi/README.md`](../serpapi/README.md) for details on how the
`serpapi_data_id` column will be populated and how the SerpApi MCP server is
referenced without vendoring the full server code.
