# Gateway Global AI - SMS-First AI Task Completion Platform

## Overview

Gateway Global AI is an SMS-first AI task completion platform designed to complete user tasks within 24 hours using AI, delivered via SMS updates. It aims to provide an app-free experience, focusing on simplicity and efficiency. The platform utilizes Kimi 2.5 for AI reasoning, Twilio for communication, and includes an administrative backend (NEXUSCMD) for configuration and management. The core vision is to establish a leading AI task completion service that is accessible and reliable.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a clean, modern design with a purple gradient theme and animated backgrounds. Key UI elements include:
- A simple MVP landing page for task submission with personality selection and agent naming.
- A carousel-style onboarding flow with smooth animations and progress indicators.
- A card-based Agent Dashboard for managing AI agents, replacing traditional table views.
- Dedicated environment views (The Vibe, The Office, The Lab, The Classroom) with distinct color themes and functionalities tailored for different interaction styles (e.g., relaxation, collaboration, fine-tuning, learning).
- Interactive visualizers for DISC profiles and ARCH communication models.

### Technical Implementations
- **Frontend**: Built with React 18+ and TypeScript, utilizing shadcn/ui (Radix UI) for components, Tailwind CSS for styling, and Vite for build processes. TanStack React Query manages server state.
- **Backend**: Developed with Express 5 on Node.js and TypeScript, exposing a RESTful JSON API.
- **AI Engine Integration**: Primary AI engine is Kimi 2.5 (via Moonshot API), offering 256K context and native tool calling. It supports Partial Mode for JSON extraction. Gemini serves as a fallback. `server/kimi.ts` provides an OpenAI-compatible SDK wrapper.
- **24-Hour SMS Automation**: A background task scheduler manages a 4-step SMS update sequence (Start, Progress, Midpoint, Complete) for user tasks, generating personalized messages via Kimi.
- **Telephony Integration**: Twilio manages SMS and voice interactions, including inbound webhooks for AI-powered responses and a provisioning API for phone numbers.
- **Database**: PostgreSQL is used as the primary data store, with Drizzle ORM and Drizzle Kit for schema management and migrations.
- **Data Model**: Key entities include `users`, `agents` (with DISC profiles), `customers`, `telephony_configs`, and `call_logs`. Shared TypeScript schemas define data structures.

### Feature Specifications
- **Task Submission**: Users submit tasks via a landing page, select an agent personality (Achiever, Collaborator, Supporter, Analyst), and provide a phone number for SMS updates.
- **Agent Personalization**: Comprehensive DISC profile and ARCH communication model sliders allow for fine-tuning agent personalities, supported by a 6-section System Identity Prompts editor.
- **Interactive Environments**:
    - **The Vibe**: Relaxed conversation with mood presets and Gemini Live voice chat.
    - **The Office**: Collaborative workspace with multi-agent invite capabilities.
    - **The Lab**: Detailed fine-tuning control panel for agent personality.
    - **The Classroom**: AI-generated lessons, presentations, and quizzes with customizable teaching styles.
- **Twilio Account Management**: An interface to manage Twilio credentials, sub-accounts, phone numbers, and billing.
- **Customer Relationship Management**: A Customer Manager page for lead capture, status tracking, and notes.
- **DISC Assessment**: An interactive 24-question assessment for users, with an API for bot integration.
- **Onboarding Experience**: A/B tested onboarding flows, including "The Awakening" and "The 24-Hour Proof," with dynamic agent behavior based on user input.

## External Dependencies

### Third-Party Services
-   **Twilio**: Telephony provider for SMS, voice calls, and phone number management.
    -   Requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
-   **Moonshot API (Kimi 2.5)**: Primary AI reasoning engine.
    -   Requires `MOONSHOT_API_KEY`.
-   **Google Gemini**: Fallback AI engine and powers Gemini Live voice chat.

### Database
-   **PostgreSQL**: Relational database for all persistent data storage.
    -   Connection string provided via `DATABASE_URL`.

### Key NPM Packages
-   `recharts`: For data visualization (DISC/ARCH charts).
-   `twilio`: Official SDK for Twilio API interactions.
-   `drizzle-orm`, `drizzle-kit`: ORM and migration tools for PostgreSQL.
-   `@tanstack/react-query`: For server state management in the frontend.
-   `@radix-ui/*`: Accessible UI primitives.
-   `zod`: Runtime type validation.
-   `express`: Backend web framework.
-   `lucide-react`: Icon library.