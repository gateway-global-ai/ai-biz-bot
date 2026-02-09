# Google Business Knowledge Base & MCP Server Integration

## Overview

This document connects the **Google Business knowledge base** with the **MCP (Model Context Protocol) server implementation** to help small business owners leverage Google's powerful business tools they may not fully understand or use.

## 🎯 Purpose

Small business owners have access to incredible Google resources but often:
- Don't know these tools exist
- Don't understand how to use them
- Don't see how they connect to their business needs

This integration makes these resources accessible through AI-powered interfaces and automated workflows.

## 📚 Knowledge Base Resources

### Documentation Files

1. **[Google Business Notes/GOOGLE_PLACES_INTEGRATION.md](./Google%20Business%20Notes/GOOGLE_PLACES_INTEGRATION.md)**
   - Comprehensive guide to Google Places API (New)
   - AI-powered business summaries using Gemini
   - 250+ million places database
   - Industry identification and pain point analysis

2. **[Google Business Notes/GOOGLE_PLACES_API_DETAILS.md](./Google%20Business%20Notes/GOOGLE_PLACES_API_DETAILS.md)**
   - Technical API details
   - Field masking optimization
   - Request/response formats
   - Place Details endpoints

### GenAI Business Site Generator

Located in `genai-business-site-generator (2)/`, this is a complete AI-powered website builder for small businesses that integrates:

- **Google Places API**: Automatic business data retrieval
- **Gemini AI**: Intelligent content generation
- **Live Voice Service**: Real-time voice interactions
- **Google Workspace Integration**: Professional email, calendar, documents

## 🔧 MCP Server Implementation

The MCP server provides programmatic access to Google Workspace tools.

### Location
`server/mcp/googleWorkspace.ts`

### Features

```typescript
export class GoogleWorkspaceService {
  // Authentication
  setCredentials(credentials: GoogleWorkspaceCredentials)
  exchangeCode(code: string): Promise<GoogleWorkspaceCredentials>
  
  // Calendar Management
  async listCalendarEvents(maxResults?: number)
  async createCalendarEvent(params: CalendarEventParams)
  
  // Task Management
  async listTasks(tasklist?: string)
  async createTask(params: TaskParams)
  
  // Document Management
  async createDocument(params: DocumentParams)
  async createSpreadsheet(params: SpreadsheetParams)
  
  // Email Management
  async sendEmail(params: EmailParams)
  async createDraft(params: DraftParams)
  
  // Business Setup
  async setupWorkspaceStructure(params: WorkspaceStructureParams)
}
```

### Related MCP Services

1. **`server/mcp/googleApiAnalyst.ts`**
   - Analyzes Google API usage
   - Optimizes API calls
   - Cost monitoring

2. **`server/mcp/placesAggregate.ts`**
   - Aggregates Google Places data
   - Business intelligence gathering
   - Industry trend analysis

3. **`server/mcp/kimiK2Server.ts`**
   - Kimi K2 AI integration
   - Agentic coding assistance

## 🔌 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Small Business Owner                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Interacts via
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GenAI Business Site Generator                   │
│  - Search for business (Google Places)                      │
│  - AI generates website content (Gemini)                    │
│  - Voice AI assistant (Live Service)                        │
│  - Admin panel with integrations                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Uses
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Google Places  │  │  Gemini AI     │  │  MCP Server   │ │
│  │  API Service   │  │   Service      │  │  (Workspace)  │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Connects to
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Services                           │
│  - Google Places API (250M+ businesses)                     │
│  - Google Gemini AI (content generation)                    │
│  - Google Workspace (email, calendar, docs)                 │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 How It Works for Small Business Owners

### Step 1: Business Discovery
**What the owner does:** Searches for their business name

**What happens behind the scenes:**
1. `PlaceSearch` component triggers Google Places API search
2. Location-aware results returned (up to 250M businesses)
3. AI identifies business type from 200+ categories
4. Business data automatically populated

**Files involved:**
- `genai-business-site-generator (2)/components/PlaceSearch.tsx`
- `server/mcp/placesAggregate.ts`

### Step 2: AI Content Generation
**What the owner sees:** Professional website content appears automatically

**What happens behind the scenes:**
1. `geminiService.ts` enriches business data with Gemini AI
2. AI generates:
   - Catchy tagline
   - Professional description
   - Business insights
   - Nearby restaurants & activities
