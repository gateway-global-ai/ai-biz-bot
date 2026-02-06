# Gateway Global AI - SMS-First AI Task Completion Platform

## Overview
Gateway Global AI is an SMS-first AI task completion platform designed to complete user tasks within 24 hours using AI, delivered via SMS updates. It provides an app-free experience, focusing on simplicity and efficiency. The platform aims to be a leading AI task completion service that is accessible and reliable, utilizing Kimi 2.5 for AI reasoning and Twilio for communication. It also features an administrative backend (NEXUSCMD) for configuration and management, and capabilities for AI-powered website generation and business analysis.

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