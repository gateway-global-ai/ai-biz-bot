# Stripe billing: environments, webhooks, and catalog bootstrap

This runbook aligns **Doppler**, **Stripe Dashboard**, and the server’s [`server/stripeClient.ts`](../../server/stripeClient.ts) so subscription checkout, energy refills, and claim activation use the correct **account**, **mode** (test vs live), and **Price IDs**.

## Concepts

1. **Test vs live keys**  
   `sk_test_…` / `pk_test_…` vs `sk_live_…` / `pk_live_…` belong to the same Stripe account but **different catalogs**. Price IDs from test mode **do not** work with live keys and vice versa.

2. **One webhook endpoint per public base URL**  
   Stripe sends events to a full URL. Staging and production must each register **their own** endpoint and **their own** signing secret (`STRIPE_WEBHOOK_SECRET` or `STRIPE_A2P_WEBHOOK_SECRET`).

3. **Price IDs are not portable**  
   Copying `price_…` values from one Stripe account (or one mode) into another environment without creating matching Prices will break Checkout.

4. **Embedded fallbacks in code**  
   `stripeClient.ts` includes default `price_…` strings for some plans when env vars are unset. **Staging and production should set every `STRIPE_PRICE_*` in Doppler** so you never silently charge the wrong catalog.

## Environment checklist

Use one row per **Doppler config** (e.g. `dev`, `stg`, `prd`). Fill before go-live.

| Item | Dev (local) | Staging | Production |
|------|-------------|---------|------------|
| Stripe mode | Test | Test or live (team policy) | Live |
| `STRIPE_SECRET_KEY` | `sk_test_…` | `sk_test_…` or `sk_live_…` | `sk_live_…` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | matching mode | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (Stripe CLI or Dashboard) | endpoint-specific | endpoint-specific |
| `STRIPE_A2P_WEBHOOK_SECRET` | optional | if A2P enabled | separate from subscriptions |
| Public app URL | `APP_URL` / `SERVER_URL` | staging host | production host |

### Price ID variables (must match [`server/stripeClient.ts`](../../server/stripeClient.ts))

| Doppler key | Logical use |
|-------------|-------------|
| `STRIPE_PRICE_FREE` | Plan key `free` (subscription) |
| `STRIPE_PRICE_STARTER` | Plan key `pro` |
| `STRIPE_PRICE_PRO` | Plan key `voice` |
| `STRIPE_PRICE_ENTERPRISE` | Plan key `enterprise` |
| `STRIPE_PRICE_ENERGY_500` | Energy package `basic` (one-time) |
| `STRIPE_PRICE_ENERGY_1200` | Energy package `pro` (one-time) |
| `STRIPE_PRICE_CLAIM_ACTIVATION` | Site claim activation (one-time) |
| `STRIPE_PRICE_AFFILIATE_STARTER_KIT` | Optional override for affiliate checkout |

Checkout success/cancel URLs are built from the **request host** in [`server/routes/billingRoutes.ts`](../../server/routes/billingRoutes.ts) (`create-checkout-session`), not only `APP_URL`. Ensure TLS and host headers are correct behind your reverse proxy.

## Webhook endpoints (register in Stripe Dashboard)

| Purpose | HTTP path | Signing secret env |
|---------|-------------|---------------------|
| Subscriptions, checkout completion, energy refill metadata | `POST /api/stripe/webhook/subscriptions` | `STRIPE_WEBHOOK_SECRET` |
| A2P / compliance payments | `POST /api/stripe/webhook/a2p` | `STRIPE_A2P_WEBHOOK_SECRET` |

Use **different** endpoints and **different** secrets for each path. Do not reuse one `whsec_` for both.

### Example full URLs

- `https://<your-host>/api/stripe/webhook/subscriptions`
- `https://<your-host>/api/stripe/webhook/a2p`

Forward locally with Stripe CLI:

```bash
stripe listen --forward-to localhost:3004/api/stripe/webhook/subscriptions
```

## Verification

1. **Config:** `doppler run --` starts the server without Stripe errors; `STRIPE_SECRET_KEY` present.
2. **Test checkout:** Complete a test-mode Checkout with [Stripe test cards](https://stripe.com/docs/testing).
3. **Dashboard:** Stripe → Developers → Webhooks → **Delivered** for `checkout.session.completed` (and other events your code handles).
4. **App:** Site plan or energy balance updates as expected; check logs for `[Stripe]` webhook lines.

If `STRIPE_WEBHOOK_SECRET` is unset, the server **skips signature verification** (dev-only behavior); production must always set the secret.

## What “clean slate” means

| Scope | Meaning |
|-------|---------|
| **Stripe only** | New Products/Prices in the Dashboard or via [`scripts/bootstrap-stripe-plan-prices.ts`](../../scripts/bootstrap-stripe-plan-prices.ts); then update Doppler with new `price_…` IDs. |
| **Application database** | Customer IDs, subscription references, and reseller Connect accounts live in **Postgres**. Resetting Stripe only **does not** clear those rows; you may need a deliberate migration or test DB reset. |
| **Production** | No automated wipe of production DB as part of billing bootstrap. |

## Programmatic bootstrap (recommended for new Stripe accounts)

Create catalog objects and print Doppler-ready lines:

```bash
doppler run -- npm run stripe:bootstrap-prices
```

Dry-run (default): lists plans and would **not** create objects.

```bash
doppler run -- npm run stripe:bootstrap-prices -- --apply
```

**Live mode:** Creating real prices requires `sk_live_…`. The script requires `--allow-live` when the secret key is live, to avoid accidental prod catalog creation.

```bash
doppler run -- npm run stripe:bootstrap-prices -- --apply --allow-live
```

Defaults for **amounts** (cents) are documented in the script; adjust in Stripe after creation if your commercial terms differ.

### Related script (platform landing products)

[`scripts/sync-platform-products-stripe.ts`](../../scripts/sync-platform-products-stripe.ts) syncs **platform_landing** marketplace products to Stripe and updates the database. It does **not** replace the **site plan** price IDs in `stripeClient.ts`; use both if you use both features.

## Related docs

- [`SOVEREIGN_ENV_MANIFEST.md`](../SOVEREIGN_ENV_MANIFEST.md) — Stripe keys in the env manifest
- `doppler run --` for all secret-backed scripts
