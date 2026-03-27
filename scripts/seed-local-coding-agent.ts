/**
 * Seed the Governed Local Agent Plane coding agents into the database.
 *
 * Creates two agents tied to a siteConfigId:
 *   1. coding_agent  — full server/client access, voice runtime forbidden
 *   2. ui_agent      — client UI tree access only, server forbidden
 *
 * Every insert is wrapped in an orchestration run so the control plane has
 * a full audit trail from day one.
 *
 * Usage:
 *   doppler run -- npx tsx scripts/seed-local-coding-agent.ts <siteConfigId>
 *
 * Or set LOCAL_LLM_CODING_AGENT_SITE_CONFIG_ID in Doppler and run without args:
 *   doppler run -- npx tsx scripts/seed-local-coding-agent.ts
 */

import "dotenv/config";
import { db } from "../server/db.js";
import { agents } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import {
  createSingleAgentOrchestrationRun,
  completeSingleAgentCreateRun,
} from "../server/services/agentOrchestration.js";

const LOCAL_PROVIDER = "local";

interface AgentSeedSpec {
  roleType: string;
  name: string;
  operationalMode: string;
  systemPrompt: string;
  structuredControls: {
    localAgentPlane: {
      allowed_domains: string[];
      forbidden_domains: string[];
      prompt_patterns_forbidden?: string[];
      governanceOverride: boolean;
    };
  };
}

const CODING_AGENT: AgentSeedSpec = {
  roleType: "coding_agent",
  name: "Sovereign Coder",
  operationalMode: "CODING",
  systemPrompt: `You are a governed coding agent on the Gateway Global AI OS Sovereign V1 local_agent_plane.
SENTINEL DIRECTIVE applies. You operate inside domain jurisdiction boundaries only.
Every response MUST be valid JSON: { files_touched, assumptions, blockers, result }.
Never touch voice runtime files. Never generate code that bypasses the orchestration pipeline.`,
  structuredControls: {
    localAgentPlane: {
      allowed_domains: [
        "server/routes/**",
        "server/services/**",
        "shared/**",
        "migrations/**",
        "scripts/**",
        "client/src/**",
      ],
      forbidden_domains: [
        "server/geminiVoice.ts",
        "server/voiceStream.ts",
        "server/voiceGemini.ts",
        "server/voiceSession.ts",
        "server/audioCodec.ts",
        "server/config/geminiLiveProtocol.ts",
        "client/src/services/voice/**",
        "client/public/clear-voice-processor.js",
      ],
      governanceOverride: false,
    },
  },
};

const UI_AGENT: AgentSeedSpec = {
  roleType: "ui_agent",
  name: "Sovereign UI Builder",
  operationalMode: "UI_BUILDER",
  systemPrompt: `You are a governed UI Builder agent on the Gateway Global AI OS Sovereign V1 local_agent_plane.

SENTINEL DIRECTIVE applies. You operate inside UI domain jurisdiction only.

## Design Studio 8-Phase Pipeline
You are phase-6 aware. Phases: intake → plan → theme → data_input → data_output → components → test_save → agent_layer.
In the components phase (phase 6), follow these rules without exception:
- SHADCN IS DISCOVERY-ONLY: Never import { ... } from "@/components/ui/..." or any raw shadcn path in product code.
  Shadcn components are discovery_only until reviewed and promoted into the Gateway SDK manifest and wrapped in @/ui-core.
- ONLY import UI primitives from "@/ui-core" (e.g. SovereignButton, SovereignCard, SovereignInput).
  Never import "@mui/material" directly in feature pages, admin screens, or domain components.
- NEVER use inline styles: style={{ ... }} is forbidden. Use Tailwind utility classes and tokens only.
- NEVER use raw hex colors. Only use approved token bundles: light-apple, dark-apple, crystal-glass.
- NEVER touch domain visualizations (Gemini visualizer, DISC sliders, ARCH sliders) — those are locked surfaces.
- NEVER perform a full migration of legacy Tailwind screens. Scope changes to new surfaces only.
- Framer Motion is required for all interactive card components.

## Token Discipline
- Shell zones: bg-[#0f172a] (SHELL.bg from brand.ts)
- Canvas zones: bg-white (CANVAS.bg from brand.ts)
- Brand accent: BRAND.green (#008a3e), never purple as primary.
- Border radius: rounded-sui (24px) for all primary containers.

## Output Contract
Every response MUST be valid JSON:
{ "files_touched": [], "assumptions": [], "blockers": [], "result": "" }

Never generate code for: server/**, migrations/**, shared/schema.ts, or any voice runtime file.`,
  structuredControls: {
    localAgentPlane: {
      allowed_domains: [
        "client/src/ui-core/**",
        "client/src/pages/**",
        "client/src/components/**",
        "client/src/config/**",
        "client/src/hooks/**",
        "client/src/lib/**",
      ],
      forbidden_domains: [
        "server/**",
        "migrations/**",
        "shared/schema.ts",
        "client/src/services/voice/**",
        "client/public/clear-voice-processor.js",
      ],
      prompt_patterns_forbidden: [
        "style={{",
        "@mui/material",
      ],
      governanceOverride: false,
    },
  },
};

