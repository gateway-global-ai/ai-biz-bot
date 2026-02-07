# Gateway Global AI Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)]()
[![React](https://img.shields.io/badge/React-18.3.1-blue)]()
[![Express](https://img.shields.io/badge/Express-5.0.1-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

> **Removing all friction from getting online with the latest AI tools.**

The complete AI-first platform for small business owners. Generate stunning AI-powered websites with voice, chatbots, and SMS in 30 seconds. Leverage autonomous agents, Twilio telephony, and Google Workspace integration to run your business smarter.

## 🎯 MVP Focus

Gateway Global AI is the all-in-one platform for small business owners to launch and manage their AI-powered online presence. We've consolidated multiple projects into this unified platform that delivers:

- ✨ **30-Second AI Websites** - Professional sites with voice concierge and live chat
- 🤖 **AI Biz Bot** - Your digital business partner for website management and upselling
- 🎙️ **Voice AI** - Natural language customer interactions via Kimi-Audio
- 📱 **SMS Business Management** - Run your business via text with Twilio integration
- 📊 **VoiceLeadMachine** - Automated outbound campaigns and lead generation
- 💬 **Revolutionary Chat Interface** - Float, fix, or expand modes with full admin integration
- 🎯 **DISC & ARCH Controls** - Advanced agent personality customization
- 📁 **Google Workspace** - Seamless Drive, Calendar, Tasks, Docs, and Sheets integration

**For complete product vision**, see [PRODUCT_VISION.md](./PRODUCT_VISION.md) | **For GitHub strategy**, see [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md)

## 📋 Recent Updates

**Voice AI SDK** (Feb 7, 2026): Integrated comprehensive Voice AI Unified SDK with support for multiple providers (OpenAI, Gemini, KIMI, ElevenLabs, Deepgram, Inworld). Includes cost optimization tools, Twilio integration, MCP server, and extensive examples. See [Voice AI SDK Documentation](docs/VOICE_AI_SDK.md) for details.

**Repository Cleanup** (Feb 7, 2026): Updated documentation to reflect MVP focus and consolidated platform features. Created comprehensive GitHub strategy and product vision documents.

**Chat Interface** (Feb 6, 2026): Implemented portable chat interface with three user modes (Customer, Owner, Developer). Features 100vh responsive design, full Google Maps/Places API integration, Google Workspace, Twilio telephony, and TTS voice capabilities. See [CHAT_IMPLEMENTATION_SUMMARY.md](./CHAT_IMPLEMENTATION_SUMMARY.md) for details.

**AI Chatbot Integration** (Feb 6, 2026): Successfully integrated AI chatbot functionality and Google Places API for business reviews. See [MERGE_SUMMARY.md](./MERGE_SUMMARY.md) for details.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
chat-mvp-merge/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and hooks
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   └── index.ts         # Server entry point
├── sdk/                 # SDKs and libraries
│   ├── chat/            # Chat widget SDK
│   └── voice-ai/        # Voice AI Unified SDK ⭐ NEW
├── shared/              # Shared types and utilities
├── docs/                # Documentation
│   ├── VOICE_AI_SDK.md        # Voice AI SDK guide ⭐ NEW
│   └── VOICE_AI_RESEARCH.md   # Comprehensive research report ⭐ NEW
├── dist/                # Build output (generated)
└── script/              # Build scripts
```

## 🔑 Key Features

### 🚀 30-Second Website Generation
- **Instant AI Websites**: Professional business sites generated in 30 seconds
- **Voice Concierge**: Built-in AI voice assistant powered by Kimi-Audio
- **Live Chat Support**: Integrated chat interface for customer service
- **Google Maps Integration**: Automatic business details from Places API
- **Mobile Responsive**: Perfect on all devices, SEO optimized

### 🤖 AI Biz Bot - Your Digital Business Partner
- **Multi-Channel**: Works in web admin panel and via SMS
- **Website Management**: Make site changes through natural conversation
- **Intelligent Upselling**: Suggests services and upgrades to customers
- **Business Insights**: Google Places integration for market analysis
- **Google Workspace**: Direct access to Drive, Calendar, Tasks, Docs, Sheets
- **24/7 Availability**: Never miss a customer inquiry

### 🎙️ Voice AI & Telephony
- **Voice AI Unified SDK**: Multi-provider voice integration (TTS, STT, Real-time) - [See SDK docs](docs/VOICE_AI_SDK.md)
- **Cost Optimization**: Save up to 95% on TTS costs with built-in provider comparison
- **Natural Conversations**: Human-like voice interactions via Kimi-Audio (Replicate)
- **Twilio Integration**: Professional phone numbers, SMS, and voice
- **MCP Server**: Deploy and manage voice AI resources via Model Context Protocol
- **Automated Campaigns**: Outbound calling for lead generation
- **A2P 10-DLC Compliance**: Proper business SMS registration
- **SMS Workflows**: Automated text message sequences
- **Call Recording & Analytics**: Track and analyze customer conversations

### 📊 VoiceLeadMachine - Outbound Campaign Tool
- **Lead Discovery**: Find prospects via Google Maps
- **Quality Scoring**: 0-100 algorithm rates lead quality (phone, email, website, ratings)
- **Contact Enrichment**: Robots.txt compliant email scraping
- **Auto-Dialer**: Automated voice campaigns via Twilio
- **Website Generation**: Create free AI sites for prospects automatically
- **Smart Follow-up**: SMS with website links when prospects press 1

### 💬 Revolutionary Chat Interface
- **Three Display Modes**: Float (bottom-right widget), Fix (sidebar), Expand (full window)
- **Multi-User Types**: Customer, Owner, and Developer interfaces
- **Embeddable**: Add to any website with simple code snippet
- **Context Aware**: Understands business data and user needs
- **Voice Enabled**: Seamless switch between text and voice
- **100vh Responsive**: Perfect mobile and desktop experience

### 🎯 Advanced Agent Controls
- **DISC Personality System**: Customize agent behavior (Dominant, Influential, Steady, Compliant)
- **ARCH Communication Model**: Fine-tune response styles
- **Multi-Agent Support**: Different personalities for different tasks
- **System Identity Prompts**: 6-section customization per agent
- **Behavioral Guardrails**: Prevents fabricated data and exaggerated claims
- **Agent Testing System**: Built-in validation tools

### 📁 Google Workspace Integration
- **Google Drive**: File browser, upload, folder management
- **Google Calendar**: Event listing, creation, deletion with all-day event support
- **Google Tasks**: Task listing, creation, completion toggle, deletion
- **Google Docs & Sheets**: Document creation and management
- **Unified Access**: All workspace tools in admin dashboard

### 🛠️ Business Management Tools
- **Customer Relationship Management**: Lead capture, tracking, and notes
- **Admin Dashboard**: Comprehensive NEXUSCMD control panel
- **Payment Processing**: Stripe integration for subscriptions and payments
- **Analytics & Reports**: Business insights and performance metrics
- **Real-time Communication**: WebSocket-based live updates

## 🛠️ Tech Stack

### Frontend
- React 18.3 + TypeScript
- Vite 7.3 (build tool)
- TanStack Query (data fetching)
- Tailwind CSS + shadcn/ui (styling)
- Wouter (routing)

### Backend
- Express 5 + TypeScript
- Drizzle ORM + PostgreSQL
- Passport.js (authentication)
- WebSocket (real-time communication)

### AI & External Services
- Kimi 2.5 (Moonshot API)
- Google Gemini
- Twilio (SMS/Voice)
- Google Maps Platform
- Replicate (Kimi-Audio, Flux)
- Stripe (payments)

## 📚 Documentation

### Strategic Planning
- [PRODUCT_VISION.md](./PRODUCT_VISION.md) - **Complete product vision and MVP focus**
- [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md) - **Repository organization and SDK roadmap**
- [STATUS.md](./STATUS.md) - Current build/test status and next steps
- [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) - Git workflow and branch strategy

### Core Documentation
- [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md) - **Chat interface architectural decisions and standards**
- [CHAT_IMPLEMENTATION_SUMMARY.md](./CHAT_IMPLEMENTATION_SUMMARY.md) - Portable chat interface implementation
- [replit.md](./replit.md) - Detailed system architecture and features
- [docs/TELEPHONY_ARCHITECTURE.md](./docs/TELEPHONY_ARCHITECTURE.md) - Telephony system design

### Google Business Integration
- [GOOGLE_PLACES_TUTORIAL.md](./GOOGLE_PLACES_TUTORIAL.md) - **Step-by-step tutorial for developers (30-45 min)**
- [DEVELOPER_QUICKSTART.md](./DEVELOPER_QUICKSTART.md) - **5-minute developer quick start with API examples**
- [GOOGLE_BUSINESS_QUICKSTART.md](./GOOGLE_BUSINESS_QUICKSTART.md) - **Quick start for small business owners**
- [GOOGLE_BUSINESS_MCP_INTEGRATION.md](./GOOGLE_BUSINESS_MCP_INTEGRATION.md) - **Complete integration guide linking knowledge base with MCP server**
- [Google Business Notes/GOOGLE_PLACES_INTEGRATION.md](./Google%20Business%20Notes/GOOGLE_PLACES_INTEGRATION.md) - Google Places API integration details
- [Google Business Notes/GOOGLE_PLACES_API_DETAILS.md](./Google%20Business%20Notes/GOOGLE_PLACES_API_DETAILS.md) - Technical API documentation

### Development Documentation
- [MERGE_SUMMARY.md](./MERGE_SUMMARY.md) - Recent changes and commits
- [SDK_IMPROVEMENTS.md](./SDK_IMPROVEMENTS.md) - SDK development notes
- [AGENT_SYSTEM.md](./docs/AGENT_SYSTEM.md) - Agent architecture
- [GOOGLE_WORKSPACE_INTEGRATION.md](./docs/GOOGLE_WORKSPACE_INTEGRATION.md) - Workspace integration details
- [VOICE_AI_SDK.md](./docs/VOICE_AI_SDK.md) - **Voice AI Unified SDK guide** ⭐ NEW
- [VOICE_AI_RESEARCH.md](./docs/VOICE_AI_RESEARCH.md) - **Comprehensive voice AI provider research** ⭐ NEW

## 🌿 Branch Strategy

### Main Branches
- `copilot/merge-recent-commits` - Integration branch (current)
- `feature/ongoing-development` - Active development branch

### Creating a New Feature
```bash
git checkout feature/ongoing-development
git checkout -b feature/your-feature-name
# Make changes, commit, and push
```

See [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) for detailed workflow.

## 🧪 Testing & Quality

### Run Type Checking
```bash
npm run check
```

### Build Verification
```bash
npm run build
```

**Note**: Currently no test framework is configured. This is a recommended next step.

## 🔒 Security

Current status: 1 moderate severity vulnerability in transitive dependency (lodash via recharts).
See [STATUS.md](./STATUS.md) for details.

Run security audit:
```bash
npm audit
```

## 🐛 Known Issues

### TypeScript Errors (Non-blocking)
- `client/src/pages/BillingPage.tsx` - Fetch argument types
- `client/src/pages/TelephonyManager.tsx` - Fetch argument types
- `client/src/pages/BusinessPage.tsx` - Iterator configuration
- `server/routes.ts` - Type safety improvements needed

### Performance
- Large bundle size (2.5 MB client bundle)
- Some image assets >7 MB
- Code splitting recommended

See [STATUS.md](./STATUS.md) for complete list and recommendations.

## 🤝 Contributing

We welcome contributions from the community! As we prepare for our MVP launch, we're establishing clear contribution guidelines.

### Getting Started
1. Fork the repository
2. Create a feature branch from `feature/ongoing-development`
3. Make your changes
4. Ensure builds pass: `npm run build`
5. Run type checking: `npm run check`
6. Commit with descriptive messages
7. Push and create a pull request

### Development Workflow
See [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) for detailed Git workflow.

### Code Standards
- TypeScript for all new code
- Follow existing code style
- Add JSDoc comments for public APIs
- Update documentation for feature changes

### Reporting Issues
- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Provide context and use cases for feature requests

### SDK Development
We're planning to release SDKs in Q2 2026. See [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md) for our SDK roadmap.

## 📝 Environment Variables

Required environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
KIMI_API_KEY=...              # Moonshot AI (Kimi 2.5)
GOOGLE_API_KEY=...            # Google Gemini
REPLICATE_API_TOKEN=...       # Kimi-Audio, Flux

# Twilio (Telephony)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Google Cloud Platform
GOOGLE_MAPS_API_KEY=...       # Maps JavaScript API
GOOGLE_CLOUD_PROJECT_ID=...   # For Places API, etc.

# Google Workspace (OAuth2)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Stripe (Payments)
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...

# Application
SESSION_SECRET=...
NODE_ENV=development|production
PORT=5000
```

See `attached_assets` directory for example configurations.

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links & Resources

- **Repository**: [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)
- **Organization**: [Gateway Global AI on GitHub](https://github.com/gateway-global-ai)
- **Product Vision**: [PRODUCT_VISION.md](./PRODUCT_VISION.md)
- **GitHub Strategy**: [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md)
- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues

### Related Repositories
- [twilio-telephony-voice-ai](https://github.com/gateway-global-ai/twilio-telephony-voice-ai) - Twilio integration (pending merge)
- [identity-verification-mcp](https://github.com/gateway-global-ai/identity-verification-mcp-gateway-gobal-ai) - Authentication MCP (pending integration)
  <!-- Note: Actual repo name has typo "gobal" -->
- [.github](https://github.com/gateway-global-ai/.github) - Organization profile

### Deprecated Repositories
See [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md) for list of archived repositories and migration paths.

**Archival Resources**:
- [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md) - Standardized deprecation notices
- [HOW_TO_APPLY_DEPRECATIONS.md](./HOW_TO_APPLY_DEPRECATIONS.md) - Step-by-step guide to apply templates

---

**Last Updated**: February 7, 2026  
**Version**: 1.0.0-MVP  
**Maintainer**: Gateway Global AI Team

For detailed system architecture and features, see [replit.md](./replit.md) and [PRODUCT_VISION.md](./PRODUCT_VISION.md).
