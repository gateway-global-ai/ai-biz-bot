# Telephony Management System

## Overview

A full-stack web application for managing Twilio telephony services. The system provides a dashboard interface for provisioning phone numbers, configuring webhooks, managing caller ID settings, implementing firewall rules for allowed numbers, and viewing call history/diagnostics. Built with React frontend and Express backend, integrated with Twilio via Replit's Twilio Connector.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (supports light/dark modes)
- **Build Tool**: Vite with React plugin

The frontend is organized under `client/src/` with:
- `pages/` - Route components (TelephonyPanel is the main dashboard)
- `components/ui/` - Reusable shadcn/ui components
- `hooks/` - Custom React hooks (toast notifications, mobile detection)
- `lib/` - Utilities and query client configuration

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
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit manages schema migrations in `migrations/` directory

Key tables:
- `users` - Basic user authentication
- `telephony_configs` - Phone number configuration, webhook URLs, firewall settings
- `call_logs` - Call history and status tracking

### Twilio Integration
The system integrates with Twilio through Replit's Twilio Connector:
- Credentials fetched dynamically from Replit's connector API
- Supports phone number provisioning/release
- Webhook configuration for voice and SMS
- Call and message logging
- Caller ID name management

## External Dependencies

### Third-Party Services
- **Twilio**: Telephony provider accessed via Replit Twilio Connector
  - Requires `REPLIT_CONNECTORS_HOSTNAME` and `REPL_IDENTITY` environment variables
  - Provides voice calls, SMS, and phone number management

### Database
- **PostgreSQL**: Primary data store
  - Connection via `DATABASE_URL` environment variable
  - Uses connection pooling via `pg` library

### Key NPM Packages
- `twilio` - Official Twilio SDK for API interactions
- `drizzle-orm` / `drizzle-kit` - Database ORM and migration tooling
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Accessible UI primitives
- `zod` - Runtime type validation
- `express` - HTTP server framework