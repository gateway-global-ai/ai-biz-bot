# Developer Quick Start - Google Places & MCP Integration

## 🎯 Overview

This guide helps developers quickly integrate Google Places data and MCP server capabilities into applications for business owners.

## 🚀 5-Minute Setup

### 1. Environment Configuration

Add these to your `.env` file:

```bash
# Google Places & Maps
GOOGLE_CLOUD_API_KEY=your_api_key_here
GOOGLE_MAPS_API_KEY=your_maps_api_key_here

# Google Workspace (OAuth)
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback

# Optional: For AI content generation
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 2. Install Dependencies

```bash
npm install
npm run db:push  # Setup database
```

### 3. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:5000`

## 📡 API Endpoints Reference

### Google Places Search

#### Search for Businesses
```bash
POST /api/places/search
Content-Type: application/json

{
  "query": "coffee shop seattle",
  "location": { "latitude": 47.6062, "longitude": -122.3321 },
  "radius": 5000
}
```

**Response:**
```json
{
  "places": [
    {
      "placeId": "ChIJ...",
      "name": "Best Coffee Shop",
      "address": "123 Main St, Seattle, WA",
      "location": { "latitude": 47.6062, "longitude": -122.3321 },
      "rating": 4.5,
      "userRatingCount": 245,
      "types": ["cafe", "restaurant"],
      "primaryType": "cafe"
    }
  ],
  "count": 1
}
```

#### Get Business Details
```bash
GET /api/places/details/:placeId
```

**Response includes:** reviews, ratings, hours, photos, amenities, contact info

#### Owner Competitive Report
```bash
POST /api/places/owner-report
Content-Type: application/json

{
  "businessName": "Joe's Coffee Shop",
  "radiusMiles": 3
}
```

**Response:**
```json
{
  "report": {
    "businessName": "Joe's Coffee Shop",
    "category": "cafe",
    "location": { "latitude": 47.6062, "longitude": -122.3321 },
    "radiusMiles": 3,
    "competitors": {
      "total": 12,
      "highRated": 5,
      "lowRated": 2
    }
  },
  "formatted": {
    "sms": "Joe's Coffee Shop\nGoogle category: cafe...",
    "chat": "**Area Report: Joe's Coffee Shop**..."
  }
}
```

#### Marketing Research
```bash
POST /api/places/marketing-search
Content-Type: application/json

{
  "address": "Seattle, WA",
  "category": "restaurant",
  "radiusMiles": 5,
  "minRating": 4.0,
  "maxRating": 5.0
}
```

### Google Workspace Integration

#### Get OAuth URL
```bash
GET /api/google/auth-url?businessId=123
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### Check Connection Status
```bash
GET /api/google/connection/:businessId
```

#### Execute Workspace Tool
```bash
POST /api/google/execute-tool
Content-Type: application/json

{
  "businessId": "123",
  "tool": "createCalendarEvent",
  "args": {
    "summary": "Customer Meeting",
    "startTime": "2026-02-10T10:00:00-08:00",
    "endTime": "2026-02-10T11:00:00-08:00",
    "attendees": ["customer@email.com"]
  }
}
```

**Available Tools:**
- `createCalendarEvent`, `listCalendarEvents`, `updateCalendarEvent`, `deleteCalendarEvent`
- `createTask`, `listTasks`, `updateTask`, `deleteTask`
- `sendEmail`, `createDraft`, `listEmails`
- `createDocument`, `createSpreadsheet`
- `listDrives`, `listDriveFiles`, `createDriveFolder`, `uploadDriveFile`, `deleteDriveFile`
- `createWorkspaceStructure` - Sets up complete business workspace

## 💻 Code Examples

### Example 1: Search for a Business

```typescript
async function searchBusiness(query: string) {
  const response = await fetch('/api/places/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  return data.places;
}

// Usage
const places = await searchBusiness('pizza near me');
console.log(`Found ${places.length} pizza places`);
```

### Example 2: Get Competitive Analysis

```typescript
async function getCompetitiveReport(businessName: string) {
  const response = await fetch('/api/places/owner-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      businessName,
      radiusMiles: 3 
    })
  });
  
  const { report, formatted } = await response.json();
  
  console.log(`${report.competitors.total} competitors found`);
  console.log(`${report.competitors.highRated} are highly rated (4-5 stars)`);
  
  return report;
}

// Usage
const report = await getCompetitiveReport('My Restaurant');
```

### Example 3: Create Calendar Event (with Google Workspace)

```typescript
async function scheduleAppointment(businessId: string, customerEmail: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  
  const endTime = new Date(tomorrow);
  endTime.setHours(15, 0, 0, 0);
  
  const response = await fetch('/api/google/execute-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      tool: 'createCalendarEvent',
      args: {
        summary: 'Customer Consultation',
        description: 'Initial consultation meeting',
        startTime: tomorrow.toISOString(),
        endTime: endTime.toISOString(),
        attendees: [customerEmail]
      }
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Meeting scheduled:', result.data.htmlLink);
  }
  
  return result;
}

