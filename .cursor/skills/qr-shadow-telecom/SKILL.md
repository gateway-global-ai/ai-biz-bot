---
name: qr-shadow-telecom
description: QR codes (website by slug and route-based shadow telecom) — generate, wire to /biz/slug, access log and scan stats.
---
# QR Codes and Shadow Telecom

Use this skill when working with business QR codes, short redirect URLs, firewall rules, or scan analytics. The platform has two systems that both can land users on the same public business page and chat.

## Two Systems

| System | QR encodes | APIs / paths | Tracking |
|--------|------------|--------------|----------|
| **Website (slug)** | `{origin}/biz/{slug}` | `GET /api/qr/image/:slug`, `POST /api/qr/generate/:siteConfigId` | None |
| **Route (shadow telecom)** | `{QR_BASE_URL}/qr/{id}` | `GET /qr/:id` (redirect), `GET/POST/PATCH/DELETE /api/qr-routes`, `GET /api/qr-routes/:id/access-log` | `qr_access` + `scan_count` |

## Generating Website QR (by slug)

1. Site must have `site_configs.slug` set.
2. Call `POST /api/qr/generate/:siteConfigId` (idempotent) or hit `GET /api/qr/image/:slug` (generates on first request).
3. Image is saved under `uploads/qr/{slug}.png`; `site_configs.qr_code_url` is set to `/api/qr/image/:slug`.
4. Public URL: `{APP_URL}/biz/{slug}`. Use this in the QR or in route `destination` for route-based QRs.

## Generating Route QR (shadow telecom)

1. Create route: `POST /api/qr-routes` with `{ label?, destination?, siteConfigId? }`. Server generates UUID, builds route URL, generates PNG.
2. Set `destination` to the final URL (e.g. `https://aibizbot-dev.gatewayglobal.ai/biz/my-business-slug`). Set `siteConfigId` if you want site-level scan stats.
3. Route URL: `{QR_BASE_URL}/qr/{id}`. Serve image via `GET /api/qr-routes/:id/image`.
4. When someone scans: `GET /qr/:id` → firewall check → log in `qr_access` → increment `scan_count` → 302 to `destination`.

## Wiring Destination to /biz/slug

- For route-based QRs that should open the same business page as the website QR, set `destination` to the full public URL: `https://<your-domain>/biz/<slug>`.
- Same `site_configs` row drives chat/voice behavior; ConciergePanel fetches `GET /api/site-configs/:id` (handover protocol).

## Reading Access Log and Scan Stats

- **Per-route access log:** `GET /api/qr-routes/:id/access-log?page=1&limit=50` returns `{ logs, total }` from `qr_access` (ipAddress, userAgent, accessedAt, destination, wasBlocked, responseMs).
- **Per-route scan count:** Returned on each route in `GET /api/qr-routes` as `scanCount`.
- **Per-site scan stats:** `GET /api/site-configs/:id/qr-stats` returns `{ totalScans, byRoute: [{ routeId, label, scans }], last7Days, last30Days }` for all routes with that `site_config_id`.

## Key Files

- **Routes:** `server/routes/qrCodeRoutes.ts` (website), `server/routes/qrManagementRoutes.ts` (admin + redirect).
- **Services:** `server/services/qrCodeService.ts`, `server/services/qrRoutingService.ts`.
- **Storage:** `server/storage.ts` — getQrRoutes, getQrAccessLog, logQrAccess, incrementQrScanCount, getQrScanStatsBySite.
- **Schema:** `shared/schema.ts` — qr_routes, qr_firewall, qr_access; site_configs.slug, site_configs.qr_code_url.
- **UI:** `client/src/components/account/QRRoutesManager.tsx` (owner QR Network tab), `client/src/pages/admin/PlatformQRCodeManager.tsx` (platform tools).

## Firewall Rules (route-based)

- `GET/POST /api/qr-routes/firewall/rules`; body `{ qrRouteId?, ruleType, value }`. `ruleType`: `allow_ip` | `deny_ip` | `allow_ua` | `deny_ua` | `rate_limit`. `qrRouteId` null = global rule.

## Slug landing tracking (website QR)

- Optional: when the public page is opened with `?from=qr`, the client fetches `/api/site-configs/by-slug/:slug?from=qr` and the server records one row in `slug_landings` (site_config_id, source `qr`). Use this to attribute landings to website QR; table `slug_landings`, storage `recordSlugLanding`.

## Rule

- See `.cursor/rules/qr-system.mdc` for lockdown: no new QR routes in `routes.ts`; behavior from `site_configs`.
