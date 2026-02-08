# Agent Knowledge Base - Quick Reference

## Overview

The Agent Knowledge Base system enables AI agents to store, access, and utilize research about Google Business APIs, business tools, and integrations. It provides a centralized repository of business intelligence that agents can query to provide informed recommendations to customers.

## Quick Start

### 1. Seed the Knowledge Base

```bash
npx tsx server/services/seed-knowledge-base.ts
```

### 2. Access via API

```bash
# Search for Google API information
curl http://localhost:5000/api/knowledge?category=google_api

# Get specific entry
curl http://localhost:5000/api/knowledge/{id}

# Get by tags
curl http://localhost:5000/api/knowledge/tags/google,places,pricing
```

### 3. Use in Code

```typescript
import { knowledgeBaseService } from './services/knowledge-base';

// Search knowledge
const results = await knowledgeBaseService.searchKnowledge({
  query: 'pricing',
  category: 'google_api'
});

// Get API documentation
const placesApi = await knowledgeBaseService.getApiDoc('Google Places API (New)');

// Generate agent prompt
const prompt = await knowledgeBaseService.generateAgentPrompt(['google_api', 'pricing']);
```

## Key Features

### ✅ What's Implemented

- **Database Schema** - 3 tables: agentKnowledgeBase, apiDocumentation, researchTasks
- **Service Layer** - Full CRUD operations with search and versioning
- **REST API** - Complete API at `/api/knowledge`
- **Initial Research** - Google Business API overview and analysis
- **Integration** - Connected to BusinessResearchService
- **Documentation** - Comprehensive guides and examples

### 📊 What's Stored

1. **Google Places API** - Pricing, features, integration
2. **Google Workspace APIs** - Gmail, Calendar, Drive, Docs, Sheets
3. **Google Business Profile API** - Review management
4. **Google Gemini AI** - LLM pricing and features
5. **Google Maps Platform** - Mapping and location services
6. **Cost Analysis** - Pricing comparisons and alternatives
7. **Integration Plans** - Step-by-step implementation guides

## Common Use Cases

### 1. Get API Recommendations

```typescript
import { businessResearchService } from './agents/business-research';

const recommendations = await businessResearchService.getApiRecommendations({
  businessId: '123',
  name: 'Coffee Shop',
  industry: 'restaurant',
  location: { city: 'San Francisco', ... }
});

console.log(recommendations.recommendedApis);
console.log(`Cost: $${recommendations.costEstimate}/month`);
```

### 2. Search Knowledge

```typescript
// By category
const googleApis = await knowledgeBaseService.getByCategory('google_api');

// By tags
const pricingInfo = await knowledgeBaseService.getByTags(['pricing', 'cost']);

// By query
const results = await knowledgeBaseService.searchKnowledge({
  query: 'workspace',
  category: 'google_api'
});
```

### 3. Create Research Task

```typescript
const task = await knowledgeBaseService.createResearchTask({
  title: 'Research Google Analytics API',
  description: 'Document pricing and features',
  researchType: 'api_analysis',
  priority: 'high'
});

// Complete task
await knowledgeBaseService.completeResearchTask(
  task.id,
  { findings: {...} },
  { category: 'google_api', title: '...', content: '...' }
);
```

### 4. Generate Agent Prompt

```typescript
const prompt = await knowledgeBaseService.generateAgentPrompt([
  'google_api',
  'places',
  'pricing'
]);

// Use in agent system prompt
const agentConfig = {
  systemPrompt: `You are a business consultant.\n\n${prompt}`
};
```

## API Reference

### Knowledge Base Endpoints

```
GET    /api/knowledge                      # Search
GET    /api/knowledge/:id                  # Get by ID
GET    /api/knowledge/category/:category   # Get by category
GET    /api/knowledge/tags/:tags           # Get by tags
POST   /api/knowledge                      # Create
PUT    /api/knowledge/:id                  # Update
POST   /api/knowledge/:id/version          # New version
GET    /api/knowledge/popular/:limit       # Most accessed
GET    /api/knowledge/recent/:limit        # Recently updated
POST   /api/knowledge/:id/outdated         # Mark outdated
POST   /api/knowledge/:id/archive          # Archive
```

### API Documentation Endpoints

```
GET    /api/knowledge/api-docs             # All API docs
GET    /api/knowledge/api-docs/:apiName    # Specific API
POST   /api/knowledge/api-docs             # Create
GET    /api/knowledge/api-docs/mirrorable  # Can be mirrored
GET    /api/knowledge/api-docs/current     # Currently used
```

### Research Task Endpoints

```
GET    /api/knowledge/research-tasks       # Active tasks
GET    /api/knowledge/research-tasks?type= # By type
POST   /api/knowledge/research-tasks       # Create
PUT    /api/knowledge/research-tasks/:id   # Update
POST   /api/knowledge/research-tasks/:id/complete  # Complete
```

## Database Schema

### agentKnowledgeBase

| Field | Type | Description |
|-------|------|-------------|
| id | varchar | Primary key |
| category | text | Main category (google_api, business_tools) |
| subcategory | text | Specific topic (places_api, workspace) |
| title | text | Entry title |
| content | text | Full content (markdown) |
| summary | text | Short summary |
| metadata | jsonb | Flexible additional data |
| sources | jsonb | Source references |
| tags | text[] | Search tags |
| status | text | active, draft, archived, outdated |
| version | integer | Version number |
| accessCount | integer | Usage tracking |

### apiDocumentation

