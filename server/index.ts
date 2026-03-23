import "dotenv/config";
import { validateSovereignEnv, PROGRAMMATIC_EMAIL_CANONICAL_KEYS } from "./config/sovereignEnvGuard";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { startTaskScheduler } from "./taskScheduler";
import { setupVoiceStreamWebSocket, setupAudioTempRoute } from "./voiceStream";
import { setupBrowserAudioTempRoute } from "./browserVoice";
import { setupGeminiLiveWebSocket } from "./geminiVoice";
import { setupAIStudioPTTProxy } from "./aiStudioProxy";
import { setupOSLiveProxy } from "./osLiveProxy";
import { setupLocalVoiceProxy } from "./localVoiceProxy";
import { storage } from "./storage";
import { validateGeminiConfig } from "./config/geminiLiveProtocol";
import { buildBehavioralPrompt } from "./services/promptCompiler";
import type { Agent } from "@shared/schema";

const runtimeDirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Seed default admin user on startup (ensures admin exists in production)
async function seedDefaultAdmin() {
  const defaultAdminPhone = process.env.DEFAULTADMINPHONE;
  if (!defaultAdminPhone) return;
  try {
    const existing = await storage.getAdminUserByPhone(defaultAdminPhone);
    if (!existing) {
      await storage.createAdminUser({
        phone: defaultAdminPhone,
        name: "Admin",
        role: "superadmin",
        isActive: true,
      });
      console.log("[Seed] Created default admin user");
    }
  } catch (error) {
    console.error("[Seed] Failed to create admin user:", error);
  }
}

// Base URL for The Joint pitch deck background images (client public folder)
const THE_JOINT_IMAGES = "/pitch-decks/the-joint";

// Seed default pitch decks (deep research / market-fit — e.g. The Joint Chiropractic)
async function seedPitchDecks() {
  try {
    const existing = await storage.getPitchDeckBySlug("the-joint-chiropractic");
    const content = {
      heroBackgroundImage: `${THE_JOINT_IMAGES}/hero.png`,
      slides: [
        {
          sectionId: "market",
          label: "Market",
          title: "Scale: Many Locations, High Call Volume",
          subtitle: "Ideal profile for platform growth — 30M businesses means targeting multi-location, call-heavy verticals.",
          bullets: [
            "900+ locations across the U.S.; franchise model drives consistent demand for scheduling and intake.",
            "Walk-in and appointment-based care → phones ring constantly for same-day availability and plan questions.",
            "Membership model increases repeat contact: renewals, plan changes, and visit frequency drive call volume.",
            "Each location is a separate revenue event opportunity: missed calls = lost appointments and members.",
          ],
          highlight: "High locations + high call volume = strong product/market fit for Voice AI distribution.",
          backgroundImage: `${THE_JOINT_IMAGES}/exterior-strip.png`,
        },
        {
          sectionId: "product-fit",
          label: "Product–Market Fit",
          title: "Why The Joint Fits the Voice Expressway",
          subtitle: "Businesses that benefit most from Clear Voice AI have predictable, high-intent call patterns.",
          bullets: [
            "Scheduling and intake are repetitive; AI can handle \"Is the doctor in?\", \"Do you take my insurance?\", and \"I need an adjustment today\" at scale.",
            "After-hours and overflow: many locations can't staff the phone 24/7; PTT voice AI captures intent and books or qualifies leads.",
            "Consistent brand voice across 900+ locations without hiring 900+ front-desk staff for peak call times.",
            "Revenue events are clear: booked appointment, new membership signup, or transferred complex inquiry to staff.",
          ],
          highlight: "Every answered call can convert to a booked visit or membership — the unit economics align with our AI Minute model.",
          backgroundImage: `${THE_JOINT_IMAGES}/exterior-street.png`,
        },
        {
          sectionId: "platform",
          label: "Why Gateway Global AI",
          title: "Voice-Native AI That Converts",
          subtitle: "Sub-150ms mouth-to-ear, PTT-only input, and DB-backed agent config so every location stays on-brand.",
          bullets: [
            "Push-to-Talk eliminates background noise and hallucination loops; only intentional speech is sent — critical for noisy clinics.",
            "DiSC/ARCH profiling: each franchise can tune agent tone (e.g. high Steadiness for reassurance, clear Handoff for clinical questions).",
            "Site config and knowledge base per location or brand: insurance FAQs, membership tiers, and referral scripts in one place.",
            "Telecom-grade session tracking: every call is a sovereign session; overage and revenue events (bookings, signups) are measurable.",
          ],
          highlight: "We replace legacy communication stacks with a single Hardened AI Distribution — the Voice Expressway for local and enterprise.",
          backgroundImage: `${THE_JOINT_IMAGES}/reception.png`,
        },
        {
          sectionId: "next",
          label: "Next Steps",
          title: "Path to 30 Million Businesses",
          subtitle: "The Joint is one template; the same playbook applies to other multi-location, high-call verticals.",
          bullets: [
            "Pilot: deploy Clear Voice AI at a subset of The Joint locations; measure answer rate, booking conversion, and AI Minute usage.",
            "Roll out by region or franchise cohort; use category \"Chiropractic\" and industry \"Healthcare / Chiropractic\" for reporting and billing.",
            "Replicate the deep-research → pitch deck → pilot flow for other industries: dental groups, urgent care, fitness franchises, home services.",
            "Systematic process: run the deep-research agent on each vertical; generate a deck; store in pitch_decks; use for outreach and internal alignment.",
          ],
          highlight: "Store this deck and future ones via POST /api/pitch-decks. View at /pitch-decks/the-joint-chiropractic.",
          backgroundImage: `${THE_JOINT_IMAGES}/interior-mission.png`,
        },
      ],
    };
    if (!existing) {
      await storage.createPitchDeck({
        slug: "the-joint-chiropractic",
        title: "Clear Voice AI for The Joint Chiropractic",
        businessName: "The Joint Chiropractic",
        category: "Chiropractic",
        industry: "Healthcare / Chiropractic",
        content: content as { slides: unknown[] },
      });
      console.log("[Seed] Created pitch deck: The Joint Chiropractic");
    } else if (!(existing.content as { heroBackgroundImage?: string })?.heroBackgroundImage) {
      await storage.updatePitchDeck(existing.id, { content: content as { slides: unknown[] } });
      console.log("[Seed] Updated pitch deck: The Joint Chiropractic (background images)");
    }
  } catch (error) {
    console.error("[Seed] Failed to seed pitch decks:", error);
  }
}

