# Gateway Self-Deployment Specification

Reference document for the programmatic sales engine skill: deploying the Gateway Global AI OS platform as its own first sales agent swarm—the platform selling itself to businesses.

## 1. The Self-Deployment Thesis

Gateway Global AI OS is the first customer of its own sales engine. The platform sells AI Business Routers (not chatbots) to mid-market operators. The sales swarm must demonstrate the same governed, deterministic behavior it promises to customers.

## 2. Gateway Platform Funnel Template: `gateway_ai_platform_v1`

### Terminal Action: `signup` (claim activation at $49.99)

### Entry Points

- `homepage_widget`: embedded chat/voice widget on gatewayglobal.ai
- `qr_code`: physical QR on marketing materials
- `phone_number`: demo PSTN line (requires Voice plan)

### Phases

#### Phase 1: `identify_pain`

- **Goal:** Bold claim about missed calls, platform dependency, or after-hours demand
- **requiredContextKeys:** `owner_business_name`, `owner_industry`
- **outputContract:**
  - **must:** Open with one bold claim about missed revenue from missed calls or platform dependency
  - **must:** Ask for business name and industry
  - **mustNot:** Full platform architecture, pricing unless asked, internal reasoning
  - **maxSentences:** 8
- **boldClaimHint:** "Most businesses lose 30% of inbound opportunities to missed calls and after-hours inquiries -- an AI front desk captures that demand without adding payroll."
- **disclosureTierHint:** minimal

#### Phase 2: `demonstrate_value`

- **Goal:** Personalized demo using their business name and industry
- **requiredContextKeys:** `owner_business_name`, `owner_industry`, `demo_ready`
- **outputContract:**
  - **must:** Use their business name in examples, offer 2-3 realistic customer scenarios
  - **mustNot:** Lead with technical architecture or SKU names
  - **maxSentences:** 10
- **disclosureTierHint:** standard

#### Phase 3: `present_economics`

- **Goal:** Show pricing tied to outcomes, not features
- **requiredContextKeys:** `owner_business_name`, `owner_industry`, `demo_ready`, `pricing_acknowledged`
- **outputContract:**
  - **must:** Present $49/mo platform + $50/mo voice package + $0.25/min overage tied to ROI
  - **must:** Compare to cost of missed calls and hiring staff
  - **mustNot:** Spec-sheet ramble without tying to their business
  - **maxSentences:** 12
- **disclosureTierHint:** full
- **canvasViewHint:** Pricing comparison View showing platform vs traditional costs

#### Phase 4: `activate`

- **Goal:** Guide to claim activation ($49.99 setup)
- **requiredContextKeys:** `owner_business_name`, `owner_industry`, `pricing_acknowledged`
- **outputContract:**
  - **must:** Summarize what they get, guide to claim flow
  - **mustNot:** Add friction or unnecessary steps
  - **maxSentences:** 8
- **disclosureTierHint:** full
- **canvasViewHint:** Claim activation form View

### Transitions

- `identify_pain` → `demonstrate_value`: when `owner_business_name` + `owner_industry` present
- `demonstrate_value` → `present_economics`: when `demo_ready` present
- `present_economics` → `activate`: when `pricing_acknowledged` present

### Industry Knowledge Reference

```
industryKnowledgeRef: {
  source: "slug",
  value: "gateway_platform_research",
  title: "Breaking Free from Platform Slavery (summary)"
}
```

## 3. Gateway Pricing Economics

- **Base Tier:** $49/mo Platform Fee (AI Front Desk, chat, QR, web widget)
- **Comms Tier:** $50/mo Voice AI Package (PSTN number, voice AI, SMS)
- **Utility Tier:** $0.25/min Overage ("the AI Minute")
- **Claim Activation:** $49.99 one-time setup
- Plan limits defined in `PLAN_LIMITS` in `shared/schema.ts`

## 4. The "Breaking Free" Positioning

From the whitepaper: businesses lose money from missed calls, slow response, and platform dependency. Gateway's pitch:

- Own your customer relationships (not renting access from Yelp/Google/DoorDash)
- Capture every inbound opportunity (AI front desk answers 24/7)
- Respond instantly (60-second first response via voice AI)
- Data ownership (your customers, your analytics, your phone number)

## 5. Sales Laws (Gateway-Specific)

- **first_responder_wins:** AI answers in under 60 seconds
- **speed_beats_perfection:** a fast AI response beats a perfect human callback tomorrow
- **ownership_beats_access:** own your AI agent, phone number, and customer data
- **automation_beats_manual_followup:** state machine handles followups, not sticky notes
- **data_capture_is_mandatory:** every interaction captures business context

## 6. Agent Swarm for Gateway Sales

The Gateway sales swarm consists of:

- **Concierge:** first contact, routes to appropriate specialist
- **Sales Agent:** runs the identify_pain → activate funnel
- **Demo Agent:** handles personalized AI front desk demonstrations
- **Support Agent:** post-activation onboarding and troubleshooting

Each agent provisioned via `agentProvisioning.ts` with DISC/ARCH profiles appropriate to their role.

## 7. YAML Registry Entry

```yaml
templates:
  - id: gateway_ai_platform_v1
    name: "Gateway Global AI OS -- Platform Sales v1"
    source: shared/industryFunnelTemplates/gatewayPlatformV1.ts
    industryVertical: saas_platform
    description: "Phased owner acquisition -- identify pain, demonstrate value, present economics, activate."
```
