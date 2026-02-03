# NEXUSCMD - Agent Command & Control Interface

## Overview

NEXUSCMD is a command and control admin interface centered on DISC Profile visualization and agent behavioral configuration. The system includes a comprehensive DISC Profile editor with behavioral matrix controls (Dominance, Influence, Steadiness, Conscientiousness), ARCH communication model (Acknowledge, Reflect, Context, Handoff), system identity prompts, and a "My Beliefs Window" for meta-cognition testing. Secondary features include telephony management with Twilio integration, server monitoring, test orchestration, and security auditing.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (February 2026)

- Added Agent Manager page (`/agents`):
  - Table view with inline editing for all agents
  - Create new agents with name, voice selection (6 voices), and status
  - DISC profile display (D/I/S/C values)
  - Status badges (Active, Paused, Inactive)
  - Search, refresh, edit, and delete functionality
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