| Field | Type | Description |
|-------|------|-------------|
| id | varchar | Primary key |
| apiName | text | API name |
| apiType | text | rest, graphql, grpc, sdk |
| pricingModel | text | free, pay_per_use, subscription |
| pricingDetails | jsonb | Detailed costs |
| rateLimits | jsonb | API limits |
| canBeMirrored | boolean | Alternative possible? |
| alternativeApis | jsonb | Alternative solutions |
| currentlyUsed | boolean | Active in platform |
| integrationStatus | text | Implementation status |

### researchTasks

| Field | Type | Description |
|-------|------|-------------|
| id | varchar | Primary key |
| title | text | Task title |
| researchType | text | api_analysis, market_analysis, etc. |
| assignedTo | text | Responsible party |
| priority | text | low, medium, high, urgent |
| findings | jsonb | Research results |
| status | text | pending, in_progress, completed |
| progress | integer | 0-100% |

## File Structure

```
docs/knowledge-base/
├── README.md                           # Main documentation
├── USAGE_EXAMPLES.md                   # Code examples
├── QUICK_REFERENCE.md                  # This file
├── google-business-apis/
│   └── GOOGLE_BUSINESS_API_OVERVIEW.md # Comprehensive API research
├── research-reports/                   # Completed research
└── agent-summaries/                    # Agent-generated summaries

server/
├── services/
│   ├── knowledge-base.ts              # Main service
│   └── seed-knowledge-base.ts         # Initial data seeding
└── routes/
    └── knowledge-routes.ts            # API routes

shared/
└── schema.ts                          # Database schema (+130 lines)
```

## Integration Points

### 1. BusinessResearchService

```typescript
// Already integrated
import { knowledgeBaseService } from '../services/knowledge-base';

class BusinessResearchService {
  async getApiRecommendations(businessProfile) {
    const googleApis = await knowledgeBaseService.searchKnowledge({
      category: 'google_api'
    });
    // Use knowledge to make recommendations
  }
}
```

### 2. Agent System Prompts

```typescript
// Enhance any agent with knowledge
async function enhanceAgent(agentId: string) {
  const knowledge = await knowledgeBaseService.generateAgentPrompt([
    'google_api',
    'business_tools'
  ]);
  
  // Add to agent's system prompt
  const enhancedPrompt = `${basePrompt}\n\n# Knowledge Base\n\n${knowledge}`;
}
```

### 3. Customer Onboarding

```typescript
// Show customers what APIs we're integrating
const recommendations = await businessResearchService.getApiRecommendations(
  customerProfile
);

console.log(`We're setting up ${recommendations.recommendedApis.length} integrations for you!`);
console.log(`Estimated cost: $${recommendations.costEstimate}/month`);
```

## Best Practices

### ✅ DO

- **Use categories** - Organize knowledge by category (google_api, business_tools)
- **Add tags** - Tag liberally for better search (google, places, pricing, free)
- **Include sources** - Always cite official documentation
- **Version updates** - Create new versions rather than overwriting
- **Track access** - Let the system track usage for popularity
- **Verify regularly** - Update lastVerified date when confirming accuracy

### ❌ DON'T

- **Don't duplicate** - Search first before creating new entries
- **Don't delete** - Archive instead of deleting (preserves history)
- **Don't skip metadata** - Add metadata for better searchability
- **Don't forget sources** - Always include source URLs
- **Don't use draft status** - Move to active when ready

## Maintenance

### Regular Tasks

**Weekly:**
- Review popular entries for accuracy
- Update pricing if changed
- Complete pending research tasks

**Monthly:**
- Verify API documentation
- Update rate limits if changed
- Archive outdated entries
- Review and complete research tasks

**Quarterly:**
- Full audit of all active knowledge
- Update Google API information
- Review and update alternatives
- Check integration status

### Monitoring

```typescript
// Check system health
const popular = await knowledgeBaseService.getPopularKnowledge(5);
const recent = await knowledgeBaseService.getRecentKnowledge(5);
const tasks = await knowledgeBaseService.getActiveResearchTasks();

console.log(`Popular: ${popular.length}`);
console.log(`Recent updates: ${recent.length}`);
console.log(`Active tasks: ${tasks.length}`);
```

## Troubleshooting

### Knowledge not found

```typescript
// Search instead of assuming exact match
const results = await knowledgeBaseService.searchKnowledge({
  query: 'places',
  category: 'google_api'
});

if (results.length === 0) {
  console.log('No knowledge found - create new entry');
}
```

### Outdated information

```typescript
// Mark as outdated, create new version
await knowledgeBaseService.markOutdated(oldEntryId);

const newVersion = await knowledgeBaseService.createNewVersion(
  oldEntryId,
  { content: updatedContent }
);
```

### API documentation missing

```typescript
// Create new API documentation
await knowledgeBaseService.storeApiDoc({
  apiName: 'New API',
  apiType: 'rest',
  pricingModel: 'free',
  // ... other fields
});
```

## Next Steps

1. **Run seed script** - Populate initial knowledge
2. **Test API endpoints** - Verify functionality
3. **Integrate with agents** - Add to existing agents
4. **Create research tasks** - Document new APIs
5. **Set up maintenance** - Schedule regular updates

## Support

For questions or issues:
1. Check [README.md](./README.md) for detailed documentation
2. Review [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for code examples
3. Examine the seed script for data structure examples
4. Contact the development team

---

**Last Updated:** 2026-02-07
**Version:** 1.0
**Status:** Production Ready
