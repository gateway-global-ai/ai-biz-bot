---
name: a2p-compliance
description: Expert in Twilio A2P 10DLC compliance for Gateway Global AI — programmatic creation of Messaging Services, Trust Hub Secondary Customer Profiles, and Enterprise subaccount/brand registration for the Sovereign SMS Router.
---

# A2P Compliance Provisioning — Gateway Global AI

Use this skill when you need to provision or document Twilio A2P 10DLC resources: the 6 Messaging Service pipes for the Sovereign SMS Router, Trust Hub Secondary Customer Profile bundles, or the Enterprise upsell flow (dedicated subaccount + brand registration).

## One-Shot Provisioner Script

The project includes a single script that creates all 6 Messaging Services and a full Trust Hub Secondary Customer Profile bundle in one run.

**Location:** `scripts/provision-a2p-compliance.ts`

**Run command:**
```bash
doppler run -- npx tsx scripts/provision-a2p-compliance.ts
```

**Required Doppler secret (set once; never commit):**
```bash
doppler secrets set BUSINESS_REGISTRATION_NUMBER="<9-digit-SSN-no-dashes>"
```

The script reads `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `BUSINESS_REGISTRATION_NUMBER` from the environment. If any are missing, it exits with a clear error. The business registration number (SSN for Sole Proprietorship) must never appear in any file or log.

### Prerequisites

- A **Primary Customer Profile** in Twilio Trust Hub with status `twilio-approved`. The script lists profiles and uses the first approved one to obtain `policySid` and to assign to the new bundle.
- Doppler project configured with Twilio credentials and `BUSINESS_REGISTRATION_NUMBER`.

**Trust Hub limitation:** Twilio does not allow creating **Secondary Customer Profiles** with business identity `direct_customer` via the API; they must be created in the [Twilio Console](https://console.twilio.com/us1/develop/trust-hub/customer-profiles). The script always creates the 6 Messaging Services. If the Trust Hub bundle creation fails with that restriction, the script logs a clear message and still prints the Doppler secrets for the 6 SIDs.

### What the Script Does (12 Steps)

1. Fetch Primary Customer Profile (twilio-approved) and its `policySid`.
2. Create 6 Messaging Services (friendly names and Doppler keys below).
3. Create an empty Secondary Customer Profile bundle.
4. Create EndUser: `customer_profile_business_information` (Gateway Global AI, Sole Proprietorship, TECHNOLOGY, direct_customer, USA_AND_CANADA, website, registration number from env).
5. Create EndUser: `authorized_representative_1` (Jason Trindade, CEO).
6. Create EndUser: `authorized_representative_2` (same person for sole prop).
7. Create Address (3810 Spizte Drive, Las Vegas, NV 89103, US).
8. Create SupportingDocument: `customer_profile_address` (links address to bundle).
9. Assign all components + Primary Customer Profile to the Secondary bundle.
10. Evaluate the bundle.
11. Submit for review (`status: pending-review`).
12. Print ready-to-paste `doppler secrets set` commands for all 6 Messaging Service SIDs.

### The 6 Messaging Services (Sovereign SMS Router Pipes)

| Doppler Key | Friendly Name | Use |
|-------------|---------------|-----|
| `TWILIO_MS_PLATFORM_OTP` | GGW Platform OTP | 2FA / password resets (Toll-Free) |
| `TWILIO_MS_PLATFORM_CARE` | GGW Platform Care | Billing alerts, energy nudges |
| `TWILIO_MS_PLATFORM_MKTG` | GGW Platform Marketing | Referral / claim invites |
| `TWILIO_MS_CUSTOMER_OTP` | GGW Customer OTP | End-user identity verification (Toll-Free) |
| `TWILIO_MS_CUSTOMER_CARE` | GGW Customer Care | AI bot transactional (warrant links, etc.) |
| `TWILIO_MS_CUSTOMER_MKTG` | GGW Customer Marketing | Business owner promo blasts |

After the script runs, copy the printed `doppler secrets set ...` lines into your Doppler project (or run them via CLI). Then the Sovereign SMS Router (`server/services/smsRouter.ts`) can resolve each intent to a Messaging Service SID via these env vars.

### Trust Hub Data Used (Gateway Global AI)

- Business: Gateway Global AI, Sole Proprietorship, TECHNOLOGY, direct_customer, USA_AND_CANADA.
- Website: `http://aibizbot.gatewayglobal.ai`
- Registration: type `Other`, number from `BUSINESS_REGISTRATION_NUMBER` (SSN).
- Representative: Jason Trindade, CEO, jason@gatewayglobal.ai, +17025405471.
- Address: 3810 Spizte Drive, Las Vegas, NV 89103, US.

