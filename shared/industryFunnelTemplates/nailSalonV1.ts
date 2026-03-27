import type { ConversationWorkflow } from "../conversationWorkflow";

/** Reference workflow — Nail Salon v1 (see user_uploads/new/Nail_Salon_Funnel_v1.md) */
export const NAIL_SALON_WORKFLOW_V1: ConversationWorkflow = {
  version: 1,
  industryVertical: "nail_salon",
  industryKnowledgeRef: {
    source: "slug",
    value: "nail_salon_industry_research",
    title: "Nail Salon Industry Research (summary)",
  },
  phases: [
    {
      id: "capture_snapshot",
      label: "Salon snapshot & pain",
      goal: "Bold claim + collect salon name and city/state before any pricing or stack talk.",
      allowedIntent: "both",
      requiredContextKeys: ["owner_salon_name", "owner_city"],
      outputContract: {
        must: [
          "Open with one bold claim about missed calls, after-hours demand, or no-shows (nail-salon relevant).",
          "Ask for salon name and city/state in plain language.",
        ],
        mustNot: [
          "Full platform architecture or layer cake",
          "Pricing ($49/$50/$299) unless the user explicitly asks for numbers",
          "Internal reasoning, confidence scores, or markdown process headings",
        ],
        maxSentences: 8,
      },
      boldClaimHint:
        "Most salons still lose bookings to missed calls and off-hours texts — an AI front desk captures that demand without adding payroll.",
      disclosureTierHint: "minimal",
    },
    {
      id: "demo_value",
      label: "Demo value",
      goal: "This-is-your-business examples; sample customer questions.",
      allowedIntent: "both",
      requiredContextKeys: ["owner_salon_name", "owner_city", "demo_ready"],
      outputContract: {
        must: [
          "Use their salon name in examples.",
          "Offer 2–3 realistic customer questions a front desk would answer.",
        ],
        mustNot: ["Lead with QR or telephony SKUs"],
        maxSentences: 10,
      },
      disclosureTierHint: "standard",
    },
    {
      id: "activation_and_offer",
      label: "Activation & offer",
      goal: "Channels (voice/chat/web) then paid path when the buyer is ready.",
      allowedIntent: "owner",
      requiredContextKeys: ["owner_salon_name", "owner_city", "demo_ready"],
      outputContract: {
        must: [
          "Summarize how customers reach the AI (web/voice/chat) clearly.",
          "Only then discuss paid activation / industry pack, tied to outcomes.",
        ],
        mustNot: ["Spec-sheet ramble without tying to their salon"],
        maxSentences: 14,
      },
      disclosureTierHint: "full",
    },
  ],
  transitions: [
    {
      fromPhaseId: "capture_snapshot",
      toPhaseId: "demo_value",
      when: { contextKeysPresent: ["owner_salon_name", "owner_city"] },
    },
    {
      fromPhaseId: "demo_value",
      toPhaseId: "activation_and_offer",
      when: { contextKeysPresent: ["demo_ready"] },
    },
  ],
};

export const NAIL_SALON_FUNNEL_V1_ENTRY = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Nail Salon — AI Front Desk v1",
  terminalAction: "lead" as const,
  entryPoints: ["homepage_widget", "qr_code"],
  conversionObjective:
    "Owner requests a free salon-specific demo and moves toward paid location activation.",
  fallbackRoutes: {
    website: "https://gatewayglobal.ai",
    booking: "",
    ordering: "",
    support: "",
  },
  conversationWorkflow: NAIL_SALON_WORKFLOW_V1,
};
