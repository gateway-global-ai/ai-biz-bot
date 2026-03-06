# Boardwalk-Rewards Extract — Analysis

First run of the [Industry Package Playbook](../INDUSTRY_PACKAGE_PLAYBOOK.md). This document captures stack, integration points, and mapping to the Gateway Global codebase.

## Stack

- **Runtime**: Node + Replit (Replit plugins in client: cartographer, dev-banner, runtime-error-modal).
- **Frontend**: React 18, Vite 5, wouter (routing), TanStack Query, Tailwind, Radix UI, framer-motion, shadcn-style components.
- **Backend**: Express, Drizzle ORM, pg, express-session, passport (local + OpenID), Twilio, SendGrid, OpenAI, ws.
- **Voice**: Replit audio integrations in `client/replit_integrations/audio/` (worklet, recorder, stream). No Gemini Live in this codebase; voice was likely Replit or external.

## What the project had

- **Pages**: Home, Rooms, Booking (with roomId), Groups, Promotion, Rewards, Amenities, Login, GuestPortal, AdminDashboard, InvestorPortal, CommercialProfile.
- **Hotel UI**: HeroSection, RoomCard, RoomsGrid, SearchFilters, AmenitiesSection, GroupBookingSection, PromotionSection, RewardsBanner, RewardsPage.
- **Attached assets**: Cloudbeds-related pastes (propertyID 315701, Marketplace API option), website plan pastes, screenshots, generated images (room types, exterior, pool, etc.).
- **Skills** (in `.local/skills/`): agent-inbox, code_review, database, delegation, deployment, diagnostics, environment-secrets, fetch-deployment-logs, fullstack-js, integrations, media-generation, package-management, repl_setup, replit-docs, skill-authoring, web-search, workflows.

## What worked vs what failed

- **Worked**: Full hotel marketing site (rooms, booking entry, groups, rewards, amenities). Cloudbeds property ID 315701 and API responses referenced in assets. Design guidelines and Replit-based dev flow.
- **Failed / not 100%**: Voice AI “wasn’t 100% working properly” (per stakeholder). Likely gaps: Replit voice vs production Gemini Live, no single source of truth for system prompts, or booking/availability not wired end-to-end to Cloudbeds.

## Map to our stack

| Boardwalk-Rewards | Gateway Global |
|-------------------|----------------|
| Replit audio / voice | `server/geminiVoice.ts`, `/ws/gemini-live`, client LiveVoiceClient |
| Booking page, room cards | `WebsitePreview` + new **HotelBookingBlock** below hero; `HotelInventoryGrid` for voice tool UI |
| Cloudbeds (property 315701) | `docs/knowledge-base/cloudbeds/`, new `server/routes/cloudbedsRoutes.ts` or site-scoped availability API |
| Rooms, availability | `get_hotel_inventory` (GRN) + optional `get_cloudbeds_availability`; `GET /api/site-configs/:id/hotel-availability` |
| Hotel concierge / team | `hospitality_travel` in `seed-industry-templates.ts`; `provisionAgentsForBusiness`; `knowledgeLibrary.agents` |
| Skills (reference) | `.cursor/skills/`; convert useful patterns to Cursor skills or docs, do not merge Replit state |

## Artifacts to reuse

- **UI patterns**: Room cards, search filters, rewards banner → inform `HotelBookingBlock` and Sovereign styling.
- **Cloudbeds**: Use `docs/knowledge-base/cloudbeds/` (OpenAPI, booking flow, auth) as single source of truth; implement availability/booking in our server.
- **No merge**: Do not merge `.git`, `.local/state`, or binary state into the main repo. This extract is for analysis and reference only.