### Inbound Webhook URL (programmatic)

The provision script sets each new Messaging Service’s **Inbound Request URL** via the [Update a Service](https://www.twilio.com/docs/messaging/api/service-resource#update-a-service) API to `{APP_URL}/api/webhooks/twilio/incoming` with method `POST`, so STOP/START replies are handled by the platform.

For **existing** services (e.g. the 6 you already created before this change), run once:

```bash
doppler run -- npx tsx scripts/wire-messaging-service-webhooks.ts
```

That script reads the 6 `TWILIO_MS_*` SIDs from env and updates each service’s `inboundRequestUrl` and `inboundMethod` via the API. Scripts default to dev: `https://aibizbot-dev.gatewayglobal.ai`. For production, set `APP_URL` in Doppler to `https://aibizbot.gatewayglobal.ai`.

---

## Enterprise Upsell: Dedicated Subaccount + A2P Brand Registration

For the **Enterprise Tier**, the platform sells **Reputation Isolation**: a dedicated Twilio Subaccount, dedicated local phone numbers, and their own A2P Trust Hub registration so no other tenant’s traffic affects their deliverability.

**Positioning:**  
*“On the standard plan, you share a phone number pool with other businesses. If you want high-volume marketing, you need your own Twilio Subaccount, your own local numbers, and your own A2P Trust Hub registration.”*

**Typical charge:** $250–$500 “A2P Registration & Setup Fee.”

**Behind the scenes (implement when building the Enterprise flow):**

1. **Create Twilio Subaccount** — `client.api.accounts.create({ friendlyName: customerName })`. Use the subaccount’s SID and auth token for all subsequent steps for that customer.
2. **Create Messaging Service(s)** in the subaccount — one per use case (e.g. Customer Care, Customer Marketing) so traffic is isolated.
3. **Trust Hub Secondary Customer Profile** — Use the same pattern as the provisioner script: create bundle with business info, authorized rep(s), address, supporting doc; assign components; evaluate; submit. Use the **primary** account’s approved Customer Profile SID and policy SID when creating the secondary profile in the subaccount (or follow Twilio’s ISV docs for cross-account assignment if applicable).
4. **Register Brand / Campaign** — Via Trust Hub and A2P 10DLC APIs (Brand registration, then Campaign linked to the Messaging Service). Store returned SIDs (e.g. Brand SID, Campaign SID, Messaging Service SID) in `site_configs` or a dedicated `a2p_brands` / `a2p_campaigns` ledger for that tenant.
5. **Assign phone numbers** — Purchase or port numbers into the subaccount and add them to the Messaging Service(s). Point the number’s SMS webhook to `POST /api/webhooks/twilio/incoming` so STOP is handled centrally.

**Database:** Use existing `a2p_brands` and `a2p_campaigns` tables (and optionally `twilio_sub_accounts`) to store per-tenant Twilio SIDs. When the customer sends SMS via the platform, resolve their `siteConfigId` to the tenant’s Messaging Service SID(s) and use the Sovereign SMS Router’s `dispatchSms()` with the appropriate intent so all traffic stays compliant and audited in `sms_logs` and `sms_opt_outs`.

---

## Related Project Artifacts

- **Sovereign SMS Router:** `server/services/smsRouter.ts` — central `dispatchSms({ to, body, intent, siteConfigId })`; reads `TWILIO_MS_*` env vars.
- **Opt-out webhook:** `server/routes/twilioWebhooks.ts` — `POST /api/webhooks/twilio/incoming`; writes to `sms_opt_outs` using `From` (user) and `To` (platform number → `siteConfigs.provisionedPhoneNumber` for `siteConfigId`).
- **Schema:** `shared/schema.ts` — `smsIntentEnum`, `smsOptOuts`, `smsLogs`; migration `migrations/0010_sms_compliance_router.sql`.
- **Claim invite velocity:** `server/routes/claimRoutes.ts` — PLATFORM_MKTG invite limited to 5/hour and 20/day per site.

When adding new SMS use cases or new environments (e.g. staging), ensure the corresponding `TWILIO_MS_*` SIDs exist in Doppler for that environment and that the provisioner script (or manual Console/API steps) are documented so the 6-pipe architecture is preserved.
