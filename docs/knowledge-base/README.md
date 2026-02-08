# Agent Knowledge Base System

## Overview

The Agent Knowledge Base is a comprehensive system for storing, managing, and utilizing research, documentation, and business intelligence. It enables AI agents to access structured information about Google Business APIs, business tools, integrations, and research findings.

## Purpose

- **Centralized Knowledge**: Single source of truth for business API information
- **Agent Training**: Provide agents with up-to-date information for better responses
- **Research Management**: Track and complete research tasks systematically
- **API Documentation**: Maintain comprehensive documentation of external APIs
- **Version Control**: Track changes and updates to knowledge over time

## Directory Structure

```
docs/knowledge-base/
├── google-business-apis/     # Google Business API research
│   └── GOOGLE_BUSINESS_API_OVERVIEW.md
├── research-reports/          # Completed research reports
└── agent-summaries/           # Agent-generated summaries
```

## Database Schema

### `agent_knowledge_base`

Main knowledge storage table.

**Fields:**
- `id` - Unique identifier
- `category` - Main category (e.g., 'google_api', 'business_tools')
- `subcategory` - Specific topic (e.g., 'places_api', 'workspace')
- `title` - Entry title
- `content` - Full content (markdown)
- `summary` - Short summary
- `metadata` - Flexible JSON for additional data
- `sources` - Array of source references
- `researchedBy` - Creator/researcher
- `tags` - Search tags
- `keywords` - Search keywords
- `accessCount` - Usage tracking
- `version` - Version number
- `status` - 'draft', 'active', 'archived', 'outdated'

### `api_documentation`

Specific API documentation and analysis.

**Fields:**
- `apiName` - API name
- `apiType` - Type (rest, graphql, grpc, sdk)
- `version` - API version
- `accessType` - Who can access (public, private, enterprise)
- `authenticationMethod` - How to authenticate
- `pricingModel` - Pricing structure
- `pricingDetails` - Detailed costs (JSON)
- `rateLimits` - API limits (JSON)
- `canBeMirrored` - Can we create alternative?
- `alternativeApis` - Alternative solutions (JSON)
- `currentlyUsed` - Active in our platform
- `integrationStatus` - Implementation status

### `research_tasks`

Track ongoing research projects.

**Fields:**
- `title` - Task title
- `description` - Task description
- `researchType` - Type of research
- `assignedTo` - Responsible party
- `priority` - Importance level
- `findings` - Research results (JSON)
- `relatedKnowledgeIds` - Links to knowledge entries
- `status` - 'pending', 'in_progress', 'completed', 'on_hold'
- `progress` - 0-100%
- `dueDate` - Target completion

## API Endpoints

### Knowledge Base

```typescript
// Search knowledge
GET /api/knowledge?query=places&category=google_api&tags=maps

// Get specific entry
GET /api/knowledge/:id

// Get by category
GET /api/knowledge/category/google_api

// Get by tags
GET /api/knowledge/tags/maps,geocoding

// Create entry
POST /api/knowledge
{
  "category": "google_api",
  "subcategory": "places_api",
  "title": "Google Places API Pricing",
  "content": "...",
  "summary": "...",
  "tags": ["google", "places", "pricing"],
  "metadata": { ... }
}

// Update entry
PUT /api/knowledge/:id

// Create new version
POST /api/knowledge/:id/version

// Get popular entries
GET /api/knowledge/popular/10

// Get recent updates
GET /api/knowledge/recent/10

// Mark outdated
POST /api/knowledge/:id/outdated

// Archive
POST /api/knowledge/:id/archive
```

### API Documentation

```typescript
// Get all API docs
GET /api/knowledge/api-docs

// Get specific API
GET /api/knowledge/api-docs/Google%20Places%20API

// Create API doc
POST /api/knowledge/api-docs
{
  "apiName": "Google Places API",
  "apiType": "rest",
  "accessType": "public",
  "pricingModel": "pay_per_use",
  "canBeMirrored": false,
  "currentlyUsed": true
}

// Get mirrorable APIs
GET /api/knowledge/api-docs/mirrorable

// Get currently used APIs
GET /api/knowledge/api-docs/current
```

