# Onboarding & SWOT Analysis Integration

## Overview

This document extracts the existing onboarding process and integrates it with the SWOT analysis system, providing UI elements and establishing a baseline core product with basic features.

## Existing Onboarding Flow (from OnboardingFlow.tsx)

### Current 4-Step Process

**Step 1: Name Your Agent**
- User inputs bot name
- Gender detection from name
- Creates agent identity
- Visual: Animated visualizer with particles

**Step 2: Voice Selection**
- Choose from Gemini TTS voices (Chirp HD)
- Gender-specific voice recommendations
- Voice preview/playback
- Categories: Male, Female, Neutral
- Options include: Aoede, Kore, Leda, Zephyr, Charon, Fenrir, Orus, Puck

**Step 3: Fine-Tune Personality (DISC)**
- Adjust DISC personality traits
- Interactive sliders for:
  - Dominance (D) - Red
  - Influence (I) - Yellow  
  - Steadiness (S) - Green
  - Conscientiousness (C) - Blue
- Real-time emotion feedback (Calm, Engaged, Focused, Energized, Empathetic)
- Visual personality core animation

**Step 4: Meet Your Agent**
- Final preview of configured agent
- Summary of selections
- Launch to dashboard

## SWOT Analysis System (from Google Places)

### Current SWOT Agent Capabilities

**Business Fingerprint (30s)**
- Google Places ID scraping
- Store: name, address, category, rating, reviews, price level, website, phone, hours, lat/lng
- Top-5 photos + recent 5 reviews

**Local Competition Map (60s)**
- Nearby search (5km radius, same category)
- CSV export: place_id, name, rating, review_count, price_level, drive-time
- Share-of-Rating calculation
- Threat flagging (4.8★+ within 2km)

**SWOT Matrix (45s)**
- **Strengths**: Highest rating items, longest hours, unique category badges
- **Weaknesses**: <100 reviews, <4.3★, no website, no photos, no review responses
- **Opportunities**: Unique keywords, category gaps (e.g. "vegan-friendly"), empty Q&A
- **Threats**: Temporarily closed rivals, new high-rated competitors, increasing ad costs

**Platform Economics (30s)**
- Trending times analysis
- Missed-call insights & revenue impact
- CPC benchmarking
- Platform tax calculation (Google Ads + delivery fees vs. margin)

**AI & Trend Snapshot (30s)**
- Google Trends 12-mo data
- TikTok/YouTube hashtag growth
- SMB AI penetration statistics
- Low-code AI tool recommendations (<$50/mo)

**Content Goldmine (30s)**
- "People also search for" extraction
- Blog title generation (10 titles)
- TikTok hooks (5 hooks)
- YouTube Short angles
- Unanswered GBP questions

## Merged Onboarding + SWOT UI

### Enhanced 6-Step Onboarding Process

