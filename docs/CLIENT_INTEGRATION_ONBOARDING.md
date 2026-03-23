# Client integration onboarding (PMS and similar)

This document fixes the common confusion between **platform secrets** (Doppler) and **tenant integration credentials** (database).

## Two layers

| Layer | Where it lives | Examples |
|--------|----------------|----------|
| **Platform** | Doppler (`doppler run`), never in repo | `DATABASE_URL`, `GEMINI_API_KEY`, Twilio, Stripe |
| **Tenant** | `site_pms_integrations` (per `site_config_id`) | Cloudbeds `api_key`, `property_id`, OAuth tokens |

**Production voice and tools** resolve Cloudbeds via `site_pms_integrations` (`server/tools/hotelInventoryHandler.ts` → `fetchCloudbedsAvailability`). They do **not** require a global `CLOUDBEDS_API_KEY` in Doppler.

Global `CLOUDBEDS_*` env vars are only for:

- Legacy `GET /api/cloudbeds/availability` (env-only handler), and
- Optional operator smoke tests / one-shot setup scripts.

## One command

```bash
npm run integration:readiness
```

Without Doppler (only `.env` / shell):

```bash
npm run integration:readiness:local
```

This prints what is set (lengths only, not values) and whether the Boardwalk demo row exists. It does not replace your security review; it replaces guesswork.

## Smooth onboarding flow (operators)

1. **Provision the site** (site config, agents, etc.) as you already do.
2. **Store the client’s PMS credentials** in `site_pms_integrations` for that site (`pms_type`, `property_id`, `api_key` or OAuth fields). Use a secure channel — admin UI, migration, or a setup script that reads from the shell once.
3. **Verify**: `npm run test:cloudbeds` — the **required** check is the DB + handler path; global `CLOUDBEDS_API_KEY` is **optional** (skipped if unset).
4. **Do not** create empty `CLOUDBEDS_API_KEY` in Doppler. An empty secret still **injects** under `doppler run` and can override a key you exported in the shell.

## Anti-patterns

- Expecting every client’s Cloudbeds key in **Doppler** — wrong model; use **per-site DB** (or a future vault keyed by `site_config_id`).
- Mixing **configs** (`dev` vs `dev_personal`) without matching the **token** scope — use `doppler configure get` and a token that can read that config.
- Running `doppler run` with placeholder secrets — they override environment and waste time.

## Cloudbeds (hotels): API key vs OAuth

**What works today (no hotel “login” channel required):**

- **Live rates / availability** for voice and tools: `get_hotel_inventory` → `fetchCloudbedsAvailability` using **`site_pms_integrations.api_key`** (`cbat_…`) as `x-api-key`, or **`access_token`** as Bearer if you store OAuth tokens.
- **Smoke test**: put the key in the environment the script sees (export before `doppler run`, or store in Doppler without an empty placeholder), ensure a PMS row exists (`npm run setup:boardwalk` or direct DB upsert), then `npm run test:cloudbeds`.

**Why reservation *posting* is different:**

- Many Cloudbeds apps are registered so **writes** (e.g. `postReservation`) expect **OAuth** (authorization code + **callback URL**), not only the static API key. Our integration historically optimized for **read** paths (`getAvailableRoomTypes`).
- The database already has **`access_token`**, **`refresh_token`**, **`token_expires_at`** on `site_pms_integrations` for when we wire token exchange.

**Callback URL (for portal registration):**

- Use: `https://<your-public-app-host>/api/cloudbeds/oauth/callback`
- A stub handler exists so the URL is real for Cloudbeds app setup; **token exchange and booking APIs are not implemented yet** — see `server/routes/cloudbedsRoutes.ts` (`GET /oauth/callback`).

**Practical booking until OAuth is done:**

- Direct guests to **`booking_engine_url`** / property booking link (stored on `site_pms_integrations.booking_engine_url` or site marketing URLs). The agent can quote inventory and hand off to the official booking URL.

**Reference:** `docs/knowledge-base/cloudbeds/supplemental/CLOUDBEDS_AUTHENTICATION_GUIDE.md` (API key vs OAuth scopes).

### Doppler env names (OAuth + API key)

Set in Doppler (or `.env`): `CLOUDBEDS_CLIENT_ID`, `CLOUDBEDS_CLIENT_SECRET`, `CLOUDBEDS_CLIENT_CALLBACK_URL` (must match `GET /api/cloudbeds/oauth/callback` on your public host), `CLOUDBEDS_CLIENT_API_KEY` (`cbat_…`) for `x-api-key` calls, and optionally `CLOUDBEDS_CLIENT_PROPERTY_ID` when a single property applies (used if `site_pms_integrations.property_id` is empty). `effectivePropertyId()` prefers the DB row, then `CLOUDBEDS_CLIENT_PROPERTY_ID`, then `CLOUDBEDS_PROPERTY_ID`.

### Authenticated HTTP API (owner session)

With a **customer** Bearer session (`requireCustomerAuth`):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cloudbeds/oauth/start?siteConfigId=` | Redirect to Cloudbeds authorize (OAuth) |
| GET | `/api/cloudbeds/oauth/callback` | Public; exchanges `code` → tokens (signed `state`) |
| GET | `/api/cloudbeds/reservations?siteConfigId=&…` | Proxies to Cloudbeds `getReservations` |
| GET | `/api/cloudbeds/reservation?siteConfigId=&reservationID=&…` | Proxies to `getReservation` |
| POST | `/api/cloudbeds/reservations` | Body JSON `{ siteConfigId, …postReservation fields }` → `postReservation` (defaults `sendEmailConfirmation: true`) |

## Related

- Schema: `migrations/0021_site_pms_integrations.sql`
- Handler: `server/routes/cloudbedsRoutes.ts` (`fetchCloudbedsAvailability`)
