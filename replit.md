# NEXUSCMD - Agent Command & Control Interface

## Overview

NEXUSCMD is a command and control admin interface centered on DISC Profile visualization and agent behavioral configuration. The system includes a comprehensive DISC Profile editor with behavioral matrix controls (Dominance, Influence, Steadiness, Conscientiousness), ARCH communication model (Acknowledge, Reflect, Context, Handoff), system identity prompts, and a "My Beliefs Window" for meta-cognition testing. Secondary features include telephony management with Twilio integration, server monitoring, test orchestration, and security auditing.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (February 2026)

- **NEW: Carousel-Style Onboarding Flow** (`/`):
  - 4-step frictionless free trial: Name Your Bot → Select A Voice → Fine Tune It → Meet Your Creation
  - Smooth slide-left/slide-right CSS animations between steps
  - Stationary interface with content sliding (retains users better)
  - Step progress indicator with 4 dots at top
  - DISC personality sliders in Fine Tune step
  - Back buttons for easy navigation between steps
  - Removed extra text, added more white space for cleaner UI
  - HeroVisualizer with spinning rings and animated starfield background
  - Floating menu button for navigation to dashboards

- **NEW: Agent Dashboard with Card Gallery** (`/agents` or `/dashboard`):
  - Beautiful card-based view of all agents (replaces table view)
  - Each card displays avatar, name, status, voice, and DISC profile preview
  - Four environment buttons per agent card:
    - **The Vibe** (purple) - Reflect & Relax with Gemini Live voice chat
    - **The Office** (blue) - Collab on Projects with multi-agent invite
    - **The Lab** (green) - Fine Tuning personality controls
    - **The Classroom** (amber) - Learn Something New with curated lessons
  - Create New Agent card with avatar gallery selection

- **NEW: The Vibe Environment** (`/agent/:agentId/vibe`):
  - Relaxed conversation context with mood presets (Calm, Reflective, Supportive)
  - Each mood auto-adjusts DISC settings for optimal relaxation
  - Purple gradient theme for calming atmosphere
  - Chat interface for reflective conversations

- **NEW: The Office Environment** (`/agent/:agentId/office`):
  - Collaborative project workspace with blue professional theme
  - Team panel with multi-agent invite functionality
  - DISC settings tuned for productivity and collaboration
  - Future: multi-agent conversations in team chat

- **NEW: The Lab Environment** (`/agent/:agentId/lab`):
  - Full fine-tuning control panel with green technical theme
  - DISC Profile sliders (Dominance, Influence, Steadiness, Conscientiousness)
  - ARCH Communication Model sliders with bar chart visualization
  - 6-section System Identity Prompts editor
  - Save Configuration button to persist personality settings

- **NEW: The Classroom Environment** (`/agent/:agentId/classroom`):
  - Learning environment with amber/orange gradient theme
  - Tell your agent what you want to learn and get a curated lesson
  - Auto-generated presentations with slides, videos, and quizzes
  - Quick suggestion cards (AI & Machine Learning, Communication Skills, Personal Finance)
  - Teaching Style controls (Pace, Engagement, Depth, Detail)
  - Interactive quizzes with immediate feedback
  - Lesson history to revisit previous lessons

- **Gemini Live Voice Chat** in The Vibe:
  - Real-time voice conversations using Gemini 2.0 Flash Live model
  - Aoede voice for natural speech
  - ARCH Communication Window matching (mirrors your tone, timing, sentence count)
  - Click Call button to start voice session

- **NEW: Twilio Account Manager** (`/twilio-account`):
  - Four-tab interface: Credentials, Sub-Accounts, Phone Numbers, Billing
  - View account SID, status, and type
  - Create and suspend sub-accounts for multi-tenant management
  - View all provisioned phone numbers with capabilities
  - Billing dashboard with balance and usage statistics
  - API endpoints: GET /api/twilio/account, /api/twilio/subaccounts, /api/twilio/billing
  
- **Fixed: Telephony Panel Input Boxes**:
  - All inputs now use local state (no more mutation on every keystroke)
  - Added "Save Configuration" button to persist changes
  - Added "Save Owner Info" button for firewall settings
  - Inputs are now fully editable without triggering errors

- Updated Sidebar Navigation organized into 4 sections:
  - Agent Dashboard: Dashboard, DISC Assessment, Character Tool
  - Operations: Customer Manager, Telephony, Twilio Account, Twilio Hub
  - System: Server Control, Config, Orchestrator, Results, Security
  - Access Portals: Create Your Agent, Developer, Business
