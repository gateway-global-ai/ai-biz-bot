# Boardwalk Suites Lafayette Website

## Overview
A full-featured hotel management website for Boardwalk Suites Lafayette integrated with the Cloudbeds API. Features a public booking website with rewards program (10% off), room search, group bookings, and promotional pages.

## Recent Changes (January 2026)
- **Employee and Investor User Management**: Admin Dashboard now supports two user types
  - Employees: staff members with role and department tracking
  - Investors: capital contributors with investment and loan tracking
  - Sub-tabs in Users section to switch between employee and investor management
  - Expandable investor cards showing investments and loans tables
- **Investor Investments Table**: Track capital contributions
  - Investment date, amount, and notes fields
  - Running total displayed for each investor
- **Investor Loans Table**: Track financing arrangements
  - Loan date, amount, interest rate, monthly payment, maturity date
  - Running total displayed for each investor
- **Reservations Management**: Admin Dashboard now has a dedicated Reservations tab
  - Browse all reservations from Cloudbeds with search and status filters
  - View detailed reservation info: guest info, stay details, financials
  - Configure rate overrides directly from the reservation detail page
  - Real-time status badges (confirmed, checked_in, checked_out, etc.)
- **Magic Link Email for Investors**: When adding new investor users via Admin Dashboard
  - Automatically generates secure magic link token (valid 7 days)
  - Sends welcome email via SendGrid with "Access Investor Portal" button
  - Token can only be used once (marked as used after login)
  - After first login, investors can use phone+OTP for subsequent access
  - `/api/investor/verify-magic-link` endpoint validates tokens
- **Analytics/Revenue API Fixed**: Cloudbeds `getReservations` returns summary data without room types or revenue
  - Now uses `getReservation` (singular) for each booking to get detailed data
  - Batched in groups of 10 to avoid API overload
  - Extracts `roomTypeName` from `assigned[0].roomTypeName`
  - Extracts revenue from `grandTotal` or `total` fields
  - Analytics now shows accurate room type breakdown and total revenue
- **Async Reservation Processing**: Background queue for Cloudbeds API calls
  - /api/reservations returns immediately with "Thank you" message
  - Cloudbeds postReservation API runs in background (can take 2-3 minutes)
  - reservation_requests table tracks: pending → processing → confirmed/failed
  - Automatic retry (3 attempts) with 30-second delay on failures
  - Confirmation email sent when Cloudbeds confirms the booking
  - Startup scan processes any pending reservations from server restarts
  - /api/reservations/:id/status endpoint to check booking progress
- **Reservation Creation Fixed**: postReservation endpoint now works with Cloudbeds v1.3
  - Correct parameter format: rooms array with nested roomTypeID/roomRateID/quantity
  - Adults/children as arrays of objects: adults[0][roomTypeID], adults[0][quantity]
  - Payment method set to pay_by_link for Cloudbeds email payment flow
  - Guest receives confirmation email with payment link from Cloudbeds
- **Pricing Calculation Fixed**: Cloudbeds roomRate is the TOTAL for the stay, not per-night
  - baseTotal = roomRate (already the total), baseNightlyRate = roomRate / nights
  - Discounts now apply correctly to the actual Cloudbeds rate
- **Rate Plan Selection**: Unified rate plan logic shared between display and booking endpoints
  - Uses Cloudbeds "Weekly Rates" ($315/week) and "Monthly Rates" plans when available
  - Falls back to business rule discounts only when no Cloudbeds rate plan exists
  - Rewards member discount (10%) stacks on top of any rate plan
- **Investor Portal**: Comprehensive administrative interface for management and investors
  - Dashboard with KPIs: occupancy rate, in-house guests, arrivals, departures, stayovers
  - Monthly revenue reports with charts (ADR, RevPAR, occupancy trends) - defaults to 2025 data
  - Analytics: revenue by room type, booking trends by day of week
  - Guest Services card: housekeeping status (vacant dirty, vacant clean, occupied, out of service, offline)
  - Room Manager: internal room tracking separate from Cloudbeds
    - Track offline rooms (not renovated, under construction)
    - Document room condition, photos, notes
    - Create and assign maintenance tasks to workers
  - **Secure Phone+OTP Authentication**: Investor portal now uses server-side sessions
    - Investor whitelist in database (`investor_users` table) with name, phone, email, address
    - Phone+OTP login flow via Twilio Verify (no admin keys exposed to frontend)
    - Server-side session tokens (`X-Investor-Session` header)
    - Sessions expire after 4 hours, cleaned up automatically
    - Admin Dashboard "Users" tab to manage authorized investors
    - `requireInvestorAuth` middleware accepts both admin key and investor sessions

