# Gateway Global AI – Website and Domain Separation

**Use this document to separate the website into sections and assign each section to the correct subdomain.** One subdomain = one deployment; each has its own folder, port, and URL.

---

## 1. Subdomain map (what goes where)

| Subdomain | Audience | Sections / content that belong here |
|-----------|----------|-------------------------------------|
| **www.gatewayglobal.ai** | Everyone (marketing) | Main marketing site: homepage, “Why Gateway Global,” product overview (AI Bot Personal, AI Bot Business), services (AI Voice & SMS, Google Workspace, Google Places/Maps), contact, pricing, “Let’s build minds not just models,” company story. No app login, no dashboards. |
| **chat.gatewayglobal.ai** | Users trying the product | Chat demonstration; sales funnels with demo; try-the-chat experience. Anything that is “come here to chat with the AI” or “demo the product.” |
| **admin.gatewayglobal.ai** | Internal / platform operators | Admin panel: Dashboard (Personal), Dashboard (Business), Dashboard (AI Telephony), Dashboard (Developer); sales funnel management; agent/server/DISC/security configuration. Requires auth; not public marketing. |
| **developer.gatewayglobal.ai** | Developers signing up | Developer onboarding: signup, API/keys, docs, getting started for developers. Dedicated flow for developer.gatewayglobal.ai only. |
| **business.gatewayglobal.ai** | Business users signing up | Business onboarding: signup, setup, getting started for business. Dedicated flow for business.gatewayglobal.ai only. |
| **telephony.gatewayglobal.ai** | Users setting up voice/SMS | Telephony onboarding: signup/setup for AI Voice and SMS. Dedicated flow for telephony.gatewayglobal.ai only. |
| **twilio.gatewayglobal.ai** | Backend only (no UI) | Twilio webhook URLs (SMS, Voice, errors). API only; no website sections. Do not put marketing or app UI here. |
| **webhooks.gatewayglobal.ai** | Backend only (no UI) | General webhooks and callback routing. API only; no website sections. Do not put marketing or app UI here. |

---

## 2. Rules for separating the site

1. **One subdomain = one deployment**
   - Each row in the table above is a separate app/site. When you split the codebase, each subdomain should be deployable on its own (its own repo or folder, its own port).

2. **Marketing vs product vs admin**
   - **www** = public marketing only (no login, no dashboards).
   - **chat** = product demo and chat experience + related sales funnels.
   - **admin** = all dashboards and internal configuration (Personal, Business, AI Telephony, Developer dashboards; sales funnel management).
   - **developer / business / telephony** = dedicated onboarding flows for those audiences; link to them from www or chat as needed.

3. **Backend-only subdomains**
   - **twilio.gatewayglobal.ai** and **webhooks.gatewayglobal.ai** are for APIs and webhooks only. No HTML pages, no marketing, no app UI. The website agent should not assign any “sections” of the website to these; they are served by separate backend apps.

4. **Links and navigation**
   - From **www**: link to chat (demo), developer (for developers), business (for business), telephony (for voice/SMS). Link to admin only for internal users (e.g. “Admin” in footer or after login).
   - From **chat**: can link back to www, and to developer/business/telephony for signup.
   - From **admin**: link to chat, developer, business, telephony as needed; do not expose admin on public www.

5. **URLs and routes**
   - Each subdomain owns its own path space. Examples:
     - `https://www.gatewayglobal.ai/` — homepage
     - `https://www.gatewayglobal.ai/services` — services page
     - `https://chat.gatewayglobal.ai/` — chat demo
     - `https://admin.gatewayglobal.ai/dashboard/personal` — Personal dashboard
     - `https://developer.gatewayglobal.ai/onboarding` — Developer onboarding
   - Do not mix: e.g. “admin” sections should not live under `www` or `chat`; they live under `admin.gatewayglobal.ai`.

---

## 3. Checklist for the agent (separating sections)

- [ ] **www.gatewayglobal.ai:** Homepage, product overview, services, contact, pricing, company story. No dashboards, no app login.
- [ ] **chat.gatewayglobal.ai:** Chat demo UI, sales funnels that include a demo. No admin dashboards.
- [ ] **admin.gatewayglobal.ai:** All four dashboards (Personal, Business, AI Telephony, Developer) and sales funnel management / config. Auth required.
- [ ] **developer.gatewayglobal.ai:** Developer onboarding flow only (signup, API, docs).
- [ ] **business.gatewayglobal.ai:** Business onboarding flow only.
- [ ] **telephony.gatewayglobal.ai:** Telephony onboarding flow only.
- [ ] **twilio / webhooks:** No website sections; backend only. Any Twilio plugin usage in the site should point webhook URLs at `twilio.gatewayglobal.ai`, not serve UI there.

---

## 4. Server deployment (reference)

When each section is split into its own app, it deploys here:

| Subdomain | Server path | Port |
|-----------|-------------|------|
| www.gatewayglobal.ai | `/opt/gatewayglobal/www.gatewayglobal.ai` | 3009 |
| chat.gatewayglobal.ai | `/opt/gatewayglobal/chat.gatewayglobal.ai` | 3004 |
| admin.gatewayglobal.ai | `/opt/gatewayglobal/admin.gatewayglobal.ai` | 3005 |
| developer.gatewayglobal.ai | `/opt/gatewayglobal/developer.gatewayglobal.ai` | 3006 |
| business.gatewayglobal.ai | `/opt/gatewayglobal/business.gatewayglobal.ai` | 3007 |
| telephony.gatewayglobal.ai | `/opt/gatewayglobal/telephony.gatewayglobal.ai` | 3008 |

Twilio and webhooks apps are already defined and are API-only.

---

**Summary for the agent:** Split the website so that each subdomain in the table gets only the sections listed for it. Marketing on www, demo/chat on chat, all dashboards and config on admin, and each onboarding type on its own subdomain. Keep backend subdomains (twilio, webhooks) free of any website UI or marketing content.
