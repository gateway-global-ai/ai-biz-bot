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
import { insertTelephonyConfigSchema, insertCallLogSchema, DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, type DiscRanking, type DiscAssessmentResult } from "@shared/schema";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

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

  // Voice webhook handler
  app.post("/api/webhooks/voice", (req, res) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Hello! This is your AI Agent. How can I help you today?</Say>
        <Record maxLength="60" action="/api/webhooks/voice/recording" />
      </Response>`;
    res.type('text/xml');
    res.send(twiml);
  });

  // Voice recording callback
  app.post("/api/webhooks/voice/recording", (req, res) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Thank you for your message. Goodbye!</Say>
        <Hangup/>
      </Response>`;
    res.type('text/xml');
    res.send(twiml);
  });

  // SMS webhook handler
  app.post("/api/webhooks/sms", (req, res) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Thank you for your message! Your AI Agent will respond shortly.</Message>
      </Response>`;
    res.type('text/xml');
    res.send(twiml);
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

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const discDescription = discProfile ? 
        `The agent has a DISC profile with: D=${discProfile.dominance}%, I=${discProfile.influence}%, S=${discProfile.steadiness}%, C=${discProfile.conscientiousness}%` :
        'The agent has a balanced DISC profile';

      const scenarioText = scenario || 'a friendly introduction and offering to help with questions';

      const conversationPrompt = `You are ${agentName || 'NEXUS'}, an AI assistant with the following personality traits based on the DISC model:
${discDescription}

Generate a brief, natural-sounding conversation response for this scenario: ${scenarioText}

Keep the response conversational, warm, and under 100 words. Speak directly as the agent.`;

      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: conversationPrompt,
      });

      const conversationText = textResponse.text || "Hello! I'm your AI assistant. How can I help you today?";

      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: conversationText,
        config: {
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore'
              }
            }
          }
        }
      });

      let audioData = null;
      if (ttsResponse.candidates?.[0]?.content?.parts) {
        for (const part of ttsResponse.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            audioData = {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            };
            break;
          }
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

  return httpServer;
}
