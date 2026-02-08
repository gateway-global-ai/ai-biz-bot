# Agent Knowledge Base - Usage Examples

This document provides practical examples of how AI agents can use the knowledge base system to access and utilize Google Business API research.

## Example 1: Business Consultant Agent

When helping a customer understand Google Business APIs, an agent can query the knowledge base:

```typescript
import { knowledgeBaseService } from '../services/knowledge-base';
import { businessResearchService } from '../agents/business-research';

// Business consultant agent answering customer questions
async function consultOnGoogleApis(businessProfile: any) {
  // Get Google Places API information
  const placesApi = await knowledgeBaseService.getApiDoc('Google Places API (New)');
  
  if (placesApi) {
    console.log(`Google Places API:`);
    console.log(`- Pricing: ${placesApi.pricingModel}`);
    console.log(`- Access: ${placesApi.accessType}`);
    console.log(`- Can be mirrored: ${placesApi.canBeMirrored ? 'Yes' : 'No'}`);
    console.log(`- Currently used: ${placesApi.currentlyUsed ? 'Yes' : 'No'}`);
  }

  // Get API recommendations for this business
  const recommendations = await businessResearchService.getApiRecommendations(businessProfile);
  
  console.log(`\nRecommended APIs for ${businessProfile.name}:`);
  recommendations.recommendedApis.forEach(api => {
    console.log(`- ${api.apiName} (${api.priority} priority)`);
    console.log(`  ${api.reason}`);
    console.log(`  Cost: $${api.estimatedCost}/month`);
  });
  
  console.log(`\nTotal estimated cost: $${recommendations.costEstimate}/month`);
  console.log(`With Google's $200 monthly credit: $${Math.max(0, recommendations.costEstimate - 200)}/month`);
}
```

## Example 2: AI Biz Bot Enhanced Prompt

Generate an enhanced system prompt for AI Biz Bot that includes Google API knowledge:

```typescript
async function enhanceAiBizBotPrompt() {
  // Get Google API knowledge
  const googleApiKnowledge = await knowledgeBaseService.generateAgentPrompt([
    'google_api',
    'places',
    'workspace',
    'pricing'
  ]);

  const enhancedPrompt = `
You are AI Biz Bot, an intelligent business consultant for small businesses.

# Your Knowledge Base

${googleApiKnowledge}

# How to Use This Information

When customers ask about:
- Business tools → Recommend our AI-powered alternatives with Google API integration
- Online presence → Explain Google Places API benefits
- Automation → Show how we use Google Workspace APIs
- Costs → Compare our bundled pricing vs buying Google services separately

# Key Talking Points

1. **We integrate the best of Google** - Places, Maps, Workspace APIs
2. **We add AI on top** - Making Google services smarter with our agents
3. **We're more affordable** - Bundle everything in one platform
4. **We're easier to use** - One dashboard vs managing multiple Google tools
`;

  return enhancedPrompt;
}
```

## Example 3: Research Task Workflow

How an agent conducts research and stores findings:

```typescript
async function conductGoogleApiResearch() {
  // 1. Create research task
  const task = await knowledgeBaseService.createResearchTask({
    title: 'Analyze Google Workspace API Integration Opportunities',
    description: 'Research Gmail, Calendar, Drive APIs to identify integration opportunities for small businesses',
    researchType: 'api_analysis',
    assignedTo: 'research_agent',
    priority: 'high',
    status: 'in_progress'
  });

  console.log(`Research task created: ${task.id}`);

  // 2. Conduct research (simulated)
  const findings = {
    summary: 'Gmail and Calendar APIs are free and highly valuable for small businesses',
    opportunities: [
      'Email automation with AI responses',
      'Automated appointment scheduling',
      'Customer communication tracking'
    ],
    costs: {
      gmail: 0,
      calendar: 0,
      drive: 'Variable based on storage'
    },
    recommendations: [
      'Implement Gmail API for customer email automation',
      'Use Calendar API for appointment booking',
      'Consider alternatives to Google Drive for large-scale storage'
    ]
  };

  // 3. Store findings in knowledge base
  await knowledgeBaseService.completeResearchTask(
    task.id,
    findings,
    {
      category: 'google_api',
      subcategory: 'workspace',
      title: 'Google Workspace API Integration Analysis',
      summary: 'Gmail and Calendar APIs offer free, powerful automation for small businesses',
      content: `
# Google Workspace API Analysis

## Summary
${findings.summary}

## Opportunities
${findings.opportunities.map(o => `- ${o}`).join('\n')}

## Cost Analysis
- Gmail API: $${findings.costs.gmail}/month
- Calendar API: $${findings.costs.calendar}/month
- Drive API: ${findings.costs.drive}

## Recommendations
${findings.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      `,
      tags: ['google', 'workspace', 'gmail', 'calendar', 'integration'],
      keywords: ['email', 'scheduling', 'automation', 'free'],
      metadata: {
        researched: new Date().toISOString(),
        confidence: 'high',
        actionable: true
      },
      sources: [
        {
          url: 'https://developers.google.com/workspace',
          title: 'Google Workspace Developer Docs',
          date: new Date().toISOString(),
          credibility: 'official'
        }
      ],
      researchedBy: 'research_agent'
    }
  );

  console.log('Research task completed and stored in knowledge base');
}
```

## Example 4: Agent Training from Knowledge

Train an agent using knowledge base information:

```typescript
async function trainAgentWithKnowledge(agentId: string) {
  // Get relevant knowledge
  const googleKnowledge = await knowledgeBaseService.getByCategory('google_api');
  const pricingKnowledge = await knowledgeBaseService.getByTags(['pricing', 'cost']);

  // Generate training prompt
  const trainingPrompt = await knowledgeBaseService.generateAgentPrompt([
    'google_api',
    'pricing',
    'integration',
    'small_business'
  ]);

  // Update agent configuration
  console.log(`Training agent ${agentId} with knowledge base information...`);
  console.log(`Found ${googleKnowledge.length} Google API knowledge entries`);
  console.log(`Found ${pricingKnowledge.length} pricing-related entries`);

  // In a real implementation, this would update the agent's system prompt
  const updatedSystemPrompt = `
${baseSystemPrompt}

# Google Business API Knowledge

${trainingPrompt}

Use this information when discussing business tools and integrations with customers.
Always emphasize the value we provide vs. buying Google services separately.
`;

  return updatedSystemPrompt;
}
```

## Example 5: Customer Onboarding with API Insights

When onboarding a new customer, use knowledge base to provide relevant information:

```typescript
async function onboardCustomerWithApiInsights(customer: any) {
  console.log(`Onboarding ${customer.businessName}...`);

  // Get business API recommendations
  const businessProfile = {
    businessId: customer.id,
    name: customer.businessName,
    industry: customer.industry,
    location: customer.location,
    contact: customer.contact,
    googlePlaceId: customer.googlePlaceId
  };

  const recommendations = await businessResearchService.getApiRecommendations(businessProfile);

  // Show customer what we'll integrate for them
  console.log('\n🎉 Welcome to AI Biz Platform!');
  console.log('\nHere's what we're setting up for your business:\n');

  recommendations.recommendedApis.forEach(api => {
    console.log(`✓ ${api.apiName}`);
    console.log(`  ${api.reason}`);
    console.log(`  Monthly cost: $${api.estimatedCost}\n`);
  });

  console.log(`Total monthly cost: $${recommendations.costEstimate}`);
  console.log(`With Google's free tier: $${Math.max(0, recommendations.costEstimate - 200)}`);

  console.log('\n📋 Integration Plan:');
  recommendations.integrationPlan.forEach((step, i) => {
    console.log(`${i + 1}. ${step}`);
  });

  // Get specific knowledge articles to share
  const placesInfo = await knowledgeBaseService.searchKnowledge({
    query: 'places',
    category: 'google_api'
  });

  if (placesInfo.length > 0) {
    console.log('\n📚 Helpful Resources:');
    console.log(`- ${placesInfo[0].title}: ${placesInfo[0].summary}`);
  }
}
```

## Example 6: Cost Optimization Agent

Agent that helps businesses optimize Google API costs:

```typescript
async function optimizeApiCosts(businessId: string) {
  // Get all API documentation
  const allApis = await knowledgeBaseService.getAllApiDocs();
  
  // Get currently used APIs
  const currentApis = await knowledgeBaseService.getCurrentApis();
  
  // Get APIs that can be mirrored (cheaper alternatives)
  const mirrorableApis = await knowledgeBaseService.getMirrorableApis();

  console.log('💰 API Cost Optimization Report\n');
  console.log('Currently Using:');
  currentApis.forEach(api => {
    console.log(`- ${api.apiName}: ${api.pricingModel}`);
  });

  console.log('\n✨ Optimization Opportunities:');
  mirrorableApis.forEach(api => {
    if (api.alternativeApis && api.alternativeApis.length > 0) {
      console.log(`\n${api.apiName}:`);
      console.log(`  Current: ${api.pricingModel}`);
      console.log('  Alternatives:');
      api.alternativeApis.forEach((alt: any) => {
        console.log(`    - ${alt.name}: ${alt.type} (${alt.pricing || 'varies'})`);
      });
    }
  });

  // Search for cost-saving knowledge
  const costSavings = await knowledgeBaseService.searchKnowledge({
    query: 'cost optimization',
    tags: ['pricing', 'alternatives']
  });

  if (costSavings.length > 0) {
    console.log('\n💡 Cost-Saving Tips:');
    costSavings.forEach(tip => {
      console.log(`- ${tip.title}`);
    });
  }
}
```

## Example 7: Knowledge Base Maintenance

Agent that keeps knowledge base up-to-date:

```typescript
async function maintainKnowledgeBase() {
  console.log('🔄 Knowledge Base Maintenance\n');

  // Get popular knowledge (frequently accessed)
  const popular = await knowledgeBaseService.getPopularKnowledge(5);
  console.log('Most Accessed Knowledge:');
  popular.forEach(k => {
    console.log(`- ${k.title} (${k.accessCount} accesses)`);
  });

  // Get recent updates
  const recent = await knowledgeBaseService.getRecentKnowledge(5);
  console.log('\nRecently Updated:');
  recent.forEach(k => {
    console.log(`- ${k.title} (${new Date(k.updatedAt).toLocaleDateString()})`);
  });

  // Check for outdated entries (older than 90 days)
  const allKnowledge = await knowledgeBaseService.searchKnowledge({
    category: 'google_api',
    status: 'active'
  });

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const needsUpdate = allKnowledge.filter(k => 
    k.lastVerified && new Date(k.lastVerified) < ninetyDaysAgo
  );

  if (needsUpdate.length > 0) {
    console.log('\n⚠️  Entries Needing Verification:');
    needsUpdate.forEach(k => {
      console.log(`- ${k.title} (last verified: ${new Date(k.lastVerified!).toLocaleDateString()})`);
    });

    // Mark as outdated
    for (const entry of needsUpdate) {
      await knowledgeBaseService.markOutdated(entry.id);
    }
  }

  // Get active research tasks
  const tasks = await knowledgeBaseService.getActiveResearchTasks();
  console.log(`\n📋 Active Research Tasks: ${tasks.length}`);
  tasks.forEach(task => {
    console.log(`- ${task.title} (${task.priority} priority, ${task.progress}% complete)`);
  });
}
```

## Running the Examples

To run any of these examples:

```bash
# From the project root
cd /home/runner/work/chat-mvp-merge/chat-mvp-merge

# Make sure database is migrated
npm run db:push

# Run the seed script first
npx tsx server/services/seed-knowledge-base.ts

# Then access knowledge via API
curl http://localhost:5000/api/knowledge/category/google_api
```

## Integration with Existing Agents

The knowledge base is already integrated with:

- **BusinessResearchService** - Uses knowledge for API recommendations
- **AI Biz Bot** - Can access Google API information
- **Onboarding Agents** - Reference knowledge during customer setup

To add knowledge base to other agents:

```typescript
import { knowledgeBaseService } from '../services/knowledge-base';

// In any agent
async function enhanceAgentWithKnowledge(agentConfig: any) {
  // Get relevant knowledge for this agent's domain
  const knowledge = await knowledgeBaseService.generateAgentPrompt(
    agentConfig.knowledgeTags || ['business_tools', 'google_api']
  );

  // Add to system prompt
  agentConfig.systemPrompt = `
${agentConfig.systemPrompt}

# Knowledge Base

${knowledge}
`;

  return agentConfig;
}
```

---

**Next Steps:**
1. Run the seed script to populate initial knowledge
2. Test API endpoints with curl or Postman
3. Integrate knowledge base into more agents
4. Set up scheduled maintenance tasks
5. Add more research as new APIs are discovered
