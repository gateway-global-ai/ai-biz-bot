# Outbound Campaign Quick Start Guide

## Overview

This guide provides quick instructions for using the VLM (Voice Lead Machine) Outbound Campaign System with Knowledge Base integration.

## Prerequisites

1. **Environment Variables**:
   ```bash
   GOOGLE_CLOUD_API_KEY=your_google_api_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

2. **Knowledge Base Seeded**:
   ```bash
   npm run db:push  # Push database schema
   tsx server/services/seed-knowledge-base.ts  # Seed knowledge
   ```

## Quick Start: Run a Campaign in 5 Minutes

### Option 1: Full Auto-Agent Pipeline (Recommended)

The easiest way to run a complete campaign:

```bash
# Using curl
curl -X POST http://localhost:5000/api/vlm/auto-agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "city": "San Francisco",
    "industry": "restaurant",
    "maxLeads": 20,
    "enrichEmails": true,
    "autoGenerateSites": true,
    "autoCall": true,
    "minQualityScore": 50,
    "useKnowledgeBase": true
  }'
```

```typescript
// Using TypeScript/JavaScript
const response = await fetch('/api/vlm/auto-agent/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    city: "Austin",
    industry: "salon",
    maxLeads: 30,
    enrichEmails: true,
    autoGenerateSites: true,
    autoCall: true,
    minQualityScore: 50,
    useKnowledgeBase: true  // Enable knowledge-enhanced scripts
  })
});

const result = await response.json();
console.log('Campaign ID:', result.campaignId);
console.log('Stats:', result.stats);
```

**What happens automatically**:
1. ✅ Discovers leads from Google Places
2. ✅ Enriches with emails and website analysis
3. ✅ Scores and qualifies prospects
4. ✅ Generates knowledge-enhanced call scripts
5. ✅ Creates AI-powered websites
6. ✅ Makes outbound calls via Twilio
7. ✅ Sends SMS to interested prospects

**Expected Results** (20 leads):
- Discovered: ~18-20 businesses
- Qualified: ~12-15 (score ≥ 50)
- Calls Made: ~12-15
- Connected: ~4-5 (30% rate)
- Interested: ~1-2 (10% conversion)
- Time: 5-10 minutes
- Cost: ~$1.50

### Option 2: Step-by-Step Manual Process

For more control, run each step manually:

#### Step 1: Discover Leads

```bash
curl -X POST http://localhost:5000/api/vlm/discover \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Seattle",
    "industry": "cafe",
    "maxResults": 30,
    "enrichEmail": true
  }'
```

**Response**:
```json
{
  "discovered": 28,
  "enriched": 28,
  "saved": 28,
  "prospects": [
    {
      "id": "uuid",
      "businessName": "Blue Coffee House",
      "industry": "cafe",
      "phone": "+12065551234",
      "email": "contact@bluecoffee.com",
      "qualityScore": 75,
      ...
    }
  ]
}
```

#### Step 2: Create Campaign

```bash
curl -X POST http://localhost:5000/api/vlm/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Seattle Cafe Outreach",
    "industry": "cafe",
    "city": "Seattle",
    "status": "active"
  }'
```

#### Step 3: Generate Knowledge-Enhanced Script (Optional)

```bash
curl -X POST http://localhost:5000/api/vlm/auto-agent/generate-knowledge-script \
  -H "Content-Type: application/json" \
  -d '{
    "prospectId": "prospect-uuid",
    "campaignId": "campaign-uuid"
  }'
```

**Response**:
```json
{
  "script": "Hi, this is your AI Biz Bot calling about Blue Coffee House...",
  "prospect": {
    "businessName": "Blue Coffee House",
    "industry": "cafe",
    "city": "Seattle"
  }
}
```

#### Step 4: Make Individual Calls

```bash
curl -X POST http://localhost:5000/api/vlm/call \
  -H "Content-Type: application/json" \
  -d '{
    "prospectId": "prospect-uuid",
    "campaignId": "campaign-uuid"
  }'
```

## Common Use Cases

### Use Case 1: Local Business Outreach

**Scenario**: Target restaurants in a specific city

```typescript
await fetch('/api/vlm/auto-agent/run', {
  method: 'POST',
  body: JSON.stringify({
    city: "Denver",
    industry: "restaurant",
    maxLeads: 50,
    autoCall: true,
    useKnowledgeBase: true,
    minQualityScore: 60  // Higher threshold for quality
  })
});
```

### Use Case 2: Service Business Campaign

**Scenario**: Find and call HVAC companies

```typescript
await fetch('/api/vlm/auto-agent/run', {
  method: 'POST',
  body: JSON.stringify({
    city: "Phoenix",
    industry: "hvac",
    maxLeads: 30,
    enrichEmails: true,
    autoGenerateSites: true,
    autoCall: true,
    useKnowledgeBase: true,
    callDelayMs: 5000  // 5 second delay between calls
  })
});
```

### Use Case 3: Healthcare Practices

**Scenario**: Dentists and medical offices

```typescript
await fetch('/api/vlm/auto-agent/run', {
  method: 'POST',
  body: JSON.stringify({
    city: "Boston",
    industry: "dentist",
    maxLeads: 40,
    autoCall: true,
    useKnowledgeBase: true,
    minQualityScore: 70  // Even higher quality for healthcare
  })
});
```

### Use Case 4: Test Script Without Calling

**Scenario**: Generate and review scripts before launching campaign

```typescript
// Step 1: Discover leads (no calling)
const discovery = await fetch('/api/vlm/discover', {
  method: 'POST',
  body: JSON.stringify({
    city: "Portland",
    industry: "salon",
    maxResults: 10,
    enrichEmail: false
  })
});