### Research Tasks

```typescript
// Get active tasks
GET /api/knowledge/research-tasks

// Get tasks by type
GET /api/knowledge/research-tasks?type=api_analysis

// Create task
POST /api/knowledge/research-tasks
{
  "title": "Research Google Workspace APIs",
  "description": "...",
  "researchType": "api_analysis",
  "priority": "high"
}

// Update task
PUT /api/knowledge/research-tasks/:id

// Complete task
POST /api/knowledge/research-tasks/:id/complete
{
  "findings": { ... },
  "knowledgeEntry": { ... }
}
```

### Agent Integration

```typescript
// Generate agent prompt from knowledge
POST /api/knowledge/generate-prompt
{
  "topics": ["google_api", "places", "pricing"]
}
// Returns: { "prompt": "# Business API Knowledge\n\n..." }
```

## Usage Examples

### Store Google API Research

```typescript
import { knowledgeBaseService } from './services/knowledge-base';

// Store knowledge
await knowledgeBaseService.storeKnowledge({
  category: 'google_api',
  subcategory: 'places_api',
  title: 'Google Places API - Pricing Analysis',
  content: `
# Pricing Analysis

- Basic: Free
- Place Details Essentials: $0.017/request
- Place Details Pro: $0.024/request
...
  `,
  summary: 'Comprehensive pricing breakdown for Google Places API',
  tags: ['google', 'places', 'pricing', 'api'],
  keywords: ['cost', 'price', 'billing', 'free tier'],
  metadata: {
    lastVerified: '2026-02-07',
    officialSource: 'https://developers.google.com/maps/billing'
  },
  sources: [
    {
      url: 'https://developers.google.com/maps/billing',
      title: 'Google Maps Platform Billing',
      date: '2026-02-07',
      credibility: 'official'
    }
  ],
  researchedBy: 'ai_research_agent'
});
```

### Create API Documentation

```typescript
await knowledgeBaseService.storeApiDoc({
  apiName: 'Google Places API',
  apiType: 'rest',
  version: 'v1',
  accessType: 'public',
  authenticationMethod: 'api_key',
  requiresApproval: false,
  pricingModel: 'pay_per_use',
  pricingDetails: {
    tiers: [
      { name: 'ID Only', cost: 0, per: '1000 requests' },
      { name: 'Essentials', cost: 17, per: '1000 requests' },
      { name: 'Pro', cost: 24, per: '1000 requests' }
    ],
    freeCredit: 200,
    creditPeriod: 'monthly'
  },
  freeTier: {
    requests: 'unlimited',
    fields: ['id', 'name', 'photos']
  },
  rateLimits: {
    requestsPerSecond: 100,
    dailyLimit: null
  },
  officialDocs: 'https://developers.google.com/maps/documentation/places',
  canBeMirrored: false,
  currentlyUsed: true,
  integrationStatus: 'completed'
});
```

### Create Research Task

```typescript
const task = await knowledgeBaseService.createResearchTask({
  title: 'Analyze Google Workspace API Costs',
  description: 'Research pricing for Gmail, Calendar, Drive APIs and identify cost-saving opportunities',
  researchType: 'api_analysis',
  assignedTo: 'research_agent',
  priority: 'high',
  dueDate: new Date('2026-02-14')
});

// Later, complete the task
await knowledgeBaseService.completeResearchTask(
  task.id,
  {
    summary: 'Most Workspace APIs are free for individual use',
    costSavings: ['Use service accounts', 'Implement caching'],
    recommendations: ['Integrate Gmail API', 'Use Calendar API for scheduling']
  },
  {
    category: 'google_api',
    subcategory: 'workspace',
    title: 'Google Workspace API Cost Analysis',
    content: '# Analysis Results...',
    tags: ['google', 'workspace', 'pricing']
  }
);
```

### Search and Retrieve Knowledge