- Added Customer Manager page (`/customers`):
  - Lead capture form with contact info (name, email, phone, company)
  - Location tracking (city, state, country)
  - Lead source and status management (New, Contacted, Qualified, Converted, Lost)
  - Notes dialog for detailed customer notes
  - Search, inline editing, and follow-up tracking
- Added DISC Assessment page with dual-mode experience:
  - **Human Mode**: Interactive 24-question visual assessment with word ranking, progress tracking, results visualization (bar/radar charts)
  - **Agent Mode**: API documentation for Telegram/Discord bot integration
  - API endpoints: GET /api/disc/questions, POST /api/disc/calculate, POST /api/disc/calculate-simple
  - Simple format for bots: accepts array of 24 rankings like [[4,3,2,1], [1,4,3,2]...] for easy integration
  - Results include primary/secondary style, percentages, and style descriptions
- Added Gateway Global AI onboarding experience with A/B variants:
  - **The Awakening** - Mystical particle animation, agent "awakens" when named
  - **The 24-Hour Proof** - Direct challenger brand: "Every other AI talks. This one finishes."
  - Three-step flow: Name agent → Select voice (6 options) → Live test run
  - Live prompting: Emotion buttons (calm, engaged, focused, energized, empathetic) morph agent behavior in real-time
  - DISC sliders update agent personality dynamically during conversation
  - Core messaging: "Human + AI = Unstoppable" - emphasis on collaboration
- Created DiscVisualizer component with three main tabs:
  - **Behavioral Matrix Tab**: BotAvatar visualization, DISC sliders, ARCH sliders, My Beliefs Window with 7 meta-cognition topics
  - **System Identity Tab**: Protocol list sidebar, 6-section prompt editor (Owner Identity, Loyalty, Priorities, Data Protection, Security, DISC Reinforcement)
  - **View History Tab**: 30-day behavioral trend analysis with 4 full-width DISC trending cards, health monitoring (Green/Yellow/Red), automated alerts for 5%+ and 10%+ deviations, Emergency Memory Flash button to delete last 24 hours of agent memory
- Created Sidebar navigation component with NEXUSCMD branding
- Updated App.tsx with sidebar navigation and 8 panels
- Added Recharts library for DISC/ARCH visualizations
- Added owner verification fields (ownerPhone, ownerEmail) to telephony firewall section
- Updated shared/schema.ts with DISC/ARCH types and Server/TestSuite/Security types
- **NEW: Twilio Inbound Webhooks** (February 2026):
  - Inbound SMS handling at `/webhook/sms` with AI-powered responses via Gemini
  - Inbound voice calls at `/webhook/voice` with TwiML speech-to-text and AI responses
  - Voice gather continuation at `/webhook/voice/gather` for multi-turn conversations
  - Call status tracking at `/webhook/voice/status` for analytics
  - SMS conversation storage with 30-day message history (smsConversations, smsMessages tables)
  - Customer matching by phone number for personalized responses
  - Twilio signature validation middleware for security
  - XML escaping to prevent TwiML injection attacks
  - Legacy `/api/webhooks/*` routes redirect to new secure endpoints
- **NEW: Gateway Global AI Twilio Provisioning API**:
  - `GET /api/twilio/numbers/available` - Search available US numbers by area code
  - `GET /api/twilio/numbers` - List owned numbers with webhook details
  - `POST /api/twilio/numbers` - Buy a number (auto-configures webhooks to twilio.gatewayglobal.ai)
  - `PATCH /api/twilio/numbers/:phoneSid` - Update webhooks for an owned number
  - `DELETE /api/twilio/numbers/:phoneSid` - Release (delete) an owned number
  - `POST /api/telephony/configure-webhooks` - Bulk configure all numbers with webhooks
  - Client API at `client/src/lib/twilioApi.ts` for frontend integration
- Enhanced Mock Conversation page (`/conversation`):
  - BotAvatar visualizer with sentiment-based animations (calm/engaged/alert)
  - DISC sliders with real-time avatar updates
  - ARCH Communication Model sliders with horizontal bar chart
  - 6-section System Identity Prompts editor (Owner Identity, Loyalty, Priorities, Data Protection, Security, DISC Reinforcement)
  - Save Persona modal with name/description inputs
  - View Personas section with load/delete functionality
  - Mock personas: "Executive Alpha" (high dominance) and "Support Empath" (high influence)
