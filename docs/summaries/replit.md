# Gateway Global AI Platform

## Overview
Gateway Global AI is the complete AI-first platform for small business owners to launch and manage their online presence. Our mission is **removing all friction from getting online with the latest AI tools**. 

We empower small businesses to generate stunning AI-powered websites with voice, chatbots, and SMS in 30 seconds. The platform combines autonomous agents, Twilio telephony integration, Google Workspace APIs, and revolutionary chat interfaces to help business owners compete in the AI era.

### Core Value Proposition
- **30-Second AI Websites**: Professional business sites with voice concierge and live chat
- **AI Biz Bot**: Digital business partner for website modifications and intelligent upselling
- **Voice AI**: Natural language customer interactions via Kimi-Audio
- **SMS Management**: Run your business via text with Twilio integration
- **VoiceLeadMachine**: Outbound campaign tool for automated lead generation
- **Revolutionary Chat Interface**: First of its kind, fully integrated admin with float/fix/expand modes
- **DISC & ARCH Controls**: Advanced agent personality customization
- **Google Workspace**: Seamless integration with Drive, Calendar, Tasks, Docs, Sheets

For complete product vision and strategy, see [PRODUCT_VISION.md](./PRODUCT_VISION.md).

## Platform Status
**Version**: 1.0.0-MVP  
**Phase**: Launch Preparation  
**Target Market**: Small business owners (restaurants, salons, contractors, freelancers, retail, professional services)

See [STATUS.md](./STATUS.md) for current build status and [ROADMAP.md](./ROADMAP.md) for development timeline.

## User Preferences
Preferred communication style: Simple, everyday language.

### Chat Interface Design Principles (DO NOT REDESIGN)
The user has spent 2+ years perfecting chat interfaces. These principles are non-negotiable:
- **NEVER redesign existing chat interfaces** without explicit user approval. The current designs are the standard.
- **Purpose**: Chat interfaces serve AI communication, accessing control panels/options, controlling web pages, and collaboration (itineraries, planning, task management).
- **Voice button behavior**: Voice button must open a visualizer INSIDE the chat window (replacing the message body), NOT cause the chat to disappear or navigate away.
- **Voice visualizer on landing page**: Carefully designed, never replace or redesign — only add interaction layers while preserving original appearance.
- **Split-panel pattern** (from NurseNest/TravelGenie examples): Chat on left, functional tabs on right (Plan/Bookings/Budget/Tasks). Chat coexists with actionable panels.
- **Floating chat widget style**: Original design uses a floating card (bottom-right, rounded-3xl, shadow), NOT fullscreen takeover. FAB button when closed.
- **Footer controls**: Input with mic button and send button. Camera/attachment icon optional.
- **No double scrollbars, no floating windows over chat, no cards in scrolling pages.**
- **iPhone Principle**: Manage infinite complexity through minimal controls. One button, many paths. Overlays as intermediate navigation steps.
- **Multi-path overlays**: Click to open, make a selection, view content. Not single-path buttons in headers.
- **Toggle-everything**: Features are on/off with toggle switches. No complex settings dialogs.
- **Rich headers**: Chat headers can hold icon toolbars, voice controls, status indicators. Not just thin bars.

### SDK & Component Library
- **Public SDK showcase page**: Available at `/sdk` route (no auth required). Documents all chat interface patterns with interactive demos.
- **Google Places SDK docs**: Available at `/sdk/google-places` route (no auth required). Comprehensive developer reference for Places API (New) integration — Autocomplete, Place Details, Photos, AI Summaries, field tiers, OAuth setup, and how our platform uses Google Places data.
- **SDK directory**: `/sdk/chat/` contains the open-source frontend SDK (gateway-chat.js), TypeScript types, reference app sources, and README.
- **Composable widgets**: TogglePanel, OverlayMenu, IconToolbar, VoiceVisualizer, SplitPanel, CategoryGrid, FloatingWidget - all demonstrated at `/sdk`.
- **Frontend-only**: SDK makes API calls to Gateway platform (`/api/website-chat`, `/api/bots/:id/public`). No backend code in SDK.

## System Architecture

### UI/UX Decisions
The platform features a clean, modern design with a dark slate theme and immersive 3D animated backgrounds using Vanta.js. The primary interface is a business-focused landing page for lead generation, including an Admin Login with OTP authentication to access the admin dashboard and agent customization tools ("The Vibe," "The Office," "The Lab," "The Classroom"). Interactive visualizers are used for DISC profiles and ARCH communication models.

### Technical Implementations
- **Frontend**: React 18+, TypeScript, shadcn/ui, Tailwind CSS, Vite, TanStack React Query.
- **Backend**: Express 5 on Node.js, TypeScript, RESTful JSON API.
- **AI Engine Integration**: Kimi 2.5 (Moonshot API) with 256K context and native tool calling is the primary AI, with Gemini as a fallback. Kimi K2 MCP Server handles agentic coding tasks, and Kimi-Audio (via Replicate) provides real-time voice AI. HuggingFace Pro integration supports extended model access for Developer accounts.
- **24-Hour SMS Automation**: A background scheduler manages a 4-step SMS update sequence (Start, Progress, Midpoint, Complete) for user tasks, personalized by Kimi.
- **Telephony Integration**: Twilio manages SMS and voice interactions, including webhooks and a provisioning API.
- **Database**: PostgreSQL with Drizzle ORM.
- **Data Model**: Key entities include `users`, `agents` (with DISC profiles), `customers`, `telephony_configs`, `call_logs`, `site_configs` (business-to-agent mappings for AI Biz Bot), and `chat_logs` (web chat conversation history).
- **Agent AI Model Configuration**: Agents can be configured with custom AI model settings (Provider, Model, Temperature, Max Tokens, API Token).

