# Technical debt triage report

**Status:** Populated from `npm run check` (tsc).

**Last run:** 2026-03-25  
**Command:** `npm run check`  
**Total errors:** 99  
**Files with errors:** 29

## Summary

The repo does not typecheck clean: **99 errors** across **29 files**, concentrated in **billing** (broken imports to `stripeClient` and related services), **legacy `server/routes.ts`** (missing storage methods, undefined `ModelOptions`), **claim** and **agent** routes (Express `string | string[]` vs strict string), and **secondary** storefront/platform product routes. **P0** is dominated by **billing** and a **missing `getTwilioClient` import in `a2pRoutes`**. **Public home** (`PlatformHomePage`) has a single union/`badge` typing error. **Recommended next action:** execute [`CORE_FIX_QUEUE_V1.md`](./CORE_FIX_QUEUE_V1.md) top items (billing → A2P import → claim/agent param normalization → `routes.ts` / `storage` alignment) before broad storefront/workspace cleanup.

## Severity breakdown

| Severity | Error count | Notes |
|----------|-------------|--------|
| P0 | 14 | `billingRoutes.ts` (12) + `a2pRoutes.ts` (2) |
| P1 | 34 | Claim, monolith routes, Nova, agents, storage, systemInstructionBuilder, public home, business routes, telephony |
| P2 | 38 | Platform products, storefront, inquiry, workspace, QR, data ingestion, dashboards, commission, aiStudio proxy, CallTracking |
| P3 | 13 | os-core telemetry, SDK showcase, GRN/tools demos, pitch deck, bail rescue, TestB2b, EventSearch |

## Full table

_Order matches [artifacts/error_triage.yaml](./artifacts/error_triage.yaml)._

| File | Errors | Category | v1 relevance | Severity | Action | runtime_surface | affects_customer_ready |
|------|--------|----------|--------------|----------|--------|-----------------|------------------------|
| server/routes/billingRoutes.ts | 12 | core_runtime | critical | P0 | fix_now | public | false |
| server/routes/platformProductRoutes.ts | 10 | secondary_admin | medium | P2 | fix_now | admin | false |
| server/routes/storefrontRoutes.ts | 8 | secondary_admin | medium | P2 | defer | public | false |
| server/routes/claimRoutes.ts | 7 | core_runtime | critical | P1 | fix_now | public | true |
| server/routes.ts | 7 | core_runtime | high | P1 | fix_now | internal | false |
| server/routes/novaSovereignRoutes.ts | 6 | core_runtime | high | P1 | fix_now | public | true |
| server/routes/inquiry-routes.ts | 6 | secondary_admin | medium | P2 | defer | admin | false |
| server/routes/agentSystemRoutes.ts | 5 | core_runtime | critical | P1 | fix_now | public | true |
| server/routes/workspaceRoutes.ts | 4 | secondary_admin | medium | P2 | defer | admin | false |
| server/storage.ts | 3 | core_runtime | critical | P1 | fix_now | internal | true |
| server/services/systemInstructionBuilder.ts | 3 | core_runtime | high | P1 | fix_now | internal | true |
| server/routes/qrCodeRoutes.ts | 3 | secondary_admin | high | P2 | fix_now | public | false |
| os-core/src/views/system/SystemTelemetryView.tsx | 3 | r_and_d_legacy | low | P3 | defer | internal | false |
| client/src/pages/showcase/SdkShowcase.tsx | 3 | showcase_legacy | none | P3 | archive_candidate | public | false |
| server/tools/grnHotelsHandler.ts | 2 | r_and_d_legacy | low | P3 | archive_candidate | internal | false |
| server/tools/dataIngestionHandler.ts | 2 | secondary_admin | medium | P2 | defer | internal | false |
| server/routes/a2pRoutes.ts | 2 | core_runtime | critical | P0 | fix_now | admin | false |
| client/src/pages/biz-dashboard/TransparencyDashboard.tsx | 2 | secondary_admin | low | P2 | defer | admin | false |
| server/tools/cloudbedsSwarmTools.ts | 1 | r_and_d_legacy | low | P3 | archive_candidate | internal | false |
| server/services/commission.ts | 1 | secondary_admin | medium | P2 | defer | internal | false |
| server/routes/pitchDeckRoutes.ts | 1 | showcase_legacy | low | P3 | defer | public | false |
| server/routes/businessTelephonyRoutes.ts | 1 | core_runtime | high | P1 | fix_now | admin | false |
| server/routes/businessRoutes.ts | 1 | core_runtime | high | P1 | fix_now | public | true |
| server/routes/bailRescueRoutes.ts | 1 | showcase_legacy | none | P3 | archive_candidate | public | false |
| server/aiStudioProxy.ts | 1 | secondary_admin | medium | P2 | defer | internal | false |
| client/src/pages/showcase/TestB2b.tsx | 1 | showcase_legacy | none | P3 | archive_candidate | public | false |
| client/src/pages/public/PlatformHomePage.tsx | 1 | core_runtime | critical | P1 | fix_now | public | true |
| client/src/pages/biz-dashboard/CallTracking.tsx | 1 | secondary_admin | low | P2 | defer | admin | false |
| client/src/components/showcase/EventSearchPanel.tsx | 1 | showcase_legacy | none | P3 | archive_candidate | internal | false |

## Mounts and dependency risks

- **`server/routes.ts`** — **2026-03-25:** VLM-backed `GET /api/admin/sites/leads` and VLM context in admin command-chat **retired** (410 + stripped context); `/api/mcp/code` returns **410** aligned with other MCP routes. Monolith no longer references `getVlmProspects` / `getVlmCampaigns`. Further shrinking should follow [modular-routing](../../.cursor/rules/modular-routing.mdc).
- **`billingRoutes.ts`** — verify current `tsc` state in [CORE_FIX_QUEUE_V1.md](./CORE_FIX_QUEUE_V1.md) (P0 items were fixed 2026-03-25).
- **Showcase routes** (`/sdk`, `/test-b2b`) remain in [`client/src/App.tsx`](../../client/src/App.tsx); triage marks several as **archive_candidate** after human review.

## References

- Schema: [artifacts/error_triage.yaml](./artifacts/error_triage.yaml)
- Process: [TECHNICAL_DEBT_REDUCTION_PROCESS.md](./TECHNICAL_DEBT_REDUCTION_PROCESS.md)
- Skill: [`.cursor/skills/technical-debt-triage/SKILL.md`](../../.cursor/skills/technical-debt-triage/SKILL.md)
- Fix queue: [CORE_FIX_QUEUE_V1.md](./CORE_FIX_QUEUE_V1.md)
- Archive candidates: [ARCHIVE_CANDIDATES_V1.md](./ARCHIVE_CANDIDATES_V1.md)