- Enhanced Developer page (`/developer`):
  - BotAvatarVisualizer component in hero section
  - Animated sentiment states with pulsing visual effects
  - Real-time glowing borders and indicator dots
- Added VoiceVisualizer to Business page with phone icon animation; replaced technical "SIP Trunking" banner with business-friendly "Never Miss Another Call"

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **State Management**: TanStack React Query for server state, useState for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with dark slate theme and indigo/purple accent colors
- **Build Tool**: Vite with React plugin
- **Charts**: Recharts for DISC/ARCH visualizations

The frontend is organized under `client/src/` with:
- `pages/` - Route components:
  - `DiscVisualizer.tsx` - **MAIN FEATURE** - DISC Profile editor with behavioral matrix and system identity
  - `DiscAssessment.tsx` - DISC personality assessment with human (visual) and agent (API docs) modes
  - `OnboardingFlow.tsx` - Gateway Global AI onboarding with A/B variant experiences
  - `AgentManager.tsx` - Agent database management with CRUD operations
  - `CustomerManager.tsx` - Customer/lead management with notes and follow-ups
  - `TelephonyPanel.tsx` - Telephony management (provisioning, settings, firewall, diagnostics)
- `components/` - Custom components:
  - `Sidebar.tsx` - Navigation sidebar with NEXUSCMD branding
- `components/ui/` - Reusable shadcn/ui components
- `hooks/` - Custom React hooks (toast notifications, mobile detection)
- `lib/` - Utilities and query client configuration

### Navigation Structure (Sidebar)
1. **DISC Profile** - Agent personality & identity configuration (main feature)
2. **Agent Manager** - Manage AI agents with DISC profiles and voice settings
3. **Customer Manager** - Lead capture, notes, and follow-up tracking
4. **Telephony** - Phone number management
5. **Twilio Hub** - Communication logs
6. **Server Control** - Server monitoring
7. **Global Config** - Environment settings
8. **Orchestrator** - Test suite management
9. **Results & AI** - Analysis dashboard
10. **Security Audit** - Security alerts

### Backend Architecture
- **Framework**: Express 5 on Node.js with TypeScript
- **API Style**: RESTful JSON API under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration

The server is organized under `server/` with:
- `routes.ts` - API endpoint definitions
- `storage.ts` - Database access layer abstraction
- `twilio.ts` - Twilio API integration service
- `db.ts` - Database connection pool
- `vite.ts` - Development server with Vite HMR integration
- `static.ts` - Production static file serving

### Data Storage
- **Database**: PostgreSQL (via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` contains all table definitions and TypeScript interfaces
- **Migrations**: Drizzle Kit manages schema migrations

Key tables:
- `users` - Basic user authentication
- `agents` - AI agent configurations with DISC profiles and voice settings
- `customers` - Customer/lead database with contact info, location, status, and notes
- `telephony_configs` - Phone configuration, webhooks, firewall, owner verification (ownerPhone, ownerEmail)
- `call_logs` - Call history and status tracking

TypeScript Interfaces (shared/schema.ts):
- `DiscScores` - DISC profile scores (dominance, influence, steadiness, conscientiousness)
- `ArchProfile` - ARCH model scores (acknowledge, reflect, context, handoff)
- `SystemPrompt` - System identity prompts with 6 sections
- `Server`, `TestSuite`, `SecurityAlert`, `CommunicationLog` - Dashboard types

### Twilio Integration
- Credentials via TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets
- Supports phone number provisioning/release
- Webhook configuration for voice and SMS
- Call and message logging
- Caller ID name management

## External Dependencies

### Third-Party Services
- **Twilio**: Telephony provider
  - Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables
  - Provides voice calls, SMS, and phone number management

### Database
- **PostgreSQL**: Primary data store
  - Connection via `DATABASE_URL` environment variable
  - Uses connection pooling via `pg` library

### Key NPM Packages
- `recharts` - Data visualization for DISC/ARCH charts
- `twilio` - Official Twilio SDK for API interactions
- `drizzle-orm` / `drizzle-kit` - Database ORM and migration tooling
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Accessible UI primitives
- `zod` - Runtime type validation
- `express` - HTTP server framework
- `lucide-react` - Icon library
