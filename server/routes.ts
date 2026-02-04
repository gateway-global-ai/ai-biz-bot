import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  searchAvailableNumbers, 
  provisionPhoneNumber, 
  releasePhoneNumber, 
  updatePhoneNumberWebhooks,
  getIncomingPhoneNumbers,
  sendSms,
  makeCall,
  getCallLogs as getTwilioCallLogs,
  getMessageLogs,
  updateCallerIdName,
  getTwilioFromPhoneNumber
} from "./twilio";
import { insertTelephonyConfigSchema, insertCallLogSchema, insertAgentSchema, insertCustomerSchema, DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, type DiscRanking, type DiscAssessmentResult } from "@shared/schema";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const updateConfigSchema = z.object({
  phoneNumber: z.string().nullable().optional(),
  phoneSid: z.string().nullable().optional(),
  friendlyName: z.string().nullable().optional(),
  messagingServiceSid: z.string().nullable().optional(),
  voiceUrl: z.string().url().nullable().optional().or(z.literal('')),
  voiceFallbackUrl: z.string().url().nullable().optional().or(z.literal('')),
  statusCallbackUrl: z.string().url().nullable().optional().or(z.literal('')),
  smsUrl: z.string().url().nullable().optional().or(z.literal('')),
  smsFallbackUrl: z.string().url().nullable().optional().or(z.literal('')),
  errorUrl: z.string().url().nullable().optional().or(z.literal('')),
  firewallEnabled: z.boolean().optional(),
  allowedNumbers: z.array(z.string()).optional(),
  maxCallDuration: z.number().min(1).max(180).optional(),
  timeout: z.number().min(5).max(120).optional(),
  callerIdName: z.string().nullable().optional(),
}).partial();

const firewallUpdateSchema = z.object({
  firewallEnabled: z.boolean().optional(),
  allowedNumbers: z.array(z.string()).optional(),
  ownerPhone: z.string().nullable().optional(),
  ownerEmail: z.string().email().nullable().optional().or(z.literal('')),
});

