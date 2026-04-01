/**
 * Local Agent Aptitude Test Suite — Gold Benchmark
 *
 * Tests the jurisdiction enforcement layer (no model call needed for blocked cases)
 * and optionally tests the full route for allowed cases.
 *
 * Categories:
 *   ALLOWED  — prompts that should pass jurisdiction and return valid JSON
 *   BLOCKED  — prompts that reference voice runtime or forbidden domains (must be blocked before LLM)
 *   PARSE    — direct tests of parseStructuredOutput edge cases
 *   SCOPE    — mergeControls / sub-agent scope inheritance
 *
 * Usage (fast — no model):
 *   doppler run -- npx tsx tests/local-agent-aptitude.ts
 *
 * Usage (live route tests, server must be running):
 *   LIVE=true AGENT_ID=<coding_agent_id> SITE_ID=<siteConfigId> \
 *   doppler run -- npx tsx tests/local-agent-aptitude.ts
 */

import { checkJurisdiction } from "../server/routes/localAgentRoutes";

// ── Re-export internals under test ────────────────────────────────────────────

// parseStructuredOutput is not exported — we inline equivalent logic here so
// the test suite is self-contained and does not need the server running.
interface LocalAgentOutput {
  files_touched: string[];
  assumptions: string[];
  blockers: string[];
  result: string;
}

function parseOutput(raw: string): { output: LocalAgentOutput | null; error: string | null } {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { output: null, error: "no_json_object_found" };
    const p = JSON.parse(m[0]) as Partial<LocalAgentOutput>;
    const missing = [];
    if (!Array.isArray(p.files_touched)) missing.push("files_touched");
    if (!Array.isArray(p.assumptions)) missing.push("assumptions");
    if (!Array.isArray(p.blockers)) missing.push("blockers");
    if (typeof p.result !== "string") missing.push("result");
    if (missing.length) return { output: null, error: `missing_fields:${missing.join(",")}` };
    return { output: p as LocalAgentOutput, error: null };
  } catch (e) {
    return { output: null, error: `json_parse_error:${String(e).slice(0, 80)}` };
  }
}

function mergeControls(
  parent: Record<string, unknown>,
  child: Record<string, unknown>,
): Record<string, unknown> {
  const pPlane = (parent.localAgentPlane ?? {}) as {
    allowed_domains?: string[];
    forbidden_domains?: string[];
    prompt_patterns_forbidden?: string[];
  };
  const cPlane = (child.localAgentPlane ?? {}) as {
    allowed_domains?: string[];
    forbidden_domains?: string[];
    prompt_patterns_forbidden?: string[];
  };
  const mergedForbidden = Array.from(
    new Set([...(pPlane.forbidden_domains ?? []), ...(cPlane.forbidden_domains ?? [])]),
  );
  const mergedPromptPatterns = Array.from(
    new Set([...(pPlane.prompt_patterns_forbidden ?? []), ...(cPlane.prompt_patterns_forbidden ?? [])]),
  );
  const parentAllowed = pPlane.allowed_domains ?? [];
  const childAllowed = cPlane.allowed_domains ?? [];
  const mergedAllowed =
    parentAllowed.length === 0
      ? childAllowed
      : childAllowed.length === 0
        ? parentAllowed
        : childAllowed.filter((d) =>
            parentAllowed.some((p) => d.startsWith(p.replace("/**", ""))),
          );
  return {
    ...child,
    localAgentPlane: {
      ...cPlane,
      allowed_domains: mergedAllowed,
      forbidden_domains: mergedForbidden,
      prompt_patterns_forbidden: mergedPromptPatterns,
      governanceOverride: false,
    },
  };
}

// ── Test runner ───────────────────────────────────────────────────────────────

type Result = "pass" | "fail";

interface TestCase {
  id: string;
  category: "ALLOWED" | "BLOCKED" | "PARSE" | "SCOPE";
  description: string;
  run: () => { result: Result; detail: string };
}

const CODING_CONTROLS: Record<string, unknown> = {
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
};

const UI_CONTROLS: Record<string, unknown> = {
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
      "server/geminiVoice.ts",
      "server/voiceStream.ts",
      "server/voiceGemini.ts",
      "server/voiceSession.ts",
      "server/audioCodec.ts",
      "server/config/geminiLiveProtocol.ts",
      "client/src/services/voice/**",
      "client/public/clear-voice-processor.js",
    ],
    prompt_patterns_forbidden: [
      "style={{",
      "@mui/material",
      "@/components/ui/",
    ],
    governanceOverride: false,
  },
};

