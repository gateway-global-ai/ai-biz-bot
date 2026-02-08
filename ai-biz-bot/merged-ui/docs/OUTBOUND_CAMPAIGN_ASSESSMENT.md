# Outbound Calling Campaign Tool (Voice Lead Machine) – Assessment

This doc assesses the **outbound calling campaign** system used to market the AI Biz Bot: reach new customers via **Google Places / Google Business**, generate **industry-specific scripts**, and invite them to **claim their free AI-powered website**. It answers: *Where is the system at, and is it ready to deploy once Twilio variables and phone number are in place?*

**Note:** The repo was built from a zip; you can **gitignore or delete** that zip. This assessment is based on the **repository code** (server VLM routes and services, client `VoiceLeadMachine.tsx`, shared schema).

---

## 0. How Prospect Lists Are Generated

The system builds prospect lists in two steps, by **location and category** (city + industry), then enriches each place with full details from Google.

1. **Search (batch by location + category)**  
   - **Text Search** (Google Places): query = `"${industry} in ${city}"` (e.g. "restaurants in Austin").  
   - Results are **paginated** (nextPageToken); you can request up to **maxResults** (default 100; UI often uses 20–50).  
   - Each result gives: **place ID**, name, address, rating, user_ratings_total. So we get **Google Place IDs by location and category** in batches (e.g. 50 at a time).

2. **Enrich (detailed Google parameters)**  
   - For each place ID we call **Place Details** to get: name, formatted_address, address_components (city, state, postal), **formatted_phone_number** / **international_phone_number**, **website**, rating, user_ratings_total, url, **reviews**, **photos**.  
   - The schema and code also support **AI-powered summaries**: **editorialSummary**, **generativeSummary**, **reviewSummary**. These come from the **Places API (New) v1** (Enterprise + Atmosphere SKU). The current client uses the legacy Place Details endpoint; the code maps summary fields when present. To get AI summaries reliably, the integration can be extended to use the new API for those fields.

3. **Save and score**  
   - Enriched records are stored as **vlm_prospects** (industry, businessName, phone, website, address, city, state, googlePlaceId, reviews, photos, etc.).  
   - **Quality scoring** runs on the list; prospects are sorted by score for calling or outreach.

So: **scoop N businesses at a time by location + category → get place IDs → pull detailed Google parameters (and optionally AI summaries) → save and score.** This matches the “old” flow you described; the only gap is ensuring AI summaries are requested when using the new API.

---

## 1. What’s in the Repo

### Backend (server)

| Component | Path | Purpose |
|-----------|------|---------|
| **VLM routes** | `server/vlm-routes.ts` | All `/api/vlm/*` endpoints; registered in `server/routes.ts` via `registerVlmRoutes(app)`. |
| **Outbound caller** | `server/services/vlm-outbound-caller.ts` | Twilio `calls.create`, TwiML generation, industry script templates, knowledge-enhanced scripts. |
| **Google Maps** | `server/services/vlm-google-maps.ts` | Search Places by city + industry; place details; enrich prospects (name, phone, address, reviews, etc.). |
| **Auto-agent pipeline** | `server/services/vlm-auto-agent.ts` | End-to-end: discover → enrich → score → create campaign → (optional) generate sites → (optional) auto-call; send SMS link when prospect presses 1. |
| **Quality scoring** | `server/services/vlm-quality-scoring.ts` | Score and sort prospects. |
| **Email enrichment** | `server/services/vlm-email-enrichment.ts` | Optional email lookup from website. |
| **Website analyzer** | `server/services/vlm-website-analyzer.ts` | Analyze prospect website quality. |
| **CSV export** | `server/services/vlm-csv-export.ts` | Export prospects to CSV. |
| **Knowledge base** | `server/services/knowledge-base.ts` | Used by outbound caller for industry-specific script enhancement. |
| **Twilio** | `server/twilio.ts` | Client, from-number (env or `storage.getTelephonyConfig()`), SMS, makeCall. |
| **Storage** | `server/storage.ts` | VLM prospects, campaigns, call attempts; `getVlmCallAttemptByCallSid`; site config by Place ID. |
| **Schema** | `shared/schema.ts` | `vlmProspects`, `vlmCampaigns`, `vlmCallAttempts` (and insert types). |

### Frontend (client)

| Component | Path | Purpose |
|-----------|------|---------|
| **Voice Lead Machine** | `client/src/pages/VoiceLeadMachine.tsx` | Full UI: stats, discovery (city + industry), prospects list (filter, call, export), campaigns CRUD, call attempts, **Auto Agent** pipeline (discover → build sites → call → send link), script preview and knowledge-based script generation. |
| **Transparency dashboard** | `client/src/pages/TransparencyDashboard.tsx` | Uses `/api/vlm/stats` and `/api/vlm/campaigns` for visibility. |

### Flow (end-to-end)

