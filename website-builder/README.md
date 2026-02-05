# GenAI Business Site Generator

AI-powered website generator that creates professional business websites from Google Maps data.

## Overview

This template creates instant, professional websites for businesses by:
1. Looking up a business on Google Maps
2. Extracting real business data (hours, reviews, photos, location)
3. Using Gemini AI to generate taglines, descriptions, and insights
4. Creating a complete website with AI voice concierge and chat support
5. Admin panel for business owner to customize content

## Features

- **Auto-Generated Content**: AI writes taglines, descriptions, and business insights
- **Real Data**: Hours, reviews, photos pulled from Google Maps
- **Voice Concierge**: Real-time AI voice assistant for customers
- **Chat Widget**: AI chat support embedded in the website
- **Admin Panel**: Business owner can toggle fields, filter reviews, adjust settings
- **AI Biz Bot**: Upsell assistant for integrations (Google Workspace, etc.)
- **Nearby Places**: Auto-generates "neighborhood guide" with restaurants and activities

## API Configuration

### Google Maps API Key (Required)
The server must inject the Google Maps key into the window object:

```html
<script>
  window.__GOOGLE_MAPS_KEY__ = 'your-google-maps-api-key';
</script>
```

### Gemini AI Integration (Two Options)

**Option 1: Backend Proxy (Recommended for Production)**
Keep your Gemini API key secure on the server and set the backend URL:

```html
<script>
  window.__BACKEND_API_URL__ = 'https://your-backend.com';
</script>
```

The backend should expose `/api/gemini/enrich-business` and `/api/gemini/chat` endpoints.

**Option 2: Direct Client Calls (Development Only)**
For local development, you can inject the Gemini key directly (NOT recommended for production):

```html
<script>
  window.__GEMINI_API_KEY__ = 'your-gemini-api-key';
</script>
```

⚠️ **Security Warning**: Option 2 exposes your API key to the browser. Only use for development.

## Integration with Gateway Global AI

This template is deployed as a white-label product through Gateway Global AI:

1. **Task Flow**: Customer requests a website via SMS
2. **Business Lookup**: Agent uses Google Maps to find customer's business
3. **Site Generation**: Template is instantiated with customer's business data
4. **Customization**: AI Biz Bot assists with additional integrations
5. **Deployment**: Site is deployed to customer's subdomain

## Upsell Opportunities

The AI Biz Bot can suggest these integrations:
- **Google Workspace** ($99): Professional email, calendar, Drive
- **Square/Shopify** (Custom): E-commerce integration
- **Reservation Systems** (Custom): OpenTable, Resy integration
- **CRM Integration** (Custom): Salesforce, HubSpot connection

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Update `index.html` with your API keys (for development only):
   ```html
   <script>
     window.__GOOGLE_MAPS_KEY__ = 'your-google-maps-key';
     window.__GEMINI_API_KEY__ = 'your-gemini-api-key'; // Dev only!
   </script>
   ```
3. Run the app: `npm run dev`

**For production**, configure `window.__BACKEND_API_URL__` instead of exposing the Gemini key.

## File Structure

```
website-builder/
├── App.tsx              # Main app component
├── types.ts             # TypeScript interfaces
├── components/
│   ├── PlaceSearch.tsx  # Google Places autocomplete
│   ├── HeroSection.tsx  # Hero with photos
│   ├── InfoGrid.tsx     # Hours, reviews, contact
│   ├── BlogSection.tsx  # Nearby places guide
│   ├── ChatWidget.tsx   # AI chat interface
│   ├── VoiceIndicator.tsx # Voice call UI
│   └── AdminPanel.tsx   # Business owner admin
├── services/
│   ├── geminiService.ts # Gemini AI integration
│   └── liveService.ts   # Voice AI service
└── index.html           # Entry point
```

## Future Enhancements

- [ ] Server-side Google Maps Grounding Lite (no client-side API keys)
- [ ] Database persistence for generated sites
- [ ] Multi-tenant customer accounts
- [ ] Template customization themes
- [ ] Analytics dashboard
- [ ] SEO optimization tools