// Usage
await scheduleAppointment('biz-123', 'customer@example.com');
```

### Example 4: Send Professional Email

```typescript
async function sendWelcomeEmail(businessId: string, customerEmail: string) {
  const response = await fetch('/api/google/execute-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      tool: 'sendEmail',
      args: {
        to: customerEmail,
        subject: 'Thank you for your visit!',
        body: `Dear Customer,\n\nThank you for choosing our business...`,
        from: 'owner@mybusiness.com'
      }
    })
  });
  
  return await response.json();
}
```

### Example 5: Setup Complete Business Workspace

```typescript
async function setupNewBusiness(businessId: string, name: string, type: string) {
  const response = await fetch('/api/google/execute-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      tool: 'createWorkspaceStructure',
      args: {
        businessName: name,
        businessType: type
      }
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Created folders:', result.data.folders);
    console.log('Created spreadsheets:', result.data.sheets);
    console.log('Created tasks:', result.data.tasks);
  }
  
  return result;
}

// Usage
await setupNewBusiness('biz-123', 'Acme Corp', 'restaurant');
```

## 🔧 Using MCP Services Directly

For advanced use cases, you can import MCP services directly:

```typescript
import { createGoogleWorkspaceService } from './server/mcp/googleWorkspace';
import { generateOwnerReport, lookupPlaceByName } from './server/mcp/placesAggregate';

// Initialize workspace service
const workspaceService = createGoogleWorkspaceService({
  accessToken: 'user_oauth_token',
  refreshToken: 'user_refresh_token'
});

// Create calendar event
await workspaceService.createCalendarEvent({
  summary: 'Team Meeting',
  startTime: '2026-02-10T14:00:00-08:00',
  endTime: '2026-02-10T15:00:00-08:00'
});

// Find business and generate report
const place = await lookupPlaceByName('Coffee Shop Downtown');
const report = await generateOwnerReport({
  mode: 'owner',
  businessName: 'Coffee Shop Downtown',
  radiusMiles: 3
});
```

## 🎨 Frontend Integration

### React Component Example

```tsx
import { useState } from 'react';

function BusinessSearch() {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchPlaces = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setPlaces(data.places);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for your business..."
      />
      <button onClick={searchPlaces} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      
      <div>
        {places.map((place) => (
          <div key={place.placeId}>
            <h3>{place.name}</h3>
            <p>{place.address}</p>
            <p>⭐ {place.rating} ({place.userRatingCount} reviews)</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 📚 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  - BusinessSearch Component                         │
│  - AdminPanel Component                             │
│  - WorkspaceIntegration Component                   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────┐
│              Express Server (routes.ts)             │
│  - /api/places/*      (Search, Details, Reports)    │
│  - /api/google/*      (Workspace OAuth & Tools)     │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌─────────────────────┐
│  MCP Services    │      │  Google APIs        │
│  ├ googleWorkspace│      │  ├ Places API       │
│  ├ placesAggregate│      │  ├ Maps API         │
│  └ googleApiAnalyst│      │  └ Workspace APIs   │
└──────────────────┘      └─────────────────────┘
```

## 🔐 Security Best Practices

1. **Never commit API keys** - Use `.env` files (gitignored)
2. **Validate OAuth state** - Prevent CSRF attacks
3. **Sanitize user input** - Especially in search queries
4. **Rate limit API calls** - Prevent abuse and control costs
5. **Store credentials securely** - Use encryption for tokens

## 📊 Rate Limits & Costs

### Google Places API
- **Text Search**: $32 per 1,000 requests
- **Place Details**: $17 per 1,000 requests (Basic), $32 (Advanced)
- **Tip**: Use field masking to reduce costs

### Google Workspace API
- Free for personal use
- Workspace subscription required for business features
- No API charges beyond Workspace subscription

## 🧪 Testing

### Manual Testing with cURL

```bash
# Search for businesses
curl -X POST http://localhost:5000/api/places/search \
  -H "Content-Type: application/json" \
  -d '{"query":"coffee shop"}'

# Get owner report
curl -X POST http://localhost:5000/api/places/owner-report \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Starbucks","radiusMiles":5}'

# Check Google connection
curl http://localhost:5000/api/google/connection/test-business-id
```

## 🐛 Troubleshooting

### "Google API key not configured"
**Solution:** Add `GOOGLE_CLOUD_API_KEY` to `.env` file

### "OAuth callback failed"
**Solution:** 
1. Check `GOOGLE_REDIRECT_URI` matches OAuth console
2. Ensure it's an allowed redirect URI in Google Cloud Console
3. Verify client ID and secret are correct

### "Place not found"
**Solution:**
1. Try more specific search (include city/state)
2. Check business exists on Google Maps
3. Verify API key has Places API enabled

### "Rate limit exceeded"
**Solution:**
1. Implement caching for repeated queries
2. Check your Google Cloud Console quota
3. Add rate limiting middleware

## 📖 Additional Resources

- [Main README](./README.md)
- [Google Business MCP Integration Guide](./GOOGLE_BUSINESS_MCP_INTEGRATION.md)
- [Business Owner Quick Start](./GOOGLE_BUSINESS_QUICKSTART.md)
- [Google Places API Documentation](./Google%20Business%20Notes/GOOGLE_PLACES_INTEGRATION.md)
- [System Architecture](./replit.md)

## 🎯 Next Steps

1. ✅ Complete this quick start
2. 📝 Read the [MCP Integration Guide](./GOOGLE_BUSINESS_MCP_INTEGRATION.md)
3. 🚀 Build your first integration
4. 🧪 Test with real business data
5. 📊 Monitor API usage and costs
6. 🎨 Create custom UI components
7. 🔧 Extend with additional Google services

---

**Questions?** Check the [troubleshooting section](#-troubleshooting) or file an issue.

**Last Updated:** February 7, 2026