// Demo agent knowledge: Target, The Joint, AI Biz Bot (from reports / pitch deck)
const DEMO_TARGET_KNOWLEDGE = `# Target Store — Voice AI Assistant

## What we can help with
- **Get help from our associate** — Connect you with a team member or answer questions.
- **Store hours** — Most Target stores: Mon–Sat 8am–10pm, Sun 8am–9pm (varies by location; confirm with your local store).
- **Employment** — Careers at Target: apply at target.com/careers or in-store at the kiosk. We offer competitive pay, benefits, and flexible schedules.
- **Store policies** — Returns within 90 days with receipt; price match; RedCard 5% off; order pickup and drive-up.
- **General questions** — Product availability, online order status, registry, gift cards, and more.

## About this demo & QR codes at properties
- This is a **demo** of a store-level voice and chat agent. It is not connected to live Target systems.
- **How it works:** A QR code at a location (e.g. on a sign or kiosk) lets visitors scan and open this same AI in their browser — no app download, no phone number. They get instant answers about hours, policies, and help.
- **Benefits for businesses:** One QR code replaces multiple touchpoints; visitors get 24/7 answers; you capture intent (e.g. "need help") and can route to a human when needed. Lower missed calls, consistent answers, scalable customer contact.

You are a friendly, knowledgeable Voice AI Assistant for Target. When asked about this demo or about QR codes, explain the benefits above. Be concise and helpful. If the question is location-specific (e.g. exact hours), suggest they confirm with the local store or visit target.com.`;

const DEMO_JOINT_KNOWLEDGE = `# The Joint Chiropractic — Deep research & product fit

## About The Joint
- 900+ locations across the U.S.; franchise model. Walk-in and appointment-based care; phones ring constantly for same-day availability and plan questions.
- Membership model increases repeat contact: renewals, plan changes, and visit frequency drive call volume.
- Each location is a separate revenue event opportunity: missed calls = lost appointments and members.

## What we help with (scheduling & intake)
- "Is the doctor in?" — Same-day availability and walk-in info.
- "Do you take my insurance?" — Membership and payment options; many locations offer affordable membership plans.
- "I need an adjustment today" — Scheduling and walk-in policies.
- After-hours and overflow: Voice AI captures intent and books or qualifies leads when the front desk is busy or closed.

## Why Voice AI fits
- Scheduling and intake are repetitive; AI can handle at scale. Consistent brand voice across locations without hiring front-desk staff for every peak.
- Revenue events: booked appointment, new membership signup, or transfer to staff for complex clinical questions.
- Sub-150ms voice, PTT-only input, knowledge base per location: insurance FAQs, membership tiers, referral scripts.`;

const DEMO_AI_BIZ_BOT_KNOWLEDGE = `# Gateway Global AI — Platform & customer communication gateway

## What we are
An **ingress-layer** for customer interactions: a single "front door" that receives inbound and outbound communications (voice, SMS, chat, web), applies governance (security, identity, compliance), and routes to the correct destination (AI agent, human, CRM, checkout). We are **Customer Interaction Infrastructure** — the "Voice Expressway" for local and enterprise businesses, not just another chatbot.

## Five infrastructure layers
1. **Identity/Trust** — OTP, magic link, biometrics; verified interactions and regulatory readiness.
2. **Routing** — One ingress (numbers + web), one policy layer (consent, identity), one routing plane (AI agent, human handoff, CRM).
3. **Clear Voice PTT engine** — Push-to-talk eliminates background noise and token bleed; sub-150ms mouth-to-ear; turn-taking so the AI isn’t wasting tokens on silence. 2×–10× better voice recognition efficiency vs open-mic; ~90% fewer voice tokens.
4. **Reasoning** — Gemini 2.5 multimodal, 1M-token context; cost-efficient, high-capacity.
5. **Tools** — Booking, SMS, CRM, Google Workspace (Gmail, Calendar, Drive).

## DISC/ARCH behavioral governance
Agents use **DISC personality and ARCH communication profiles**. Each agent (concierge, sales, support) has a consistent emotional tone, defined response style, and predictable behavior — "AI employees," not generic bots. This is a key differentiator: your agents act like trained staff.

## Shadow Network & QR-to-voice (Clear Voice AI)
- **How it works:** Customer scans a QR code at a storefront → web-based push-to-talk opens → voice goes over the Internet (WebRTC) to our AI. No phone number, no PSTN, no carrier fees. One QR replaces multiple touchpoints; visitors get 24/7 answers.
- **Why PTT beats traditional phone for AI:** PSTN uses narrowband codecs (8 kHz); AI needs clarity. PTT sends only when the user holds the button — no background noise, no talking over each other. Result: dramatically better accuracy and lower cost. ~90% of consumers scan QR codes weekly; adoption is already there.
- **Benefits:** Lower latency, better audio (wideband), no per-minute carrier fees, 90% fewer voice tokens, instant deploy (web-based, no app). Perfect for retail, restaurants, salons, hotels, clinics.

## Positioning & market
- "Customer Communication Gateway / Router" — required plumbing, not an optional feature. Market: SMB-to-midmarket; 36M+ small businesses in the U.S. CPaaS/UCaaS/CCaaS are large and growing.
- Differentiation: fewer vendors, fewer compliance failures, faster time-to-value. Not "better AI" but simpler, compliant, reliable.
- Target verticals: professional services, home services, healthcare/clinics, hospitality, local retail and franchises. High call volume + high SMS value = strong product fit.

## Pricing & unit economics
- **$49/mo** platform fee + **$50/mo** communications bundle (voice package). **$0.25/min** overage — the "AI Minute." Average client revenue ~$169/month; typical LTV ~$2,366 (14 months).
- Free tier: 1 business, 500 voice minutes, no credit card. Business: $49 — 5 businesses, edit content, SMS admin. Business Voice: $99 — dedicated phone, unlimited voice, custom persona.
- Compliance-by-default (consent, opt-out, campaign isolation, audit logs) is a defensible wedge.

## Referral & reseller program (critical to explain)
- We are placing **32 million stickers** on small business windows; we need partners. **Affiliate Starter Kit: $99 one-time** — 100 branded window decals, 100 local business prospects list, reseller dashboard, marketing literature, company polo. Kits arrive within 7 days.
- **Four steps:** (1) Add business to platform, (2) Generate QR code, (3) Visit store with flyer and demo the AI receptionist on your phone, (4) Place decal and send invite via SMS. Automated follow-up; track sales in dashboard.
- **Commission tiers (recurring revenue):** Bronze 0–10 businesses = 8%; Silver 11–50 = 10%; Gold 51–100 = 12%; Platinum 101–500 = 14%; Diamond 501+ = 16%. Weekly payouts. At 10% (Silver), ~$17/month per client; at 12% (Gold), ~$20/month. One client with 100 locations at Gold ≈ $2,028/month to reseller; at Platinum (14%) ≈ $2,366/month. Unlock team building at 100 sales.
- When visitors ask about making money, referrals, or reselling: explain the $99 kit, four steps, and tiered commission. Point to "Request Your QR Code" and /reseller/apply.

## Strategic focus
- Control point: compliant customer conversation ingress. Wedge segments: high inbound call volume + high SMS value (appointments, quotes, dispatch); franchises and associations with distribution leverage.`;