3. Uses Google Maps tool for real nearby place discovery
4. Processes reviews with AI sentiment analysis

**Files involved:**
- `genai-business-site-generator (2)/services/geminiService.ts`
- Google Business Notes knowledge base for context

### Step 3: Voice AI Assistant
**What the owner experiences:** Voice conversations with AI about their business

**What happens behind the scenes:**
1. `LiveVoiceClient` establishes Gemini Live connection
2. Real-time audio streaming (24kHz native audio)
3. AI trained on business context:
   - Business name, address, hours
   - Description and insights
4. Handles customer inquiries verbally

**Files involved:**
- `genai-business-site-generator (2)/services/liveService.ts`
- Gemini 2.5 Flash with native audio

### Step 4: Google Workspace Integration
**What the owner wants:** Professional email (@mybusiness.com), appointments, documents

**What the integration provides:**
1. Admin panel detects request for email/calendar features
2. AI Biz Bot suggests Google Workspace integration
3. OAuth flow connects owner's Google Workspace
4. MCP server provides programmatic access:
   - Send emails from business address
   - Create calendar appointments
   - Generate documents & spreadsheets
   - Manage tasks

**Files involved:**
- `genai-business-site-generator (2)/components/AdminPanel.tsx`
- `server/mcp/googleWorkspace.ts`
- `server/routes.ts` (OAuth endpoints)

## 🎓 Educational Resources for Small Business Owners

### "What is Google Places?"
Google Places is a database of 250+ million businesses worldwide. When you search for your business:
- We find your existing Google Business Profile
- Pull in your reviews, ratings, photos
- Identify your industry automatically
- Use AI to understand what makes your business special

**Benefit:** No manual data entry - we know your business already!

### "What is Google Workspace?"
Google Workspace gives you professional business tools:
- **Gmail**: Professional email (@yourbusiness.com)
- **Calendar**: Online appointment booking
- **Docs/Sheets**: Create proposals, invoices, reports
- **Drive**: Store and share files securely
- **Meet**: Video calls with customers

**Our Integration:** We connect these tools to your website automatically. Customers can book appointments, you can send professional emails, AI can create documents for you.

### "What is Gemini AI?"
Gemini is Google's advanced AI that helps your business:
- **Write Content**: Creates taglines, descriptions, blog posts
- **Understand Reviews**: Analyzes what customers love
- **Answer Questions**: 24/7 AI assistant for your website
- **Find Opportunities**: Suggests nearby businesses to partner with

**Your Benefit:** Professional content without hiring a writer, instant customer support without hiring staff.

### "What is Voice AI?"
Voice AI lets customers talk to your website like calling your business:
- Answers questions about hours, location, services
- Understands natural conversation
- Provides information from your business profile
- Works 24/7, never takes a break

**Your Benefit:** Customers get instant answers, you capture leads even when closed.

## 💼 Business Use Cases

### Restaurant Owner
**Challenge:** Need online presence, appointment bookings, manage reviews

**Solution:**
1. Search business → AI finds Google Places profile
2. AI generates menu descriptions, location highlights
3. Voice AI answers "Are you open today? What's the special?"
4. Workspace integration: reservation calendar, email confirmations
5. Admin panel shows review sentiment, nearby competition

### Retail Shop
**Challenge:** Want to show inventory, handle customer inquiries, send newsletters

**Solution:**
1. Google Places shows photos, hours, ratings
2. AI creates product descriptions from photos
3. Workspace: inventory in Sheets, promotional emails in Gmail
4. Voice AI: "Do you have [product] in stock?"
5. Admin panel suggests nearby foot traffic opportunities

### Professional Services (Law, Accounting, etc.)
**Challenge:** Need credibility, client management, appointment scheduling

**Solution:**
1. AI generates professional bio from Google Places reviews
2. Workspace calendar for appointment booking
3. Docs integration for creating client proposals
4. Voice AI screens potential clients 24/7
5. Task management for follow-ups

## 🔑 Environment Configuration

To enable full integration, configure these environment variables:

```bash
# Google Places API
GOOGLE_MAPS_API_KEY=your_maps_key
GOOGLE_API_KEY=your_gemini_key

# Google Workspace (MCP Server)
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

# Voice AI
API_KEY=your_gemini_api_key  # For Live Service
```

## 🛠️ Technical Implementation Guide

### For Developers: Integrating MCP Server

#### 1. Initialize Google Workspace Service

