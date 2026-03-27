/**
 * Boardwalk Suites Lafayette — Agent Swarm Provisioning + Knowledge Seed
 *
 * This script EXTENDS scripts/setup-boardwalk-suites.ts (which handles the
 * site config, customer account, PMS row, and featured partner entry).
 *
 * What this script adds:
 *   1. Provisions the 6-agent hospitality swarm via runAgentSwarmProvisionOrchestrated
 *   2. Seeds Boardwalk-specific knowledge artifacts into knowledge_artifacts table:
 *      - Property overview (name, address, room types, rates, features)
 *      - Booking & reservation guide (how to quote, when to hand off to bookingUrl)
 *      - Cloudbeds integration notes (what tools are available, OTP gate, voice flag)
 *
 * Prerequisites:
 *   npm run setup:boardwalk   ← run this first (creates site + PMS row)
 *
 * Usage:
 *   doppler run -- npx tsx scripts/provision-boardwalk-agents.ts
 *   doppler run -- npx tsx scripts/provision-boardwalk-agents.ts --dry-run
 *
 * Idempotent: re-running checks for existing agents and artifacts before inserting.
 *
 * Related:
 *   registry-yaml/cloudbeds-tool-registry.yaml — tool contract
 *   .cursor/skills/cloudbeds-hospitality/SKILL.md — skill definition
 *   docs-governance/canonical/HOSPITALITY_SWARM_RUNBOOK.md — full runbook
 */

import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../server/db.js";
import { agents, siteConfigs, knowledgeArtifacts } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { runAgentSwarmProvisionOrchestrated } from "../server/services/agentOrchestration.js";

// Inline constants (avoid importing setup-boardwalk-suites.ts which has a
// pre-existing broken featuredPartners import in shared/schema)
const BOARDWALK_SUITES = {
  placeId: "ChIJB4qU6oXvJIgR_2p602OaK_U",
  businessName: "Boardwalk Suites Lafayette",
  address: "1605 N University Ave, Lafayette, LA 70506",
  cloudbedsPropertyId: "315701",
  owner: {
    email: "lafayette@boardwalksuites.com",
  },
};

const isDryRun = process.argv.includes("--dry-run");

const isMainModule =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// ── Knowledge artifact templates ──────────────────────────────────────────────

const BOARDWALK_PROPERTY_OVERVIEW = `# Boardwalk Suites Lafayette — Property Overview

## Property Details
- **Name:** Boardwalk Suites Lafayette
- **Address:** 1605 N University Ave, Lafayette, LA 70506
- **Type:** Extended-Stay Hotel (suites with full kitchens)
- **Location:** Oil Center district, near University of Louisiana, medical corridor
- **Front Desk:** 24/7
- **Booking Engine:** https://hotels.cloudbeds.com/reservation/YCNwpF
- **Cloudbeds Property ID:** 315701

## Room Types (Live Rates via Cloudbeds API)

| Room | Short | Base Rate | Max Guests | Key Features |
|------|-------|-----------|-----------|--------------|
| King Suite Level 1 | SK1 | $69/night | 2 | King bed, sofa sleeper, 58in Smart TV, microwave, fridge, bathtub |
| King Suite Level 2 | SK2 | $69/night | 2 | King bed, 50in Smart TV, microwave, fridge, WiFi |
| King Suite Interior | SKI | $89/night | 2 | 50in Smart TV, bathtub, workspace, microwave, fridge |
| VIP King Suite | SKV | $89/night | 2 | Fully renovated, shared kitchen & laundry access; can join as 3BR family suite |
| Double Suite Exterior | DSE | $79/night | 4 | Two beds, microwave, WiFi, AC |
| Double Suite Interior | DSI | $99/night | 4 | 50in Smart TV, microwave, fridge, workspace, bathtub, 320 sqft |

## Extended Stay Positioning
- Weekly and monthly rates available (ask front desk)
- Full kitchens in select suites — true home-away-from-home
- Ideal for: medical professionals, travel nurses, business travelers, families relocating
- Medical district proximity: Our Lady of Lakeview, Lafayette General nearby
- University proximity: University of Louisiana at Lafayette 0.5mi

## Booking Context
Always provide the live rate from the Cloudbeds availability tool.
Direct booking: https://hotels.cloudbeds.com/reservation/YCNwpF
For phone bookings, quote the rate, describe the room, then offer to text the booking link.

## Owner Contact
- Jason Trindade — lafayette@boardwalksuites.com
- Property phone: (337) area code (confirm with Jason)
`;

