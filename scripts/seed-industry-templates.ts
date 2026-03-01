/**
 * Seed industry_agent_templates: 8 business groups × 6 archetypes (48 rows).
 * Run: npm run db:seed-industry-templates
 * Or: doppler run -- npx tsx scripts/seed-industry-templates.ts
 * From worktree: doppler run --project aibizbot-clearvoice --config dev -- npx tsx scripts/seed-industry-templates.ts
 */

import { db } from "../server/db";
import {
  industryAgentTemplates,
  INDUSTRY_GROUPS,
  type IndustryGroup,
} from "@shared/schema";
const ARCHETYPES: Array<{
  roleType: string;
  defaultName: string;
  primaryIntent: string;
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}> = [
  {
    roleType: "concierge",
    defaultName: "Front Desk Concierge",
    primaryIntent:
      "Triage & Welcome. Handles FAQs, business hours, parking; routes the user to the right place. Warm, welcoming, never rushes the caller.",
    dominance: 40,
    influence: 70,
    steadiness: 70,
    conscientiousness: 40,
  },
  {
    roleType: "booking_coordinator",
    defaultName: "Booking Coordinator",
    primaryIntent:
      "Calendar Ops. Focused on getting a time on the calendar, rescheduling, or canceling. Detail-oriented, organized, politely drives toward a firm commitment.",
    dominance: 50,
    influence: 40,
    steadiness: 50,
    conscientiousness: 75,
  },
  {
    roleType: "lead_qualifier",
    defaultName: "Sarah (Intake Specialist)",
    primaryIntent:
      "Capture & Estimate. Gathers customer details, qualifying questions, preps data for a human closer. Confident, goal-oriented, asks clear questions without being pushy.",
    dominance: 70,
    influence: 60,
    steadiness: 40,
    conscientiousness: 50,
  },
  {
    roleType: "retention_empath",
    defaultName: "Retention & Support",
    primaryIntent:
      "De-escalation & Support. Handles complaints, lost items, or bad experiences. Validates the user's frustration first. Seeks to Make the Moment Right.",
    dominance: 30,
    influence: 50,
    steadiness: 85,
    conscientiousness: 50,
  },
  {
    roleType: "billing_analyst",
    defaultName: "Billing Analyst",
    primaryIntent:
      "Accounts & Payments. Handles invoice questions, pricing breakdowns, payment links. Highly precise, formal, sticks strictly to facts and numbers.",
    dominance: 40,
    influence: 30,
    steadiness: 50,
    conscientiousness: 85,
  },
  {
    roleType: "gatekeeper",
    defaultName: "Receptionist (Gatekeeper)",
    primaryIntent:
      "Triage, Route, & Protect. Answers the main line, identifies intent, blocks solicitors, takes precise messages, routes to departments. Professional, unflappable.",
    dominance: 40,
    influence: 40,
    steadiness: 85,
    conscientiousness: 80,
  },
];

async function seed() {
  console.log("🗑️  Clearing existing industry_agent_templates...");
  await db.delete(industryAgentTemplates);

  const rows: Array<{
    industryGroup: string;
    roleType: string;
    defaultName: string;
    primaryIntent: string;
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
  }> = [];

  for (const industryGroup of INDUSTRY_GROUPS) {
    for (const arch of ARCHETYPES) {
      rows.push({
        industryGroup,
        roleType: arch.roleType,
        defaultName: arch.defaultName,
        primaryIntent: arch.primaryIntent,
        dominance: arch.dominance,
        influence: arch.influence,
        steadiness: arch.steadiness,
        conscientiousness: arch.conscientiousness,
      });
    }
  }

  console.log(`📥 Inserting ${rows.length} templates (${INDUSTRY_GROUPS.length} industries × ${ARCHETYPES.length} archetypes)...`);
  await db.insert(industryAgentTemplates).values(rows);

  console.log("✅ Seed completed successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
