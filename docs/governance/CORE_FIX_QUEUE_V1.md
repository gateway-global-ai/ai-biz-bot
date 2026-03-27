# Core fix queue (v1)

**Status:** Populated from triage run **2026-03-25** (`npm run check`). **Latest full baseline:** **0** errors — `npm run check` **passes** (`tsc` exit 0), **2026-03-25** (storefront + workspace + P3/tools sweep).

**Rule:** Prefer fixing these before spending time on P3/showcase debt.

## Queue

| Order | File | Errors | Severity | Blocked by | Suggested reviewer | Status |
|-------|------|--------|----------|------------|--------------------|--------|
| 1 | server/routes/billingRoutes.ts | 12 | P0 | — | billing | **done** (2026-03-25): `../stripeClient`, `../services/*`, `handleClaimCheckoutCompleted` from `./claimRoutes` |
| 2 | server/routes/a2pRoutes.ts | 2 | P0 | — | platform | **done** (2026-03-25): `import { getTwilioClient } from "../twilio"`; removed unused `twilio` default import |
| 3 | server/routes/claimRoutes.ts | 7 | P1 | Normalize `req.params` to `string` before Drizzle `eq()` | platform | **done** (2026-03-25) — see execution log §#3 below |
| 4 | server/routes/agentSystemRoutes.ts | 5 | P1 | Same param normalization pattern | platform | **done** (2026-03-25) — see execution log §#4 below |
| 5 | server/routes.ts | 7 | P1 | VLM retire / MCP 410 (was: dead storage APIs) | platform | **done** (2026-03-25) — see execution log §#5–6 below |
| 6 | server/storage.ts | 3 | P1 | `structuredControls` + QR `search` narrow | platform | **done** (2026-03-25) — see execution log §#5–6 below |
| 6a | server/routes/inquiry-routes.ts | 6 | P1 | `paramString`, status coerce, stats before `:id` | platform | **done** (2026-03-25) — see execution log §#6a below |
| 7 | server/services/systemInstructionBuilder.ts | 3 | P1 | — | platform | **done** (2026-03-25): `OwnerSpecificData.publicAmenities` on [`businessDataService.ts`](../../server/services/businessDataService.ts) (aligned with [`ownerDataService.ts`](../../server/services/ownerDataService.ts)) |
| 8 | server/routes/novaSovereignRoutes.ts | 6 | P1 | — | platform | **done** (2026-03-25): dedupe `eq` import; `storage` from `../storage`; `paramString` for params; `randomBytes` from `node:crypto`; drop unused `customerAccounts` |
| 9 | client/src/pages/public/PlatformHomePage.tsx | 1 | P1 | — | platform | **done** (2026-03-25): `CanonicalProduct` + `badge?`; dropped `as const` on `CANONICAL_PRODUCTS` |
| 10 | server/routes/businessRoutes.ts | 1 | P1 | — | platform | **done** (2026-03-25): `id: placeId` + `paramString` on `:placeId` routes |
| 11 | server/routes/businessTelephonyRoutes.ts | 1 | P1 | — | platform | **done** (2026-03-25): `await getTwilioClient()` (6 call sites) |
| 12 | server/routes/qrCodeRoutes.ts | 3 | P2 | — | registry | **done** (2026-03-25): `paramString` for `slug` / `siteConfigId` |
| 13 | server/routes/platformProductRoutes.ts | 10 | P2 | — | platform | **done** (2026-03-25): `paramString` for `:id` on PATCH/DELETE/image/generate-image |

## Done

_(Optional: move fully completed rows here; execution detail lives in the log below.)_

### Execution log (done): route param band — queue rows 3–4

**#3 — `server/routes/claimRoutes.ts`**

- **Root cause:** Express types `req.params` as `string | string[]`; Drizzle `eq(column, value)` and string helpers require a single `string` → TS2769 / TS2345 on assign + claim-token routes.
- **Fix pattern:** Local `paramString(v)` coerces `string | string[] | undefined` → first string; early `400` when `siteId` or `token` missing after coerce.
- **Errors removed:** **7** (all `claimRoutes.ts` diagnostics cleared in `npm run check` for that file).

**#4 — `server/routes/agentSystemRoutes.ts`**

- **Root cause:** Same `req.params` union; `storage.getAgent` / `updateAgent` / `deleteAgent` expect `string` → TS2345 on five `:id` handlers; DISC `setNumber` needed a single string before `parseInt`.
- **Fix pattern:** Same `paramString()`; `400` if `id` missing; `paramString(req.params.setNumber)` + `parseInt(..., 10)` for DISC set route.
- **Errors removed:** **5** (all `agentSystemRoutes.ts` diagnostics cleared in `npm run check` for that file).

