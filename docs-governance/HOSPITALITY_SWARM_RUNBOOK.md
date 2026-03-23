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

## OAuth scopes

Cloudbeds OAuth tokens must include scopes for guest, reservation, housekeeping, and dashboard reads used above (`read:guest`, `read:reservation`, `read:housekeeping`, `read:dashboard`, etc.). See OpenAPI `components.securitySchemes.OAuth2`.

## Governance

- **No new routes** in `server/routes.ts` for this feature; tools are server-side only.  
- **Voice** changes in `geminiVoice.ts` follow hospitality policy alignment; do not weaken the voice lockdown for unrelated edits.  
- **SMS** for OTP uses Twilio Verify only — not the Sovereign SMS Router marketing pipes.
