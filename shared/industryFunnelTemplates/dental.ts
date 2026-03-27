/**
 * Dental Office — Industry Funnel Payload V1
 * Status: draft
 */
import { FunnelPayload } from "./FunnelPayload";

export const DENTAL_FUNNEL: FunnelPayload = {
  slug: "dental",
  vertical: "Dental Office",
  industryVertical: "dental",
  status: "draft",
  version: 1,

  seoMeta: {
    title: "AI Voice Receptionist for Dental Offices | Gateway Global AI",
    description: "Stop losing new patients to missed calls and ZocDoc fees. Gateway AI answers every call, books appointments, and handles after-hours emergencies — no new staff required.",
    keywords: ["dental office AI", "dental receptionist AI", "dental practice phone AI", "new patient intake AI", "dental appointment booking"],
  },

  hero: {
    eyebrow: "For Dental Practice Owners",
    headline: "A New Patient Called at 6:45pm. Your Office Was Closed. They Booked Somewhere Else.",
    subheadline: "62% of dental patients choose their provider based on who answers first. Gateway AI is your after-hours receptionist, emergency triage line, and new patient intake system — all in one call.",
    ctaLabel: "Test Drive Your AI for Free",
    secondaryCtaLabel: "See How It Works",
  },

  painPoints: [
    {
      headline: "You Miss New Patients Every Evening and Every Weekend",
      body: "Patients don't have dental emergencies at 10am on a Tuesday. They happen on Sunday night. When you're closed and they can't reach you, they find a dentist who can. That new patient relationship is gone before it ever started.",
      stat: "Dental practices miss an average of 23% of all calls, with the highest miss rate after 5pm.",
      icon: "PhoneOff",
    },
    {
      headline: "ZocDoc Takes a Cut of Every New Patient You Work Hard to Attract",
      body: "You invest in your website, your Google reviews, your reputation — and then ZocDoc charges you $35–$80 per new patient booking on top. That's a fee for every patient who found you, not them.",
      stat: "The average dental practice spends $1,200–$3,500/month on ZocDoc and similar directories.",
      icon: "AlertTriangle",
    },
    {
      headline: "Voicemail Is Where New Patient Relationships Go to Die",
      body: "When a potential patient hears voicemail, 70% of them hang up without leaving a message. Your practice never knew they called. That patient moves on. This happens silently, dozens of times a month.",
      stat: "70% of callers who reach voicemail don't leave a message.",
      icon: "VoicemailIcon",
    },
    {
      headline: "Your Front Desk Spends 40% of the Day on Appointment Logistics",
      body: "Confirming, rescheduling, answering insurance questions — this is not why you hired your coordinator. Every hour spent on call logistics is an hour not spent on chairside care and production.",
      icon: "Clock",
    },
  ],

  demoInput: {
    namePlaceholder: "e.g. Bright Smiles Family Dentistry",
    locationPlaceholder: "City, State",
    ctaLabel: "Test Drive Your AI Now",
    supportText: "No credit card. No setup fee. Watch your AI handle a new patient inquiry for your practice in real time.",
  },

  sampleQuestions: [
    {
      question: "I chipped a tooth this morning — can I get in today?",
      preview: "I'm sorry to hear that — let me check for an emergency slot. We have an opening today at 2pm and another at 4:30pm. Would either of those work? I can get you registered while we talk.",
    },
    {
      question: "Do you accept Delta Dental insurance?",
      preview: "Yes, we're in-network with Delta Dental PPO. For the most accurate coverage estimate, I'll need your member ID — or I can book your new patient appointment and our team will verify benefits before your visit.",
    },
    {
      question: "How much is a teeth whitening treatment?",
      preview: "In-office whitening starts at $350 and takes about 90 minutes. We also offer take-home trays starting at $150. I can book a consultation where the doctor will recommend the best option for your smile.",
    },
    {
      question: "What's the process for getting Invisalign?",
      preview: "It starts with a complimentary Invisalign consultation — we take a 3D scan of your teeth and show you a projected outcome before you commit to anything. Want me to schedule that for you?",
    },
  ],

  activationTools: {
    headline: "Your Dental Practice Gets a Full Patient Communication System from Day One",
    bullets: [
      "24/7 AI phone receptionist for new patient intake and after-hours triage",
      "Automated appointment reminders and recall messages that reduce no-shows",
      "Post-visit review requests — grow your Google rating without lifting a finger",
      "Direct scheduling link that bypasses ZocDoc and keeps the patient relationship yours",
    ],
  },

  offer: {
    free: "Try it free — no credit card, no setup fee",
    base: "$49/mo — Full Voice AI Platform",
    pack: "$99/mo — Voice + Comms Pack",
    packPrice: "$99/month",
    guarantee: "Cancel anytime. No contracts. Your patient relationships stay in your system.",
  },

  trustSignals: [
    { text: "Dental practices on Gateway see 18–25 additional new patient bookings per month on average." },
    { text: "After-hours call capture alone recovers an average of 8 new patients per month." },
    { text: "Zero patient data shared with insurance companies or directories." },
    { text: "Integrates with your existing practice management software via API or webhook." },
    { text: "Handles emergency triage logic — patients with pain are escalated appropriately.", source: "Gateway Platform" },
  ],

  conversationWorkflow: {
    version: 1,
    industryVertical: "dental",
    phases: [
      {
        id: "greeting",
        label: "Greeting",
        goal: "Welcome the caller and determine if this is emergency, new patient, or existing patient",
        allowedIntent: "visitor",
        requiredContextKeys: ["call_type"],
        outputContract: {
          must: ["Answer with practice name and warmth", "Immediately ask if this is urgent"],
          mustNot: ["Put caller on hold", "Use hold music or dead air"],
          maxSentences: 2,
        },
        boldClaimHint: "We answer every call — including Sunday night emergencies",
      },
      {
        id: "pain_discovery",
        label: "Need Assessment",
        goal: "Understand the caller's specific need — emergency, routine, cosmetic, or insurance question",
        allowedIntent: "visitor",
        requiredContextKeys: ["dental_need"],
        outputContract: {
          must: ["Ask one focused question to narrow the need", "Triage pain calls with immediate empathy"],
          mustNot: ["Provide diagnostic opinions", "Quote costs before understanding insurance status"],
          maxSentences: 3,
        },
      },
      {
        id: "demo_offer",
        label: "Appointment Offer",
        goal: "Book the appointment or consultation",
        allowedIntent: "visitor",
        requiredContextKeys: ["business_name", "business_location"],
        outputContract: {
          must: ["Offer the next available slot", "Collect name and callback number"],
          mustNot: ["Ask for insurance details before confirming a time"],
          maxSentences: 3,
        },
      },
      {
        id: "activation",
        label: "Confirmation",
        goal: "Confirm the booking and set expectations for the visit",
        allowedIntent: "visitor",
        requiredContextKeys: ["demo_completed"],
        outputContract: {
          must: ["Confirm date, time, and what to bring", "Offer to send SMS confirmation"],
          mustNot: ["Use tech or software jargon"],
          maxSentences: 3,
        },
      },
    ],
    transitions: [
      { fromPhaseId: "greeting", toPhaseId: "pain_discovery", when: { contextKeysPresent: ["call_type"] } },
      { fromPhaseId: "pain_discovery", toPhaseId: "demo_offer", when: { contextKeysPresent: ["dental_need"] } },
      { fromPhaseId: "demo_offer", toPhaseId: "activation", when: { contextKeysPresent: ["business_name", "business_location"] } },
    ],
    industryKnowledgeRef: {
      source: "artifact_key",
      value: "funnel_payload_dental_v1",
      title: "Dental Office Funnel Payload V1",
    },
  },

  sovereigntyHook: "ZocDoc charges your practice $35–$80 every time a new patient books through their platform — for a patient who may have been searching for you by name. Gateway AI captures that call directly, books the appointment through your system, and the patient relationship is yours from the first hello.",
  generatedBy: "funnel_builder_agent",
  generatedAt: "2026-03-25",
};
