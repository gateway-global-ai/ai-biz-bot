import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import twilio from "twilio";
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
  getTwilioFromPhoneNumber,
  getTwilioClient
} from "./twilio";
import { insertTelephonyConfigSchema, insertCallLogSchema, insertAgentSchema, insertCustomerSchema, DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, type DiscRanking, type DiscAssessmentResult } from "@shared/schema";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chat, generateSmsResponse, KIMI_MODELS } from "./kimi";
import { sendOtp, verifyOtp, verifySession, logout } from "./auth";

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
  
  // Auth routes
  app.post("/api/auth/send-otp", sendOtp);
  app.post("/api/auth/verify-otp", verifyOtp);
  app.get("/api/auth/session", verifySession);
  app.post("/api/auth/logout", logout);

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
      // Never return authToken to client - add hasAuthToken indicator instead
      const { authToken, ...safeConfig } = config as any;
      res.json({
        ...safeConfig,
        hasAuthToken: !!authToken,
      });
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

  // Add an existing phone number with credentials
  app.post("/api/telephony/numbers/existing", async (req, res) => {
    try {
      const { accountSid, authToken, phoneNumber, phoneSid, friendlyName, isSubAccount, parentAccountSid } = req.body;
      
      // Validation
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      // Phone number format validation
      if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        return res.status(400).json({ error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" });
      }
      
      // If credentials provided, validate them
      let twilioClient = null;
      if (accountSid && authToken) {
        // Require both if either is provided
        if (!accountSid || !authToken) {
          return res.status(400).json({ error: "Both Account SID and Auth Token are required" });
        }
        
        try {
          twilioClient = twilio(accountSid, authToken);
          await twilioClient.api.accounts(accountSid).fetch();
        } catch (credError: any) {
          return res.status(400).json({ error: `Invalid Twilio credentials: ${credError.message}` });
        }
        
        // If phoneSid provided, verify it belongs to this account
        if (phoneSid) {
          try {
            const phoneInfo = await twilioClient.incomingPhoneNumbers(phoneSid).fetch();
            if (phoneInfo.phoneNumber !== phoneNumber) {
              return res.status(400).json({ error: "Phone SID does not match the provided phone number" });
            }
          } catch (sidError: any) {
            return res.status(400).json({ error: `Phone SID verification failed: ${sidError.message}` });
          }
        }
      }
      
      const baseUrl = 'https://twilio.gatewayglobal.ai'; // Production webhook URL
      const voiceUrl = `${baseUrl}/webhook/voice`;
      const smsUrl = `${baseUrl}/webhook/sms`;
      const statusCallback = `${baseUrl}/webhook/voice/status`;
      
      // If we have credentials and phoneSid, configure webhooks on Twilio
      if (twilioClient && phoneSid) {
        try {
          await twilioClient.incomingPhoneNumbers(phoneSid).update({
            voiceUrl: voiceUrl,
            voiceMethod: 'POST',
            smsUrl: smsUrl,
            smsMethod: 'POST',
            statusCallback: statusCallback,
            statusCallbackMethod: 'POST',
          });
          console.log(`Configured webhooks for ${phoneNumber} on Twilio`);
        } catch (webhookError: any) {
          console.error('Failed to configure webhooks:', webhookError);
          // Continue anyway - user can manually configure webhooks
        }
      }
      
      let config = await storage.getTelephonyConfig();
      
      const updateData = {
        accountSid: accountSid || null,
        authToken: authToken || null,
        phoneNumber,
        phoneSid: phoneSid || null,
        friendlyName: friendlyName || 'AI Agent Trunk',
        isSubAccount: isSubAccount || false,
        parentAccountSid: parentAccountSid || null,
        voiceUrl,
        smsUrl,
        statusCallbackUrl: statusCallback,
      };
      
      if (config) {
        await storage.updateTelephonyConfig(config.id, updateData);
      } else {
        await storage.createTelephonyConfig(updateData);
      }
      
      res.json({ 
        success: true, 
        message: phoneSid && twilioClient 
          ? "Number added and webhooks configured on Twilio" 
          : "Number added - configure webhooks manually if needed"
      });
    } catch (error: any) {
      console.error('Error adding existing number:', error);
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

  // Link an existing Twilio phone number to an agent
  app.post("/api/telephony/numbers/link", async (req, res) => {
    try {
      // E.164 format: starts with +, followed by 1-15 digits
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      
      const linkSchema = z.object({
        phoneNumber: z.string().min(1, "Phone number is required").transform(val => {
          // Normalize to E.164: remove everything except + and digits
          let normalized = val.replace(/[^\d+]/g, '');
          // Add + if missing and starts with a country code
          if (!normalized.startsWith('+') && normalized.length >= 10) {
            normalized = '+' + (normalized.startsWith('1') ? normalized : '1' + normalized);
          }
          return normalized;
        }).refine(val => e164Regex.test(val), {
          message: "Phone number must be in E.164 format (e.g., +17025551234)"
        }),
        phoneSid: z.string().min(1, "Phone SID is required").regex(/^PN[a-zA-Z0-9]{32}$/, "Phone SID must be in format PN followed by 32 characters"),
        agentId: z.string().min(1, "Agent ID is required"),
      });

      const parsed = linkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { phoneNumber, phoneSid, agentId } = parsed.data;

      // Verify the agent exists
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Configure webhooks for this number in Twilio
      const twilioClient = await getTwilioClient();
      
      // Use the production base URL from environment or derive from Replit
      const baseUrl = process.env.WEBHOOK_BASE_URL || 
                      process.env.REPLIT_DEPLOYMENT_URL || 
                      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      
      try {
        // Verify the number exists and belongs to this account first
        const existingNumber = await twilioClient.incomingPhoneNumbers(phoneSid).fetch();
        if (!existingNumber) {
          return res.status(404).json({ 
            error: "Phone number not found in your Twilio account. Please verify the SID is correct." 
          });
        }

        // Update webhooks for voice and SMS
        await twilioClient.incomingPhoneNumbers(phoneSid).update({
          voiceUrl: `${baseUrl}/webhook/voice/kimi`,
          voiceMethod: 'POST',
          smsUrl: `${baseUrl}/webhook/sms`,
          smsMethod: 'POST',
          statusCallback: `${baseUrl}/webhook/status`,
          statusCallbackMethod: 'POST',
        });
      } catch (twilioError: any) {
        // Provide helpful error messages for common issues
        if (twilioError.code === 20404) {
          return res.status(404).json({ 
            error: "Phone number not found. Make sure the SID is correct and the number belongs to your Twilio account (not a sub-account)." 
          });
        }
        return res.status(400).json({ 
          error: `Failed to configure Twilio number: ${twilioError.message}` 
        });
      }

      // Update the agent with the phone number
      await storage.updateAgent(agentId, {
        phoneNumber,
        phoneSid,
      });

      res.json({ 
        success: true, 
        phoneNumber, 
        phoneSid,
        message: "Phone number linked and webhooks configured" 
      });
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

  // Auto-configure all phone numbers with Gateway Global AI webhooks
  app.post("/api/telephony/configure-webhooks", async (req, res) => {
    try {
      const baseUrl = req.body.baseUrl || 'https://twilio.gatewayglobal.ai';
      const numbers = await getIncomingPhoneNumbers();
      
      const results = [];
      for (const num of numbers) {
        try {
          await updatePhoneNumberWebhooks(num.sid, {
            voiceUrl: `${baseUrl}/webhook/voice`,
            smsUrl: `${baseUrl}/webhook/sms`,
            statusCallback: `${baseUrl}/webhook/voice/status`,
          });
          results.push({ 
            phoneNumber: num.phoneNumber, 
            success: true,
            voiceUrl: `${baseUrl}/webhook/voice`,
            smsUrl: `${baseUrl}/webhook/sms`
          });
        } catch (err: any) {
          results.push({ 
            phoneNumber: num.phoneNumber, 
            success: false, 
            error: err.message 
          });
        }
      }
      
      res.json({ 
        message: `Configured ${results.filter(r => r.success).length}/${numbers.length} phone numbers`,
        baseUrl,
        results 
      });
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

  // ===========================================
  // Gateway Global AI Twilio Provisioning API
  // ===========================================

  // Search available US numbers by area code
  app.get("/api/twilio/numbers/available", async (req, res) => {
    try {
      const areaCode = (req.query.areaCode as string || '').replace(/\D/g, '').slice(0, 3);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      
      if (!areaCode || areaCode.length !== 3) {
        return res.status(400).json({ error: "Valid 3-digit area code required" });
      }
      
      const numbers = await searchAvailableNumbers(areaCode, 'US');
      res.json({ 
        numbers: numbers.slice(0, limit).map(n => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          locality: n.locality,
          region: n.region
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List numbers already owned by the account
  app.get("/api/twilio/numbers", async (req, res) => {
    try {
      const numbers = await getIncomingPhoneNumbers();
      res.json({ 
        numbers: numbers.map(n => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          voiceUrl: n.voiceUrl || null,
          voiceFallbackUrl: n.voiceFallbackUrl || null,
          smsUrl: n.smsUrl || null,
          smsFallbackUrl: n.smsFallbackUrl || null,
          statusCallback: n.statusCallback || null
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buy a number (E.164 or 10-digit US)
  app.post("/api/twilio/numbers", async (req, res) => {
    try {
      const { phoneNumber, friendlyName } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "phoneNumber is required" });
      }
      
      // Normalize to E.164 if needed
      let normalizedNumber = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        normalizedNumber = '+1' + phoneNumber.replace(/\D/g, '');
      }
      
      // Default webhook URLs for Gateway Global AI
      const baseUrl = 'https://twilio.gatewayglobal.ai';
      const result = await provisionPhoneNumber(
        normalizedNumber,
        `${baseUrl}/webhook/voice`,
        `${baseUrl}/webhook/sms`
      );
      
      // Update with friendlyName if provided
      if (friendlyName) {
        await updateCallerIdName(result.sid, friendlyName);
      }
      
      res.json({
        sid: result.sid,
        phoneNumber: result.phoneNumber,
        friendlyName: friendlyName || 'AI Agent Trunk'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhooks for an owned number
  app.patch("/api/twilio/numbers/:phoneSid", async (req, res) => {
    try {
      const { phoneSid } = req.params;
      const { voiceUrl, voiceFallbackUrl, smsUrl, smsFallbackUrl, statusCallback, friendlyName } = req.body;
      
      // Update webhooks
      await updatePhoneNumberWebhooks(phoneSid, {
        voiceUrl: voiceUrl || undefined,
        voiceFallbackUrl: voiceFallbackUrl || undefined,
        smsUrl: smsUrl || undefined,
        smsFallbackUrl: smsFallbackUrl || undefined,
        statusCallback: statusCallback || undefined
      });
      
      // Update friendly name if provided
      if (friendlyName) {
        await updateCallerIdName(phoneSid, friendlyName);
      }
      
      // Fetch updated number details
      const numbers = await getIncomingPhoneNumbers();
      const updated = numbers.find(n => n.sid === phoneSid);
      
      if (!updated) {
        return res.status(404).json({ error: "Phone number not found" });
      }
      
      res.json({
        sid: updated.sid,
        phoneNumber: updated.phoneNumber,
        friendlyName: updated.friendlyName,
        voiceUrl: updated.voiceUrl || null,
        voiceFallbackUrl: updated.voiceFallbackUrl || null,
        smsUrl: updated.smsUrl || null,
        smsFallbackUrl: updated.smsFallbackUrl || null,
        statusCallback: updated.statusCallback || null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Release (delete) an owned number
  app.delete("/api/twilio/numbers/:phoneSid", async (req, res) => {
    try {
      const { phoneSid } = req.params;
      await releasePhoneNumber(phoneSid);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================================
  // Twilio Account Management API
  // ===========================================

  // Get account info
  app.get("/api/twilio/account", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      res.json({
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sub-accounts
  app.get("/api/twilio/subaccounts", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const accounts = await client.api.accounts.list({ limit: 50 });
      // Filter out the main account
      const subAccounts = accounts.filter((acc: any) => acc.sid !== process.env.TWILIO_ACCOUNT_SID);
      res.json(subAccounts.map((acc: any) => ({
        sid: acc.sid,
        friendlyName: acc.friendlyName,
        status: acc.status,
        dateCreated: acc.dateCreated,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create sub-account
  app.post("/api/twilio/subaccounts", async (req, res) => {
    try {
      const { friendlyName } = req.body;
      if (!friendlyName) {
        return res.status(400).json({ error: "friendlyName is required" });
      }
      const client = await getTwilioClient();
      const account = await client.api.accounts.create({ friendlyName });
      res.json({
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        dateCreated: account.dateCreated,
        authToken: account.authToken, // Only returned on creation
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update sub-account (suspend/close)
  app.patch("/api/twilio/subaccounts/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const { status } = req.body;
      if (!status || !['active', 'suspended', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Valid status required: active, suspended, or closed" });
      }
      const client = await getTwilioClient();
      const account = await client.api.accounts(sid).update({ status });
      res.json({
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get billing/balance info
  app.get("/api/twilio/billing", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const balance = await client.balance.fetch();
      
      // Get usage records for this month
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let callCount = 0;
      let smsCount = 0;
      let totalCost = 0;
      
      try {
        const usageRecords = await client.usage.records.thisMonth.list({ limit: 100 });
        for (const record of usageRecords) {
          if (record.category === 'calls') {
            callCount = parseInt(record.count) || 0;
            totalCost += parseFloat(record.price) || 0;
          } else if (record.category === 'sms') {
            smsCount = parseInt(record.count) || 0;
            totalCost += parseFloat(record.price) || 0;
          }
        }
      } catch (usageError) {
        console.log('Usage records not available:', usageError);
      }

      res.json({
        balance: balance.balance,
        currency: balance.currency,
        usageThisMonth: {
          calls: callCount,
          sms: smsCount,
          totalCost: totalCost.toFixed(2),
        }
      });
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

  // Test outbound call - makes a real call with a simple greeting
  app.post("/api/telephony/test/outbound", async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to) {
        return res.status(400).json({ error: "To phone number is required" });
      }
      
      const config = await storage.getTelephonyConfig();
      if (!config?.phoneNumber) {
        return res.status(400).json({ error: "No phone number provisioned. Please provision a number first." });
      }

      // Create a simple TwiML URL that speaks a message
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://twilio.gatewayglobal.ai';
      
      const greeting = encodeURIComponent(message || "Hello! This is a test call from Gateway Global AI. Your phone system is working correctly. Goodbye!");
      const twimlUrl = `${baseUrl}/api/twiml/test?message=${greeting}`;
      
      const result = await makeCall(to, twimlUrl, config.phoneNumber);
      
      // Log the test call
      await storage.createCallLog({
        callSid: result.sid,
        phoneNumber: to,
        direction: 'outbound',
        status: 'initiated',
        duration: 0,
      });
      
      res.json({ success: true, callSid: result.sid, message: "Test call initiated" });
    } catch (error: any) {
      console.error('Test outbound call error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML endpoint for test calls
  app.all("/api/twiml/test", (req, res) => {
    const message = req.query.message as string || "This is a test call from Gateway Global AI.";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${message}</Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`;
    res.type('text/xml').send(twiml);
  });

  // Test inbound call simulation - triggers webhook locally
  app.post("/api/telephony/test/inbound", async (req, res) => {
    try {
      const { from } = req.body;
      const testFrom = from || "+15550001234";
      
      const config = await storage.getTelephonyConfig();
      if (!config?.phoneNumber) {
        return res.status(400).json({ error: "No phone number provisioned. Please provision a number first." });
      }

      // Check firewall
      if (config.firewallEnabled) {
        const isAllowed = config.allowedNumbers?.some(n => n === testFrom);
        if (!isAllowed) {
          return res.json({ 
            success: false, 
            blocked: true, 
            message: `Call from ${testFrom} blocked by firewall - not in allowed list` 
          });
        }
      }

      // Simulate an inbound call log
      const testSid = `TEST${Date.now()}`;
      await storage.createCallLog({
        callSid: testSid,
        phoneNumber: testFrom,
        direction: 'inbound',
        status: 'completed',
        duration: Math.floor(Math.random() * 60) + 5,
      });

      res.json({ 
        success: true, 
        callSid: testSid, 
        message: `Simulated inbound call from ${testFrom} processed successfully` 
      });
    } catch (error: any) {
      console.error('Test inbound call error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook simulation - generates proper X-Twilio-Signature and calls webhook server
  app.post("/api/telephony/simulate-webhook", async (req, res) => {
    try {
      const { type, from, body, callStatus } = req.body;
      const webhookType = type || 'sms';
      const testFrom = from || '+15550001234';
      
      const config = await storage.getTelephonyConfig();
      if (!config?.phoneNumber) {
        return res.status(400).json({ error: "No phone number provisioned. Please provision a number first." });
      }
      
      // Get auth token - use config's authToken if available, otherwise use env
      const authToken = (config as any).authToken || process.env.TWILIO_AUTH_TOKEN;
      const accountSid = (config as any).accountSid || process.env.TWILIO_ACCOUNT_SID;
      
      if (!authToken) {
        return res.status(400).json({ error: "No auth token available for signature generation" });
      }
      
      // Build webhook URL and params based on type
      const webhookBaseUrl = 'https://twilio.gatewayglobal.ai';
      let webhookUrl: string;
      let params: Record<string, string>;
      
      if (webhookType === 'sms') {
        webhookUrl = `${webhookBaseUrl}/webhook/sms`;
        params = {
          MessageSid: `SM${Date.now()}`,
          AccountSid: accountSid || 'ACtest',
          From: testFrom,
          To: config.phoneNumber,
          Body: body || 'Test message from webhook simulator',
          NumMedia: '0',
        };
      } else if (webhookType === 'voice') {
        webhookUrl = `${webhookBaseUrl}/webhook/voice`;
        params = {
          CallSid: `CA${Date.now()}`,
          AccountSid: accountSid || 'ACtest',
          From: testFrom,
          To: config.phoneNumber,
          CallStatus: 'ringing',
          Direction: 'inbound',
          CallerName: 'Test Caller',
        };
      } else if (webhookType === 'status') {
        webhookUrl = `${webhookBaseUrl}/webhook/voice/status`;
        params = {
          CallSid: `CA${Date.now()}`,
          AccountSid: accountSid || 'ACtest',
          From: testFrom,
          To: config.phoneNumber,
          CallStatus: callStatus || 'completed',
          CallDuration: '30',
        };
      } else {
        return res.status(400).json({ error: "Invalid webhook type. Use 'sms', 'voice', or 'status'" });
      }
      
      // Generate X-Twilio-Signature using Twilio's method
      const signature = twilio.getExpectedTwilioSignature(
        authToken,
        webhookUrl,
        params
      );
      
      // Make the webhook request with proper signature
      const formBody = Object.entries(params)
        .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&');
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature,
        },
        body: formBody,
      });
      
      const responseText = await response.text();
      
      res.json({
        success: response.ok,
        webhookUrl,
        type: webhookType,
        status: response.status,
        signature: signature.substring(0, 20) + '...',
        response: responseText.substring(0, 500),
        params,
      });
    } catch (error: any) {
      console.error('Webhook simulation error:', error);
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

  // Twilio Sub-Accounts API
  // Helper to strip sensitive fields from sub-account responses
  const sanitizeSubAccount = (account: any) => {
    const { authToken, ...safe } = account;
    return { ...safe, hasAuthToken: !!authToken };
  };

  app.get("/api/twilio/sub-accounts", async (req, res) => {
    try {
      const accounts = await storage.getTwilioSubAccounts();
      // Strip authToken from responses - never expose credentials to client
      res.json(accounts.map(sanitizeSubAccount));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/twilio/sub-accounts", async (req, res) => {
    try {
      const { friendlyName, ownerEmail } = req.body;
      
      if (!friendlyName || typeof friendlyName !== 'string') {
        return res.status(400).json({ error: 'friendlyName is required' });
      }
      
      // Create sub-account via Twilio API
      const client = await getTwilioClient();
      const subAccount = await client.api.accounts.create({
        friendlyName: friendlyName || 'Gateway Sub-Account'
      });

      // Save to database
      const saved = await storage.createTwilioSubAccount({
        accountSid: subAccount.sid,
        authToken: subAccount.authToken,
        friendlyName: subAccount.friendlyName,
        status: subAccount.status,
        ownerEmail: ownerEmail || null,
      });

      // Return sanitized response without authToken
      res.json(sanitizeSubAccount(saved));
    } catch (error: any) {
      console.error('Error creating sub-account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/twilio/sub-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { friendlyName, ownerEmail, status } = req.body;
      
      // Only allow safe fields to be updated - never authToken/accountSid
      const allowedUpdates: any = {};
      if (friendlyName !== undefined) allowedUpdates.friendlyName = friendlyName;
      if (ownerEmail !== undefined) allowedUpdates.ownerEmail = ownerEmail;
      if (status !== undefined && ['active', 'suspended'].includes(status)) {
        allowedUpdates.status = status;
      }
      
      const updated = await storage.updateTwilioSubAccount(id, allowedUpdates);
      if (!updated) {
        return res.status(404).json({ error: "Sub-account not found" });
      }
      res.json(sanitizeSubAccount(updated));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/twilio/sub-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const account = await storage.getTwilioSubAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Sub-account not found" });
      }

      // Close sub-account in Twilio (sets to 'closed' status)
      try {
        const client = await getTwilioClient();
        await client.api.accounts(account.accountSid).update({ status: 'closed' });
      } catch (e) {
        console.log('Twilio sub-account close warning:', e);
      }

      await storage.deleteTwilioSubAccount(id);
      res.json({ success: true });
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
  app.post("/api/tasks/submit", async (req, res) => {
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
      
      // Parse task using Kimi (with partial mode)
      let parsedTask = null;
      try {
        const { parseTask } = await import("./kimi");
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
      
      // Send immediate SMS confirmation
      try {
        const { generateTaskUpdate } = await import("./kimi");
        
        const smsMessage = await generateTaskUpdate({
          agentName,
          taskDescription: task,
          hoursElapsed: 0,
          totalHours: 24,
          updateType: 'start',
        });
        
        // Send SMS via Twilio
        const config = await storage.getTelephonyConfig();
        if (config?.phoneNumber && config?.accountSid && config?.authToken) {
          const { sendSms } = await import("./twilio");
          await sendSms(e164Phone, smsMessage, config.phoneNumber);
          console.log(`[Task Submit] Sent initial SMS to ${e164Phone}`);
        } else {
          console.warn('[Task Submit] No Twilio config, skipping SMS');
        }
      } catch (smsError) {
        console.error('[Task Submit] SMS send error:', smsError);
      }
      
      res.json({ 
        success: true, 
        taskId: newTask.id,
        message: `Task created! ${agentName} will text you shortly.`
      });
      
    } catch (error: any) {
      console.error('[Task Submit] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task status (for optional dashboard)
  app.get("/api/tasks/:id", async (req, res) => {
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
  app.get("/api/tasks/phone/:phone", async (req, res) => {
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
  // PUBLIC AGENT CHAT API
  // ============================================

  // Simple in-memory rate limiting for public chat
  const chatRateLimits = new Map<string, { count: number; resetTime: number }>();
  const CHAT_RATE_LIMIT = 20; // requests per minute
  const CHAT_RATE_WINDOW = 60000; // 1 minute in ms

  app.post("/api/chat", async (req, res) => {
    try {
      // Rate limiting by IP
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const rateInfo = chatRateLimits.get(clientIp);
      
      if (rateInfo) {
        if (now > rateInfo.resetTime) {
          chatRateLimits.set(clientIp, { count: 1, resetTime: now + CHAT_RATE_WINDOW });
        } else if (rateInfo.count >= CHAT_RATE_LIMIT) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
          rateInfo.count++;
        }
      } else {
        chatRateLimits.set(clientIp, { count: 1, resetTime: now + CHAT_RATE_WINDOW });
      }

      // Validate request body with Zod
      const chatSchema = z.object({
        agentId: z.string().min(1),
        message: z.string().min(1).max(4000),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { agentId, message, history } = parsed.data;

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Build system prompt based on agent personality
      const discProfile = `D:${agent.dominance} I:${agent.influence} S:${agent.steadiness} C:${agent.conscientiousness}`;
      const systemPrompt = agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant with the following DISC personality profile: ${discProfile}. 
Be conversational, helpful, and maintain a consistent personality. Your voice style is ${agent.voiceName}.
Keep responses concise and engaging. If asked personal questions, you can share that you're an AI assistant named ${agent.name}.`;

      // Build conversation messages
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        })),
        { role: 'user' as const, content: message },
      ];

      const response = await chat({
        model: KIMI_MODELS.K2_TURBO,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
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
    // Skip validation in development or if explicitly disabled
    const skipValidation = process.env.SKIP_TWILIO_VALIDATION === 'true' || 
      process.env.NODE_ENV === 'development';
    
    if (skipValidation) {
      console.log('[Twilio Webhook] Skipping validation (development mode)');
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
      // Handle proxy scenarios - use x-forwarded-proto if available
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.get('host');
      const url = `${protocol}://${host}${req.originalUrl}`;
      
      console.log(`[Twilio Webhook] Validating URL: ${url}`);
      
      let isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
      
      // Try with https if http failed (common proxy issue)
      if (!isValid && protocol === 'http') {
        const httpsUrl = `https://${host}${req.originalUrl}`;
        console.log(`[Twilio Webhook] Retrying with HTTPS: ${httpsUrl}`);
        isValid = twilio.validateRequest(authToken, twilioSignature, httpsUrl, req.body);
      }
      
      if (!isValid) {
        console.warn('[Twilio Webhook] Invalid signature for all URL variants');
        return res.status(403).send('Forbidden');
      }
      
      next();
    } catch (error) {
      console.error('[Twilio Webhook] Validation error:', error);
      return res.status(403).send('Forbidden');
    }
  };

  // Inbound SMS webhook - receives SMS from Twilio with Caller ID lookup
  app.post("/webhook/sms", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body;
      
      console.log(`[SMS Webhook] From: ${From}, To: ${To}, Body: ${Body?.substring(0, 50)}...`);
      
      // ========== CALLER ID LOOKUP ==========
      // Look up caller in customer database to personalize the response
      const customer = await storage.getCustomerByPhone(From);
      let assignedAgent = null;
      let customerTasks: any[] = [];
      
      if (customer) {
        console.log(`[SMS Webhook] Caller ID matched: ${customer.name} (${customer.id})`);
        
        // Get their assigned agent
        if (customer.agentId) {
          assignedAgent = await storage.getAgent(customer.agentId);
          console.log(`[SMS Webhook] Assigned agent: ${assignedAgent?.name || 'Unknown'}`);
        }
        
        // Get their active tasks/projects
        customerTasks = await storage.getTasksByPhone(From);
        console.log(`[SMS Webhook] Customer has ${customerTasks.length} tasks`);
      } else {
        console.log(`[SMS Webhook] No customer match for: ${From}`);
      }
      
      // Find or create conversation for this phone number
      let conversation = await storage.getConversationByPhone(From);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          phoneNumber: From,
          customerId: customer?.id || null,
          agentId: customer?.agentId || null,
          lastMessageAt: new Date(),
        });
        
        console.log(`[SMS Webhook] Created new conversation: ${conversation.id}`);
      } else {
        // Update last message time and link to customer/agent if found
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
          customerId: customer?.id || conversation.customerId,
          agentId: customer?.agentId || conversation.agentId,
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
      
      // ========== BUILD CONTEXT FOR AI ==========
      // Build personalized context based on caller ID lookup
      const callerName = customer?.name || 'there';
      const agentName = assignedAgent?.name || 'Gateway';
      const agentPersonality = assignedAgent?.systemPrompt || 
        'You are a helpful AI assistant for Gateway Global. You help people complete tasks and stay updated on their progress.';
      
      // Build task context
      let taskContext = '';
      const activeTasks = customerTasks.filter(t => t.status !== 'completed' && t.status !== 'failed');
      if (activeTasks.length > 0) {
        taskContext = '\n\nActive projects/tasks for this customer:\n' + 
          activeTasks.map(t => `- ${t.task} (Status: ${t.status})`).join('\n');
      }
      
      // Build customer context
      let customerContext = '';
      if (customer) {
        customerContext = `\n\nYou are speaking with ${customer.name}`;
        if (customer.company) customerContext += ` from ${customer.company}`;
        if (customer.notes) customerContext += `\nNotes about this customer: ${customer.notes}`;
      }
      
      const fullPersonality = `${agentPersonality}${customerContext}${taskContext}\n\nAddress the customer by name when appropriate. Be warm, helpful, and reference their projects if relevant to the conversation.`;
      
      // Generate AI response using Kimi (primary) or Gemini (fallback)
      let responseText = `Hi ${callerName}! Thank you for your message. An agent will respond shortly.`;
      
      // Get conversation history for context
      const messages = await storage.getMessagesByConversation(conversation.id, 10);
      const history = messages.reverse().map(m => ({
        role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
        content: m.body || '',
      }));
      
      // Try Kimi first (preferred), fallback to Gemini
      if (process.env.MOONSHOT_API_KEY) {
        try {
          responseText = await generateSmsResponse({
            agentName: agentName,
            personality: fullPersonality,
            conversationHistory: history,
            userMessage: Body || '',
          });
          
          // Trim to SMS length
          if (responseText.length > 320) {
            responseText = responseText.substring(0, 317) + '...';
          }
          console.log('[SMS Webhook] Kimi response generated successfully');
        } catch (kimiError) {
          console.error('[SMS Webhook] Kimi error, trying Gemini fallback:', kimiError);
          
          // Fallback to Gemini
          if (process.env.GEMINI_API_KEY) {
            try {
              const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
              const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
              const historyText = history.map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`).join('\n');
              const prompt = `${fullPersonality}\n\nRespond to this SMS conversation naturally and helpfully. Keep responses under 160 characters for SMS.\n\nConversation history:\n${historyText}\n\nCustomer's latest message: ${Body}\n\nRespond as ${agentName}:`;
              const result = await model.generateContent(prompt);
              responseText = result.response.text() || responseText;
              if (responseText.length > 160) {
                responseText = responseText.substring(0, 157) + '...';
              }
            } catch (geminiError) {
              console.error('[SMS Webhook] Gemini fallback error:', geminiError);
            }
          }
        }
      } else if (process.env.GEMINI_API_KEY) {
        // No Kimi key, use Gemini directly
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const historyText = history.map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`).join('\n');
          const prompt = `${fullPersonality}\n\nRespond to this SMS conversation naturally and helpfully. Keep responses under 160 characters for SMS.\n\nConversation history:\n${historyText}\n\nCustomer's latest message: ${Body}\n\nRespond as ${agentName}:`;
          const result = await model.generateContent(prompt);
          responseText = result.response.text() || responseText;
          if (responseText.length > 160) {
            responseText = responseText.substring(0, 157) + '...';
          }
        } catch (geminiError) {
          console.error('[SMS Webhook] Gemini error:', geminiError);
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

  // Kimi-Audio enhanced voice webhook - uses Media Streams for real-time AI voice
  app.post("/webhook/voice/kimi", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;
      
      console.log(`[Kimi Voice] From: ${From}, To: ${To}, Status: ${CallStatus}`);
      
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
      
      // Check firewall
      const allowedNumbers = config?.allowedNumbers || [];
      if (config?.firewallEnabled && allowedNumbers.length > 0) {
        const isAllowed = allowedNumbers.some(num => 
          From.includes(num) || num.includes(From.slice(-10))
        );
        
        if (!isAllowed) {
          console.log(`[Kimi Voice] Blocked caller: ${From}`);
          res.set('Content-Type', 'text/xml');
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Sorry, this number is not authorized.</Say>
  <Hangup/>
</Response>`);
        }
      }
      
      // Build WebSocket URL for Media Streams
      const host = process.env.REPLIT_DEV_DOMAIN || 
        (process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'localhost:5000');
      const wsProtocol = host.includes('localhost') ? 'ws' : 'wss';
      const streamUrl = `${wsProtocol}://${host}/ws/voice-stream`;
      
      console.log(`[Kimi Voice] Stream URL: ${streamUrl}`);
      
      // Return TwiML with Media Streams
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Welcome to Gateway Global AI. I'm connecting you to Kimi, our AI assistant.</Say>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="agentName" value="Kimi"/>
      <Parameter name="personality" value="helpful"/>
    </Stream>
  </Connect>
  <Say voice="Google.en-US-Neural2-F">The conversation has ended. Goodbye!</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Kimi Voice] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Sorry, we encountered an error. Please try again later.</Say>
  <Hangup/>
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
      
      // Generate AI response using Kimi (primary) or Gemini (fallback)
      if (SpeechResult) {
        if (process.env.MOONSHOT_API_KEY) {
          try {
            responseText = await chat({
              model: KIMI_MODELS.K2_TURBO,
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful AI phone assistant for Gateway Global. Respond naturally and conversationally. Keep your response under 100 words for phone readability. No markdown, no bullet points.',
                },
                {
                  role: 'user',
                  content: SpeechResult,
                },
              ],
              temperature: 0.7,
              max_tokens: 300,
            });
            console.log('[Voice Gather] Kimi response generated successfully');
          } catch (kimiError) {
            console.error('[Voice Gather] Kimi error, trying Gemini fallback:', kimiError);
            
            // Fallback to Gemini
            if (process.env.GEMINI_API_KEY) {
              try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a helpful AI phone assistant for Gateway Global. Respond naturally to this caller's request. Keep your response under 200 words for phone readability.\n\nCaller said: "${SpeechResult}"\n\nRespond helpfully:`;
                const result = await model.generateContent(prompt);
                responseText = result.response.text() || responseText;
              } catch (geminiError) {
                console.error('[Voice Gather] Gemini fallback error:', geminiError);
              }
            }
          }
        } else if (process.env.GEMINI_API_KEY) {
          try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const prompt = `You are a helpful AI phone assistant for Gateway Global. Respond naturally to this caller's request. Keep your response under 200 words for phone readability.\n\nCaller said: "${SpeechResult}"\n\nRespond helpfully:`;
            const result = await model.generateContent(prompt);
            responseText = result.response.text() || responseText;
          } catch (geminiError) {
            console.error('[Voice Gather] Gemini error:', geminiError);
          }
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
