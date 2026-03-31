---
name: cloudbeds-hospitality
description: >
  Cloudbeds PMS integration for hospitality swarm agents.
  Covers availability lookup, guest journey classification, housekeeping status,
  dashboard ops, reservation handoff, and the Boardwalk Suites Lafayette demo.
  Use when touching any Cloudbeds-backed tool, site_pms_integrations, hotel agent
  provisioning, or any property with pms_type = "cloudbeds".
skill_id: cloudbeds_hospitality
version: "1.0.0"
---

# Cloudbeds Hospitality Skill

Use this skill whenever work touches:
- Hotel/lodging agents with `pms_type = "cloudbeds"` in `site_pms_integrations`
- The Boardwalk Suites Lafayette demo (`propertyID: 315701`)
- `server/tools/cloudbedsSwarmTools.ts`, `server/services/cloudbedsApi.ts`, `server/routes/cloudbedsRoutes.ts`
- Industry group `hospitality_travel` in agent provisioning
- Tool declarations: `get_hotel_inventory`, `pms_lookup_guest_journey`, `pms_get_housekeeping_status`, `pms_get_hotel_dashboard`

---

## Architecture summary

```
site_pms_integrations (per-site)
    │ propertyId, accessToken / apiKey
    ▼
cloudbedsApi.ts (auth resolution, token refresh, cloudbedsGetJson)
    │
    ├── hotelInventoryHandler.ts → get_hotel_inventory (Gemini tool)
    └── cloudbedsSwarmTools.ts  → pms_* tools (Gemini tools)

cloudbedsRoutes.ts  → OAuth flow + reservations HTTP proxy
                      (requireCustomerAuth — owner-session only)
```

**Two credential paths (both supported):**
- `x-api-key: cbat_...` — static API key via `site_pms_integrations.api_key`
- `Bearer <access_token>` — OAuth with auto-refresh via `refresh_token` + `token_expires_at`

---

## Tool registry

Canonical spec: `registry-yaml/cloudbeds-tool-registry.yaml`

| Tool name | Cloudbeds method | Mutation | Mode allowlist |
|-----------|-----------------|----------|----------------|
| `get_hotel_inventory` | `getAvailableRoomTypes` | read | RECEPTIONIST, SALES, MANAGER |
| `pms_lookup_guest_journey` | `getReservations` | read | RECEPTIONIST, SALES, MANAGER, CUSTOMER_SERVICE, CONCIERGE |
| `pms_get_housekeeping_status` | `getHousekeepingStatus` | read | MANAGER |
| `pms_get_hotel_dashboard` | `getDashboard` | read | MANAGER |
| `post_reservation` | `postReservation` | **write** | SALES, CASHIER — **requires_approval + OTP gate** |

`post_reservation` is implemented in `cloudbedsRoutes.ts` but **not yet wired as a Gemini swarm tool**. Until it is, agents must quote inventory and hand off to `bookingUrl`.

---

## Agent roster (hospitality_travel swarm)

| Archetype | Hotel role | Default operational mode |
|-----------|-----------|--------------------------|
| `concierge` | In-house guest experience | `RECEPTIONIST` |
| `booking_coordinator` | Reservations | `SALES` |
| `lead_qualifier` | Hotel manager / ops | `MANAGER` |
| `retention_empath` | Post-stay & loyalty | `CUSTOMER_SERVICE` |
| `billing_analyst` | Housekeeping manager | `MANAGER` |
| `gatekeeper` | Front desk / check-in | `RECEPTIONIST` |

---

## Boardwalk Suites Lafayette (Demo Property)

**property_id (Cloudbeds):** `315701`  
**site_config_id (platform UUID — stable business scope):** set per environment (`BOARDWALK_SITE_CONFIG_ID` / output of `npm run setup:boardwalk`). Do **not** use Google `place_id` as the canonical business identifier; it may drift.  
**place_id (Google metadata only):** `ChIJB4qU6oXvJIgR_2p602OaK_U`  
**address:** 1605 N University Ave, Lafayette, LA 70506  
**owner:** Jason Trindade — `lafayette@boardwalksuites.com`  
**booking engine:** `https://hotels.cloudbeds.com/reservation/YCNwpF`