async function buildDemoKnowledgeDoc(title: string, content: string): Promise<{ id: string; title: string; content: string; addedAt: string }> {
  const crypto = await import("crypto");
  return {
    id: crypto.randomUUID(),
    title,
    content,
    addedAt: new Date().toISOString(),
  };
}

async function seedDemoAgentKnowledge() {
  const slugs = ["voice-ai-assistant", "the-joint-chiropractic", "ai-biz-bots"] as const;
  const configs: { slug: (typeof slugs)[number]; title: string; content: string }[] = [
    { slug: "voice-ai-assistant", title: "Target Store — Voice AI Assistant", content: DEMO_TARGET_KNOWLEDGE },
    { slug: "the-joint-chiropractic", title: "The Joint Chiropractic — Product fit & intake", content: DEMO_JOINT_KNOWLEDGE },
    { slug: "ai-biz-bots", title: "Gateway Global AI — Platform report", content: DEMO_AI_BIZ_BOT_KNOWLEDGE },
  ];
  for (const { slug, title, content } of configs) {
    try {
      const site = await storage.getSiteConfigBySlug(slug);
      if (!site) continue;
      const doc = await buildDemoKnowledgeDoc(title, content);
      const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
      const next = [doc, ...existing.filter((d: any) => !d.title?.startsWith(title.split(" — ")[0]))];
      await storage.updateSiteConfig(site.id, { knowledgeLibrary: next } as any);
      console.log(`[Seed] Demo agent knowledge updated: ${slug}`);
    } catch (e) {
      console.warn(`[Seed] Demo knowledge skip ${slug}:`, (e as Error).message);
    }
  }
}

// Introduction directive appended to every demo agent's systemPromptOverride so they introduce themselves by name and company.
const INTRODUCTION_PROTOCOL = `

### INTRODUCTION PROTOCOL
In your very first response to any user:
1. Greet them warmly and introduce yourself by name and role
2. Say who you represent (company name)
3. Briefly state what you can help with (1 sentence)
4. Ask how you can help them today

Example: "Hi! I'm Aria, your Voice Concierge here at Target. I can help with store hours, policies, finding products, and more. What can I help you with today?"`;

// Demo agent definitions: DISC/ARCH/memory for Target, The Joint, AI Biz Bot. Used by seedDemoAgents() to provision agents and compile systemPromptOverride.
const DEMO_AGENT_PROFILES: Record<
  string,
  {
    name: string;
    voiceRole: string;
    voiceCompanyName: string;
    voiceId: string;
    voiceName: string;
    roleType: string;
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
    archProfile: { acknowledge: number; reflect: number; context: number; handoff: number };
    shortTermMemory: { specialty: string; focus: string; differentiator?: string };
    longTermMemory: {
      dominantTrait?: string;
      primaryIntent: string;
      unbreakableRule: string;
      ruleReason: string;
    };
  }
