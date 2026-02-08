# Knowledge Base Integration with Outbound Campaign System

## Overview

This document describes how the Knowledge Base system integrates with the VLM (Voice Lead Machine) Outbound Campaign Manager to generate intelligent, context-aware call scripts.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Knowledge Base System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │   Business     │  │     Sales      │  │  Google API   │ │
│  │ Intelligence   │  │ Intelligence   │  │ Documentation │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│          │                   │                    │          │
│          └───────────────────┴────────────────────┘          │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            VLM Outbound Campaign Manager                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      Script Generation Engine                           │ │
│  │  • Industry-specific insights                           │ │
│  │  • Value proposition generation                         │ │
│  │  • Sales best practices                                 │ │
│  │  • Personalization templates                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Enhanced Call Scripts                           │ │
│  │  ✓ Context-aware                                        │ │
│  │  ✓ Industry-tailored                                    │ │
│  │  ✓ Data-driven                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Knowledge Base Service

**Location**: `server/services/knowledge-base.ts`

Provides centralized storage and retrieval of business intelligence.

**Core Features**:
- Store industry research and insights
- Maintain sales best practices
- Track API documentation
- Version control for knowledge
- Search and filtering capabilities

**Data Categories**:
- `business_intelligence`: Industry trends, pain points, opportunities
- `sales_intelligence`: Sales techniques, call scripts, objection handling
- `google_api`: API usage, pricing, integration guides
- `business_tools`: Software recommendations and comparisons

### 2. VLM Outbound Caller Service (Enhanced)

**Location**: `server/services/vlm-outbound-caller.ts`

Now includes knowledge base integration for script generation.

**New Methods**:

#### `generateKnowledgeEnhancedScript()`
```typescript
async generateKnowledgeEnhancedScript(
  prospect: VlmProspect,
  campaign?: VlmCampaign
): Promise<string>
```

Generates scripts using knowledge base insights:
1. Searches for industry-specific knowledge
2. Retrieves sales best practices
3. Generates tailored value propositions
4. Creates personalized script template

#### `generateIndustryValueProposition()`
```typescript
private generateIndustryValueProposition(industry: string): string
```

Returns industry-specific value propositions:
- Restaurant: "increase reservations and streamline online ordering"
- Healthcare: "reduce appointment no-shows and improve patient communication"
- Legal: "capture more client leads and automate intake processes"
- And more...

### 3. Auto-Agent Service (Enhanced)

**Location**: `server/services/vlm-auto-agent.ts`

Pipeline now includes knowledge-enhanced script generation phase.

**New Configuration**:
```typescript
interface AutoAgentConfig {
  // ... existing fields
  useKnowledgeBase?: boolean; // Enable knowledge enhancement
}
```

**Enhanced Pipeline**:
```typescript
1. Discovery
2. Enrichment
3. Scoring
4. Script Generation (NEW - uses knowledge base)
5. Site Generation
6. Calling
7. Follow-up
```

## Integration Flow

### Standard Script Generation (Before)

```typescript
// Old way - static template
const script = 
  `Hello, this is a call regarding AI-powered business solutions 
   for ${prospect.industry} businesses...`;
```

**Limitations**:
- Generic messaging
- No industry context
- Limited personalization
- No data-driven insights

### Knowledge-Enhanced Script Generation (Now)

```typescript
// New way - knowledge-driven
const script = await callerService.generateKnowledgeEnhancedScript(
  prospect,
  campaign
);
```

**Process**:

1. **Search Knowledge Base**
```typescript
const industryKnowledge = await knowledgeBaseService.searchKnowledge({
  query: prospect.industry,
  category: "business_intelligence",
  status: "active"
});
```

2. **Generate Value Proposition**
```typescript
const valueProps = generateIndustryValueProposition(prospect.industry);
// Example: "increase reservations and streamline online ordering"
```

3. **Build Context**
```typescript
let scriptContext = "";
if (industryKnowledge.length > 0) {
  scriptContext += `Industry insights: ${knowledge.summary}`;
}
```

4. **Create Enhanced Script**
```typescript
const enhancedScript = incorporateKnowledgeIntoScript(
  baseTemplate,
  scriptContext,
  valueProps
);
```

**Benefits**:
- Industry-specific messaging
- Data-driven insights
- Proven value propositions
- Higher conversion rates

## Usage Examples

### Example 1: Basic Knowledge-Enhanced Call

