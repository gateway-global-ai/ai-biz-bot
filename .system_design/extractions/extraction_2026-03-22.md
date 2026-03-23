# Clean Room Extraction — Boardwalk-Rewards (2026-03-22)

## Source

- **Uploaded archive:** `user_uploads/new/Boardwalk-Rewards.zip` (~35 MB)
- **Integrity:** `unzip` / Python `zipfile` report **missing end-of-central-directory record** (truncated or incomplete upload). Full extraction is not possible from this file alone.
- **Fallback corpus:** Existing governed reference tree [`docs/knowledge-base/boardwalk-rewards-extract/`](../../docs/knowledge-base/boardwalk-rewards-extract/) (prior extract of the same project lineage). **No routing or server code from that tree is merged into runtime** — this report captures business and integration facts for KB seeding only.

## Security flags (do not merge raw code)

- Legacy extract `server/agent-tools.ts` patterns referenced **OpenAI** and **`CLOUDBEDS_API_KEY` + `PROPERTY_ID = "315701"`** inline. Gateway Global uses **Doppler**, **site-scoped** `site_pms_integrations`, and **Gemini** — do not copy env variable names or API client patterns into production without review.
- Skip `.git/`, `.local/state/`, and any credential artifacts if a future zip is complete.

## Cloudbeds (reference only)

- **Property ID** aligned with platform docs: **315701** (Boardwalk Suites Lafayette).
- Legacy flow called Cloudbeds API v1.3 `getAvailableRoomTypes` with `startDate`, `endDate`, `adults`, `children`, `rooms`, `detailedRates`. **Authoritative implementation** in this repo: [`server/routes/cloudbedsRoutes.ts`](../../server/routes/cloudbedsRoutes.ts), [`server/tools/hotelInventoryHandler.ts`](../../server/tools/hotelInventoryHandler.ts).

## Business copy for knowledge base (sanitized)

From [`design_guidelines.md`](../../docs/knowledge-base/boardwalk-rewards-extract/design_guidelines.md) and [`ANALYSIS.md`](../../docs/knowledge-base/boardwalk-rewards-extract/ANALYSIS.md):

- **Positioning:** Extended-stay / hospitality; rewards program messaging (**10% off** style offers appear in design spec — confirm current live marketing before asserting exact discounts).
- **Site sections (historical):** Home, Rooms, Booking, Groups, Promotion, Rewards, Amenities, Guest portal concepts.
- **Tone:** Professional hospitality; trust signals; clear booking CTAs; Lafayette / extended-stay context (align with live `placeData` and owner story).

## UI blueprint (reference — not imported as components)

- Inter + Playfair Display hierarchy; card-based room grids; rewards banner after hero; search/filter patterns — informs Sovereign / Jason Standard work separately; **no component merge** from extract.

## Mock / static data inventory

- Room-type shapes in legacy `checkAvailability` (roomTypeId, rates, max guests) — **demo KB** should not invent rates; use **Cloudbeds tool** or **hotel-availability API** for live numbers.

## Build notes

- Use **`scripts/demo-agent-boardwalk.ts`** (see repo) to merge **SerpAPI review digest**, **Places/quick facts**, and this **extraction summary** into `site_configs.knowledgeLibrary` for the Boardwalk site config.
- Quarry: uploaded zip left **unextracted** at full tree level; reference extract folder used. Remove any partial files under `/tmp/_quarantine_extraction` after review (if created).

## Incineration

- No persistent quarantine copy is required in-repo; `/tmp` extraction attempts only.
