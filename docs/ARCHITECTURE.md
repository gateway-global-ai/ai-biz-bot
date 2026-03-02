---
Date: 2026-03-02
Status: ACTIVE
Supersedes: none
System_State: "Bedrock v0.16 synced, Worktrees disabled, Main branch only"
---

# Gateway Global AI Platform — Architecture Reference
**Official ARCHITECTURE.md — Single Source of Truth**
**Generated from Structural Audit:** February 26, 2026
**Repository:** `aibizbot-dev.gatewayglobal.ai` (active trunk)

> **For all Cursor agents:** Read this file before proposing architectural changes, creating new database tables, or modifying core routing. This is the project Bible.

---

## Table of Contents

1. [Codebase Topography — The Map](#1-codebase-topography--the-map)
2. [Cursor Intelligence Audit — The Brain](#2-cursor-intelligence-audit--the-brain)
3. [Database Schema Overview — The Ledger](#3-database-schema-overview--the-ledger)
4. [Dead Code & Ghost Identification — The Purge Target](#4-dead-code--ghost-identification--the-purge-target)
5. [Dependencies & Environment — The Stack](#5-dependencies--environment--the-stack)
6. [Appendix A: File Counts](#appendix-a-file-counts-by-directory)
7. [Appendix B: Priority Action Items](#appendix-b-priority-action-items-for-enterprise-transition)

---

## 1. Codebase Topography — The Map

### 1.1 High-Level Directory Structure

```
/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/
│
├── server/                     ← Express 5 API + WebSocket server (ACTIVE)
│   ├── routes/                 ← Modular route handlers (USE THIS FOR ALL NEW ROUTES)
│   ├── services/               ← Business logic services
│   ├── agents/                 ← AI agent system (swarm, testing, templates)
│   ├── mcp/                    ← MCP server integrations (Kimi K2, Places, Workspace)
│   ├── tools/                  ← Tool handlers (Hotels, Places, Flights, B2B)
│   ├── config/                 ← Server configuration
│   └── *.ts                    ← Core files: auth, storage, twilio, gemini, etc.
│
├── client/                     ← React 18 + Vite 7 frontend (ACTIVE)
│   └── src/
│       ├── pages/              ← Routed page components (10 feature areas)
│       │   ├── owner/          ← Business owner dashboard
│       │   ├── admin/          ← Platform superadmin (GatewayAdmin)
│       │   ├── agents/         ← Agent management, classroom, office, lab
│       │   ├── biz-dashboard/  ← CRM, VoiceLeadMachine, Transparency, Calendar
│       │   ├── customer/       ← Public-facing site, chat, contact
│       │   ├── developer/      ← Telephony, health checks, system tools
│       │   ├── integrations/   ← Google API Analyst, Drive, Places SDK
│       │   ├── showcase/       ← Landing, B2B demo, SDK showcase, DISC, Kimi Audio
│       │   ├── account/        ← Billing, login, my account
│       │   └── legal/          ← SMS Consent page
│       ├── components/
│       │   ├── voice/          ← VoiceSettings, maps, tools, tour, animations
│       │   ├── chat/           ← Chat interfaces
│       │   ├── ui/             ← Radix UI component library (shadcn/ui)
│       │   └── showcase/       ← Showcase-specific components
│       ├── services/voice/     ← Voice client abstraction layer
│       ├── hooks/              ← use-mobile, use-toast
│       ├── widgets/            ← ChatVoiceWidget, VoiceIndicatorWidget
│       ├── lib/                ← Shared client utilities
│       └── config/             ← Client configuration
│
├── shared/
│   └── schema.ts               ← Single source of truth: Drizzle ORM + Zod schemas (~2,400+ lines)
│
├── docs/                       ← Extensive technical documentation
│   ├── ARCHITECTURE.md         ← THIS FILE — the project Bible
│   ├── architecture/           ← Agent system, chat, voice, widget, PTT docs
│   ├── deployment/             ← VPS, environment, secrets, Doppler guides
│   ├── diagrams/
│   ├── knowledge-base/         ← Google Business APIs research
│   ├── mvp/
│   └── summaries/
│
├── scripts/                    ← Operational & provisioning scripts
├── migrations/                 ← Drizzle SQL migration files (0001–0016; see Migration Journal below)
├── tests/                      ← Test directory
├── mcp-servers/                ← Standalone MCP servers (Google Workspace)
│
├── _legacy_archive/            ← ⛔ GRAVEYARD — DO NOT READ, IMPORT, OR MODIFY
│   │                              (Contains archived legacy microservices)
│   ├── ai-biz-bot/
│   ├── platform/
│   ├── sdk/
│   ├── reference/
│   ├── website-builder/
│   ├── nursnest-lodging-partners/
│   ├── pideaai-olympic-2026-showcase/
│   └── user_uploads/
```

> **Agent Rule:** The `_legacy_archive/` directory is a write-once graveyard. Never read from, import from, or reference anything inside it.

### 1.2 Core Engine Locations

#### Gemini WebRTC / Voice AI Pipeline

| Layer | File | Purpose |
|---|---|---|
| Server WebSocket Proxy | `server/voiceGemini.ts` | Bridges client audio ↔ Gemini Native Audio API |
| Stream Handler | `server/voiceStream.ts` | Audio stream orchestration; imports `voiceGemini`, `audioCodec`, `voiceSession` |
| Session State | `server/voiceSession.ts` | Maintains voice session context |
| Audio Codec | `server/audioCodec.ts` | 16-bit PCM encode/decode at 16kHz input / 24kHz output |
| Client Streaming | `client/src/services/voice/GeminiStreamingClient.ts` | Browser-side WebSocket audio client |
| Voice Abstraction | `client/src/services/voice/IVoiceClient.ts` | Interface / factory pattern |
| Client Factory | `client/src/services/voice/VoiceClientFactory.ts` | Selects Gemini vs. REST transactional client |
| REST Fallback | `client/src/services/voice/RestTransactionalClient.ts` | Non-streaming fallback |
| Widget Layer | `client/src/widgets/ChatVoiceWidget.tsx` | Embeddable voice chat widget |
| Voice Settings UI | `client/src/components/voice/VoiceSettings.tsx` | Agent voice configuration panel |
| TTS Routes | `server/routes.ts` — `/api/tts/*` | Google TTS synthesis |
| Voice Config API | `server/routes.ts` — `/api/voice/config/:agentId` | Persists agent voice config |
| PTT Routes | `server/routes.ts` — `/api/ptt/*` | Push-to-Talk process/transcribe/synthesize |
| Browser Voice | `server/browserVoice.ts` | Browser-based voice pipeline (imports `kimiAudioDirect`) |
| Gemini Key Endpoint | `server/routes.ts` — `GET /api/gemini-key` | Supplies model key to authorized client sessions |

**Model:** `models/gemini-2.5-flash-native-audio-preview-12-2025` (set via `GEMINI_MODEL` in Doppler — **never hardcoded**).

---

#### Twilio Sovereign SMS Router & Webhooks

| Layer | File | Purpose |
|---|---|---|
| Router Service | `server/services/smsRouter.ts` | Sovereign SMS Router — intent-based dispatch across 6 Messaging Service pipes |
| Webhook Handler | `server/routes/twilioWebhooks.ts` | Inbound SMS/Voice webhook receiver (modular route file) |
| Legacy Webhook Inline | `server/routes.ts` — `/webhook/sms`, `/webhook/voice`, `/webhook/voice/gather`, `/webhook/voice/status`, `/webhook/sms/status` | Core Twilio webhook routes (validated via `validateTwilioSignature`) |
| Telephony Config CRUD | `server/routes.ts` — `/api/telephony/*` | Provision, configure, and manage phone numbers |
| Twilio Account Mgmt | `server/routes.ts` — `/api/twilio/*` | Sub-accounts, billing, TwiML apps, numbers |
| SMS Health | `server/routes.ts` — `/api/sms/health`, `/api/sms/failures`, `/api/sms/deliveries` | SMS system diagnostics |
| A2P Registration | `server/routes.ts` — `/api/a2p/brands/*`, `/api/a2p/campaigns/*` | A2P 10-DLC brand and campaign lifecycle |
| Provisioner Script | `scripts/provision-a2p-compliance.ts` | One-shot: creates 6 Messaging Services + Trust Hub bundle |
| Webhook Wiring Script | `scripts/wire-messaging-service-webhooks.ts` | Wires webhook URLs to Messaging Services |
| Client UI | `client/src/pages/developer/TelephonyManager.tsx`, `TwilioAccountManager.tsx`, `TelephonyPanel.tsx`, `AgentTelephony.tsx` | Telephony management dashboards |

**Intent Enum (6 Pipes):** `PLATFORM_OTP`, `PLATFORM_CARE`, `PLATFORM_MKTG`, `CUSTOMER_OTP`, `CUSTOMER_CARE`, `CUSTOMER_MKTG`

---

#### Stripe Billing & Granular Resource Ledger

| Layer | File | Purpose |
|---|---|---|
| Stripe Client | `server/stripeClient.ts` | Stripe SDK initialization |
| Billing Routes | `server/routes.ts` — `/api/billing/*` | Publishable key, setup intent, payment methods CRUD |
| A2P Stripe Webhook | `server/routes.ts` — `/api/stripe/webhook/a2p` | Stripe webhook for A2P brand payment events |
| A2P Pay Route | `server/routes.ts` — `/api/a2p/brands/:id/pay` | Initiates Stripe payment for brand registration |
| Plan Limits | `shared/schema.ts` — `PLAN_LIMITS` | Free ($0), Pro/Business ($49), Business Voice ($99), Enterprise ($299) |
| Granular Ledger | `shared/schema.ts` — `siteConfigs.*Minutes` | 4 cost-center columns: `voice_phone_ai_minutes`, `voice_web_ai_minutes`, `sms_messages`, `chat_bot_messages` |
| Ledger Migration | `migrations/0009_granular_resource_ledger.sql` | Replaced legacy `minute_balance` with 4-column cost isolation |
| Billing Page | `client/src/pages/account/BillingPage.tsx` | Customer billing UI |
| Customer Accounts | `shared/schema.ts` — `customerAccounts` | Stores `stripeCustomerId`, `plan`, `planStartedAt` |

---

#### React Frontend / Dashboards

| Page Area | Key Components | Description |
|---|---|---|
| **Owner Dashboard** | `AiBizBotAdmin.tsx`, `CustomerSiteManager.tsx`, `InquiryManagement.tsx`, `OwnerChatInterface.tsx`, `SitesAndLeads.tsx` | Business owner command center |
| **Biz Dashboard** | `CallTracking.tsx`, `CustomerManager.tsx`, `VoiceLeadMachine.tsx`, `TransparencyDashboard.tsx`, `GoogleCalendarPage.tsx`, `GoogleTasksPage.tsx` | CRM + outbound lead machine |
| **Agent Management** | `AgentDashboard.tsx`, `AgentManager.tsx`, `AgentManagementPage.tsx`, `AgentTestingDashboard.tsx`, `CommandChat.tsx`, `OnboardingFlow.tsx` | AI agent lifecycle management |
| **Classroom / Workspaces** | `TheClassroom.tsx`, `TheLab.tsx`, `TheOffice.tsx`, `TheVibe.tsx` | Learning and agent workspace environments |
| **Developer Tools** | `DeveloperPage.tsx`, `TelephonyManager.tsx`, `AgentTelephony.tsx`, `SystemHealthCheck.tsx`, `TwilioHealthCheck.tsx` | Engineering & ops panel |
| **Integrations** | `GoogleApiAnalyst.tsx`, `GoogleDrivePage.tsx`, `GooglePlacesSdk.tsx` | Google ecosystem integrations |
| **Showcase / Demos** | `LandingV2.tsx`, `MvpLanding.tsx`, `OlympicB2b.tsx`, `TestB2b.tsx`, `KimiAudioDemo.tsx`, `DiscAssessment.tsx`, `SdkShowcase.tsx` | Public demos and B2B showcase |
| **Customer / Public** | `BusinessPage.tsx`, `CustomerChatInterface.tsx`, `ContactForm.tsx`, `ChatWithAgentPreview.tsx` | Consumer-facing business site + chat |
| **Account** | `BillingPage.tsx`, `Login.tsx`, `MyAccount.tsx` | Account and subscription management |
| **Admin (Platform)** | `GatewayAdmin.tsx` | Gateway Global superadmin panel |
| **Legal** | `SmsConsent.tsx` | A2P SMS consent page |

**Routing:** Uses `wouter` (lightweight React router). Entry point: `client/src/main.tsx` → `App.tsx`.

---

## 2. Cursor Intelligence Audit — The Brain

### 2.1 Active Workspace Rules (`.cursor/rules/`)

| Rule File | Scope | Summary |
|---|---|---|
| **`api-lockdown.mdc`** | `alwaysApply: true` | **Total API Lockdown**: Forbids embedding `GEMINI_API_KEY` or `GROUNDING_LITE_KEY` in the frontend. All Google API calls must be server-proxied. Secret retrieval via `secretManager.ts`. Model strings must come from `process.env.GEMINI_MODEL_ID` only — never hardcoded. |
| **`handover-protocol.mdc`** | `alwaysApply: true` | **Immutable Handover**: System prompts are DB artifacts (`site_configs`), not UI state. Every config save must pass `UPAValidator.validate()`. `ConciergePanel` must always fetch via `GET /api/site-configs/:id`. AudioContext must be safety-checked before `.close()`. |
| **`modular-routing.mdc`** | `alwaysApply: true` | **Anti-Monolith**: No new routes in `server/routes.ts`. All new endpoints go in `server/routes/*.ts` modular files. |
| **`chat-ptt-requirements.mdc`** | globs: WebsitePreview, BusinessPage, Chat\* | **Non-negotiable UI Contract**: Chat interface must support 3-mode layout switching (floating/fixed/fullscreen) with single-click cycling. PTT (hold-to-record) must always be present. |
| **`doppler-cli.mdc`** | globs: .env\*, ecosystem\*.cjs, scripts/\* | **Secret Hygiene**: Always use `doppler run --` for script execution. Never commit real secrets. Provides CLI patterns for dev/stg/prd config copying. |
| **`gemini-3-flash.mdc`** | No glob restriction | **Model Standards**: Mandates `gemini-3.0-flash`. No fallback to 1.5/2.0. Uses stateful `previous_interaction_id` (Interactions API) or `thought_signature` (generateContent) patterns. |
| **`clear-voice-ops.mdc`** | globs: server/services/audio/\*\*, client/src/worklets/\*\* | **Audio Engineering**: FRCRN/MossFormer2 for denoising. All audio worklets must produce 16-bit PCM @ 16kHz (Gemini Native Audio input spec). |

### 2.2 Active Skills (`.cursor/skills/`)

| Skill | Trigger | What It Knows |
|---|---|---|
| **`gemini-live-engine`** | When modifying WebSocket proxy or audio streaming | Native audio spec (16kHz in, 24kHz out), `voiceGemini.ts` / `voiceStream.ts` locations, barge-in and speculative response behavior, model ID management. |
| **`a2p-compliance`** | A2P 10-DLC provisioning | One-shot provisioner script, 6 Messaging Service pipes, Trust Hub Secondary Customer Profile workflow, `BUSINESS_REGISTRATION_NUMBER` secret handling. |
| **`environment-management`** | Environment/deployment tasks | Dev=3004, Stage=3003, Prod=3002. PM2 process names. Doppler config names (dev/stg/prd). Full set of PM2/Doppler commands and port-sync procedures. |
| **`health-diagnostics`** | System health verification | Three-key verification procedure, health endpoint URLs per environment, `listModels` Gemini check, `nativeAudioPreviewPermit` flag location. |

---

## 3. Database Schema Overview — The Ledger

**ORM:** Drizzle ORM with PostgreSQL (`drizzle-orm`, `pg`). Schema file: `shared/schema.ts` (~2,400+ lines).

### 3.1 Primary Tables

| Table | Purpose |
|---|---|
| **`users`** | Basic user auth (username/password) — legacy base auth |
| **`admin_users`** | Platform administrators (phone-based OTP auth) |
| **`otp_codes`** | Time-limited OTP codes for admin authentication |
| **`auth_sessions`** | Active admin authentication sessions (token-based) |
| **`customer_accounts`** | Business owner accounts (phone OTP, plan, Stripe customer ID) |
| **`customer_sessions`** | Active customer auth sessions |
| **`agents`** | AI agent definitions — DISC personality, voice model, budget controls, phone number, system prompt, startup scripts |
| **`customers`** | CRM leads/contacts — source, status, Stripe IDs, agent assignment |
| **`tasks`** | MVP 24-hour trial tasks dispatched to agents via SMS |
| **`telephony_configs`** | Per-deployment Twilio credentials, webhook URLs, firewall settings, phone number SIDs |
| **`call_logs`** | Inbound/outbound call records linked to telephony configs |
| **`sms_conversations`** | 30-day SMS conversation threads (phone → customer → agent) |
| **`sms_messages`** | Individual messages within conversations |
| **`sms_delivery_status`** | Twilio delivery status tracking (error codes, retry counts) |
| **`twilio_sub_accounts`** | Multi-tenant Twilio sub-account registry |
| **`a2p_brands`** | A2P 10-DLC brand registrations (TCR, vetting, Stripe payment) |
| **`a2p_campaigns`** | A2P campaign registrations (use case, opt-in flow, messaging service) |
| **`site_configs`** | ⭐ **Central config table** — maps business → agent, holds knowledge library, widget config, plan, **Granular Resource Ledger** (4 cost-center columns), hero image, system prompt overrides |
| **`chat_logs`** | Web chat conversation history per `site_config_id` |
| **`demo_leads`** | Onboarding demo flow — magic token, business enrichment, status lifecycle |
| **`bot_templates`** | Reusable agent personality/system prompt templates |
| **`organizations`** | Top-level groupings (GitHub org equivalent) |
| **`projects`** | Work containers within organizations; assigned agents |
| **`project_tasks`** | Kanban work items within projects |
| **`knowledge_topics`** | Micro-learning topic registry (normalized, request-counted) |
| **`lesson_plans`** | Self-improving AI-generated lesson plans with quiz and syllabus |
| **`lesson_sessions`** | Per-session learning tracking (quiz score, slides viewed, feedback) |
| **`business_data_cache`** | Google Places enriched business data (TTL-based cache) |
| **`owner_business_data`** | Owner-supplied custom descriptions, offers, hours, amenities |
| **`business_intelligence_cache`** | SWOT + narrative intelligence reports (TTL-based) |
| **`tour_specifications`** | Clear Voice tour segment specs for featured partners |
| **`featured_partners`** | AI-curated partner registry (Boardwalk Suites pattern — hooks, tags, story, glow theme) |
| **`vlm_prospects`** | VoiceLeadMachine prospect database (Google Places + quality scoring) |
| **`vlm_campaigns`** | Outbound call campaign definitions |
| **`vlm_call_attempts`** | Individual call attempt records (outcome, recording URL) |
| **`menus`** | Restaurant/business menu definitions |
| **`menu_categories`** | Menu category organization |
| **`menu_items`** | Individual menu items (pricing, allergens, customization options) |
| **`carts`** | Customer shopping carts (anonymous + identified) |
| **`cart_items`** | Line items in active carts |
| **`orders`** | Completed e-commerce orders (delivery/pickup/dine-in, Stripe payment) |
| **`order_items`** | Snapshot line items in completed orders |
| **`inquiries`** | Contact form submissions and customer inquiry queue |
| **`b2b_hotels`** | GRN Connect hotel records (hotel code + spatial join to Google Place ID) |
| **`b2b_flights`** | SerpAPI flight records (booking token, IATA codes) |
| **`b2b_agent_markups`** | Agent markup rules (percentage or flat fee) for B2B pricing |
| **`b2b_itineraries`** | Client itinerary state (Trip Anchor, orchestrator `thought_state`) |
| **`b2b_itinerary_items`** | Hotels and flights added to an itinerary |
| **`b2b_curation_events`** | Audit trail for Agent Curation Panel actions (added/removed/markup_changed) |
| **`workspace_configurations`** | Google Workspace integration config (hosted vs. integrated, OAuth tokens, Drive folder IDs) |
| **`swot_analyses`** | AI-generated or manual SWOT analyses tied to a business |
| **`consultations`** | AI Biz Bot consultation sessions (conversation history, insights, custom tools) |
| **`agent_knowledge_base`** | Platform research and documentation store (markdown content, tags, versioning) |
| **`api_documentation`** | Google/third-party API documentation with pricing, rate limits, alternatives |
| **`research_tasks`** | Ongoing research project tracking |
| **`og_settings`** | Per-page Open Graph metadata (social sharing cards) |
| **`sms_opt_outs`** | ⭐ **A2P Compliance** — STOP keyword block list (global or tenant-scoped by `site_config_id`) |
| **`sms_logs`** | ⭐ **Sovereign SMS Router** — immutable audit ledger for every dispatch attempt (intent enum, cost `numeric(10,4)`, status, segments) |

### 3.2 Key Schema Design Decisions

- **`siteConfigs` Granular Resource Ledger**: Migration `0009` replaced a single `minute_balance` column with 4 isolated cost-center columns (`voice_phone_ai_minutes`, `voice_web_ai_minutes`, `sms_messages`, `chat_bot_messages`). This enables accurate per-cost-center billing isolation.
- **`sms_intent` Enum**: 6 values map to 6 dedicated Twilio Messaging Service SIDs — each pipe is a separate A2P campaign, ensuring carrier compliance per use case.
- **`sms_logs.cost`**: Stored as `numeric(10,4)` (not float) to avoid sub-cent rounding errors on Twilio's $0.0079/segment pricing.

---

## 4. Dead Code & Ghost Identification — The Purge Target

### 4.1 Confirmed Purged

| File | Action Taken |
|---|---|
| `server/webhookHandlers.ts` | ✅ **DELETED** — confirmed true orphan with zero imports. Removed in `chore/the-great-purge`. |
| Legacy root directories | ✅ **ARCHIVED** to `_legacy_archive/` — see section 1.1. |

### 4.2 Technical Debt: The Monolith

| Item | Risk Level | Status |
|---|---|---|
| `server/routes.ts` (~7,500 lines) | 🔴 **CRITICAL** | Active tech debt. No new routes to be added. Gradual extraction into `server/routes/*.ts` modular files is the Phase 2 priority. |
| Dual-registration of `site-configs` routes | 🔴 **HIGH** | Routes exist in both `routes.ts` (lines 4400–4524) and `server/routes/siteConfigRoutes.ts`. Must be consolidated — inline versions should be removed once modular file is confirmed as sole handler. |

### 4.3 Evaluate for Future Purge

| File | Notes |
|---|---|
| `server/kimiAudioDirect.ts` | Kimi-Audio via Replicate — may be superseded by Gemini Native Audio |
| `server/kimiAudioReplicate.ts` | Same Replicate pipeline — evaluate if still in active call path |
| `server/mcp-hotels.ts` | Standalone MCP server entry point — may no longer be launched |
| `client/src/pages/showcase/MvpLanding.tsx` | Duplicate alongside `LandingV2.tsx` — verify active route binding |
| `client/src/pages/showcase/MockConversation.tsx` | "Mock" placeholder — verify if served by active route |
| `server/services/serpapi-reviews.ts` | **SerpAPI_Reviews_Connector** — Tier-2 Review Intelligence core; do not purge. Structured ingestion for Raw Reviews Index and Tier-2 C-Suite agents. |

---

## 5. Dependencies & Environment — The Stack

### 5.1 Core Technology Stack

| Category | Technology | Version | Role |
|---|---|---|---|
| **Runtime** | Node.js + TypeScript | `typescript: 5.6.3` | Server and build toolchain |
| **Frontend Framework** | React | `^18.3.1` | UI component framework |
| **Build Tool** | Vite | `^7.3.0` | Frontend bundler and dev server |
| **Backend Framework** | Express | `^5.0.1` | HTTP and WebSocket server |
| **Database ORM** | Drizzle ORM | `^0.39.3` | Type-safe PostgreSQL ORM |
| **Schema Validation** | Zod + drizzle-zod | `^3.24.2` / `^0.7.0` | Runtime validation and schema inference |
| **Database Driver** | pg | `^8.16.3` | PostgreSQL client |
| **AI — Primary** | Kimi / Moonshot (via `openai` SDK) | Custom integration | Primary reasoning engine (Kimi K2, Kimi-128k) |
| **AI — Voice** | Google Gemini Native Audio | `@google/genai: ^1.39.0`, `@google/generative-ai: ^0.24.1` | Gemini 2.5 Flash Native Audio voice pipeline |
| **AI — Replicate** | Replicate | `^1.4.0` | Kimi-Audio and image generation (Flux) |
| **AI — TTS** | Google Cloud TTS | `@google-cloud/text-to-speech: ^6.4.0` | Text-to-speech synthesis |
| **Telephony** | Twilio | `^5.3.2` | SMS, voice calls, A2P 10-DLC |
| **Payments** | Stripe | `^20.0.0` | Subscriptions, payment intents, webhooks |
| **Maps / Places** | Google Maps (multiple SDKs) | `@googlemaps/google-maps-services-js`, `@react-google-maps/api`, `@vis.gl/react-google-maps` | Maps, places search, geolocation |
| **MCP Protocol** | `@modelcontextprotocol/sdk` | `^1.26.0` | Model Context Protocol server/client |
| **Google APIs** | `googleapis` | `^171.3.0` | Google Workspace (Drive, Calendar, Tasks, Docs, Sheets) |
| **UI Components** | Radix UI (shadcn/ui) | Multiple `^1.x`–`^2.x` | Accessible component primitives |
| **Styling** | TailwindCSS | `^3.4.17` | Utility-first CSS |
| **Animation** | Framer Motion | `^11.13.1` | UI animations |
| **3D / Visualization** | Three.js + Vanta.js | `^0.182.0` / `^0.5.24` | Background 3D effects |
| **Routing (Client)** | Wouter | `^3.3.5` | Lightweight React router |
| **Data Fetching** | TanStack Query | `^5.60.5` | Server state management |
| **Forms** | React Hook Form + resolvers | `^7.55.0` | Form state and validation |
| **Charts** | Recharts | `^2.15.4` | Data visualization |
| **Session Storage** | `connect-pg-simple` + `express-session` | `^10.0.0` | Server-side session persistence in PostgreSQL |
| **Authentication** | Passport.js (local strategy) | `^0.7.0` | Auth framework |
| **Web Scraping** | Cheerio | `^1.2.0` | HTML parsing (website analysis) |
| **YAML** | js-yaml | `^4.1.0` | Tour spec and config parsing |
| **HTTP Client** | Axios | `^1.13.5` | External API requests |
| **Git Hooks** | Husky | `^9.1.7` | Pre-commit hooks |

### 5.2 Required Environment Variables

#### Critical / Required for MVP Operation

| Variable | Category | Purpose |
|---|---|---|
| `DATABASE_URL` | Database | PostgreSQL connection string |
| `KIMI_API_KEY` | AI | Moonshot/Kimi API key — primary reasoning engine |
| `GOOGLE_API_KEY` | AI | Google Gemini API key — voice AI, fallback AI, Grounding |
| `TWILIO_ACCOUNT_SID` | Telephony | Twilio master account identifier |
| `TWILIO_AUTH_TOKEN` | Telephony | Twilio master account auth token (**keep secret**) |
| `TWILIO_PHONE_NUMBER` | Telephony | Default outbound phone number (E.164 format) |
| `STRIPE_SECRET_KEY` | Billing | Stripe server-side secret key |
| `STRIPE_PUBLISHABLE_KEY` | Billing | Stripe client-safe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Billing | Stripe webhook endpoint verification secret |
| `SESSION_SECRET` | Security | Express session secret (32+ characters) |
| `ENCRYPTION_KEY` | Security | Data encryption key (32+ characters) |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP | Google Cloud project for server-side API calls |
| `GOOGLE_MAPS_API_KEY` | GCP | Maps JavaScript API (HTTP referrer restricted — client-safe) |
| `GOOGLE_PLACES_API_KEY` | GCP | Places API New (server-side proxy only) |

#### A2P / Telephony Compliance

| Variable | Purpose |
|---|---|
| `STRIPE_A2P_WEBHOOK_SECRET` | Stripe webhook for A2P brand registration payments |
| `STRIPE_PRICE_AI_PRO` | Stripe Price ID for Business plan |
| `STRIPE_PRICE_AI_BASIC` | Stripe Price ID for Basic plan |
| `BUSINESS_REGISTRATION_NUMBER` | **⚠️ Sensitive** — 9-digit SSN/EIN for A2P Trust Hub bundle (Doppler only, never in any file) |

#### Google OAuth / Workspace

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID for Google Workspace integration |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI (env-specific) |

#### AI Extended

| Variable | Purpose |
|---|---|
| `REPLICATE_API_TOKEN` | Replicate API — Kimi-Audio voice, Flux image generation |
| `HUGGINGFACE_TOKEN` | HuggingFace — Kimi K2 MCP server, extended models |
| `GEMINI_MODEL_ID` | **Doppler-managed** — Gemini model string (never hardcode; injected at build via Vite `define`) |

#### B2B Travel OS

| Variable | Purpose |
|---|---|
| `SERP_API_KEY` | SerpAPI — flight search for B2B Continental Handshake |
| `GRN_API_KEY` | GRN Connect — hotel content and live rates |
| `NUITEE_API_KEY` | Nuitée — hotel content fallback |
| `GRN_GOOGLE_CLOUD_PROJECT_ID` | GCP project for GRN-related Google access (project: `grn-travel-agent`) |

#### Environment / Platform

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` \| `staging` \| `production` |
| `PORT` | `3004` (Dev) \| `3003` (Stage) \| `3002` (Prod) |
| `DOPPLER_SERVICE_TOKEN` / `DOPPLER_TOKEN_DEV` / `DOPPLER_TOKEN_STAGE` / `DOPPLER_TOKEN_PRODUCTION` | Doppler authentication per environment |

### 5.3 Environment Management

| Environment | Port | PM2 App Name | Doppler Config |
|---|---|---|---|
| Development | `3004` | `aibizbot-dev.gatewayglobal.ai` | `dev` |
| Staging | `3003` | `aibizbot-stage.gatewayglobal.ai` | `stg` |
| Production | `3002` | `aibizbot.gatewayglobal.ai` | `prd` |

**Secret Management:** Doppler is the authoritative secret store for all environments. PM2 with `ecosystem.config.cjs` manages process lifecycle. Local `.env` contains only `DOPPLER_SERVICE_TOKEN` for CLI authentication (gitignored).

---

## Migration Journal — Canonical Sequence

Execution order is deterministic: `for f in migrations/*.sql` expands in POSIX alphabetical order. Do not rename migration files; `schema_migrations` tracks by exact filename.

| Order | Filename |
|---|---|
| 1 | `0001_add_site_knowledge_library.sql` |
| 2 | `0001_many_wraith.sql` |
| 3 | `0002_business_data_tour_guide.sql` |
| 4 | `0003_business_enrichment_snapshots.sql` |
| 5 | `0003_platform_business_map.sql` |
| 6 | `0004_site_plan.sql` |
| 7 | `0005_analytics_logs.sql` |
| 8 | `0005_voice_usage_logs.sql` |
| 9 | `0006_telephony_call_timestamps.sql` |
| 10 | `0007_resellers_commissions.sql` |
| 11 | `0008_site_claim_tokens.sql` |
| 12 | `0009_granular_resource_ledger.sql` |
| 13 | `0009_nova_idv_sessions.sql` |
| 14 | `0010_sms_compliance_router.sql` |
| 15 | `0011_compliance_reseller_gateway.sql` |
| 16 | `0012_mixing_board_configs.sql` |
| 17 | `0013_agent_character_engine.sql` |
| 18 | `0013_industry_agent_templates.sql` |
| 19 | `0014_agents_site_config_id.sql` |
| 20 | `0014_reviews_harvested.sql` |
| 21 | `0015_agents_role_type.sql` |
| 22 | `0015_industry_agent_templates.sql` |
| 23 | `0016_site_configs_workspace_lifecycle.sql` |
| 24 | `0017_site_configs_twilio_sub_account.sql` |

Next migration prefix: **0018**. One file per prefix; no parallel branch splits.

**Note:** 2026-03-02: Added 0017 to align site_configs Twilio provisioning fields with shared/schema.ts after runtime missing-column error on /api/customer/businesses.

---

## Appendix A: File Counts by Directory

| Directory | Approximate File Count | Status |
|---|---|---|
| `server/` (root + subdirs) | ~55 TypeScript files | ✅ Active |
| `client/src/` | ~70+ TypeScript/TSX files | ✅ Active |
| `shared/` | 1 file (schema.ts, ~2,400+ lines) | ✅ Active |
| `scripts/` | 11 files | ✅ Active |
| `docs/` | 30+ Markdown files | ✅ Reference |
| `migrations/` | 24 SQL files (see Migration Journal above) | ✅ Active |
| `_legacy_archive/` | ~200+ files | ⛔ Archived — do not touch |

---

## Appendix B: Priority Action Items for Enterprise Transition

| Priority | Item | Status |
|---|---|---|
| ✅ Done | Delete `server/webhookHandlers.ts` — confirmed orphan | Completed in `chore/the-great-purge` |
| ✅ Done | Archive all root-level legacy directories into `_legacy_archive/` | Completed in `chore/the-great-purge` |
| 🔴 High | **Resolve dual-registration** of `site-configs` routes — consolidate inline `routes.ts` handlers into `server/routes/siteConfigRoutes.ts` | Phase 1 close-out |
| 🔴 High | **Begin monolith extraction** — extract telephony, twilio, billing, a2p, and sms routes from `server/routes.ts` into dedicated files in `server/routes/` | Phase 2 |
| 🟡 Medium | Audit Replicate/Kimi-Audio pipeline (`kimiAudioDirect.ts`, `kimiAudioReplicate.ts`) — determine if still reachable or fully superseded by Gemini Native Audio | Phase 2 |
| 🟡 Medium | Establish Drizzle migration baseline — gaps between migrations `0002` and `0009` suggest manual schema changes needing reconciliation | Phase 2 |
| 🟡 Medium | Consolidate showcase pages — audit `MvpLanding.tsx`, `MockConversation.tsx`, `TestB2b.tsx` for active route bindings | Phase 2 |

---

*Last updated: March 2, 2026 — Stable Rollback & Relayering; Bedrock v0.16; worktrees disabled*