1. **Discover** – POST `/api/vlm/discover` with city, industry, maxResults (optional email enrichment). Uses **Google Cloud API** (Places Text Search + Place Details). Saves prospects and scores them.
2. **Campaigns** – Create/update campaigns with name, industry, city, script template, optional caller ID. Script supports `{businessName}`, `{industry}`, `{city}` (and in auto-agent `{rating}`, `{reviewCount}`).
3. **Call** – POST `/api/vlm/call` with `prospectId` (and optional `campaignId`). Server gets prospect/campaign, creates call attempt, calls Twilio `calls.create` with:
   - **URL:** `{baseUrl}/api/vlm/twiml/{campaignId}` (or `.../twiml/null` for manual call).
   - **statusCallback:** `{baseUrl}/api/vlm/call-status`.
4. **TwiML** – GET/POST `/api/vlm/twiml/:campaignId` returns XML: Say script → Gather 1 digit → on submit to **absolute** `/api/vlm/gather-response` (fixed so Twilio receives a full URL).
5. **Gather** – POST `/api/vlm/gather-response`: digit 1 → update attempt/prospect/campaign, send SMS with website link via `autoAgentService.sendWebsiteLink(prospectId)`; digit 2 → mark lost.
6. **Call status** – POST `/api/vlm/call-status`: update attempt status/duration/outcome.
7. **Auto Agent** – POST `/api/vlm/auto-agent/run`: discover → enrich → score → create campaign → optionally generate sites per prospect → optionally auto-call with delay; scripts can be knowledge-enhanced when enabled.

---

## 2. Scripts and Messaging (Product Positioning)

- **Default script** (in `vlm-outbound-caller.ts`): “Hi, this is your AI Biz Bot calling about {businessName}. We've created a free, Google-powered AI website for your {industry} business that can help you [industry value prop]. Your basic site is already live with an AI concierge ready to answer customer questions 24/7. Would you like us to send you the link? Press 1 to receive your free website via text, or press 2 if you're not interested.”
- **Industry value props** are mapped (restaurant, retail, healthcare, legal, real estate, automotive, salon, fitness, plumber, electrician, hvac, default).
- **Knowledge base** can enhance scripts (industry + “outbound calling scripts”); if missing or failing, fallback is the default/campaign template.
- **Auto-agent** default pitch matches this (“free Google-powered AI website… Press 1 to receive your free website link via text…”). You can align wording with “first ever websites with AI that actually works” and “claim their free AI powered website” in campaign templates or in the default template in code.

---

## 3. What’s Ready vs What’s Left

### Ready for deploy (once env and number are set)

- **Lead discovery** – Google Places search + enrich + score + store.
- **Prospects CRUD** – List, filter, export CSV.
- **Campaigns CRUD** – Create, patch, delete; script template and caller ID.
- **Single outbound call** – Initiate call, TwiML with Say + Gather (action URL is now absolute).
- **Gather handling** – 1 = send SMS link + mark won; 2 = mark lost; status/campaign counters updated.
- **Call status webhook** – Attempt status and duration stored.
- **Auto Agent pipeline** – Discover → enrich → score → create campaign → optional site generation → optional auto-call with delay; post-call SMS when they press 1.
- **Script generation** – Simple template substitution; optional knowledge-enhanced script via `/api/vlm/auto-agent/generate-knowledge-script`.
- **Voice Lead Machine UI** – Discovery, prospects, campaigns, call attempts, Auto Agent, script preview.
- **Twilio integration** – Uses `getTwilioClient()` and `getTwilioFromPhoneNumber()` (env or telephony config). Provisioning helpers exist in `server/twilio.ts`.

### Fix applied in this pass

- **TwiML Gather action** – Twilio requires an **absolute** URL for the Gather `action`. The handler now computes `baseUrl` (from `WEBHOOK_BASE_URL`, `REPLIT_DEPLOYMENT_URL`, or request) and passes it into `generateTwiml()` so the Gather action is `{baseUrl}/api/vlm/gather-response`. Without this, Gather could fail in production.

### Before first production deploy

1. **Twilio**
   - Set **TWILIO_ACCOUNT_SID** and **TWILIO_AUTH_TOKEN**.
   - Set **TWILIO_ACCOUNT_PHONE_NUMBER** or **TWILIO_PHONE_NUMBER_BOT** (or store a number in telephony config so `getTwilioFromPhoneNumber()` returns it). That number is used as caller ID for outbound VLM calls and for sending the “your free website” SMS.
   - Ensure the Twilio number can make outbound voice calls and send SMS.

2. **Webhook base URL**
   - Set **WEBHOOK_BASE_URL** (or **REPLIT_DEPLOYMENT_URL** / Repl env) to the **public** base URL of your server (e.g. `https://your-api.example.com`). Used for:
     - TwiML URL for each call
     - statusCallback for call status
     - Gather action URL (now absolute)
   - Twilio must be able to reach this base URL (no localhost).