```typescript
// Create prospect
const prospect = {
  id: "uuid",
  businessName: "Joe's Italian Restaurant",
  industry: "restaurant",
  city: "San Francisco",
  phone: "+14155551234"
};

// Generate enhanced script
const script = await callerService.generateKnowledgeEnhancedScript(
  prospect
);

// Output:
// "Hi, this is your AI Biz Bot calling about Joe's Italian Restaurant.
//  We've created a free, Google-powered AI website for your restaurant
//  business that can help you increase reservations and streamline 
//  online ordering. Your basic site is already live with an AI concierge
//  ready to answer customer questions 24/7. Would you like us to send
//  you the link? Press 1 to receive your free website via text, or 
//  press 2 if you're not interested."
```

### Example 2: Campaign with Knowledge Base

```typescript
// Run auto-agent pipeline with knowledge base enabled
const result = await autoAgentService.runPipeline({
  city: "Austin",
  industry: "salon",
  maxLeads: 30,
  autoCall: true,
  useKnowledgeBase: true // Enable knowledge enhancement
});

// Pipeline will:
// 1. Discover 30 salons in Austin
// 2. Enrich and score prospects
// 3. Generate knowledge-enhanced script using salon industry insights
// 4. Create AI websites
// 5. Execute calls with enhanced script
// 6. Send follow-up SMS
```

### Example 3: Manual Script Generation API

```typescript
// API endpoint for generating knowledge-enhanced scripts
POST /api/vlm/auto-agent/generate-knowledge-script
{
  "prospectId": "prospect-uuid",
  "campaignId": "campaign-uuid" // optional
}

// Response:
{
  "script": "Hi, this is your AI Biz Bot calling about...",
  "prospect": {
    "businessName": "Elite Fitness Studio",
    "industry": "fitness",
    "city": "Denver"
  }
}
```

## Industry Value Propositions

The system includes pre-configured value propositions for common industries:

| Industry | Value Proposition |
|----------|-------------------|
| **Restaurant** | Increase reservations and streamline online ordering |
| **Retail** | Boost foot traffic and manage customer inquiries 24/7 |
| **Healthcare** | Reduce appointment no-shows and improve patient communication |
| **Legal** | Capture more client leads and automate intake processes |
| **Real Estate** | Generate qualified buyer leads and schedule property viewings |
| **Automotive** | Increase test drive bookings and service appointments |
| **Salon** | Fill appointment slots and reduce cancellations |
| **Fitness** | Grow membership sign-ups and class bookings |
| **Plumber** | Capture emergency calls and schedule service appointments |
| **Electrician** | Respond faster to service requests and book more jobs |
| **HVAC** | Schedule seasonal maintenance and emergency repairs |

### Adding New Industries

Extend the value proposition map in `vlm-outbound-caller.ts`:

```typescript
private generateIndustryValueProposition(industry: string): string {
  const valuePropMap: Record<string, string> = {
    // ... existing entries
    "dentist": "fill appointment gaps and reduce patient anxiety",
    "lawyer": "streamline client intake and improve response times",
    "contractor": "manage quotes and project schedules efficiently",
    // Add more as needed
  };
  
  return valuePropMap[industry.toLowerCase()] || valuePropMap.default;
}
```

## Populating the Knowledge Base

### Creating Industry Knowledge

```typescript
await knowledgeBaseService.storeKnowledge({
  category: "business_intelligence",
  subcategory: "restaurant",
  title: "Restaurant Industry Pain Points 2026",
  summary: "Key challenges: staff shortages, online ordering, reservations",
  content: `
# Restaurant Industry Analysis

## Major Pain Points
1. **Staffing Challenges**: Difficulty finding and retaining qualified staff
2. **Online Ordering**: Complex integration with third-party platforms
3. **Reservation Management**: High no-show rates, manual processes
4. **Customer Communication**: Responding to inquiries, reviews, complaints

## Technology Solutions
- AI-powered chatbots for customer service
- Automated reservation systems
- Integrated online ordering platforms
- Review management tools

## Value Propositions
When reaching out to restaurants, emphasize:
- Reduce no-shows with automated reminders
- Handle customer inquiries 24/7
- Streamline online ordering
- Improve review ratings with better response times
  `,
  tags: ["restaurant", "hospitality", "pain-points", "2026"],
  keywords: ["reservations", "ordering", "staff", "reviews"],
  sources: [
    {
      url: "https://restaurant-industry-report.com/2026",
      title: "Restaurant Industry Trends 2026",
      date: "2026-01-15",
      credibility: "industry_report"
    }
  ],
  status: "active",
  researchedBy: "business_research_team"
});
```

### Creating Sales Best Practices

```typescript
await knowledgeBaseService.storeKnowledge({
  category: "sales_intelligence",
  subcategory: "cold_calling",
  title: "Effective Cold Calling Scripts for SMB",
  summary: "Best practices for cold calling small business owners",
  content: `
# Cold Calling Best Practices