```
┌────────────────────────────────────────────────────────────┐
│  Step 1: Welcome & Business Info                          │
├────────────────────────────────────────────────────────────┤
│  👋 Welcome to AI Biz Bot                                 │
│                                                            │
│  Business Name:  [___________________________]            │
│  Google Places:  [Paste URL or Search] 🔍                │
│  Industry:       [Select Category ▼]                      │
│                                                            │
│  [← Back]                      [Scan Business →]          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Step 2: SWOT Analysis                                     │
├────────────────────────────────────────────────────────────┤
│  📊 Your Business Intelligence Report                     │
│                                                            │
│  [Analyzing...] ████████░░ 85%                            │
│                                                            │
│  ✓ Business Profile Loaded                                │
│  ✓ 12 Competitors Found                                   │
│  ⏳ Generating SWOT Matrix...                             │
│  ⏳ Calculating Platform Economics...                     │
│                                                            │
│  --- Results Preview ---                                   │
│  💪 Strengths: 4.7★ rating, 250+ reviews                  │
│  ⚠️  Weaknesses: No website, limited hours               │
│  🎯 Opportunities: "vegan" keyword trending +42%          │
│  ⚡ Threats: New 4.9★ competitor 0.4km away              │
│                                                            │
│  [View Full Report] [Continue to Setup →]                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Step 3: Choose Your Plan                                 │
├────────────────────────────────────────────────────────────┤
│  📦 Select Your Feature Set                               │
│                                                            │
│  ┌──────────────────────────────────────────────┐        │
│  │ ★ BASELINE (FREE)                            │        │
│  │ • Chat Widget (1 site)                       │        │
│  │ • Basic SWOT Analysis                        │        │
│  │ • 100 messages/month                         │        │
│  │                                              │        │
│  │ Need more? Chat with AI Biz Bot to upgrade  │        │
│  └──────────────────────────────────────────────┘        │
│                                                            │
│  Additional Features (Discuss with Bot):                   │
│  □ Voice Agent (+$49/mo)                                  │
│  □ SMS Integration (+$29/mo)                              │
│  □ Multi-Site Support (+$79/mo)                           │
│  □ Advanced Analytics (+$39/mo)                           │
│  □ Phone System (+$99/mo)                                 │
│                                                            │
│  [Start with Baseline] [Chat with Bot About Features →]   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Step 4: Name Your Agent                                  │
├────────────────────────────────────────────────────────────┤
│  🤖 Give Your AI Assistant a Name                         │
│                                                            │
│  [Animated Bot Visualizer]                                │
│                                                            │
│  Agent Name:  [___________________________]               │
│                                                            │
│  Suggested: Aria, Kai, Nova, Echo, Phoenix                │
│                                                            │
│  [← Back]                      [Choose Voice →]           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Step 5: Voice & Personality                              │
├────────────────────────────────────────────────────────────┤
│  🎤 Customize Voice & Personality                         │
│                                                            │
│  Voice: [Aoede - Warm & Conversational ▼] 🔊             │
│                                                            │
│  DISC Personality:                                         │
│  Dominance       ────●────── 70%                          │
│  Influence       ──────●──── 85%                          │
│  Steadiness      ────●────── 65%                          │
│  Conscientiousness ─────●─── 75%                          │
│                                                            │
│  Current Emotion: 😊 Engaged                              │
│                                                            │
│  [← Back]                      [Preview Agent →]          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Step 6: Ready to Launch                                  │
├────────────────────────────────────────────────────────────┤
│  🎉 Your AI Assistant is Ready!                           │
│                                                            │
│  [Agent Preview Animation]                                │
│                                                            │
│  Agent: Aria                                               │
│  Voice: Aoede (Warm & Conversational)                     │
│  Plan: Baseline (FREE)                                     │
│  SWOT: ✓ Complete                                         │
│                                                            │
│  Next Steps:                                               │
│  1. Install chat widget on your website                   │
│  2. Review your SWOT analysis dashboard                   │
│  3. Chat with Aria to add features                        │
│                                                            │
│  [← Customize More]            [Launch Dashboard →]       │
└────────────────────────────────────────────────────────────┘
```

## Baseline Core Product

### FREE Baseline Features

**Chat Widget**
- Single website installation
- Floating or fixed mode
- Basic color customization
- 100 messages/month
- Mobile responsive

**SWOT Analysis** (One-time)
- Business profile scan
- Competitor analysis (up to 10)
- Basic SWOT matrix
- Platform economics overview
- PDF export

**Dashboard Access**
- View SWOT results
- Chat history
- Basic analytics
- Installation guide

**AI Biz Bot Consultation**
- Discuss business needs
- Feature recommendations
- Pricing quotes
- Upgrade assistance

### Premium Features (AI Biz Bot Upgrades)

**Voice Agent** - $49/month
- Gemini TTS integration
- Voice visualizer
- Phone call handling
- Voicemail transcription

**SMS Integration** - $29/month
- Two-way SMS messaging
- Automated responses
- SMS campaigns
- Twilio integration

**Multi-Site Support** - $79/month
- Unlimited websites
- Separate analytics per site
- Centralized management
- White-label options

**Advanced Analytics** - $39/month
- Detailed visitor tracking
- Conversion funnel analysis
- A/B testing
- Custom reports
- Monthly SWOT updates

**Phone System** - $99/month
- Dedicated phone number
- Call routing
- IVR menus
- Call recording
- Telephony analytics

**Enterprise Custom**
- Custom integrations
- Dedicated support
- SLA guarantees
- On-premise deployment
- Contact sales

## UI Components Needed

### 1. SWOT Dashboard Widget

```tsx
<SWOTDashboard>
  <SWOTQuadrant type="strengths" data={swotData.strengths} color="green" />
  <SWOTQuadrant type="weaknesses" data={swotData.weaknesses} color="red" />
  <SWOTQuadrant type="opportunities" data={swotData.opportunities} color="blue" />
  <SWOTQuadrant type="threats" data={swotData.threats} color="orange" />
</SWOTDashboard>
```

### 2. Business Scanner Component

```tsx
<BusinessScanner>
  <PlacesSearch onSelect={(place) => scanBusiness(place)} />
  <ScanProgress steps={scanSteps} current={currentStep} />
  <ScanResults swot={results} />
</BusinessScanner>
```

### 3. Plan Selector with AI Chat

```tsx
<PlanSelector baseline={baselinePlan}>
  <BaselinePlan features={coreFeatures} />
  <FeatureGrid premiumFeatures={allFeatures} onDiscuss={openAIChatForFeature} />
  <AIChatOverlay 
    topic="Feature Discussion"
    context={selectedFeature}
    agent="AI Biz Bot"
  />
</PlanSelector>
```

