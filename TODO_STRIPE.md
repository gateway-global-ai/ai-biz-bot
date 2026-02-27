# TODO_STRIPE.md — Board-Level Stripe Dashboard Checklist
# Gateway Global AI — MSA v1.1.0 Alignment
# Generated: 2026-02-27
# Source of Truth: /.system_design/pricing_v1.yaml + contracts/MSA_v1.1.0_RESELLER.md

This file is the canonical checklist for aligning the Stripe Dashboard with the
commercial policy defined in MSA v1.0.0 and the Reseller Addendum v1.1.0.
Complete every item in order before processing live customer transactions.

---

## STATUS KEY
- [ ] Not started
- [~] In progress
- [x] Complete — record the resulting Price ID in the "Doppler Key" column

---

## SECTION 1 — Stripe Products to Create

### 1.1 Sovereign AI OS — Monthly Platform Fee
| Field         | Value |
|---------------|-------|
| Product Name  | `Sovereign AI OS — Platform Fee` |
| Description   | Monthly recurring access to the Sovereign OS (voice, SMS, chat). MSA §3.1. |
| Price         | $49.00 / month |
| Billing       | Recurring — Monthly |
| Price ID      | _(record here after creation)_ |
| Doppler Key   | `STRIPE_BASE_PLATFORM_PRICE_ID` |
| MSA Reference | `pricing_v1.yaml → flat_fee.monthly.amount: 49.00` |

- [ ] Create Product in Stripe Dashboard
- [ ] Create $49.00/mo recurring Price on the Product
- [ ] Copy Price ID → add to Doppler as `STRIPE_BASE_PLATFORM_PRICE_ID` (dev + stg + prd)

---

### 1.2 Sovereign AI OS — Annual Pre-Paid Platform Fee
| Field         | Value |
|---------------|-------|
| Product Name  | `Sovereign AI OS — Platform Fee (Annual)` |
| Description   | Annual pre-paid access. Retail $588.00; pre-paid rate $492.00 ($41.00/mo). MSA §3.1. |
| Price         | $492.00 / year (one-time or recurring annual) |
| Billing       | Recurring — Annual |
| Savings Copy  | `pricing_v1.yaml → flat_fee.annual_prepaid.savings_label: "Save $96/year"` |
| Price ID      | _(record here after creation)_ |
| Doppler Key   | `STRIPE_BASE_PLATFORM_PRICE_ANNUAL_ID` |

- [ ] Create $492.00/yr recurring Price on the Product from 1.1
- [ ] Copy Price ID → add to Doppler as `STRIPE_BASE_PLATFORM_PRICE_ANNUAL_ID`

---

### 1.3 Phone Voice AI — Metered Overage
| Field         | Value |
|---------------|-------|
| Product Name  | `Phone Voice AI — Overage` |
| Description   | Per-minute charge for phone voice AI usage beyond the Essentials Bundle. |
| Rate          | $0.25 / minute |
| Billing       | Metered — per unit (minute) |
| Stripe Event  | `pricing_v1.yaml → overage_rates.phone_voice_ai.stripe_meter_event: twilio.call.completed` |
| Price ID      | _(record here after creation)_ |
| Doppler Key   | `STRIPE_PRICE_PHONE_VOICE_OVERAGE` |
| MSA Reference | `pricing_v1.yaml → overage_rates.phone_voice_ai.rate: 0.25` |

- [ ] Create Product
- [ ] Create $0.25/min metered Price (billing scheme: per unit)
- [ ] Copy Price ID → add to Doppler as `STRIPE_PRICE_PHONE_VOICE_OVERAGE`

---

### 1.4 Web Voice AI — Metered Overage
| Field         | Value |
|---------------|-------|
| Product Name  | `Web Voice AI — Overage` |
| Description   | Per-minute charge for web/WebRTC voice AI usage beyond the Essentials Bundle. |
| Rate          | $0.18 / minute |
| Billing       | Metered — per unit (minute) |
| Stripe Event  | `pricing_v1.yaml → overage_rates.web_voice_ai.stripe_meter_event: webrtc.session.ended` |
| Price ID      | _(record here after creation)_ |
| Doppler Key   | `STRIPE_PRICE_WEB_VOICE_OVERAGE` |

- [ ] Create Product
- [ ] Create $0.18/min metered Price
- [ ] Copy Price ID → add to Doppler as `STRIPE_PRICE_WEB_VOICE_OVERAGE`

---

### 1.5 A2P SMS — Metered Overage
| Field         | Value |
|---------------|-------|
| Product Name  | `A2P SMS — Overage` |
| Description   | Per-message charge for A2P SMS beyond the Essentials Bundle. |
| Rate          | $0.125 / message |
| Billing       | Metered — per unit (message) |
| Stripe Event  | `pricing_v1.yaml → overage_rates.a2p_sms.stripe_meter_event: twilio.message.delivered` |
| Price ID      | _(record here after creation)_ |
| Doppler Key   | `STRIPE_PRICE_A2P_SMS_OVERAGE` |

- [ ] Create Product
- [ ] Create $0.125/message metered Price
- [ ] Copy Price ID → add to Doppler as `STRIPE_PRICE_A2P_SMS_OVERAGE`

---

## SECTION 2 — One-Time A2P Registration Products (Verify / Update)

These are charged at the time of A2P 10DLC brand registration via `/api/a2p/brands/:id/pay`.
Amounts are now sourced from `pricing_v1.yaml` and Doppler env vars — no longer hardcoded.

### 2.1 A2P Brand Registration Fee
| Field        | Value |
|--------------|-------|
| Amount       | $49.00 (= `pricing_v1.yaml → flat_fee.monthly.amount`) |
| Stripe Usage | `price_data` (inline, one-time) — no pre-created Price ID needed |
| Code Source  | `server/routes.ts` → `toCents(pricing.flat_fee.monthly.amount)` |
| Status       | No Doppler key required — sourced directly from pricing_v1.yaml |