## Recent Changes (December 2025)
- **Rate Override System**: Added ability to set custom rates per reservation
  - Database table `rate_overrides` stores per-reservation negotiated rates
  - Extension pricing uses override rate if set, otherwise Cloudbeds rate
  - Admin API endpoints to manage rate overrides (requires ADMIN_API_KEY)
- **Business Rules Engine**: Configurable rules for discounts and tax
  - `NO_TAX_AFTER_30_DAYS`: Guests staying 30+ days are tax exempt
  - `WEEKLY_DISCOUNT`: 10% off for weekly extensions
  - `MONTHLY_DISCOUNT`: 20% off for monthly extensions
  - `DEFAULT_TAX_RATE`: 12% lodging tax for stays under 30 days
  - Tax proration when stay crosses 30-day threshold
- **Guest Portal Improvements**: 
  - Phone+OTP login using Twilio Verify and Cloudbeds getGuestList
  - Shows real extension pricing from database rules
  - Supports past, present, and future guests (1-year date range)
- **Admin Endpoints**: Secured with ADMIN_API_KEY environment variable
  - Dashboard using Cloudbeds getDashboard for arrivals/departures/in-house
  - CRUD for rate overrides and business rules
- **Discount System Complete**: Implemented sequential discount stacking on Booking page
  - Rewards member discount (10%) stacks with exclusive discounts
  - Exclusive discounts (Local Resident, Military/Veteran, Senior 65+) are mutually exclusive
  - Exclusive discounts only available for nightly stays (≤6 nights)
  - Sequential calculation: exclusive 10% + rewards 10% = 19% total (not 20%)
  - Discount selections from search filters automatically carry over to booking page
- Fixed Cloudbeds API integration - now using `getAvailableRoomTypes` endpoint with `detailedRates=true`
- Room cards display real photos, prices ($69-$99/night), and availability from Cloudbeds
- Added phone verification login flow with OTP input
- Created Twilio service for SMS verification and SendGrid for emails

## Project Structure
```
client/src/
├── components/
│   ├── layout/          # Header, Footer
│   ├── hotel/           # HeroSection, RoomCard, RoomsGrid, RewardsBanner, etc.
│   ├── ui/              # Shadcn UI components
│   └── examples/        # Component examples for testing
├── pages/               # Home, Rooms, Groups, Promotion, Rewards, Amenities, Login, GuestPortal
├── hooks/               # Custom hooks (use-toast, use-mobile)
└── lib/                 # Utilities and query client

server/
├── routes.ts            # API routes including Cloudbeds proxy endpoints
├── storage.ts           # Storage interface
├── twilio.ts            # Twilio SMS verification service
└── index.ts             # Express server setup
```

## Key Features
- **Public Website**: Hero with search, rooms display, amenities, group bookings
- **Rewards Program**: 10% discount for members, tiered rewards (Bronze/Silver/Gold)
- **Cloudbeds Integration**: Real-time room types, photos, pricing, availability, reservation lookup
- **Guest Portal**: Login with confirmation# + last name, view folio, extend stay (+1 night/week/month)
- **Group Bookings**: Form for group inquiries (10+ rooms)
- **Amazon Promotion**: 1-week free stay for local Amazon employees
- **Phone Verification**: OTP login via Twilio Verify (pending secrets)

## Room Types (from Cloudbeds)
| Room Type | Price | Room Type ID |
|-----------|-------|--------------|
| King Suite Level 1 | $69/night | 629879 |
| King Suite Level 2 | $69/night | 630321 |
| Double Suite Interior | $99/night | 630599 |
| King Suite Interior | $89/night | 631047 |
| VIP King Suite | $89/night | 642569 |
| Double Suite Exterior | $99/night | 649980 |