**Verification:** `npm run check 2>&1 | grep -E 'claimRoutes|agentSystemRoutes'` → no lines (post-fix). Full project baseline before **#5 / #6** was **73** errors.

### Execution log (done): VLM retire + storage — queue rows 5–6

**Branch chosen:** **Remove / 410** VLM-dependent monolith surface (not v1-core); **no** `DatabaseStorage` VLM method resurrection.

**#5 — `server/routes.ts`**

- **410 `GET /api/admin/sites/leads`** — JSON `{ code: VLM_LEADS_RETIRED, error: … }`; removed `getVlmProspects` merge logic.
- **`POST /api/admin/command-chat`** — stripped `getVlmProspects` / `getVlmCampaigns`, prospect/campaign stats, “Recent Prospects” block, and VLM capability bullets from system prompt; context remains sites / visitors / messages / customers.
- **`POST /api/mcp/code`** — hard **410** (same message family as `/api/mcp/tools*`), removed dead `ModelOptions` path.
- **Errors removed from monolith file:** **7**; **Delta:** full-project errors **73 → 63** (−10; remainder includes other files).

**Client:** [`client/src/pages/owner/SitesAndLeads.tsx`](../../client/src/pages/owner/SitesAndLeads.tsx) — `queryFn` treats 410 as `vlmRetired`; amber notice + empty-state copy.

#### Audit record — APIs retired & owner UI (2026-03-25)

_Single place for “what was removed” so later diffs stay auditable._

| Category | What changed |
|----------|----------------|
| **API retired** | **`GET /api/admin/sites/leads`** → **410** + body `{ code: VLM_LEADS_RETIRED, error: … }` (VLM prospect merge gone for v1). |
| **API retired** | **`POST /api/mcp/code`** → **410** only (same policy as **`GET /api/mcp/tools`**, **`POST /api/mcp/tools/:toolName`**); legacy handler / `ModelOptions` path removed. |
| **Command-chat** | **`POST /api/admin/command-chat`** — VLM **scope removed**: no `getVlmProspects` / `getVlmCampaigns`; no prospect/campaign counts or “Recent Prospects” in context; system prompt no longer claims lead-quality scoring or VoiceLeadMachine campaign strategy from that data. Context = sites, visitors, messages, customers only. |
| **Owner UI** | **Sites & Leads → Leads tab:** `queryFn` maps **410 → `{ leads: [], vlmRetired: true }`**; **amber banner** explains retirement; **empty state** distinguishes retired surface vs “no rows yet” — **no silent break**, no fabricated leads. |

**Metric:** full-project `npm run check` **error TS line count 73 → 63** after this pass (snapshot date 2026-03-25).

**#6 — `server/storage.ts`**

- **`createAgent` / `updateAgent`:** normalize `structuredControls` through `StructuredControls` cast; `updateAgent` `.set(...)` via `Partial<InferInsertModel<typeof agents>>`.
- **`getQrRoutes`:** `trimmedSearch` local so `sql` id match is not `search` possibly undefined.
- **Errors removed:** **3** for this file (`npm run check` shows no `server/storage.ts` lines).

### Execution log (done): inquiry-routes — queue row 6a

**#6a — `server/routes/inquiry-routes.ts`**

- **Root cause:** Express `req.params.id` is `string | string[]`; `storage.updateInquiry` returns `Inquiry | undefined`; row `status` is `string | null` while `Partial<InsertInquiry>` expects the governed enum.
- **Fix pattern:** Local `paramString()` + `400` when id missing after coerce; `coerceInquiryStatus()` maps unknown/null → `"new"` before computing viewed transition; `500` if mark-viewed update returns no row; PATCH `updates` typed as `Partial<InsertInquiry>` (no `any`).
- **Routing fix:** **`GET /api/inquiries/stats` registered before `GET /api/inquiries/:id`** so `stats` is not captured as a dynamic id (prior order bug).
- **Errors removed:** **6** for this file; **Delta:** full-project **`63 → 57`** (`npm run check` error line count, 2026-03-25).

### Preflight record (historical) — queue rows 5–6

**Principle:** Narrow route files can be fixed directly; **monolith `routes.ts` + `storage.ts` are structural** — pick an explicit strategy before editing. **Executed choice:** fork **#3 (remove/410)** for VLM; storage **local contract cleanup** only.

