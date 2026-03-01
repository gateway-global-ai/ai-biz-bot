# SerpApi – Option A (Spec-Only, No Vendor Code)

## Approach

We do **not** vendor the full [SerpApi MCP server](https://github.com/serpapi/serpapi-mcp).
Instead, this folder contains only the YAML / OpenAPI spec fragments we rely on, plus
a pinned version reference.

## Pinned upstream version

| Item | Value |
|---|---|
| Repository | `serpapi/serpapi-mcp` |
| Pinned commit | `main` (update to a specific SHA when the integration is hardened) |
| Reference link | https://github.com/serpapi/serpapi-mcp |

## How `serpapi_data_id` is populated

The `serpapi_data_id` column in `platform_business_map` is intended to store the
value returned in the `data_id` field of a SerpApi Google Maps / Local result.

Example SerpApi response fragment:

```json
{
  "local_results": [
    {
      "data_id": "0x89c24fa5abdbeadb:0x1fcd2ef01dc28ed5",
      "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "title": "Example Business"
    }
  ]
}
```

When a SerpApi search result is processed, call:

```typescript
import { db } from '../server/db';
import { platformBusinessMap } from '../shared/schema';
import { eq } from 'drizzle-orm';

await db
  .update(platformBusinessMap)
  .set({ serpapiDataId: result.data_id })
  .where(eq(platformBusinessMap.googlePlaceId, result.place_id));
```

## YAML spec placeholder

Add any YAML / OpenAPI spec files you need from the upstream MCP server here.
Until then this directory serves as a placeholder so the folder structure is
established.

## Future work

- Pin a specific commit SHA once the SerpApi MCP server API stabilises.
- Add relevant OpenAPI operation YAML files for the endpoints consumed.
- Wire `serpapi_data_id` lookups into the `resolvePlatformId` helper.
