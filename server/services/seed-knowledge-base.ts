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

    console.log('\n✅ Knowledge base seeded successfully!\n');
    console.log('Created:');
    console.log(`  - ${5} API documentation entries`);
    console.log(`  - ${2} knowledge base entries`);
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
