# Concierge business context V1

**Builder:** [`client/src/lib/conciergeBusinessContext.ts`](../../client/src/lib/conciergeBusinessContext.ts) — `buildConciergeBusinessFromSite(siteData, slug)`.

**Consumers:** [`PublicBusinessPage`](../../client/src/pages/public/PublicBusinessPage.tsx), [`AgentPage`](../../client/src/pages/agents/AgentPage.tsx).

## Shell-affecting fields

| Field | Source | Notes |
|-------|--------|--------|
| `workspaceState` | `site_configs.workspace_state` | Default `'demo'` if missing (matches prior Agent behavior). |
| `claimStatus`, `ownerId`, `plan` | site row | |
| `platformMarketingDemo` | `metadata.platformMarketingDemo` **or** `slug === VITE_PUBLIC_DEMO_SLUG` (default `ai-biz-bots`) | Suppresses claim banner / demo-only UX. |
| Identity / place | `placeData` + `siteData` | `id`, `name`, `address`, `types`, `phone`, `rating`, map coords, `heroImageUrl`, etc. |

## Readiness

Server may attach `readiness_gate_v1` on `GET /api/site-configs/by-slug/:slug`. **Strip** before `setSiteData` — do not store in Concierge `business` for v1.
