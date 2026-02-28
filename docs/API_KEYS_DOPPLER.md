# API Keys & Doppler – AI Biz Bot Project

**Single source of truth for env var names.** Use Doppler (or `.env`) with these names so the app and tests stop reporting "API key not set."

Run the app and scripts with Doppler so keys are injected:

```bash
doppler run -- npm run dev
doppler run -- npm run test:bi
```

---

## Three-key strategy

| Key | Purpose | Restriction | Env var(s) | Exposed to client? |
|-----|---------|-------------|------------|---------------------|
| **Key 1 (server – Maps/Grounding)** | Grounding Lite, Places API (New), enrichment, place discovery | **IP** (server only) | `GOOGLE_MAPS_API_KEY`, `GOOGLE_API_KEY`; optional `GOOGLE_MAPS_GROUNDING_LITE_API_KEY` | No |
| **Key 2 (client)** | Maps JavaScript API, Places UI Kit (browser) | **HTTP referrer** (e.g. `*.gatewayglobal.ai/*`) | `GOOGLE_MAPS_JS_API`, `GOOGLE_MAPS_JS_KEY`, `VITE_GOOGLE_MAPS_KEY` (build) | Yes, via `/api/config/maps-key` or build only |
| **Key 3 (server – AI)** | LLM reasoning, grounded responses (Generative Language API) | **API service** (Generative Language API only); optionally IP | `GEMINI_API_KEY` | No, except intentional `/api/gemini-key` for Gemini Live |

Config endpoints must never return server keys (GEMINI_API_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_CLOUD_API_KEY). If using Gemini's native Maps Grounding tool, GEMINI_API_KEY and GOOGLE_MAPS_API_KEY can be the same key or two keys from the same project.

---

## Canonical names (set these in Doppler)

| Purpose | Canonical name(s) in Doppler / .env | App accepts (aliases) |
|--------|-------------------------------------|------------------------|
| **SERP (reviews)** | `SERP_API_KEY` or `SERPAPI_KEY` | `SERPAPI_API_KEY`, `SERPAPI_KEY`, `SERP_API_KEY` |
| **Google Maps / Places** | `GOOGLE_MAPS_API_KEY` or `GOOGLE_API_KEY` | `GOOGLE_MAPS_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_API_KEY`, `GOOGLE_PLACES_API_KEY` (varies by route) |
| **Place ID discovery (Grounding Lite)** | `GOOGLE_MAPS_GROUNDING_LITE_API_KEY` (optional) | `GOOGLE_MAPS_GROUNDING_LITE_API_KEY`, `MAPS_GROUNDING_LITE_API_KEY` — if unset, discovery falls back to Places API (New) searchText using the Maps key above |
| **Gemini (AI Studio)** | `GEMINI_API_KEY` | `GEMINI_API_KEY` only (must be from AI Studio, not a general Google key) |

Use **underscores** in variable names. Do not use hyphens (e.g. `GOOGLE_API_KEY` not `GOOGLE-API-KEY`); the app does not read hyphenated names.

| **NOVA Sovereign (IDV / Billing)** | `NOVA_RSA_PUBLIC_KEY` | RSA-4096 public key (PEM) for verifying `X-Nova-Signature` on `/api/nova/billing/*`. Set in Doppler **dev** (and stg/prd when using Nova). Without it, signed Nova endpoints return 503. |

---

## Scripts