## API Endpoints
- `GET /api/cloudbeds/hotel` - Hotel details from Cloudbeds
- `GET /api/cloudbeds/room-types` - Available room types with pricing (uses getAvailableRoomTypes)
- `GET /api/cloudbeds/availability` - Check availability for dates
- `GET /api/cloudbeds/groups` - Group booking data
- `POST /api/rewards/signup` - Rewards program signup
- `POST /api/groups/inquiry` - Group booking inquiry
- `POST /api/promotion/apply` - Promotion application
- `GET /api/auth/config` - Check if Twilio is configured
- `POST /api/auth/send-code` - Send OTP to phone
- `POST /api/auth/verify-code` - Verify OTP code
- `GET /api/auth/session` - Check guest session
- `POST /api/auth/logout` - Logout guest
- `POST /api/guest/lookup` - Find reservation by confirmation# + last name (uses Cloudbeds getReservations)
- `POST /api/guest/extension-quote` - Get pricing for stay extension
- `POST /api/guest/extend-stay` - Submit stay extension request
- `GET /api/admin/dashboard` - Cloudbeds dashboard (arrivals/departures/in-house) [requires ADMIN_API_KEY]
- `GET /api/admin/rate-overrides` - List all rate overrides [requires ADMIN_API_KEY]
- `POST /api/admin/rate-overrides` - Create/update rate override [requires ADMIN_API_KEY]
- `PUT /api/admin/rate-overrides/:id` - Update rate override [requires ADMIN_API_KEY]
- `DELETE /api/admin/rate-overrides/:id` - Delete rate override [requires ADMIN_API_KEY]
- `GET /api/admin/business-rules` - List business rules [requires ADMIN_API_KEY]
- `PUT /api/admin/business-rules/:code` - Update business rule [requires ADMIN_API_KEY]
- `GET /api/investor/dashboard` - KPIs: arrivals, departures, stayovers, occupancy [requires ADMIN_API_KEY]
- `GET /api/investor/revenue?year=YYYY` - Monthly revenue, ADR, RevPAR, occupancy [requires ADMIN_API_KEY]
- `GET /api/investor/analytics` - Revenue by room type, booking trends [requires ADMIN_API_KEY]
- `GET /api/investor/housekeeping` - Housekeeping status with offline room counts [requires ADMIN_API_KEY]
- `GET /api/rooms` - List internal rooms [requires ADMIN_API_KEY]
- `GET /api/rooms/:id` - Get room with tasks [requires ADMIN_API_KEY]
- `POST /api/rooms` - Create internal room [requires ADMIN_API_KEY]
- `PUT /api/rooms/:id` - Update room [requires ADMIN_API_KEY]
- `DELETE /api/rooms/:id` - Delete room and tasks [requires ADMIN_API_KEY]
- `GET /api/tasks` - List all tasks [requires ADMIN_API_KEY]
- `POST /api/tasks` - Create task for room [requires ADMIN_API_KEY]
- `PUT /api/tasks/:id` - Update task [requires ADMIN_API_KEY]
- `DELETE /api/tasks/:id` - Delete task [requires ADMIN_API_KEY]

## Environment Variables
### Required
- `CLOUDBEDS_API_KEY` - API key for Cloudbeds v1.3 API
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `SENDGRID_API_KEY` - SendGrid API key for emails

### Optional
- `ADMIN_API_KEY` - API key for admin endpoints (set to enable admin access)
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_VERIFY_SERVICE_SID` - Twilio Verify Service SID
- `TWILIO_MESSAGING_SERVICE_SID` - For general SMS (optional)

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS + Shadcn/ui
- Backend: Express.js
- Routing: Wouter
- Data Fetching: TanStack Query
- Database: PostgreSQL with Drizzle ORM
- SMS: Twilio Verify
- Email: SendGrid

## Design
- Modern hospitality design with Inter and Playfair Display fonts
- Blue primary color scheme with gold accents
- Mobile-responsive with fixed header/footer
- Dark mode support ready

## Cloudbeds API Notes
- Property ID: 315701
- API Base: https://api.cloudbeds.com/api/v1.3
- Use `getAvailableRoomTypes` with `detailedRates=true` for pricing
- Default search: today check-in, tomorrow check-out, 1 room, 2 adults

- **Commercial Profile Page**: Property marketing flyer page at /commercial-profile
  - Accessible via "Commercial Profile" link in footer
  - Property overview with key metrics (3.2 acres, 160 units, 90% direct booking ratio)
  - Prime location highlights (education, healthcare, employers, transportation)
  - Conversion opportunities section: Apartments and Assisted Living
  - Professional marketing layout with hero, features, and contact CTA

## Next Steps
1. Complete Twilio SMS verification once secrets are added
2. Build full reservation booking flow
3. Create staff portal (booking agent, front desk views)
4. Add SendGrid email confirmations
5. Implement group booking management
