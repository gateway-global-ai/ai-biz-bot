# B2B Multi-Agent and Corporate Lock – Test Verification

Use these steps to verify the B2B system and test portal.

---

## 0. Quick-Fix: Empty or non-JSON response / id undefined

If the frontend or relay script sees **empty or non-JSON** (e.g. `Unexpected token '<', "<!DOCTYPE "...`), or the seed script fails with **"id undefined"** when creating the Dubai Luxury Break itinerary, the client is receiving an HTML page (404/500) or non-JSON instead of the API response. This is almost certainly **wrong port** or **server/DB down**.

**PORT vs .env:** The server uses `process.env.PORT || "5000"`. With `.env` loaded (e.g. `PORT=3004`) the app listens on 3004; without `.env` (e.g. some npm run setups) it may be on 5000. Scripts use `API_BASE` (or `http://localhost:PORT`) – they must match the **actual** server port.

**Checklist:**

1. **Server entry point** – B2B routes are registered in `server/routes.ts` via `registerB2bRoutes(app)` (called inside `registerRoutes()`). No separate `app.use('/api/b2b', ...)` in `server/index.ts`; the main app gets all routes from `registerRoutes()` before Vite/static catch-all.
2. **Single server / PORT** – Ensure scripts use the same port as the running server (see PORT vs .env above).
3. **Backend and DB** – If the server crashed (e.g. Postgres connection refused), restart it and ensure PostgreSQL is accepting connections. Check the terminal where the app runs for errors.

**What to run**

1. **Verify B2B routes and port (JSON handshake):**
   ```bash
   npx tsx tests/debug-b2b-routes.ts
   ```
   If your server is on 5000:
   ```bash
   API_BASE=http://localhost:5000 npx tsx tests/debug-b2b-routes.ts
   ```
   You want `[OK]` for the B2B routes. If you see `[HTML]`, the URL (port) is wrong or the server isn’t serving the API.

2. **Seed using the same port as in step 1:**
   - With server on 3004 (e.g. started with .env):
     ```bash
     API_BASE=http://localhost:3004 npx tsx tests/seed-b2b-demo.ts
     ```
   - With server on 5000:
     ```bash
     API_BASE=http://localhost:5000 npx tsx tests/seed-b2b-demo.ts
     ```

3. **If it still fails:** Check the terminal where the app runs for "Postgres Connection Refused" or other errors; ensure PostgreSQL is up and `DATABASE_URL` in `.env` is correct.

Running the debug script first with the port your server actually uses will confirm the JSON handshake; then run the seed with the same `API_BASE`.

---

## 1. Backend: Multi-Agent Relay Simulation

Run the Continental Handshake (Master Orchestrator ↔ Maps Specialist) and Thought Signature persistence test:

```bash
npx tsx tests/simulate-travel-relay.ts
```

**With server running (e.g. `npm run serve` or `npm run dev`; port from `PORT` in `.env`, default 5000):**

- `[RELAY] Initializing Maps Specialist` – Orchestrator hands off the geographical query.
- `thought_signature:` – Long hex string; verify it is re-injected in the follow-up PATCH.
- `Lead Scraper results` – POI/BigQuery-style analysis (Dubai Marina).

**Without server:** The script still prints the thought_signature and Lead Scraper mock so you can confirm log shape. The script uses `API_BASE` / `API_URL` / `SERVER_URL` or `http://localhost:PORT` (from env, default 5000) so it matches the server port.

---

## 2. Seed Dubai & Las Vegas (GRN Connect demo)

Populate the portal with high-value leads before the meeting:

```bash
# With server running (same port as PORT in .env, default 5000)
npx tsx tests/seed-b2b-demo.ts

# Or explicit base: API_BASE=http://localhost:3004 npx tsx tests/seed-b2b-demo.ts
```

This creates:

- **Dubai:** Burj Al Arab Jumeirah (GRN-DXB-9921), Emirates JFK→DXB flight (SERP-EK-DXB-441).
- **Las Vegas:** The Venetian Las Vegas (GRN-LAS-7721).
- **In-progress itinerary:** VIP-CLIENT-001 / "Dubai Marina" with thought state for the Master Orchestrator.

The `/test-b2b` page loads leads from `GET /api/b2b/hotels` and `GET /api/b2b/flights`, so after seeding you will see Burj Al Arab, The Venetian, and Emirates in the Leads column.

---

## 3. Frontend: B2B Agent Portal

1. Start the app: `npm run dev` (or `npm run serve` if using production build).
2. Open: **http://localhost:5000/test-b2b** (or your dev port, e.g. **http://localhost:3004/test-b2b**).

**Live demo (stateful reveal):**

- **Persistence proof:** Drag "Burj Al Arab Jumeirah" (or any seeded lead) into the Itinerary Canvas, then **refresh the page**. The item stays (persisted via `POST /api/b2b/itineraries/:id/items`).
- **Audit trail:** In the terminal or DB, show `b2b_curation_events`: timestamped log e.g. `[added] lead_id: <hotel_id>`.
- **Markup:** Use the commission slider on each card; **Selling Price** updates in real time (net rate stays in DB; selling price is net + markup).
- **Fallback:** If no seeded data exists, the page creates one demo hotel and one demo flight on load.

---

## 4. UI: Corporate Lock Audit

Check that design tokens are applied:

- **Chat widget:** Dark blue header (#1E3A8A), pink send button (#E91E63).
- **Voice Concierge:** Pink pulse animation, clean white backdrop.
- **Landing pages:** `/` and `/landing-v2` – high-contrast corporate white baseline, no dark gradients.

(Exact tokens and components are defined in your design system; this is a checklist for visual QA.)

---

## 5. Database: Schema Verification

On the dev server:

```bash
# Idempotent setup (optional)
./script/setup-db-server.sh

# List tables – you should see B2B tables
sudo -u postgres psql -d gateway_ai -c "\dt"
```

Expected B2B tables: `b2b_hotels`, `b2b_flights`, `b2b_agent_markups`, `b2b_itineraries`, `b2b_itinerary_items`, `b2b_curation_events`.

---

## Final verification before GRN meeting

1. **Seed the data:** `npx tsx tests/seed-b2b-demo.ts`
2. **Verify tables:** `sudo -u postgres psql -d gateway_ai -c "\dt"` (confirm all `b2b_` tables exist)
3. Open `/test-b2b`, confirm Burj Al Arab, The Venetian, and Emirates appear in Leads; drag one into the itinerary and refresh to confirm persistence.
