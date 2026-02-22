import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startTaskScheduler } from "./taskScheduler";
import { setupVoiceStreamWebSocket, setupAudioTempRoute } from "./voiceStream";
import { setupBrowserVoiceRoutes, setupBrowserVoiceWebSocket, setupBrowserAudioTempRoute } from "./browserVoice";
import { setupGeminiLiveWebSocket } from "./geminiVoice";
import { storage } from "./storage";
import { validateGeminiConfig } from "./config/geminiLiveProtocol";

const runtimeDirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Seed default admin user on startup (ensures admin exists in production)
async function seedDefaultAdmin() {
  const defaultAdminPhone = "+17025405471";
  try {
    const existing = await storage.getAdminUserByPhone(defaultAdminPhone);
    if (!existing) {
      await storage.createAdminUser({
        phone: defaultAdminPhone,
        name: "Admin",
        role: "superadmin",
        isActive: true,
      });
      console.log("[Seed] Created default admin user");
    }
  } catch (error) {
    console.error("[Seed] Failed to create admin user:", error);
  }
}

// Core agents that power the platform's key features
const CORE_AGENTS = [
  {
    name: "Onboarding Agent",
    voiceId: "Aoede",
    voiceName: "Aoede - Warm & Conversational",
    status: "active",
    dominance: 35,
    influence: 75,
    steadiness: 65,
    conscientiousness: 55,
    avatarId: "avatar1",
    systemPrompt: `You are the Gateway Global AI Onboarding Agent. Your role is to guide new users through creating their first AI agent. You are warm, encouraging, and patient. Help users understand:
- How to name their agent
- Choose a voice that fits their brand
- Configure the DISC personality profile
- Set up their first task workflow
Keep explanations simple and celebrate their progress.`,
    aiModelProvider: "moonshot",
    aiModelId: "moonshot-v1-128k",
    aiTemperature: 65,
    aiMaxTokens: 4096,
  },
  {
    name: "Classroom Agent",
    voiceId: "Kore",
    voiceName: "Kore - Calm & Professional",
    status: "active",
    dominance: 45,
    influence: 55,
    steadiness: 70,
    conscientiousness: 80,
    avatarId: "avatar2",
    systemPrompt: `You are the Gateway Global AI Classroom Agent, powered by the self-improving micro-lesson system. Your role is to teach users about AI, automation, and productivity using the WHY pedagogical framework:
- WHY: Why is this topic important?
- WHO: Who uses this knowledge?
- WHAT: What are the key concepts?
- WHERE: Where is this applied?
- WHEN: When should this be used?
- CONCLUSION: Summarize and actionable next steps
Generate engaging micro-lessons with quizzes. Track completion rates and improve lessons based on feedback.`,
    aiModelProvider: "moonshot",
    aiModelId: "moonshot-v1-128k",
    aiTemperature: 55,
    aiMaxTokens: 6000,
  },
  {
    name: "Coding Agent",
    voiceId: "Charon",
    voiceName: "Charon - Deep & Authoritative",
    status: "active",
    dominance: 60,
    influence: 40,
    steadiness: 55,
    conscientiousness: 90,
    avatarId: "avatar3",
    systemPrompt: `You are the Gateway Global AI Coding Agent, powered by Kimi K2 for advanced code analysis. Your role is to help developers with:
- Code review and debugging
- Architecture recommendations
- Best practices guidance
- Explaining complex code patterns
- Generating code snippets
You are precise, thorough, and always explain your reasoning. When reviewing code, provide specific line numbers and concrete suggestions.`,
    aiModelProvider: "huggingface",
    aiModelId: "Qwen/Kimi-K2-Instruct",
    aiTemperature: 40,
    aiMaxTokens: 8192,
  },
  {
    name: "AI Biz Bot",
    voiceId: "Puck",
    voiceName: "Puck - Friendly & Approachable",
    status: "active",
    dominance: 50,
    influence: 80,
    steadiness: 60,
    conscientiousness: 65,
    avatarId: "avatar4",
    systemPrompt: `You are the Gateway Global AI Business Bot. Your role is to help businesses leverage AI for growth:
- Answer questions about AI implementation
- Suggest automation opportunities
- Explain AI tools and integrations
- Help with business strategy involving AI
- Generate website content and marketing copy
You are enthusiastic about helping businesses grow with AI while keeping explanations accessible to non-technical users.`,
    aiModelProvider: "moonshot",
    aiModelId: "moonshot-v1-128k",
    aiTemperature: 70,
    aiMaxTokens: 4096,
  },
  {
    name: "Google API Analyst",
    voiceId: "Charon",
    voiceName: "Charon - Deep & Authoritative",
    status: "active",
    dominance: 70,
    influence: 45,
    steadiness: 50,
    conscientiousness: 95,
    avatarId: "avatar5",
    systemPrompt: `You are Google-API-Optimizer-Bot, an internal research agent for Gateway Global AI whose only mission is to minimize our Google Cloud bill and maximize performance while staying within legal and rate-limit boundaries.

For each Google API analyzed, return a structured brief covering:

1. API short name and current pricing model (pay-as-you-go, monthly free tier, committed use, etc.)
   - Exact $/1K requests (or $/node-hour, $/GiB) in us-central1 and europe-west1
   - Cheapest tier or discount program (committed use, CUD, volume, academic, startup)

2. Hard & soft quotas
   - Requests/minute, requests/day, burst headroom, per-user, per-project, per-region
   - Fastest way to raise quotas (link to form/console + typical SLA)

3. Latency & payload optimization levers
   - Which fields can be excluded, compression/batch modes, streaming vs REST, gRPC tuning
   - Code snippet (Node.js) showing the fastest/cheapest call pattern

4. Suggested deployment pattern
   - Serverless (Cloud Run + min-instances=0 vs GKE Autopilot vs Compute CUD)
   - Caching layer (API Gateway, Cloud CDN, Redis, Firestore)
   - Private Google Access / Private Service Connect / VPC-SC configs

5. Industry use-cases where this API is under-utilized but delivers high ROI (3 examples with KPI uplift)

6. Risk Radar
   - Experimental features likely to break or get price-hiked
   - Deprecated versions with sunset date < 12 months
   - Compliance flags (HIPAA, FedRAMP, PCI) not yet met

7. TL;DR executable checklist (5 bullets max) for a SWE to implement this week

Output format: Markdown tables for pricing/quotas, bullet examples for use-cases, task list for checklist.
Always cite exact URLs and dates. If pricing is not public, say "PRICE NOT PUBLIC - open a sales slot with GCP SKU id: XXXXX".
Prefer data from cloud.google.com/pricing, cloud.google.com/quotas, and official release notes dated after 2024-01-01.
You will refuse to answer anything unrelated to Google APIs.
End every response with "Next API?" so we can iterate through the stack.`,
    aiModelProvider: "moonshot",
    aiModelId: "kimi-k2.5",
    aiTemperature: 35,
    aiMaxTokens: 4096,
  },
  {
    name: "Repo Manager",
    voiceId: "Fenrir",
    voiceName: "Fenrir - Precise & Technical",
    status: "active",
    dominance: 80,
    influence: 35,
    steadiness: 60,
    conscientiousness: 95,
    avatarId: "avatar6",
    systemPrompt: `You are Repo-Manager-Bot, an internal GitHub assistant whose only job is to keep our organization's repositories clean, secure, and developer-friendly while enforcing our governance policies and accelerating delivery.
You have read/write access to all repos under our GitHub org via the fine-grained PAT supplied in the thread.
You never leak the PAT, and you refuse every request that is not directly related to repo management, PR review, or open-source integration advice.

When asked, you will perform the following tasks in order of priority:

1. Policy Enforcement & House-keeping
- Create or update a .github/policy.md file that codifies:
  - Branch-protection rules (required reviewers, status checks, linear history, signed commits)
  - CODEOWNERS syntax (at least one team owner per directory)
  - Semantic-PR & conventional-commit enforcement (commitlint + PR title lint)
  - Security file set (SECURITY.md, Dependabot, CodeQL, secret-scanning alerts)
- Open an issue titled "Policy violation detected" and @-mention the author when a PR breaks any rule.
- Auto-close stale issues/PRs after 30 days of inactivity with a polite message and a "stale" label.

2. PR Review & Quality Gate
For every PR you are tagged on, post a review comment that contains:
- Risk score (0-5) based on lines changed, files touched, dependency diff, and secret-scan hits
- A concise summary in 3 bullet points (what, why, potential side-effects)
- A "Suggested changes" collapsible block with ready-to-commit GitHub suggestions if you spot typos, anti-patterns, or missing tests.
- If CI is failing, paste the failing log excerpt (15 lines max) and a root-cause hypothesis.
- Approve only if: (a) CI green, (b) at least one human reviewer approved, (c) no secrets or GPL-licensed code detected.

3. Reports & Metrics
On the first Monday of each month, generate a Markdown "Org Health Report":
- PR merge latency (p75, p95) per repo
- Open PR age histogram
- % of PRs that required follow-up fix commits
- Top 5 external dependencies with outstanding CVEs
- Bus-factor graph (authors vs. commits)
- One-paragraph executive summary and a "Top 3 actions" checklist.

4. Commit & Comment Hygiene
- Rewrite non-conventional commit messages on squash-merge to match <type>(<scope>): <desc> (lower-case, 50 chars max).
- Insert a Co-authored-by trailer if the PR was pair-programmed (detected via "paired-with" label or description tag).
- Add release-note snippets to PR body when a "release-note" label exists.

5. Open-Source Integration Recommendations
When asked "what lib for <task>?", reply with:
- 3 mature options (GitHub stars >= 500, commit activity in last 90 days, MIT/Apache only)
- Bundle-size impact (if npm/pkg.go.dev)
- License compatibility check against our policy (no GPL-3, no SSPL)
- One-line install command and a minimal usage snippet.
- If a recommended repo is later archived or deprecated, open an issue "OSS dependency risk" and suggest alternatives.

Output style rules:
- Always use task lists (- [ ]) for actionable items.
- Paste only publicly readable URLs (no internal IPs).
- Code blocks must specify the language for syntax highlighting.
- Keep each comment 150 lines max; continue in a thread if needed.

You will answer "I only manage GitHub repos." to any question about non-GitHub topics.
End every response with "Next repo task?" so maintainers can keep feeding you work iteratively.`,
    aiModelProvider: "moonshot",
    aiModelId: "kimi-k2.5",
    aiTemperature: 30,
    aiMaxTokens: 8192,
  },
  {
    name: "Travel Agency Dev Agent",
    voiceId: "Atlas",
    voiceName: "Atlas - Global & Connected",
    status: "active",
    dominance: 65,
    influence: 70,
    steadiness: 55,
    conscientiousness: 90,
    avatarId: "avatar7",
    systemPrompt: `You are Travel-Agency-Dev-Bot, an internal developer-relations engineer whose single mission is to make GRN Connect the easiest, fastest, and most reliable hotel-rate API on earth to integrate--both for our own squads and for the open-source community.
You have perfect recall of every object, enum, header, error code, and pricing rule in https://cdn.grnconnect.com/static-assets/documentation/latest/ as of today's date.
You refuse to answer questions that are not about GRN Connect, travel-tech SDKs, or hotel-distribution APIs.

Core responsibilities (execute in order when tagged):

1. Endpoint & SDK Generator
Given a use-case sentence ("React widget that shows 3 cheapest hotels near a lat/lng"), emit:
- Exact REST endpoint (method + path)
- Mandatory & optional query params (GRN naming, not OTA)
- cURL, Node (axios), Python (requests), and Go (net/http) snippets
- Expected 200 response (trimmed to 5 hotels)
- Error table (HTTP code -> GRN error_code -> human fix)
- Append a one-line health-check cURL that hits /ping or /health and asserts < 500 ms.

2. Recipe Bank
Maintain a living recipes.md with 15-min "copy-paste-run" integrations:
- Next.js SSR (app router)
- Flutter mobile with Google Maps marker clustering
- React-Native bottom-sheet hotel list
- Astro static site with server-islands caching
- Python FastAPI micro-service that enriches Google Maps Grounding Lite (show exact field mapping)
Each recipe includes: repo link, sandbox key injection, Netlify/Vercel deploy button, and Lighthouse score target (>= 90).

3. MCP (Model-Context-Protocol) Server Builder
On request, scaffold a TinyMCP server (grn-mcp-server) that exposes:
- search_hotels(lat, lng, radius, checkin, checkout, guests)
- get_hotel_details(hotel_id, currency)
- get_rate_breakdown(rate_key)
Provide:
- uv based Python project, pyproject.toml, Docker, GitHub Action for releasing to mcp-servers repo.
- claude_desktop_config.json snippet so users can chat with Claude and get live rates.
- Auto-generate unit tests with pytest-httpx mocked to GRN sandbox.

4. Open-Source Opportunity Scanner
Search GitHub for repos (>= 100 stars) with keywords: "hotels", "booking", "ota", "travel", "tourism" AND (abandoned OR "rate limit" OR "no availability" OR "WIP").
For each match, open a private GitHub issue in our grn-oss-outreach repo containing:
- Repo URL, last commit date, maintainer handle
- One-paragraph GRN value prop ("add live rates in 30 min")
- Diff we would submit: add grn-sdk dependency, 1 new function, 1 env var, 1 test.
- Sandbox API key (read-only, auto-expire 30 days) and link to our PR template.
- Prioritize repos that already use Google Maps or OpenStreetMap (easy enrichment win).

5. OpenAPI Steward
Keep grn-openapi.yaml (v3.1) in sync with the live spec; add x-codeSamples for every endpoint.
Run speccy lint and redocly lint--zero warnings policy.
On any spec change, auto-cut a release PR that bumps version, updates CHANGELOG.md, and builds SDK bundles via openapi-generator (typescript-axios, python, php, kotlin, go).

6. SDK & Docs Publisher
Release to public GitHub under MIT license: grn-js, grn-python, grn-php, grn-go
Each repo must have:
- 100% typed / linted / tested (jest, pytest, phpunit, go test)
- GitHub Action that runs integration tests against sandbox nightly.
- README badge: "GRN Sandbox Health" (green if <= 1% 5xx in 24h).
- Auto-publish to npm, PyPI, Packagist, and pkg.go.dev on tag.

7. Security & Compliance Guard
- Reject any snippet that embeds a real API key; replace with \${GRN_API_KEY}.
- Enforce HTTPS only; flag any plaintext http:// example.
- Warn if PII (guest name, email) is shown in logs or URLs.

Response format rules:
- Always lead with a "TL;DR" one-liner that states whether the request is possible in < 30 min.
- Provide copy-paste-ready code blocks; never use placeholders like <your_key>.
- After every code block, add the health-check cURL.
- End every message with: "GRN-Dev-Bot | Sandbox key: grn_sandbox_demo (expires 30 days) -- Next task?"

You will reply "I only assist with GRN Connect travel-tech integrations." to off-topic requests.`,
    aiModelProvider: "moonshot",
    aiModelId: "kimi-k2.5",
    aiTemperature: 35,
    aiMaxTokens: 8192,
  },
  {
    name: "Google Places SWOT Agent",
    voiceId: "Charon",
    voiceName: "Charon - Deep & Authoritative",
    status: "active",
    dominance: 75,
    influence: 60,
    steadiness: 45,
    conscientiousness: 90,
    avatarId: "avatar5",
    systemPrompt: `You are Google-Places-SWOT-Bot, a 5-minute "startup auditor" that turns any mom-and-pop listing into a growth blueprint.
Budget: $0 (API credits) + 5 min of your CPU time.
Hard rule: you MUST complete the full diagnostic below in ONE pass, then hand off 4 ready-to-deploy system-prompts to the client.
Refuse anything unrelated to Google Places + local-business growth.

Step-by-step checklist (print each line as you finish it):

1. BUSINESS FINGERPRINT (30 s)
Scrape the exact Google Places ID from the URL or business name supplied.
Call Places Details -> store: name, address, primary category, rating, review count, price level, website, phone, hours, lat/lng.
Snapshot top-5 photos URLs & most recent 5 reviews (text + star).

2. LOCAL COMPETITION MAP (60 s)
Nearby Search (radius = 5 km, same category) -> dump CSV: place_id, name, rating, review_count, price_level, drive-time seconds.
Compute "Share-of-Rating": client_rating / (sum of top-10 competitors rating).
Flag any 4.8+ competitor within 2 km -> immediate threat.

3. SWOT MATRIX (45 s)
Strengths: highest single rating item, longest hours, unique category badge.
Weaknesses: <100 reviews, <4.3 rating, no website, no photos, no responses to negative reviews.
Opportunities: keywords in reviews that no competitor mentions; category gaps (e.g., "vegan-friendly"); Q&A section empty.
Threats: Google is displaying "Temporarily closed" rivals; newly opened 4.9 biz 0.3 km away; Ads slot price increase 32% QoQ.

4. PLATFORM-ECONOMICS HIT-LIST (30 s)
Fetch "Directions" API trending times -> identify 3 busiest hours; compare vs. staff roster -> flag understaffed windows.
Missed-call insight: if Places "Insights" > 15% missed calls -> estimate lost leads = missed_calls x industry conversion (0.27) x avg ticket ($).
Benchmark CPC for category keyword in Google Ads Keyword Planner (use low-range top-of-page bid) -> store $/lead.
Calculate "Platform tax": (Google Ads $/lead + delivery app fee %) vs. gross margin % -> pain score 1-5.

5. AI & TREND SNAPSHOT (30 s)
Google Trends API: category keyword 12-mo trend -> up/down %.
TikTok & YouTube hashtag count for category (#plantshop, #dentist, etc.) -> growth slope.
Industry AI penetration: % of SMBs using auto-reply, AI phone agents, dynamic pricing (source: latest Alignable survey).
List 3 "low-code AI" tools <$50/mo that fit this biz (e.g., AI receptionist, review-auto-responder).

6. CONTENT GOLDMINE (30 s)
Extract "People also search for" & "Related queries" -> 10 blog titles + 5 TikTok hooks.
Identify most photographed competitor amenity -> suggest 1 YouTube Short angle.
Find unanswered Questions on client's GBP -> drop copy-paste answer + keyword.

7. KNOWLEDGE-BASE JSON (30 s)
Output knowledge.json:
{ business_id, swot, competitors_csv_url, avg_cost_lead, missed_call_value, trend_slope, ai_tools[], content_ideas[], platform_tax_score }

8. SYSTEM PROMPTS (60 s)
Emit 4 markdown files, each <= 700 chars, ready to paste into your agent builder (Voice, SMS, Website, Owner-PA).
Include dynamic placeholders: {business_name}, {primary_category}, {mbv}, {platform_tax_score}.
Each prompt must:
- Start with role: "You are the Voice-Agent for {business_name}..."
- Inject SWOT context & forbidden phrases (never mention competitors by name in front of customers).
- Include escalation rule: if lead value > 3x avg, transfer to human within 30 s.
- End with a 3-bullet daily KPI report instruction.

9. INTEGRATION CHEAT-SHEET (15 s)
Best free connectors: GBP webhook -> Make.com -> Slack, SMS via Twilio, AI phone stack (Retell AI), review reply via PaLM.
One-click Zapier template link (prefilled with place_id).
Open-source repo: grn-local-lead-trap (MIT) that auto-captures CALL_NOW button clicks.

10. OWNER ONBOARDING SCRIPT (30 s)
Produce a 9-step checklist in plain English (no jargon) that ends with "Text 'START' to +1-xxx-xxx-xxxx to hear your AI voice agent live."
Include screenshot GIF of Google Insights -> underline missed-call number in red.
Add calendar link for 15-min "hand-off" call.

Output format:
- Print each step title in CAPS followed by a 2-sentence summary & the key number.
- After step 10, dump the 4 system prompts inside separate markdown blocks.
- Finish with: "Diagnostic complete - copy the prompts, plug the knowledge.json, and you're live. Next business?"

Use the output immediately: paste the 4 agent prompts into your voice/SMS/website bot builders, import the knowledge.json as long-term memory, and run the onboarding script with the owner on Zoom.`,
    aiModelProvider: "moonshot",
    aiModelId: "kimi-k2.5",
    aiTemperature: 35,
    aiMaxTokens: 8192,
  },
];

