# QR System Test Plan

Use this checklist to verify the two QR systems (website by slug and route-based shadow telecom), their connection to chat/website, behavior control, and tracking.

## 1. Slug resolution and public page

- [ ] **GET /api/site-configs/by-slug/:slug** — Returns 200 with site config when slug exists; 404 when slug does not exist.
- [ ] **Public page load** — Visiting `/biz/:slug` (valid slug) loads PublicBusinessPage, fetches config, renders WebsitePreview and ConciergePanel.
- [ ] **Slug landing tracking** — Visiting `/biz/:slug?from=qr` triggers a record in `slug_landings` (site_config_id, source=qr). Verify with a second request that the by-slug API is called with `?from=qr` and that a row appears in `slug_landings`.

## 2. Website QR (slug-based)

- [ ] **GET /api/qr/image/:slug** — Returns PNG (200). If no file exists, generates and saves QR encoding `{origin}/biz/{slug}`, updates `site_configs.qr_code_url`.
- [ ] **POST /api/qr/generate/:siteConfigId** — Idempotent; requires site to have slug. Returns publicUrl and slug.
- [ ] **GET /api/qr/search?q=...** — Returns list of sites with slug, including publicUrl and qrCodeUrl.

## 3. Route-based QR (shadow telecom)

- [ ] **GET /qr/:id** — With valid active route and destination: firewall passes, request is logged in `qr_access` (was_blocked false), `qr_routes.scan_count` incremented, 302 redirect to destination.
- [ ] **GET /qr/:id** — With inactive route (is_active false): logged in qr_access (was_blocked true), 404, scan_count not incremented.
- [ ] **GET /qr/:id** — With missing route or missing destination: 404 or "No destination assigned" as documented; no increment of scan_count when no redirect.
- [ ] **Firewall** — When a firewall rule blocks the request: 403, logged with was_blocked true, scan_count not incremented.

## 4. Route admin API

- [ ] **GET /api/qr-routes** — List routes (paginated, optional search).
- [ ] **POST /api/qr-routes** — Create route (label, destination, siteConfigId optional); route URL returned; QR image generated.
- [ ] **GET /api/qr-routes/:id** — Single route with routeUrl.
- [ ] **PATCH /api/qr-routes/:id** — Update destination, label, siteConfigId, is_active.
- [ ] **DELETE /api/qr-routes/:id** — Delete route (and QR file when present).
- [ ] **GET /api/qr-routes/:id/image** — Serve route QR PNG (generate if missing).
- [ ] **POST /api/qr-routes/:id/regenerate** — Regenerate PNG for same route URL.
- [ ] **GET /api/qr-routes/:id/access-log** — Paginated access log for that route.
- [ ] **GET/POST /api/qr-routes/firewall/rules** — List/create rules; DELETE .../firewall/rules/:id.

## 5. QR scan stats by site

- [ ] **GET /api/site-configs/:id/qr-stats** — Returns 200 with `{ totalScans, byRoute, last7Days, last30Days }` for routes that have this site_config_id. 404 when site does not exist.
- [ ] **Dashboard widget** — In owner UI, QR Network tab with site in context shows "Scan stats for this site" card with totalScans, last7Days, last30Days, and by-route breakdown when data exists.

## 6. Behavior and chat

- [ ] **Same behavior** — User lands on `/biz/:slug` (whether via website QR or via route redirect to `.../biz/:slug`). ConciergePanel receives same siteConfigId and fetches `GET /api/site-configs/:id`; chat/voice behavior is identical and driven by site_configs.

## 7. Optional: E2E

- [ ] Create a route with destination = `{origin}/biz/{slug}`. Scan (or open) `/qr/:id`. Confirm redirect to public page and that access log shows one entry and scan_count increased.
- [ ] Open `/biz/:slug?from=qr`. Confirm page loads and one row in `slug_landings` for that site_config_id.

## Reference

- Rule: `.cursor/rules/qr-system.mdc`
- Skill: `.cursor/skills/qr-shadow-telecom/SKILL.md`
- Research summary: plan "QR System Research Summary" (diagram, DB fields, APIs).
