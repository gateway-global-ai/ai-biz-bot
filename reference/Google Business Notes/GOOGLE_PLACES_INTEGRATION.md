# Google Places API (New) Integration

## Overview

Our platform integrates with **Google Places API (New)** to provide AI-powered business research, intelligent onboarding, and comprehensive business intelligence. This integration leverages Google's Gemini AI model to deliver intelligent insights and automated workflows.

## What is Places API (New)?

The Places API (New) represents a significant upgrade to the legacy Places API, offering:

- **AI-Powered Summaries**: Leveraging Gemini model capabilities to provide intelligent place summaries
- **250+ Million Places**: Comprehensive global database of businesses and locations
- **200+ Place Types**: Expanded coverage including EV charging stations, specific restaurant types, and more
- **Real-Time Data**: Dynamic information including EV charging availability, gas prices, and business holiday hours
- **Enhanced Search**: Improved relevance, new ranking capabilities, and location-aware results
- **Field Masking**: Optimize requests and control costs by requesting only needed data
- **Modern Security**: OAuth-based authentication alongside API key support
- **Improved Performance**: Built on Google Cloud infrastructure with RPC request support

## AI Integration with Gemini

### How AI Powers Our Platform

Our integration uses Google's **Gemini AI model** to:

1. **Generate Business Summaries**
   - AI synthesizes information from reviews, editorial content, and place data
   - Provides comprehensive context about businesses
   - Helps identify key business characteristics and customer sentiment

2. **Analyze Customer Reviews**
   - AI analyzes reviews to identify key themes
   - Synthesizes sentiment and common feedback
   - Highlights what customers value most

3. **Identify Industry Pain Points**
   - AI analyzes business type and characteristics
   - Matches businesses with industry profiles
   - Identifies common pain points for that industry

4. **Generate Personalized Workflows**
   - AI understands business context from Google Places data
   - Generates voice AI workflows tailored to the business
   - Creates system prompts based on industry and business profile

### AI Summary Types

When we retrieve business data, we prioritize AI-generated summaries:

1. **Generative Summary** (`generativeSummary.overview.text`)
   - AI-generated place overview
   - Synthesized from multiple data sources
   - Most comprehensive and informative

2. **Review Summary** (`reviewSummary.text.text`)
   - AI-powered synthesis of customer reviews
   - Highlights key themes and sentiment
   - Quick understanding of customer feedback

3. **Editorial Summary** (`editorialSummary.overview`)
   - Curated editorial description
   - Fallback when AI summaries available

4. **Description** (`description`)
   - Basic description fallback

## How It Works in Our Platform

### 1. Business Discovery

When a customer searches for their business:

1. **Location-Aware Search**: Uses customer's geolocation for better results
2. **Business Retrieval**: Fetches comprehensive business data from Google Places
3. **AI Analysis**: Gemini AI analyzes the business profile
4. **Industry Identification**: Auto-detects industry from 200+ place types
5. **Profile Creation**: Creates business profile with AI-generated insights

### 2. Business Intelligence

Our platform automatically collects:

- **Business Information**: Name, address, phone, website, hours
- **Customer Ratings**: Rating and review count
- **Business Photos**: High-quality business images
- **AI Summaries**: Gemini-generated business descriptions
- **Customer Reviews**: Last 5 reviews with AI analysis
- **Industry Data**: Auto-detected industry type and characteristics
- **Real-Time Status**: Current operational status (open/closed)

### 3. Voice AI Generation

Using the Google Places data, our platform:

1. **Analyzes Business Profile**: AI understands business type and characteristics
2. **Identifies Pain Points**: Matches business with industry pain points
3. **Generates Workflows**: Creates voice AI workflows with nodes and context
4. **Creates System Prompts**: Generates personalized prompts for the business
5. **Sets Global Variables**: Configures shared data variables for voice AI

## Benefits for Customers

### For Business Owners

1. **Quick Onboarding**
   - Search for your business - we find it automatically
   - No manual data entry required
   - AI analyzes your business profile instantly

2. **Intelligent Insights**
   - AI understands your business type and industry
   - Identifies common pain points for your industry
   - Generates personalized voice AI solutions

3. **Comprehensive Data**
   - Access to 250+ million businesses worldwide
   - Real-time business information
   - Accurate industry classification

4. **Better Voice AI**
   - AI-generated workflows tailored to your business
   - Personalized system prompts
   - Industry-specific pain point addressing

### For End Users (Your Customers)

