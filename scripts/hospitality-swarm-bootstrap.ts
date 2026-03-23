#!/usr/bin/env tsx
/**
 * Hospitality swarm — set operational modes for the six DB agents on a site.
 * Run after provisionAgentsForBusiness or when cloning a hotel demo.
 *
 * Usage: doppler run -- npx tsx scripts/hospitality-swarm-bootstrap.ts <siteConfigId>
 *
 * Maps archetypes → modes (Cloudbeds tools are gated by operationalModes + voice allowlist):
 *   concierge            → RECEPTIONIST     (in-house guest experience)
 *   booking_coordinator  → SALES            (reservations)
 *   lead_qualifier       → MANAGER          (hotel manager / ops dashboard)
 *   retention_empath     → CUSTOMER_SERVICE (post-stay; no-drift locked posture)
 *   billing_analyst      → MANAGER          (housekeeping manager — HK + dashboard tools)
 *   gatekeeper           → RECEPTIONIST     (front desk / check-in)
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { agents } from "../shared/schema.js";
import { db } from "../server/db.js";

const MODE_BY_ARCH: Record<string, { operationalMode: string }> = {
  concierge: { operationalMode: "RECEPTIONIST" },
  booking_coordinator: { operationalMode: "SALES" },
  lead_qualifier: { operationalMode: "MANAGER" },
  retention_empath: { operationalMode: "CUSTOMER_SERVICE" },
  billing_analyst: { operationalMode: "MANAGER" },
  gatekeeper: { operationalMode: "RECEPTIONIST" },
};

async function main() {
  const siteConfigId = process.argv[2];
  if (!siteConfigId) {
    console.error("Usage: doppler run -- npx tsx scripts/hospitality-swarm-bootstrap.ts <siteConfigId>");
    process.exit(1);
  }

  const rows = await db.select().from(agents).where(eq(agents.siteConfigId, siteConfigId));

  if (rows.length === 0) {
    console.warn(`No agents for siteConfigId=${siteConfigId}. Run POST /api/intelligence/provision first.`);
    process.exit(2);
  }

  for (const agent of rows) {
    const rt = agent.roleType || "";
    const cfg = MODE_BY_ARCH[rt];
    if (!cfg) {
      console.log(`Skip unknown roleType=${rt} id=${agent.id}`);
      continue;
    }
    await db
      .update(agents)
      .set({
        operationalMode: cfg.operationalMode,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));

    console.log(`Updated ${agent.name} (${rt}) → ${cfg.operationalMode}`);
  }

  console.log(`\nDone. Re-seed templates if needed: doppler run -- npx tsx scripts/seed-industry-templates.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