| Command | Description |
|---------|-------------|
| `./scripts/run-with-doppler.sh dev` | Run app with Doppler |
| `./scripts/run-with-doppler.sh test:bi` | Run BI pipeline tests with Doppler |
| `./scripts/run-with-doppler.sh check-keys` | Run permit diagnostics only |
| `./scripts/run-with-doppler.sh dev --check` | Run permit check first, then dev if pass |
| `npm run check-keys` | Same as `doppler run -- npx tsx scripts/check-google-key-permissions.ts` |
| `npm run db:migrate:nova` | Run Nova IDV sessions migration (requires Doppler **dev** + `DATABASE_URL`) |
| `npm run doppler:copy-config` | Copy Doppler secrets from dev to stg and prd (see [Duplicate / migrate secrets](#duplicate--migrate-secrets-between-configs)) |

To verify keys after enabling APIs or changing restrictions:

```bash
doppler run -- npx tsx scripts/check-google-key-permissions.ts
```

Optional one-time setup: `scripts/google-api-keys-setup.sh` (if added) for gcloud key creation and restriction; then add printed keys to Doppler.

---

## Duplicate / migrate secrets between configs

To copy secrets from one Doppler config to another (e.g. **dev → stg** and **dev → prd**) using the CLI:

```bash
./scripts/doppler-copy-config.sh
```

Defaults: source config **dev**, target configs **stg** and **prd**. Uses the current Doppler project from `doppler configure get project`. Override with env vars:

- `FROM_CONFIG=stg` – copy from stg instead of dev  
- `TO_CONFIGS="prd"` – copy only to prd  
- `PROJECT=your-app-name` – use a specific project  

Requires **jq**. Reference: [Doppler – Duplicate/migrate secrets](https://docs.doppler.com/docs/how-do-i-duplicate-migrate-secrets-between-configs).

**Rule 2 (Sovereign):** After every **feature merge** that touches env or secrets, force-sync Doppler to match `.env.example`: ensure every key from `.env.example` exists in Doppler dev, add any missing with real values, then run `npm run doppler:copy-config` so stg/prd receive them. See [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md).

**Do not store Doppler token vars in Doppler.** Keep `DOPPLER_TOKEN` and `DOPPLER_TOKEN_DEV` / `DOPPLER_TOKEN_STG` / `DOPPLER_TOKEN_PRD` only in each server's `.env`. The CLI copy script excludes them; **if you use the Doppler web UI** to duplicate/copy config (dev → stg/prd), do not add these keys to Doppler, or exclude them in the UI when copying — otherwise the web copy can overwrite stg/prd with the dev token. Best practice: never add `DOPPLER_TOKEN*` to any Doppler config. Use `DOPPLER_TOKEN_DEV` (not `DOPPLER_DEV_TOKEN`) on dev as source of truth. Optional: set `DOPPLER_EXPECT_ENV=dev` (or `stg`/`prod`) so `GET /api/health` can verify the token matches this environment.

---

## NOVA Sovereign (dev server)

On the **dev server** (port 3004, Doppler config `dev`):

1. **Run the migration** (creates `nova_idv_sessions` per constitution):
   ```bash
   doppler run -- npm run db:migrate:nova
   ```
   Ensure `DOPPLER_TOKEN` or `DOPPLER_TOKEN_DEV` (or `doppler login` / `doppler configure`) is set so Doppler can inject `DATABASE_URL`. See [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md) for canonical token names.

2. **Set the Nova public key** in Doppler for dev:
   ```bash
   doppler secrets set NOVA_RSA_PUBLIC_KEY="$(cat /path/to/nova_public.pem)"
   ```
   Or add `NOVA_RSA_PUBLIC_KEY` in the [Doppler dashboard](https://dashboard.doppler.com) (dev config) with the PEM string.  
   To copy this key to stg/prd later: `COPY_KEYS="NOVA_RSA_PUBLIC_KEY" npm run doppler:copy-config`.

---

## Stage server (PM2)

The **stage** app (`aibizbot-stage.gatewayglobal.ai`) runs from a **separate repo** (`aibizbot-stage.gatewayglobal.ai/`). Its PM2 ecosystem loads **that repo’s** `.env`, not this one. If stage shows “Doppler Error: you must provide a token”, add to the **stage** repo’s `.env` (with real values, not empty):

- `DOPPLER_TOKEN=<same value as in dev .env>`, or  
- `DOPPLER_TOKEN_STG=<your stage config token>` (canonical: use `DOPPLER_TOKEN_STG`, not `DOPPLER_TOKEN_STAGE`)

Then `pm2 restart aibizbot-stage.gatewayglobal.ai`.

---

## Deployment notes

- **Billing:** Google requires an active billing account for Grounding Lite / Places (even on free tier).
- **Field mask:** Places API (New) requests must include `X-Goog-FieldMask`; omitting it can cause failures.
- **Propagation:** After enabling APIs or restricting keys in GCP, allow up to 5 minutes before running the permit check or health report.

---

## Reference: .env

Confirmed keys and permissions are documented in:

**`.env`** (project root) – section `##CONFIRMED API KEYS FOR AI BIZ BOT PROJECT`

Keep that section in sync with Doppler. For Google Cloud, ensure **Places API (New)** is enabled and allowed for the key if you use server-side Places (e.g. health report Test 2, enrichment).