async function seedLocalAgent(
  siteConfigId: string,
  spec: AgentSeedSpec,
): Promise<{ agentId: string; runId: string; action: "created" | "updated" }> {
  const localModel = process.env.LOCAL_LLM_MODEL ?? "qwen2.5-coder:7b";

  // Check for existing agent with this roleType for the same site
  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(
      and(
        eq(agents.siteConfigId, siteConfigId),
        eq(agents.roleType as any, spec.roleType),
      ),
    )
    .limit(1);

  const { runId } = await createSingleAgentOrchestrationRun({ siteConfigId });

  if (existing?.id) {
    // Upsert — update in place so we don't accumulate duplicates
    await db
      .update(agents)
      .set({
        name: spec.name,
        aiModelProvider: LOCAL_PROVIDER,
        aiModelId: localModel,
        operationalMode: spec.operationalMode,
        systemPrompt: spec.systemPrompt,
        structuredControls: spec.structuredControls,
        status: "active",
      })
      .where(eq(agents.id, existing.id));

    await completeSingleAgentCreateRun({ runId, agentId: existing.id });
    return { agentId: existing.id, runId, action: "updated" };
  }

  const [inserted] = await db
    .insert(agents)
    .values({
      siteConfigId,
      roleType: spec.roleType,
      name: spec.name,
      voiceId: "none",
      voiceName: "none",
      status: "active",
      visibility: "private",
      aiModelProvider: LOCAL_PROVIDER,
      aiModelId: localModel,
      operationalMode: spec.operationalMode,
      noDriftMode: true,
      systemPrompt: spec.systemPrompt,
      structuredControls: spec.structuredControls,
    })
    .returning({ id: agents.id });

  if (!inserted?.id) throw new Error(`Failed to insert ${spec.roleType}`);

  await completeSingleAgentCreateRun({ runId, agentId: inserted.id });

  return { agentId: inserted.id, runId, action: "created" };
}

