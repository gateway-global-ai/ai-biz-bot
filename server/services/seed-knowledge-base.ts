/**
 * Seed Knowledge Base with Google Business API Research
 * 
 * This script populates the knowledge base with initial Google Business API
 * research and documentation.
 */

import { knowledgeBaseService } from '../services/knowledge-base';
import fs from 'fs';
import path from 'path';

async function seedGoogleApisKnowledge() {
  console.log('🌱 Seeding Google Business APIs knowledge base...\n');

  try {
    // 1. Google Places API
    console.log('📍 Creating Google Places API documentation...');
    const placesApi = await knowledgeBaseService.storeApiDoc({
      apiName: 'Google Places API (New)',
      apiType: 'rest',
      version: 'v1',
      accessType: 'public',
      authenticationMethod: 'api_key',
      requiresApproval: false,
      pricingModel: 'pay_per_use',
      pricingDetails: {
        tiers: [
          { name: 'ID Only', cost: 0, per: '1000 requests', fields: ['id', 'name', 'photos'] },
          { name: 'Essentials', cost: 17, per: '1000 requests', fields: ['address', 'location', 'types'] },
          { name: 'Pro', cost: 24, per: '1000 requests', fields: ['displayName', 'businessStatus', 'utcOffset'] },
          { name: 'Enterprise', cost: 32, per: '1000 requests', fields: ['rating', 'reviews', 'hours'] },
          { name: 'Enterprise + Atmosphere', cost: 40, per: '1000 requests', fields: ['reviews', 'atmosphere', 'amenities'] }
        ],
        freeCredit: 200,
        creditPeriod: 'monthly'
      },
      freeTier: {
        creditAmount: 200,
        renewable: 'monthly',
        restrictions: 'Per Google Cloud billing account'
      },
      rateLimits: {
        requestsPerSecond: 100,
        canIncrease: true,
        dailyLimit: null
      },
      quotas: {
        default: '100 QPS',
        increasable: true
      },
      officialDocs: 'https://developers.google.com/maps/documentation/places/web-service',
      apiReference: 'https://developers.google.com/maps/documentation/places/web-service/reference',
      quickstartGuide: 'https://developers.google.com/maps/documentation/places/web-service/get-started',
      sdkLinks: {
        javascript: 'https://developers.google.com/maps/documentation/javascript/places',
        android: 'https://developers.google.com/maps/documentation/places/android-sdk',
        ios: 'https://developers.google.com/maps/documentation/places/ios-sdk'
      },
      canBeMirrored: false,
      alternativeApis: [
        { name: 'OpenStreetMap Nominatim', type: 'free', limitations: 'Less comprehensive, rate limited' },
        { name: 'Mapbox Places', type: 'commercial', pricing: 'pay_per_use' }
      ],
      currentlyUsed: true,
      integrationStatus: 'completed'
    });

    const placesKnowledge = await knowledgeBaseService.storeKnowledge({
      category: 'google_api',
      subcategory: 'places_api',
      title: 'Google Places API - Complete Analysis',
      summary: 'Comprehensive analysis of Google Places API including access, pricing, features, and integration recommendations for small businesses.',
      content: fs.readFileSync(
        path.join(process.cwd(), 'docs/knowledge-base/google-business-apis/GOOGLE_BUSINESS_API_OVERVIEW.md'),
        'utf-8'
      ),
      metadata: {
        totalPlaces: '250+ million',
        placeTypes: '200+',
        aiPowered: true,
        geminiIntegration: true,
        lastVerified: '2026-02-07',
        usedInPlatform: true
      },
      sources: [
        {
          url: 'https://developers.google.com/maps/documentation/places',
          title: 'Google Places API Documentation',
          date: '2026-02-07',
          credibility: 'official'
        },
        {
          url: 'https://developers.google.com/maps/billing-and-pricing',
          title: 'Google Maps Platform Pricing',
          date: '2026-02-07',
          credibility: 'official'
        }
      ],
      researchedBy: 'ai_research_team',
      lastVerified: new Date(),
      tags: ['google', 'places', 'api', 'pricing', 'maps', 'business'],
      keywords: ['place search', 'business discovery', 'reviews', 'ratings', 'geocoding', 'location'],
      status: 'active'
    });

    // 2. Google Workspace APIs
    console.log('📧 Creating Google Workspace APIs documentation...');
    
    const gmailApi = await knowledgeBaseService.storeApiDoc({
      apiName: 'Gmail API',
      apiType: 'rest',
      version: 'v1',
      accessType: 'public',
      authenticationMethod: 'oauth',
      requiresApproval: false,
      pricingModel: 'free',
      pricingDetails: {
        cost: 0,
        restrictions: 'Rate limits apply'
      },
      freeTier: {
        unlimited: true,
        rateLimitOnly: true
      },
      rateLimits: {
        requestsPerSecond: 25,
        dailyLimit: 1000000000,
        quotaUnits: 'per user per day'
      },
      officialDocs: 'https://developers.google.com/gmail/api',
      canBeMirrored: true,
      alternativeApis: [
        { name: 'SMTP/IMAP', type: 'free', provider: 'standard email protocols' },
        { name: 'SendGrid', type: 'commercial', pricing: 'freemium' },
        { name: 'Mailgun', type: 'commercial', pricing: 'freemium' }
      ],
      currentlyUsed: false,
      integrationStatus: 'planned'
    });

    const calendarApi = await knowledgeBaseService.storeApiDoc({
      apiName: 'Google Calendar API',
      apiType: 'rest',
      version: 'v3',
      accessType: 'public',
      authenticationMethod: 'oauth',
      requiresApproval: false,
      pricingModel: 'free',
      pricingDetails: { cost: 0 },
      freeTier: { unlimited: true },
      rateLimits: {
        requestsPerSecond: 10,
        dailyLimit: 1000000
      },
      officialDocs: 'https://developers.google.com/calendar/api',
      canBeMirrored: true,
      alternativeApis: [
        { name: 'CalDAV', type: 'free', provider: 'standard calendar protocol' },
        { name: 'Calendly API', type: 'commercial', pricing: 'freemium' }
      ],
      currentlyUsed: false,
      integrationStatus: 'in_progress'
    });

    const workspaceKnowledge = await knowledgeBaseService.storeKnowledge({
      category: 'google_api',
      subcategory: 'workspace',
      title: 'Google Workspace APIs - Integration Guide',
      summary: 'Gmail, Calendar, Drive, Docs, and Sheets APIs for productivity and automation.',
      content: `# Google Workspace APIs

## Overview
Google Workspace offers free APIs for Gmail, Calendar, Drive, Docs, and Sheets.

## Key Benefits
- **Free to use** for most operations
- **OAuth 2.0** secure authentication
- **Comprehensive features** for automation
- **Well-documented** with SDKs

## Use Cases for Small Business
1. **Email Automation** - AI-powered email responses
2. **Appointment Scheduling** - Automated calendar booking
3. **Document Generation** - AI-generated proposals and contracts
4. **Data Management** - Customer data in Sheets

## Integration Recommendations
- ✅ Gmail API for email automation
- ✅ Calendar API for scheduling
- ⚠️ Drive API for document storage (consider cost)
- ⚠️ Sheets API for data (consider alternatives for large-scale)
`,
      metadata: {
        apis: ['Gmail', 'Calendar', 'Drive', 'Docs', 'Sheets'],
        allFree: true,
        requiresOAuth: true
      },
      sources: [
        {
          url: 'https://developers.google.com/workspace',
          title: 'Google Workspace Developer Documentation',
          date: '2026-02-07',
          credibility: 'official'
        }
      ],
      researchedBy: 'ai_research_team',
      lastVerified: new Date(),
      tags: ['google', 'workspace', 'gmail', 'calendar', 'drive', 'productivity'],
      keywords: ['email', 'scheduling', 'documents', 'collaboration'],
      status: 'active'
    });

    // 3. Google Business Profile API
    console.log('🏢 Creating Business Profile API documentation...');
    
    const businessProfileApi = await knowledgeBaseService.storeApiDoc({
      apiName: 'Google Business Profile API',
      apiType: 'rest',
      version: 'v1',
      accessType: 'restricted',
      authenticationMethod: 'oauth',
      requiresApproval: true,
      pricingModel: 'free',
      pricingDetails: {
        cost: 0,
        note: 'Requires business verification'
      },
      freeTier: {
        unlimited: true,
        requiresVerification: true
      },
      rateLimits: {
        requestsPerDay: 1000,
        increasable: true
      },
      officialDocs: 'https://developers.google.com/my-business',
      canBeMirrored: true,
      alternativeApis: [
        { name: 'Custom Business Profile System', type: 'self-hosted', description: 'Build own business management dashboard' }
      ],
      currentlyUsed: false,
      integrationStatus: 'planned'
    });

    // 4. Google Gemini AI
    console.log('🤖 Creating Gemini AI documentation...');
    
    const geminiApi = await knowledgeBaseService.storeApiDoc({
      apiName: 'Google Gemini API',
      apiType: 'rest',
      version: '1.5',
      accessType: 'public',
      authenticationMethod: 'api_key',
      requiresApproval: false,
      pricingModel: 'pay_per_use',
      pricingDetails: {
        models: [
          { 
            name: 'Gemini 1.5 Flash',
            inputCost: 0.075,
            outputCost: 0.30,
            per: '1M tokens',
            contextWindow: '128K'
          },
          {
            name: 'Gemini 1.5 Pro',
            inputCost: 1.25,
            outputCost: 5.00,
            per: '1M tokens',
            contextWindow: '128K'
          }
        ]
      },
      freeTier: {
        requestsPerMinute: 15,
        tokensPerDay: 1000000
      },
      rateLimits: {
        requestsPerMinute: 15,
        requestsPerDay: 1500,
        tokensPerMinute: 32000
      },
      officialDocs: 'https://ai.google.dev/docs',
      canBeMirrored: true,
      alternativeApis: [
        { name: 'OpenAI GPT-4', type: 'commercial', pricing: 'pay_per_use' },
        { name: 'Anthropic Claude', type: 'commercial', pricing: 'pay_per_use' },
        { name: 'Moonshot Kimi', type: 'commercial', pricing: 'pay_per_use', note: 'Currently using' }
      ],
      currentlyUsed: true,
      integrationStatus: 'completed'
    });

    // 5. Create research tasks
    console.log('📋 Creating research tasks...');

    const task1 = await knowledgeBaseService.createResearchTask({
      title: 'Analyze cost savings opportunities in Google APIs',
      description: 'Review all Google API usage and identify areas where we can reduce costs through caching, batching, or alternatives.',
      researchType: 'api_analysis',
      assignedTo: 'cost_optimization_team',
      priority: 'high',
      status: 'pending'
    });

    const task2 = await knowledgeBaseService.createResearchTask({
      title: 'Build alternatives for expensive Google services',
      description: 'Identify which Google services can be replicated or replaced with open-source or cheaper alternatives for small businesses.',
      researchType: 'technical_feasibility',
      assignedTo: 'development_team',
      priority: 'medium',
      status: 'pending'
    });

    const task3 = await knowledgeBaseService.createResearchTask({
      title: 'Complete Google Workspace integration',
      description: 'Finish integration of Gmail, Calendar, and Drive APIs into the platform.',
      researchType: 'api_analysis',
      assignedTo: 'integration_team',
      priority: 'high',
      status: 'in_progress',
      progress: 60
    });

    // 6. Add business intelligence for outbound campaigns
    console.log('💼 Creating business intelligence for outbound campaigns...');
    
    const restaurantIntelligence = await knowledgeBaseService.storeKnowledge({
      category: 'business_intelligence',
      subcategory: 'restaurant',
      title: 'Restaurant Industry Challenges 2026',
      summary: 'Key pain points: staffing, online ordering complexity, reservation no-shows, and customer communication',
      content: `# Restaurant Industry Analysis 2026

## Major Challenges

### 1. Staffing Crisis
- Industry-wide shortage of qualified staff
- High turnover rates (75% annually)
- Training costs and time investment

### 2. Online Ordering Complexity
- Multiple third-party platforms (DoorDash, UberEats, Grubhub)
- High commission fees (15-30%)
- Integration challenges with existing systems

### 3. Reservation Management
- No-show rates averaging 15-20%
- Manual booking processes
- Limited reminder systems

### 4. Customer Communication
- Difficulty responding to reviews
- Slow response to customer inquiries
- Phone calls during peak hours

## Technology Solutions

### AI-Powered Platforms Can Help:
- **24/7 Customer Service**: AI chatbots handle common questions
- **Automated Reservations**: Reduce no-shows with smart reminders
- **Centralized Ordering**: Single platform for all online orders
- **Review Management**: Automated responses and monitoring

## Value Proposition for Outreach
When calling restaurants, emphasize:
✓ Increase reservations by reducing no-shows
✓ Save staff time with automated customer service
✓ Streamline online ordering and reduce fees
✓ Improve review ratings with better response times
      `,
      tags: ['restaurant', 'hospitality', 'pain-points', 'outbound'],
      keywords: ['reservations', 'ordering', 'staff', 'reviews', 'automation'],
      sources: [
        {
          url: 'https://restaurant.org/research/reports',
          title: 'National Restaurant Association Industry Report',
          date: '2026-01-15',
          credibility: 'industry_report'
        }
      ],
      status: 'active',
      researchedBy: 'business_research_team'
    });

    const retailIntelligence = await knowledgeBaseService.storeKnowledge({
      category: 'business_intelligence',
      subcategory: 'retail',
      title: 'Retail Business Trends 2026',
      summary: 'Focus on omnichannel experiences, foot traffic challenges, and customer engagement',
      content: `# Retail Industry Trends 2026

## Key Challenges

### 1. Foot Traffic Decline
- Competition from online retailers
- Changing consumer shopping habits
- Need for compelling in-store experiences

### 2. Customer Engagement
- Limited hours for customer support
- Difficulty tracking customer preferences
- Inconsistent omnichannel experience

### 3. Inventory Management
- Balancing stock levels
- Seasonal demand fluctuations
- Supply chain uncertainties

## Technology Solutions

### AI Can Transform Retail:
- **Virtual Shopping Assistant**: Guide customers 24/7
- **Smart Recommendations**: Personalized product suggestions
- **Inventory Alerts**: Real-time stock updates
- **Customer Insights**: Track preferences and behavior

## Outreach Value Propositions
✓ Boost foot traffic with engaging digital experiences
✓ Provide 24/7 customer service without extra staff
✓ Increase sales with personalized recommendations
✓ Build customer loyalty with consistent engagement
      `,
      tags: ['retail', 'shopping', 'customer-service', 'outbound'],
      keywords: ['foot-traffic', 'engagement', 'omnichannel', 'ai'],
      status: 'active',
      researchedBy: 'business_research_team'
    });

    const healthcareIntelligence = await knowledgeBaseService.storeKnowledge({
      category: 'business_intelligence',
      subcategory: 'healthcare',
      title: 'Healthcare Practice Management Challenges',
      summary: 'Appointment no-shows, patient communication, and administrative burden are top concerns',
      content: `# Healthcare Practice Management 2026

## Critical Pain Points

### 1. Appointment No-Shows
- Average no-show rate: 18-23%
- Revenue loss and wasted time slots
- Difficulty filling last-minute openings

### 2. Patient Communication
- Phone tag with patients
- After-hours inquiries go unanswered
- Missed opportunities for follow-up care

### 3. Administrative Burden
- Staff overwhelmed with scheduling calls
- Manual appointment reminders
- Insurance verification delays

## AI Solutions for Healthcare

### Intelligent Automation:
- **Smart Scheduling**: AI handles appointment booking
- **Automated Reminders**: Reduce no-shows by 40%
- **Patient Portal**: 24/7 access to information
- **Triage Assistant**: Answer common medical questions

## Outreach Messaging
✓ Reduce no-shows with automated appointment reminders
✓ Free up staff time with AI-powered scheduling
✓ Improve patient satisfaction with 24/7 communication
✓ Increase revenue by filling last-minute cancellations
      `,
      tags: ['healthcare', 'medical', 'appointments', 'outbound'],
      keywords: ['no-shows', 'scheduling', 'patients', 'automation'],
      status: 'active',
      researchedBy: 'business_research_team'
    });

    const salesIntelligence = await knowledgeBaseService.storeKnowledge({
      category: 'sales_intelligence',
      subcategory: 'cold_calling',
      title: 'Effective Cold Calling for SMB Outreach',
      summary: 'Best practices for cold calling small business owners with high conversion rates',
      content: `# Cold Calling Best Practices for SMB

## Script Structure (30-45 seconds max)

### Opening (5 seconds)
- Identify yourself and company clearly
- Use a friendly, professional tone

### Hook (10 seconds)
- Lead with a specific benefit
- Reference the business by name
- Create curiosity

### Body (20 seconds)
- Explain the main value proposition
- Keep it conversational
- Focus on outcomes, not features

### Close (10 seconds)
- Clear, simple call-to-action
- Make responding easy (press 1 or 2)
- Respect their time

## Do's and Don'ts

### ✓ Do:
- Keep it short and focused
- Use the business name
- Lead with benefits
- Sound natural, not scripted
- Provide easy opt-out
- Respect calling hours (9 AM - 6 PM)

### ✗ Don't:
- Read robotically from script
- Use jargon or technical terms
- Apologize for calling
- Make unrealistic promises
- Ignore time zones
- Call too early or too late

## Proven Phrases

**Openings:**
- "Hi, this is [Name] calling about [Business Name]..."
- "We noticed your business and wanted to share..."

**Value Propositions:**
- "We help [industry] businesses like yours [benefit]..."
- "This takes just 30 seconds..."
- "Your basic solution is already ready..."

**Calls-to-Action:**
- "Press 1 if this sounds helpful..."
- "Would you like us to send you the details?"
- "Press 2 if you're not interested..."

## Conversion Tips

1. **Personalization**: Always use business name and industry
2. **Timing**: Call between 10-11 AM or 2-4 PM
3. **Confidence**: Sound helpful, not desperate
4. **Respect**: Honor opt-out requests immediately
5. **Follow-up**: Send promised information quickly
      `,
      tags: ['sales', 'cold-calling', 'scripts', 'smb', 'outbound'],
      keywords: ['script', 'calling', 'conversion', 'best-practices'],
      status: 'active',
      researchedBy: 'sales_team'
    });

    console.log('\n✅ Knowledge base seeded successfully!\n');
    console.log('Created:');
    console.log(`  - ${5} API documentation entries`);
    console.log(`  - ${6} knowledge base entries (including outbound intelligence)`);
    console.log(`  - ${3} research tasks`);
    console.log('\nNext steps:');
    console.log('  1. Review knowledge at /api/knowledge');
    console.log('  2. Complete research tasks');
    console.log('  3. Update documentation as APIs evolve');

  } catch (error) {
    console.error('❌ Error seeding knowledge base:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGoogleApisKnowledge()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedGoogleApisKnowledge };
