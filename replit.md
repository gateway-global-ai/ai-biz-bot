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
    -   Voice webhook endpoints: `/webhook/voice` (legacy), `/webhook/voice/kimi` (Kimi-Audio enhanced)
    -   SMS webhook endpoint: `/webhook/sms`
    -   WebSocket endpoint for Media Streams: `/ws/voice-stream`

## CRITICAL: Twilio SMS Troubleshooting

**ALWAYS run this health check FIRST when SMS isn't working:**

### SMS Health Check Procedure
1. **Check Twilio Alerts** - Look for error codes (especially 50056)
   ```javascript
   client.monitor.alerts.list({limit: 5})
   ```

2. **Check if message came through a Messaging Service**
   ```javascript
   client.messages('SM...').fetch() // Check messagingServiceSid field
   ```

3. **If Messaging Service is involved, check ITS webhook config:**
   ```javascript
   client.messaging.v1.services('MG...').fetch()
   // Look at: inboundRequestUrl, useInboundWebhookOnNumber
   ```

4. **Test the webhook endpoint directly:**
   ```bash
   curl -X POST "https://YOUR_DOMAIN/webhook/sms" \
     -d "From=%2B1234567890&To=%2B0987654321&Body=Test"
   ```

### Common Issues
- **Error 50056**: Webhook returned non-200 status or no webhook URL configured
- **Messaging Service with empty inboundRequestUrl**: Messages have nowhere to go!
- **useInboundWebhookOnNumber: false**: Won't fall back to phone number webhook
- **Wrong webhook URL**: Check if pointing to non-existent domain

### Key Messaging Services (as of Feb 2026)
- `MGd16163508f2fcc1236a989f83664d9fb` - Customer Care A2P Messaging Service
- Webhook should point to: `https://{REPLIT_DEV_DOMAIN}/webhook/sms`

### Diagnostic Endpoints
- `GET /api/twilio/numbers` - List all phone numbers with webhook configs
- `GET /api/telephony/messages` - Recent message logs from Twilio
- `POST /api/telephony/simulate-webhook` - Test webhook locally
-   **Moonshot API (Kimi 2.5)**: Primary AI reasoning engine for text.
    -   Requires `MOONSHOT_API_KEY`.
-   **Kimi-Audio (via Replicate)**: Real-time voice AI for phone conversations.
    -   Requires `REPLICATE_API_TOKEN`.
    -   Model: `zsxkib/kimi-audio-7b-instruct` on Replicate
    -   Features: ~300ms latency, audio-to-audio, multi-turn conversations
    -   Integration files: `server/kimiAudio.ts`, `server/voiceStream.ts`, `server/voiceSession.ts`, `server/audioCodec.ts`
-   **Kimi K2 MCP Server (Coding Agent)**: 1T parameter MoE model for agentic coding tasks.
    -   **Primary**: HuggingFace endpoint with `moonshotai/Kimi-K2-Instruct:novita` (requires `HF_TOKEN`)
    -   **Fallback**: Moonshot API with `moonshot-v1-128k` (uses `MOONSHOT_API_KEY`)
    -   Recommended temperature: 0.6 for Kimi K2
    -   Features: Code analysis, bug fixing, code generation, error diagnosis, PR review
    -   Integration file: `server/mcp/kimiK2Server.ts`
    -   API Endpoints:
        - `GET /api/mcp/tools` - List available coding tools
        - `POST /api/mcp/tools/:toolName` - Execute specific tool (accepts `_hfToken`, `_temperature`, `_maxTokens`, `_modelId`)
        - `POST /api/mcp/code` - Auto-select best tool for task
    -   **SMS Coding Agent**: Customers can text coding questions to their assigned agent's number for help
        - Auto-detects: error messages, code blocks, debugging keywords
        - Uses agent-specific AI model settings (provider, temperature, tokens, HF token)
        
### Agent AI Model Configuration
Each agent can be configured with custom AI model settings in The Lab (`/agent/:id/lab`):
- **Provider**: Moonshot, HuggingFace, OpenAI, or Anthropic
- **Model**: Model-specific selection (e.g., Kimi 2.5 128K, Kimi K2 Instruct, GPT-4o, Claude 3.5 Sonnet)
- **Temperature**: 0-1.0 scale (stored as 0-100, recommended 0.60 for Kimi K2)
- **Max Tokens**: Response length limit (default 4096)
- **API Token**: User's own HuggingFace/OpenAI/Anthropic token (stored securely)

Database fields: `aiModelProvider`, `aiModelId`, `aiTemperature`, `aiMaxTokens`, `hfToken`
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