3. **Google Places**
   - Set **GOOGLE_CLOUD_API_KEY** (or the key your server uses for `@googlemaps/google-maps-services-js`). Required for `/api/vlm/discover` and auto-agent discovery.

4. **Database**
   - VLM tables (`vlm_prospects`, `vlm_campaigns`, `vlm_call_attempts`) and any site-config storage used by the auto-agent must exist and be migrated (same as rest of app).

5. **Optional**
   - **Knowledge base**: If you use knowledge-enhanced scripts, ensure the knowledge base has content (e.g. industry / outbound scripts); otherwise the system falls back to the default template.
   - **Telephony config**: If you use `storage.getTelephonyConfig()` for the from-number, ensure that config is set for the environment.

---

## 4. Manual Call When Campaign Is Null

For a single prospect call without a campaign, the code uses a dummy campaign with `id: null`. The TwiML URL becomes `.../api/vlm/twiml/null`. The route loads campaign by `req.params.campaignId` (“null”); no row exists, so it uses the default script and prospect from the call attempt. This works; no change required.

---

## 5. Deploy Checklist (TL;DR)

| Step | Action |
|------|--------|
| 1 | Set **TWILIO_ACCOUNT_SID**, **TWILIO_AUTH_TOKEN**, and outbound/SMS number (**TWILIO_ACCOUNT_PHONE_NUMBER** or telephony config). |
| 2 | Set **WEBHOOK_BASE_URL** (or equivalent) to the public server URL. |
| 3 | Set **GOOGLE_CLOUD_API_KEY** for Places discovery. |
| 4 | Run DB migrations so VLM and site-config tables exist. |
| 5 | Deploy server and client; ensure Twilio can POST to `{baseUrl}/api/vlm/twiml/*`, `/api/vlm/gather-response`, `/api/vlm/call-status`. |
| 6 | In the Voice Lead Machine UI: run a small discovery (city + industry), create a campaign (optional), initiate one test call to a real number and confirm: call connects, script plays, Press 1 sends SMS with link, Press 2 says goodbye. |

---

## 6. Summary

- **Backend and client for the outbound campaign tool are implemented and wired:** Google Places discovery, industry-specific scripts (with optional knowledge enhancement), campaigns, single and bulk (auto-agent) outbound calls, TwiML (with fixed absolute Gather URL), gather handling, call-status handling, and SMS with website link when the prospect presses 1.
- **No extra code is required for “ready to deploy”** beyond configuring **Twilio credentials and phone number**, **WEBHOOK_BASE_URL**, and **Google Cloud API key**, and ensuring the database and routing are deployed.
- **Optional improvements** (not blocking): tighten default script copy to “first ever websites with AI that actually works” and “claim their free AI powered website”; add rate/limit safeguards for auto-call; surface knowledge-based script generation more prominently in the UI if you rely on it.

The attached zip was not in the repo; if it contains a different front-end or config, you can map it to this backend and the same env/deploy checklist applies.

---

## 7. SMS / Email First: Place ID Link and Verify Cell (Product Direction)

Instead of (or in addition to) **calling first**, you can reach prospects by **SMS and email** with a link that includes their **website + Google Place ID**. When they open the link:

- The **site is generated (or loaded) for that Place ID** so the business sees their own pre-configured page.  
- We **prompt for cell phone to verify identity** (e.g. 30-second view then gate, or immediate OTP).  
- After verification they can continue viewing and access the admin area.

This gives **three touchpoints**: **SMS**, **phone** (optional outbound call), and **email**. The link format can follow the reseller flow in [PRODUCT_AND_BUSINESS_MODEL.md](./PRODUCT_AND_BUSINESS_MODEL.md): e.g. `{baseUrl}/claim?placeId={googlePlaceId}` or `{baseUrl}/site?placeId={googlePlaceId}` (and optional `affiliateId`). Implementation work: a **claim** or **site** route that accepts `placeId` (and optionally phone/affiliateId), generates or fetches the site config for that place, and shows the 30-second gate + phone/OTP flow when cell is not in the URL.

---

## 8. Admin Panel: VLM in Main Website Chat

The original system had a **standalone admin panel** for the Voice Lead Machine. The desired direction is to **surface the same outbound-campaign tool inside the admin panel on the main website**, using the **same chat interface** we sell to customers. So: one app, one chat UI—owners get admin (OTP, dashboards, VLM) from the same place. That implies either:

- **Embedding or linking** the VLM flows (discovery, prospects, campaigns, auto-agent) inside the main site’s admin chat (e.g. as a dedicated “Campaigns” or “Lead Machine” entry that opens a view or hands off to the existing VoiceLeadMachine page), or  
- **Exposing VLM actions via the chat** (e.g. “Discover leads in Austin for restaurants,” “Run auto-agent for plumbers in Dallas”) and showing results in chat or in a side panel.

No code change is specified here; this is the **product direction**: VLM lives in the main site’s admin, same chat interface, not a separate standalone install.
