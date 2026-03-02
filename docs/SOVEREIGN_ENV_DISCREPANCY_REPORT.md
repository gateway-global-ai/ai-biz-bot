# Sovereign Environment Discrepancy Report

Generated from the NOVA Sovereign "Genetic Alignment" Audit. This report lists mismatches between `.env.example`, the active codebase (`/server`, `/client`), and Doppler/docs. The Naming Constitution is in [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md).

---

## A. Used in code but NOT declared in .env.example

### Critical (core product)

| Variable | Notes |
|----------|--------|
| **GEMINI_API_KEY** | Code uses everywhere; .env.example had only `GOOGLE_API_KEY` for "Google Gemini". docs/API_KEYS_DOPPLER.md states canonical name is `GEMINI_API_KEY`. |
| **NOVA_RSA_PUBLIC_KEY** | In .env.example as commented only; should be uncommented with placeholder for Nova Sovereign. |
| **APP_URL** | Used for Stripe success/cancel and reseller URLs; .env.example has CLIENT_URL/SERVER_URL/API_URL but not APP_URL. |

### High (aliases / optional but referenced)

| Variable | Notes |
|----------|--------|
| GEMINI_MODEL_ID, GEMINI_WS_URL, GEMINI_MODEL, GEMINI_MODEL_FALLBACK | Not in .env.example. |
| GOOGLE_CLOUD_API_KEY | Used as alias; .env.example has GOOGLE_CLOUD_PROJECT_ID and GOOGLE_API_KEY. |
| GOOGLE_MAPS_GROUNDING_LITE_API_KEY / MAPS_GROUNDING_LITE_API_KEY | Not in .env.example (docs/API_KEYS_DOPPLER mentions them). |
| GOOGLE_MAPS_JS_API / GOOGLE_MAPS_JS_KEY | Not in .env.example (client Maps JS key). |
| SERPAPI_API_KEY / SERPAPI_KEY | .env.example has SERP_API_KEY only; code accepts all three. |
| HF_TOKEN | Code uses; .env.example has HUGGINGFACE_TOKEN only (alias). |
| MOONSHOT_API_KEY | Code uses; .env.example has KIMI_API_KEY (same product, naming split). |
| STRIPE_A2P_WEBHOOK_SECRET | Used in routes; not in .env.example. |
| TWILIO_ACCOUNT_PHONE_NUMBER / TWILIO_PHONE_NUMBER_BOT | Aliases for TWILIO_PHONE_NUMBER; not documented. |

### Medium (optional / test / deployment)

| Variable | Notes |
|----------|--------|
| TEST_PLACE_ID, TEST_BUSINESS_NAME | Tests and server; not in .env.example. |
| WEBHOOK_BASE_URL, REPLIT_DEPLOYMENT_URL, REPLIT_DEV_DOMAIN, REPLIT_DOMAINS, REPL_SLUG, REPL_OWNER | Replit/deploy; intentionally not in .env.example. |
| SKIP_TWILIO_VALIDATION, ADMIN_ALERT_PHONE, CUSTOMER_PLACE | Optional / test. |
| GOOGLE_SERVICE_ACCOUNT_JSON, PLATFORM_SENDER_EMAIL, SERPAPI_NUM_REVIEWS | Optional (email, demo). |
| GRN_ENDPOINT, GRN_STATIC_KEY | GRN B2B. |
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | Legacy mcp-hotels (alternate to DATABASE_URL). |
| GOOGLE_PLACES_KEY | Legacy mcp-hotels (alternate name). |
| API_BASE, VITE_API_PROXY, VITE_API_TARGET | Build/dev proxy. |

### Client / Vite (must prefix VITE_)

| Variable | Notes |
|----------|--------|
| VITE_TELEPHONY_API_URL, VITE_GOOGLE_MAP_ID, VITE_GOOGLE_MAP_ID_MIDNIGHT | Used in client; not in .env.example. |
| VITE_GOOGLE_MAPS_KEY | Referenced in docs under client; not in .env.example. |

---

## B. In .env.example but naming mismatch vs code/docs

| Issue | Resolution |
|--------|------------|
| **GOOGLE_API_KEY vs GEMINI_API_KEY** | .env.example documented "Google Gemini" as GOOGLE_API_KEY; code and docs use GEMINI_API_KEY as canonical. Add GEMINI_API_KEY to .env.example; keep GOOGLE_API_KEY for non-Gemini Google APIs. |
| **HUGGINGFACE_TOKEN vs HF_TOKEN** | .env.example has HUGGINGFACE_TOKEN; server uses HF_TOKEN in several files. Document alias in manifest and .env.example. |
| **KIMI_API_KEY vs MOONSHOT_API_KEY** | .env.example has KIMI_API_KEY; code uses MOONSHOT_API_KEY. Same product; canonical KIMI_API_KEY, alias MOONSHOT_API_KEY documented. |

---

## C. Doppler / docs naming inconsistency

| Location | Issue |
|----------|--------|
| docs/API_KEYS_DOPPLER.md (lines 89, 104–105) | References `DOPPLER_SERVICE_TOKEN` and `DOPPLER_TOKEN_STAGE`. Canonical names per .cursor/rules/doppler-cli.mdc are `DOPPLER_TOKEN` and `DOPPLER_TOKEN_STG` (not STAGE). |

No typo "DOPLER" found in codebase.

---

## Reference: .env.example baseline (at audit time)

**Uncommented:** DATABASE_URL, KIMI_API_KEY, GOOGLE_API_KEY, REPLICATE_API_TOKEN, HUGGINGFACE_TOKEN, GOOGLE_MAPS_API_KEY, GOOGLE_PLACES_API_KEY, GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, NODE_ENV, PORT, HOST, WS_PORT, CLIENT_URL, SERVER_URL, API_URL, SESSION_SECRET, ENCRYPTION_KEY, ENABLE_* flags, LOG_LEVEL, DEBUG, RATE_LIMIT_*, MOCK_TWILIO_SMS, SERP_API_KEY.

**Commented only:** Doppler tokens, PORT_DEV/STG/PRD, NOVA_RSA_PUBLIC_KEY, Stripe price IDs, GRN_*, NUITEE_API_KEY, optional SMTP/Redis/Sentry/PostHog/VITE_PORT, etc.