- [ ] Verify $49.00 matches any existing A2P Brand Registration product in Stripe Dashboard
- [ ] If discrepancy exists, update pricing_v1.yaml (not the code)

### 2.2 Standard Vetting Fee
| Field        | Value |
|--------------|-------|
| Amount       | $40.00 (default) |
| Doppler Key  | `STRIPE_A2P_STANDARD_FEE_CENTS` = `4000` |
| Code Source  | `server/routes.ts` → `process.env.STRIPE_A2P_STANDARD_FEE_CENTS ?? 4000` |

- [ ] Add `STRIPE_A2P_STANDARD_FEE_CENTS=4000` to Doppler (dev + stg + prd)

### 2.3 Expedited Vetting Fee
| Field        | Value |
|--------------|-------|
| Amount       | $85.00 (default) |
| Doppler Key  | `STRIPE_A2P_EXPEDITED_FEE_CENTS` = `8500` |
| Code Source  | `server/routes.ts` → `process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS ?? 8500` |

- [ ] Add `STRIPE_A2P_EXPEDITED_FEE_CENTS=8500` to Doppler (dev + stg + prd)

---

## SECTION 3 — Doppler Secrets Inventory

### 3.1 Secrets to ADD to Doppler (all environments: dev, stg, prd)

| Secret Key                          | Value Source | Notes |
|-------------------------------------|-------------|-------|
| `STRIPE_SECRET_KEY`                 | Stripe Dashboard → Developers → API Keys | Replaces Replit Connector auth |
| `STRIPE_PUBLISHABLE_KEY`            | Stripe Dashboard → Developers → API Keys | Replaces Replit Connector auth |
| `STRIPE_WEBHOOK_SECRET`             | Stripe Dashboard → Webhooks              | Already in use; verify it exists |
| `STRIPE_BASE_PLATFORM_PRICE_ID`     | Created in Section 1.1 above             | $49.00/mo recurring |
| `STRIPE_BASE_PLATFORM_PRICE_ANNUAL_ID` | Created in Section 1.2 above          | $492.00/yr |
| `STRIPE_PRICE_PHONE_VOICE_OVERAGE`  | Created in Section 1.3 above             | $0.25/min metered |
| `STRIPE_PRICE_WEB_VOICE_OVERAGE`    | Created in Section 1.4 above             | $0.18/min metered |
| `STRIPE_PRICE_A2P_SMS_OVERAGE`      | Created in Section 1.5 above             | $0.125/msg metered |
| `STRIPE_A2P_STANDARD_FEE_CENTS`     | `4000`                                   | $40.00 one-time |
| `STRIPE_A2P_EXPEDITED_FEE_CENTS`    | `8500`                                   | $85.00 one-time |

### 3.2 Secrets to REVIEW for Removal (manual action in Doppler dashboard)

Search for and delete any secrets matching these patterns. These are legacy keys that
existed prior to the Zero-Leak Architecture migration.

| Pattern to search | Reason for removal |
|-------------------|--------------------|
| `OLD_*`           | Pre-v1.0.0 testing keys |
| `TEST_*`          | Dev-only testing keys that should not exist in stg/prd |
| `LEGACY_*`        | Deprecated integration keys |
| `PRE_V1_*`        | Explicitly versioned legacy keys |
| `REPLIT_CONNECTORS_HOSTNAME` | Removed — replaced by `STRIPE_SECRET_KEY` |

> NOTE: Do NOT delete `REPL_IDENTITY` or `WEB_REPL_RENEWAL` if the hosting
> infrastructure still uses Replit for any purpose. Confirm deployment environment
> before removing any Replit-prefixed keys.

---

## SECTION 4 — Stripe Connect (Reseller Payout Roadmap)

Required for the `calculateResellerMargin` skill (billing_engine.json v1.1.0) to
disburse net margin to Reseller accounts via `stripeConnectedAccountId`.

| Task | Owner | Status |
|------|-------|--------|
| Enable Stripe Connect in Dashboard (Platform) | CEO / Finance | [ ] |
| Configure payout schedule (weekly / monthly) | CEO / Finance | [ ] |
| Build `POST /api/reseller/connect/onboard` route | Developer Agent | [ ] |
| Build `POST /api/reseller/commission/disburse` route | Developer Agent | [ ] |
| Update `getStripeSync()` stub in stripeClient.ts | Developer Agent | [ ] |
| Add `STRIPE_CONNECT_CLIENT_ID` to Doppler | CEO | [ ] |

> The `stripeConnectedAccountId` column is already in the `customer_accounts` schema.
> No further migration is needed to begin Connect onboarding when ready.

---

## SECTION 5 — Verification Checklist (Pre-Launch)

Before processing the first live customer transaction, confirm all of the following:

- [ ] `doppler run -- node -e "require('./server/stripeClient'); console.log('OK')"` runs without error
- [ ] `GET /api/billing/publishable-key` returns a `pk_live_*` key (not `pk_test_*`) in production
- [ ] A2P brand registration checkout session creates successfully with correct amounts
- [ ] `pricing_v1.yaml` flat_fee.monthly.amount matches the `STRIPE_BASE_PLATFORM_PRICE_ID` price in Stripe Dashboard
- [ ] Webhook signature verification (`STRIPE_WEBHOOK_SECRET`) passes for test events
- [ ] No `price_XXXX` string literals remain in server/ code (`grep -r "price_[a-zA-Z0-9]\{8,\}" server/` returns empty)

---

_This file is maintained by the Developer Agent. Update status checkboxes as each item is completed. Do not delete completed sections — they serve as an audit trail._
