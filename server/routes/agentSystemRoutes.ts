import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatewayChat, parseTask, generateNavigatorIntroduction } from "../ai-gateway";
import { requireAuth } from "../auth";
import {
  DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, PLAN_LIMITS,
  insertAgentSchema, botTemplates, agents, organizations,
  projects, projectTasks, analyticsLogs,
  type DiscRanking, type DiscAssessmentResult,
} from "@shared/schema";
import { handleAdminToolCall, ADMIN_TOOL_DEFINITIONS } from "../tools/adminToolHandlers";

const router = Router();

// ── DISC + Conversation + Agents + Orgs + Projects + BotTemplates ──────────────────────────────────────────────────────

  router.get("/api/disc/questions", (req, res) => {
    res.json({
      instructions: "Rank each set of four words from 4 (most like you) to 1 (least like you). Use each number once per set.",
      totalSets: DISC_WORD_SETS.length,
      sets: DISC_WORD_SETS,
    });
  });

  // Get a single question set
  router.get("/api/disc/questions/:setNumber", (req, res) => {
    const setNumber = parseInt(req.params.setNumber);
    const wordSet = DISC_WORD_SETS.find(s => s.setNumber === setNumber);
    
    if (!wordSet) {
      return res.status(404).json({ error: `Set ${setNumber} not found. Valid range: 1-24` });
    }
    
    res.json(wordSet);
  });

  // Submit rankings and calculate DISC profile
  const discRankingsSchema = z.object({
    rankings: z.array(z.object({
      setNumber: z.number().min(1).max(24),
      rankings: z.tuple([
        z.number().min(1).max(4),
        z.number().min(1).max(4),
        z.number().min(1).max(4),
        z.number().min(1).max(4),
      ]).refine(
        (arr) => new Set(arr).size === 4,
        { message: "Each ranking (1-4) must be used exactly once per set" }
      ),
    })).length(24),
  });

  router.post("/api/disc/calculate", (req, res) => {
    const parsed = discRankingsSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid rankings format",
        details: parsed.error.errors,
        expectedFormat: {
          rankings: [
            { setNumber: 1, rankings: [4, 3, 2, 1] },
            { setNumber: 2, rankings: [1, 4, 3, 2] },
          ]
        }
      });
    }

    const { rankings } = parsed.data;

    let dScore = 0, iScore = 0, sScore = 0, cScore = 0;

    for (const ranking of rankings) {
      dScore += ranking.rankings[0];
      iScore += ranking.rankings[1];
      sScore += ranking.rankings[2];
      cScore += ranking.rankings[3];
    }

    const totalScore = dScore + iScore + sScore + cScore;

    const scores = {
      dominance: dScore,
      influence: iScore,
      steadiness: sScore,
      conscientiousness: cScore,
    };

    const percentages = {
      dominance: Math.round((dScore / 96) * 100),
      influence: Math.round((iScore / 96) * 100),
      steadiness: Math.round((sScore / 96) * 100),
      conscientiousness: Math.round((cScore / 96) * 100),
    };

    const styleScores: [string, number][] = [
      ['D', dScore],
      ['I', iScore],
      ['S', sScore],
      ['C', cScore],
    ];
    styleScores.sort((a, b) => b[1] - a[1]);

    const result: DiscAssessmentResult = {
      scores,
      percentages,
      primaryStyle: styleScores[0][0] as 'D' | 'I' | 'S' | 'C',
      secondaryStyle: styleScores[1][0] as 'D' | 'I' | 'S' | 'C',
      styleDescriptions: DISC_STYLE_DESCRIPTIONS,
    };

    res.json(result);
  });

  // Simple endpoint for bots - accepts array format "Set X: [4,3,2,1]"
  router.post("/api/disc/calculate-simple", (req, res) => {
    try {
      const { responses } = req.body;
      
      if (!responses || !Array.isArray(responses) || responses.length !== 24) {
        return res.status(400).json({
          error: "Expected 24 response arrays",
          expectedFormat: {
            responses: [[4,3,2,1], [1,4,3,2], "...24 total"]
          }
        });
      }

      let dScore = 0, iScore = 0, sScore = 0, cScore = 0;

      for (let i = 0; i < responses.length; i++) {
        const ranking = responses[i];
        if (!Array.isArray(ranking) || ranking.length !== 4) {
          return res.status(400).json({ error: `Set ${i + 1} must have exactly 4 rankings` });
        }
        if (new Set(ranking).size !== 4 || !ranking.every((n: number) => n >= 1 && n <= 4)) {
          return res.status(400).json({ error: `Set ${i + 1} must use each number 1-4 exactly once` });
        }
        dScore += ranking[0];
        iScore += ranking[1];
        sScore += ranking[2];
        cScore += ranking[3];
      }

      const percentages = {
        dominance: Math.round((dScore / 96) * 100),
        influence: Math.round((iScore / 96) * 100),
        steadiness: Math.round((sScore / 96) * 100),
        conscientiousness: Math.round((cScore / 96) * 100),
      };

      const styleScores: [string, number][] = [
        ['D', dScore],
        ['I', iScore],
        ['S', sScore],
        ['C', cScore],
      ];
      styleScores.sort((a, b) => b[1] - a[1]);

      res.json({
        scores: { dominance: dScore, influence: iScore, steadiness: sScore, conscientiousness: cScore },
        percentages,
        primaryStyle: styleScores[0][0],
        secondaryStyle: styleScores[1][0],
        styleDescriptions: DISC_STYLE_DESCRIPTIONS,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =====================================================
  // MVP Task Submission API
  // =====================================================
  
  // Zod schema for task submission validation
  const taskSubmitSchema = z.object({
    task: z.string().min(5, "Task must be at least 5 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    name: z.string().min(1, "Name is required"),
    agentName: z.string().min(1, "Agent name is required"),
    personality: z.object({
      id: z.enum(['achiever', 'collaborator', 'supporter', 'analyst']),
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      disc: z.object({
        dominance: z.number().min(0).max(100),
        influence: z.number().min(0).max(100),
        steadiness: z.number().min(0).max(100),
        conscientiousness: z.number().min(0).max(100),
      }),
    }),
  });

  // Submit a new task (from MVP landing page)
  router.post("/api/tasks/submit", async (req, res) => {
    try {
      // Validate request body with Zod
      const validationResult = taskSubmitSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { task, phone, name, personality, agentName } = validationResult.data;
      
      // Normalize phone number (remove formatting)
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      
      // Format to E.164 for Twilio
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;
      
      // Parse task via AI gateway
      let parsedTask = null;
      try {
        // 
        parsedTask = await parseTask(task);
        console.log('[Task Submit] Parsed task:', parsedTask);
      } catch (parseError) {
        console.error('[Task Submit] Task parsing error:', parseError);
      }
      
      // Calculate next update time (1 hour from now)
      const nextUpdateAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Create the task with validated DISC values
      const newTask = await storage.createTask({
        userName: name,
        userPhone: e164Phone,
        agentName,
        personalityId: personality.id,
        task,
        parsedTask,
        status: 'started',
        estimatedHours: parsedTask?.estimatedHours || 24,
        dominance: personality.disc.dominance,
        influence: personality.disc.influence,
        steadiness: personality.disc.steadiness,
        conscientiousness: personality.disc.conscientiousness,
        startedAt: new Date(),
        nextUpdateAt,
        updatesCount: 1,
      });
      
      console.log('[Task Submit] Created task:', newTask.id);
      
      // Send Navigator first-login "Call Coordinates" SMS
      let callCoordinates: string | null = null;
      try {
        // 
        
        // Fetch telephony config once; reuse the phone number as Call Coordinates
        const config = await storage.getTelephonyConfig();
        callCoordinates = config?.phoneNumber ?? null;

        const smsMessage = await generateNavigatorIntroduction({
          userName: name,
          agentName,
          taskDescription: task,
          callCoordinates: callCoordinates ?? 'Gateway Global AI',
        });
        
        // Send SMS via Twilio
        if (callCoordinates && config?.accountSid && config?.authToken) {
          const { sendSms } = await import("./twilio");
          await sendSms(e164Phone, smsMessage, callCoordinates);
          console.log(`[Task Submit] Sent Navigator intro SMS to ${e164Phone}`);
        } else {
          console.warn('[Task Submit] No Twilio config, skipping Navigator intro SMS');
        }
      } catch (smsError) {
        console.error('[Task Submit] Navigator intro SMS error:', smsError);
      }
      
      res.json({ 
        success: true, 
        taskId: newTask.id,
        message: `Task created! ${agentName} will text you shortly.`,
        callCoordinates,
      });
      
    } catch (error: any) {
      console.error('[Task Submit] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task status (for optional dashboard)
  router.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get tasks by phone number
  router.get("/api/tasks/phone/:phone", async (req, res) => {
    try {
      const normalizedPhone = req.params.phone.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;
      
      const tasks = await storage.getTasksByPhone(e164Phone);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate mock conversation with Gemini TTS
  router.post("/api/conversation/generate", async (req, res) => {
    try {
      const { agentName, discProfile, scenario } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const discDescription = discProfile ? 
        `The agent has a DISC profile with: D=${discProfile.dominance}%, I=${discProfile.influence}%, S=${discProfile.steadiness}%, C=${discProfile.conscientiousness}%` :
        'The agent has a balanced DISC profile';

      const scenarioText = scenario || 'a friendly introduction and offering to help with questions';

      const conversationPrompt = `You are ${agentName || 'NEXUS'}, an AI assistant with the following personality traits based on the DISC model:
${discDescription}

Generate a brief, natural-sounding conversation response for this scenario: ${scenarioText}

Keep the response conversational, warm, and under 100 words. Speak directly as the agent.`;

      // Generate text response (model from env only)
      const textModelId = process.env.GEMINI_MODEL_ID;
      if (!textModelId) {
        return res.status(503).json({ error: 'GEMINI_MODEL_ID not configured' });
      }
      const textModel = genAI.getGenerativeModel({ model: textModelId });
      const textResult = await textModel.generateContent(conversationPrompt);
      const conversationText = textResult.response.text() || "Hello! I'm your AI assistant. How can I help you today?";

      // Generate TTS using direct API call (Gemini TTS model)
      const ttsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: conversationText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
              }
            }
          })
        }
      );

      let audioData = null;
      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        const audioPart = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (audioPart) {
          audioData = {
            data: audioPart.data,
            mimeType: audioPart.mimeType
          };
        }
      }

      res.json({
        text: conversationText,
        audio: audioData,
        agentName: agentName || 'NEXUS',
        discProfile: discProfile || { dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50 }
      });
    } catch (error: any) {
      console.error('Gemini TTS error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get available TTS voices
  router.get("/api/conversation/voices", async (req, res) => {
    res.json({
      voices: [
        { id: 'Kore', name: 'Kore', description: 'Warm and professional' },
        { id: 'Puck', name: 'Puck', description: 'Friendly and upbeat' },
        { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', description: 'Calm and reassuring' },
        { id: 'Aoede', name: 'Aoede', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', description: 'Soft and gentle' }
      ]
    });
  });

  // ============================================
  // AGENT MANAGEMENT API
  // ============================================

  // Get all agents (optional: ?siteConfigId=... filter by site; ?excludeProvider=kimi exclude KIMI)
  router.get("/api/agents", async (req, res) => {
    try {
      const siteConfigId = req.query.siteConfigId as string | undefined;
      const excludeProvider = req.query.excludeProvider as string | undefined;

      // Check auth for visibility
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      let userRole = 'public';

      if (token) {
        const session = await storage.getValidAuthSession(token);
        if (session) {
           const user = await storage.getAdminUserById(session.adminUserId);
           if (user) {
             // Map admin/superadmin to 'owner' for this logic
             if (['admin', 'superadmin', 'owner'].includes(user.role || '')) {
               userRole = 'owner';
             } else if (user.role === 'employee') {
               userRole = 'employee';
             }
           }
        }
      }

      let agentList;
      if (siteConfigId && siteConfigId !== 'undefined' && siteConfigId !== '') {
        agentList = await storage.getAgentsBySiteConfigId(siteConfigId);
      } else {
        agentList = await storage.getAgents();
      }

      // Filter by visibility
      if (userRole === 'owner') {
        // Owner sees all
      } else if (userRole === 'employee') {
        // Employee sees public and internal
        agentList = agentList.filter((a: any) => ['public', 'internal'].includes(a.visibility || 'private'));
      } else {
        // Public sees only public
        agentList = agentList.filter((a: any) => (a.visibility || 'private') === 'public');
      }

      if (excludeProvider === 'kimi') {
        agentList = agentList.filter((a: any) => (a.aiModelProvider ?? 'gemini') !== 'kimi');
      }

      res.json(agentList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single agent
  router.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create agent
  router.post("/api/agents", async (req, res) => {
    try {
      const parsed = insertAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const agent = await storage.createAgent(parsed.data);
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update agent
  router.patch("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete agent
  router.delete("/api/agents/:id", async (req, res) => {
    try {
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AGENT BUDGET & STARTUP SCRIPT API
  // ============================================

  // Cost estimation: approximate USD per 1K tokens by model (no hardcoded model IDs)
  const DEFAULT_GEMINI_RATES = { input: 0.00015, output: 0.0006 };
  function getModelCostRates(): Record<string, { input: number; output: number }> {
    const m: Record<string, { input: number; output: number }> = {
      default: { input: 0.002, output: 0.006 },
    };
    const envModel = process.env.GEMINI_MODEL_ID;
    if (envModel) m[envModel] = DEFAULT_GEMINI_RATES;
    return m;
  }
  const MODEL_COST_PER_1K_TOKENS = getModelCostRates();

  function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
    const rates = MODEL_COST_PER_1K_TOKENS[modelId] || MODEL_COST_PER_1K_TOKENS['default'];
    return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  }

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  function getNextResetDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        const dayOfWeek = now.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday);
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  // Serve only the client-designated Maps key (referrer-restricted). Never expose server keys (GOOGLE_MAPS_API_KEY, GOOGLE_CLOUD_API_KEY).
  router.get("/api/config/maps-key", (_req, res) => {
    const key = process.env.GOOGLE_MAPS_JS_API || process.env.GOOGLE_MAPS_JS_KEY;
    if (!key) {
      return res.status(503).json({
        error: "Google Maps API key not configured for client. Set GOOGLE_MAPS_JS_API or GOOGLE_MAPS_JS_KEY (referrer-restricted key); do not use server key here.",
      });
    }
    res.json({ key });
  });

  // Update agent budget configuration
  router.patch("/api/agents/:id/budget", async (req, res) => {
    try {
      const schema = z.object({
        budgetAmountUsd: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Budget must be a non-negative number" }).optional(),
        budgetPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
        startupScript: z.string().max(10000).optional().nullable(),
        startupBudgetUsd: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Startup budget must be a non-negative number" }).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const updates: any = {};
      if (parsed.data.budgetAmountUsd !== undefined) updates.budgetAmountUsd = parsed.data.budgetAmountUsd;
      if (parsed.data.budgetPeriod !== undefined) {
        updates.budgetPeriod = parsed.data.budgetPeriod;
        updates.budgetResetAt = getNextResetDate(parsed.data.budgetPeriod);
      }
      if (parsed.data.startupScript !== undefined) updates.startupScript = parsed.data.startupScript;
      if (parsed.data.startupBudgetUsd !== undefined) updates.startupBudgetUsd = parsed.data.startupBudgetUsd;

      const agent = await storage.updateAgent(req.params.id, updates);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get agent budget summary
  router.get("/api/agents/:id/budget", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      // Check if budget period has reset
      const now = new Date();
      let spentUsd = parseFloat(agent.budgetSpentUsd || '0');
      let resetAt = agent.budgetResetAt;

      if (resetAt && now > new Date(resetAt)) {
        spentUsd = 0;
        resetAt = getNextResetDate(agent.budgetPeriod || 'monthly');
        await storage.updateAgent(agent.id, {
          budgetSpentUsd: '0',
          budgetResetAt: resetAt,
        });
      }

      const budgetAmount = parseFloat(agent.budgetAmountUsd || '0');
      const startupBudget = parseFloat(agent.startupBudgetUsd || '0');

      res.json({
        budgetAmountUsd: budgetAmount,
        budgetPeriod: agent.budgetPeriod || 'monthly',
        budgetSpentUsd: spentUsd,
        budgetRemainingUsd: Math.max(0, budgetAmount - spentUsd),
        budgetResetAt: resetAt,
        startupScript: agent.startupScript,
        startupBudgetUsd: startupBudget,
        startupStatus: agent.startupStatus || 'pending',
        startupResultSummary: agent.startupResultSummary,
        startupLastRunAt: agent.startupLastRunAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run agent startup script
  router.post("/api/agents/:id/startup-run", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      if (!agent.startupScript || agent.startupScript.trim().length === 0) {
        return res.status(400).json({ error: "No startup script configured for this agent" });
      }

      const startupBudget = parseFloat(agent.startupBudgetUsd || '0');
      if (startupBudget <= 0) {
        return res.status(400).json({ error: "Startup budget must be greater than $0" });
      }

      // Mark as running
      await storage.updateAgent(agent.id, { startupStatus: 'running' });

      const modelId = agent.aiModelId || process.env.GEMINI_MODEL_ID;
      if (!modelId) {
        return res.status(503).json({ error: 'GEMINI_MODEL_ID not configured; set in Doppler or set agent.aiModelId' });
      }
      const temperature = (agent.aiTemperature || 60) / 100;
      const maxTokens = agent.aiMaxTokens || 4096;

      // Build research prompt
      const systemPrompt = agent.systemPrompt
        ? `${agent.systemPrompt}\n\n--- STARTUP RESEARCH TASK ---\nYou have been allocated a startup budget of $${startupBudget.toFixed(2)} for initial research. Complete the research task below thoroughly. Provide actionable findings, data points, and recommendations. Be concise but comprehensive.`
        : `You are ${agent.name}, an AI agent performing initial research. You have a budget of $${startupBudget.toFixed(2)}. Complete the research task thoroughly with actionable findings.`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `STARTUP RESEARCH TASK:\n\n${agent.startupScript}\n\nProvide a thorough research report with findings, data, and actionable recommendations.` },
      ];

      // Estimate input tokens for cost tracking
      const inputText = messages.map(m => m.content).join(' ');
      const estimatedInputTokens = estimateTokens(inputText);

      // Cap output tokens based on budget
      const modelRates = MODEL_COST_PER_1K_TOKENS[modelId] || MODEL_COST_PER_1K_TOKENS['default'];
      const inputCost = (estimatedInputTokens / 1000) * modelRates.input;
      const remainingBudget = startupBudget - inputCost;
      const maxOutputByBudget = Math.floor((remainingBudget / modelRates.output) * 1000);
      const cappedMaxTokens = Math.min(maxTokens, Math.max(500, maxOutputByBudget));

      try {
        const response = await chat({
          model: modelId as any,
          messages,
          temperature,
          max_tokens: cappedMaxTokens,
        });

        // Estimate cost
        const estimatedOutputTokens = estimateTokens(response);
        const totalCost = estimateCostUsd(modelId, estimatedInputTokens, estimatedOutputTokens);

        // Update agent with results
        const currentSpent = parseFloat(agent.budgetSpentUsd || '0');
        await storage.updateAgent(agent.id, {
          startupStatus: 'completed',
          startupResultSummary: response.slice(0, 10000),
          startupLastRunAt: new Date(),
          budgetSpentUsd: (currentSpent + totalCost).toFixed(2),
        });

        res.json({
          success: true,
          result: response,
          estimatedCostUsd: totalCost,
          tokensUsed: {
            input: estimatedInputTokens,
            output: estimatedOutputTokens,
          },
        });
      } catch (aiError: any) {
        await storage.updateAgent(agent.id, { startupStatus: 'failed' });
        res.status(500).json({ error: `AI request failed: ${aiError.message}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reset agent budget spending
  router.post("/api/agents/:id/budget-reset", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      
      await storage.updateAgent(agent.id, {
        budgetSpentUsd: '0',
        budgetResetAt: getNextResetDate(agent.budgetPeriod || 'monthly'),
      });
      
      res.json({ success: true, message: 'Budget reset successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ORGANIZATIONS, PROJECTS & TASKS API
  // ============================================

  // Organizations CRUD
  router.get("/api/organizations", async (req, res) => {
    try {
      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/organizations/:id", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.id);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/organizations", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const org = await storage.createOrganization(parsed.data);
      res.status(201).json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/api/organizations/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const org = await storage.updateOrganization(req.params.id, parsed.data);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/organizations/:id", async (req, res) => {
    try {
      await storage.deleteOrganization(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects CRUD
  router.get("/api/projects", async (req, res) => {
    try {
      const orgId = req.query.orgId as string | undefined;
      const projectsList = await storage.getProjects(orgId);
      res.json(projectsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/projects", async (req, res) => {
    try {
      const schema = z.object({
        orgId: z.string().min(1),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        status: z.enum(["active", "completed", "archived"]).optional(),
        leadAgentId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const project = await storage.createProject(parsed.data);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/api/projects/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(["active", "completed", "archived"]).optional(),
        leadAgentId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const project = await storage.updateProject(req.params.id, parsed.data);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project Tasks CRUD
  router.get("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const tasksList = await storage.getProjectTasks(req.params.projectId);
      res.json(tasksList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgentId: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const taskData = {
        ...parsed.data,
        projectId: req.params.projectId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      };
      const task = await storage.createProjectTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/api/project-tasks/:id", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgentId: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const updates: any = { ...parsed.data };
      if (parsed.data.dueDate) updates.dueDate = new Date(parsed.data.dueDate);
      if (parsed.data.status === 'done') updates.completedAt = new Date();
      const task = await storage.updateProjectTask(req.params.id, updates);
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/project-tasks/:id", async (req, res) => {
    try {
      await storage.deleteProjectTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project context endpoint - assembles full context for chat
  router.get("/api/projects/:id/context", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const org = await storage.getOrganization(project.orgId);
      const tasksList = await storage.getProjectTasks(project.id);
      const allAgents = await storage.getAgents();
      const assignedAgents = allAgents.filter(a => 
        project.agentIds?.includes(a.id) || a.id === project.leadAgentId
      );
      res.json({
        organization: org,
        project,
        tasks: tasksList,
        agents: assignedAgents.map(a => ({ id: a.id, name: a.name })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // BOT TEMPLATES API
  // ============================================

  router.get("/api/bot-templates", async (_req, res) => {
    try {
      const templates = await storage.getBotTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/bot-templates/:id", async (req, res) => {
    try {
      const template = await storage.getBotTemplate(req.params.id);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/bot-templates", async (req, res) => {
    try {
      const { insertBotTemplateSchema } = await import("@shared/schema");
      const parsed = insertBotTemplateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const template = await storage.createBotTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/api/bot-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateBotTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/bot-templates/:id", async (req, res) => {
    try {
      await storage.deleteBotTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AI GATEWAY INFO API
  // ============================================

  router.get("/api/gateway/providers", async (_req, res) => {
    try {
      const { getAvailableProviders } = await import('../ai-gateway');
      res.json(getAvailableProviders());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PUBLIC BOT CONFIG & EMBED SCRIPT
  // ============================================


export default router;