### Feature Specifications
- **Task Submission**: Users submit tasks via a landing page, select an agent personality, and provide a phone number for SMS updates.
- **Agent Personalization**: DISC profile and ARCH communication model sliders, along with a 6-section System Identity Prompts editor, allow fine-tuning agent personalities.
- **Interactive Environments**: "The Vibe" for conversation, "The Office" for collaboration, "The Lab" for agent fine-tuning, and "The Classroom" for self-improving AI lessons using a "WHY" pedagogical framework. The Classroom generates micro-lessons, quizzes users, and improves based on performance and feedback, featuring real-time image generation (Flux via Replicate) and text-to-speech (Kimi-Audio via Replicate).
- **Twilio Account Management**: Interface for managing Twilio credentials, sub-accounts, phone numbers, and billing.
- **Customer Relationship Management**: A Customer Manager for lead capture, status tracking, and notes.
- **Billing & Payment Methods**: Stripe-powered billing page for managing customer payment methods.
- **DISC Assessment**: An interactive 24-question assessment.
- **Onboarding Experience**: A/B tested flows ("The Awakening," "The 24-Hour Proof") with dynamic agent behavior.
- **A2P 10-DLC Compliance System**: Monetized service for business SMS registration with The Campaign Registry.
- **Website Builder Template**: GenAI Business Site Generator creates professional websites from Google Maps data with AI voice concierge and chat support.
- **Core Agents**: Eight auto-seeded agents with specific roles, including Onboarding, Classroom, Coding, AI Biz Bot, Google API Analyst, Repo Manager, Travel Agency Dev Agent, and Google Places SWOT Agent.
- **Agent Behavioral Guardrails**: System prompts prevent fabricated percentages, false timeline promises, and exaggerated progress claims, enforcing honest uncertainty.
- **Dual-Channel AI Biz Bot**: Operates via both an Admin Panel (web) with Gemini and Google Workspace integration, and an SMS channel for business owners to manage their website and tasks via text commands. Utilizes Google Places Aggregate API for business insights and market analysis.
- **VoiceLeadMachine**: Outbound lead generator and auto-dialer. Discovers business leads via Google Maps, scores quality (0-100 algorithm: 30pts phone + 25pts email + 20pts website + 15pts address + 10pts city + 15pts rating + 15pts reviews), enriches contact data (robots.txt compliant email scraping), and executes automated voice campaigns via Twilio. Data models: `vlm_prospects`, `vlm_campaigns`, `vlm_call_attempts`. Backend services in `server/services/vlm-*.ts`, routes in `server/vlm-routes.ts`, admin UI at `/lead-machine`.
- **Admin Command Chat**: Admin-facing chat interface at `/command-chat` that lets admins control and query any agent with live business context injected (sites, visitors, customers, leads, campaigns). Quick command buttons for Site Stats, Lead Report, Customer Overview, and Pipeline Status. Agent tools (Vibe, Office, Lab, Classroom, Telephony) directly accessible from the chat header and sidebar. Backend route: `/api/admin/command-chat`.
- **Admin Sidebar Agent Tools**: All agent management tools (The Vibe, The Office, The Lab, The Classroom, Telephony) are now directly accessible from the sidebar via an expandable "Agent Tools" section that lists all active agents with their individual tool links.
- **VLM Auto Agent Pipeline**: Fully automated sales pipeline in `server/services/vlm-auto-agent.ts`. One-click flow: discovers leads via Google Maps → quality scores them → auto-generates free AI websites (siteConfig entries) → calls prospects with personalized pitch → sends SMS with website link when prospect presses 1. API routes: `/api/vlm/auto-agent/run`, `/progress`, `/send-link`, `/report/:campaignId`, `/generate-script`. UI: "Auto Agent" tab (first tab) in VoiceLeadMachine page with pipeline controls, toggles (enrich emails, auto-generate sites, auto-call), quality filtering, custom script editor with variable support ({businessName}, {industry}, {city}, {rating}, {reviewCount}), and real-time progress tracking (8 phases). TwiML gather-response automatically triggers SMS with website link when prospect presses 1.

## External Dependencies

-   **Twilio**: Telephony provider for SMS, voice calls, and phone number management.
-   **Moonshot API (Kimi 2.5)**: Primary AI reasoning engine.
-   **Replicate**: Hosts Kimi-Audio for real-time voice AI and Flux for image generation.
-   **HuggingFace**: Hosts Kimi K2 MCP Server and provides access to various models.
-   **Google Gemini**: Fallback AI engine and powers Gemini Live voice chat.
-   **PostgreSQL**: Relational database.
-   **Stripe**: Payment processing.
-   **Google Workspace**: Full integration for Drive (file browser, upload, folder management), Calendar (event listing, creation, deletion with all-day event support), Tasks (task listing, creation, completion toggle, deletion), Docs, and Sheets. All accessed via admin dashboard pages under Operations.
-   **Google Maps Platform**: Used for Google Maps JavaScript API (client-side) and various Google Cloud APIs (server-side, e.g., Places Aggregate API, Text Search).