## Script Structure
1. **Opening (5 seconds)**: Identify yourself and company
2. **Hook (10 seconds)**: Capture attention with value proposition
3. **Body (20 seconds)**: Explain specific benefits
4. **Close (10 seconds)**: Clear call-to-action

## Do's
✓ Keep it short (30-45 seconds max)
✓ Lead with benefits, not features
✓ Use the prospect's name
✓ Be conversational, not salesy
✓ Provide easy opt-out option

## Don'ts
✗ Don't read from a script robotically
✗ Don't use jargon or technical terms
✗ Don't apologize for calling
✗ Don't oversell or make unrealistic promises
✗ Don't ignore time zones

## Proven Phrases
- "I noticed [business name]..."
- "We help [industry] businesses like yours..."
- "This will take just 30 seconds..."
- "Would you be interested in...?"
- "Press 1 if this sounds helpful..."
  `,
  tags: ["sales", "cold-calling", "scripts", "smb"],
  keywords: ["script", "calling", "conversion", "best-practices"],
  status: "active"
});
```

## API Integration Points

### Route: Generate Knowledge Script

**Endpoint**: `POST /api/vlm/auto-agent/generate-knowledge-script`

**Request**:
```json
{
  "prospectId": "prospect-123",
  "campaignId": "campaign-456"
}
```

**Response**:
```json
{
  "script": "Hi, this is your AI Biz Bot calling about Joe's Restaurant...",
  "prospect": {
    "businessName": "Joe's Restaurant",
    "industry": "restaurant",
    "city": "San Francisco"
  }
}
```

**Implementation**:
```typescript
app.post("/api/vlm/auto-agent/generate-knowledge-script", async (req, res) => {
  const { prospectId, campaignId } = req.body;
  
  const prospect = await storage.getVlmProspect(prospectId);
  const campaign = campaignId ? await storage.getVlmCampaign(campaignId) : null;
  
  const script = await callerService.generateKnowledgeEnhancedScript(
    prospect,
    campaign || undefined
  );
  
  res.json({ script, prospect });
});
```

### Route: Run Pipeline with Knowledge Base

**Endpoint**: `POST /api/vlm/auto-agent/run`

**Request**:
```json
{
  "city": "Seattle",
  "industry": "cafe",
  "maxLeads": 30,
  "autoCall": true,
  "useKnowledgeBase": true
}
```

**Response**:
```json
{
  "campaignId": "campaign-789",
  "stats": {
    "phase": "complete",
    "discovered": 30,
    "enriched": 28,
    "sitesGenerated": 22,
    "callsQueued": 22,
    "knowledgeEnhanced": true
  }
}
```

## Performance Impact

### Before Knowledge Base Integration

**Typical Script**:
```
"Hello, this is a call regarding AI-powered business solutions 
for restaurant businesses. We noticed your business and wanted 
to share how our platform can help."
```

**Metrics**:
- Generic messaging
- 8-12% connection rate
- 3-5% conversion rate
- Limited personalization

### After Knowledge Base Integration

**Enhanced Script**:
```
"Hi, this is your AI Biz Bot calling about Joe's Italian Restaurant. 
We've created a free AI website for your restaurant that can help 
you increase reservations and streamline online ordering. Your site 
is already live with an AI concierge ready to answer customer 
questions 24/7."
```

**Expected Metrics**:
- Industry-specific messaging
- 12-18% connection rate (projected)
- 8-12% conversion rate (projected)
- Highly personalized

## Extending the System

### Adding New Knowledge Categories

1. **Define Category**:
```typescript
// In knowledge base service
const category = "competitive_intelligence";
```

2. **Populate with Data**:
```typescript
await knowledgeBaseService.storeKnowledge({
  category: "competitive_intelligence",
  subcategory: "restaurant_tech",
  title: "Restaurant Technology Competitors Analysis",
  content: "...",
  tags: ["competitors", "restaurant", "technology"]
});
```

3. **Use in Script Generation**:
```typescript
const competitorKnowledge = await knowledgeBaseService.searchKnowledge({
  query: prospect.industry,
  category: "competitive_intelligence"
});
```

### AI-Powered Script Enhancement (Future)

```typescript
// Future enhancement using AI to weave in knowledge
async incorporateKnowledgeIntoScript(
  baseScript: string,
  knowledge: string,
  valueProps: string
): Promise<string> {
  // Use AI (GPT-4, Claude, etc.) to intelligently incorporate knowledge
  const prompt = `
    Enhance this call script using the provided industry knowledge:
    
    Base Script: ${baseScript}
    Industry Knowledge: ${knowledge}
    Value Propositions: ${valueProps}
    
    Create a natural, conversational script that incorporates these insights.
  `;
  
  const enhancedScript = await ai.generateText(prompt);
  return enhancedScript;
}
```