**Room types (from live API):**

| Short | Name | Rate | Max guests |
|-------|------|------|-----------|
| SK1 | King Suite Level 1 | $69 | 2 |
| SK2 | King Suite Level 2 | $69 | 2 |
| SKI | King Suite Interior | $89 | 2 |
| SKV | VIP King Suite | $89 | 2 |
| DSE | Double Suite Exterior | $79 | 4 |
| DSI | Double Suite Interior | $99 | 4 |

**Key features:** Extended stay, full kitchens, Oil Center / University / medical district location, weekly/monthly rates, pet policy TBD.

---

## Bootstrap sequence (repeatable)

```bash
# 1. Ensure site, PMS row, featured partner
CLOUDBEDS_API_KEY=cbat_... doppler run -- npx tsx scripts/setup-boardwalk-suites.ts

# 2. Provision 6-agent hospitality swarm + seed knowledge artifacts
doppler run -- npx tsx scripts/provision-boardwalk-agents.ts

# 3. Seed industry templates (refresh archetype copy)
doppler run -- npx tsx scripts/seed-industry-templates.ts
```

After Step 2, the site has a full swarm. Use the `siteConfigId` printed by the script in Step 1.

---

## OTP gate (guest phone verification)

`pms_lookup_guest_journey` is gated by OTP when `verification_guest_phone` skill is active on the site:

1. Agent calls `guest_phone_verification` → sends OTP via Twilio Verify
2. Guest enters code → `verify_otp` clears the gate in session
3. Agent may now call `pms_lookup_guest_journey`

**No PMS guest data is surfaced without OTP clearance when the skill is active.**

---

## Voice governance flag

`docs-governance/archive/VOICE_BOARDWALK_DEMO_NOTE.md` flags that `server/geminiVoice.ts` injects `PRICING_RULE` anti-booking copy that can contradict spoken live-inventory quotes.

**Do NOT change `geminiVoice.ts` as a side-effect of Cloudbeds work.**  
For live voice demos quoting real rates, open a separate voice governance task first.

Chat / website preview paths do NOT have this conflict.

---

## Key files

| File | Purpose |
|------|---------|
| `server/services/cloudbedsApi.ts` | OAuth, token refresh, `cloudbedsGetJson` helper |
| `server/tools/cloudbedsSwarmTools.ts` | `pms_*` tool handlers |
| `server/tools/hotelInventoryHandler.ts` | `get_hotel_inventory` handler |
| `server/routes/cloudbedsRoutes.ts` | Availability GET, OAuth callback, reservations proxy |
| `server/config/geminiToolDeclarations.ts` | Tool declarations for Gemini voice |
| `server/config/operationalModes.ts` | Mode allowlist enforcement |
| `scripts/setup-boardwalk-suites.ts` | Idempotent Boardwalk site + PMS row seed |
| `scripts/provision-boardwalk-agents.ts` | Swarm provision + knowledge artifact seed |
| `registry-yaml/cloudbeds-tool-registry.yaml` | Canonical tool spec (this skill's contract) |
| `docs/knowledge-base/cloudbeds/` | 29-file Cloudbeds KB (OpenAPI YAML, guides) |
| `docs-governance/canonical/HOSPITALITY_SWARM_RUNBOOK.md` | Full runbook |
| `docs/CLIENT_INTEGRATION_ONBOARDING.md` | Credential model (per-site DB vs Doppler) |

---

## Governance rules

- **No new routes** in `server/routes.ts` for Cloudbeds — tools are server-side only, routes go in `cloudbedsRoutes.ts`
- **Per-site credentials** — `site_pms_integrations` is the auth source, not Doppler global vars
- **post_reservation requires OTP** — never skip the identity gate for write tools
- **Payment links via SMS** — use `POST /api/share/send-payment-link` with `CUSTOMER_CARE` pipe; never marketing pipes for checkout
- **Booking fallback until write tool is wired** — always provide `bookingUrl` as the primary conversion path