const WORKSPACE_AGENT: AgentSeedSpec = {
  roleType: "workspace_provisioning_agent",
  name: "Workspace Provisioning Agent",
  operationalMode: "WORKSPACE_PROVISIONER",
  systemPrompt: `You are a governed Workspace Provisioning Agent on the Gateway Global AI OS Sovereign V1 local_agent_plane.

SENTINEL DIRECTIVE applies. Your ONLY job is to plan and emit an ordered list of Google Workspace tool calls for a specific provisioning goal.

## Identity and Jurisdiction
- You are a provisioning worker. You do NOT interact with customers.
- You do NOT modify voice runtime, client UI, schema, or migration files.
- You operate exclusively within the workspace provisioning domain.
- You NEVER emit tool calls that are not in the approved registry below.

## Approved Tool Registry
You may ONLY emit tool names from this exact list:

  calendar.verify      — Verify Calendar access (no params required)
  calendar.createEvent — Create a calendar event (required: summary, startTime, endTime)
  drive.createFolder   — Create a Drive folder (required: name; optional: parentId)
  drive.createSheet    — Create a Google Sheet (required: title, headers[])
  tasks.createTask     — Create a task (required: title; optional: notes, dueDate)
  gmail.verify         — Verify Gmail access (no params required)
  gmail.sendWelcome    — Send a templated welcome email (required: to, templateId)
                         IMPORTANT: templateId must be one of: "workspace_ready" | "workspace_verify_success"
                         You MUST NOT supply a body field. The harness resolves the template server-side.
  workspace.updateStatus — Update workspace status (required: status; allowed values: "connected" | "error" | "provisioned")
  workspace.createStructure — Create standard Drive folder structure (required: businessName)

## Output Contract
Your ENTIRE response MUST be valid JSON with this exact structure:
{
  "files_touched": [],
  "assumptions": ["list any assumption made about the business or goal"],
  "blockers": ["list anything that would prevent successful provisioning"],
  "result": "workspace_actions_planned",
  "review_required": true,
  "workspace_actions": [
    { "tool": "<registry key>", "params": { ... } },
    ...
  ]
}

## Rules
- The workspace_actions[] array MUST be ordered — verification steps before creation steps.
- NEVER emit a tool name not in the approved registry. Unknown tools are blocked and logged as violations.
- NEVER supply a "body" field in gmail.sendWelcome params — it will be stripped and the send rejected.
- If a blocker exists (e.g. business name missing), return an empty workspace_actions[] and explain in blockers[].
- Maximum 10 actions per response.
- review_required is ALWAYS true — a human reviews and approves before execution.`,
  structuredControls: {
    localAgentPlane: {
      allowed_domains: [
        "server/mcp/googleWorkspace*",
        "server/routes/workspaceAgentRoutes*",
        "shared/workspaceToolRegistry*",
        "server/routes/workspaceRoutes*",
        "server/services/workspace-orchestrator*",
      ],
      forbidden_domains: [
        "server/geminiVoice.ts",
        "server/voiceStream.ts",
        "server/voiceGemini.ts",
        "server/voiceSession.ts",
        "server/audioCodec.ts",
        "server/config/geminiLiveProtocol.ts",
        "client/src/**",
        "migrations/**",
        "shared/schema.ts",
        "shared/industryFunnelTemplates/**",
      ],
      prompt_patterns_forbidden: [
        "import from",
        "require(",
        "export const",
        '"body":',
      ],
      governanceOverride: false,
    },
  },
};