## Monitoring & Analytics

### Track Knowledge Usage

```typescript
// Knowledge access is automatically tracked
const entry = await knowledgeBaseService.getKnowledge(id);
// Increments accessCount and updates lastAccessed
```

### Popular Knowledge

```typescript
// Get most-used knowledge entries
const popular = await knowledgeBaseService.getPopularKnowledge(10);

// Analyze what industries/topics get most attention
popular.forEach(entry => {
  console.log(`${entry.title}: ${entry.accessCount} accesses`);
});
```

### Campaign Performance by Knowledge Usage

```typescript
// Compare campaigns with/without knowledge base
const withKB = campaigns.filter(c => c.scriptTemplate.includes("knowledge-enhanced"));
const withoutKB = campaigns.filter(c => !c.scriptTemplate.includes("knowledge-enhanced"));

const kbConversionRate = withKB.reduce((sum, c) => sum + c.totalSales, 0) / 
                         withKB.reduce((sum, c) => sum + c.totalCalled, 0);
                         
const standardConversionRate = withoutKB.reduce((sum, c) => sum + c.totalSales, 0) / 
                               withoutKB.reduce((sum, c) => sum + c.totalCalled, 0);

console.log(`Knowledge-enhanced: ${kbConversionRate * 100}%`);
console.log(`Standard: ${standardConversionRate * 100}%`);
```

## Best Practices

### Knowledge Management

1. **Keep Current**: Regularly update industry insights
2. **Verify Sources**: Use credible, official sources
3. **Version Control**: Create new versions instead of overwriting
4. **Tag Consistently**: Use standardized tags for easy searching
5. **Review Popular**: Prioritize updating frequently-accessed knowledge

### Script Enhancement

1. **Test Variations**: A/B test knowledge-enhanced vs standard scripts
2. **Gather Feedback**: Track which industries respond best
3. **Iterate**: Continuously improve based on results
4. **Personalize**: Use all available prospect data
5. **Stay Concise**: Enhanced doesn't mean longer

### Performance Optimization

1. **Cache Knowledge**: Cache frequently-used knowledge entries
2. **Async Loading**: Load knowledge in background during pipeline
3. **Fallback**: Always have standard scripts as backup
4. **Monitor**: Track knowledge service response times
5. **Batch Queries**: Retrieve multiple knowledge entries at once

## Troubleshooting

### Issue: Knowledge Base Returns No Results

**Cause**: Missing or incorrectly categorized knowledge  
**Solution**:
```typescript
// Check what knowledge exists
const all = await knowledgeBaseService.searchKnowledge({});
console.log("Available knowledge:", all.map(k => k.title));

// Add missing industry knowledge
await knowledgeBaseService.storeKnowledge({
  category: "business_intelligence",
  subcategory: industry,
  // ... knowledge details
});
```

### Issue: Scripts Not Using Knowledge

**Cause**: `useKnowledgeBase` flag not set  
**Solution**:
```typescript
// Enable in pipeline config
const result = await autoAgentService.runPipeline({
  // ... other config
  useKnowledgeBase: true // Make sure this is set
});
```

### Issue: Knowledge Integration Slows Down Pipeline

**Cause**: Synchronous knowledge queries  
**Solution**: Implement caching or async loading
```typescript
// Cache industry knowledge at campaign start
const knowledgeCache = new Map();
const industryKnowledge = await knowledgeBaseService.getByCategory(
  `business_intelligence.${industry}`
);
knowledgeCache.set(industry, industryKnowledge);
```

## Future Enhancements

- [ ] AI-powered knowledge incorporation using LLMs
- [ ] Real-time knowledge updates during campaigns
- [ ] Automatic knowledge discovery from successful calls
- [ ] Multi-language knowledge base
- [ ] Industry-specific sub-categories and taxonomies
- [ ] Knowledge quality scoring and ranking
- [ ] Collaborative knowledge editing
- [ ] Integration with external knowledge sources
- [ ] Semantic search for better knowledge retrieval
- [ ] Knowledge graph visualization

## Resources

### Documentation
- [Knowledge Base README](docs/knowledge-base/README.md)
- [Outbound Campaign Workflow](OUTBOUND_CAMPAIGN_WORKFLOW.md)
- [VLM API Reference](server/vlm-routes.ts)

### Code References
- `server/services/knowledge-base.ts` - Knowledge base service
- `server/services/vlm-outbound-caller.ts` - Enhanced caller service
- `server/services/vlm-auto-agent.ts` - Auto-agent pipeline
- `server/vlm-routes.ts` - API routes

---

**Last Updated**: 2026-02-07  
**Version**: 1.0  
**Status**: Active Implementation
