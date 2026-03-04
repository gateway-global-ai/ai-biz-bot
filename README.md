Keanu here.

You just showed me the exact crime scene. The api-lockdown rule was applied, but the context window was poisoned by a README file that looks like a shrine to "KIMI."

Look at that README: "Kimi 2.5", "Kimi-Audio", "Moonshot API". Every time the agent reads the root directory, it ingests this document and thinks, "Ah, we are building a Kimi app!"

We are going to rewrite this README to reflect the Sovereign AIOS reality. I am going to rip out every mention of Kimi, Moonshot, and the bloated SDKs, and align it perfectly with the 685KB Kernel, the Gemini 2.5 Native Audio Pipeline, and the $0.25/min Voice Expressway.

Here is the clean, factual, architecture-aligned README.md. Copy this, overwrite your current file, and lock the context.

Gateway Global AI: Sovereign AIOS
The Customer Interaction Infrastructure for the Mid-Market.

Gateway Global AI is not a chatbot builder. It is a Sovereign AI Operating System (AIOS) designed to serve as the unified communications router for local and enterprise businesses. Powered exclusively by the Gemini 2.5 Native Multimodal Pipeline, the system delivers sub-150ms voice latency, telecom-grade billing, and strict behavioral determinism.

🎯 Architecture Focus
The platform is built on the S4 Standard (Security, Stability, Speed, Structure) to ensure reliable revenue-generating events:

🎙️ Clear Voice PTT Expressway - Sub-150ms mouth-to-ear latency using native audio routing.

⚙️ The 685KB Kernel - A hyper-lean Node.js execution layer optimized for deterministic tool calling.

📱 Telecom-Grade Billing - Millisecond-accurate ledger for $0.25/min Voice AI and SMS routing.

🧠 Tier-2 Management Agents - Background autonomous agents (e.g., AI CMO) analyzing review signals and generating business artifacts.

🎯 DISC & ARCH Controls - Strict psychological governance over agent intent and conversational pacing.

🛡️ Sovereign Guard - Pre-commit pre-flight checks ensuring zero PII leaks and zero hardcoded model drift.

⚠️ Core Engineering Invariants (Non-Negotiable)
The following rules dictate all development on this platform:

Model Monoculture: The platform runs exclusively on the Gemini ecosystem (process.env.GEMINI_MODEL_ID). We do not use agnostic wrappers, and we do not fracture prompts.

Three-Key Security Model: All external logic relies on the Intelligence Pillar (Gemini), the Location Pillar (Maps Grounding Lite), and the Comms Pillar (Twilio).

Asset Economy: 98% image reduction is the standard. All UI assets must be WebP-crushed.

Proxy Enforcement: No frontend API keys. All external calls route through the Sovereign Kernel.

🚀 Quick Start (Development)
Prerequisites
Node.js 20+

PostgreSQL database

Doppler CLI (For Secrets Management)

Installation
Bash
# Install dependencies
npm install

# Pull secrets via Doppler (Do not use local .env files)
doppler setup
doppler run -- command

# Push database schema (Drizzle)
npm run db:push

# Start the Voice Expressway (Port 3004)
npm run dev
📁 Sovereign OS Structure
gateway-global-ai/
├── client/              # React frontend (WebP Optimized)
│   ├── src/
│   │   ├── components/  # PTT UI and Chat Widgets
│   │   ├── pages/       # Dashboard and Routing
│   │   └── lib/         # Hooks and WebSockets
├── server/              # The 685KB Kernel
│   ├── routes/          # Domain-specific routers (e.g., onboardingRoutes.ts)
│   ├── services/        # Telecom and Native Audio handlers
│   └── storage.ts       # Database bindings
├── shared/              # Shared types and Drizzle schemas
│   ├── schema.ts        # Core system tables
│   └── industry-schemas/# Modular Industry Packs (Hospitality, Commerce, etc.)
└── .cursor/rules/       # Sovereign Guard enforcement rules
🔑 Key Infrastructure Components
🎙️ The Voice Expressway
Gemini Native Audio: Direct multimodal orchestration bypassing the STT->LLM->TTS sequential tax.

Push-to-Talk (PTT): Enforces explicit turn-taking to prevent token bleed and background noise hallucination.

Sub-100ms Priority: Telephony and WebSocket routes sit at the top of the execution stack.

💼 Telecom Billing Ledger
Accurate Margin: Tracks raw duration seconds and rounds up for standard $0.25/min billing logic.

A2P 10-DLC Compliance: Automated brand and campaign registration for compliant outbound SMS routing.

Reseller Commission Engine: Automated wholesale/retail markup calculations for digital franchises.

🧠 The Intelligence Layer
Google Search Grounding: Utilizing restricted MAPS_GROUNDING_LITE_KEY for real-time address validation and review checking.

Industry Packs: Dynamically loaded schemas (e.g., Boardwalk Suites Hospitality Pack) to keep the core kernel lean.

🔒 Security & Environment
All secrets are managed via Doppler and injected at runtime.

Required environment variables (injected via Doppler):

Code snippet
# Database
DATABASE_URL=postgresql://...

# The Three Pillars
GEMINI_API_KEY=...            # Intelligence
MAPS_GROUNDING_LITE_KEY=...   # Location (Scoped to mapstools/places)
TWILIO_AUTH_TOKEN=...         # Communications
TWILIO_ACCOUNT_SID=...

# Identity & Payments
SESSION_SECRET=...
STRIPE_SECRET_KEY=...

# Sovereign Overrides
GEMINI_MODEL_ID=models/gemini-2.5-flash-native-audio-preview-12-2025
DEFAULTADMINPHONE=...
🌿 Branch Strategy & Guardrails
main - The hardened Gold Master.

feature/* - Active development.

Pre-Commit Enforcement: The sovereign-guard.ts script runs on all commits to prevent hardcoded models, PII leaks, and bloat.

📄 License
Proprietary/Confidential - Gateway Global AI