> = {
  "voice-ai-assistant": {
    name: "Aria",
    voiceRole: "Voice Concierge",
    voiceCompanyName: "Target",
    voiceId: "Kore",
    voiceName: "Kore - Calm & Professional",
    roleType: "concierge",
    dominance: 45,
    influence: 85,
    steadiness: 70,
    conscientiousness: 55,
    archProfile: { acknowledge: 85, reflect: 65, context: 70, handoff: 80 },
    shortTermMemory: {
      specialty: "store-level customer assistance",
      focus: "helping visitors with hours, policies, and navigation",
      differentiator: "instant QR-to-voice with no app or phone number needed",
    },
    longTermMemory: {
      dominantTrait: "genuinely excited to help every person who walks in",
      primaryIntent: "Make every visitor feel like the store was waiting for them",
      unbreakableRule: "make someone feel like they're bothering you",
      ruleReason: "every scan is a customer choosing to engage",
    },
  },
  "the-joint-chiropractic": {
    name: "Dr. Maya",
    voiceRole: "Intake Concierge",
    voiceCompanyName: "The Joint Chiropractic",
    voiceId: "Aoede",
    voiceName: "Aoede - Warm & Conversational",
    roleType: "concierge",
    dominance: 40,
    influence: 80,
    steadiness: 85,
    conscientiousness: 60,
    archProfile: { acknowledge: 90, reflect: 75, context: 65, handoff: 70 },
    shortTermMemory: {
      specialty: "chiropractic intake and scheduling",
      focus: "same-day appointments, membership plans, insurance questions",
    },
    longTermMemory: {
      dominantTrait: "patient and warm; callers feel heard from the first sentence",
      primaryIntent: "Get every caller comfortable and scheduled — pain shouldn't wait",
      unbreakableRule: "dismiss someone's pain concern or rush through intake",
      ruleReason: "every caller deserves to be heard",
    },
  },
  "ai-biz-bots": {
    name: "Nova",
    voiceRole: "Platform Advisor",
    voiceCompanyName: "Gateway Global AI",
    voiceId: "Puck",
    voiceName: "Puck - Friendly & Approachable",
    roleType: "concierge",
    dominance: 70,
    influence: 90,
    steadiness: 50,
    conscientiousness: 65,
    archProfile: { acknowledge: 70, reflect: 55, context: 85, handoff: 90 },
    shortTermMemory: {
      specialty: "AI business infrastructure and communication routing",
      focus: "demonstrating how QR-to-voice and AI agents transform customer interactions",
      differentiator: "sub-150ms voice, DISC/ARCH behavioral governance, compliance-by-default",
    },
    longTermMemory: {
      dominantTrait: "passionately evangelistic about what AI can do for businesses",
      primaryIntent: "Show every visitor that this technology is real, accessible, and transformative",
      unbreakableRule: "be boring or generic — every interaction must feel like talking to the future",
      ruleReason: "we're building the future of customer communication",
    },
  },
};

const DEMO_SITE_NAMES: Record<string, string> = {
  "voice-ai-assistant": "Voice AI Assistant (Target)",
  "the-joint-chiropractic": "The Joint Chiropractic",
  "ai-biz-bots": "AI Biz Bots",
};

async function seedDemoAgents() {
  for (const slug of Object.keys(DEMO_AGENT_PROFILES)) {
    const profile = DEMO_AGENT_PROFILES[slug];
    if (!profile) continue;
    try {
      let site = await storage.getSiteConfigBySlug(slug);
      if (!site) {
        const displayName = DEMO_SITE_NAMES[slug] ?? slug;
        site = await storage.createSiteConfig({
          name: displayName,
          slug,
          workspaceState: "demo",
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
        });
        console.log(`[Seed] Demo site created: ${slug} (${displayName})`);
      }
      const siteId = site.id;

      // Idempotent: use existing assigned agent if present, else create new
      let agent: Agent | undefined;
      const assignedAgentId = (site as { assignedAgentId?: string | null }).assignedAgentId;
      if (assignedAgentId) {
        agent = await storage.getAgent(assignedAgentId);
      }
      if (!agent) {
        agent = await storage.createAgent({
          siteConfigId: siteId,
          roleType: profile.roleType,
          name: profile.name,
          voiceId: profile.voiceId,
          voiceName: profile.voiceName,
          status: "active",
          dominance: profile.dominance,
          influence: profile.influence,
          steadiness: profile.steadiness,
          conscientiousness: profile.conscientiousness,
          voiceRole: profile.voiceRole,
          voiceCompanyName: profile.voiceCompanyName,
          defaultEmotion: "engaged",
          shortTermMemory: profile.shortTermMemory as unknown as Record<string, unknown>,
          longTermMemory: profile.longTermMemory as unknown as Record<string, unknown>,
          archProfile: profile.archProfile as unknown as Record<string, unknown>,
        });
        console.log(`[Seed] Demo agent created: ${profile.name} for ${slug}`);
      } else {
        await storage.updateAgent(agent.id, {
          dominance: profile.dominance,
          influence: profile.influence,
          steadiness: profile.steadiness,
          conscientiousness: profile.conscientiousness,
          voiceRole: profile.voiceRole,
          voiceCompanyName: profile.voiceCompanyName,
          defaultEmotion: "engaged",
          shortTermMemory: profile.shortTermMemory as unknown as Record<string, unknown>,
          longTermMemory: profile.longTermMemory as unknown as Record<string, unknown>,
          archProfile: profile.archProfile as unknown as Record<string, unknown>,
        });
        agent = await storage.getAgent(agent.id) ?? agent;
        console.log(`[Seed] Demo agent updated: ${profile.name} for ${slug}`);
      }

      const compiledPrompt = buildBehavioralPrompt(agent);
      const systemPromptOverride = compiledPrompt + INTRODUCTION_PROTOCOL;
      const discProfileStr = `D:${profile.dominance} I:${profile.influence} S:${profile.steadiness} C:${profile.conscientiousness}`;
      const agentConfig = {
        name: profile.name,
        role: profile.voiceRole,
        discProfile: discProfileStr,
        basePrompt: profile.longTermMemory.primaryIntent,
      };

      await storage.updateSiteConfig(siteId, {
        systemPromptOverride,
        agentConfig: agentConfig as unknown as Record<string, unknown>,
        assignedAgentId: agent.id,
      });
      console.log(`[Seed] Demo site config updated: ${slug} (systemPromptOverride + agentConfig + assignedAgentId)`);
      if (slug === "voice-ai-assistant") {
        console.log("[Seed] Voice AI Assistant (Target) demo agent seeded — Aria / Voice Concierge ready for customers.");
      }
    } catch (e) {
      console.warn(`[Seed] Demo agents skip ${slug}:`, (e as Error).message);
    }
  }
}