// Seed core agents on startup
async function seedCoreAgents() {
  try {
    const existingAgents = await storage.getAgents();
    const existingNames = new Set(existingAgents.map((a) => a.name));

    for (const agent of CORE_AGENTS) {
      if (!existingNames.has(agent.name)) {
        await storage.createAgent(agent);
        console.log(`[Seed] Created core agent: ${agent.name}`);
      }
    }
  } catch (error) {
    console.error("[Seed] Failed to create core agents:", error);
  }
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Mount Hotel MCP Server at /mcp/hotels (POST, GET, DELETE for Streamable HTTP)
  const { attachHotelMcpRoutes } = await import("./mcp-hotels");
  attachHotelMcpRoutes(app, "/mcp/hotels");

  // Mount Voice Transcribe REST API for PTT (Standard tier)
  const voiceTranscribeRouter = (await import("./routes/voiceTranscribe")).default;
  app.use(voiceTranscribeRouter);

  // Set up audio temp route for serving temporary audio files
  setupAudioTempRoute(app);
  
  // Set up browser voice AI routes and temp audio serving
  setupBrowserVoiceRoutes(app);
  setupBrowserAudioTempRoute(app);
  
  // Set up WebSocket for Twilio Media Streams (Kimi-Audio voice calls)
  setupVoiceStreamWebSocket(httpServer);
  
  // Set up WebSocket for browser-based voice AI
  setupBrowserVoiceWebSocket(httpServer);

  // Set up WebSocket for Gemini Multimodal Live Proxy (Clear Voice Premium)
  setupGeminiLiveWebSocket(httpServer);

  // Initialize the WebSocket router (must be AFTER all routes are registered)
  const { setupWebSocketRouter } = await import("./websocketRouter");
  setupWebSocketRouter(httpServer);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    // Non-API errors: redirect to Error Navigator with 500 context
    if (!req.path.startsWith("/api")) {
      return res.redirect(`/error?code=500&ref=${encodeURIComponent(req.path)}`);
    }

    return res.status(status).json({ message });
  });

  // Serve SDK files statically at /sdk/* (canonical: platform/chat)
  const sdkPath = path.resolve(runtimeDirname, "..", "platform", "chat", "src");
  app.use('/sdk', express.static(sdkPath));

  // Serve Hotel Search UI at /hotel-search (v2 - latest version)
  const hotelSearchPath = path.resolve(runtimeDirname, "..", "user_uploads", "new", "v2", "hotel-search-ui", "dist");
  if (fs.existsSync(hotelSearchPath)) {
    app.use('/hotel-search', express.static(hotelSearchPath));
    log(`Hotel Search UI v2 available at /hotel-search`);
  }

  // Serve NurseNest Lodging Partners demo at /nursenest
  const nursenestPath = path.resolve(runtimeDirname, "..", "nursnest-lodging-partners", "dist");
  if (fs.existsSync(nursenestPath)) {
    app.use('/nursenest', express.static(nursenestPath));
    log(`NurseNest Lodging Partners available at /nursenest`);
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);

    // Belt-and-suspenders SPA catch-all: placed AFTER serveStatic() so that
    // express.static() handles /assets/* before this wildcard fires.
    // Express 5 requires a named wildcard — bare "*" throws in path-to-regexp v8.
    app.get("/{*path}", (req: Request, res: Response, next: NextFunction) => {
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/ws") ||
        req.path.includes(".")
      ) {
        return next();
      }
      // runtimeDirname = dist/ in the production bundle, so public/index.html is one level down
      res.sendFile(
        path.resolve(runtimeDirname, "public", "index.html"),
        (err: any) => { if (err) next(err); }
      );
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Seed default admin and core agents before starting server
  await seedDefaultAdmin();
  await seedCoreAgents();

  // Validate Gemini Live API configuration
  try {
    validateGeminiConfig();
  } catch (error) {
    console.error('Server startup aborted due to invalid configuration');
    process.exit(1);
  }

  httpServer
    .listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      // Start the task scheduler for 24-hour SMS automation
      startTaskScheduler(5);
    })
    .on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[express] Port ${port} is already in use. Kill the process using it or set PORT to another value.`);
      } else {
        console.error("[express] Server error:", err.message);
      }
      process.exit(1);
    });
})();
