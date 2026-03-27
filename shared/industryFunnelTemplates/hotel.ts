/**
 * Hotel / Hospitality — Industry Funnel Payload V1
 * Status: draft
 */
import { FunnelPayload } from "./FunnelPayload";

export const HOTEL_FUNNEL: FunnelPayload = {
  slug: "hotel",
  vertical: "Hotel",
  industryVertical: "hotel",
  status: "draft",
  version: 1,

  seoMeta: {
    title: "AI Voice Concierge for Independent Hotels | Gateway Global AI",
    description: "Stop losing direct bookings to OTA commissions. Gateway AI answers every call, handles reservations, and reclaims the direct booking relationship from Expedia and Booking.com.",
    keywords: ["hotel AI", "hotel voice concierge AI", "independent hotel direct booking", "hotel phone AI", "reduce OTA commissions hotel"],
  },

  hero: {
    eyebrow: "For Independent Hotel Owners",
    headline: "Expedia Takes 15–25% of Every Booking. That's Your Revenue. That's Your Guest.",
    subheadline: "Every call that goes unanswered becomes an OTA booking. Gateway AI answers the phone, handles reservations directly, and captures the guest relationship before the platform does.",
    ctaLabel: "Test Drive Your AI for Free",
    secondaryCtaLabel: "See How It Works",
  },

  painPoints: [
    {
      headline: "You're Paying 15–25% Commission on Every Booking That Should Have Been Direct",
      body: "A guest searches your hotel name, can't reach you directly, and books through Expedia. You just paid $45–$120 in commission for a guest who was already looking for you. That's not a distribution cost — that's a penalty for not answering.",
      stat: "Independent hotels pay $40,000–$180,000/year in OTA commissions on bookings that were direct inquiries.",
      icon: "DollarSign",
    },
    {
      headline: "Your Front Desk Can't Handle Phone Inquiries During Check-In Rush",
      body: "Between 3pm and 6pm, your desk is managing check-ins, luggage requests, and local recommendations — all at once. Calls during this window go unanswered or to a rushed interaction that doesn't convert. That caller books the OTA.",
      stat: "Hotels miss 24% of calls during peak afternoon check-in hours.",
      icon: "PhoneOff",
    },
    {
      headline: "After-Hours Reservation Requests Go to Your Competitor on Booking.com",
      body: "A couple planning a weekend trip is browsing options at 10pm. They call your property — no answer. They go to Booking.com, find your rooms, and book there. You get the reservation and lose 20% of the revenue.",
      icon: "Clock",
    },
    {
      headline: "OTA Reviews Own Your Online Reputation — Not You",
      body: "Your TripAdvisor and Booking.com ratings are real assets — but they live on someone else's platform. A single policy change, a bad algorithm update, or a suspended account can erase years of social proof overnight.",
      icon: "AlertTriangle",
    },
  ],

  demoInput: {
    namePlaceholder: "e.g. The Grand Lakeside Inn",
    locationPlaceholder: "City, State",
    ctaLabel: "Test Drive Your AI Now",
    supportText: "No credit card. No setup fee. See your AI handle a live reservation inquiry and book a room directly — no OTA involved.",
  },

  sampleQuestions: [
    {
      question: "Do you have any rooms available for this weekend?",
      preview: "Yes, we have two rooms available this weekend — a Queen Superior on the 3rd floor and a King Deluxe with a lake view. The King Deluxe is $189/night. Want me to hold it for you? I can confirm the booking right now.",
    },
    {
      question: "What's your cancellation policy?",
      preview: "We offer free cancellation up to 48 hours before your arrival date. After that, the first night is non-refundable. Would you like me to book the room with the free cancellation window while we're talking?",
    },
    {
      question: "Is breakfast included?",
      preview: "Complimentary continental breakfast is included with all room types and served 7am–10am in the main dining room. We also have a full breakfast menu available for an additional charge. Shall I note any dietary preferences for your stay?",
    },
    {
      question: "Do you have a pool and gym?",
      preview: "We have a heated outdoor pool open May through October, and a 24-hour fitness center available year-round. Both are included with every stay. Would you like me to check availability for your dates?",
    },
  ],

  activationTools: {
    headline: "Your Hotel Gets a Direct Booking Engine and Guest Communication System from Day One",
    bullets: [
      "24/7 AI reservations agent — captures direct bookings before the OTA does",
      "Pre-arrival and in-stay communication automated via SMS and voice",
      "Post-checkout review requests that grow your Google and TripAdvisor ratings",
      "Direct booking link for your website — bypasses OTA commissions entirely",
    ],
  },

  offer: {
    free: "Try it free — no credit card, no setup fee",
    base: "$49/mo — Full Voice AI Platform",
    pack: "$99/mo — Voice + Comms Pack",
    packPrice: "$99/month",
    guarantee: "Cancel anytime. No contracts. Your guest database belongs to your property.",
  },

  trustSignals: [
    { text: "Independent hotels on Gateway shift 12–18% of bookings from OTA to direct in the first 90 days." },
    { text: "Every direct booking recovered saves $45–$120 in OTA commission fees." },
    { text: "Guest data stays in your PMS — never shared with booking platforms." },
    { text: "Works alongside your existing PMS (Opera, Cloudbeds, Little Hotelier) via webhook." },
    { text: "Average hotel saves $3,200/month in recaptured direct booking revenue within 60 days.", source: "Gateway Platform" },
  ],

  conversationWorkflow: {
    version: 1,
    industryVertical: "hotel",
    phases: [
      {
        id: "greeting",
        label: "Greeting",
        goal: "Welcome the caller and determine if this is a reservation inquiry, existing booking, or guest service",
        allowedIntent: "visitor",
        requiredContextKeys: ["inquiry_type"],
        outputContract: {
          must: ["Answer with property name and warmth", "Ask about the nature of their call"],
          mustNot: ["Redirect to the website", "Mention OTA platforms"],
          maxSentences: 2,
        },
        boldClaimHint: "Book directly and keep the commission in your pocket",
      },
      {
        id: "pain_discovery",
        label: "Stay Discovery",
        goal: "Understand dates, room preference, and group size",
        allowedIntent: "visitor",
        requiredContextKeys: ["check_in_date"],
        outputContract: {
          must: ["Ask for check-in and check-out dates", "Ask about number of guests and any special requests"],
          mustNot: ["Quote rates before checking availability"],
          maxSentences: 3,
        },
      },
      {
        id: "demo_offer",
        label: "Room Offer",
        goal: "Present available room options and offer to hold the reservation",
        allowedIntent: "visitor",
        requiredContextKeys: ["business_name", "business_location"],
        outputContract: {
          must: ["Present 1–2 room options with rates", "Offer to hold the room immediately"],
          mustNot: ["Suggest checking Expedia or Booking.com", "Mention competitors"],
          maxSentences: 4,
        },
      },
      {
        id: "activation",
        label: "Booking Confirmation",
        goal: "Confirm the direct booking and collect contact information",
        allowedIntent: "visitor",
        requiredContextKeys: ["demo_completed"],
        outputContract: {
          must: ["Confirm dates, room type, and rate", "Collect name and email for confirmation"],
          mustNot: ["Require payment over the phone unless explicitly asked"],
          maxSentences: 4,
        },
      },
    ],
    transitions: [
      { fromPhaseId: "greeting", toPhaseId: "pain_discovery", when: { contextKeysPresent: ["inquiry_type"] } },
      { fromPhaseId: "pain_discovery", toPhaseId: "demo_offer", when: { contextKeysPresent: ["check_in_date"] } },
      { fromPhaseId: "demo_offer", toPhaseId: "activation", when: { contextKeysPresent: ["business_name", "business_location"] } },
    ],
    industryKnowledgeRef: {
      source: "artifact_key",
      value: "funnel_payload_hotel_v1",
      title: "Hotel Funnel Payload V1",
    },
  },

  sovereigntyHook: "Expedia, Booking.com, and Hotels.com charge you 15–25% of every reservation — for a guest who was already looking for your property. They don't create demand. They intercept it. Gateway AI answers your phone, books the room directly, and the guest relationship — their name, their preferences, their loyalty — belongs to your property, not to a platform in Amsterdam.",
  generatedBy: "funnel_builder_agent",
  generatedAt: "2026-03-25",
};
