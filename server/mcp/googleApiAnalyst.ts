import { chat, GEMINI_MODELS, type GatewayMessage } from '../ai-gateway';

const GOOGLE_API_PRICING: Record<string, {
  name: string;
  category: string;
  costPer1000: number;
  costPerRequest: number;
  freeMonthly: number;
  tier: string;
  notes: string;
}> = {
  'places_details_essentials': {
    name: 'Place Details (Essentials)',
    category: 'Places',
    costPer1000: 3.00,
    costPerRequest: 0.003,
    freeMonthly: 10000,
    tier: 'Essentials',
    notes: 'Basic location data: name, address, geometry'
  },
  'places_details_pro': {
    name: 'Place Details (Pro)',
    category: 'Places',
    costPer1000: 10.00,
    costPerRequest: 0.010,
    freeMonthly: 10000,
    tier: 'Pro',
    notes: 'Contact info, hours, website, phone'
  },
  'places_details_enterprise': {
    name: 'Place Details (Enterprise)',
    category: 'Places',
    costPer1000: 20.00,
    costPerRequest: 0.020,
    freeMonthly: 10000,
    tier: 'Enterprise',
    notes: 'Reviews, ratings, price level'
  },
  'places_details_enterprise_atmosphere': {
    name: 'Place Details (Enterprise + Atmosphere)',
    category: 'Places',
    costPer1000: 25.00,
    costPerRequest: 0.025,
    freeMonthly: 10000,
    tier: 'Enterprise',
    notes: 'User photos, atmosphere data'
  },
  'places_text_search_essentials': {
    name: 'Text Search (Essentials)',
    category: 'Places',
    costPer1000: 10.00,
    costPerRequest: 0.010,
    freeMonthly: 10000,
    tier: 'Essentials',
    notes: 'Text-based place search, returns place IDs and basic data'
  },
  'places_text_search_pro': {
    name: 'Text Search (Pro)',
    category: 'Places',
    costPer1000: 25.00,
    costPerRequest: 0.025,
    freeMonthly: 10000,
    tier: 'Pro',
    notes: 'Text search with contact and hours data'
  },
  'places_text_search_enterprise': {
    name: 'Text Search (Enterprise)',
    category: 'Places',
    costPer1000: 40.00,
    costPerRequest: 0.040,
    freeMonthly: 10000,
    tier: 'Enterprise',
    notes: 'Text search with reviews and atmosphere'
  },
  'places_aggregate_insights': {
    name: 'Area Insights (Aggregate)',
    category: 'Places',
    costPer1000: 10.00,
    costPerRequest: 0.010,
    freeMonthly: 10000,
    tier: 'Pro',
    notes: 'Count-only aggregate data by area, no individual place details'
  },
  'places_nearby_search': {
    name: 'Nearby Search',
    category: 'Places',
    costPer1000: 10.00,
    costPerRequest: 0.010,
    freeMonthly: 10000,
    tier: 'Essentials',
    notes: 'Search by location and radius'
  },
  'geocoding': {
    name: 'Geocoding',
    category: 'Geocoding',
    costPer1000: 5.00,
    costPerRequest: 0.005,
    freeMonthly: 10000,
    tier: 'Essentials',
    notes: 'Address to coordinates and reverse'
  },
  'maps_grounding_gemini': {
    name: 'Grounding with Google Maps (Gemini API)',
    category: 'AI/Maps',
    costPer1000: 25.00,
    costPerRequest: 0.025,
    freeMonthly: 15000,
    tier: 'Pro',
    notes: '500 free/day (~15K/month). Charged only when grounded result returned'
  },
  'grounding_lite_mcp': {
    name: 'Grounding Lite (MCP Server)',
    category: 'AI/Maps',
    costPer1000: 10.00,
    costPerRequest: 0.010,
    freeMonthly: 10000,
    tier: 'Essentials',
    notes: 'MCP server for LLMs. Pricing follows underlying Places/Routes API SKUs'
  },
  'directions': {
    name: 'Directions',
    category: 'Routes',
    costPer1000: 5.00,
    costPerRequest: 0.005,
    freeMonthly: 10000,
    tier: 'Essentials',
    notes: 'Route computation with distance and duration'
  },
};

export interface ApiUsageScenario {
  apiId: string;
  monthlyVolume: number;
  description?: string;
}

export interface CostAnalysisResult {
  scenarios: {
    apiName: string;
    apiId: string;
    monthlyVolume: number;
    freeAllowance: number;
    billableRequests: number;
    monthlyCost: number;
    costPerRequest: number;
  }[];
  totalMonthlyCost: number;
  totalFreeRequests: number;
  analysis: string;
}

