# Pitch Deck Process — Deep Research to Presentation

This doc describes how to turn **deep research on businesses with strong market/product fit** into **pitch deck presentations** stored and viewed on the platform.

## Goal

To reach **30 million businesses**, we focus on:

- **Many locations** (franchises, chains, multi-site operators)
- **High call volume** (scheduling, intake, after-hours, overflow)
- **Good product/market fit** (repetitive, high-intent calls that map to revenue events)

Pitch decks are used for internal alignment, investor storytelling, and outreach to these verticals.

---

## 1. Running the Deep-Research Agent

- Use your preferred **deep-research** agent (external or internal) to produce a **report** for a given business or vertical.
- Inputs: business name, category, industry, and focus questions (locations, call volume, product/market fit).
- Output: a markdown or structured report with market size, locations, call patterns, and why the vertical fits Clear Voice AI.

---

## 2. Turning a Report Into a Deck

### Slide structure

Each deck has **metadata** and **content.slides**:

| Field | Description |
|-------|-------------|
| `slug` | URL-safe unique id (e.g. `the-joint-chiropractic`) |
| `title` | Deck title (e.g. "Clear Voice AI for The Joint Chiropractic") |
| `businessName` | Display name (e.g. "The Joint Chiropractic") |
| `category` | Short category (e.g. "Chiropractic") |
| `industry` | Broader industry (e.g. "Healthcare / Chiropractic") |
| `content.slides` | Array of slide objects (see below) |

Each **slide** in `content.slides`:

| Field | Required | Description |
|-------|----------|-------------|
| `sectionId` | Yes | Anchor id for nav (e.g. `market`, `product-fit`) |
| `label` | Yes | Nav label (e.g. "Market", "Product–Market Fit") |
| `title` | Yes | Section heading |
| `subtitle` | No | Short intro under the title |
| `bullets` | No | Array of strings (main content) |
| `highlight` | No | Single callout line (e.g. key takeaway) |

### Suggested slide flow

1. **Market** — Scale (locations, call volume), why this vertical matters for platform growth.
2. **Product–Market Fit** — Why this business type benefits from Voice AI (repetitive calls, clear revenue events).
3. **Why Gateway Global AI** — PTT, DiSC/ARCH, site config, sovereign sessions, telecom-grade tracking.
4. **Next Steps** — Pilot, roll-out, and how to replicate the process for other industries.

---

## 3. Storing a Deck

### Option A: API (authenticated)

```http
POST /api/pitch-decks
Content-Type: application/json
Authorization: <admin/auth cookie or header>

{
  "slug": "the-joint-chiropractic",
  "title": "Clear Voice AI for The Joint Chiropractic",
  "businessName": "The Joint Chiropractic",
  "category": "Chiropractic",
  "industry": "Healthcare / Chiropractic",
  "content": { "slides": [ ... ] }
}
```

- **409** if `slug` already exists.
- Use **list** to filter: `GET /api/pitch-decks?category=Chiropractic` or `?industry=Healthcare%20%2F%20Chiropractic`.

### Option B: Seed on server startup

- Add a new block in `server/index.ts` inside `seedPitchDecks()` (or a new seed function) that calls `storage.createPitchDeck(...)` if `getPitchDeckBySlug(slug)` returns nothing.
- Keeps “canonical” decks (e.g. The Joint) in code and ensures they exist in every environment.

---

## 4. Viewing a Deck

- **Public URL:** `https://<origin>/pitch-decks/<slug>`  
  Example: `https://aibizbot-dev.gatewayglobal.ai/pitch-decks/the-joint-chiropractic`
- The **PitchDeckViewer** page fetches `GET /api/pitch-decks/:slug` and renders:
  - Hero from deck metadata (title, business name, category, industry)
  - One full-width section per slide (nav, title, subtitle, bullets, highlight)
- Layout matches the investor-demo style: dark theme (`#0B1120`), indigo accents, scroll-to-section nav.

---

## 5. Checklist for Choosing Verticals

When selecting the next business/vertical for a deep-research report and deck:

- [ ] **Many locations** — Franchises, chains, or multi-site operators (e.g. 100+ units).
- [ ] **High call volume** — Phones are central (scheduling, intake, after-hours, overflow).
- [ ] **Good product/market fit** — Calls are repetitive and map to clear revenue events (bookings, signups, leads).
- [ ] **Category/industry** — Set `category` and `industry` so decks can be filtered (e.g. list all "Chiropractic" or "Healthcare" decks).

---

## 6. Systematic Process Summary

1. **Run deep-research agent** on a vertical (e.g. The Joint, dental groups, urgent care, fitness franchises).
2. **Draft slides** from the report using the slide structure above (Market → Product–Market Fit → Why Gateway Global AI → Next Steps).
3. **Store the deck** via `POST /api/pitch-decks` (or seed) with a unique `slug`, `category`, and `industry`.
4. **Share the viewer URL** `/pitch-decks/<slug>` for alignment and outreach.
5. **Repeat** for the next vertical; use `GET /api/pitch-decks?category=...` to manage by category/industry.

The Joint Chiropractic deck is the reference implementation: slug `the-joint-chiropractic`, category `Chiropractic`, industry `Healthcare / Chiropractic`. It is seeded on server startup if missing.
