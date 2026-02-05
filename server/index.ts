import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startTaskScheduler } from "./taskScheduler";
import { setupVoiceStreamWebSocket, setupAudioTempRoute } from "./voiceStream";
import { storage } from "./storage";

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
  
  // Set up audio temp route for serving temporary audio files
  setupAudioTempRoute(app);
  
  // Set up WebSocket for Twilio Media Streams (Kimi-Audio voice calls)
  setupVoiceStreamWebSocket(httpServer);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
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

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start the task scheduler for 24-hour SMS automation
      // Checks every 5 minutes for tasks that need updates
      startTaskScheduler(5);
    },
  );
})();