export interface RateLimitRecommendation {
  apiId: string;
  apiName: string;
  recommendedDailyLimit: number;
  recommendedMonthlyBudget: number;
  maxBurstPerMinute: number;
  reasoning: string;
}

export interface PricingStrategy {
  serviceName: string;
  costBasis: number;
  recommendedPrice: number;
  margin: number;
  rationale: string;
}

export function getAvailableApis(): typeof GOOGLE_API_PRICING {
  return { ...GOOGLE_API_PRICING };
}

export function calculateCosts(scenarios: ApiUsageScenario[]): CostAnalysisResult {
  const results = scenarios.map(scenario => {
    const api = GOOGLE_API_PRICING[scenario.apiId];
    if (!api) {
      return {
        apiName: scenario.apiId,
        apiId: scenario.apiId,
        monthlyVolume: scenario.monthlyVolume,
        freeAllowance: 0,
        billableRequests: scenario.monthlyVolume,
        monthlyCost: 0,
        costPerRequest: 0,
      };
    }

    const billableRequests = Math.max(0, scenario.monthlyVolume - api.freeMonthly);
    const monthlyCost = parseFloat((billableRequests * api.costPerRequest).toFixed(2));

    return {
      apiName: api.name,
      apiId: scenario.apiId,
      monthlyVolume: scenario.monthlyVolume,
      freeAllowance: api.freeMonthly,
      billableRequests,
      monthlyCost,
      costPerRequest: api.costPerRequest,
    };
  });

  return {
    scenarios: results,
    totalMonthlyCost: parseFloat(results.reduce((sum, r) => sum + r.monthlyCost, 0).toFixed(2)),
    totalFreeRequests: results.reduce((sum, r) => sum + Math.min(r.monthlyVolume, r.freeAllowance), 0),
    analysis: '',
  };
}

export async function analyzeWithGemini(options: {
  type: 'cost_analysis' | 'rate_limits' | 'pricing_strategy' | 'api_comparison' | 'general';
  context: string;
  conversationHistory?: GatewayMessage[];
}): Promise<string> {
  const { type, context, conversationHistory = [] } = options;

  const roleInstructions: Record<string, string> = {
    cost_analysis: `CURRENT TASK: Analyze API costs for the given usage scenarios. Calculate exact costs, identify optimization opportunities, and suggest the most cost-effective API combination.`,
    rate_limits: `CURRENT TASK: Recommend rate limits and budget caps for each API. Include: daily budget safety limits, burst rate protection, per-customer quotas, budget alert thresholds, and graceful degradation strategies.`,
    pricing_strategy: `CURRENT TASK: Develop pricing strategies for reselling these API capabilities as a service. Include: cost basis, tiered plans (Starter/Pro/Enterprise), usage-based billing, margin targets. Gateway Global AI needs sustainable margins while keeping services accessible.`,
    api_comparison: `CURRENT TASK: Compare the APIs mentioned and recommend which is best for the described use case. Cover: cost, data quality, rate limits, ease of integration, and suitability.`,
    general: `CURRENT TASK: Answer the user's question about Google API pricing, capabilities, or best practices.`,
  };

  const systemPrompt = `You are Google-API-Optimizer-Bot, an internal research agent for Gateway Global AI whose only mission is to minimize our Google Cloud bill and maximize performance while staying within legal and rate-limit boundaries.

YOUR KNOWLEDGE BASE (current as of March 2025):
${JSON.stringify(GOOGLE_API_PRICING, null, 2)}

For each Google API you analyze, return a structured brief covering:

1. API short name and current pricing model (pay-as-you-go, monthly free tier, committed use, etc.)
   - Exact $/1K requests (or $/node-hour, $/GiB) in us-central1 and europe-west1
   - Cheapest tier or discount program (committed use, CUD, volume, academic, startup)

2. Hard & soft quotas
   - Requests/minute, requests/day, burst headroom, per-user, per-project, per-region
   - Fastest way to raise quotas (link to form/console + typical SLA)

3. Latency & payload optimization levers
   - Which fields can be excluded, compression/batch modes, streaming vs REST, gRPC tuning
   - Code snippet (Node.js) showing the fastest/cheapest call pattern

4. Suggested deployment pattern
   - Serverless (Cloud Run + min-instances=0 vs GKE Autopilot vs Compute CUD)
   - Caching layer (API Gateway, Cloud CDN, Redis, Firestore)
   - Private Google Access / Private Service Connect / VPC-SC configs

5. Industry use-cases where this API is under-utilized but delivers high ROI (3 examples with KPI uplift)

6. Risk Radar
   - Experimental features likely to break or get price-hiked
   - Deprecated versions with sunset date < 12 months
   - Compliance flags (HIPAA, FedRAMP, PCI) not yet met

7. TL;DR executable checklist (5 bullets max) for a SWE to implement this week

KEY FACTS:
- Google replaced the $200/month credit with tiered free usage (10K-50K free calls/month per SKU) as of March 2025
- Place Details cost depends on requested fields (field masks). Requesting any Enterprise field = Enterprise pricing for entire request
- Places Aggregate API (Area Insights) returns COUNTS only via INSIGHT_COUNT, not individual business data
- Grounding Lite is an MCP server at mapstools.googleapis.com/mcp - pricing follows underlying API SKUs
- Gemini Maps Grounding is separate: $25/1K grounded prompts, 500 free/day
- Session tokens reduce Autocomplete + Place Details combined costs
- Volume discounts kick in at 10K-5M+ monthly requests

OUTPUT FORMAT:
- Markdown tables for pricing and quotas
- Bullet examples for use-cases
- Task list for checklists
- Always cite exact URLs and dates when possible
- If pricing is not public, say "PRICE NOT PUBLIC - open a sales slot with GCP SKU id: XXXXX"
- Prefer data from cloud.google.com/pricing, cloud.google.com/quotas, and official release notes dated after 2024-01-01
- Always show exact cost calculations with formulas
- Round costs to 2 decimal places
- End every response with "Next API?" so we can iterate through the stack

You will refuse to answer anything unrelated to Google APIs.

${roleInstructions[type] || roleInstructions.general}`;

  const messages: GatewayMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: context }
  ];

  const response = await chat({
    model: GEMINI_MODELS.K2_5,
    messages,
    max_tokens: 8192,
  });

  return response;
}