const BOARDWALK_BOOKING_GUIDE = `# Boardwalk Suites Lafayette — Booking & Reservation Guide

## How to Handle a Booking Request (Chat + Voice)

### Step 1: Capture dates and party size
- Check-in date (YYYY-MM-DD)
- Check-out date (YYYY-MM-DD)
- Number of adults and children

### Step 2: Call get_hotel_inventory
Use the tool to pull live rates and availability for the requested dates.
Never quote a rate from memory — always use the live tool result.

### Step 3: Present options using the Sovereign UI canvas
The get_hotel_inventory tool returns uiComponent: "HOTEL_INVENTORY_GRID".
This triggers a canvas display of room cards with photos, rates, and features.
Speak the top recommendation; the canvas shows the full list.

### Step 4: Handle the booking
Until post_reservation is wired as a Gemini tool:
- Quote the confirmed rate and room name
- Say: "You can complete your reservation at our booking link — shall I send it to you?"
- If guest has verified phone: send booking link via SMS (POST /api/share/send-payment-link)
- If chat-only: display booking link as a canvas card action button

Booking engine URL: https://hotels.cloudbeds.com/reservation/YCNwpF

## Returning Guest Lookups (pms_lookup_guest_journey)

When a guest calls/chats and mentions a previous stay or upcoming reservation:
1. Ask for their phone number (the one on file at check-in)
2. If verification_guest_phone skill is active: send OTP first, verify, then look up
3. Call pms_lookup_guest_journey — classify: in_house, upcoming_stay, recent_checkout, past_guest
4. Personalize response to journey stage:
   - in_house: "I can see you're currently checked in — how can I help?"
   - upcoming_stay: "Your reservation starts on [date]. Ready to help with anything before arrival."
   - recent_checkout: "Thank you for your recent stay! Is there anything I can help with?"
   - past_guest: "Welcome back to Boardwalk Suites."

## Rates Language (Anti-Platform Doctrine)
We OWN our booking relationship. Guests book DIRECTLY with us at our booking engine.
Never suggest OTA platforms (Expedia, Booking.com). Our direct rate is the rate.

## Extended Stay Qualification
If a guest asks about weekly/monthly rates:
- Acknowledge the need for extended accommodation
- Explain our suite kitchen amenities (makes extended stay cost-effective)
- Offer to connect with front desk for extended stay pricing (not in the API)
`;

const BOARDWALK_INTEGRATION_NOTES = `# Boardwalk Suites Lafayette — Cloudbeds Integration Notes

## Skill: cloudbeds_hospitality
Skill registry: registry-yaml/cloudbeds-tool-registry.yaml

## Available Tools (Voice + Chat)
- get_hotel_inventory — live rates, availability, room photos
- pms_lookup_guest_journey — guest history by phone (OTP gate when skill active)
- pms_get_housekeeping_status — room clean/dirty status (MANAGER mode only)
- pms_get_hotel_dashboard — occupancy dashboard (MANAGER mode only)

## Auth
Credentials stored in site_pms_integrations for this siteConfigId:
- pms_type: "cloudbeds"
- property_id: "315701"
- api_key: cbat_... (x-api-key header)
- OAuth fields: access_token, refresh_token, token_expires_at (when OAuth is active)

## Voice Governance Flag
Do NOT modify geminiVoice.ts as a side effect of this integration.
The voice runtime injects PRICING_RULE copy that may contradict live rates.
Reference: docs-governance/archive/VOICE_BOARDWALK_DEMO_NOTE.md
For live voice demos: open a separate voice governance task first.

## Booking Fallback
post_reservation is not yet wired as a Gemini swarm tool.
Agents MUST use the booking_engine_url for all actual reservations:
https://hotels.cloudbeds.com/reservation/YCNwpF

## OTP Integration
Guest phone verification before pms_lookup_guest_journey:
- Skill: verification_guest_phone must be active on site config
- Requires Twilio Verify (TWILIO_VERIFY_SERVICE_URL_SID in Doppler)
- Flow: send_otp → guest enters code → verify_otp → pms_lookup_guest_journey

## Payment Link Delivery
Use POST /api/share/send-payment-link with CUSTOMER_CARE pipe for SMS.
Never use marketing A2P pipe for payment/booking links.
`;

// ── Knowledge artifact seeder ─────────────────────────────────────────────────

interface ArtifactSpec {
  agentAccessKey: string;
  title: string;
  content: string;
  scope: "business";
  visibility: "private";
  groupLevel: string;
}

const BOARDWALK_ARTIFACTS: ArtifactSpec[] = [
  {
    agentAccessKey: "boardwalk-property-overview-v1",
    title: "Boardwalk Suites Lafayette — Property Overview",
    content: BOARDWALK_PROPERTY_OVERVIEW,
    scope: "business",
    visibility: "private",
    groupLevel: "property_overview",
  },
  {
    agentAccessKey: "boardwalk-booking-guide-v1",
    title: "Boardwalk Suites Lafayette — Booking & Reservation Guide",
    content: BOARDWALK_BOOKING_GUIDE,
    scope: "business",
    visibility: "private",
    groupLevel: "booking_guide",
  },
  {
    agentAccessKey: "boardwalk-integration-notes-v1",
    title: "Boardwalk Suites Lafayette — Cloudbeds Integration Notes",
    content: BOARDWALK_INTEGRATION_NOTES,
    scope: "business",
    visibility: "private",
    groupLevel: "integration_notes",
  },
];