const { prospects } = await discovery.json();

// Step 2: Generate script for review
const scriptResponse = await fetch('/api/vlm/auto-agent/generate-knowledge-script', {
  method: 'POST',
  body: JSON.stringify({
    prospectId: prospects[0].id
  })
});

const { script } = await scriptResponse.json();
console.log('Script preview:', script);

// Review and approve before enabling autoCall: true
```

## Configuration Options

### Auto-Agent Pipeline Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `city` | string | required | Target city for lead discovery |
| `industry` | string | required | Business industry (restaurant, salon, etc.) |
| `maxLeads` | number | 20 | Maximum leads to discover (1-200) |
| `enrichEmails` | boolean | false | Scrape websites for email addresses |
| `autoGenerateSites` | boolean | true | Create AI websites for prospects |
| `autoCall` | boolean | false | Automatically make calls |
| `minQualityScore` | number | 40 | Minimum score to qualify (0-100) |
| `callScript` | string | auto | Custom script template (optional) |
| `callerIdNumber` | string | default | Custom caller ID (optional) |
| `callDelayMs` | number | 3000 | Delay between calls in milliseconds |
| `useKnowledgeBase` | boolean | true | Enable knowledge-enhanced scripts |

### Supported Industries

Pre-configured value propositions for:
- restaurant
- retail
- healthcare (dentist, doctor, clinic)
- legal (lawyer, attorney)
- real estate (realtor, agent)
- automotive (dealer, mechanic)
- salon (hair, beauty, spa)
- fitness (gym, studio, trainer)
- plumber
- electrician
- hvac
- contractor
- and more...

## Monitoring & Analytics

### Check Campaign Progress

```bash
# Get progress
curl http://localhost:5000/api/vlm/auto-agent/progress

# Response
{
  "phase": "calling",
  "message": "Queuing 15 outbound calls...",
  "discovered": 20,
  "enriched": 18,
  "sitesGenerated": 15,
  "callsQueued": 8,
  "callsComplete": 0,
  "knowledgeEnhanced": true,
  "errors": []
}
```

### View Campaign Stats

```bash
# Get overall stats
curl http://localhost:5000/api/vlm/stats

# Response
{
  "totalProspects": 150,
  "prospectsWithPhone": 120,
  "avgQualityScore": 65,
  "totalCalls": 80,
  "totalConnected": 24,
  "totalSales": 8,
  "connectionRate": 30
}
```

### Get Campaign Report

```bash
# Get detailed report for specific campaign
curl http://localhost:5000/api/vlm/auto-agent/report/campaign-uuid

# Response
{
  "campaign": { ... },
  "summary": {
    "totalLeads": 20,
    "qualified": 15,
    "called": 15,
    "connected": 5,
    "interested": 2,
    "sitesGenerated": 15,
    "smsSent": 2,
    "conversionRate": "13%"
  }
}
```

## Best Practices

### 1. Start Small

**Don't**: Launch with 200 leads immediately  
**Do**: Start with 10-20 leads to test

```typescript
{
  maxLeads: 10,  // Test with small batch first
  autoCall: false  // Review before calling
}
```

### 2. Use Knowledge Base

**Always enable knowledge base** for better results:

```typescript
{
  useKnowledgeBase: true  // ✅ Enhanced scripts
}
```

### 3. Optimize Calling Hours

Only call during business hours (9 AM - 6 PM local time):

```typescript
// Check time before running
const hour = new Date().getHours();
if (hour < 9 || hour > 18) {
  console.log('Wait until business hours');
  return;
}
```

### 4. Set Quality Thresholds

Higher scores = better results:

```typescript
{
  minQualityScore: 60  // Focus on quality over quantity
}
```

### 5. Review Scripts First

Test script generation before calling:

```typescript
// Generate script without calling
const script = await generateKnowledgeScript(prospectId);
console.log('Review:', script);

