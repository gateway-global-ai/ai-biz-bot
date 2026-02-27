# A2P / 10DLC Migration Plan
## Gateway Global AI Platform
**Source Codebase:** `voice-ai-sdk-v1-1`
**Date:** February 27, 2026
**Status:** Active Planning

---

## Overview

This plan converts the existing **Pidea/Subaccount A2P model** into a compliant **Wholesale Reseller 10DLC system** for the Gateway Global platform. It is organized into four workstreams that can be executed in parallel where noted.

> **War Room Additions (Feb 27, 2026):** Three tactical hardening items have been added to prevent carrier rejection ("Carrier Jail"), margin leakage on wholesale fees, and brand sovereignty violations in API paths. See **A5**, **D7**, and **D8**.
>
> **Strategic Refinements (Feb 27, 2026):** Five additional precision items have been integrated — EIN Exact-Match deadlock prevention (**A6**), Webhook Thundering Herd protection for 17,000-agent scale (**C2 update**), Shadow Mode SID migration to prevent zero-downtime breakage (**D5 update**), Supervisor Persona Audit for Gateway Global sovereign identity (**D4 update**), and a new **Workstream E — Hierarchical UUID Governance** for the Las Vegas REALTORS® (LVR/GLVAR) Association launch.
>
> **Sovereign Security Layer (Feb 27, 2026):** A new **Workstream S** has been added to harden the platform against the four highest-impact attack surfaces that emerge when a single platform controls A2P registration and `smsEnabled` status for 17,000 agents: hardware-enforced MFA for privileged roles (**S1**), IP geofencing for association-level endpoints (**S2**), short-lived delegated tokens for batch operations (**S3**), and an immutable tamper-proof audit log for every A2P status change and SMS toggle (**S4**).

---

## Table of Contents