```typescript
// Search for Google Places information
const results = await knowledgeBaseService.searchKnowledge({
  query: 'pricing',
  category: 'google_api',
  tags: ['places']
});

// Get by category
const googleApis = await knowledgeBaseService.getByCategory('google_api');

// Get by tags
const pricingInfo = await knowledgeBaseService.getByTags(['pricing', 'cost']);

// Get popular topics
const popular = await knowledgeBaseService.getPopularKnowledge(5);
```

### Generate Agent Training Prompt

```typescript
// Generate prompt for agent training
const prompt = await knowledgeBaseService.generateAgentPrompt([
  'google_api',
  'places',
  'pricing'
]);

// Use in agent system prompt
const agentConfig = {
  systemPrompt: `
You are a business consultant AI agent.

${prompt}

Use this information to help customers understand Google Business APIs.
  `
};
```

## Integration with Agents

### Business Research Agent

```typescript
import { knowledgeBaseService } from '../services/knowledge-base';

class BusinessResearchAgent {
  async analyzeGoogleApis(businessProfile: any) {
    // Retrieve relevant knowledge
    const placesApi = await knowledgeBaseService.getApiDoc('Google Places API');
    const workspaceApis = await knowledgeBaseService.getByCategory('google_api');
    
    // Use knowledge to make recommendations
    const recommendations = this.generateRecommendations(
      businessProfile,
      placesApi,
      workspaceApis
    );
    
    return recommendations;
  }
}
```

### AI Biz Bot Enhancement

```typescript
// Enhance AI Biz Bot with Google API knowledge
const googleApiKnowledge = await knowledgeBaseService.generateAgentPrompt([
  'google_api',
  'business_tools',
  'integration'
]);

const enhancedSystemPrompt = `
${baseSystemPrompt}

# Google Business API Knowledge

${googleApiKnowledge}

When discussing business tools, reference this Google API information.
Help customers understand which APIs would benefit their business.
`;
```

## Best Practices

1. **Keep Information Current**
   - Regularly verify pricing and features
   - Mark outdated entries
   - Create new versions when updating

2. **Tag Consistently**
   - Use standard tags: 'google', 'api', 'pricing', 'integration'
   - Add specific tags: 'places', 'workspace', 'maps'
   - Include use-case tags: 'small_business', 'enterprise'

3. **Document Sources**
   - Always include official documentation links
   - Note when information was verified
   - Track credibility of sources

4. **Version Control**
   - Create new versions rather than overwriting
   - Track changes in metadata
   - Maintain history for important entries

5. **Search Optimization**
   - Use descriptive titles
   - Write clear summaries
   - Include relevant keywords
   - Add comprehensive tags

## Research Process

### 1. Create Research Task

```typescript
const task = await knowledgeBaseService.createResearchTask({
  title: 'Research Google Business Profile API',
  description: 'Document access, pricing, and integration requirements',
  researchType: 'api_analysis',
  priority: 'high'
});
```

### 2. Conduct Research

- Review official documentation
- Test API endpoints
- Analyze pricing
- Identify alternatives
- Document findings

### 3. Store Knowledge

```typescript
await knowledgeBaseService.completeResearchTask(
  task.id,
  findings,
  {
    category: 'google_api',
    title: 'Google Business Profile API Analysis',
    content: documentedFindings,
    tags: ['google', 'business_profile', 'api']
  }
);
```

### 4. Create API Documentation

```typescript
await knowledgeBaseService.storeApiDoc({
  apiName: 'Google Business Profile API',
  // ... detailed API information
});
```

## Maintenance

### Regular Updates

- **Weekly**: Review popular entries for accuracy
- **Monthly**: Update pricing information
- **Quarterly**: Verify all API documentation
- **Annually**: Archive outdated entries

### Quality Control

- Verify sources are current
- Test API endpoints
- Update rate limits
- Confirm pricing
- Check integration status

## Future Enhancements

- [ ] AI-powered research automation
- [ ] Automatic pricing updates
- [ ] Integration with external knowledge bases
- [ ] Semantic search capabilities
- [ ] Knowledge graph visualization
- [ ] Collaborative editing
- [ ] Version comparison tools
- [ ] Export to various formats

---

**Last Updated**: 2026-02-07
**Maintained By**: AI Research Team
**Status**: Active Development
