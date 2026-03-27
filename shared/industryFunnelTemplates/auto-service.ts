/**
 * Auto Service — Industry Funnel Payload V1
 * Status: draft
 */
import { FunnelPayload } from "./FunnelPayload";

export const AUTO_SERVICE_FUNNEL: FunnelPayload = {
  slug: "auto-service",
  vertical: "Auto Service",
  industryVertical: "auto_service",
  status: "draft",
  version: 1,

  seoMeta: {
    title: "AI Voice Advisor for Auto Service Shops | Gateway Global AI",
    description: "Stop losing service appointments to missed calls and CarFax fees. Gateway AI answers every call, books the service bay, and keeps your shop schedule full — without a service writer on the phone.",
    keywords: ["auto shop AI", "auto service phone AI", "mechanic appointment booking AI", "car repair shop AI", "auto service missed calls"],
  },

  hero: {
    eyebrow: "For Auto Service Shop Owners",
    headline: "Your Bay is Empty at 10am Because No One Called Back Yesterday",
    subheadline: "Every unanswered call is a service appointment that went to the dealer or the shop down the street. Gateway AI answers while your team is under a car — captures the job, books the bay, and keeps your schedule full.",
    ctaLabel: "Test Drive Your AI for Free",
    secondaryCtaLabel: "See How It Works",
  },

  painPoints: [
    {
      headline: "Your Service Writer Is Knee-Deep in an Estimate — the Phone Keeps Ringing",
      body: "When your counter person is walking a customer through a repair list, every new call rings unanswered. That caller needs an oil change, a brake job, or a transmission diagnosis — and they're booking whoever picks up first.",
      stat: "Auto shops miss an average of 31% of inbound calls during peak morning hours.",
      icon: "PhoneOff",
    },
    {
      headline: "RepairPal and CarFax Charge You for Trust You Already Earned",
      body: "You've been in this community for years. Your Google reviews are solid. But when a customer searches for shops, platforms charge you $50–$200/month just to show up on their directory — and they put your competitors right next to you.",
      stat: "Independent shops pay $600–$2,400/year on directory and listing platform fees.",
      icon: "AlertTriangle",
    },
    {
      headline: "No-Shows Kill Your Shop Efficiency and Your Revenue",
      body: "You hold a bay for a scheduled appointment. No-show. That bay is dark for 2 hours — time you can't recover. Without automated reminders, no-show rates for independent auto shops run 18–25% of scheduled appointments.",
      stat: "Industry average no-show rate for auto shops without reminders: 22%.",
      icon: "CalendarX",
    },
    {
      headline: "Saturday Walk-Ins Can't Reach You for Estimates During the Week",
      body: "Customers researching a repair call Monday through Friday for an estimate. If you're in the shop and no one answers, they get the estimate from the dealer and never come back. The weekday phone is your sales floor.",
      icon: "Clock",
    },
  ],

  demoInput: {
    namePlaceholder: "e.g. Precision Auto Repair",
    locationPlaceholder: "City, State",
    ctaLabel: "Test Drive Your AI Now",
    supportText: "No credit card. No setup fee. See your AI take a live service inquiry and book the appointment while your crew stays under the hood.",
  },

  sampleQuestions: [
    {
      question: "I need an oil change — how soon can I get in?",
      preview: "We have openings tomorrow at 8am and 11am, and this Saturday at 9am. Which works for you? I'll grab your make, model, and mileage while we're talking so the tech is ready when you arrive.",
    },
    {
      question: "My brakes are squeaking — is that dangerous?",
      preview: "Squeaking brakes usually mean worn pads, which is a safety concern. It's worth getting in soon. I can schedule a free brake inspection — no commitment, just a visual check. Want to lock in a time?",
    },
    {
      question: "How much does it cost to replace rotors and pads?",
      preview: "Front rotors and pads run $250–$450 depending on your vehicle. I can give you a firm estimate if you share your year, make, and model. Want me to book a brake inspection so we can confirm the exact scope?",
    },
    {
      question: "My check engine light came on — what do you charge for diagnostics?",
      preview: "Diagnostic scans are $89.95 and take about 30–45 minutes. If you have the repair done with us, we credit the diagnostic fee toward the work. Want to bring it in this week?",
    },
  ],

  activationTools: {
    headline: "Your Shop Gets a Full Communication and Scheduling System from Day One",
    bullets: [
      "24/7 AI service advisor that captures calls and books the bay while you're working",
      "Automated appointment reminders that cut no-shows by up to 60%",
      "Post-service review requests — build your Google rating without asking in person",
      "Direct booking link that bypasses directory platforms and lead fees entirely",
    ],
  },

  offer: {
    free: "Try it free — no credit card, no setup fee",
    base: "$49/mo — Full Voice AI Platform",
    pack: "$99/mo — Voice + Comms Pack",
    packPrice: "$99/month",
    guarantee: "Cancel anytime. No contracts. Your customer relationships are yours.",
  },

  trustSignals: [
    { text: "Auto shops on Gateway book 16–24 additional service appointments per month on average." },
    { text: "No-show rates drop from 22% to under 7% with automated SMS reminders." },
    { text: "Zero lead fees. Every call to your number is captured and owned by your shop." },
    { text: "Works with Tekmetric, ShopWare, and most shop management systems via SMS handoff." },
    { text: "Handles multi-vehicle households — AI remembers service history context mid-call.", source: "Gateway Platform" },
  ],

  conversationWorkflow: {
    version: 1,
    industryVertical: "auto_service",
    phases: [
      {
        id: "greeting",
        label: "Greeting",
        goal: "Answer immediately and identify if this is a service booking, estimate request, or status check",
        allowedIntent: "visitor",
        requiredContextKeys: ["call_type"],
        outputContract: {
          must: ["Answer with shop name and warmth", "Ask what brings them in or what they need"],
          mustNot: ["Ask for vehicle info before establishing need"],
          maxSentences: 2,
        },
        boldClaimHint: "We answer while your tech is under the car",
      },
      {
        id: "pain_discovery",
        label: "Service Assessment",
        goal: "Understand the vehicle, the issue, and urgency",
        allowedIntent: "visitor",
        requiredContextKeys: ["service_need"],
        outputContract: {
          must: ["Ask for year, make, and model", "Ask about the specific symptom or service needed"],
          mustNot: ["Quote a price without vehicle details"],
          maxSentences: 3,
        },
      },
      {
        id: "demo_offer",
        label: "Appointment Offer",
        goal: "Book the service appointment or inspection",
        allowedIntent: "visitor",
        requiredContextKeys: ["business_name", "business_location"],
        outputContract: {
          must: ["Offer the next available slot", "Confirm vehicle year/make/model for the booking"],
          mustNot: ["Promise a firm price before inspection"],
          maxSentences: 3,
        },
      },
      {
        id: "activation",
        label: "Confirmation",
        goal: "Confirm the booking and set drop-off expectations",
        allowedIntent: "visitor",
        requiredContextKeys: ["demo_completed"],
        outputContract: {
          must: ["Confirm time, what to bring, and where to drop off", "Offer to send SMS confirmation"],
          mustNot: ["Use tech or software jargon"],
          maxSentences: 3,
        },
      },
    ],
    transitions: [
      { fromPhaseId: "greeting", toPhaseId: "pain_discovery", when: { contextKeysPresent: ["call_type"] } },
      { fromPhaseId: "pain_discovery", toPhaseId: "demo_offer", when: { contextKeysPresent: ["service_need"] } },
      { fromPhaseId: "demo_offer", toPhaseId: "activation", when: { contextKeysPresent: ["business_name", "business_location"] } },
    ],
    industryKnowledgeRef: {
      source: "artifact_key",
      value: "funnel_payload_auto_service_v1",
      title: "Auto Service Funnel Payload V1",
    },
  },

  sovereigntyHook: "RepairPal, CarFax, and Mechanic Advisor charge you to be found by customers who would have called you anyway. You're paying a toll on your own reputation. Gateway captures every call directly — no middleman, no directory fee, no algorithm deciding whether your shop shows up this week.",
  generatedBy: "funnel_builder_agent",
  generatedAt: "2026-03-25",
};