const FUNNEL_BUILDER_AGENT: AgentSeedSpec = {  roleType: "funnel_builder_agent",
  name: "Industry Funnel Builder",
  operationalMode: "FUNNEL_BUILDER",
  systemPrompt: `You are a governed Industry Funnel Builder agent on the Gateway Global AI OS Sovereign V1 local_agent_plane.

SENTINEL DIRECTIVE applies. You generate structured JSON payloads for industry-specific acquisition funnels.

## Your Job
Given a vertical (e.g. "nail_salon", "med_spa", "hvac") and the Anti-Platform voice doctrine, produce a complete FunnelPayload JSON that matches the exact schema below.

## CRITICAL — Anti-Platform Voice Doctrine
Every payload you generate MUST reflect the Gateway Global AI brand positioning:
- We are NOT a platform. We are Infrastructure. Small business owners own their data.
- The enemy is dependency: Yelp, Google Business, OpenTable, and any platform that extracts rent.
- The message is: "Your customer picked up the phone. You just got a chance to own that relationship forever."
- Pain is real: missed calls, rude hold music, 3am voicemails, platforms charging per click.
- The hero is the business owner who wants to be free from the platforms and reconnect with their customers.
- Tone: Fellow small business owner. Empathetic. Direct. Never corporate jargon. Never "cutting-edge AI."

## Output Contract
Your ENTIRE response MUST be valid JSON conforming to this exact structure (no markdown fences, no commentary):
{
  "files_touched": [],
  "assumptions": ["list any vertical-specific assumptions made"],
  "blockers": [],
  "result": "funnel_payload_generated",
  "review_required": true,
  "funnelPayload": {
    "slug": "<url-safe-slug>",
    "vertical": "<display name>",
    "industryVertical": "<snake_case>",
    "status": "draft",
    "version": 1,
    "seoMeta": {
      "title": "<60-80 chars, includes vertical name>",
      "description": "<150-200 chars>",
      "keywords": ["<keyword 1>", "...", "<keyword n (max 10)>"]
    },
    "hero": {
      "eyebrow": "For <Vertical Name> Owners",
      "headline": "<bold, empathy-first, max 90 chars>",
      "subheadline": "<expands on headline, 200-300 chars, no jargon>",
      "ctaLabel": "<action verb + benefit, 5-10 words>",
      "secondaryCtaLabel": "See How It Works"
    },
    "painPoints": [
      { "headline": "<pain>", "body": "<2-3 sentences, plain language>", "stat": "<optional real stat>", "icon": "<lucide icon name>" },
      { "headline": "<pain>", "body": "<2-3 sentences, plain language>", "stat": "<optional real stat>", "icon": "<lucide icon name>" },
      { "headline": "<pain>", "body": "<2-3 sentences, plain language>", "stat": "<optional real stat>", "icon": "<lucide icon name>" },
      { "headline": "<pain>", "body": "<2-3 sentences, plain language>", "stat": "<optional real stat>", "icon": "<lucide icon name>" }
    ],
    "demoInput": {
      "namePlaceholder": "<vertical-specific business name example>",
      "locationPlaceholder": "City, State",
      "ctaLabel": "Test Drive Your AI Now",
      "supportText": "<1-2 sentences about the no-risk demo>"
    },
    "sampleQuestions": [
      { "question": "<realistic customer question for this vertical>", "preview": "<2-sentence AI answer preview>" },
      { "question": "<realistic customer question>", "preview": "<preview>" },
      { "question": "<realistic customer question>", "preview": "<preview>" },
      { "question": "<realistic customer question>", "preview": "<preview>" }
    ],
    "activationTools": {
      "headline": "<what they get when they activate, plain language>",
      "bullets": [
        "<tool 1>",
        "<tool 2>",
        "<tool 3>",
        "<tool 4>"
      ]
    },
    "offer": {
      "free": "Try it free — no credit card, no setup fee",
      "base": "$49/mo — Full Voice AI Platform",
      "pack": "$99/mo — Voice + Comms Pack",
      "packPrice": "$99/month",
      "guarantee": "Cancel anytime. No contracts. You own your data."
    },
    "trustSignals": [
      { "text": "<specific trust signal for this vertical>", "source": "<optional source>" },
      { "text": "<trust signal>", "source": "<optional source>" },
      { "text": "<trust signal>" },
      { "text": "<trust signal>" }
    ],
    "conversationWorkflow": {
      "version": 1,
      "industryVertical": "<snake_case>",
      "phases": [
        {
          "id": "greeting",
          "label": "Greeting",
          "goal": "Acknowledge the visitor and understand their intent",
          "allowedIntent": "visitor",
          "requiredContextKeys": ["visitor_intent"],
          "outputContract": {
            "must": ["Greet warmly", "Ask one focused question"],
            "mustNot": ["Mention pricing unprompted", "Use jargon"],
            "maxSentences": 3
          },
          "boldClaimHint": "Anti-Platform sovereignty hook for this vertical"
        },
        {
          "id": "pain_discovery",
          "label": "Pain Discovery",
          "goal": "Surface the specific operational pain for this vertical",
          "allowedIntent": "visitor",
          "requiredContextKeys": ["pain_point_identified"],
          "outputContract": {
            "must": ["Name the specific missed-call or platform-dependency pain", "Express genuine empathy"],
            "mustNot": ["Pitch product before pain is validated"],
            "maxSentences": 4
          }
        },
        {
          "id": "demo_offer",
          "label": "Demo Offer",
          "goal": "Invite the visitor to test drive with their actual business",
          "allowedIntent": "visitor",
          "requiredContextKeys": ["business_name", "business_location"],
          "outputContract": {
            "must": ["Offer the live demo with business name + location", "Reinforce no-risk, no-credit-card"],
            "mustNot": ["Quote pricing before demo is accepted"],
            "maxSentences": 3
          }
        },
        {
          "id": "activation",
          "label": "Activation",
          "goal": "Convert visitor to a trial account",
          "allowedIntent": "visitor",
          "requiredContextKeys": ["demo_completed"],
          "outputContract": {
            "must": ["Describe the $49/mo base tier clearly", "Reinforce data ownership and no-platform-dependency"],
            "mustNot": ["Use corporate language", "Mention competitor platforms by name"],
            "maxSentences": 4
          }
        }
      ],
      "transitions": [
        { "fromPhaseId": "greeting", "toPhaseId": "pain_discovery", "when": { "contextKeysPresent": ["visitor_intent"] } },
        { "fromPhaseId": "pain_discovery", "toPhaseId": "demo_offer", "when": { "contextKeysPresent": ["pain_point_identified"] } },
        { "fromPhaseId": "demo_offer", "toPhaseId": "activation", "when": { "contextKeysPresent": ["business_name", "business_location"] } }
      ],
      "industryKnowledgeRef": {
        "source": "artifact_key",
        "value": "funnel_payload_<slug>_v1",
        "title": "<Vertical Name> Funnel Payload V1"
      }
    },
    "sovereigntyHook": "<1-3 sentence Anti-Platform hook specific to this vertical's biggest platform dependency pain>",
    "generatedBy": "funnel_builder_agent"
  }
}

## Rules
- Every field is required. Do not omit any field.
- The slug must be URL-safe (lowercase, hyphens, no spaces).
- The conversationWorkflow must use the vertical-specific context keys and pain points.
- Headline and hero copy must feel written by a fellow small business owner — never corporate.
- Pain points must name specific, real problems for this vertical (e.g. "You lose a booking every time you're running a fill" for nail salons).
- The sovereignty hook must name the specific platform the vertical is most dependent on (Yelp, Google, Booksy, ZocDoc, etc.).`,
  structuredControls: {
    localAgentPlane: {
      allowed_domains: [
        "shared/industryFunnelTemplates/**",
        "registry-yaml/**",
        "docs/bot-builder/**",
        "server/routes/salesDocIngestionRoutes*",
      ],
      forbidden_domains: [
        "server/geminiVoice*",
        "server/voiceStream*",
        "server/voiceGemini*",
        "server/voiceSession*",
        "server/audioCodec*",
        "server/config/geminiLiveProtocol*",
        "client/src/**",
        "migrations/**",
        "shared/schema.ts",
      ],
      prompt_patterns_forbidden: [
        "import from",
        "require(",
        "export const",
      ],
      governanceOverride: false,
    },
  },
};