#### Full-check snapshot (2026-03-25)

| Metric | Value |
|--------|--------|
| Total TS errors | **73** |
| `server/routes.ts` only | **7** |
| `server/storage.ts` only | **3** |

#### #5 — `server/routes.ts` (7 errors)

| Location | Code | Issue |
|----------|------|--------|
| ~1894, ~1961 | TS2339 | `storage.getVlmProspects` not on `DatabaseStorage` |
| ~1962 | TS2551 | `storage.getVlmCampaigns` not on `DatabaseStorage` |
| ~1897, ~1967–1968 | TS7006 | `.find` / `.filter` callback param `p` implicitly `any` |
| ~2082 | TS2552 | `ModelOptions` not defined (`/api/mcp/code` handler) |

**Dependent callers / coupling:** VLM calls are **only** from this monolith (`/api/admin/sites/leads`, admin command-chat context). No other file references `getVlmProspects` / `getVlmCampaigns` (see repo search). Triage already notes missing storage APIs: [TECHNICAL_DEBT_TRIAGE_REPORT.md](./TECHNICAL_DEBT_TRIAGE_REPORT.md), [artifacts/error_triage.yaml](./artifacts/error_triage.yaml).

**Decision fork (choose before coding):**

1. **Implement** `getVlmProspects` / `getVlmCampaigns` on `DatabaseStorage` (+ schema if tables exist), **or**
2. **Stub** safe empty implementations + types until VLM is real, **or**
3. **Remove or 410** the admin routes / context branches that call them (dead product path), **or**
4. **Extract** these handlers to a modular router (still must resolve storage contract).

**`ModelOptions`:** define/import a minimal type, or remove/guard the legacy `/api/mcp/code` path consistently with MCP 410 routes nearby.

**VLM / admin “dead block” removal in scope?** **Yes — explicitly in scope** as an option; triage recommends fix *or* extract *or* align storage.

#### #6 — `server/storage.ts` (3 errors)

| Location | Code | Issue |
|----------|------|--------|
| ~496 | TS2769 | `createAgent` insert: `structuredControls` shape `{ mirroring?: unknown; … }` not assignable to `StructuredControls` |
| ~503 | TS2345 | `updateAgent` same `structuredControls` mismatch |
| ~1550 | TS18048 | `search` possibly `undefined` |

**Schema / contract?** **`structuredControls` is contract-affecting** — ties `InsertAgent` / updates to shared `StructuredControls` (not local-only). The `search` fix is **local** (narrowing / default).

**Docs / rules / skills sync?**

- **Likely no** for a pure typing/narrowing fix if behavior unchanged.
- **Yes if** VLM methods are added/removed or admin routes are retired — update triage YAML row, optional note in modular-routing / archive governance if routes are quarantined.

### Execution log (done): storefront + P3 client + tools — **32 → 0** errors

| Area | Change |
|------|--------|
| **storefrontRoutes** | `paramString()`; normalized `placeId`, `siteConfigId`, `categorySlug` for Drizzle + `getPlaceDetails`. |
| **Client admin** | `TransparencyDashboard` / `CallTracking`: search icon via `relative` + `pl-9` (shadcn `Input` has no `icon` prop). |
| **Showcase** | `EventSearchPanel`: step type includes `status`. `SdkShowcase`: `WidgetChatMessage` union state. `TestB2b`: ternary for `rawResponse` / `net_price` (no `unknown` React child). |
| **os-core** | `Slider`: optional `disabled` forwarded to `<input type="range">`. |
| **Tools** | `cloudbedsSwarmTools`: `getVerificationSkillsFromSiteConfig(siteRow.metadata)`. `dataIngestionHandler`: `reviews as unknown as …`; markdown uses `owner_insights.action_plan`. `grnHotelsHandler`: `String(grn_hotel_id)` for `toGrnApiCode`. |

_Note: `workspaceRoutes` Google Tasks routes and several other items were already aligned in-tree (`getWorkspaceCredentialsBySiteConfigId`, `pitchDeck` `firstRouteParam`, `bailRescue` Stripe API version, `commission` schema columns, `aiStudioProxy` token coalesce) before this sweep; this log covers the remaining delta that cleared the last **32** diagnostics._

## References

- Triage: [TECHNICAL_DEBT_TRIAGE_REPORT.md](./TECHNICAL_DEBT_TRIAGE_REPORT.md)
- YAML: [artifacts/error_triage.yaml](./artifacts/error_triage.yaml)