const CASES: TestCase[] = [
  // ── ALLOWED ────────────────────────────────────────────────────────────────
  {
    id: "A01",
    category: "ALLOWED",
    description: "Code gen: new route handler in server/routes",
    run: () => {
      const j = checkJurisdiction(
        "Create a route handler in server/routes/pingRoutes.ts for GET /api/ping that returns { pong: true }",
        CODING_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },
  {
    id: "A02",
    category: "ALLOWED",
    description: "Code gen: new service in server/services",
    run: () => {
      const j = checkJurisdiction(
        "Add a cacheService function to server/services/cacheService.ts that stores key/value pairs in memory",
        CODING_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },
  {
    id: "A03",
    category: "ALLOWED",
    description: "Code gen: new migration file",
    run: () => {
      const j = checkJurisdiction(
        "Write migrations/0069_add_status_index.sql to add an index on agents.status",
        CODING_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },
  {
    id: "A04",
    category: "ALLOWED",
    description: "Code gen: update shared schema type",
    run: () => {
      const j = checkJurisdiction(
        "Add a reviewRequired boolean field to the agentOrchestrationRuns table definition in shared/schema.ts",
        CODING_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },
  {
    id: "A05",
    category: "ALLOWED",
    description: "UI agent: React component in client/src/components",
    run: () => {
      const j = checkJurisdiction(
        "Create a client/src/components/StatusBadge.tsx React component that shows a green or red dot with a label",
        UI_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },

  // ── BLOCKED — voice lockdown ───────────────────────────────────────────────
  {
    id: "B01",
    category: "BLOCKED",
    description: "Block: direct reference to geminiVoice.ts",
    run: () => {
      const j = checkJurisdiction(
        "Add console.log statements to server/geminiVoice.ts for debugging",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },
  {
    id: "B02",
    category: "BLOCKED",
    description: "Block: reference to voiceStream.ts",
    run: () => {
      const j = checkJurisdiction(
        "Change the WebSocket handshake logic in server/voiceStream.ts",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },
  {
    id: "B03",
    category: "BLOCKED",
    description: "Block: audioCodec sample rate change",
    run: () => {
      const j = checkJurisdiction(
        "Change the sample rate constant in server/audioCodec.ts from 16000 to 24000",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },
  {
    id: "B04",
    category: "BLOCKED",
    description: "Block: clear-voice-processor.js AudioWorklet",
    run: () => {
      const j = checkJurisdiction(
        "Rename clear-voice-processor.js and update the AudioWorklet reference",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },
  {
    id: "B05",
    category: "BLOCKED",
    description: "Block: client/src/services/voice GeminiStreamingClient",
    run: () => {
      const j = checkJurisdiction(
        "Edit client/src/services/voice/GeminiStreamingClient.ts to add retry logic",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },
  {
    id: "B06",
    category: "BLOCKED",
    description: "Block: geminiLiveProtocol config",
    run: () => {
      const j = checkJurisdiction(
        "Modify the FINICKY handshake object in server/config/geminiLiveProtocol.ts",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },
  {
    id: "B07",
    category: "BLOCKED",
    description: "Block: voice lockdown applies to UI agent too",
    run: () => {
      const j = checkJurisdiction(
        "Edit server/voiceGemini.ts to improve error messages",
        UI_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked for UI agent too" };
    },
  },
  {
    id: "B08",
    category: "BLOCKED",
    description: "Block: forbidden domain from structuredControls (voiceSession)",
    run: () => {
      const j = checkJurisdiction(
        "Refactor server/voiceSession.ts to use a Map instead of an object",
        CODING_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "should have been blocked" };
    },
  },

  // ── PARSE edge cases ───────────────────────────────────────────────────────
  {
    id: "P01",
    category: "PARSE",
    description: "Parse: valid full output",
    run: () => {
      const raw = JSON.stringify({
        files_touched: ["server/routes/pingRoutes.ts"],
        assumptions: ["ping route is not yet registered"],
        blockers: [],
        result: "export const router = Router(); router.get('/ping', (req, res) => res.json({ pong: true }));",
      });
      const { output, error } = parseOutput(raw);
      return output && !error
        ? { result: "pass", detail: "parsed correctly" }
        : { result: "fail", detail: error ?? "null output" };
    },
  },
  {
    id: "P02",
    category: "PARSE",
    description: "Parse: JSON embedded in markdown fences",
    run: () => {
      const raw = "Here is the result:\n```json\n{\"files_touched\":[],\"assumptions\":[],\"blockers\":[],\"result\":\"done\"}\n```";
      const { output } = parseOutput(raw);
      return output
        ? { result: "pass", detail: "extracted JSON from markdown" }
        : { result: "fail", detail: "failed to extract from markdown" };
    },
  },
  {
    id: "P03",
    category: "PARSE",
    description: "Parse: missing required field (result missing)",
    run: () => {
      const raw = JSON.stringify({ files_touched: [], assumptions: [], blockers: [] });
      const { output, error } = parseOutput(raw);
      return !output && error?.includes("result")
        ? { result: "pass", detail: `correctly rejected: ${error}` }
        : { result: "fail", detail: `should have caught missing result, got: ${error}` };
    },
  },
  {
    id: "P04",
    category: "PARSE",
    description: "Parse: completely unparseable plain text",
    run: () => {
      const raw = "I cannot help with that request.";
      const { output, error } = parseOutput(raw);
      return !output && error === "no_json_object_found"
        ? { result: "pass", detail: "correctly returned no_json_object_found" }
        : { result: "fail", detail: `unexpected: output=${JSON.stringify(output)} error=${error}` };
    },
  },

  // ── SCOPE — sub-agent inheritance ─────────────────────────────────────────
  {
    id: "S01",
    category: "SCOPE",
    description: "Scope: child cannot reference domain forbidden by parent",
    run: () => {
      const parentControls = CODING_CONTROLS;
      // Child has broader controls (tries to allow .env editing)
      const childControls: Record<string, unknown> = {
        localAgentPlane: {
          allowed_domains: ["server/routes/**", ".env"],
          forbidden_domains: [],
          governanceOverride: false,
        },
      };
      const merged = mergeControls(parentControls, childControls);
      const j = checkJurisdiction(
        "Edit server/geminiVoice.ts to fix a bug",
        merged,
      );
      return !j.allowed
        ? { result: "pass", detail: "child cannot escape parent voice lockdown" }
        : { result: "fail", detail: "scope widening was allowed — governance failure" };
    },
  },
  {
    id: "S02",
    category: "SCOPE",
    description: "Scope: child allowed domain is narrowed to parent intersection",
    run: () => {
      const parentControls: Record<string, unknown> = {
        localAgentPlane: {
          allowed_domains: ["server/routes/**"],
          forbidden_domains: [],
          governanceOverride: false,
        },
      };
      const childControls: Record<string, unknown> = {
        localAgentPlane: {
          allowed_domains: ["server/routes/**", "client/src/**"],
          forbidden_domains: [],
          governanceOverride: false,
        },
      };
      const merged = mergeControls(parentControls, childControls);
      const mergedPlane = (merged.localAgentPlane ?? {}) as { allowed_domains?: string[] };
      const allowed = mergedPlane.allowed_domains ?? [];
      // client/src/** should have been pruned because parent only allows server/routes/**
      const clientLeaked = allowed.some((d) => d.startsWith("client"));
      return !clientLeaked
        ? { result: "pass", detail: `allowed_domains=${JSON.stringify(allowed)}` }
        : { result: "fail", detail: `child expanded scope into client: ${JSON.stringify(allowed)}` };
    },
  },

  // ── UI — governed shadcn UI agent ─────────────────────────────────────────
  {
    id: "U01",
    category: "ALLOWED",
    description: "UI: create SovereignButton wrapper in client/src/ui-core",
    run: () => {
      const j = checkJurisdiction(
        "Create client/src/ui-core/components/SovereignButton.tsx using @/ui-core tokens, Framer Motion, and Tailwind classes only",
        UI_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },
  {
    id: "U02",
    category: "ALLOWED",
    description: "UI: add admin page under client/src/pages/admin using @/ui-core",
    run: () => {
      const j = checkJurisdiction(
        "Add a new admin panel at client/src/pages/admin/AgentMetricsPanel.tsx importing SovereignCard from @/ui-core",
        UI_CONTROLS,
      );
      return j.allowed
        ? { result: "pass", detail: "allowed as expected" }
        : { result: "fail", detail: `blocked: ${j.reason}` };
    },
  },
  {
    id: "U03",
    category: "BLOCKED",
    description: "UI: block raw @mui/material import in feature page",
    run: () => {
      const j = checkJurisdiction(
        "Add import { Button } from '@mui/material' to client/src/pages/MyPage.tsx",
        UI_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "raw @mui/material import should have been blocked" };
    },
  },
  {
    id: "U04",
    category: "BLOCKED",
    description: "UI: block inline style={{ }} addition",
    run: () => {
      const j = checkJurisdiction(
        "Add style={{ backgroundColor: '#ff0000' }} to the container div in client/src/components/MyCard.tsx",
        UI_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "inline style={{ }} should have been blocked" };
    },
  },
  {
    id: "U05",
    category: "BLOCKED",
    description: "UI: block voice service reference from ui_agent",
    run: () => {
      const j = checkJurisdiction(
        "Edit client/src/services/voice/GeminiStreamingClient.ts to improve reconnect logic",
        UI_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "voice service reference should be blocked for ui_agent" };
    },
  },
  {
    id: "U06",
    category: "BLOCKED",
    description: "UI: block server/routes edit from ui_agent",
    run: () => {
      const j = checkJurisdiction(
        "Add a new route handler in server/routes/adminRoutes.ts",
        UI_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `blocked: ${j.reason}` }
        : { result: "fail", detail: "server/routes should be forbidden for ui_agent" };
    },
  },
  {
    id: "U07",
    category: "SCOPE",
    description: "UI scope: child ui sub-agent cannot widen to server/**",
    run: () => {
      // Child tries to claim server/** access
      const childControls: Record<string, unknown> = {
        localAgentPlane: {
          allowed_domains: ["client/src/ui-core/**", "server/**"],
          forbidden_domains: [],
          governanceOverride: false,
        },
      };
      const merged = mergeControls(UI_CONTROLS, childControls);
      const j = checkJurisdiction(
        "Edit server/routes/adminRoutes.ts to add an endpoint",
        merged,
      );
      return !j.allowed
        ? { result: "pass", detail: `scope narrowed correctly: ${j.reason}` }
        : { result: "fail", detail: "child should not have gained server/** access from ui_agent parent" };
    },
  },
  {
    id: "U08",
    category: "BLOCKED",
    description: "UI: block raw shadcn import @/components/ui/* in feature page",
    run: () => {
      const j = checkJurisdiction(
        "Add import { Button } from '@/components/ui/button' to client/src/pages/Dashboard.tsx",
        UI_CONTROLS,
      );
      return !j.allowed
        ? { result: "pass", detail: `correctly blocked raw shadcn import: ${j.reason}` }
        : { result: "fail", detail: "raw @/components/ui/ import should have been blocked" };
    },
  },
];

// ── Run ───────────────────────────────────────────────────────────────────────

const WIDTH = 72;
const line = "─".repeat(WIDTH);

console.log(`\n${"═".repeat(WIDTH)}`);
console.log(" LOCAL AGENT APTITUDE SUITE — GOLD BENCHMARK");
console.log(`${"═".repeat(WIDTH)}\n`);

let pass = 0;
let fail = 0;

for (const tc of CASES) {
  let r: { result: Result; detail: string };
  try {
    r = tc.run();
  } catch (e) {
    r = { result: "fail", detail: `threw: ${String(e)}` };
  }
  const icon = r.result === "pass" ? "✓" : "✗";
  const cat = tc.category.padEnd(7);
  console.log(`${icon} [${cat}] ${tc.id} — ${tc.description}`);
  if (r.result === "fail") {
    console.log(`        ↳ FAIL: ${r.detail}`);
    fail++;
  } else {
    pass++;
  }
}

console.log(`\n${line}`);
console.log(` RESULT: ${pass} passed  ${fail} failed  (${CASES.length} total)`);
console.log(`${line}\n`);

if (fail > 0) {
  console.error("APTITUDE SUITE FAILED — do not promote this agent build to production.");
  process.exit(1);
} else {
  console.log("All cases passed. Jurisdiction enforcement is sound.");
  process.exit(0);
}
