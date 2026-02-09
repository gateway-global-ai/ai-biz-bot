# Google Places Integration - Step-by-Step Tutorial

## 🎯 Tutorial Overview

This tutorial walks you through integrating Google Places data into your application to help business owners discover, analyze, and manage their online presence.

**What you'll learn:**
1. How to search for businesses using Google Places
2. How to generate competitive analysis reports
3. How to build a business onboarding flow
4. How to optimize API usage with caching

**Prerequisites:**
- Basic knowledge of JavaScript/TypeScript
- Node.js and npm installed
- Access to Google Cloud Console
- Familiarity with React (for UI components)

**Time to complete:** 30-45 minutes

---

## Part 1: Setting Up Google Places API (10 minutes)

### Step 1.1: Get Google Cloud API Keys

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com
   - Create a new project or select existing one

2. **Enable Required APIs**
   - Navigate to "APIs & Services" > "Library"
   - Search and enable:
     - Places API (New)
     - Maps JavaScript API
     - Geocoding API (optional)

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - **Important:** Restrict the key to only Places API for security

4. **Set API Restrictions** (Recommended)
   - Click on your API key to edit
   - Under "Application restrictions":
     - For development: Select "HTTP referrers" and add `localhost:*`
     - For production: Add your domain
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose only the APIs you enabled

### Step 1.2: Configure Environment Variables

Add to your `.env` file:

```bash
# Google Places Configuration
GOOGLE_CLOUD_API_KEY=AIzaSy...your_actual_key_here
GOOGLE_MAPS_API_KEY=AIzaSy...your_maps_key_here

# Optional: For Google Workspace integration
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
```

### Step 1.3: Verify Setup

Test your configuration:

```bash
curl -X POST http://localhost:5000/api/places/search \
  -H "Content-Type: application/json" \
  -d '{"query":"coffee shop"}'
```

**Expected result:** JSON array of coffee shops

---

## Part 2: Building a Business Search Feature (15 minutes)

### Step 2.1: Create a Search Component

Create `src/components/BusinessSearch.tsx`:

```tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Star } from 'lucide-react';

interface Place {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingCount: number;
}

export function BusinessSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPlaces = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      setResults(data.places || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Search for your business..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchPlaces()}
        />
        <Button onClick={searchPlaces} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {results.map((place) => (
          <Card key={place.placeId}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{place.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {place.address}
                  </p>
                  <p className="text-sm flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {place.rating} ({place.userRatingCount} reviews)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Step 2.2: Add Location-Based Search

Enhance with geolocation:

```tsx
const searchNearby = async () => {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        location,
        radius: 5000, // 5km radius
      }),
    });

    const data = await response.json();
    setResults(data.places);
  });
};
```

### Step 2.3: Test Your Component

1. Add `<BusinessSearch />` to your page
2. Search for "pizza near me"
3. Verify results display correctly

---

## Part 3: Competitive Analysis Feature (10 minutes)

### Step 3.1: Create Analysis Component

Create `src/components/CompetitiveAnalysis.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface CompetitiveReport {
  businessName: string;
  category: string;
  radiusMiles: number;
  competitors: {
    total: number;
    highRated: number;
    lowRated: number;
  };
}

export function CompetitiveAnalysis({ businessName }: { businessName: string }) {
  const [report, setReport] = useState<CompetitiveReport | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/places/owner-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          radiusMiles: 3,
        }),
      });

      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!report) {
    return (
      <Button onClick={generateReport} disabled={loading}>
        <TrendingUp className="mr-2 h-4 w-4" />
        {loading ? 'Analyzing...' : 'Analyze Competition'}
      </Button>
    );
  }

  const midRated = report.competitors.total - 
    report.competitors.highRated - 
    report.competitors.lowRated;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitive Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold">{report.competitors.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">
              {report.competitors.highRated}
            </p>
            <p className="text-sm text-muted-foreground">High Rated</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-yellow-600">{midRated}</p>
            <p className="text-sm text-muted-foreground">Mid Rated</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            📊 <strong>Market Insight:</strong> You have{' '}
            {report.competitors.total} competitors within {report.radiusMiles} miles.
            {report.competitors.highRated > report.competitors.total / 2
              ? ' Most are highly rated - focus on exceptional service.'
              : ' Opportunity to stand out with great reviews.'}
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={generateReport} 
          className="w-full mt-4"
          disabled={loading}
        >
          Refresh Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Step 3.2: Test the Analysis

1. Use a known business name
2. Click "Analyze Competition"
3. Review the results

---

## Part 4: Understanding Caching (5 minutes)

### Step 4.1: Monitor Cache Performance

Check cache statistics:

```bash
curl http://localhost:5000/api/places/cache/stats
```

**Response:**
```json
{
  "total": 15,
  "valid": 14,
  "expired": 1,
  "defaultTTLMinutes": 60
}
```

### Step 4.2: Understanding TTL

The cache uses different TTL (Time To Live) for different operations:

- **Place Search**: 60 minutes
- **Place Details**: 24 hours
- **Owner Report**: 12 hours
- **Marketing Search**: 6 hours

**Why?** Search results change frequently, but business details are more stable.

### Step 4.3: Clear Cache When Needed

```bash
curl -X POST http://localhost:5000/api/places/cache/clear
```