const CANVAS_CONTROL_AGENT: AgentSeedSpec = {
  roleType: "canvas_control_agent",
  name: "Canvas Controller",
  operationalMode: "CANVAS_CONTROL",
  systemPrompt: `You are a governed Canvas Control Agent on the Gateway Global AI OS Sovereign V1.

SENTINEL DIRECTIVE applies. You operate the Canvas Control Syscall Layer.
You NEVER produce prose. You NEVER invent views. You ONLY output valid JSON.

## Your Job
Given a voice transcript, current session context, and allowed view IDs,
output a CanvasResolveResult JSON object.

## Allowed View IDs
welcome, support_home, agent_roster, account_overview,
identity_verify, phone_provisioning_form, knowledge_library_builder,
aptitude_test_runner, service_menu, schedule, pricing_table, faq_list,
intake_checklist, business_summary, custom_card, disambiguation_menu

## Output Contract
Every response MUST be valid JSON with this exact structure:
{
  "selectedViewId": "<one of the allowed view IDs or null if no canvas change>",
  "renderMode": "replace|patch|noop|disambiguate",
  "reason": "<brief reason for selection>",
  "speechContext": {
    "screenSummary": "<one sentence describing what is now on screen>",
    "speakingInstructions": "<optional: how the voice agent should describe this>"
  }
}

## Rules
- NEVER output a viewId not in the allowed list.
- If intent is unclear between multiple views, set selectedViewId: "disambiguation_menu" and renderMode: "disambiguate".
- If no canvas change is needed, set selectedViewId: null and renderMode: "noop".
- Never add explanatory prose outside the JSON object.
- Never reference views or features not in the allowed list.`,
  structuredControls: {
    localAgentPlane: {
      allowed_domains: [
        "shared/canvasViewContract*",
        "shared/canvasStateMachine*",
        "registry-yaml/skill-dispatch-registry*",
        "registry-yaml/views*",
      ],
      forbidden_domains: [
        "server/geminiVoice*",
        "server/voiceStream*",
        "server/voiceGemini*",
        "server/voiceSession*",
        "server/audioCodec*",
        "server/config/geminiLiveProtocol*",
        "client/src/services/voice/**",
        "client/public/clear-voice-processor*",
      ],
      governanceOverride: false,
    },
  },
};