```typescript
import { createGoogleWorkspaceService } from './server/mcp/googleWorkspace';

const workspaceService = createGoogleWorkspaceService({
  accessToken: 'user_oauth_token',
  refreshToken: 'user_refresh_token'
});
```

#### 2. Create Business Calendar Event

```typescript
const event = await workspaceService.createCalendarEvent({
  summary: 'Customer Appointment',
  description: 'Consultation with new client',
  startTime: '2026-02-10T10:00:00-08:00',
  endTime: '2026-02-10T11:00:00-08:00',
  attendees: ['customer@email.com']
});
```

#### 3. Send Professional Email

```typescript
await workspaceService.sendEmail({
  to: 'customer@email.com',
  subject: 'Thank you for your visit!',
  body: 'We appreciate your business...',
  from: 'owner@mybusiness.com'
});
```

#### 4. Setup Complete Workspace Structure

```typescript
await workspaceService.setupWorkspaceStructure({
  businessName: 'My Local Business',
  businessType: 'restaurant'
});

// Creates:
// - Business folder in Drive
// - Shared calendar
// - Template documents
// - Task lists
```

### For Developers: Using Places API

#### 1. Search for Business

```typescript
import { enrichBusinessData } from './services/geminiService';

// User searches via PlaceSearch component
// Google Places returns raw data
const rawPlaceData = {
  name: "Joe's Coffee Shop",
  formatted_address: "123 Main St, Seattle, WA",
  rating: 4.5,
  reviews: [...],
  types: ['cafe', 'restaurant', 'food']
};

// Enrich with AI
const enrichedData = await enrichBusinessData(rawPlaceData);
// Returns: tagline, description, insights, nearby places, etc.
```

#### 2. Create Live Voice Assistant

```typescript
import { LiveVoiceClient } from './services/liveService';

const voiceClient = new LiveVoiceClient();

voiceClient.onVolumeChange = (volume) => {
  // Update UI indicator
};

await voiceClient.connect(businessData);
// Now customers can speak to AI
```

## 📊 API Routes

### Google Workspace OAuth

```
GET  /api/google/oauth-url         - Get OAuth authorization URL
POST /api/google/callback          - Handle OAuth callback
GET  /api/google/workspace/status  - Check connection status
POST /api/google/workspace/tools   - Execute Workspace tool
POST /api/google/disconnect        - Disconnect Workspace
```

### Google Places Integration

```
POST /api/places/search            - Search for business
GET  /api/places/details/:placeId  - Get place details
POST /api/places/enrich            - Enrich with AI
```

## 🎯 Key Benefits Summary

### For Small Business Owners
1. **No Technical Knowledge Required**: AI does the technical work
2. **Professional Online Presence**: Automatically generated from existing data
3. **24/7 Customer Service**: Voice AI handles inquiries
4. **Business Tools Integration**: Email, calendar, documents all connected
5. **Data-Driven Insights**: AI analyzes reviews and competition

### For Developers
1. **MCP Server**: Programmatic access to Google Workspace
2. **Type-Safe**: Full TypeScript implementation
3. **Well-Documented**: Comprehensive knowledge base
4. **Extensible**: Easy to add new Google services
5. **OAuth Built-In**: Secure authentication flow

## 🔗 Related Documentation

- [Google Places Integration Details](./Google%20Business%20Notes/GOOGLE_PLACES_INTEGRATION.md)
- [Google Places API Technical Docs](./Google%20Business%20Notes/GOOGLE_PLACES_API_DETAILS.md)
- [Main README](./README.md)
- [Replit System Architecture](./replit.md)
- [Chat Implementation](./CHAT_IMPLEMENTATION_SUMMARY.md)

## 🚧 Next Steps

### For Product Team
1. Create video tutorials showing business owner workflows
2. Build onboarding wizard using this integration
3. Add more use case examples
4. Create business plan comparison (with/without Google Workspace)

### For Development Team
1. Add caching layer for Google Places API calls
2. Implement webhook support for Google Workspace events
3. Add bulk operations for multi-location businesses
4. Create admin dashboard for API usage monitoring

### For Small Business Owners
1. Sign up and search for your business
2. Review AI-generated content
3. Connect Google Workspace for professional tools
4. Enable voice AI for customer inquiries
5. Monitor reviews and analytics in admin panel

---

**Last Updated:** February 7, 2026  
**Maintained By:** Gateway Global AI Team  
**For Support:** See main repository README