const webhooksUpdateSchema = z.object({
  phoneSid: z.string(),
  voiceUrl: z.string().url().optional().or(z.literal('')),
  voiceFallbackUrl: z.string().url().optional().or(z.literal('')),
  statusCallback: z.string().url().optional().or(z.literal('')),
  smsUrl: z.string().url().optional().or(z.literal('')),
  smsFallbackUrl: z.string().url().optional().or(z.literal('')),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Gemini API key endpoint (for client-side Gemini Live)
  app.get("/api/gemini-key", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    res.json({ apiKey });
  });
  
  // Get telephony config
  app.get("/api/telephony/config", async (req, res) => {
    try {
      let config = await storage.getTelephonyConfig();
      if (!config) {
        config = await storage.createTelephonyConfig({
          phoneNumber: null,
          firewallEnabled: true,
          allowedNumbers: [],
          maxCallDuration: 60,
          timeout: 30,
          friendlyName: "AI Agent Trunk",
        });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update telephony config
  app.patch("/api/telephony/config/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const config = await storage.updateTelephonyConfig(id, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search available phone numbers
  app.get("/api/telephony/numbers/search", async (req, res) => {
    try {
      const { areaCode, country = 'US' } = req.query;
      if (!areaCode || typeof areaCode !== 'string') {
        return res.status(400).json({ error: "Area code is required" });
      }
      const numbers = await searchAvailableNumbers(areaCode, country as string);
      res.json(numbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Provision a phone number
  app.post("/api/telephony/numbers/provision", async (req, res) => {
    try {
      const { phoneNumber, voiceUrl, smsUrl } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const result = await provisionPhoneNumber(phoneNumber, voiceUrl, smsUrl);
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          phoneNumber: result.phoneNumber,
          phoneSid: result.sid,
        });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Release a phone number
  app.post("/api/telephony/numbers/release", async (req, res) => {
    try {
      const { phoneSid } = req.body;
      if (!phoneSid) {
        return res.status(400).json({ error: "Phone SID is required" });
      }
      
      await releasePhoneNumber(phoneSid);
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          phoneNumber: null,
          phoneSid: null,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhooks
  app.patch("/api/telephony/webhooks", async (req, res) => {
    try {
      const parsed = webhooksUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const { phoneSid, voiceUrl, voiceFallbackUrl, statusCallback, smsUrl, smsFallbackUrl } = parsed.data;
      
      await updatePhoneNumberWebhooks(phoneSid, {
        voiceUrl: voiceUrl || undefined,
        voiceFallbackUrl: voiceFallbackUrl || undefined,
        statusCallback: statusCallback || undefined,
        smsUrl: smsUrl || undefined,
        smsFallbackUrl: smsFallbackUrl || undefined,
      });
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          voiceUrl: voiceUrl || null,
          voiceFallbackUrl: voiceFallbackUrl || null,
          statusCallbackUrl: statusCallback || null,
          smsUrl: smsUrl || null,
          smsFallbackUrl: smsFallbackUrl || null,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get incoming phone numbers from Twilio
  app.get("/api/telephony/numbers", async (req, res) => {
    try {
      const numbers = await getIncomingPhoneNumbers();
      res.json(numbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get default phone number
  app.get("/api/telephony/default-number", async (req, res) => {
    try {
      const phoneNumber = await getTwilioFromPhoneNumber();
      res.json({ phoneNumber });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send SMS
  app.post("/api/telephony/sms/send", async (req, res) => {
    try {
      const { to, body, from } = req.body;
      if (!to || !body) {
        return res.status(400).json({ error: "To and body are required" });
      }
      
      const result = await sendSms(to, body, from);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Make a call
  app.post("/api/telephony/calls/make", async (req, res) => {
    try {
      const { to, twimlUrl, from } = req.body;
      if (!to || !twimlUrl) {
        return res.status(400).json({ error: "To and twimlUrl are required" });
      }
      
      const result = await makeCall(to, twimlUrl, from);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get call logs from Twilio
  app.get("/api/telephony/calls", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const calls = await getTwilioCallLogs(limit);
      res.json(calls);
    } catch (error: any) {
      console.error('Error fetching call logs:', error.message);
      // Return empty array instead of error when Twilio isn't fully configured
      if (error.message.includes('not connected') || error.message.includes('accountSid')) {
        return res.json([]);
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get message logs from Twilio
  app.get("/api/telephony/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await getMessageLogs(limit);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching message logs:', error.message);
      if (error.message.includes('not connected') || error.message.includes('accountSid')) {
        return res.json([]);
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get local call logs
  app.get("/api/telephony/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create local call log
  app.post("/api/telephony/logs", async (req, res) => {
    try {
      const parsed = insertCallLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const log = await storage.createCallLog(parsed.data);
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update caller ID
  app.patch("/api/telephony/caller-id", async (req, res) => {
    try {
      const { phoneSid, callerIdName } = req.body;
      if (!phoneSid || !callerIdName) {
        return res.status(400).json({ error: "Phone SID and caller ID name are required" });
      }
      
      await updateCallerIdName(phoneSid, callerIdName);
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          callerIdName,
          friendlyName: callerIdName,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update firewall settings
  app.patch("/api/telephony/firewall", async (req, res) => {
    try {
      const parsed = firewallUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      let config = await storage.getTelephonyConfig();
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      
      const updates: any = {};
      if (typeof parsed.data.firewallEnabled === 'boolean') {
        updates.firewallEnabled = parsed.data.firewallEnabled;
      }
      if (Array.isArray(parsed.data.allowedNumbers)) {
        updates.allowedNumbers = parsed.data.allowedNumbers;
      }
      if (typeof parsed.data.ownerPhone !== 'undefined') {
        updates.ownerPhone = parsed.data.ownerPhone || null;
      }
      if (typeof parsed.data.ownerEmail !== 'undefined') {
        updates.ownerEmail = parsed.data.ownerEmail || null;
      }
      
      const updated = await storage.updateTelephonyConfig(config.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy webhook handlers - redirect to new secure endpoints
  // These are kept for backwards compatibility but should be updated in Twilio config
  app.post("/api/webhooks/voice", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/voice - Please update Twilio config to use /webhook/voice');
    res.redirect(307, '/webhook/voice');
  });

  app.post("/api/webhooks/voice/recording", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/voice/recording - deprecated');
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  });

  app.post("/api/webhooks/sms", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/sms - Please update Twilio config to use /webhook/sms');
    res.redirect(307, '/webhook/sms');
  });

  // Status callback handler
  app.post("/api/webhooks/status", async (req, res) => {
    const { CallSid, CallStatus, CallDuration, From, To, Direction } = req.body;
    
    try {
      let config = await storage.getTelephonyConfig();
      if (config && CallSid) {
        await storage.createCallLog({
          configId: config.id,
          direction: Direction === 'inbound' ? 'inbound' : 'outbound',
          phoneNumber: Direction === 'inbound' ? From : To,
          duration: parseInt(CallDuration) || 0,
          status: CallStatus === 'completed' ? 'completed' : 
                  CallStatus === 'no-answer' ? 'missed' : 
                  CallStatus === 'busy' ? 'missed' : 'failed',
          callSid: CallSid,
        });
      }
    } catch (error) {
      console.error('Error logging call status:', error);
    }
    
    res.sendStatus(200);
  });

  // ============================================
  // DISC ASSESSMENT API
  // ============================================

  // Get all DISC word sets (questions)
  app.get("/api/disc/questions", (req, res) => {
    res.json({
      instructions: "Rank each set of four words from 4 (most like you) to 1 (least like you). Use each number once per set.",
      totalSets: DISC_WORD_SETS.length,
      sets: DISC_WORD_SETS,
    });
  });

  // Get a single question set
  app.get("/api/disc/questions/:setNumber", (req, res) => {
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

  app.post("/api/disc/calculate", (req, res) => {
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
  app.post("/api/disc/calculate-simple", (req, res) => {
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

  // Generate mock conversation with Gemini TTS
  app.post("/api/conversation/generate", async (req, res) => {
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

      // Generate text response
      const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
  app.get("/api/conversation/voices", async (req, res) => {
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

  // Get all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agentList = await storage.getAgents();
      res.json(agentList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
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
  app.post("/api/agents", async (req, res) => {
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
  app.patch("/api/agents/:id", async (req, res) => {
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
  app.delete("/api/agents/:id", async (req, res) => {
    try {
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // CUSTOMER/LEAD MANAGEMENT API
  // ============================================

  // Get all customers (with optional search)
  app.get("/api/customers", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const customerList = await storage.getCustomers(search);
      res.json(customerList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Google Cloud Text-to-Speech API ============

  // Gemini TTS - Available voices (Chirp 3 HD)
  const GEMINI_TTS_VOICES = [
    { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
    { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
    { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
    { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
    { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
    { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
    { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
    { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
  ];

  // List available Gemini TTS voices
  app.get("/api/tts/voices", async (req, res) => {
    res.json({ voices: GEMINI_TTS_VOICES });
  });

  // Synthesize speech using Gemini TTS
  app.post("/api/tts/synthesize", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      
      if (!text || !voiceName) {
        return res.status(400).json({ error: "text and voiceName are required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      // Use Gemini 2.5 Flash TTS model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text }]
            }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName
                  }
                }
              }
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Gemini TTS error:", error);
        return res.status(500).json({ error: "Failed to generate speech" });
      }

      const data = await response.json();
      
      // Extract audio data from response
      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
      
      if (!audioData) {
        return res.status(500).json({ error: "No audio data in response" });
      }

      res.json({ 
        audio: audioData,
        contentType: mimeType
      });
    } catch (error: any) {
      console.error("TTS synthesize error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Twilio Webhooks for Inbound Communications ============

  // Helper to escape XML entities for TwiML safety
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Twilio signature validation middleware
  const validateTwilioSignature = (req: any, res: any, next: any) => {
    // Skip validation only in development with explicit flag or localhost testing
    const skipValidation = process.env.SKIP_TWILIO_VALIDATION === 'true' || 
      (process.env.NODE_ENV === 'development' && 
       (req.hostname === 'localhost' || req.hostname === '127.0.0.1'));
    
    if (skipValidation) {
      return next();
    }
    
    const twilioSignature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioSignature || !authToken) {
      console.warn('[Twilio Webhook] Missing signature or auth token');
      return res.status(403).send('Forbidden');
    }
    
    // Validate using Twilio's validateRequest
    try {
      const twilio = require('twilio');
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
      
      if (!isValid) {
        console.warn('[Twilio Webhook] Invalid signature');
        return res.status(403).send('Forbidden');
      }
      
      next();
    } catch (error) {
      console.error('[Twilio Webhook] Validation error:', error);
      return res.status(403).send('Forbidden');
    }
  };

  // Inbound SMS webhook - receives SMS from Twilio
  app.post("/webhook/sms", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body;
      
      console.log(`[SMS Webhook] From: ${From}, To: ${To}, Body: ${Body?.substring(0, 50)}...`);
      
      // Find or create conversation for this phone number
      let conversation = await storage.getConversationByPhone(From);
      
      if (!conversation) {
        // Try to match with existing customer
        const customer = await storage.getCustomerByPhone(From);
        
        conversation = await storage.createConversation({
          phoneNumber: From,
          customerId: customer?.id || null,
          agentId: null,
          lastMessageAt: new Date(),
        });
        
        console.log(`[SMS Webhook] Created new conversation: ${conversation.id}`);
      } else {
        // Update last message time
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
        });
      }
      
      // Store the message
      await storage.createMessage({
        conversationId: conversation.id,
        direction: 'inbound',
        body: Body || '',
        fromNumber: From,
        toNumber: To,
        messageSid: MessageSid,
        status: 'received',
      });
      
      // Generate AI response using Gemini if available
      let responseText = "Thank you for your message. An agent will respond shortly.";
      
      if (process.env.GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          
          // Get conversation history for context
          const messages = await storage.getMessagesByConversation(conversation.id, 10);
          const history = messages.reverse().map(m => 
            `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.body}`
          ).join('\n');
          
          const prompt = `You are a helpful AI assistant for Gateway Global. Respond to this SMS conversation naturally and helpfully. Keep responses under 160 characters for SMS.

Conversation history:
${history}

Customer's latest message: ${Body}

Respond as the helpful AI agent:`;
          
          const result = await model.generateContent(prompt);
          responseText = result.response.text() || responseText;
          
          // Trim to SMS length
          if (responseText.length > 160) {
            responseText = responseText.substring(0, 157) + '...';
          }
        } catch (aiError) {
          console.error('[SMS Webhook] AI response error:', aiError);
        }
      }
      
      // Store outbound message
      await storage.createMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        body: responseText,
        fromNumber: To,
        toNumber: From,
        status: 'sent',
      });
      
      // Return TwiML response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseText)}</Message>
</Response>`);
      
    } catch (error: any) {
      console.error('[SMS Webhook] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, we encountered an error. Please try again later.</Message>
</Response>`);
    }
  });

  // Inbound Voice webhook - receives calls from Twilio
  app.post("/webhook/voice", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;
      
      console.log(`[Voice Webhook] From: ${From}, To: ${To}, Status: ${CallStatus}`);
      
      // Log the call
      const config = await storage.getTelephonyConfig();
      await storage.createCallLog({
        configId: config?.id || null,
        direction: 'inbound',
        phoneNumber: From,
        status: CallStatus || 'ringing',
        callSid: CallSid,
        duration: 0,
      });
      
      // Check firewall - is this caller allowed?
      const allowedNumbers = config?.allowedNumbers || [];
      if (config?.firewallEnabled && allowedNumbers.length > 0) {
        const isAllowed = allowedNumbers.some(num => 
          From.includes(num) || num.includes(From.slice(-10))
        );
        
        if (!isAllowed) {
          console.log(`[Voice Webhook] Blocked caller: ${From}`);
          res.set('Content-Type', 'text/xml');
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, this number is not authorized to call this line.</Say>
  <Hangup/>
</Response>`);
        }
      }
      
      // Generate greeting with AI if available
      let greeting = "Hello, thank you for calling Gateway Global AI. How can I help you today?";
      
      // Return TwiML for voice response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(greeting)}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhook/voice/gather">
    <Say voice="alice">Please tell me how I can assist you.</Say>
  </Gather>
  <Say voice="alice">I didn't hear anything. Goodbye.</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Voice Webhook] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we encountered an error. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Voice gather webhook - handles speech input
  app.post("/webhook/voice/gather", validateTwilioSignature, async (req, res) => {
    try {
      const { SpeechResult, From, CallSid } = req.body;
      
      console.log(`[Voice Gather] From: ${From}, Speech: ${SpeechResult}`);
      
      let responseText = "I understand. Let me help you with that.";
      
      // Generate AI response if available
      if (process.env.GEMINI_API_KEY && SpeechResult) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          
          const prompt = `You are a helpful AI phone assistant for Gateway Global. Respond naturally to this caller's request. Keep your response under 200 words for phone readability.

Caller said: "${SpeechResult}"

Respond helpfully:`;
          
          const result = await model.generateContent(prompt);
          responseText = result.response.text() || responseText;
        } catch (aiError) {
          console.error('[Voice Gather] AI response error:', aiError);
        }
      }
      
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(responseText)}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhook/voice/gather">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye.</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Voice Gather] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, I had trouble understanding. Let me transfer you to an agent.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Voice status callback - tracks call completion
  app.post("/webhook/voice/status", validateTwilioSignature, async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      console.log(`[Voice Status] CallSid: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}`);
      
      // Update call log with final status
      // Note: Would need to add a method to update by callSid
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error('[Voice Status] Error:', error);
      res.sendStatus(500);
    }
  });

  // Get conversation history API
  app.get("/api/conversations/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const conversation = await storage.getConversationByPhone(phoneNumber);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messages = await storage.getMessagesByConversation(conversation.id, 100);
      
      res.json({
        conversation,
        messages: messages.reverse(), // Oldest first
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
