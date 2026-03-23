# Hospitality Swarm Runbook (Repeatable)

## Purpose

Stand up six hotel-specialized agents (same six **archetypes** as the global template engine) with **Cloudbeds PMS-aligned tools**, **Twilio OTP** for guest verification, and **Places + reviews** grounding — without inventing new schema anchors.

**OpenAPI source of truth:** `docs/knowledge-base/cloudbeds/api/pms-v1.3-openapi.yaml`  
**Endpoint map (roles):** `docs/knowledge-base/cloudbeds/supplemental/CLOUDBEDS_ENDPOINT_MAPPING.md`

## Agent roster (archetype → hotel role)

| Archetype (`role_type`) | Hotel role | Default mode (bootstrap) |
|-------------------------|------------|----------------------------|
| `concierge` | In-house guest experience | `RECEPTIONIST` |
| `booking_coordinator` | Reservations | `SALES` |
| `lead_qualifier` | Hotel manager / ops | `MANAGER` |
| `retention_empath` | Post-stay & loyalty | `CUSTOMER_SERVICE` |
| `billing_analyst` | Housekeeping manager | `MANAGER` |
| `gatekeeper` | Front desk / check-in | `RECEPTIONIST` |

Display names and copy live in `scripts/seed-industry-templates.ts` under `hospitality_travel`. Re-seed after edits:

```bash
doppler run -- npx tsx scripts/seed-industry-templates.ts
```

## Execution-plane tools (voice)

Declared in `server/config/geminiToolDeclarations.ts`, implemented in `server/tools/cloudbedsSwarmTools.ts` and `server/services/toolHandler.ts`.

| Tool | Cloudbeds alignment | Typical mode |
|------|---------------------|--------------|
| `get_hotel_inventory` | `getAvailableRoomTypes` | `RECEPTIONIST`, `SALES`, `MANAGER` |
| `guest_phone_verification` | Twilio Verify (not Cloudbeds) | Modes with guest identity |
| `pms_lookup_guest_journey` | `getReservations` + guest details, phone match | `RECEPTIONIST`, `SALES`, `MANAGER`, `CUSTOMER_SERVICE`, … |
| `pms_get_housekeeping_status` | `getHousekeepingStatus` | `MANAGER` |
| `pms_get_hotel_dashboard` | `getDashboard` | `MANAGER` |

Allowlists are enforced in `server/config/operationalModes.ts`. Voice prompts align via `server/geminiVoice.ts` when any hospitality tool is allowed (Hospitality policy vs free-tier-style runtime policy).

## Repeatable bootstrap

1. **Business context**  
   - Google Places types include `lodging` / `hotel` → industry group `hospitality_travel`.  
   - `site_pms_integrations` row for **Cloudbeds** (OAuth or API key), `property_id` set, `is_active`.

2. **Provision six agents**  
   - `POST /api/intelligence/provision` with `siteConfigId`, `placeTypes`, `businessName` (see `server/services/agentProvisioning.ts`).

3. **Seed template copy** (optional refresh)  
   - `doppler run -- npx tsx scripts/seed-industry-templates.ts`

4. **Set operational modes**  
   - `doppler run -- npx tsx scripts/hospitality-swarm-bootstrap.ts <siteConfigId>`

5. **Knowledge**  
   - Ingest owner docs + `get_business_reviews` / BI for training flavor.  
   - Keep prompts in compiler/knowledge; do not hardcode long system strings in UI.

6. **OTP**  
   - `guest_phone_verification` requires Twilio Verify (`TWILIO_VERIFY_SERVICE_URL_SID`, non-mock SMS).  
   - Flow: `send_otp` → user enters code → `verify_otp` → then `pms_lookup_guest_journey` for classified journey.

## Guest journey classification

`pms_lookup_guest_journey` matches reservations by **phone digits** (last 10) and classifies:

- `in_house` — status `checked_in`  
- `upcoming_stay` — future stay, `confirmed` / `not_confirmed`  
- `recent_checkout` — `checked_out` within ~45 days  
- `past_guest` — other historical match  
- `no_pms_match` — no match in window  

Tune windows in `server/tools/cloudbedsSwarmTools.ts` if needed.

## Payment links (SMS vs email)

Cloudbeds and similar PMSs often **email** payment links; those messages are easy to lose to **spam** filters. After the guest’s phone is known (OTP / Nova verification), prefer **transactional SMS** for delivery physics that match transaction value.