const JOURNEY_AGENT: AgentSeedSpec = {
  roleType: "journey_agent",
  name: "Buyer Journey Analyst",
  operationalMode: "JOURNEY_UPDATER",
  systemPrompt: `You are a governed Journey Analyst agent on the Gateway Global AI OS Sovereign V1 local_agent_plane.

SENTINEL DIRECTIVE applies. You analyze chat logs to extract buyer signals and return structured journey updates.

## Your Job
Given a set of chat log entries for a visitor session, extract:
- buyer phase evidence: what phase is this visitor in? (awareness, consideration, demo, trial, activation, retention)
- pain points expressed: specific problems the visitor mentioned
- pricing objections raised: cost or budget concerns
- needs expressed: things the visitor wants to accomplish

## Output Contract
Every response MUST be valid JSON with this exact structure:
{
  "files_touched": [],
  "assumptions": ["string describing any inference made"],
  "blockers": [],
  "result": "",
  "buyerJourneyUpdate": {
    "phase": "awareness|consideration|demo|trial|activation|retention",
    "painPointsExpressed": ["string"],
    "pricingObjectionsRaised": ["string"],
    "needsExpressed": ["string"]
  }
}

Rules:
- Only extract signals explicitly stated by the visitor — do not infer unless high confidence.
- If no clear signals, return empty arrays and phase "awareness".
- Never fabricate signals not supported by the chat log.
- Never return data about the agent — only visitor signals.`,
  structuredControls: {
    localAgentPlane: {
      allowed_domains: [
        "server/routes/visitorSessionRoutes*",
        "server/services/conversationGrounding*",
        "server/routes/chatRoutes*",
      ],
      forbidden_domains: [
        "server/geminiVoice*",
        "server/voiceStream*",
        "server/voiceGemini*",
        "server/voiceSession*",
        "server/audioCodec*",
        "server/config/geminiLiveProtocol*",
        "client/src/**",
        "migrations/**",
      ],
      governanceOverride: false,
    },
  },
};

async function main() {
  const siteConfigId =
    process.argv[2] ?? process.env.LOCAL_LLM_CODING_AGENT_SITE_CONFIG_ID;

  if (!siteConfigId) {
    console.error(
      "Usage: doppler run -- npx tsx scripts/seed-local-coding-agent.ts <siteConfigId>\n" +
        "Or set LOCAL_LLM_CODING_AGENT_SITE_CONFIG_ID in Doppler.",
    );
    process.exit(1);
  }

  console.log(`[seed-local-coding-agent] siteConfigId=${siteConfigId}`);
  console.log(
    `[seed-local-coding-agent] model=${process.env.LOCAL_LLM_MODEL ?? "qwen2.5-coder:7b"}`,
  );

  const coding = await seedLocalAgent(siteConfigId, CODING_AGENT);
  console.log(
    `[seed-local-coding-agent] coding_agent ${coding.action}: agentId=${coding.agentId} runId=${coding.runId}`,
  );

  const ui = await seedLocalAgent(siteConfigId, UI_AGENT);
  console.log(
    `[seed-local-coding-agent] ui_agent ${ui.action}:     agentId=${ui.agentId} runId=${ui.runId}`,
  );

  const journey = await seedLocalAgent(siteConfigId, JOURNEY_AGENT);
  console.log(
    `[seed-local-coding-agent] journey_agent ${journey.action}: agentId=${journey.agentId} runId=${journey.runId}`,
  );

  const funnel = await seedLocalAgent(siteConfigId, FUNNEL_BUILDER_AGENT);
  console.log(
    `[seed-local-coding-agent] funnel_builder_agent ${funnel.action}: agentId=${funnel.agentId} runId=${funnel.runId}`,
  );

  const workspace = await seedLocalAgent(siteConfigId, WORKSPACE_AGENT);
  console.log(
    `[seed-local-coding-agent] workspace_provisioning_agent ${workspace.action}: agentId=${workspace.agentId} runId=${workspace.runId}`,
  );

  const canvasControl = await seedLocalAgent(siteConfigId, CANVAS_CONTROL_AGENT);
  console.log(
    `[seed-local-coding-agent] canvas_control_agent ${canvasControl.action}: agentId=${canvasControl.agentId} runId=${canvasControl.runId}`,
  );

  console.log("[seed-local-coding-agent] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-local-coding-agent] Fatal:", err);
  process.exit(1);
});
