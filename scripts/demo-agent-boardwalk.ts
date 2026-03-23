/**
 * Boardwalk Suites Lafayette — single multitasking demo agent.
 *
 * - Ensures partner site + Cloudbeds PMS (ensureBoardwalkPartnerSetup)
 * - Upserts one primary agent (DISC/ARCH/SALES mode, inventory-capable tools)
 * - Merges knowledge: SerpAPI digest, Places facts, clean-room extraction summary
 *
 * Run: npm run demo:boardwalk-agent
 * Requires: doppler run (DATABASE_URL, GEMINI_API_KEY, SERPAPI_API_KEY for ingest; Maps key for Places)
 */

import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { ensureBoardwalkPartnerSetup, BOARDWALK_SUITES } from "./setup-boardwalk-suites.js";
import { storage } from "../server/storage.js";
import { buildBehavioralPrompt, type BusinessContext } from "../server/services/promptCompiler.js";
import { runSageIngest } from "../server/services/sageIngestService.js";
import { getPlaceDetails } from "../server/tools/placesHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INTRODUCTION_PROTOCOL = `

### INTRODUCTION PROTOCOL
In your very first response to any guest:
1. Greet them warmly and introduce yourself by name and role
2. Say you represent ${BOARDWALK_SUITES.businessName}
3. Briefly state what you can help with (availability, extended-stay questions, local area)
4. Ask how you can help`;

const DEMO_AGENT = {
  name: "Harbor",
  voiceRole: "Voice Concierge",
  voiceCompanyName: BOARDWALK_SUITES.businessName,
  voiceId: "Aoede",
  voiceName: "Aoede - Warm & Conversational",
  roleType: "concierge",
  dominance: 40,
  influence: 85,
  steadiness: 80,
  conscientiousness: 58,
  archProfile: { acknowledge: 88, reflect: 72, context: 70, handoff: 78 },
  shortTermMemory: {
    specialty: "extended-stay hospitality and reservations",
    focus: "suites, rates, availability, Lafayette area",
    differentiator: "full kitchens and spacious suites near University and medical district",
  },
  longTermMemory: {
    dominantTrait: "steady, warm guest care",
    primaryIntent:
      "Help every guest get accurate availability and feel confident choosing Boardwalk Suites",
    unbreakableRule: "invent room rates or availability without using tools or the knowledge base",
    ruleReason: "Accuracy builds trust and protects revenue",
  },
  defaultEmotion: "engaged" as const,
  operationalMode: "SALES",
  noDriftMode: false,
};

type KlDoc = { id?: string; title?: string; content?: string; addedAt?: string };

function stripAutomatedDemoDocs(existing: unknown): KlDoc[] {
  const arr = Array.isArray(existing) ? (existing as KlDoc[]) : [];
  return arr.filter((d) => {
    const t = d.title ?? "";
    if (/^Business Knowledge: Boardwalk Suites Lafayette/.test(t)) return false;
    if (/^Demo Boardwalk —/.test(t)) return false;
    return true;
  });
}

async function buildPlacesKbDoc(): Promise<{ title: string; content: string } | null> {
  try {
    const p = await getPlaceDetails(BOARDWALK_SUITES.placeId);
    const lines = [
      `# Demo Boardwalk — Places facts`,
      "",
      `**Name:** ${p.name}`,
      `**Address:** ${p.formattedAddress}`,
      `**Rating:** ${p.rating ?? "n/a"} (${p.userRatingCount ?? 0} Google reviews)`,
      `**Phone:** ${p.internationalPhoneNumber ?? "n/a"}`,
      `**Website:** ${p.websiteUri ?? "n/a"}`,
    ];
    if (p.regularOpeningHours?.weekdayDescriptions?.length) {
      lines.push(`**Hours:** ${p.regularOpeningHours.weekdayDescriptions.join("; ")}`);
    }
    return {
      title: "Demo Boardwalk — Places facts",
      content: lines.join("\n"),
    };
  } catch (e) {
    console.warn("[demo-agent-boardwalk] Places facts skipped:", (e as Error).message);
    return null;
  }
}