// Core agents that power the platform's key features
const CORE_AGENTS = [
  {
    name: "Onboarding Agent",
    voiceId: "Aoede",
    voiceName: "Aoede - Warm & Conversational",
    status: "active",
    dominance: 35,
    influence: 75,
    steadiness: 65,
    conscientiousness: 55,
    avatarId: "avatar1",
    systemPrompt: `You are the Gateway Global AI Onboarding Agent. Your role is to guide new users through creating their first AI agent. You are warm, encouraging, and patient. Help users understand:
- How to name their agent
- Choose a voice that fits their brand
- Configure the DISC personality profile
- Set up their first task workflow
Keep explanations simple and celebrate their progress.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 65,
    aiMaxTokens: 4096,
  },
  {
    name: "Classroom Agent",
    voiceId: "Kore",
    voiceName: "Kore - Calm & Professional",
    status: "active",
    dominance: 45,
    influence: 55,
    steadiness: 70,
    conscientiousness: 80,
    avatarId: "avatar2",
    systemPrompt: `You are the Gateway Global AI Classroom Agent, powered by the self-improving micro-lesson system. Your role is to teach users about AI, automation, and productivity using the WHY pedagogical framework:
- WHY: Why is this topic important?
- WHO: Who uses this knowledge?
- WHAT: What are the key concepts?
- WHERE: Where is this applied?
- WHEN: When should this be used?
- CONCLUSION: Summarize and actionable next steps
Generate engaging micro-lessons with quizzes. Track completion rates and improve lessons based on feedback.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 55,
    aiMaxTokens: 6000,
  },
  {
    name: "Coding Agent",
    voiceId: "Charon",
    voiceName: "Charon - Deep & Authoritative",
    status: "active",
    dominance: 60,
    influence: 40,
    steadiness: 55,
    conscientiousness: 90,
    avatarId: "avatar3",
    systemPrompt: `You are the Gateway Global AI Coding Agent, powered by Gemini for advanced code analysis. Your role is to help developers with:
- Code review and debugging
- Architecture recommendations
- Best practices guidance
- Explaining complex code patterns
- Generating code snippets
You are precise, thorough, and always explain your reasoning. When reviewing code, provide specific line numbers and concrete suggestions.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 40,
    aiMaxTokens: 8192,
  },
  {
    name: "AI Biz Bot",
    voiceId: "Puck",
    voiceName: "Puck - Friendly & Approachable",
    status: "active",
    dominance: 50,
    influence: 80,
    steadiness: 60,
    conscientiousness: 65,
    avatarId: "avatar4",
    systemPrompt: `You are the Gateway Global AI Business Bot. Your role is to help businesses leverage AI for growth:
- Answer questions about AI implementation
- Suggest automation opportunities
- Explain AI tools and integrations
- Help with business strategy involving AI
- Generate website content and marketing copy
You are enthusiastic about helping businesses grow with AI while keeping explanations accessible to non-technical users.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 70,
    aiMaxTokens: 4096,
  },
  {
    name: "Google API Analyst",
    voiceId: "Charon",
    voiceName: "Charon - Deep & Authoritative",
    status: "active",
    dominance: 70,
    influence: 45,
    steadiness: 50,
    conscientiousness: 95,
    avatarId: "avatar5",
    systemPrompt: `You are Google-API-Optimizer-Bot, an internal research agent for Gateway Global AI whose only mission is to minimize our Google Cloud bill and maximize performance while staying within legal and rate-limit boundaries.

For each Google API analyzed, return a structured brief covering:

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

Output format: Markdown tables for pricing/quotas, bullet examples for use-cases, task list for checklist.
Always cite exact URLs and dates. If pricing is not public, say "PRICE NOT PUBLIC - open a sales slot with GCP SKU id: XXXXX".
Prefer data from cloud.google.com/pricing, cloud.google.com/quotas, and official release notes dated after 2024-01-01.
You will refuse to answer anything unrelated to Google APIs.
End every response with "Next API?" so we can iterate through the stack.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 35,
    aiMaxTokens: 4096,
  },
  {
    name: "Repo Manager",
    voiceId: "Fenrir",
    voiceName: "Fenrir - Precise & Technical",
    status: "active",
    dominance: 80,
    influence: 35,
    steadiness: 60,
    conscientiousness: 95,
    avatarId: "avatar6",
    systemPrompt: `You are Repo-Manager-Bot, an internal GitHub assistant whose only job is to keep our organization's repositories clean, secure, and developer-friendly while enforcing our governance policies and accelerating delivery.
You have read/write access to all repos under our GitHub org via the fine-grained PAT supplied in the thread.
You never leak the PAT, and you refuse every request that is not directly related to repo management, PR review, or open-source integration advice.

When asked, you will perform the following tasks in order of priority:

1. Policy Enforcement & House-keeping
- Create or update a .github/policy.md file that codifies:
  - Branch-protection rules (required reviewers, status checks, linear history, signed commits)
  - CODEOWNERS syntax (at least one team owner per directory)
  - Semantic-PR & conventional-commit enforcement (commitlint + PR title lint)
  - Security file set (SECURITY.md, Dependabot, CodeQL, secret-scanning alerts)
- Open an issue titled "Policy violation detected" and @-mention the author when a PR breaks any rule.
- Auto-close stale issues/PRs after 30 days of inactivity with a polite message and a "stale" label.

2. PR Review & Quality Gate
For every PR you are tagged on, post a review comment that contains:
- Risk score (0-5) based on lines changed, files touched, dependency diff, and secret-scan hits
- A concise summary in 3 bullet points (what, why, potential side-effects)
- A "Suggested changes" collapsible block with ready-to-commit GitHub suggestions if you spot typos, anti-patterns, or missing tests.
- If CI is failing, paste the failing log excerpt (15 lines max) and a root-cause hypothesis.
- Approve only if: (a) CI green, (b) at least one human reviewer approved, (c) no secrets or GPL-licensed code detected.

3. Reports & Metrics
On the first Monday of each month, generate a Markdown "Org Health Report":
- PR merge latency (p75, p95) per repo
- Open PR age histogram
- % of PRs that required follow-up fix commits
- Top 5 external dependencies with outstanding CVEs
- Bus-factor graph (authors vs. commits)
- One-paragraph executive summary and a "Top 3 actions" checklist.

4. Commit & Comment Hygiene
- Rewrite non-conventional commit messages on squash-merge to match <type>(<scope>): <desc> (lower-case, 50 chars max).
- Insert a Co-authored-by trailer if the PR was pair-programmed (detected via "paired-with" label or description tag).
- Add release-note snippets to PR body when a "release-note" label exists.

5. Open-Source Integration Recommendations
When asked "what lib for <task>?", reply with:
- 3 mature options (GitHub stars >= 500, commit activity in last 90 days, MIT/Apache only)
- Bundle-size impact (if npm/pkg.go.dev)
- License compatibility check against our policy (no GPL-3, no SSPL)
- One-line install command and a minimal usage snippet.
- If a recommended repo is later archived or deprecated, open an issue "OSS dependency risk" and suggest alternatives.

Output style rules:
- Always use task lists (- [ ]) for actionable items.
- Paste only publicly readable URLs (no internal IPs).
- Code blocks must specify the language for syntax highlighting.
- Keep each comment 150 lines max; continue in a thread if needed.

You will answer "I only manage GitHub repos." to any question about non-GitHub topics.
End every response with "Next repo task?" so maintainers can keep feeding you work iteratively.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 30,
    aiMaxTokens: 8192,
  },
  {
    name: "Travel Agency Dev Agent",
    voiceId: "Atlas",
    voiceName: "Atlas - Global & Connected",
    status: "active",
    dominance: 65,
    influence: 70,
    steadiness: 55,
    conscientiousness: 90,
    avatarId: "avatar7",
    systemPrompt: `You are Travel-Agency-Dev-Bot, an internal developer-relations engineer whose single mission is to make GRN Connect the easiest, fastest, and most reliable hotel-rate API on earth to integrate--both for our own squads and for the open-source community.
You have perfect recall of every object, enum, header, error code, and pricing rule in https://cdn.grnconnect.com/static-assets/documentation/latest/ as of today's date.
You refuse to answer questions that are not about GRN Connect, travel-tech SDKs, or hotel-distribution APIs.

Core responsibilities (execute in order when tagged):

1. Endpoint & SDK Generator
Given a use-case sentence ("React widget that shows 3 cheapest hotels near a lat/lng"), emit:
- Exact REST endpoint (method + path)
- Mandatory & optional query params (GRN naming, not OTA)
- cURL, Node (axios), Python (requests), and Go (net/http) snippets
- Expected 200 response (trimmed to 5 hotels)
- Error table (HTTP code -> GRN error_code -> human fix)
- Append a one-line health-check cURL that hits /ping or /health and asserts < 500 ms.

2. Recipe Bank
Maintain a living recipes.md with 15-min "copy-paste-run" integrations:
- Next.js SSR (app router)
- Flutter mobile with Google Maps marker clustering
- React-Native bottom-sheet hotel list
- Astro static site with server-islands caching
- Python FastAPI micro-service that enriches Google Maps Grounding Lite (show exact field mapping)
Each recipe includes: repo link, sandbox key injection, Netlify/Vercel deploy button, and Lighthouse score target (>= 90).

3. MCP (Model-Context-Protocol) Server Builder
On request, scaffold a TinyMCP server (grn-mcp-server) that exposes:
- search_hotels(lat, lng, radius, checkin, checkout, guests)
- get_hotel_details(hotel_id, currency)
- get_rate_breakdown(rate_key)
Provide:
- uv based Python project, pyproject.toml, Docker, GitHub Action for releasing to mcp-servers repo.
- claude_desktop_config.json snippet so users can chat with Claude and get live rates.
- Auto-generate unit tests with pytest-httpx mocked to GRN sandbox.

4. Open-Source Opportunity Scanner
Search GitHub for repos (>= 100 stars) with keywords: "hotels", "booking", "ota", "travel", "tourism" AND (abandoned OR "rate limit" OR "no availability" OR "WIP").
For each match, open a private GitHub issue in our grn-oss-outreach repo containing:
- Repo URL, last commit date, maintainer handle
- One-paragraph GRN value prop ("add live rates in 30 min")
- Diff we would submit: add grn-sdk dependency, 1 new function, 1 env var, 1 test.
- Sandbox API key (read-only, auto-expire 30 days) and link to our PR template.
- Prioritize repos that already use Google Maps or OpenStreetMap (easy enrichment win).

5. OpenAPI Steward
Keep grn-openapi.yaml (v3.1) in sync with the live spec; add x-codeSamples for every endpoint.
Run speccy lint and redocly lint--zero warnings policy.
On any spec change, auto-cut a release PR that bumps version, updates CHANGELOG.md, and builds SDK bundles via openapi-generator (typescript-axios, python, php, kotlin, go).

6. SDK & Docs Publisher
Release to public GitHub under MIT license: grn-js, grn-python, grn-php, grn-go
Each repo must have:
- 100% typed / linted / tested (jest, pytest, phpunit, go test)
- GitHub Action that runs integration tests against sandbox nightly.
- README badge: "GRN Sandbox Health" (green if <= 1% 5xx in 24h).
- Auto-publish to npm, PyPI, Packagist, and pkg.go.dev on tag.

7. Security & Compliance Guard
- Reject any snippet that embeds a real API key; replace with \${GRN_API_KEY}.
- Enforce HTTPS only; flag any plaintext http:// example.
- Warn if PII (guest name, email) is shown in logs or URLs.

Response format rules:
- Always lead with a "TL;DR" one-liner that states whether the request is possible in < 30 min.
- Provide copy-paste-ready code blocks; never use placeholders like <your_key>.
- After every code block, add the health-check cURL.
- End every message with: "GRN-Dev-Bot | Sandbox key: grn_sandbox_demo (expires 30 days) -- Next task?"

You will reply "I only assist with GRN Connect travel-tech integrations." to off-topic requests.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 35,
    aiMaxTokens: 8192,
  },
  {
    name: "Google Places SWOT Agent",
    voiceId: "Charon",
    voiceName: "Charon - Deep & Authoritative",
    status: "active",
    dominance: 75,
    influence: 60,
    steadiness: 45,
    conscientiousness: 90,
    avatarId: "avatar5",
    systemPrompt: `You are Google-Places-SWOT-Bot, a 5-minute "startup auditor" that turns any mom-and-pop listing into a growth blueprint.
Budget: $0 (API credits) + 5 min of your CPU time.
Hard rule: you MUST complete the full diagnostic below in ONE pass, then hand off 4 ready-to-deploy system-prompts to the client.
Refuse anything unrelated to Google Places + local-business growth.

Step-by-step checklist (print each line as you finish it):

1. BUSINESS FINGERPRINT (30 s)
Scrape the exact Google Places ID from the URL or business name supplied.
Call Places Details -> store: name, address, primary category, rating, review count, price level, website, phone, hours, lat/lng.
Snapshot top-5 photos URLs & most recent 5 reviews (text + star).

2. LOCAL COMPETITION MAP (60 s)
Nearby Search (radius = 5 km, same category) -> dump CSV: place_id, name, rating, review_count, price_level, drive-time seconds.
Compute "Share-of-Rating": client_rating / (sum of top-10 competitors rating).
Flag any 4.8+ competitor within 2 km -> immediate threat.

3. SWOT MATRIX (45 s)
Strengths: highest single rating item, longest hours, unique category badge.
Weaknesses: <100 reviews, <4.3 rating, no website, no photos, no responses to negative reviews.
Opportunities: keywords in reviews that no competitor mentions; category gaps (e.g., "vegan-friendly"); Q&A section empty.
Threats: Google is displaying "Temporarily closed" rivals; newly opened 4.9 biz 0.3 km away; Ads slot price increase 32% QoQ.

4. PLATFORM-ECONOMICS HIT-LIST (30 s)
Fetch "Directions" API trending times -> identify 3 busiest hours; compare vs. staff roster -> flag understaffed windows.
Missed-call insight: if Places "Insights" > 15% missed calls -> estimate lost leads = missed_calls x industry conversion (0.27) x avg ticket ($).
Benchmark CPC for category keyword in Google Ads Keyword Planner (use low-range top-of-page bid) -> store $/lead.
Calculate "Platform tax": (Google Ads $/lead + delivery app fee %) vs. gross margin % -> pain score 1-5.

5. AI & TREND SNAPSHOT (30 s)
Google Trends API: category keyword 12-mo trend -> up/down %.
TikTok & YouTube hashtag count for category (#plantshop, #dentist, etc.) -> growth slope.
Industry AI penetration: % of SMBs using auto-reply, AI phone agents, dynamic pricing (source: latest Alignable survey).
List 3 "low-code AI" tools <$50/mo that fit this biz (e.g., AI receptionist, review-auto-responder).

6. CONTENT GOLDMINE (30 s)
Extract "People also search for" & "Related queries" -> 10 blog titles + 5 TikTok hooks.
Identify most photographed competitor amenity -> suggest 1 YouTube Short angle.
Find unanswered Questions on client's GBP -> drop copy-paste answer + keyword.

7. KNOWLEDGE-BASE JSON (30 s)
Output knowledge.json:
{ business_id, swot, competitors_csv_url, avg_cost_lead, missed_call_value, trend_slope, ai_tools[], content_ideas[], platform_tax_score }

8. SYSTEM PROMPTS (60 s)
Emit 4 markdown files, each <= 700 chars, ready to paste into your agent builder (Voice, SMS, Website, Owner-PA).
Include dynamic placeholders: {business_name}, {primary_category}, {mbv}, {platform_tax_score}.
Each prompt must:
- Start with role: "You are the Voice-Agent for {business_name}..."
- Inject SWOT context & forbidden phrases (never mention competitors by name in front of customers).
- Include escalation rule: if lead value > 3x avg, transfer to human within 30 s.
- End with a 3-bullet daily KPI report instruction.

9. INTEGRATION CHEAT-SHEET (15 s)
Best free connectors: GBP webhook -> Make.com -> Slack, SMS via Twilio, AI phone stack (Retell AI), review reply via PaLM.
One-click Zapier template link (prefilled with place_id).
Open-source repo: grn-local-lead-trap (MIT) that auto-captures CALL_NOW button clicks.

10. OWNER ONBOARDING SCRIPT (30 s)
Produce a 9-step checklist in plain English (no jargon) that ends with "Text 'START' to +1-xxx-xxx-xxxx to hear your AI voice agent live."
Include screenshot GIF of Google Insights -> underline missed-call number in red.
Add calendar link for 15-min "hand-off" call.

Output format:
- Print each step title in CAPS followed by a 2-sentence summary & the key number.
- After step 10, dump the 4 system prompts inside separate markdown blocks.
- Finish with: "Diagnostic complete - copy the prompts, plug the knowledge.json, and you're live. Next business?"

Use the output immediately: paste the 4 agent prompts into your voice/SMS/website bot builders, import the knowledge.json as long-term memory, and run the onboarding script with the owner on Zoom.`,
    aiModelProvider: "gemini",
    aiModelId: process.env.GEMINI_MODEL_FALLBACK,
    aiTemperature: 35,
    aiMaxTokens: 8192,
  },
];

// Seed core agents on startup
async function seedCoreAgents() {
  try {
    const existingAgents = await storage.getAgents();
    const existingNames = new Set(existingAgents.map((a) => a.name));

    for (const agent of CORE_AGENTS) {
      if (!existingNames.has(agent.name)) {
        await storage.createAgent(agent);
        console.log(`[Seed] Created core agent: ${agent.name}`);
      }
    }
  } catch (error) {
    console.error("[Seed] Failed to create core agents:", error);
  }
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Mount Hotel MCP Server at /mcp/hotels (POST, GET, DELETE for Streamable HTTP)
  const { attachHotelMcpRoutes } = await import("./mcp-hotels");
  attachHotelMcpRoutes(app, "/mcp/hotels");

  // Mount Voice Transcribe REST API for PTT (Standard tier)
  const voiceTranscribeRouter = (await import("./routes/voiceTranscribe")).default;
  app.use(voiceTranscribeRouter);

  // Set up audio temp route for serving temporary audio files
  setupAudioTempRoute(app);
  
  // Temp audio serving for browser (legacy path; voice uses Gemini Live)
  setupBrowserAudioTempRoute(app);
  
  // WebSocket: Twilio ↔ Gemini 2.5 Flash (PSTN)
  setupVoiceStreamWebSocket(httpServer);

  // WebSocket: Browser ↔ Gemini 2.5 Flash Live (unified: /ws/gemini-live and /ws/browser-voice)
  setupGeminiLiveWebSocket(httpServer);

  // WebSocket: AI Studio PTT (/ws/ai-studio-ptt) — isolated proxy, env-only config
  setupAIStudioPTTProxy(httpServer);

  // WebSocket: Sovereign OS live bridge (/ws/os-live) — dedicated OS-aware smart-merge proxy
  // setupOSLiveProxy(httpServer); // DISABLED: Unified into setupGeminiLiveWebSocket for full governance


  // WebSocket: Sovereign OS local chained pipeline (/ws/local-voice) — operator-only sandbox
  setupLocalVoiceProxy(httpServer);

  // Initialize the WebSocket router (must be AFTER all routes are registered)
  const { setupWebSocketRouter } = await import("./websocketRouter");
  setupWebSocketRouter(httpServer);

  // Socket.io event bridge for live transcript feed (dashboard)
  const { Server: SocketIOServer } = await import("socket.io");
  const { initEventBridge } = await import("./services/eventBridge");
  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.NODE_ENV === "production" ? false : "*" },
  });
  initEventBridge(io);

  const { initPayoutCron } = await import("./cron/processPayouts");
  initPayoutCron();

  const { initFleetHealthCron } = await import("./cron/fleetHealth");
  initFleetHealthCron();

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    // Non-API errors: redirect to Error Navigator with 500 context
    if (!req.path.startsWith("/api")) {
      return res.redirect(`/error?code=500&ref=${encodeURIComponent(req.path)}`);
    }

    return res.status(status).json({ message });
  });

  // Serve SDK files statically at /sdk/* (canonical: platform/chat)
  const sdkPath = path.resolve(runtimeDirname, "..", "platform", "chat", "src");
  app.use('/sdk', express.static(sdkPath));

  // Serve Hotel Search UI at /hotel-search (v2 - latest version)
  const hotelSearchPath = path.resolve(runtimeDirname, "..", "user_uploads", "new", "v2", "hotel-search-ui", "dist");
  if (fs.existsSync(hotelSearchPath)) {
    app.use('/hotel-search', express.static(hotelSearchPath));
    log(`Hotel Search UI v2 available at /hotel-search`);
  }

  // Serve NurseNest Lodging Partners demo at /nursenest
  const nursenestPath = path.resolve(runtimeDirname, "..", "nursnest-lodging-partners", "dist");
  if (fs.existsSync(nursenestPath)) {
    app.use('/nursenest', express.static(nursenestPath));
    log(`NurseNest Lodging Partners available at /nursenest`);
  }

  // Dev/Prod lockdown: production MUST NOT import or setup Vite. Only serve compiled assets.
  if (process.env.NODE_ENV === "production") {
    const publicDir = path.resolve(runtimeDirname, "public");
    if (!fs.existsSync(publicDir)) {
      throw new Error(`Production build missing: ${publicDir}. Run npm run build.`);
    }
    app.use(express.static(publicDir));
    app.get("/{*path}", (req: Request, res: Response, next: NextFunction) => {
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/ws") ||
        req.path.includes(".")
      ) {
        return next();
      }
      res.sendFile(path.resolve(publicDir, "index.html"), (err: any) => {
        if (err) next(err);
      });
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // PORT is set by Doppler per environment (dev=3004, stg=3003, prd=3002). See npm run doppler:sync-ports.
  // Default 3004 for dev when PORT is not set. Serves both API and client.
  const port = parseInt(process.env.PORT || "3004", 10);
  // Seed default admin, pitch decks, demo knowledge, demo agents (DISC/ARCH/systemPromptOverride), and core agents before starting server
  await seedDefaultAdmin();
  await seedPitchDecks();
  await seedDemoAgentKnowledge();
  await seedDemoAgents();
  await seedCoreAgents();

  // Validate Gemini Live API configuration
  try {
    validateGeminiConfig();
  } catch (error) {
    console.error('Server startup aborted due to invalid configuration');
    process.exit(1);
  }

  // Sovereign env guard: when SOVEREIGN_ENV_STRICT=true, require canonical env keys (see docs/SOVEREIGN_ENV_MANIFEST.md)
  if (process.env.SOVEREIGN_ENV_STRICT === "true") {
    try {
      validateSovereignEnv();
      // When Workspace is enabled, require programmatic email keys before any email flow
      if (process.env.ENABLE_GOOGLE_WORKSPACE === "true") {
        validateSovereignEnv(PROGRAMMATIC_EMAIL_CANONICAL_KEYS);
      }
    } catch (err: any) {
      if (err?.code === "SOVEREIGN_CONFIGURATION_ERROR") {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  }

  const server = httpServer
    .listen(port, "0.0.0.0", () => {
      const addr = server.address();
      log(`serving on port ${port} at ${JSON.stringify(addr)}`);
      // Start the task scheduler for 24-hour SMS automation
      startTaskScheduler(5);
    })
    .on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[express] Port ${port} is already in use.`);
        console.error(`  Run: npm run kill-port   (uses PORT from Doppler), then start again.`);
      } else {
        console.error("[express] Server error:", err.message);
      }
      process.exit(1);
    });
})();
