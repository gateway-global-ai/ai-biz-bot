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
| `getOrCreatePlatformId(siteConfigId)` | Returns the existing `platform_id` for the given site config, or lazily creates one (copying `google_place_id` from `site_configs.place_id` if present). |
| `resolvePlatformId({ siteConfigId })` | Same as `getOrCreatePlatformId` but returns the full mapping row. |
| `resolvePlatformId({ googlePlaceId })` | Returns the mapping row if found; does **not** create a new mapping from a place ID alone (prevents cross-wiring). |

### Example

```typescript
import { storage } from './storage';

// Resolve (or create) the platform_id for a site:
const platformId = await storage.getOrCreatePlatformId('site-config-uuid');

// Full mapping row via siteConfigId (creates if missing):
const mapping = await storage.resolvePlatformId({ siteConfigId: 'site-config-uuid' });

// Look up by Google place_id (read-only – no implicit creation):
const mapping2 = await storage.resolvePlatformId({ googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' });
if (mapping2) {
  console.log(mapping2.platformId); // stable internal UUID
}
```

## SerpApi Integration (Option A)

See [`../serpapi/README.md`](../serpapi/README.md) for details on how the
`serpapi_data_id` column will be populated and how the SerpApi MCP server is
referenced without vendoring the full server code.