1. **AI-Powered Summaries**
   - Quick understanding of businesses
   - Synthesized information from multiple sources
   - Better decision-making

2. **Enhanced Search**
   - Location-aware results
   - Improved relevance and ranking
   - Faster business discovery

3. **Comprehensive Information**
   - Business hours, ratings, reviews
   - Photos and location data
   - Real-time operational status

## Technical Implementation

### API Endpoints Used

1. **Place Details (New)**
   - Endpoint: `https://places.googleapis.com/v1/places/{PLACE_ID}`
   - Retrieves comprehensive business information
   - Includes AI-generated summaries

2. **Text Search (New)**
   - Endpoint: Supabase Edge Function `/functions/v1/google-places-search`
   - Location-aware business search
   - Industry identification

3. **Place Photos (New)**
   - Endpoint: `https://places.googleapis.com/v1/{PHOTO_NAME}/media`
   - High-quality business images

### Field Masks

We use field masking to optimize requests and control costs:

```typescript
const fieldMask = [
  'id',
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'types',
  'businessStatus',
  'photos',
  'regularOpeningHours',
  'currentOpeningHours',
  'editorialSummary',
  'addressComponents',
  'primaryType',
  'primaryTypeDisplayName',
  'generativeSummary', // AI-powered place summary
  'reviewSummary',     // AI-powered review summary
  'reviews',           // Customer reviews
].join(',')
```

### Data Storage

Business data is automatically saved to `sales_funnel_leads` table:

- `business_name` - From displayName.text
- `business_phone` - From nationalPhoneNumber
- `business_address` - From formattedAddress
- `google_place_id` - Unique place identifier
- `google_places_data` - Complete API response (JSONB)
- `industry` - Auto-detected from types
- `industry_profile` - Industry-specific data
- `place_rating`, `place_review_count`, `place_website`

## Sales & Marketing

### Key Talking Points

When discussing Google Places API integration with customers:

1. **AI-Powered Intelligence**
   - "We use Google's Gemini AI to analyze your business"
   - "AI generates intelligent summaries and identifies pain points"
   - "Personalized voice AI workflows based on AI analysis"

2. **Comprehensive Data**
   - "Access to 250+ million businesses worldwide"
   - "200+ business types for accurate industry identification"
   - "Real-time data including hours, ratings, and status"

3. **Automatic Onboarding**
   - "Search for your business - we find it automatically"
   - "AI analyzes your Google Places profile instantly"
   - "No manual data entry required"

4. **Better Customer Experience**
   - "AI-powered summaries help customers understand your business"
   - "Location-aware search finds your business faster"
   - "Comprehensive data ensures accurate voice AI responses"

### Value Proposition

- **Time Savings**: Automatic business discovery and profile creation
- **Intelligence**: AI-powered analysis and insights
- **Accuracy**: Comprehensive data from Google's database
- **Personalization**: AI-generated workflows tailored to your business
- **Efficiency**: No manual data entry required

## Migration from Legacy API

If you're currently using the legacy Places API:

1. **Update Endpoints**: Use new endpoint format with headers
2. **Add Field Masks**: Specify fields instead of using `*`
3. **Use HTTP POST**: Some endpoints require POST instead of GET
4. **Handle New Response Format**: Map camelCase to expected format
5. **Leverage AI Summaries**: Use `generativeSummary` and `reviewSummary`

See our migration guide in `/docs/GOOGLE_PLACES_API_DETAILS.md` for detailed instructions.

## Documentation References

- **API Details**: `/docs/GOOGLE_PLACES_API_DETAILS.md`
- **Autocomplete**: `/docs/GOOGLE_PLACES_API_AUTO_COMPLETE.md`
- **Client Library**: `/docs/GOOGLE_PLACES_API_CLIENT_LIBRARY.md`
- **Cursor Rules**: `/.cursor/rules/google-places-api.mdc`

## Security & Privacy

- **API Key Protection**: Keys stored securely in environment variables
- **OAuth Support**: Enhanced security with OAuth authentication
- **Field Masking**: Only request necessary data
- **Data Privacy**: Business data stored securely in Supabase
- **Attribution**: Always credit Google's AI when displaying AI summaries

## Support

For questions about Google Places API integration:

1. Review this documentation
2. Check the cursor rules file: `/.cursor/rules/google-places-api.mdc`
3. Review API documentation: `/docs/GOOGLE_PLACES_API_DETAILS.md`
4. Contact the development team

---

**Last Updated**: 2024-12-19
**Status**: Production Ready