function buildExtractionKbDoc(): { title: string; content: string } {
  const extractionPath = path.join(__dirname, "..", ".system_design", "extractions", "extraction_2026-03-22.md");
  let text: string;
  try {
    text = readFileSync(extractionPath, "utf8");
  } catch {
    text =
      "See `docs/knowledge-base/boardwalk-rewards-extract/ANALYSIS.md` — clean-room extraction report path missing.";
  }
  const cap = 14000;
  const body = text.length > cap ? `${text.slice(0, cap)}\n\n[truncated]` : text;
  return {
    title: "Demo Boardwalk — Brand reference (clean room)",
    content: `# Boardwalk reference (governed extract)\n\n${body}`,
  };
}

async function main() {
  console.log("=== Boardwalk multitask demo agent ===\n");

  const { siteConfigId } = await ensureBoardwalkPartnerSetup();

  let site = await storage.getSiteConfigById(siteConfigId);
  if (!site) throw new Error("Site not found after ensureBoardwalkPartnerSetup");

  const cleaned = stripAutomatedDemoDocs((site as { knowledgeLibrary?: unknown }).knowledgeLibrary);
  await storage.updateSiteConfig(siteConfigId, { knowledgeLibrary: cleaned as unknown[] } as Record<string, unknown>);

  const sage = await runSageIngest(siteConfigId, BOARDWALK_SUITES.placeId, BOARDWALK_SUITES.businessName);
  console.log("[demo-agent-boardwalk] SerpAPI ingest:", sage);

  site = await storage.getSiteConfigById(siteConfigId);
  if (!site) throw new Error("Site missing after ingest");

  let assignedId = (site as { assignedAgentId?: string | null }).assignedAgentId;
  let agent = assignedId ? await storage.getAgent(assignedId) : undefined;

  if (!agent) {
    agent = await storage.createAgent({
      siteConfigId,
      roleType: DEMO_AGENT.roleType,
      name: DEMO_AGENT.name,
      voiceId: DEMO_AGENT.voiceId,
      voiceName: DEMO_AGENT.voiceName,
      status: "active",
      dominance: DEMO_AGENT.dominance,
      influence: DEMO_AGENT.influence,
      steadiness: DEMO_AGENT.steadiness,
      conscientiousness: DEMO_AGENT.conscientiousness,
      voiceRole: DEMO_AGENT.voiceRole,
      voiceCompanyName: DEMO_AGENT.voiceCompanyName,
      defaultEmotion: DEMO_AGENT.defaultEmotion,
      shortTermMemory: DEMO_AGENT.shortTermMemory as unknown as Record<string, unknown>,
      longTermMemory: DEMO_AGENT.longTermMemory as unknown as Record<string, unknown>,
      archProfile: DEMO_AGENT.archProfile as unknown as Record<string, unknown>,
      operationalMode: DEMO_AGENT.operationalMode,
      noDriftMode: DEMO_AGENT.noDriftMode,
      aiModelProvider: "gemini",
      aiTemperature: 65,
      aiMaxTokens: 4096,
    });
    console.log(`✅ Created agent ${agent.id}`);
  } else {
    await storage.updateAgent(agent.id, {
      roleType: DEMO_AGENT.roleType,
      name: DEMO_AGENT.name,
      voiceId: DEMO_AGENT.voiceId,
      voiceName: DEMO_AGENT.voiceName,
      dominance: DEMO_AGENT.dominance,
      influence: DEMO_AGENT.influence,
      steadiness: DEMO_AGENT.steadiness,
      conscientiousness: DEMO_AGENT.conscientiousness,
      voiceRole: DEMO_AGENT.voiceRole,
      voiceCompanyName: DEMO_AGENT.voiceCompanyName,
      defaultEmotion: DEMO_AGENT.defaultEmotion,
      shortTermMemory: DEMO_AGENT.shortTermMemory as unknown as Record<string, unknown>,
      longTermMemory: DEMO_AGENT.longTermMemory as unknown as Record<string, unknown>,
      archProfile: DEMO_AGENT.archProfile as unknown as Record<string, unknown>,
      operationalMode: DEMO_AGENT.operationalMode,
      noDriftMode: DEMO_AGENT.noDriftMode,
    });
    agent = (await storage.getAgent(agent.id))!;
    console.log(`✅ Updated agent ${agent.id}`);
  }

  const pd = (site as { placeData?: Record<string, unknown> | null }).placeData ?? {};
  const businessContext: BusinessContext = {
    name: BOARDWALK_SUITES.businessName,
    address:
      (typeof pd.formattedAddress === "string" && pd.formattedAddress) ||
      (typeof pd.formatted_address === "string" && pd.formatted_address) ||
      BOARDWALK_SUITES.address,
    phone:
      (typeof pd.formatted_phone_number === "string" && pd.formatted_phone_number) ||
      (typeof pd.international_phone_number === "string" && pd.international_phone_number) ||
      undefined,
    hours: undefined,
    services: Array.isArray((pd as { types?: string[] }).types) ? (pd as { types: string[] }).types : undefined,
  };

  const compiledPrompt = buildBehavioralPrompt(agent, businessContext);
  const systemPromptOverride = `${compiledPrompt}${INTRODUCTION_PROTOCOL}`;
  const discProfileStr = `D:${DEMO_AGENT.dominance} I:${DEMO_AGENT.influence} S:${DEMO_AGENT.steadiness} C:${DEMO_AGENT.conscientiousness}`;
  const agentConfig = {
    name: DEMO_AGENT.name,
    role: DEMO_AGENT.voiceRole,
    discProfile: discProfileStr,
    basePrompt: DEMO_AGENT.longTermMemory.primaryIntent,
    demoProfile: "boardwalk_multitask_v1",
  };

  const rawLib = (site as { knowledgeLibrary?: unknown }).knowledgeLibrary;
  const baseLib: KlDoc[] = Array.isArray(rawLib) ? [...(rawLib as KlDoc[])] : [];
  const mergedDocs: KlDoc[] = baseLib.filter((d) => {
    const t = d.title ?? "";
    return !/^Demo Boardwalk — (Places facts|Brand reference)/.test(t);
  });

  const placesDoc = await buildPlacesKbDoc();
  if (placesDoc) {
    mergedDocs.push({
      id: randomUUID(),
      title: placesDoc.title,
      content: placesDoc.content,
      addedAt: new Date().toISOString(),
    });
  }
  const extDoc = buildExtractionKbDoc();
  mergedDocs.push({
    id: randomUUID(),
    title: extDoc.title,
    content: extDoc.content,
    addedAt: new Date().toISOString(),
  });

  await storage.updateSiteConfig(siteConfigId, {
    systemPromptOverride,
    agentConfig: agentConfig as unknown as Record<string, unknown>,
    assignedAgentId: agent.id,
    knowledgeLibrary: mergedDocs as unknown[],
  } as Record<string, unknown>);

  const slug = (site as { slug?: string | null }).slug;
  const baseHint = process.env.PUBLIC_BASE_URL || "https://aibizbot-dev.gatewayglobal.ai";

  console.log("\n--- Summary ---");
  console.log(`siteConfigId:     ${siteConfigId}`);
  console.log(`assignedAgentId: ${agent.id}`);
  console.log(`operationalMode: ${DEMO_AGENT.operationalMode}`);
  console.log(`SerpAPI ingest:  ${sage.success ? `ok (${sage.reviewsHarvested} reviews)` : sage.error ?? "failed"}`);
  console.log(`Cloudbeds:       ${process.env.CLOUDBEDS_API_KEY ? "CLOUDBEDS_API_KEY set" : "missing — add for live inventory"}`);
  console.log(`Preview:         ${slug ? `${baseHint}/biz/${slug}` : "(set site slug for /biz link)"}`);
  console.log(`Governance:      docs-governance/AGENT_POLICY_REGISTRY.md (Demo — Boardwalk Suites)`);
  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
