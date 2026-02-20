# Boardwalk Suites Lafayette - Clear Voice Partner Setup

## Overview

**Boardwalk Suites Lafayette** is the flagship partner for the Clear Voice AI ecosystem, demonstrating the "Golden Standard" for small business prioritization and management.

## Partner Profile

- **Property Name:** Boardwalk Suites Lafayette
- **Place ID:** `ChIJB4qU6oXvJIgR_2p602OaK_U`
- **Address:** 1605 N University Ave, Lafayette, LA 70506
- **Website:** boardwalksuites.com
- **Coordinates:** 30.1798, -92.0058

### Admin / Owner

- **Name:** Jason Trindade
- **Phone:** 702-540-5471
- **Email:** lafayette@boardwalksuites.com
- **Badge:** Extended Stay Expert (Programmatically enforced)

## Setup Instructions

### 1. Run Setup Script

```bash
npm run setup:boardwalk
```

This script will:
- Create customer account for Jason Trindade
- Create site configuration for Boardwalk Suites
- Set up owner business data
- Add Boardwalk Suites to `featured_partners` table (GRN DB)
- Configure preferential placement logic

### 2. Admin Login

**Authentication Method:** Phone-based OTP (Multi-Factor Authentication)

1. Navigate to admin login page (from website footer or `/admin/login`)
2. Enter phone number: `702-540-5471`
3. Receive OTP code via SMS
4. Enter code to access admin dashboard

**Admin Privileges:**
- Edit SWOT analysis (Blind Spots, Strengths)
- Manage badges (add/override AI-suggested badges)
- Edit tour coordinates and narration hooks
- Manage public amenities display
- View monthly intelligence reports

### 3. Website Generation

The website can be generated via:
- **Admin Dashboard:** "Generate Website" button
- **API Endpoint:** `POST /api/partners/generate-website` (requires admin auth)

The generated website includes:
- Business intelligence dashboard (SWOT)
- Cinematic tour integration
- Public amenities display
- AI-powered concierge chat/voice
- Admin login link in footer

## Preferential Placement Logic

Boardwalk Suites receives priority placement when users search for:

**Keywords:**
- "Lafayette"
- "Extended Stay"
- "Kitchen"
- "Suite" / "Suites"
- "Acadiana"

**Location:**
- Lafayette, LA
- Acadiana region

**Result:**
- Appears as **"Clear Voice Preferred Partner"**
- Displays **"Extended Stay Expert"** badge
- UI card with glow effect (`priority_display`)
- Bypasses standard ranking algorithm

## Technical Implementation

### Database Tables

1. **customer_accounts** - Jason Trindade's account
2. **site_configs** - Boardwalk Suites website configuration
3. **owner_business_data** - Custom description, offers, story
4. **featured_partners** (GRN DB) - Priority placement configuration

### Code Components

- **SmallBusinessInjector** (`server/tools/smallBusinessInjector.ts`)
  - Enhanced query to check `ai_trigger_conditions` for location/keyword matches
  - Prioritizes Boardwalk Suites for Lafayette searches

- **Tour Integration** (`server/geminiVoice.ts`)
  - Automatically attaches `/boardwalk_suites_tour.yaml` when `get_business_intelligence` is called for Boardwalk Suites

- **Badge Logic** (`server/tools/smallBusinessInjector.ts`)
  - Auto-detects extended-stay properties
  - Sets "Extended Stay Expert" badge for Boardwalk Suites

## Monthly Intelligence Reports

Email `lafayette@boardwalksuites.com` is whitelisted to receive:
- Monthly SWOT analysis updates
- Review sentiment trends
- Competitive positioning insights
- Action plan recommendations

## Testing

To verify setup:

```bash
# Run integration tests
npm run test:bi

# Test admin login
curl -X POST http://localhost:5000/api/customer/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "702-540-5471"}'
```

## Support

For issues or questions:
- Email: lafayette@boardwalksuites.com
- Phone: 702-540-5471
