# Gateway Global AI - Chat MVP

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)]()
[![React](https://img.shields.io/badge/React-18.3.1-blue)]()
[![Express](https://img.shields.io/badge/Express-5.0.1-green)]()

An SMS-first AI task completion platform with a comprehensive admin dashboard and AI-powered business analysis tools.

## 📋 Recent Updates

**Latest Implementation** (Feb 6, 2026): Implemented portable chat interface with three user modes (Customer, Owner, Developer). The chat system features 100vh responsive design, full integration with Google Maps/Places API, Google Workspace, Twilio telephony, and TTS voice capabilities. See [CHAT_IMPLEMENTATION_SUMMARY.md](./CHAT_IMPLEMENTATION_SUMMARY.md) for details.

**Previous Merge** (Feb 6, 2026): Successfully integrated AI chatbot functionality and Google Places API for business reviews. See [MERGE_SUMMARY.md](./MERGE_SUMMARY.md) for details.

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
├── shared/              # Shared types and utilities
├── docs/                # Documentation
├── dist/                # Build output (generated)
└── script/              # Build scripts
```

## 🔑 Key Features

### Core Platform
- **SMS-First Task Completion**: 24-hour AI task completion via SMS
- **Multi-AI Integration**: Kimi 2.5 (primary), Google Gemini (fallback)
- **Real-time Chat**: WebSocket-based live communication
- **Admin Dashboard**: Comprehensive NEXUSCMD control panel
- **Portable Chat Interface**: Embeddable chat with 3 user modes (Customer, Owner, Developer)

### AI Capabilities
- **AI Biz Bot**: Intelligent business assistant with Google Places integration
- **DISC Personality System**: Agent personalization and assessment
- **Website Builder**: GenAI business site generator
- **Voice AI**: Kimi-Audio integration for voice interactions
- **Chat Modes**: Customer support, business management, and developer tools

### Business Tools
- **Customer Management**: Lead capture and tracking
- **Telephony Management**: Twilio integration for SMS/voice
- **A2P 10-DLC Compliance**: Automated business SMS registration
- **Payment Processing**: Stripe integration
- **Owner Portal**: Settings, customer tracking, project management, AI reports

### Developer Tools
- **Google Workspace Integration**: Drive, Calendar, Tasks, Docs, Sheets
- **API Analytics**: Google Places Aggregate API analysis
- **MCP Server**: Kimi K2 for agentic coding
- **Developer Interface**: Page/app creation, agent deployment, technical management

### Chat Interface Features
- **100vh Fullscreen**: Responsive design for mobile and desktop
- **Three User Modes**: Customer (public), Owner (business), Developer (technical)
- **Embeddable**: React component or HTML/JS widget
- **Customizable**: Brand colors, bot names, greetings
- **Integrated**: Google Maps/Places, Workspace, Twilio, TTS voice

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

- [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md) - **Chat interface architectural decision and standards**
- [CHAT_IMPLEMENTATION_SUMMARY.md](./CHAT_IMPLEMENTATION_SUMMARY.md) - Portable chat interface implementation
- [STATUS.md](./STATUS.md) - Current build/test status and next steps
- [MERGE_SUMMARY.md](./MERGE_SUMMARY.md) - Recent changes and commits
- [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) - Git workflow and branch strategy
- [replit.md](./replit.md) - Detailed system architecture
- [docs/TELEPHONY_ARCHITECTURE.md](./docs/TELEPHONY_ARCHITECTURE.md) - Telephony system design

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

## 📝 Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
KIMI_API_KEY=...
GOOGLE_API_KEY=...

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Google Maps/Places
GOOGLE_MAPS_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...

# Session
SESSION_SECRET=...
```

See attached_assets for example configurations.

## 🤝 Contributing

1. Create a feature branch from `feature/ongoing-development`
2. Make your changes
3. Ensure builds pass: `npm run build`
4. Run type checking: `npm run check`
5. Commit with descriptive messages
6. Push and create a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links

- **Repository**: [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)
- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues (when available)

---

**Last Updated**: February 6, 2026  
**Version**: 1.0.0  
**Maintainer**: Gateway Global AI Team

For detailed system architecture and features, see [replit.md](./replit.md).