1. [Workstream A — Package Generator (Industry Templates)](#workstream-a--package-generator)
2. [Workstream B — iPhone Compliance Preview Emulator](#workstream-b--iphone-compliance-preview)
3. [Workstream C — TrustHub Registration Workflow](#workstream-c--trusthub-registration-workflow)
4. [Workstream D — Subaccount → Wholesale Reseller Migration](#workstream-d--subaccount--wholesale-reseller-migration)
5. [Workstream E — Hierarchical UUID Governance (LVR Association Model)](#workstream-e--hierarchical-uuid-governance)
6. [Workstream S — Sovereign Security Layer](#workstream-s--sovereign-security-layer)
7. [Execution Order & Dependencies](#execution-order--dependencies)
8. [Environment Variable Changes](#environment-variable-changes)
9. [Definition of Done](#definition-of-done)

**War Room Additions**
- [A5 — Pre-Flight Data Validation (Anti-Carrier-Jail)](#a5--pre-flight-data-validation)
- [A6 — EIN Exact-Match Data Guard (Anti-TCR-Deadlock)](#a6--ein-exact-match-data-guard)
- [D7 — Ledger Attribution for Wholesale Cost Pass-Through](#d7--ledger-attribution)
- [D8 — Full Directory Exorcism (`server/pidea/` → `server/platform/`)](#d8--full-directory-exorcism)

**Strategic Refinements**
- [C2 Update — Webhook Queue (Thundering Herd Protection)](#c2--build-async-status-webhook-handler-critical--currently-missing)
- [D4 Update — Supervisor Persona Audit](#d4--purge-pidea-branding)
- [D5 Update — Shadow Mode SID Migration](#d5--reconcile-duplicate-sql-migration-files)
- [Workstream E — Hierarchical UUID Governance (LVR Association Model)](#workstream-e--hierarchical-uuid-governance)

**Sovereign Security Layer**
- [S1 — RBAC Hardening + Hardware MFA (`SUPREME_ADMIN` role)](#s1--rbac-hardening--hardware-mfa)
- [S2 — Admin Geofencing (IP Allowlisting)](#s2--admin-geofencing)
- [S3 — Short-Lived Delegated Tokens (High-Privilege Sessions)](#s3--short-lived-delegated-tokens)
- [S4 — Immutable Sovereign Audit Log](#s4--immutable-sovereign-audit-log)

---

## Workstream A — Package Generator

**Goal:** Add `real_estate` as a first-class industry to the A2P campaign template generator and make the function portable for the new platform.

**Source file:** `client/src/pages/brand-admin.tsx` lines 50–315

---

### A1 — Add Real Estate to `IndustryType`

**File:** `client/src/pages/brand-admin.tsx` (line 38)

- [ ] Add `"real_estate"` to the `IndustryType` union type
- [ ] Add `"real_estate"` key to the `templates` object inside `generateCampaignTemplates()`

**Real Estate campaign templates to implement:**

| Channel | Use Case Summary |
|---|---|
| `verification` | Identity verification for portal access, document signing, showing confirmation |
| `customer_engagement` | New listing alerts, showing confirmations, offer status updates |
| `retention` | Home anniversary messages, equity reports, neighborhood market updates, referral ask |
| `sales` | Free home valuation CTA, open house invitations, market report delivery |

---

### A2 — Add Real Estate to `mapIndustryToKey()`

**File:** `client/src/pages/brand-admin.tsx` (line 307, before `return "default"`)

- [ ] Add detection for: `real estate`, `realty`, `realtor`, `brokerage`, `property management`, `homes`, `listing`
- [ ] Return `"real_estate"` for all matches

---

### A3 — Extract Generator as Shared Module

- [ ] Move `generateCampaignTemplates()` and `mapIndustryToKey()` to `client/src/lib/a2pTemplates.ts`
- [ ] Export from shared module so both `brand-admin.tsx` and any Gateway Global onboarding wizard can import
- [ ] Update `brand-admin.tsx` import to use the new path

---

### A4 — Wire Google Places Industry Detection

**Current flow:** `hotel.industry || brand?.industry || "hospitality"` (line 357 in brand-admin.tsx)

- [ ] Confirm that Google Places `types[]` array is being mapped to the `industry` field on the `hotels` table at onboarding
- [ ] Test that `mapIndustryToKey("real estate agency")` returns `"real_estate"` correctly
- [ ] Add test coverage for all 6 industry keys

---

### A5 — Pre-Flight Data Validation

> **War Room Addition — Anti-Carrier-Jail.**
> Twilio and TCR reject submissions with mismatched EINs, malformed addresses, or websites missing a privacy policy page. Each rejection wastes 7 days and costs a re-vetting fee. This step validates all critical fields **before** `trusthub.customerProfiles.create` is ever called.

**Where to add:** `client/src/pages/brand-admin.tsx` — add a validation step between the brand info form and the A2P campaign questionnaire. Also enforce server-side in `server/services/twilioA2pService.ts` before `submitBrandRegistration()`.

#### Client-Side Validation Rules

- [ ] **EIN format check** — Regex: `/^\d{2}-\d{7}$/`
  - Valid: `47-1234567`
  - Invalid: `471234567`, `47-123456`, `XX-1234567`
  - Show inline error: _"EIN must be in format XX-XXXXXXX (e.g. 47-1234567)"_

- [ ] **Business name match warning** — Warn if `a2pLegalCompanyName` differs from the Google Places `businessName` by more than 30% (Levenshtein distance check)
  - Show: _"Legal name differs from your Google listing. Ensure this matches your Secretary of State filing exactly."_

- [ ] **Website reachability check** — On blur of the website URL field, call `GET /api/a2p/preflight/check-website?url={url}`
  - Server fetches the URL and checks for presence of `privacy` and `terms` in the response HTML
  - Show ✅ or ❌ inline: _"Privacy policy not detected. TCR requires a public privacy policy URL."_

- [ ] **Address completeness** — All four fields (`streetAddress`, `city`, `state`, `postalCode`) must be non-empty before submission is enabled
  - P.O. Box pattern check: warn if address starts with `PO Box` or `P.O.` — TCR requires a physical street address

- [ ] **Phone number format** — If a contact phone is collected, validate E.164 format: `/^\+1\d{10}$/`

#### Server-Side Validation Rules

- [ ] Add `validateA2PPreFlight(input: BrandRegistrationInput): ValidationResult` function to `server/services/twilioA2pService.ts`
- [ ] Call it at the top of `submitBrandRegistration()` — throw a structured error with field-level messages if validation fails
- [ ] Expose as `POST /api/a2p/preflight/validate` for the UI to call before rendering the TrustHub step

#### Pre-Flight API Endpoint

```typescript
// server/routes.ts — add before the A2P brand creation route
app.post('/api/a2p/preflight/validate', requireApiKey, async (req, res) => {
  const { ein, businessName, websiteUrl, streetAddress, city, state, postalCode } = req.body;
  const errors: Record<string, string> = {};

  // EIN format
  if (!/^\d{2}-\d{7}$/.test(ein || '')) {
    errors.ein = 'EIN must be in format XX-XXXXXXX';
  }

  // Address completeness
  if (!streetAddress?.trim()) errors.streetAddress = 'Street address is required';
  if (!city?.trim())          errors.city          = 'City is required';
  if (!state?.trim())         errors.state         = 'State is required';
  if (!postalCode?.trim())    errors.postalCode    = 'Postal code is required';
  if (/^P\.?O\.?\s*Box/i.test(streetAddress || '')) {
    errors.streetAddress = 'P.O. Box not accepted — TCR requires a physical street address';
  }

  // Website privacy policy check
  if (websiteUrl) {
    try {
      const siteRes = await fetch(websiteUrl, { signal: AbortSignal.timeout(5000) });
      const html = await siteRes.text();
      const hasPrivacy = /privacy/i.test(html);
      const hasTerms   = /terms/i.test(html);
      if (!hasPrivacy) errors.websiteUrl = 'Privacy policy not detected on website';
      if (!hasTerms)   errors.websiteUrl = (errors.websiteUrl ? errors.websiteUrl + '; ' : '') + 'Terms of service not detected';
    } catch {
      errors.websiteUrl = 'Website could not be reached — must be publicly accessible';
    }
  }

  res.json({
    valid: Object.keys(errors).length === 0,
    errors,
  });
});
```

#### Pre-Flight UI Gate

- [ ] Add a `PreFlightCheck` step **before** `CampaignForm` is displayed in `brand-admin.tsx`
- [ ] Display a checklist with live pass/fail status for each field
- [ ] Disable the "Submit to Twilio" button until all checks pass
- [ ] Store validation result in component state so it does not re-run on tab switch

---

### A6 — EIN Exact-Match Data Guard

> **Strategic Refinement — Anti-TCR-Deadlock.**
> A2P carriers (TCR/TrustHub) reject brand registrations if the `Legal Company Name` doesn't exactly match the EIN record on file with the IRS and the state's Secretary of State database. The mismatch is the #1 cause of the 7-day rejection cycle. "Acme Realty LLC" and "Acme Realty" are treated as different legal entities. This step forces the agent to explicitly confirm their legal name before `createBrandRegistrationTool` is ever invoked.

**Where to add:** Between the brand information form submission and the TrustHub profile creation step. This is a UI confirmation gate, not an API call.

#### The Deadlock Scenario

```
Agent enters:  "Acme Realty Group"    ← Google Places name (display name)
IRS record:    "Acme Realty Group LLC" ← exact legal entity name on EIN
Result:        REJECTED by TCR after 7 days
Cost:          7 days lost + $4.41 re-vetting fee
```

#### Implementation

- [ ] After the agent submits their brand information form (business name + EIN), display a **Legal Name Confirmation Modal** before proceeding to TrustHub profile creation:

  ```
  ┌─────────────────────────────────────────────────────────┐
  │  ⚠️  Confirm Your Legal Entity Name                      │
  │                                                         │
  │  You entered:  "Acme Realty Group"                      │
  │                                                         │
  │  EIN 47-1234567 must be registered to this EXACT name   │
  │  at the IRS and your Secretary of State.                │
  │                                                         │
  │  Common mismatches:                                     │
  │  • Missing "LLC", "Inc.", "Corp.", "LP"                 │
  │  • Abbreviated words (e.g. "Mgmt" vs "Management")      │
  │  • DBA names instead of legal entity names              │
  │                                                         │
  │  [ Edit Name ]    [ I Confirm — Proceed to TrustHub ]   │
  └─────────────────────────────────────────────────────────┘
  ```

- [ ] Add a `legalNameConfirmed: boolean` field to the brand registration form state — gate is not passable without checking the confirmation checkbox
- [ ] Add explicit suffix detection — if the entered name does NOT end with a recognized legal suffix, show an additional warning:
  ```typescript
  const LEGAL_SUFFIXES = ['LLC', 'Inc', 'Inc.', 'Corp', 'Corp.', 'LP', 'LLP', 'PLLC', 'PC', 'Ltd'];
  const hasSuffix = LEGAL_SUFFIXES.some(s => name.toUpperCase().endsWith(s.toUpperCase()));
  if (!hasSuffix) {
    warn("No legal entity suffix detected (LLC, Inc., Corp., etc.). Sole proprietors should enter their full legal name as it appears on their tax return.");
  }
  ```
- [ ] For real estate agents specifically, add a **license number cross-reference prompt**:
  - "Real estate agents may also need to use their brokerage's legal entity name, not their personal name. Check with your broker before proceeding."
  - Provide a link to the IRS EIN lookup tool: `https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers`

- [ ] Store `legalNameConfirmed: true` and `legalNameConfirmedAt: timestamp` on the `brands` table so there is an audit trail showing the agent acknowledged the legal name requirement

- [ ] Server-side: In `submitBrandRegistration()` in `twilioA2pService.ts`, add a check:
  ```typescript
  if (!input.legalNameConfirmed) {
    throw new Error('Legal name must be confirmed by agent before brand registration can be submitted.');
  }
  ```

#### Schema Addition

- [ ] Add two columns to the `brands` table in `shared/schema.ts`:
  ```typescript
  legalNameConfirmed:   boolean('legal_name_confirmed').notNull().default(false),
  legalNameConfirmedAt: timestamp('legal_name_confirmed_at'),
  ```

---

## Workstream B — iPhone Compliance Preview

**Goal:** Extract, harden, and make the `PhonePreview` component reusable and industry-configurable.

**Source file:** `client/src/pages/brand-admin.tsx` lines 630–740

---

### B1 — Extract to Standalone Component

- [ ] Create `client/src/components/compliance/PhonePreview.tsx`
- [ ] Move the full component code from `brand-admin.tsx` lines 630–740 into the new file
- [ ] Add typed props interface:
  ```typescript
  interface PhonePreviewProps {
    messages: string[];          // [msg1, msg2, msg3] from form.watch()
    senderName?: string;         // defaults to company name from brand data
    showLinkCard?: boolean;      // show rich link preview card in bubble 3
    linkCardContent?: LinkCard;  // override default hotel room card
  }
  ```
- [ ] Remove hardcoded `"Pidea AI"` from phone header (line 647) — replace with `senderName` prop
- [ ] Remove hardcoded hotel room image — make `linkCardContent.imageSrc` configurable

---

### B2 — Real Estate Link Card Variant

- [ ] Create a `realEstateLinkCard` preset for the `linkCardContent` prop:
  - Hero image: property listing photo
  - Items: 3 property listings with address, sqft, and price
  - CTA: `"View All Listings"`
- [ ] Pass `realEstateLinkCard` when `industry === "real_estate"`

---

### B3 — Connect Live Preview to Form

- [ ] Verify `form.watch("sampleMessage1/2/3")` is wired to `PhonePreview` in `CampaignForm`
- [ ] Preview updates in real time with zero debounce lag
- [ ] Preview renders correctly on mobile viewports (< 640px) — collapse to full-width stack below form

---

### B4 — Compliance Indicator Layer

- [ ] Add a visual compliance badge on the phone screen that turns red/yellow/green based on:
  - ✅ Green: opt-out language detected (`STOP`, `unsubscribe`)
  - ⚠️ Yellow: message over 160 chars (multi-part SMS)
  - ❌ Red: forbidden spam patterns detected (`FREE MONEY`, `ACT NOW`, etc.)
- [ ] Source pattern lists from `server/platform/a2pComplianceService.ts` (lines 45–64) — note: file moves from `server/pidea/` as part of D8

---

## Workstream C — TrustHub Registration Workflow

**Goal:** Wrap the 10-step A2P TrustHub sequence into a callable, resumable workflow with proper async status polling.

**Source files:**
- `mcp-servers/twilio/src/tools/a2p.ts` (tool implementations)
- `server/services/twilioA2pService.ts` (HTTP service layer)
- `server/routes/monitoringRoutes.ts` (status endpoints)

---

### C1 — Define the 10-Step Workflow

The steps must execute **in order**. Steps 6, 7, and 9 are **blocking** — they require polling until approval before continuing.

| Step | Tool / Method | Blocking | Input | Output Field |
|---|---|---|---|---|
| Step | Tool / Method | Blocking | Input | Output Field | Audit Event (S4) |
|---|---|---|---|---|---|
| 1 | `trusthub.customerProfiles.create` | No | `email`, `businessName` | `customerProfileSid` | `trusthub_profile_created` |
| 2 | `trusthub.endUsers.create` | No | Business info + EIN | `endUserSid` | `trusthub_end_user_created` |
| 3 | `trusthub.customerProfiles(sid).entityAssignments.create` | No | `customerProfileSid`, `endUserSid` | `assignmentSid` | — |
| 4 | `trusthub.supportingDocuments.create` | No | Business registration details | `supportingDocumentSid` | — |
| 5 | `trusthub.customerProfiles(sid).entityAssignments.create` | No | `customerProfileSid`, `supportingDocumentSid` | `docAssignmentSid` | — |
| 6 | `trusthub.customerProfiles(sid).update({ status: 'pending-review' })` | **Yes** | `customerProfileSid` | Wait for `twilio-approved` | `trusthub_profile_submitted` |
| 7 | `messaging.v1.brandRegistrations.create` | **Yes** | `customerProfileSid` | Wait for `APPROVED` | `brand_registration_submitted` |
| 8 | `messaging.v1.services.create` | No | `friendlyName`, `inboundWebhookUrl` | `messagingServiceSid` | — |
| 9 | `messaging.v1.services(sid).usAppToPerson.create` | **Yes** | `brandSid`, `messagingServiceSid`, samples | Wait for `VERIFIED` | `campaign_created` |
| 10 | `messaging.v1.services(sid).phoneNumbers.create` | No | `messagingServiceSid`, `phoneNumberSid` | Set `smsEnabled=true` | `sms_enabled` |

> **S4 Audit requirement:** Every step with an audit event must call `logAuditEvent()` in both the success and failure path. Steps 3, 4, 5, and 8 are administrative plumbing (no carrier-visible state change) and are logged at DEBUG level only.

---

### C2 — Build Async Status Webhook Handler (CRITICAL — Currently Missing)

**This is the biggest operational gap in the current system.** There is no listener for Twilio's async callbacks. The current code only polls on demand.

- [ ] Create `server/routes/a2pWebhookRoutes.ts`
- [ ] Implement `POST /api/webhooks/twilio/a2p/brand-status`
  - Receives `BrandRegistrationSid` + `Status` from Twilio
  - Updates `brands.a2pApproved` and `brands.a2pBrandSid` in DB
  - If `Status === 'APPROVED'` → enqueue campaign creation (see Queue section below)
- [ ] Implement `POST /api/webhooks/twilio/a2p/campaign-status`
  - Receives `CampaignSid` + `CampaignStatus` + `MessagingServiceSid`
  - Updates `a2pCampaigns.approved` in DB
  - If `CampaignStatus === 'VERIFIED'` → enqueue `smsEnabled = true` update
- [ ] Validate Twilio webhook signature using `TWILIO_AUTH_TOKEN` on all webhook routes
- [ ] Register both webhook URLs in Twilio Console:
  - Brand status callback → `https://{domain}/api/webhooks/twilio/a2p/brand-status`
  - Campaign status callback → `https://{domain}/api/webhooks/twilio/a2p/campaign-status`

#### Thundering Herd Protection (17,000-Agent Scale)

> **Strategic Refinement — Webhook Queue.**
> When registering 17,000 LVR agents in batch, Twilio will fire hundreds of status callbacks simultaneously — brand approvals arriving in waves after the TCR review window closes (~day 7). Without a queue, concurrent DB writes to `a2pCampaigns`, `brands`, and `phoneNumbers` will cause row-level lock contention, missed updates, and duplicate billing events.

**Architecture: Immediate-Acknowledge + Background Worker Pattern**

```
Twilio fires webhook
       │
       ▼
POST /api/webhooks/twilio/a2p/brand-status
       │
       ├─ 1. Validate Twilio signature (sync, < 1ms)
       ├─ 2. Write raw event to `a2p_webhook_queue` table (sync, < 5ms)
       └─ 3. Return HTTP 200 immediately ← Twilio gets its ack, no timeout risk
              │
              ▼
       Background worker polls `a2p_webhook_queue`
       every 2 seconds, processes in batches of 50
              │
              ├─ UPDATE brands SET a2p_approved = true ...
              ├─ INSERT billing_events ...
              ├─ Enqueue campaign creation if needed
              └─ Mark queue row as processed
```

- [ ] Add `a2p_webhook_queue` table to `shared/schema.ts`:
  ```typescript
  export const a2pWebhookQueue = pgTable('a2p_webhook_queue', {
    id:          serial('id').primaryKey(),
    eventType:   text('event_type').notNull(),    // 'brand_status' | 'campaign_status'
    payload:     jsonb('payload').notNull(),       // raw Twilio POST body
    status:      text('status').default('pending'), // 'pending' | 'processing' | 'done' | 'failed'
    attempts:    integer('attempts').default(0),
    processedAt: timestamp('processed_at'),
    error:       text('error'),
    createdAt:   timestamp('created_at').defaultNow(),
  });
  ```

- [ ] Webhook handler writes to queue and returns 200 — **no direct DB writes to business tables in the webhook handler itself**

- [ ] Create `server/workers/a2pWebhookWorker.ts` — background processor:
  ```typescript
  // Runs every 2 seconds via setInterval or pg_cron
  // Fetches up to 50 'pending' rows, processes them, marks 'done'
  // Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent duplicate processing
  async function processA2PWebhookBatch(batchSize = 50): Promise<void> {
    const events = await db
      .select()
      .from(a2pWebhookQueue)
      .where(eq(a2pWebhookQueue.status, 'pending'))
      .orderBy(a2pWebhookQueue.createdAt)
      .limit(batchSize)
      .for('update', { skipLocked: true });

    await Promise.allSettled(events.map(processWebhookEvent));
  }
  ```

- [ ] Max concurrency cap: process no more than **50 events per cycle** to protect the DB connection pool

- [ ] Retry logic: failed events are retried up to 3 times with exponential backoff (2s, 8s, 32s); after 3 failures, `status = 'failed'` and an alert is emitted

- [ ] Add `GET /api/admin/a2p/webhook-queue` endpoint showing queue depth, pending count, and failed events for ops monitoring

---

### C3 — Fix `smsEnabled` Auto-Unlock

**Current bug:** `smsEnabled` is set to `false` at provisioning time (`server/services/agentOnboardingService.ts` line 249) and **never automatically flipped to `true`** after A2P approval.

- [ ] Remove the static `smsEnabled: false` default from `agentOnboardingService.ts`
- [ ] Let Step 10 of the workflow (webhook handler above) set `smsEnabled = true` upon `VERIFIED` status
- [ ] Add a manual override API endpoint `PATCH /api/customers/:id/sms-enabled` for admin use

---

### C4 — Consolidate `messaging_service_sid` to Single Source of Truth

The SID is currently stored in 4 places. Normalize to `a2pCampaigns.messagingServiceSid` as the authority.

| Location | Action |
|---|---|
| `a2pCampaigns.messagingServiceSid` | **Keep** — this is the authority |
| `twilioAccounts.messagingServiceSid` (schema line 906) | **Deprecate** — read from `a2pCampaigns` via join |
| `twilio_business_config.messaging_service_sid` (SQL) | **Deprecate** — legacy table |
| `twilio_configs.messaging_service_sid` (SQL) | **Deprecate** — legacy table |

- [ ] Write a one-time migration to copy SIDs into `a2pCampaigns` for any records that are in the legacy tables only
- [ ] Update all queries that read `messaging_service_sid` to use `a2pCampaigns` as the join source

---

### C5 — Expose Workflow Status in Admin Dashboard

- [ ] Ensure `GET /api/monitoring/a2p/status` returns data from the normalized tables (not just `a2p_brands` Supabase raw query)
- [ ] Ensure `GET /api/monitoring/customer/:id/a2p` reflects the current `smsEnabled` state and all 4 status stages: Profile → Brand → Campaign → Number

---

## Workstream D — Subaccount → Wholesale Reseller Migration

**Goal:** Remove the per-customer Twilio subaccount architecture and replace it with a single reseller account pattern.

**This is the highest-risk workstream. Execute last after C2 and C3 are complete.**

---

### D1 — Replace `subaccountProvisioner.ts`

**File to replace:** `server/subaccountProvisioner.ts` (888 lines)

- [ ] Create `server/resellerProvisioner.ts` with a `ResellerProvisioner` class
- [ ] New class uses only `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` (reseller creds)
- [ ] `provisionCustomer()` replaces the old flow:
  - Buy phone number → assign to Messaging Service → store `messagingServiceSid` in DB
  - **No** `api.accounts.create()` call
  - **No** per-customer `authToken` stored in DB
- [ ] Replace all 31 import references to `subaccountProvisioner` in `server/routes.ts` with `resellerProvisioner`
- [ ] Delete `server/subaccountProvisioner.ts` after all references are migrated

---

### D2 — Remove Subaccount from A2P MCP Tools

**File:** `mcp-servers/twilio/src/tools/a2p.ts`

- [ ] Remove `subaccountSid?: string` from all 17 schema definitions
- [ ] Remove `subaccountSid` parameter from all tool function signatures
- [ ] Remove `getTwilioClient(args.subaccountSid)` — replace with `getTwilioClient()` (no arg)
- [ ] Remove `twilio.create_subaccount` tool from `mcp-servers/twilio/src/index.ts`
- [ ] Remove `twilio.list_subaccounts` tool from `mcp-servers/twilio/src/index.ts`

---

### D3 — Remove Subaccount from `twilioA2pService.ts`

**File:** `server/services/twilioA2pService.ts`

- [ ] Remove `subaccountSid?: string` and `subaccountAuthToken?: string` from `MessagingServiceInput` interface (lines 34–36)
- [ ] Remove credential override logic in `createMessagingService()` (lines 236–239)
- [ ] Remove credential override logic in `addPhoneNumberToMessagingService()` (lines 290–295)
- [ ] Remove credential override logic in `createVerifyService()` (lines 417–422)

---

### D4 — Purge Pidea Branding

| File | Line | Change |
|---|---|---|
| `shared/schema.ts` | 3328 | Replace `"Pidea.ai platform"` in supervisor prompt with `process.env.PLATFORM_NAME` |
| `shared/schema.ts` | 2984 | Rename `PideaGlobalVariablesSchema` → `PlatformGlobalVariablesSchema` (keep alias for backward compat) |
| `shared/schema.ts` | 3079 | Rename `PideaGlobalVariables` type → `PlatformGlobalVariables` |
| `server/routes.ts` | 8194 | Replace hardcoded `sms.pidea.ai` domain with `process.env.SMS_SHORT_DOMAIN` |
| `server/routes.ts` | 3684 | Replace `name: 'Pidea AI'` with `name: process.env.PLATFORM_NAME \|\| 'Gateway Global AI'` |
| `server/routes.ts` | 8386–8393 | Replace OG meta title/siteName with env-var-driven values |
| `client/src/pages/brand-admin.tsx` | 647 | Replace `"Pidea AI"` in phone preview header with `senderName` prop |

#### Supervisor Persona Audit

> **Strategic Refinement — Sovereign Identity Rewrite.**
> Simply swapping the string `"Pidea.ai"` for `"Gateway Global"` in the supervisor prompt is cosmetic. The supervisor agent's behavioral DNA — its tone, scope, authority model, and use-case framing — was tuned for a generic SaaS hotel platform. For the LVR demo and production launch, the supervisor must speak as a **sovereign real estate AI operating system**, not a hotel front-desk assistant. This is not a string replace; it is a persona transplant.

**File:** `server/platform/supervisorToolExecutor.ts` (post-D8 rename) and the default `platformInstructions` value in `shared/schema.ts` (line 3328)

- [ ] **Audit the current supervisor instructions** — read `shared/schema.ts` line 3328 and the `server/pidea/agents/promptAssistantAgent.json` file in full. Document:
  - What role does it describe itself as?
  - What tools does it claim to have?
  - What industries does it reference?
  - What escalation paths does it describe?

- [ ] **Rewrite the `platformInstructions` default** in `shared/schema.ts` with a Gateway Global real estate persona:

  ```typescript
  platformInstructions: text('platform_instructions').notNull().default(`
  You are the Sovereign Supervisor Agent for Gateway Global AI — an enterprise-grade voice and SMS AI operating system built for real estate associations, brokerages, and individual agents.

  Your Core Authority:
  - You coordinate AI assistants across voice, SMS, and web channels for real estate professionals
  - You enforce A2P 10DLC compliance, ensuring all outbound SMS campaigns are properly registered
  - You have visibility into association-level (LVR/GLVAR) compliance health and individual agent status
  - You can escalate unresolved compliance issues to the association's designated compliance officer

  Your Operational Scope:
  - Buyer and seller lead capture and qualification
  - Listing inquiry handling and showing scheduling
  - Compliance-safe SMS follow-up within registered 10DLC campaigns
  - Post-closing retention and referral campaigns
  - Market report delivery and home valuation outreach

  Your Tone:
  - Authoritative but consultative — you are the expert in the room
  - Direct and concise — real estate professionals are busy
  - Compliance-first — you never send a message outside an approved campaign boundary

  You are operating on behalf of: {{company.name}}
  Association affiliation: {{association.name | 'Independent'}}
  Current A2P status: {{a2p.overallStatus}}
  `.trim())
  ```

- [ ] **Rewrite `promptAssistantAgent.json`** (currently at `server/pidea/agents/`, moves to `server/platform/agents/` in D8):
  - Replace all hospitality/hotel references with real estate equivalents
  - Replace "guest" persona with "client" / "prospect" / "homeowner"
  - Add LVR association context as an optional system variable
  - Remove any references to room reservations, check-in, or hotel amenities

- [ ] **Add a `SUPERVISOR_PERSONA` env var** so the persona can be overridden per deployment without a code change:
  ```
  SUPERVISOR_PERSONA=real_estate_sovereign   # default for Gateway Global
  SUPERVISOR_PERSONA=hospitality             # legacy hotel deployments
  SUPERVISOR_PERSONA=custom                  # loads from DB platformInstructions
  ```

- [ ] **Add persona validation to the onboarding check** — if `SUPERVISOR_PERSONA` is not set, log a startup warning: `"No SUPERVISOR_PERSONA configured — defaulting to real_estate_sovereign. Set this env var to suppress warning."`

---

### D5 — Reconcile Duplicate SQL Migration Files (Shadow Mode)

**Problem:** Two versions of the same table exist and neither maps 1:1 to the ORM schema. `messaging_service_sid` values for existing test users live in `twilio_configs` and `twilio_business_config`. If those tables are dropped before migration is verified, SMS routing for current live numbers breaks permanently.

> **Strategic Refinement — Shadow Mode Migration.**
> Do NOT drop the legacy tables until a production build has confirmed that every `messaging_service_sid` in the legacy tables resolves successfully via the new `a2pCampaigns` join. Run both sources in parallel for one full billing cycle (30 days), then archive.

| File Pair | Action |
|---|---|
| `create-twilio-business-config.sql` vs `create-twilio-business-config-v2.sql` | **Keep live** during shadow period; archive after verification |
| `create-onboarding-tables.sql` vs `create-onboarding-tables-v2.sql` | **Keep live** during shadow period; archive after verification |

#### Shadow Mode Implementation

**Phase 5a — Populate (run first, no deletions):**

- [ ] Generate a single canonical Drizzle migration using `drizzle-kit generate` from `shared/schema.ts`
- [ ] Write a one-time backfill script `scripts/migrate-sids-to-a2p-campaigns.ts`:
  ```typescript
  // For every row in twilio_configs or twilio_business_config that has a messaging_service_sid
  // but NO matching row in a2pCampaigns, insert a synthetic a2pCampaigns row to preserve the SID
  const legacySids = await db.execute(sql`
    SELECT tc.customer_id, tc.messaging_service_sid, tc.a2p_brand_sid
    FROM twilio_configs tc
    LEFT JOIN a2p_campaigns ac ON ac.messaging_service_sid = tc.messaging_service_sid
    WHERE tc.messaging_service_sid IS NOT NULL
      AND ac.id IS NULL
  `);
  // Insert synthetic campaigns for each orphaned SID
  ```
- [ ] Run backfill in staging → verify row counts match
- [ ] Run backfill in production → verify row counts match
- [ ] Enable a **shadow read** in all SMS routing code: if `a2pCampaigns` lookup returns null, fall back to `twilio_configs` (log a warning but do not fail)

**Phase 5b — Verify (30-day observation window):**

- [ ] Add a monitoring counter: `legacy_sid_fallback_count` — increments every time the shadow fallback is triggered
- [ ] At end of 30-day window, check counter via `GET /api/admin/migration/shadow-stats`
- [ ] If counter is 0 for 7 consecutive days → proceed to Phase 5c
- [ ] If counter is still nonzero → investigate which customers have not been migrated and run targeted backfill

**Phase 5c — Archive (only after Phase 5b passes):**

- [ ] Remove shadow fallback read logic from SMS routing
- [ ] Archive the old SQL files to `scripts/sql/_archive/`
- [ ] Drop `twilio_configs` and `twilio_business_config` tables via a named Drizzle migration (not raw SQL)
- [ ] Verify the final migration covers all columns from both v1 and v2 SQL files

---

### D6 — Update Environment Variables

- [ ] Remove `TWILIO_MASTER_ACCOUNT_SID` from all configs and `.env` files
- [ ] Remove `TWILIO_MASTER_AUTH_TOKEN` from all configs and `.env` files
- [ ] Rename references in `server/config.ts` (lines 94–95):
  ```typescript
  // REMOVE:
  masterAccountSid: process.env.TWILIO_MASTER_ACCOUNT_SID || '',
  masterAuthToken:  process.env.TWILIO_MASTER_AUTH_TOKEN  || '',
  ```
- [ ] Add new env vars (see table below)

---

### D7 — Ledger Attribution

> **War Room Addition — Wholesale Cost Pass-Through.**
> In the Wholesale Reseller model, the reseller account pays Twilio directly for all TCR fees: **$4.41 one-time brand vetting**, **$10/month per campaign**, and potential secondary vetting fees (~$40). These costs must be recorded as internal billing events at the moment they are incurred so they can be passed through to each agent's monthly invoice without manual reconciliation.

**Where to add:** `server/services/twilioA2pService.ts` — emit a billing event immediately after each fee-incurring Twilio call succeeds.

#### Billing Events to Capture

| Event | Trigger | Amount | Table |
|---|---|---|---|
| `a2p_brand_registration` | `brandRegistrations.create` returns `status: PENDING` | $4.41 (one-time) | `billing_events` |
| `a2p_secondary_vetting` | Brand status callback returns `FAILED` with vetting error → retry | ~$40.00 (one-time) | `billing_events` |
| `a2p_campaign_monthly` | Campaign status callback returns `VERIFIED` | $10.00/month | `billing_events` + `recurring_charges` |
| `a2p_campaign_registration` | `usAppToPerson.create` call succeeds | $0.00 (absorbed in monthly) | `billing_events` (informational) |

#### Implementation

- [ ] Add `billing_events` table to `shared/schema.ts` if it does not already exist:
  ```typescript
  export const billingEvents = pgTable('billing_events', {
    id:             serial('id').primaryKey(),
    organizationId: integer('organization_id').references(() => organizations.id).notNull(),
    customerId:     integer('customer_id').references(() => customers.id),
    eventType:      text('event_type').notNull(),     // 'a2p_brand_registration', etc.
    amountCents:    integer('amount_cents').notNull(), // wholesale cost in cents
    currency:       text('currency').default('USD'),
    referenceId:    text('reference_id'),             // Twilio SID that triggered the charge
    description:    text('description'),
    billedToCustomer: boolean('billed_to_customer').default(false),
    createdAt:      timestamp('created_at').defaultNow(),
  });
  ```

- [ ] Create `server/services/billingLedgerService.ts` with a single function:
  ```typescript
  export async function recordA2PBillingEvent(
    organizationId: number,
    customerId: number | null,
    eventType: 'a2p_brand_registration' | 'a2p_secondary_vetting' | 'a2p_campaign_monthly',
    referenceId: string,   // Twilio Brand SID or Campaign SID
    description: string
  ): Promise<void>
  ```

- [ ] Call `recordA2PBillingEvent()` in `twilioA2pService.ts`:
  - After `submitBrandRegistration()` succeeds → emit `a2p_brand_registration` ($4.41)
  - After `submitCampaign()` succeeds → emit `a2p_campaign_monthly` ($10.00)

- [ ] Call `recordA2PBillingEvent()` in the C2 webhook handler (`a2pWebhookRoutes.ts`):
  - On brand `FAILED` status with vetting error code → emit `a2p_secondary_vetting` ($40.00) if a retry is triggered

- [ ] Add `GET /api/admin/billing/a2p-events` endpoint scoped to admin role — returns all events with `billedToCustomer` status for monthly invoice reconciliation

- [ ] Add `PATCH /api/admin/billing/a2p-events/:id/mark-billed` to mark events as passed through to the customer's invoice

#### Recurring Charge Scheduler

- [ ] Add a monthly cron job (or Supabase scheduled function) that:
  1. Queries all active `a2p_campaign_monthly` events where `billedToCustomer = false`
  2. Creates a new `billing_events` row for the current month
  3. Marks the previous month's row as `billedToCustomer = true`

---

### D8 — Full Directory Exorcism

> **War Room Addition — Sovereign Brand Illusion.**
> The directory `server/pidea/` still exists and its modules are imported via paths like `import('./pidea/a2pComplianceService')`. These paths surface in stack traces, error logs, API routes (`/api/pidea/compliance/analyze`), and developer tooling. Any external developer, auditor, or board member reading network traffic or error logs will see "pidea" and break the Gateway Global sovereign brand identity.

**Current `server/pidea/` contents (7 files):**
```
server/pidea/
├── a2pComplianceService.ts       → server/platform/a2pComplianceService.ts
├── globalVariables.ts            → server/platform/globalVariables.ts
├── humanFallbackService.ts       → server/platform/humanFallbackService.ts
├── intakeFormService.ts          → server/platform/intakeFormService.ts
├── platformIdentityService.ts    → server/platform/platformIdentityService.ts
├── promptEngineeringService.ts   → server/platform/promptEngineeringService.ts
├── supervisorToolExecutor.ts     → server/platform/supervisorToolExecutor.ts
└── agents/
    └── promptAssistantAgent.json → server/platform/agents/promptAssistantAgent.json
```

#### Migration Steps

- [ ] Create `server/platform/` directory
- [ ] Move all 7 files from `server/pidea/` to `server/platform/` — **do not rename the files**, only the directory
- [ ] Update all internal cross-imports within the moved files (files that import each other via `./` relative paths are fine; only imports from outside the directory need updating)
- [ ] Global find-and-replace across the entire codebase:
  ```
  FROM: import('./pidea/
  TO:   import('./platform/
  ```
  ```
  FROM: from './pidea/
  TO:   from './platform/
  ```
  ```
  FROM: from '../pidea/
  TO:   from '../platform/
  ```
- [ ] Rename all HTTP route paths that expose `pidea` in the URL:

| Old Route | New Route | File |
|---|---|---|
| `POST /api/pidea/compliance/analyze` | `POST /api/platform/compliance/analyze` | `server/routes.ts:8817` |
| `POST /api/pidea/identity/start-otp` | `POST /api/platform/identity/start-otp` | `server/routes.ts:8846` |
| `POST /api/pidea/identity/verify-otp` | `POST /api/platform/identity/verify-otp` | `server/routes.ts:8885` |
| `GET  /api/pidea/identity/:id` | `GET  /api/platform/identity/:id` | `server/routes.ts:8919` |
| `GET  /api/pidea/fallback/contacts` | `GET  /api/platform/fallback/contacts` | `server/routes.ts:8954` |
| `POST /api/pidea/global-variables/preview` | `POST /api/platform/global-variables/preview` | `server/routes.ts:8978` |
| `POST /api/pidea/contact` | `POST /api/platform/contact` | `server/routes.ts:8781` |

- [ ] Add **redirect shims** for any routes that may be called by existing integrations:
  ```typescript
  // Backward-compat redirects — remove after 90 days
  app.all('/api/pidea/*', (req, res) => {
    const newPath = req.path.replace('/api/pidea/', '/api/platform/');
    res.redirect(308, newPath);
  });
  ```
- [ ] Delete `server/pidea/` directory after all references are confirmed migrated
- [ ] Run `grep -r "pidea" ./server ./shared ./client/src --include="*.ts" --include="*.tsx"` and confirm zero hits (excluding asset file references and the `_archive/` folder)

#### Verification Command

```bash
# Run this after D8 is complete — should return 0 results
grep -rn \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.json" \
  -i "pidea" \
  ./server ./shared ./client/src \
  | grep -v "_archive" \
  | grep -v "node_modules" \
  | grep -v ".png" \
  | grep -v ".jpg"
```

---

## Workstream E — Hierarchical UUID Governance

**Goal:** Implement an Association-level parent entity model that groups individual agents (e.g., 17,000 Las Vegas REALTORS®) under a single Master UUID (LVR/GLVAR). This enables batch compliance actions, aggregated reporting, association-sponsored billing, and association-level AI persona customization.

**Target use case:** Las Vegas REALTORS® (GLVAR) Association launch — 17,000 individual agents under one parent entity.

**This workstream is additive — it does not break or replace any existing tables.** It layers a parent-child governance model on top of the existing `organizations`, `customers`, and `brands` schema.

---

### E1 — Association Master UUID Schema

**Goal:** Add an `associations` table and `association_id` foreign key to the existing `customers` and `brands` tables.

- [ ] Add `associations` table to `shared/schema.ts`:
  ```typescript
  export const associations = pgTable('associations', {
    id:              uuid('id').primaryKey().defaultRandom(),  // The Master UUID
    name:            text('name').notNull(),                   // "Las Vegas REALTORS® (GLVAR)"
    shortCode:       text('short_code').notNull().unique(),    // "LVR", "NAR", "CAR"
    mlsCode:         text('mls_code'),                         // "GLVAR" — MLS identifier
    sponsorBilling:  boolean('sponsor_billing').default(false), // LVR pays for member agents
    sponsorLimit:    integer('sponsor_limit'),                  // max sponsored agent count
    defaultPersona:  text('default_persona').default('real_estate_sovereign'),
    defaultIndustry: text('default_industry').default('real_estate'),
    contactEmail:    text('contact_email'),
    website:         text('website'),
    // A2P — Association may file one brand on behalf of all members
    masterBrandSid:  text('master_brand_sid'),                 // Twilio Brand SID for assoc.
    masterEin:       text('master_ein'),                       // Association EIN (e.g. GLVAR's)
    createdAt:       timestamp('created_at').defaultNow(),
    updatedAt:       timestamp('updated_at').defaultNow(),
  });
  ```

- [ ] Add `associationId` FK to `customers` table (nullable — not all customers belong to an association):
  ```typescript
  associationId: uuid('association_id').references(() => associations.id),
  ```

- [ ] Add `associationId` FK to `brands` table:
  ```typescript
  associationId: uuid('association_id').references(() => associations.id),
  ```

- [ ] Add `associationId` FK to `billingEvents` table (enables association-scoped cost reporting):
  ```typescript
  associationId: uuid('association_id').references(() => associations.id),
  ```

- [ ] Create index: `idx_customers_association_id` on `customers(association_id)` — required for batch queries over 17,000 rows

- [ ] Create index: `idx_billing_events_association_id` on `billing_events(association_id)`

- [ ] Write a one-time seed script `scripts/seed-lvr-association.ts` that creates the LVR GLVAR association record and links all existing real estate customers to it

---

### E2 — Association-Level MCP Tool: `monitoring_get_association_stats`

**Goal:** Give the LVR Board a "God View" — a single API call that returns the complete compliance and billing health of all 17,000 member agents.

- [ ] Add `monitoring_get_association_stats` to `mcp-servers/monitoring/src/index.ts`:

  ```typescript
  // Tool definition
  {
    name: "monitoring_get_association_stats",
    description: "Get aggregate compliance, billing, and activity statistics for an entire association (e.g., LVR/GLVAR). Returns overall health percentage, campaign counts, and agent breakdowns.",
    inputSchema: {
      type: "object",
      properties: {
        associationId: { type: "string", description: "Association UUID (Master UUID)" },
        shortCode:     { type: "string", description: "Association short code (e.g. 'LVR')" },
        includeAgentList: { type: "boolean", default: false, description: "Include per-agent detail rows (slow for large associations)" }
      }
    }
  }
  ```

- [ ] Implement `getAssociationStatsTool()` in `mcp-servers/monitoring/src/tools/associationStats.ts`:

  ```typescript
  export interface AssociationStats {
    associationId:      string;
    associationName:    string;
    reportGeneratedAt:  string;
    agents: {
      total:            number;
      compliant:        number;          // brand + campaign VERIFIED
      pending:          number;          // in TrustHub review or TCR queue
      actionRequired:   number;          // rejected or stalled
      nonCompliant:     number;          // not started
      complianceRate:   string;          // "94.2%"
    };
    campaigns: {
      total:            number;
      active:           number;
      pending:          number;
      failed:           number;
    };
    billing: {
      totalBrandFeesCents:    number;    // total $4.41 fees incurred this month
      totalCampaignFeesCents: number;    // total $10/mo fees active
      sponsoredAgentCount:    number;    // agents on association's bill
      selfPayAgentCount:      number;    // agents on their own bill
    };
    actionRequired: Array<{             // agents needing attention
      agentId:   string;
      agentName: string;
      issue:     string;
    }>;
  }
  ```

- [ ] The tool query must complete in < 2 seconds for 17,000 agents — use a single aggregated SQL query, not a loop:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE a2p_status = 'compliant')    AS compliant,
    COUNT(*) FILTER (WHERE a2p_status = 'pending')      AS pending,
    COUNT(*) FILTER (WHERE a2p_status = 'action_required') AS action_required,
    COUNT(*) FILTER (WHERE a2p_status = 'non_compliant') AS non_compliant,
    COUNT(*) AS total
  FROM customers
  WHERE association_id = $1
  ```

- [ ] Add `GET /api/associations/:id/stats` HTTP endpoint backed by this tool — requires `admin` or `association_manager` role

- [ ] Add `GET /api/associations/:shortCode/stats` alias (e.g., `/api/associations/LVR/stats`)

---

### E3 — Association-Level Batch Actions

**Goal:** Allow a single API call to push compliance updates, persona changes, or AI template changes to all agents in an association simultaneously, rather than updating 17,000 individual rows.

- [ ] Add `POST /api/associations/:id/batch-update` endpoint with `role: 'association_admin'` guard:
  ```typescript
  // Request body
  {
    action: 'update_persona' | 'enable_sms' | 'disable_sms' | 'reset_campaigns' | 'assign_template',
    payload: Record<string, any>,
    agentFilter?: {
      status?: 'non_compliant' | 'pending' | 'action_required';  // only target subset
      agentIds?: string[];  // or specific agents
    }
  }
  ```

- [ ] Implement as a **queued batch job** (same worker architecture as C2) — do not run 17,000 DB writes synchronously in the request handler:
  ```typescript
  // Batch handler returns immediately with a job ID
  // Worker processes up to 500 agents per cycle
  { jobId: "batch_abc123", estimatedDurationMinutes: 3, targetCount: 17000 }
  ```

- [ ] Add `GET /api/associations/:id/batch-jobs/:jobId` to check batch job status

- [ ] **Specific LVR launch action:** `enable_sms` for all agents where `campaign_status === 'VERIFIED'` — the single call that activates SMS for all 17,000 agents once their campaigns are approved

---

### E4 — Association-Level Billing Shield

**Goal:** Allow LVR to sponsor the A2P registration fees for the first N members, routing those costs to the association's corporate ledger instead of individual agent cards.

- [ ] Add `sponsorBilling: true` and `sponsorLimit: 1000` to the LVR association record (first 1,000 agents are sponsored)

- [ ] Modify `billingLedgerService.ts` to check association sponsorship before assigning billing:
  ```typescript
  async function recordA2PBillingEvent(organizationId, customerId, eventType, ...) {
    // Check if this customer belongs to a sponsor association
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });

    if (customer?.associationId) {
      const assoc = await db.query.associations.findFirst({
        where: eq(associations.id, customer.associationId)
      });

      const sponsoredCount = await getSponsoredAgentCount(assoc.id);

      if (assoc.sponsorBilling && sponsoredCount < (assoc.sponsorLimit ?? 0)) {
        // Route billing event to association, not individual agent
        return insertBillingEvent({ ...event, billedToAssociationId: assoc.id, customerId: null });
      }
    }

    // Default: bill the individual agent
    return insertBillingEvent({ ...event, customerId });
  }
  ```

- [ ] Add `GET /api/associations/:id/billing` endpoint — returns association-level billing summary:
  - Total fees sponsored this month
  - Remaining sponsor capacity
  - Breakdown by event type

- [ ] Expose `sponsorLimit` as configurable in the association admin UI — LVR admin can raise or lower the cap without a code change

---

### E5 — Association-Level iPhone Emulator Template

**Goal:** Allow LVR to set a "Default Real Estate Template" in the `PhonePreview` emulator so that all 17,000 member agents see LVR-branded sample messages instead of the generic defaults.

- [ ] Add `defaultPhonePreviewTemplate` JSONB column to `associations` table:
  ```typescript
  defaultPhonePreviewTemplate: jsonb('default_phone_preview_template'),
  // Stores: { senderName, linkCardContent, messages: { verification, engagement, retention, sales } }
  ```

- [ ] In `brand-admin.tsx`, when `generateCampaignTemplates()` is called, check if the current user belongs to an association with a `defaultPhonePreviewTemplate`:
  ```typescript
  const associationTemplate = association?.defaultPhonePreviewTemplate;
  const templates = associationTemplate
    ? mergeWithAssociationDefaults(generateCampaignTemplates(companyName, industry), associationTemplate)
    : generateCampaignTemplates(companyName, industry);
  ```

- [ ] **LVR default template** should pre-populate:
  - `senderName`: `"{Agent Name} | Las Vegas REALTORS®"`
  - Third message link card: LVR-branded listing preview with LVR logo
  - All sample messages include LVR membership disclosure: `"Licensed REALTOR® | Las Vegas REALTORS® MLS"`

- [ ] Add `PUT /api/associations/:id/phone-preview-template` for association admins to update the default template without a deployment

---

## Workstream S — Sovereign Security Layer

**Goal:** Harden the platform against the four highest-impact attack vectors that emerge when a single Wholesale Reseller account controls A2P registration, `smsEnabled` toggling, and billing for 17,000 agents. Standard username/password or SMS-2FA is insufficient at this privilege level.

**Threat Model:**
- A compromised `admin` session can disable SMS for thousands of agents or register fraudulent brands under the reseller account
- A stolen `TWILIO_AUTH_TOKEN` with no audit trail leaves no forensic record for carrier compliance disputes
- The LVR Board dashboard exposes aggregate PII (agent names, phone numbers, compliance status) that must be geofenced
- Batch operations (E3) represent a "nuclear button" — one API call changes 17,000 rows

**This workstream has zero dependencies on other workstreams and should be started in parallel with Phase 1.**

---

### S1 — RBAC Hardening & Hardware MFA

> **Requirement:** Enforce FIDO2/WebAuthn (YubiKey, Touch ID, Face ID) for any session that accesses the `SUPREME_ADMIN` or `association_admin` role. Standard password + SMS-2FA is vulnerable to SIM swapping — unacceptable at the Master UUID level.

#### Role Definitions

- [ ] Add a `UserRole` enum to `shared/schema.ts` if not already defined:
  ```typescript
  export const USER_ROLES = [
    'agent',             // individual REALTOR — self-service only
    'brokerage_admin',   // manages agents within a brokerage
    'association_admin', // LVR board — manages all agents in the association
    'admin',             // Gateway Global platform admin
    'supreme_admin',     // highest privilege — can trigger batch operations and Twilio reseller actions
  ] as const;
  export type UserRole = typeof USER_ROLES[number];
  ```

- [ ] Add `hardwareMfaRequired: boolean` to the role configuration:
  ```typescript
  export const ROLE_SECURITY_POLICY: Record<UserRole, { hardwareMfaRequired: boolean; ipAllowlistRequired: boolean }> = {
    agent:             { hardwareMfaRequired: false, ipAllowlistRequired: false },
    brokerage_admin:   { hardwareMfaRequired: false, ipAllowlistRequired: false },
    association_admin: { hardwareMfaRequired: true,  ipAllowlistRequired: true  },
    admin:             { hardwareMfaRequired: true,  ipAllowlistRequired: false },
    supreme_admin:     { hardwareMfaRequired: true,  ipAllowlistRequired: true  },
  };
  ```

#### Hardware MFA Implementation (FIDO2/WebAuthn)

- [ ] Add `hardware_verified` boolean field to the session/JWT payload — defaults to `false`

- [ ] Integrate a WebAuthn library (e.g., `@simplewebauthn/server` for Node.js):
  ```bash
  npm install @simplewebauthn/server @simplewebauthn/browser
  ```

- [ ] Add two auth endpoints in `server/routes/authRoutes.ts`:
  - `POST /api/auth/webauthn/register` — registers a hardware authenticator for an admin user
  - `POST /api/auth/webauthn/authenticate` — verifies a hardware challenge and sets `hardware_verified = true` in the session (expires after 8 hours of inactivity)

- [ ] Add `requireHardwareMfa` middleware:
  ```typescript
  export function requireHardwareMfa(req: Request, res: Response, next: NextFunction) {
    const session = req.session as AppSession;
    if (!session?.hardware_verified) {
      return res.status(403).json({
        error: 'HARDWARE_MFA_REQUIRED',
        message: 'This action requires hardware-based authentication (FIDO2/WebAuthn). Please authenticate with your security key or biometric to proceed.',
        webauthnUrl: '/api/auth/webauthn/authenticate',
      });
    }
    next();
  }
  ```

- [ ] Apply `requireHardwareMfa` to:
  - All routes under `/api/admin/`
  - `POST /api/associations/:id/batch-update` (E3)
  - `POST /api/auth/high-privilege-session` (S3)
  - `GET /api/associations/:id/stats` (E2)
  - `GET /api/admin/billing/a2p-events` (D7)

- [ ] Store registered authenticators in a `user_authenticators` table:
  ```typescript
  export const userAuthenticators = pgTable('user_authenticators', {
    id:           serial('id').primaryKey(),
    userId:       integer('user_id').references(() => users.id).notNull(),
    credentialId: text('credential_id').notNull().unique(),
    publicKey:    text('public_key').notNull(),
    counter:      integer('counter').notNull().default(0),
    deviceName:   text('device_name'),           // "YubiKey 5C", "MacBook Touch ID"
    lastUsedAt:   timestamp('last_used_at'),
    createdAt:    timestamp('created_at').defaultNow(),
  });
  ```

- [ ] Admin UI: Add a "Security Keys" section in the user profile page showing registered authenticators with the ability to add/remove them

---

### S2 — Admin Geofencing

> **Requirement:** Lock the "Supreme" endpoints and the LVR Association dashboard to a "Known Safe" IP list. If a session with `association_admin` or `supreme_admin` role originates from an unrecognized IP, deny access before any data is returned.

#### Implementation

- [ ] Add `IP_ALLOWLIST` environment variable — comma-separated CIDR ranges:
  ```
  IP_ALLOWLIST=203.0.113.0/24,198.51.100.45/32,10.0.0.0/8
  ```
  Empty string = allowlist disabled (development mode). Production must always have this set.

- [ ] Add `requireIpAllowlist` middleware:
  ```typescript
  import { isIPInAllowlist } from '../lib/ipUtils';

  export function requireIpAllowlist(req: Request, res: Response, next: NextFunction) {
    const allowlist = process.env.IP_ALLOWLIST;
    if (!allowlist) return next(); // disabled in dev

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '';

    if (!isIPInAllowlist(clientIp, allowlist.split(','))) {
      // Log the blocked attempt to audit_log before rejecting
      logSecurityEvent('ip_blocked', { ip: clientIp, path: req.path, userId: req.session?.userId });
      return res.status(403).json({
        error: 'IP_NOT_ALLOWLISTED',
        message: 'Access to this resource is restricted to approved network locations.',
      });
    }
    next();
  }
  ```

- [ ] Create `server/lib/ipUtils.ts` with CIDR matching using the `cidr-regex` or `ip-range-check` package:
  ```bash
  npm install ip-range-check
  ```
  ```typescript
  import ipRangeCheck from 'ip-range-check';
  export function isIPInAllowlist(ip: string, ranges: string[]): boolean {
    return ipRangeCheck(ip, ranges);
  }
  ```

- [ ] Apply `requireIpAllowlist` (stacked with `requireHardwareMfa`) to:
  - All `/api/admin/` routes
  - All `/api/associations/:id/` routes
  - All MCP tool endpoints in `mcp-servers/`
  - `GET /api/monitoring/a2p/status`
  - `GET /api/monitoring/customer/:id/a2p`

- [ ] **Association-specific override:** If the requesting session's `organizationId` matches `process.env.DEFAULT_ASSOCIATION_ID` (the LVR Master UUID), apply the stricter association IP list from `associations.allowedIpRanges` column rather than the global `IP_ALLOWLIST`:

  ```typescript
  // Add to associations table schema
  allowedIpRanges: text('allowed_ip_ranges').array(), // ['203.0.113.0/24', '198.51.100.45/32']
  ```

- [ ] Startup validation: if `NODE_ENV === 'production'` and `IP_ALLOWLIST` is empty, emit a **startup warning** (not a crash):
  ```
  [SECURITY WARNING] IP_ALLOWLIST is not configured. Admin endpoints are accessible from any IP. Set IP_ALLOWLIST in production.
  ```

---

### S3 — Short-Lived Delegated Tokens

> **Requirement:** The persistent `TWILIO_AUTH_TOKEN` must never be the active credential for destructive batch operations. Instead, `supreme_admin` users must explicitly request a "High-Privilege Session" — a scoped JWT with a 30-minute TTL — before any batch registration or `smsEnabled` toggle can be executed. Authority is **off by default.**

#### High-Privilege Session Architecture

```
SUPREME_ADMIN user clicks "Start Batch Registration"
          │
          ▼
POST /api/auth/high-privilege-session
  [Requires: active hardware_verified session + IP allowlist]
          │
          ▼
Server generates scoped JWT:
  {
    sub: userId,
    role: 'supreme_admin',
    associationId: 'LVR-UUID',
    allowedActions: ['createBrandRegistration', 'createCampaign', 'enableSms', 'batchUpdate'],
    iat: now,
    exp: now + 1800  ← 30 minutes
  }
          │
          ▼
Client stores token in memory only (NOT localStorage, NOT a cookie)
          │
          ▼
All privileged API calls include: Authorization: Bearer <high-privilege-jwt>
Server validates TTL on every request — expired = re-authenticate
```

#### Implementation

- [ ] Add `POST /api/auth/high-privilege-session` endpoint in `server/routes/authRoutes.ts`:
  ```typescript
  app.post('/api/auth/high-privilege-session',
    requireHardwareMfa,
    requireIpAllowlist,
    async (req, res) => {
      const user = req.session.user;
      if (!['supreme_admin', 'association_admin'].includes(user.role)) {
        return res.status(403).json({ error: 'INSUFFICIENT_ROLE' });
      }

      const token = jwt.sign(
        {
          sub:            user.id,
          role:           user.role,
          associationId:  user.associationId ?? null,
          allowedActions: ['createBrandRegistration', 'createCampaign', 'enableSms', 'batchUpdate'],
          sessionType:    'high_privilege',
        },
        process.env.HIGH_PRIVILEGE_JWT_SECRET!,
        { expiresIn: '30m' }
      );

      // Write to audit log
      await logAuditEvent({
        action:        'high_privilege_session_created',
        actorId:       user.id,
        associationId: user.associationId,
        ipAddress:     getClientIp(req),
        metadata:      { expiresIn: '30m' },
      });

      res.json({ token, expiresIn: 1800, expiresAt: new Date(Date.now() + 1800000).toISOString() });
    }
  );
  ```

- [ ] Add `validateHighPrivilegeToken` middleware:
  ```typescript
  export function requireHighPrivilegeToken(allowedActions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({
          error: 'HIGH_PRIVILEGE_TOKEN_REQUIRED',
          message: 'This action requires a High-Privilege Session token. Request one via POST /api/auth/high-privilege-session.',
        });
      }

      try {
        const payload = jwt.verify(token, process.env.HIGH_PRIVILEGE_JWT_SECRET!) as HighPrivilegePayload;
        const canPerform = allowedActions.every(a => payload.allowedActions.includes(a));
        if (!canPerform) return res.status(403).json({ error: 'ACTION_NOT_PERMITTED_IN_SESSION' });
        req.highPrivilegeSession = payload;
        next();
      } catch (err) {
        return res.status(401).json({
          error: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Your High-Privilege Session has expired. Please re-authenticate.',
        });
      }
    };
  }
  ```

- [ ] Apply `requireHighPrivilegeToken` to:
  - `POST /api/associations/:id/batch-update` (E3) — requires `batchUpdate` in token
  - `POST /api/twilio/a2p/brands` (brand registration) — requires `createBrandRegistration`
  - `POST /api/twilio/a2p/campaigns` (campaign creation) — requires `createCampaign`
  - `PATCH /api/customers/:id/sms-enabled` (C3 manual override) — requires `enableSms`

- [ ] **MCP Tool integration:** The `createBrandRegistrationTool` and `createCampaignTool` in `mcp-servers/twilio/src/tools/a2p.ts` must accept a `highPrivilegeToken` parameter and forward it in the HTTP request to the API server:
  ```typescript
  // Add to tool input schema
  highPrivilegeToken: {
    type: "string",
    description: "30-minute high-privilege JWT obtained from POST /api/auth/high-privilege-session. Required for all brand registration and campaign creation operations."
  }
  ```

- [ ] Client-side: High-Privilege Session must be stored in React component state (`useState`) — never in `localStorage`, `sessionStorage`, or a cookie. Show a countdown timer in the UI. When expired, show "Session Expired — Re-authenticate" modal.

---

### S4 — Immutable Sovereign Audit Log

> **Requirement:** Every call to the TrustHub Registration Workflow, every `smsEnabled` state change, and every batch operation must be recorded in a tamper-proof `audit_log` table. This is the "black box" for carrier compliance disputes, LVR board governance inquiries, and security forensics.
>
> **Tamper-proof:** The table must have no `UPDATE` or `DELETE` permissions granted at the database role level. Rows are append-only. In Supabase, this is enforced via Row Level Security (RLS) policies.

#### Audit Log Schema

- [ ] Add `audit_log` table to `shared/schema.ts`:
  ```typescript
  export const auditLog = pgTable('audit_log', {
    id:            bigserial('id', { mode: 'number' }).primaryKey(),
    // Who
    actorId:       integer('actor_id'),          // user ID of the initiator (null for system events)
    actorRole:     text('actor_role'),            // 'supreme_admin', 'system', 'webhook', etc.
    actorIp:       text('actor_ip'),             // IPv4 or IPv6 of the request origin
    // What
    action:        text('action').notNull(),      // see ACTION REGISTRY below
    // Context
    associationId: uuid('association_id'),        // LVR Master UUID if applicable
    customerId:    integer('customer_id'),        // individual agent if applicable
    organizationId: integer('organization_id'),
    // Payload
    referenceId:   text('reference_id'),          // Twilio SID, batch job ID, etc.
    metadata:      jsonb('metadata'),             // action-specific details
    payloadHash:   text('payload_hash'),          // SHA-256 of metadata JSON — integrity check
    // Outcome
    success:       boolean('success').notNull().default(true),
    errorMessage:  text('error_message'),
    // Timestamp (immutable — set by DB, not application code)
    createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  });
  ```

#### Action Registry

| Action | Trigger |
|---|---|
| `brand_registration_submitted` | `createBrandRegistrationTool` called |
| `brand_registration_approved` | Brand status webhook returns `APPROVED` |
| `brand_registration_failed` | Brand status webhook returns `FAILED` |
| `campaign_created` | `createCampaignTool` called |
| `campaign_verified` | Campaign status webhook returns `VERIFIED` |
| `sms_enabled` | `smsEnabled` set to `true` (auto via webhook or manual override) |
| `sms_disabled` | `smsEnabled` set to `false` |
| `batch_update_initiated` | `POST /api/associations/:id/batch-update` called |
| `batch_update_completed` | Batch job worker finishes all rows |
| `high_privilege_session_created` | `POST /api/auth/high-privilege-session` succeeds |
| `high_privilege_session_expired` | Token TTL exceeded on a request |
| `hardware_mfa_authenticated` | WebAuthn challenge completed successfully |
| `ip_blocked` | Request rejected by IP allowlist middleware |
| `trusthub_profile_created` | Step 1 of C1 workflow |
| `trusthub_end_user_created` | Step 2 of C1 workflow |
| `trusthub_profile_submitted` | Step 6 of C1 workflow (blocking) |
| `ein_confirmation_recorded` | Agent acknowledges EIN legal name match (A6) |

#### Implementation

- [ ] Create `server/services/auditLogService.ts`:
  ```typescript
  import crypto from 'crypto';

  export interface AuditEventInput {
    actorId?:       number;
    actorRole?:     string;
    actorIp?:       string;
    action:         string;
    associationId?: string;
    customerId?:    number;
    organizationId?: number;
    referenceId?:   string;
    metadata?:      Record<string, unknown>;
    success?:       boolean;
    errorMessage?:  string;
  }

  export async function logAuditEvent(event: AuditEventInput): Promise<void> {
    const metadataJson = JSON.stringify(event.metadata ?? {});
    const payloadHash  = crypto.createHash('sha256').update(metadataJson).digest('hex');

    await db.insert(auditLog).values({
      ...event,
      payloadHash,
      success: event.success ?? true,
    });
    // Note: this function NEVER throws — audit log failures must not block the primary operation.
    // Log to stderr if the insert fails; do not propagate.
  }
  ```

- [ ] **Wire into every TrustHub step** in `mcp-servers/twilio/src/tools/a2p.ts` — add a `logAuditEvent()` call in the `try/catch` of each tool:
  ```typescript
  // Example: createBrandRegistrationTool
  try {
    const result = await twilioClient.messaging.v1.brandRegistrations.create(params);
    await logAuditEvent({
      action: 'brand_registration_submitted',
      actorId: context.userId,
      actorIp: context.ipAddress,
      associationId: context.associationId,
      customerId: context.customerId,
      referenceId: result.sid,
      metadata: { brandSid: result.sid, status: result.status },
      success: true,
    });
    return result;
  } catch (err) {
    await logAuditEvent({ action: 'brand_registration_submitted', ..., success: false, errorMessage: err.message });
    throw err;
  }
  ```

- [ ] **Wire into `smsEnabled` changes** in `a2pWebhookWorker.ts` and the manual override endpoint (C3):
  - Every `smsEnabled = true` write → `logAuditEvent({ action: 'sms_enabled', ... })`
  - Every `smsEnabled = false` write → `logAuditEvent({ action: 'sms_disabled', ... })`

- [ ] **Wire into batch operations** (E3) — log at job initiation AND on each agent processed by the worker (use `metadata: { agentId, action, batchJobId }`)

- [ ] **Wire into A6 EIN confirmation** — log `ein_confirmation_recorded` when `legalNameConfirmed` is set to `true`

#### Tamper-Proof Enforcement (Supabase RLS)

- [ ] Apply Row Level Security to `audit_log` in Supabase:
  ```sql
  -- Enable RLS
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

  -- Allow INSERT from the service role only
  CREATE POLICY "audit_log_insert" ON audit_log
    FOR INSERT TO service_role WITH CHECK (true);

  -- Allow SELECT from admin roles only
  CREATE POLICY "audit_log_select" ON audit_log
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'supreme_admin', 'association_admin'));

  -- No UPDATE or DELETE policies — explicitly deny
  -- (absence of policy = deny by default with RLS enabled)
  ```

- [ ] Add a DB-level trigger that prevents `UPDATE` and `DELETE` as a belt-and-suspenders defense:
  ```sql
  CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
  RETURNS TRIGGER AS $$
  BEGIN
    RAISE EXCEPTION 'audit_log rows are immutable. UPDATE and DELETE are not permitted.';
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER audit_log_immutability
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
  ```

#### Audit Log API Endpoints

- [ ] `GET /api/admin/audit-log` — paginated, filterable by `action`, `actorId`, `customerId`, `associationId`, date range; requires `admin` or `supreme_admin` role + hardware MFA

- [ ] `GET /api/associations/:id/audit-log` — association-scoped view; requires `association_admin` role + hardware MFA + IP allowlist

- [ ] `GET /api/admin/audit-log/:id/verify` — returns whether `payloadHash` still matches the stored `metadata` field (integrity check endpoint for auditors)

---

## Execution Order & Dependencies

```
Phase 1 (No dependencies — can start immediately)
├── A1  Add real_estate to IndustryType
├── A2  Add real_estate to mapIndustryToKey()
├── A5  Pre-Flight Data Validation UI + API          ← War Room Addition
├── A6  EIN Exact-Match Data Guard + confirmation modal ← Strategic Refinement
├── B1  Extract PhonePreview component
├── B2  Real estate link card variant
└── E1  Association Master UUID schema               ← Strategic Refinement (additive, no risk)

Phase 2 (Depends on Phase 1)
├── A3  Extract generator as shared module
├── A4  Wire Google Places industry detection
├── B3  Connect live preview to form
├── B4  Add compliance indicator layer
└── E5  Association-level PhonePreview template      ← requires E1 + B1

Phase 3 (Depends on Phase 2 — CRITICAL PATH)
├── C2  Webhook handler + Queue (Thundering Herd)    ← highest priority, includes queue table
├── C3  Fix smsEnabled auto-unlock
└── C5  Admin dashboard status display

Phase 4 (Depends on C2, C3 complete)
├── C1  Formalize 10-step workflow
├── C4  Consolidate messaging_service_sid
├── D7  Ledger Attribution for wholesale fees        ← War Room Addition (wire into C2 webhook)
├── E2  Association-level monitoring MCP tool        ← requires E1 + C2 webhook data
├── E3  Association-level batch actions              ← requires E1 + D7 billing shield
└── E4  Association-level billing shield             ← requires E1 + D7

Phase 5 (Depends on Phase 4 — highest risk)
├── D1  Replace subaccountProvisioner
├── D2  Remove subaccountSid from MCP tools
├── D3  Remove subaccountSid from twilioA2pService
├── D4  Purge Pidea branding + Supervisor Persona Audit ← includes persona rewrite
├── D5a Shadow migration — populate a2pCampaigns from legacy tables
├── D6  Update environment variables
└── D8  Full Directory Exorcism server/pidea/ → server/platform/  ← War Room Addition

Phase 6 (30-day observation window after Phase 5)
└── D5b/5c  Verify shadow stats → archive legacy SQL tables

Phase 7 (LVR Launch Readiness — after Phase 5)
└── Seed LVR association record + bulk-link 17,000 agents to association_id

Phase S (Parallel — start with Phase 1, no blocking dependencies)
├── S1  RBAC Hardening + Hardware MFA (WebAuthn setup + requireHardwareMfa middleware)
├── S2  Admin Geofencing (IP_ALLOWLIST middleware + per-association IP ranges)
├── S3  Short-Lived Delegated Tokens (high-privilege session endpoint + client countdown timer)
└── S4  Immutable Audit Log (table + RLS policy + logAuditEvent() wired into C1, C2, C3, E3, A6)
```

> **Note on Phase S:** All four security tasks can be implemented independently of any other workstream. S1 and S2 are pure middleware additions. S4 (`audit_log` table + `logAuditEvent()`) should be wired into C1, C2, and C3 **before** those workstreams go to production — a webhook that flips `smsEnabled` without an audit record is a compliance liability. Treat S4 as a hard prerequisite for the LVR launch go/no-go decision.

> **Note on D7 placement:** The ledger service (`billingLedgerService.ts`) should be written in Phase 4 alongside the webhook handler (C2) because it must be called from inside the webhook. Do not ship C2 without D7 — an untracked brand registration fee is a permanent margin leak.
>
> **Note on E placement:** Workstream E tasks are additive (no existing tables are modified, only new FKs are added as nullable). E1 can start in Phase 1. E2–E4 depend on the webhook and billing infrastructure from C2/D7.
>
> **Note on D5 Shadow Mode:** D5a (populate) runs in Phase 5 alongside the other reseller migration tasks. D5b/5c (verify and archive) run in Phase 6 after a 30-day observation window. Do not rush Phase 6 — a missed `messaging_service_sid` for a live number silently breaks SMS routing.

---

## Environment Variable Changes

| Variable | Action | Notes |
|---|---|---|
| `TWILIO_MASTER_ACCOUNT_SID` | **Remove** | Reseller account = the only account |
| `TWILIO_MASTER_AUTH_TOKEN` | **Remove** | Reseller account = the only account |
| `TWILIO_ACCOUNT_SID` | **Keep** | Now refers to reseller account directly |
| `TWILIO_AUTH_TOKEN` | **Keep** | Now refers to reseller account directly |
| `SMS_SHORT_DOMAIN` | **Add** | Replaces hardcoded `sms.pidea.ai` |
| `PLATFORM_NAME` | **Add** | Replaces hardcoded `"Pidea AI"` in prompts and responses |
| `A2P_STATUS_WEBHOOK_SECRET` | **Add** | Used to validate Twilio webhook signatures on brand/campaign callbacks |
| `A2P_BRAND_FEE_CENTS` | **Add** | Default `441` ($4.41) — configurable wholesale brand vetting cost for ledger attribution |
| `A2P_CAMPAIGN_MONTHLY_CENTS` | **Add** | Default `1000` ($10.00) — configurable monthly campaign fee for ledger attribution |
| `A2P_SECONDARY_VET_FEE_CENTS` | **Add** | Default `4000` ($40.00) — configurable secondary vetting fee for ledger attribution |
| `SUPERVISOR_PERSONA` | **Add** | Default `real_estate_sovereign` — controls which persona template is loaded by the supervisor agent; options: `real_estate_sovereign`, `hospitality`, `custom` |
| `DEFAULT_ASSOCIATION_ID` | **Add (optional)** | UUID of the default association (e.g. LVR/GLVAR) — used when seeding new real estate customers without an explicit association specified at onboarding |
| `IP_ALLOWLIST` | **Add** | Comma-separated CIDR ranges for admin geofencing (e.g. `203.0.113.0/24,198.51.100.45/32`). Empty = disabled (dev only). Must be set in production. |
| `HIGH_PRIVILEGE_JWT_SECRET` | **Add** | Secret for signing 30-minute high-privilege session JWTs. Must be at least 256 bits of entropy. Rotate every 90 days. |
| `WEBAUTHN_RP_ID` | **Add** | Relying Party ID for FIDO2/WebAuthn (typically the domain, e.g. `app.gatewayglobal.ai`) |
| `WEBAUTHN_RP_NAME` | **Add** | Human-readable Relying Party name shown in authenticator prompts (e.g. `Gateway Global AI`) |
| `WEBAUTHN_ORIGIN` | **Add** | Full origin URL for WebAuthn (e.g. `https://app.gatewayglobal.ai`) — must match the browser origin exactly |

---

## Definition of Done

### Workstream A
- [ ] `generateCampaignTemplates("Acme Realty", "real estate agency")` returns a fully populated 4-channel template with real estate copy
- [ ] `mapIndustryToKey("real estate brokerage")` returns `"real_estate"`
- [ ] Generator is importable from `client/src/lib/a2pTemplates.ts`

### Workstream B
- [ ] `PhonePreview` renders with zero `"Pidea AI"` text in the component
- [ ] Link card content is overridable via props
- [ ] Compliance indicator correctly flags a message missing opt-out language

### Workstream C
- [ ] Twilio sends a brand status webhook → DB updates `a2pApproved = true` within 30 seconds
- [ ] Twilio sends a campaign VERIFIED webhook → `smsEnabled` is set to `true` on the linked phone number automatically
- [ ] `GET /api/monitoring/a2p/status` shows the correct 4-stage status chain for a test customer

### Workstream D
- [ ] `server/subaccountProvisioner.ts` is deleted
- [ ] `TWILIO_MASTER_ACCOUNT_SID` no longer appears anywhere in the codebase
- [ ] `grep -r "Pidea" ./server ./shared ./client/src` returns zero hits (excluding asset filenames)
- [ ] A new customer can be provisioned end-to-end (phone number + webhook + Messaging Service) using only the reseller account credentials
- [ ] All Drizzle migrations run clean on a fresh database with no reference to the legacy SQL files

### War Room Additions

**A5 — Pre-Flight Validation**
- [ ] `POST /api/a2p/preflight/validate` with a valid EIN returns `{ valid: true, errors: {} }`
- [ ] `POST /api/a2p/preflight/validate` with EIN `471234567` (missing hyphen) returns `{ valid: false, errors: { ein: "EIN must be in format XX-XXXXXXX" } }`
- [ ] `POST /api/a2p/preflight/validate` with a website missing a privacy policy returns an error on `websiteUrl`
- [ ] The "Submit to Twilio" button is disabled until all pre-flight checks pass in the UI

**D7 — Ledger Attribution**
- [ ] A successful `submitBrandRegistration()` call creates a `billing_events` row with `event_type = 'a2p_brand_registration'` and `amount_cents = 441`
- [ ] A campaign reaching `VERIFIED` via webhook creates a `billing_events` row with `event_type = 'a2p_campaign_monthly'` and `amount_cents = 1000`
- [ ] `GET /api/admin/billing/a2p-events` returns all events scoped to organization
- [ ] No brand registration or campaign submission can succeed without a corresponding ledger entry being written in the same transaction

**D8 — Full Directory Exorcism**
- [ ] `server/pidea/` directory does not exist
- [ ] `server/platform/` directory contains all 7 migrated files
- [ ] All 7 API routes respond correctly under `/api/platform/` prefix
- [ ] `/api/pidea/*` redirects return `308` to the new paths for 90-day backward compatibility window
- [ ] The verification grep command returns zero hits

**A6 — EIN Exact-Match Data Guard**
- [ ] Legal Name Confirmation Modal appears after brand form submission and before TrustHub profile creation
- [ ] The "Proceed to TrustHub" button is disabled until `legalNameConfirmed` is checked
- [ ] Entering a business name without a legal suffix (LLC, Inc., etc.) shows the suffix warning
- [ ] `submitBrandRegistration()` throws a structured error if `legalNameConfirmed !== true`
- [ ] `brands.legal_name_confirmed` and `brands.legal_name_confirmed_at` are written on form submission

**C2 — Webhook Queue (Thundering Herd Protection)**
- [ ] `POST /api/webhooks/twilio/a2p/brand-status` returns HTTP 200 within 50ms regardless of queue depth
- [ ] The webhook handler writes to `a2p_webhook_queue` and does NOT directly update `brands` or `a2pCampaigns`
- [ ] Background worker processes up to 50 events per 2-second cycle
- [ ] Simulating 500 simultaneous brand approval webhooks does not cause DB lock errors
- [ ] Failed events are retried up to 3 times and marked `failed` with an error message after exhaustion
- [ ] `GET /api/admin/a2p/webhook-queue` returns queue depth and failed event count

**D4 — Supervisor Persona Audit**
- [ ] `shared/schema.ts` `platformInstructions` default contains no references to hotels, guests, check-in, or hospitality
- [ ] Supervisor prompt references `{{company.name}}`, `{{association.name}}`, and `{{a2p.overallStatus}}` global variables
- [ ] `SUPERVISOR_PERSONA=real_estate_sovereign` is set in all production `.env` files
- [ ] `server/platform/agents/promptAssistantAgent.json` contains no hotel or Pidea references

**D5 — Shadow Mode Migration**
- [ ] Backfill script runs to completion in staging with row counts matching legacy tables
- [ ] Shadow read fallback is active in SMS routing for the 30-day observation window
- [ ] `legacy_sid_fallback_count` is visible in admin dashboard
- [ ] Legacy tables are only archived after the counter has been 0 for 7 consecutive days

### Workstream E

**E1 — Association UUID Schema**
- [ ] `associations` table exists in production with LVR/GLVAR seed record
- [ ] `customers.association_id` FK is populated for all real estate agents belonging to LVR
- [ ] Indexes on `association_id` exist on `customers` and `billing_events` tables

**E2 — Association Monitoring**
- [ ] `GET /api/associations/LVR/stats` returns correct `complianceRate`, `agents.total`, and `agents.compliant` counts
- [ ] Query completes in under 2 seconds for 17,000 agents
- [ ] `monitoring_get_association_stats` MCP tool is callable and returns the same data

**E3 — Batch Actions**
- [ ] `POST /api/associations/LVR/batch-update` with `action: 'enable_sms'` returns a `jobId` immediately
- [ ] Batch job processes 17,000 agents in under 5 minutes
- [ ] Per-agent SMS is NOT updated synchronously in the request handler

**E4 — Billing Shield**
- [ ] When `associations.sponsor_billing = true` and `sponsor_limit = 1000`, the first 1,000 agents' `a2p_brand_registration` events are billed to the association, not the individual
- [ ] Agent #1,001 onward is billed individually
- [ ] `GET /api/associations/LVR/billing` returns correct sponsored vs. self-pay counts

**E5 — Association Phone Preview**
- [ ] When a LVR member agent generates campaign templates, sample messages include `"Licensed REALTOR® | Las Vegas REALTORS® MLS"`
- [ ] `PhonePreview` renders the LVR-branded sender name when `associationId === LVR_UUID`

### Workstream S

**S1 — RBAC Hardening & Hardware MFA**
- [ ] `ROLE_SECURITY_POLICY` is defined in `shared/schema.ts` with `hardwareMfaRequired: true` for `association_admin` and `supreme_admin` roles
- [ ] `POST /api/auth/webauthn/register` successfully registers a YubiKey or Touch ID authenticator for an admin user
- [ ] `POST /api/auth/webauthn/authenticate` sets `hardware_verified = true` in the session
- [ ] Accessing `/api/admin/billing/a2p-events` without `hardware_verified` returns HTTP 403 with `error: 'HARDWARE_MFA_REQUIRED'`
- [ ] Accessing `/api/admin/billing/a2p-events` with `hardware_verified = true` returns data correctly
- [ ] Registered authenticators are stored in `user_authenticators` table and visible in the admin profile UI

**S2 — Admin Geofencing**
- [ ] Setting `IP_ALLOWLIST=127.0.0.1/32` and requesting `/api/admin/` from a different IP returns HTTP 403 with `error: 'IP_NOT_ALLOWLISTED'`
- [ ] The blocked attempt is written to `audit_log` with `action: 'ip_blocked'` before the 403 is returned
- [ ] `IP_ALLOWLIST` unset in `NODE_ENV=production` emits a startup warning to stderr (does not crash)
- [ ] Association-specific `allowedIpRanges` column overrides global `IP_ALLOWLIST` when the session's `associationId` matches

**S3 — Short-Lived Delegated Tokens**
- [ ] `POST /api/auth/high-privilege-session` without hardware MFA returns HTTP 403
- [ ] `POST /api/auth/high-privilege-session` with valid hardware MFA returns a JWT with `exp = now + 1800`
- [ ] `POST /api/twilio/a2p/brands` without a high-privilege token returns HTTP 401 with `error: 'HIGH_PRIVILEGE_TOKEN_REQUIRED'`
- [ ] Using an expired high-privilege token returns HTTP 401 with `error: 'TOKEN_EXPIRED_OR_INVALID'`
- [ ] Each `POST /api/auth/high-privilege-session` call creates an `audit_log` row with `action: 'high_privilege_session_created'`
- [ ] Client-side countdown timer renders the remaining TTL and shows "Session Expired" modal when the token expires

**S4 — Immutable Audit Log**
- [ ] `INSERT` into `audit_log` succeeds from the service role
- [ ] `UPDATE` on any `audit_log` row throws: `"audit_log rows are immutable"`
- [ ] `DELETE` on any `audit_log` row throws: `"audit_log rows are immutable"`
- [ ] `GET /api/admin/audit-log` returns paginated rows filterable by `action` and `customerId`
- [ ] `GET /api/admin/audit-log/:id/verify` returns `{ valid: true }` for an unmodified row
- [ ] Completing TrustHub Step 7 (`brand_registration_submitted`) writes an `audit_log` row with the correct `referenceId` (Brand SID), `actorId`, `actorIp`, and `payloadHash`
- [ ] Setting `smsEnabled = true` via webhook writes `action: 'sms_enabled'` to `audit_log`
- [ ] Setting `smsEnabled = true` via manual override writes `action: 'sms_enabled'` to `audit_log` with the operator's `actorId`
- [ ] Completing a batch update for 17,000 agents writes individual `audit_log` rows for each agent processed (or a summary row with `metadata.batchCount`)
- [ ] LVR board member with `association_admin` role can view `GET /api/associations/LVR/audit-log` filtered to their association's agents only