// If good, proceed with campaign
if (scriptLooksGood) {
  runPipeline({ autoCall: true });
}
```

### 6. Respect Opt-Outs

Always honor opt-out requests (press 2):
- Prospect marked as "lost"
- Excluded from future campaigns
- Never called again

### 7. Monitor Results

Check results regularly:
- Review connection rates
- Analyze conversion rates
- Adjust targeting based on performance

## Troubleshooting

### Issue: No leads discovered

**Possible Causes**:
- City name incorrect
- Industry too specific
- Google Places API quota exceeded

**Solutions**:
```typescript
// Try broader search
{
  industry: "restaurant",  // Instead of "italian restaurant"
  city: "San Francisco"    // Full city name
}
```

### Issue: Low connection rates

**Possible Causes**:
- Calling outside business hours
- Poor quality leads
- Technical phone issues

**Solutions**:
```typescript
{
  minQualityScore: 70,  // Increase quality threshold
  // Call during peak hours (10-11 AM, 2-4 PM)
}
```

### Issue: Scripts not enhanced

**Possible Causes**:
- Knowledge base not seeded
- `useKnowledgeBase` flag not set

**Solutions**:
```bash
# Seed knowledge base
tsx server/services/seed-knowledge-base.ts

# Enable in config
{
  useKnowledgeBase: true
}
```

### Issue: Twilio errors

**Possible Causes**:
- Invalid phone numbers
- Twilio credentials wrong
- Insufficient balance

**Solutions**:
```bash
# Verify environment variables
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER

# Check Twilio balance
# Visit: https://console.twilio.com
```

## Cost Estimation

### Per-Lead Costs

| Item | Cost | Notes |
|------|------|-------|
| Google Places API | $0.032 | Basic fields |
| Twilio Call (no answer) | $0.0175 | ~30 seconds |
| Twilio Call (connected) | $0.035 | ~1 minute |
| Twilio SMS | $0.0079 | Follow-up message |
| AI Processing | $0.01 | Website generation |

### Example Campaign Cost

**20 leads, 12 qualify, 4 connect, 2 interested**:
- Discovery: 20 × $0.032 = $0.64
- Calling: 12 × $0.0175 = $0.21
- Connected: 4 × $0.0175 = $0.07
- SMS: 2 × $0.0079 = $0.02
- AI: 12 × $0.01 = $0.12

**Total: ~$1.06** for potential **$1,000+ in business value**

## Advanced Features

### Custom Script Templates

Override default with your own:

```typescript
{
  callScript: `Hi, this is {businessName}. We specialize in helping 
  {industry} businesses in {city}. Custom message here...
  Press 1 for more info, press 2 to opt out.`,
  useKnowledgeBase: true  // Still enhances with value props
}
```

### Custom Caller ID

Use your own phone number:

```typescript
{
  callerIdNumber: "+14155551234"  // Your verified Twilio number
}
```

### Batch Processing

Process multiple cities/industries:

```typescript
const campaigns = [
  { city: "SF", industry: "restaurant" },
  { city: "LA", industry: "restaurant" },
  { city: "Seattle", industry: "cafe" }
];

for (const config of campaigns) {
  await fetch('/api/vlm/auto-agent/run', {
    method: 'POST',
    body: JSON.stringify({
      ...config,
      maxLeads: 30,
      autoCall: true,
      useKnowledgeBase: true
    })
  });
  
  // Wait between campaigns
  await new Promise(r => setTimeout(r, 60000));
}
```

## API Reference

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vlm/discover` | POST | Discover leads |
| `/api/vlm/campaigns` | POST | Create campaign |
| `/api/vlm/call` | POST | Make single call |
| `/api/vlm/auto-agent/run` | POST | Run full pipeline |
| `/api/vlm/auto-agent/generate-knowledge-script` | POST | Generate enhanced script |
| `/api/vlm/auto-agent/progress` | GET | Check progress |
| `/api/vlm/auto-agent/report/:id` | GET | Campaign report |
| `/api/vlm/stats` | GET | Overall stats |

See [OUTBOUND_CAMPAIGN_WORKFLOW.md](OUTBOUND_CAMPAIGN_WORKFLOW.md) for complete API documentation.

## Resources

- **Workflow Guide**: [OUTBOUND_CAMPAIGN_WORKFLOW.md](OUTBOUND_CAMPAIGN_WORKFLOW.md)
- **Integration Guide**: [KNOWLEDGE_BASE_INTEGRATION.md](KNOWLEDGE_BASE_INTEGRATION.md)
- **System Analysis**: [OUTBOUND_CAMPAIGN_ANALYSIS.md](OUTBOUND_CAMPAIGN_ANALYSIS.md)
- **Knowledge Base**: [docs/knowledge-base/README.md](docs/knowledge-base/README.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review documentation files
3. Check server logs for detailed errors
4. Verify environment variables are set

---

**Version**: 1.0  
**Last Updated**: 2026-02-07  
**Quick Start Estimated Time**: 5-10 minutes
