# demo_surface_v1 — public marketing demo and `/biz` parity

**Purpose:** Canonical **public** first touch uses **public business chrome** (`/biz/:slug`), not the operator-heavy `/agent/:slug` surface for CTAs. Align Concierge **`business`** shape across both routes.

**Related:** [`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md), [`SHARED_CANVAS_V1.md`](../sdk/SHARED_CANVAS_V1.md), [`CONCIERGE_BUSINESS_CONTEXT_V1.md`](./CONCIERGE_BUSINESS_CONTEXT_V1.md).

---

## Canonical URLs

| Entry | Path |
|-------|------|
| Short demo | `/demo` → redirects to `/biz/<VITE_PUBLIC_DEMO_SLUG or ai-biz-bots>` |
| Public business | `/biz/:slug` |
| Owner / direct agent link | `/agent/:slug` (QR bar shows **public** URL as `/biz/:slug`) |

---

## Forbidden on marketing demo (`platformMarketingDemo`)

- Claim / “Is this your business?” banner (suppressed via `business.platformMarketingDemo`).
- DISC / emotion / sentiment footers under assistant bubbles.
- Non–communication tool panels in canvas (orchestration, business intelligence, etc.) — only `shared_canvas`, `manual_input`, `request_manual_input` render; others show a short “use voice” note.

---

## First-response affordance

While `connectionStatus === 'connecting'` or `isProcessing` on a live session, the canvas shows a **Connecting…** / **AI Biz Bot is responding…** strip so the UI never feels silent.

---

## Acceptance checks

- [ ] Home “Try a Demo” and QR point at `/demo` or `/biz/...`, not `/agent/...`.
- [ ] `/biz/:slug` and `/agent/:slug` use `buildConciergeBusinessFromSite` — same shell inputs for the same API payload.
- [ ] `readiness_gate_v1` stripped from React state on both pages after fetch.

---

## Document history

| Date | Notes |
|------|--------|
| 2026-03-25 | Slice: `/demo`, biz CTA parity, demo tool allowlist, status strip |