### 4. Onboarding Stepper

```tsx
<OnboardingStepper steps={6} current={currentStep}>
  <Step1_Welcome />
  <Step2_SWOT />
  <Step3_Plan />
  <Step4_Name />
  <Step5_VoicePersonality />
  <Step6_Launch />
</OnboardingStepper>
```

## Integration Architecture

```
User Registration
       ↓
Step 1: Welcome & Business Info
       ↓
Step 2: SWOT Analysis (Auto-run)
       ├→ Google Places API
       ├→ Competitor Search
       ├→ SWOT Matrix Generation
       └→ Save to Database
       ↓
Step 3: Plan Selection
       ├→ Show Baseline (Free)
       └→ AI Chat for Premium Features
       ↓
Step 4-6: Agent Configuration
       ├→ Name
       ├→ Voice Selection
       └→ DISC Personality
       ↓
Dashboard
       ├→ SWOT Results
       ├→ Chat Widget Code
       ├→ AI Biz Bot Access
       └→ Upgrade Options
```

## Backend API Endpoints

```typescript
// Onboarding
POST /api/onboarding/start
POST /api/onboarding/business-scan
POST /api/onboarding/swot-analysis
POST /api/onboarding/plan-select
POST /api/onboarding/agent-config
POST /api/onboarding/complete

// SWOT
POST /api/swot/analyze
GET  /api/swot/:businessId
POST /api/swot/refresh
GET  /api/swot/:businessId/report/pdf

// Plans
GET  /api/plans/baseline
GET  /api/plans/premium
POST /api/plans/discuss-with-bot
POST /api/plans/upgrade
```

## Database Schema

```typescript
interface OnboardingProgress {
  id: string;
  userId: string;
  currentStep: number;
  completedSteps: string[];
  businessInfo: {
    name: string;
    placesId: string;
    category: string;
  };
  swotAnalysis?: SWOTResult;
  selectedPlan: 'baseline' | 'premium';
  agentConfig: {
    name: string;
    voiceId: string;
    discProfile: DISCProfile;
  };
  completedAt?: Date;
}

interface SWOTResult {
  businessId: string;
  generatedAt: Date;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  competitors: Competitor[];
  platformEconomics: {
    missedCallValue: number;
    costPerLead: number;
    platformTaxScore: number;
  };
  contentIdeas: {
    blogTitles: string[];
    tiktokHooks: string[];
    youtubeAngles: string[];
  };
}
```

## Implementation Checklist

### Phase 1: Extract & Document
- [x] Document existing onboarding flow
- [x] Document SWOT analysis system
- [x] Design merged UI flow
- [x] Define baseline core product

### Phase 2: UI Components
- [ ] Create SWOT Dashboard widget
- [ ] Create Business Scanner component
- [ ] Create Plan Selector with AI chat integration
- [ ] Update OnboardingFlow.tsx with 6-step process
- [ ] Add SWOT step between welcome and plan selection

### Phase 3: Backend Integration
- [ ] Create SWOT analysis endpoints
- [ ] Integrate Google Places API
- [ ] Add competitor search functionality
- [ ] Implement SWOT matrix generation
- [ ] Create plan selection logic

### Phase 4: AI Biz Bot Integration
- [ ] Enable feature discussion chat
- [ ] Create upgrade recommendation system
- [ ] Add pricing calculator
- [ ] Implement quote generation

### Phase 5: Testing & Polish
- [ ] Test complete onboarding flow
- [ ] Verify SWOT analysis accuracy
- [ ] Test baseline vs premium differentiation
- [ ] Mobile responsive testing
- [ ] Performance optimization

## Key Improvements

1. **SWOT Integration**: Automatic business analysis during onboarding
2. **Baseline Product**: Clear free tier with basic features
3. **AI-Driven Upgrades**: Chat with bot to add features instead of overwhelming upfront
4. **Progressive Disclosure**: Show complexity only when needed
5. **Data-Driven Setup**: Use SWOT to recommend features
6. **Instant Value**: Users get SWOT analysis immediately (tangible value)

## Success Metrics

- Onboarding completion rate >75%
- SWOT report generation success >90%
- Baseline to premium conversion >15%
- Feature discussion engagement >40%
- Time to first value <5 minutes

## Conclusion

This merged onboarding + SWOT system provides:
- ✅ Guided 6-step setup process
- ✅ Automatic business intelligence (SWOT)
- ✅ Clear baseline free product
- ✅ AI-assisted feature discovery
- ✅ Immediate actionable insights
- ✅ Smooth upgrade path

Users get immediate value (SWOT analysis) while being gently guided toward premium features through conversational AI rather than hard sales.