- **API:** `POST /api/share/send-payment-link` (admin **Bearer** session, site-scoped). Body: `to` (E.164 or US 10-digit), `paymentUrl` (**https** URL copied from Cloudbeds or another trusted PMS UI — not model-invented), `siteConfigId`, optional `contextLabel` (e.g. `Boardwalk Suites Lafayette`).
- **Pipe:** [`dispatchSms`](../server/services/smsRouter.ts) with **`CUSTOMER_CARE`** (A2P transactional — confirmations / links). No marketing STOP footer.
- **OTP** flows remain on Twilio Verify; this endpoint is for **payment URL delivery** only.

### PayByLink email — deliverability audit (Cloudbeds-aligned)

When guests still receive **Cloudbeds PayByLink** (or similar) via **email**, filters often flag **external links**, **missing SPF**, or **damaged domain reputation**. Use this as an **operational audit**, not a code path in this repo:

| Check | Action |
|--------|--------|
| **SPF (DNS)** | Ensure the property’s sending domain SPF includes SendGrid (Cloudbeds uses SendGrid for mail). Example record pattern: `v=spf1 include:sendgrid.net ~all` — **verify** against your registrar/DNS and [Cloudbeds](https://www.cloudbeds.com) / SendGrid docs for the exact hostname they specify for your tenant. |
| **DKIM / DMARC** | Follow Cloudbeds (and DNS host) guidance for aligned authentication; weak or missing alignment increases spam placement. |
| **Links** | **Do not** use URL shorteners in guest-facing payment flows — they are high-risk for spam scoring. Prefer full **https** URLs from Cloudbeds. Any **Sovereign** redirect or deeplink should also avoid shortener services. |
| **Sender identity** | Train staff and email copy so guests recognize mail from the property’s **official domain** and branded templates, not only generic third-party From addresses. |
| **Subject & body** | Use clear, transactional wording (dates, reservation context) — avoid “spammy” promotional patterns. |
| **Guest-side** | Document for front desk: ask guests to check **Spam/Junk**, **whitelist** the property or Cloudbeds sender, and escalate to Cloudbeds support if links are consistently blocked. |
| **Reputation** | If the domain or IP was previously flagged, deliverability may require **Cloudbeds support** and DNS remediation — not prompt changes. |

**Split strategy:** Use **SMS** (`send-payment-link`) for time-critical payment URLs when the guest phone is verified; use the **DNS / email checklist** above when email must remain in the mix.

### Launch planning — OG meta & share containers (all properties)

Do **not** treat Open Graph as a post-launch polish item. Any URL that acts as a **share container** (public `/biz/:slug`, campaign links, QR targets) should pass a **readiness check** before go-live:

- **Owner dashboard:** Set **Social Sharing** (`og:title`, `og:description`, `og:image` 1200×630, `og:url`) in the owner UI (e.g. `/aibizbot`). Empty fields fall back to name, Places summary, or hero image; missing both custom **og:image** and **hero** yields the **platform default** preview — links look like generic text cards in iMessage, Slack, and Facebook.
- **Crawler behavior:** Social crawlers receive minimal HTML with meta tags for `/biz/:slug` (see `server/routes.ts` middleware). The **Platform Business Manager** overview includes **Governance & share health** with `GET /api/site-configs/:id/social-preview-readiness` (authenticated, site-scoped) to mirror that assessment.
- **Deployment gate:** Add “OG / link preview verified” to your internal launch checklist alongside DNS and PayByLink email audit.

## OAuth scopes

Cloudbeds OAuth tokens must include scopes for guest, reservation, housekeeping, and dashboard reads used above (`read:guest`, `read:reservation`, `read:housekeeping`, `read:dashboard`, etc.). See OpenAPI `components.securitySchemes.OAuth2`.

## Governance

- **No new routes** in `server/routes.ts` for this feature; tools are server-side only.  
- **Voice** changes in `geminiVoice.ts` follow hospitality policy alignment; do not weaken the voice lockdown for unrelated edits.  
- **SMS:** OTP uses Twilio Verify only. **Payment link SMS** uses the Sovereign SMS Router **`CUSTOMER_CARE`** pipe ([`shareRoutes`](../server/routes/shareRoutes.ts) `send-payment-link`); do not use marketing pipes for checkout. Marketing blasts remain on their registered A2P intents only.
