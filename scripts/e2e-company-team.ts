#!/usr/bin/env npx tsx
/**
 * E2E: Create company (site) + team of voice agents via API.
 * Run with app already running (e.g. npm run dev). Optionally: BASE_URL=http://localhost:5000 npx tsx scripts/e2e-company-team.ts
 * Prints siteConfigId and agent IDs, then instructions for connecting a Twilio number.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const BUSINESS_NAME = process.env.E2E_BUSINESS_NAME || "E2E Test Business";
const PLACE_ID = process.env.E2E_PLACE_ID || undefined;

async function main() {
  console.log("E2E: Create company + team of voice agents\n");
  console.log("Base URL:", BASE_URL);
  console.log("Business name:", BUSINESS_NAME);
  console.log("Place ID:", PLACE_ID ?? "(none – new site every time)\n");

  // 1. Create or return site
  const sitePayload: Record<string, unknown> = { name: BUSINESS_NAME };
  if (PLACE_ID) {
    sitePayload.placeId = PLACE_ID;
  }
  const createRes = await fetch(`${BASE_URL}/api/site-configs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sitePayload),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Create site failed (${createRes.status}): ${err}`);
  }
  const siteConfig = (await createRes.json()) as { id: string; name?: string };
  const siteConfigId = siteConfig.id;
  console.log("1. Site created or returned:", siteConfigId, createRes.status === 200 ? "(existing)" : "(new)");

  // 2. Provision agents
  const provisionRes = await fetch(`${BASE_URL}/api/intelligence/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siteConfigId,
      placeTypes: ["establishment"],
      businessName: BUSINESS_NAME,
    }),
  });
  if (!provisionRes.ok) {
    const err = await provisionRes.text();
    throw new Error(`Provision agents failed (${provisionRes.status}): ${err}`);
  }
  const provision = (await provisionRes.json()) as {
    success?: boolean;
    agentsCreated?: number;
    agentIds?: string[];
    industryGroup?: string;
  };
  console.log("2. Agents provisioned:", provision.agentsCreated ?? 0, "created");
  if (provision.agentIds?.length) {
    console.log("   Agent IDs:", provision.agentIds.slice(0, 3).join(", "), provision.agentIds.length > 3 ? `... +${provision.agentIds.length - 3} more` : "");
  }

  // 3. Next steps
  console.log("\n--- Next: Connect Twilio number ---\n");
  console.log("Site config ID:", siteConfigId);
  console.log("");
  console.log("Option A – Per-agent (Developer UI):");
  console.log("  1. Open your app → Developer / Agents.");
  console.log("  2. Pick an agent (e.g. Concierge if assigned).");
  console.log("  3. Open Agent Telephony → search by area code → provision number.");
  console.log("  4. Agent is updated with phoneNumber + phoneSid automatically.");
  console.log("");
  console.log("Option B – API:");
  console.log("  1. Search: GET " + BASE_URL + "/api/telephony/numbers/search?areaCode=702");
  console.log("  2. Provision: POST " + BASE_URL + "/api/telephony/numbers/provision");
  console.log("     body: { \"phoneNumber\": \"+1...\" }");
  console.log("  3. Link to agent: PATCH " + BASE_URL + "/api/agents/AGENT_ID");
  console.log("     body: { \"phoneNumber\": \"+1...\", \"phoneSid\": \"PN...\" }");
  console.log("");
  console.log("Then: call the number to test voice; send SMS to test messaging.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
