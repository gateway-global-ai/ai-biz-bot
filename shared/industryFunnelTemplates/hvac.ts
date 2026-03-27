/**
 * HVAC — Industry Funnel Payload V1
 * Status: draft
 */
import { FunnelPayload } from "./FunnelPayload";

export const HVAC_FUNNEL: FunnelPayload = {
  slug: "hvac",
  vertical: "HVAC",
  industryVertical: "hvac",
  status: "draft",
  version: 1,

  seoMeta: {
    title: "AI Voice Dispatch for HVAC Companies | Gateway Global AI",
    description: "Stop losing emergency service calls and seasonal tune-up leads. Gateway AI answers every call, captures the job, and dispatches your team — even at 2am.",
    keywords: ["HVAC AI", "HVAC dispatch AI", "HVAC phone answering service", "HVAC missed calls", "HVAC emergency dispatch"],
  },

  hero: {
    eyebrow: "For HVAC Business Owners",
    headline: "It's 2am. Their AC Died. They Called You. No One Answered.",
    subheadline: "Emergency HVAC calls don't wait for business hours — and neither do your competitors. Gateway AI captures every call, qualifies the job, and queues the dispatch while you sleep.",
    ctaLabel: "Test Drive Your AI for Free",
    secondaryCtaLabel: "See How It Works",
  },

  painPoints: [
    {
      headline: "Emergency Calls at 2am Go to Your Competitor if No One Picks Up",
      body: "An AC failure in July or a furnace emergency in January is a high-urgency job with a customer who needs help now. If you don't answer, the next HVAC company that does gets a $1,500–$4,000 emergency service job. This happens multiple times a season.",
      stat: "HVAC companies miss 28% of after-hours calls — 80% of those callers book the next company that answers.",
      icon: "PhoneOff",
    },
    {
      headline: "Seasonal Peak Means Every Tech is Running — and No One's Watching the Phone",
      body: "When your team is fully booked in summer or winter, the phone still rings. New customers calling during a heat wave or cold snap can't wait on hold. They move on. Your busiest season is also your biggest leak.",
      icon: "Thermometer",
    },
    {
      headline: "HomeAdvisor and Angi Take 20–30% of Every Job You Win Through Their Platform",
      body: "You pay for leads, compete in a bidding war, and then pay again when you win. HomeAdvisor and Angi don't refer customers — they auction them. And the customer relationship? It belongs to the platform, not to you.",
      stat: "HVAC contractors on Angi pay $15–$80 per lead, plus platform fees on completed jobs.",
      icon: "AlertTriangle",
    },
    {
      headline: "Maintenance Plan Renewals Slip Through the Cracks Without Automation",
      body: "You've built a book of maintenance plan customers who are worth $200–$400/year in recurring revenue. But without an automated outreach system, renewals go quiet, customers forget, and you lose the recurring revenue you already earned.",
      icon: "RefreshCw",
    },
  ],

  demoInput: {
    namePlaceholder: "e.g. Premier HVAC Services",
    locationPlaceholder: "City, State",
    ctaLabel: "Test Drive Your AI Now",
    supportText: "No credit card. No setup fee. See your AI handle a live emergency dispatch call for your business.",
  },

  sampleQuestions: [
    {
      question: "My AC stopped working and it's 95 degrees — can someone come today?",
      preview: "Absolutely — we have emergency slots available today. I'm capturing your address and system details right now. What's the make of your unit and when did it stop? I'll have a tech dispatched within the hour.",
    },
    {
      question: "How much does a furnace tune-up cost?",
      preview: "Furnace tune-ups start at $89 and typically take about 45 minutes. We're booking fall tune-ups now — want me to lock in a slot before the rush? We're filling up fast this week.",
    },
    {
      question: "Do you offer maintenance plans?",
      preview: "Yes — our maintenance plan covers two tune-ups per year, priority emergency scheduling, and a 15% discount on parts. It's $199/year and pays for itself on the first priority call. Want to sign up now?",
    },
    {
      question: "My heat pump is making a loud noise — is that an emergency?",
      preview: "It depends on the sound. A grinding noise usually means a failing motor bearing — that's urgent. A rattling noise is often just debris. Can you describe it? I can schedule a diagnostic visit while we talk.",
    },
  ],

  activationTools: {
    headline: "Your HVAC Business Gets a Full 24/7 Dispatch System from Day One",
    bullets: [
      "24/7 AI emergency dispatch — captures every after-hours service call",
      "Automated maintenance plan renewal reminders sent each season",
      "Job qualification on every call — confirms location, system type, and urgency",
      "Direct booking that bypasses HomeAdvisor and Angi lead fees entirely",
    ],
  },

  offer: {
    free: "Try it free — no credit card, no setup fee",
    base: "$49/mo — Full Voice AI Platform",
    pack: "$99/mo — Voice + Comms Pack",
    packPrice: "$99/month",
    guarantee: "Cancel anytime. No contracts. Every lead you capture is yours to keep.",
  },

  trustSignals: [
    { text: "HVAC companies on Gateway capture an average of 14 additional service jobs per month." },
    { text: "After-hours emergency call capture alone generates $4,000–$12,000 in additional monthly revenue." },
    { text: "Zero lead fees. Your customers call your number — you own every relationship." },
    { text: "Works with any dispatch software via SMS handoff or webhook integration." },
    { text: "Seasonal ramp — AI handles the surge so your team stays focused on jobs.", source: "Gateway Platform" },
  ],

  conversationWorkflow: {
    version: 1,
    industryVertical: "hvac",
    phases: [
      {
        id: "greeting",
        label: "Greeting",
        goal: "Determine if this is emergency, routine service, or new customer",
        allowedIntent: "visitor",
        requiredContextKeys: ["call_urgency"],
        outputContract: {
          must: ["Answer immediately with company name", "Ask if this is an emergency first"],
          mustNot: ["Put caller on hold", "Ask for billing info before understanding the problem"],
          maxSentences: 2,
        },
        boldClaimHint: "We answer 24/7 — even during peak season",
      },
      {
        id: "pain_discovery",
        label: "Job Qualification",
        goal: "Qualify the job type, system details, and urgency level",
        allowedIntent: "visitor",
        requiredContextKeys: ["job_type"],
        outputContract: {
          must: ["Ask about system type and symptoms", "For emergencies, express urgency and collect location immediately"],
          mustNot: ["Quote prices before understanding the scope"],
          maxSentences: 4,
        },
      },
      {
        id: "demo_offer",
        label: "Dispatch Offer",
        goal: "Schedule the job or dispatch for emergency",
        allowedIntent: "visitor",
        requiredContextKeys: ["business_name", "business_location"],
        outputContract: {
          must: ["Confirm the next available slot or emergency dispatch time", "Collect address and contact info"],
          mustNot: ["Promise a specific technician by name unless certain"],
          maxSentences: 3,
        },
      },
      {
        id: "activation",
        label: "Confirmation",
        goal: "Confirm the booking and introduce recurring maintenance value",
        allowedIntent: "visitor",
        requiredContextKeys: ["demo_completed"],
        outputContract: {
          must: ["Confirm job time and tech arrival window", "Mention maintenance plan briefly"],
          mustNot: ["Be pushy about the maintenance plan if emergency caller"],
          maxSentences: 4,
        },
      },
    ],
    transitions: [
      { fromPhaseId: "greeting", toPhaseId: "pain_discovery", when: { contextKeysPresent: ["call_urgency"] } },
      { fromPhaseId: "pain_discovery", toPhaseId: "demo_offer", when: { contextKeysPresent: ["job_type"] } },
      { fromPhaseId: "demo_offer", toPhaseId: "activation", when: { contextKeysPresent: ["business_name", "business_location"] } },
    ],
    industryKnowledgeRef: {
      source: "artifact_key",
      value: "funnel_payload_hvac_v1",
      title: "HVAC Funnel Payload V1",
    },
  },

  sovereigntyHook: "HomeAdvisor and Angi don't refer customers — they sell them. You pay per lead, compete in a race to the bottom on price, and the customer's phone number belongs to the platform's CRM. Gateway puts your number on the job. Your customer calls you. You own the relationship.",
  generatedBy: "funnel_builder_agent",
  generatedAt: "2026-03-25",
};