**When to clear:**
- After updating business information
- When testing with fresh data
- If you suspect stale data

---

## Part 5: Building Complete Onboarding Flow (10 minutes)

### Step 5.1: Use the Wizard Component

The `BusinessOnboardingWizard` provides a complete flow:

```tsx
import { BusinessOnboardingWizard } from '@/components/BusinessOnboardingWizard';

function OnboardingPage() {
  const handleComplete = (businessData: any) => {
    console.log('Onboarding complete:', businessData);
    
    // Save to database
    // Redirect to dashboard
    // Set up integrations
  };

  return <BusinessOnboardingWizard onComplete={handleComplete} />;
}
```

### Step 5.2: Customize the Flow

You can customize each step:

```tsx
// Skip certain steps
const [step, setStep] = useState<OnboardingStep>('search');

// Add custom validation
if (!selectedPlace?.rating || selectedPlace.rating < 3.5) {
  alert('Consider improving your Google rating before continuing');
}

// Add custom integrations
const enabledIntegrations = {
  workspace: true,
  voiceAI: true,
  customCRM: true,
};
```

### Step 5.3: Save Business Data

When onboarding completes, save the data:

```typescript
const handleComplete = async (businessData: any) => {
  const { place, report, integrations } = businessData;

  // Save to database
  await fetch('/api/business/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      rating: place.rating,
      competitiveData: report,
      integrations: integrations,
    }),
  });

  // Redirect to dashboard
  window.location.href = '/dashboard';
};
```

---

## Part 6: Best Practices & Optimization

### 6.1: API Cost Management

**Monitor Usage:**
```typescript
// Log API calls
console.log('[API] Calling Google Places API');
console.log('[Cache] Hit rate:', hitRate);
```

**Optimize Queries:**
```typescript
// Use field masking to reduce costs
const fields = 'places.id,places.displayName,places.rating';

// Cache aggressively
const ttl = isPremiumUser ? 30 : 60; // Premium users get fresher data
```

### 6.2: Error Handling

```typescript
try {
  const result = await searchPlaces(query);
} catch (error) {
  if (error.message.includes('quota')) {
    // Handle quota exceeded
    showMessage('API limit reached. Please try again later.');
  } else if (error.message.includes('not found')) {
    // Handle not found
    showMessage('Business not found. Try a different search term.');
  } else {
    // Generic error
    showMessage('Search failed. Please try again.');
  }
}
```

### 6.3: Progressive Enhancement

```typescript
// Start with basic search
const results = await searchPlaces(query);

// Then enhance with details (cached)
const enrichedResults = await Promise.all(
  results.map(async (place) => {
    const details = await getPlaceDetails(place.placeId);
    return { ...place, ...details };
  })
);
```

### 6.4: Accessibility

Always include:
```tsx
<button
  onClick={handleClick}
  aria-label="Search for businesses"
  tabIndex={0}
  onKeyPress={(e) => e.key === 'Enter' && handleClick()}
>
  Search
</button>
```

---

## Part 7: Testing Your Integration

### 7.1: Manual Testing Checklist

- [ ] Search finds businesses correctly
- [ ] Results display with ratings and addresses
- [ ] Competitive analysis generates reports
- [ ] Cache reduces duplicate API calls
- [ ] Error messages are user-friendly
- [ ] Loading states work properly
- [ ] Keyboard navigation works
- [ ] Mobile responsive

### 7.2: Automated Testing

```typescript
// Example test
describe('BusinessSearch', () => {
  it('should search and display results', async () => {
    render(<BusinessSearch />);
    
    const input = screen.getByPlaceholderText('Search for your business...');
    const button = screen.getByText('Search');
    
    fireEvent.change(input, { target: { value: 'coffee shop' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/coffee/i)).toBeInTheDocument();
    });
  });
});
```

---

## 🎉 Congratulations!

You've successfully integrated Google Places into your application!

### What You Built:
✅ Business search with Google Places  
✅ Competitive analysis reports  
✅ Complete onboarding flow  
✅ Smart caching for cost optimization  
✅ Accessible, user-friendly UI  

### Next Steps:

1. **Add More Features**
   - Photo gallery from Google Places
   - Review management
   - Business hours display
   - Location maps

2. **Integrate with Other Services**
   - Google Workspace for email/calendar
   - Payment processing
   - CRM systems
   - Marketing automation

3. **Optimize Further**
   - Add Redis for distributed caching
   - Implement webhooks for real-time updates
   - Build analytics dashboard
   - Add A/B testing

### Resources:

- [Developer Quick Start](./DEVELOPER_QUICKSTART.md)
- [Business Owner Guide](./GOOGLE_BUSINESS_QUICKSTART.md)
- [MCP Integration Guide](./GOOGLE_BUSINESS_MCP_INTEGRATION.md)
- [Google Places API Docs](https://developers.google.com/maps/documentation/places/web-service)

### Need Help?

- 📚 Check the documentation
- 💬 Ask in GitHub Discussions
- 🐛 Report bugs in GitHub Issues
- 📧 Contact support

---

**Tutorial Version:** 1.0  
**Last Updated:** February 7, 2026  
**Estimated Completion Time:** 30-45 minutes

Happy coding! 🚀
