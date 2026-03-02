# Doppler stg/prd alignment — Stripe & Twilio (Action Required)

Use this checklist to clear the remaining "Action Required" items in Doppler for **stg** and **prd**. Values are **not** stored in this repo; add them in the Doppler UI (or via CLI) using your dev export or Stripe/Twilio dashboards.

**Canonical token names (do not store in Doppler):** Use `DOPPLER_TOKEN_DEV`, `DOPPLER_TOKEN_STG`, `DOPPLER_TOKEN_PRD` only in each server's `.env`. The Doppler CLI reads `DOPPLER_TOKEN`; scripts use the matching _DEV/_STG/_PRD var per server. Do **not** create a secret named `DOPPLER_DEV_TOKEN` (wrong order); the manifest uses `DOPPLER_TOKEN_DEV`. If you have a typo `DOPLER_TOKEN` (one P) in any config, remove it — the product is **Doppler** (two P's).

---

## stg (staging) — 11 missing

Add these in **aibizbot-clearvoice → stg**:

| Secret | Where to get value |
|--------|--------------------|
| `STRIPE_PRICE_AI_PRO` | Copy from dev (same Stripe account) or use stage Stripe price ID |
| `STRIPE_PRICE_ENTERPRISE` | Copy from dev or stage Stripe |
| `STRIPE_PRICE_FREE` | Copy from dev or stage Stripe |
| `STRIPE_PRICE_PRO` | Copy from dev or stage Stripe |
| `STRIPE_PRICE_STARTER` | Copy from dev or stage Stripe |
| `TWILIO_MS_CUSTOMER_CARE` | Copy from dev (same A2P Messaging Service) or use stage Twilio MS SID |
| `TWILIO_MS_CUSTOMER_MKTG` | Copy from dev or stage |
| `TWILIO_MS_CUSTOMER_OTP` | Copy from dev or stage |
| `TWILIO_MS_PLATFORM_CARE` | Copy from dev or stage |
| `TWILIO_MS_PLATFORM_MKTG` | Copy from dev or stage |
| `TWILIO_MS_PLATFORM_OTP` | Copy from dev or stage |

**stg fixes from your export:**  
- Ensure `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` are **two separate** secrets; if they were pasted as one concatenated value, fix in Doppler.  
- `APP_URL` for stg should use **aibizbot-stage** (e.g. `https://aibizbot-stage.gatewayglobal.ai/...`), not `aibizbot-stag`.  
- `WEBHOOK_BASE_URL` for stg should be the stage base URL (e.g. `https://aibizbot-stage.gatewayglobal.ai`), not dev.

---

## prd (production) — 15 missing

Add these in **aibizbot-clearvoice → prd**:

| Secret | Where to get value |
|--------|--------------------|
| `STRIPE_PRICE_AI_PRO` | Prod Stripe price ID (or copy from dev if single Stripe account) |
| `STRIPE_PRICE_ENTERPRISE` | Prod Stripe |
| `STRIPE_PRICE_FREE` | Prod Stripe |
| `STRIPE_PRICE_PRO` | Prod Stripe |
| `STRIPE_PRICE_STARTER` | Prod Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API Keys (use **live** key for prod) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys (use **live** key for prod) |
| `STRIPE_TEST_CARD_NUMBER` | Optional for prod; can use `4242424242424242` for testing or omit |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint for **prod** URL |
| `TWILIO_MS_CUSTOMER_CARE` | Prod A2P Messaging Service SID or copy from dev |
| `TWILIO_MS_CUSTOMER_MKTG` | Prod or dev |
| `TWILIO_MS_CUSTOMER_OTP` | Prod or dev |
| `TWILIO_MS_PLATFORM_CARE` | Prod or dev |
| `TWILIO_MS_PLATFORM_MKTG` | Prod or dev |
| `TWILIO_MS_PLATFORM_OTP` | Prod or dev |

**prd fixes from your export:**  
- Do **not** store `DOPPLER_TOKEN` or `DOPPLER_DEV_TOKEN` in the **prd** config; tokens live only in each server’s `.env`. Remove them from prd if present.  
- If you have a key named `DOPLER_TOKEN` (one P), delete it; it’s a typo and nothing uses it.  
- `WEBHOOK_BASE_URL` for prd should be **https://aibizbot.gatewayglobal.ai** (prod), not dev.

---

## dev — one fix

- In **dev** config, set **`PORT_PRD`** to **`3002`** (prod port). Your export had `3005`; the canonical prod port is 3002 (see environment-management skill). This only matters if you run `npm run doppler:sync-ports` from a machine that has all three port vars.

---

## After you’re done

1. In Doppler, **Save** so stg and prd have the new values.  
2. On each server, ensure `.env` has only the **token** for that env (`DOPPLER_TOKEN` or `DOPPLER_TOKEN_STG` / `DOPPLER_TOKEN_PRD`).  
3. Restart with env refresh:  
   `pm2 restart aibizbot-stage.gatewayglobal.ai --update-env`  
   `pm2 restart aibizbot.gatewayglobal.ai --update-env`  
4. **Security:** The temp files under `user_uploads/` (e.g. `dev_doppler_yaml.tmp`, `stg_doppler_yaml.tmp`, `prd_doppler_yaml.tmp`) contain live secrets. Ensure `user_uploads/` is in `.gitignore` (or that `*.tmp` is) and delete those files after you’ve applied the values in Doppler so they never get committed.

---

## Reference

- Token names: [SOVEREIGN_ENV_MANIFEST.md](../SOVEREIGN_ENV_MANIFEST.md)  
- Ports and envs: [.cursor/skills/environment-management/SKILL.md](../../.cursor/skills/environment-management/SKILL.md) (dev 3004, stg 3003, prd 3002)  
- A2P / Twilio MS: [.cursor/skills/a2p-compliance/](../../.cursor/skills/a2p-compliance/)  
- Stripe price IDs: from Stripe Dashboard → Products → Prices (use the price_xxx IDs).