async function seedBoardwalkArtifacts(siteConfigId: string): Promise<void> {
  console.log("\n📚 Seeding Boardwalk knowledge artifacts...");

  for (const spec of BOARDWALK_ARTIFACTS) {
    // Deduplicate by agent_access_key (unique constraint)
    const existing = await db
      .select({ id: knowledgeArtifacts.id })
      .from(knowledgeArtifacts)
      .where(eq(knowledgeArtifacts.agentAccessKey, spec.agentAccessKey))
      .limit(1);

    if (existing.length > 0) {
      if (!isDryRun) {
        await db
          .update(knowledgeArtifacts)
          .set({
            title: spec.title,
            content: spec.content,
            updatedAt: new Date(),
          })
          .where(eq(knowledgeArtifacts.id, existing[0].id));
      }
      console.log(`  ♻️  Updated: ${spec.title}`);
    } else {
      if (!isDryRun) {
        await db.insert(knowledgeArtifacts).values({
          siteConfigId,
          agentAccessKey: spec.agentAccessKey,
          title: spec.title,
          content: spec.content,
          scope: spec.scope,
          visibility: spec.visibility,
          groupLevel: spec.groupLevel,
        });
      }
      console.log(`  ✅  Created: ${spec.title}`);
    }
  }
}

// ── Agent swarm provisioner ───────────────────────────────────────────────────

async function provisionHospitalitySwarm(siteConfigId: string): Promise<void> {
  console.log("\n🤖 Checking agent swarm...");

  // Check if agents already exist for this site
  const existingAgents = await db
    .select({ id: agents.id, roleType: agents.roleType, name: agents.name })
    .from(agents)
    .where(eq(agents.siteConfigId, siteConfigId));

  if (existingAgents.length >= 6) {
    console.log(
      `  ✅  Swarm already provisioned (${existingAgents.length} agents): ${existingAgents.map((a) => a.roleType).join(", ")}`,
    );
    return;
  }

  if (isDryRun) {
    console.log(`  [DRY] Would provision hospitality swarm for siteConfigId=${siteConfigId}`);
    return;
  }

  console.log(`  Provisioning 6-agent hospitality swarm for siteConfigId=${siteConfigId}...`);

  const { provisionResult, runId, finalStatus } = await runAgentSwarmProvisionOrchestrated({
    siteConfigId,
    placeTypes: ["lodging", "hotel"],
    businessName: BOARDWALK_SUITES.businessName,
    source: "boardwalk_provision",
  });

  console.log(`  ✅  Swarm provisioned:`);
  console.log(`       - Orchestration run: ${runId} (${finalStatus})`);
  console.log(`       - Industry group: ${provisionResult.industryGroup}`);
  console.log(`       - Agents created: ${provisionResult.agentsCreated}`);
  console.log(`       - Archetypes: ${provisionResult.archetypesProvisioned.join(", ")}`);
  console.log(`       - Agent IDs: ${provisionResult.agentIds.join(", ")}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function provisionBoardwalkDemo(): Promise<void> {
  // Load site config by place ID
  const site = await db
    .select({ id: siteConfigs.id, name: siteConfigs.name })
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, BOARDWALK_SUITES.placeId))
    .limit(1);

  if (site.length === 0) {
    console.error(
      "❌ Boardwalk Suites site config not found. Run `npm run setup:boardwalk` first.",
    );
    process.exit(1);
  }

  const siteConfigId = site[0].id;
  console.log(`✅ Found site config: ${siteConfigId} (${site[0].name})`);

  await provisionHospitalitySwarm(siteConfigId);
  await seedBoardwalkArtifacts(siteConfigId);

  console.log("\n─────────────────────────────────────────────────────");
  console.log("  Boardwalk Suites Lafayette — Provisioning Complete");
  console.log("─────────────────────────────────────────────────────");
  console.log(`  Site Config ID : ${siteConfigId}`);
  console.log(`  Property ID    : ${BOARDWALK_SUITES.cloudbedsPropertyId}`);
  console.log(`  Booking Engine : https://hotels.cloudbeds.com/reservation/YCNwpF`);
  console.log(`  Skill          : cloudbeds_hospitality (registry-yaml/cloudbeds-tool-registry.yaml)`);
  console.log("\n  Next steps:");
  console.log("    1. Set CLOUDBEDS_API_KEY in Doppler dev config (cbat_... token)");
  console.log("       doppler secrets set CLOUDBEDS_API_KEY=cbat_...");
  console.log("    2. Verify: GET /api/cloudbeds/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD");
  console.log("    3. Add Gmail OAuth credentials to workspace_configurations for this site");
  console.log("       (Phase 5 workspace agent provisioning)");
  console.log(`    4. Run the lifecycle test:`);
  console.log(`       SITE_ID=${siteConfigId} doppler run -- npx tsx tests/e2e-lifecycle-telemetry.ts`);
  if (isDryRun) {
    console.log("\n  [DRY RUN — no writes performed]");
  }
}

if (isMainModule) {
  if (isDryRun) console.log("🔍 DRY RUN mode — no database writes\n");

  provisionBoardwalkDemo()
    .then(() => {
      console.log("\n🎉 Done!\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n💥 Provisioning failed:", err);
      process.exit(1);
    });
}