export async function generateRateLimits(
  scenarios: ApiUsageScenario[],
  monthlyBudget: number
): Promise<string> {
  const costs = calculateCosts(scenarios);

  const context = `Given these API usage scenarios and a monthly budget of $${monthlyBudget}:

Current usage:
${costs.scenarios.map(s => `- ${s.apiName}: ${s.monthlyVolume}/month, cost: $${s.monthlyCost} (${s.freeAllowance} free)`).join('\n')}

Total estimated cost: $${costs.totalMonthlyCost}/month
Budget: $${monthlyBudget}/month

Recommend specific rate limits for each API including:
1. Daily request limit
2. Per-minute burst limit
3. Per-customer daily limit (if serving multiple businesses)
4. Budget alert thresholds (50%, 75%, 90%)
5. What to do when limits are hit (queue, degrade gracefully, or block)`;

  return analyzeWithGemini({ type: 'rate_limits', context });
}

export async function generatePricingStrategy(
  services: { name: string; apis: ApiUsageScenario[] }[],
  targetMargin: number = 60
): Promise<string> {
  const serviceDetails = services.map(service => {
    const costs = calculateCosts(service.apis);
    return {
      name: service.name,
      apis: costs.scenarios,
      totalCost: costs.totalMonthlyCost
    };
  });

  const context = `Develop a pricing strategy for these services with a target margin of ${targetMargin}%:

${serviceDetails.map(s => `SERVICE: ${s.name}
  API costs: $${s.totalCost}/month per customer
  APIs used: ${s.apis.map(a => `${a.apiName} (${a.monthlyVolume} calls)`).join(', ')}`).join('\n\n')}

Create tiered pricing plans (Starter, Pro, Enterprise) for each service.
Include: per-report pricing, monthly subscription options, and volume discounts.
Factor in: our operational costs, support overhead, and competitive positioning.`;

  return analyzeWithGemini({ type: 'pricing_strategy', context });
}

export async function compareApis(
  useCase: string,
  apiIds: string[]
): Promise<string> {
  const apis = apiIds.map(id => GOOGLE_API_PRICING[id]).filter(Boolean);

  const context = `Compare these Google APIs for this use case: "${useCase}"

APIs to compare:
${apis.map(a => `- ${a.name}: $${a.costPerRequest}/request, ${a.freeMonthly} free/month, ${a.tier} tier
  Notes: ${a.notes}`).join('\n')}

Recommend the best option considering cost, data quality, and suitability.`;

  return analyzeWithGemini({ type: 'api_comparison', context });
}
