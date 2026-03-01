import { Router, type Request, type Response } from "express";
import twilio from "twilio";
import { storage } from "../storage";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatewayChat } from "../ai-gateway";
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
  getTwilioClient,
  createSubAccountAndProvisionNumber,
} from "../twilio";
import {
  insertTelephonyConfigSchema,
  insertCallLogSchema,
  telephonyConfigs,
  callLogs,
  smsConversations,
  smsMessages,
  smsLogs,
  smsOptOuts,
  type TelephonyConfig,
} from "@shared/schema";
import {
  hasEnergyBalance,
  logVoiceUsage,
  getEnergyBalance,
  getVoiceUsageLogs,
} from "../services/energy-monitor";
import { buildRichSystemInstruction } from "../services/systemInstructionBuilder";

const router = Router();

// ── Local schemas (extracted from routes.ts module scope) ─────────────────────
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

// ── Telephony Config & Number Management ─────────────────────────────────────

  router.get("/api/telephony/config", async (req, res) => {
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

  // Update telephony config by ID
  router.patch("/api/telephony/config/:id", async (req, res) => {
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

  // Update telephony config (singleton - auto-get or create config first)
  router.patch("/api/telephony/config", async (req, res) => {
    try {
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // Get or create the singleton config
      let existingConfig = await storage.getTelephonyConfig();
      if (!existingConfig) {
        existingConfig = await storage.createTelephonyConfig({
          phoneNumber: null,
          firewallEnabled: true,
          allowedNumbers: [],
          maxCallDuration: 60,
          timeout: 30,
          friendlyName: "AI Agent Trunk",
        });
      }
      
      const config = await storage.updateTelephonyConfig(existingConfig.id, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  async function requireActiveSubscription(): Promise<{ allowed: boolean; error?: string }> {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        return { allowed: true };
      }

      return {
        allowed: false,
        error: "A paid subscription is required to search for or provision phone numbers. Please subscribe to a plan first at the Billing page.",
      };
    } catch (err: any) {
      return {
        allowed: false,
        error: "Unable to verify subscription status. Please ensure you have an active paid plan before requesting phone numbers.",
      };
    }
  }

  // Search available phone numbers
  router.get("/api/telephony/numbers/search", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

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
  router.post("/api/telephony/numbers/provision", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

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
  router.post("/api/telephony/numbers/existing", async (req, res) => {
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
      
      const baseUrl = process.env.WEBHOOK_BASE_URL ||
        (req.get('host') ? `https://${req.get('host')}` : 'https://twilio.gatewayglobal.ai');
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
  router.post("/api/telephony/numbers/release", async (req, res) => {
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
  router.post("/api/telephony/numbers/link", async (req, res) => {
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
          voiceUrl: `${baseUrl}/webhook/voice/stream`,
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
  router.patch("/api/telephony/webhooks", async (req, res) => {
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
  router.get("/api/telephony/numbers", async (req, res) => {
    try {
      const numbers = await getIncomingPhoneNumbers();
      res.json(numbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-configure all phone numbers with Gateway Global AI webhooks
  router.post("/api/telephony/configure-webhooks", async (req, res) => {
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
  router.get("/api/telephony/default-number", async (req, res) => {
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
  router.get("/api/twilio/numbers/available", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

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
  router.get("/api/twilio/numbers", async (req, res) => {
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
          statusCallback: n.statusCallback || null,
          capabilities: {
            voice: n.capabilities?.voice ?? true,
            sms: n.capabilities?.sms ?? true,
            mms: n.capabilities?.mms ?? false,
          },
          dateCreated: n.dateCreated || new Date().toISOString(),
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buy a number (E.164 or 10-digit US)
  router.post("/api/twilio/numbers", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

      const { phoneNumber, friendlyName, messagingServiceSid } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "phoneNumber is required" });
      }
      
      // Normalize to E.164 if needed
      let normalizedNumber = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        normalizedNumber = '+1' + phoneNumber.replace(/\D/g, '');
      }
      
      // Use current domain for webhook URLs (auto-detected)
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const baseUrl = `https://${currentDomain}`;
      
      const result = await provisionPhoneNumber(
        normalizedNumber,
        `${baseUrl}/webhook/voice/stream`,
        `${baseUrl}/webhook/sms`
      );
      
      // Auto-configure ALL webhook URLs including status callbacks
      const client = await getTwilioClient();
      await client.incomingPhoneNumbers(result.sid).update({
        voiceUrl: `${baseUrl}/webhook/voice/stream`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${baseUrl}/webhook/voice`,
        voiceFallbackMethod: 'POST',
        smsUrl: `${baseUrl}/webhook/sms`,
        smsMethod: 'POST',
        smsFallbackUrl: `${baseUrl}/webhook/sms`,
        smsFallbackMethod: 'POST',
        statusCallback: `${baseUrl}/webhook/voice/status`,
        statusCallbackMethod: 'POST',
        smsStatusCallback: `${baseUrl}/webhook/sms/status`
      });
      
      // Update with friendlyName if provided
      if (friendlyName) {
        await updateCallerIdName(result.sid, friendlyName);
      }
      
      // Add to Customer Care Messaging Service if specified or use default
      const targetMsgService = messagingServiceSid || 'MGd16163508f2fcc1236a989f83664d9fb';
      try {
        await client.messaging.v1.services(targetMsgService)
          .phoneNumbers
          .create({ phoneNumberSid: result.sid });
        console.log(`[Phone Setup] Added ${normalizedNumber} to Messaging Service ${targetMsgService}`);
      } catch (msErr: any) {
        console.warn(`[Phone Setup] Could not add to Messaging Service: ${msErr.message}`);
      }
      
      res.json({
        sid: result.sid,
        phoneNumber: result.phoneNumber,
        friendlyName: friendlyName || 'AI Agent Trunk',
        webhooksConfigured: true,
        baseUrl,
        messagingServiceSid: targetMsgService
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhooks for an owned number
  router.patch("/api/twilio/numbers/:phoneSid", async (req, res) => {
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
  router.delete("/api/twilio/numbers/:phoneSid", async (req, res) => {
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
  router.get("/api/twilio/account", async (req, res) => {
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
  router.get("/api/twilio/subaccounts", async (req, res) => {
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
  router.post("/api/twilio/subaccounts", async (req, res) => {
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
  router.patch("/api/twilio/subaccounts/:sid", async (req, res) => {
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
  router.get("/api/twilio/billing", async (req, res) => {
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

  // TwiML Apps - List all
  router.get("/api/twilio/twiml-apps", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const apps = await client.applications.list({ limit: 20 });
      res.json({
        apps: apps.map((app: any) => ({
          sid: app.sid,
          friendlyName: app.friendlyName,
          voiceUrl: app.voiceUrl,
          voiceMethod: app.voiceMethod,
          voiceFallbackUrl: app.voiceFallbackUrl,
          smsUrl: app.smsUrl,
          smsMethod: app.smsMethod,
          smsFallbackUrl: app.smsFallbackUrl,
          statusCallback: app.statusCallback,
          dateCreated: app.dateCreated,
          dateUpdated: app.dateUpdated
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML Apps - Update webhook URLs
  router.patch("/api/twilio/twiml-apps/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const { voiceUrl, smsUrl, voiceFallbackUrl, smsFallbackUrl, statusCallback } = req.body;
      const client = await getTwilioClient();
      
      const updateData: any = {};
      if (voiceUrl !== undefined) updateData.voiceUrl = voiceUrl;
      if (smsUrl !== undefined) updateData.smsUrl = smsUrl;
      if (voiceFallbackUrl !== undefined) updateData.voiceFallbackUrl = voiceFallbackUrl;
      if (smsFallbackUrl !== undefined) updateData.smsFallbackUrl = smsFallbackUrl;
      if (statusCallback !== undefined) updateData.statusCallback = statusCallback;
      
      const app = await client.applications(sid).update(updateData);
      
      res.json({
        success: true,
        app: {
          sid: app.sid,
          friendlyName: app.friendlyName,
          voiceUrl: app.voiceUrl,
          smsUrl: app.smsUrl,
          voiceFallbackUrl: app.voiceFallbackUrl,
          smsFallbackUrl: app.smsFallbackUrl,
          statusCallback: app.statusCallback
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML Apps - Auto-fix all apps to use current domain
  router.post("/api/twilio/twiml-apps/auto-fix", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const apps = await client.applications.list({ limit: 20 });
      
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const baseUrl = `https://${currentDomain}`;
      
      const results: any[] = [];
      
      for (const app of apps) {
        const updates: any = {};
        let needsUpdate = false;
        
        // Check if URLs are outdated (not pointing to current domain)
        if (app.voiceUrl && !app.voiceUrl.includes(currentDomain)) {
          // Preserve the path, just update the domain
          const voicePath = new URL(app.voiceUrl).pathname;
          updates.voiceUrl = `${baseUrl}${voicePath}`;
          needsUpdate = true;
        }
        
        if (app.smsUrl && !app.smsUrl.includes(currentDomain)) {
          const smsPath = new URL(app.smsUrl).pathname;
          updates.smsUrl = `${baseUrl}${smsPath}`;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await client.applications(app.sid).update(updates);
          results.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: true,
            updates
          });
        } else {
          results.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: false,
            reason: 'Already up to date'
          });
        }
      }
      
      res.json({
        success: true,
        currentDomain,
        baseUrl,
        fixedCount: results.filter(r => r.fixed).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Messaging Services Health Check
  router.get("/api/twilio/messaging-services/health", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const services = await client.messaging.v1.services.list({ limit: 20 });
      
      const results = await Promise.all(services.map(async (svc: any) => {
        const issues: string[] = [];
        const warnings: string[] = [];
        
        // Check inbound webhook
        if (!svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber) {
          issues.push('No inbound webhook URL and useInboundWebhookOnNumber is false');
        } else if (!svc.inboundRequestUrl && svc.useInboundWebhookOnNumber) {
          warnings.push('No service-level inbound URL, using phone number webhooks');
        }
        
        // Check fallback
        if (!svc.fallbackUrl) {
          warnings.push('No fallback URL configured');
        }
        
        // Check status callback
        if (!svc.statusCallback) {
          warnings.push('No status callback configured');
        }
        
        // Test webhook reachability if URL exists
        let webhookStatus = null;
        if (svc.inboundRequestUrl) {
          try {
            const response = await fetch(svc.inboundRequestUrl, {
              method: svc.inboundMethod || 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: 'From=%2B15551234567&To=%2B15559876543&Body=HealthCheck&MessageSid=SMtest123'
            });
            webhookStatus = { reachable: true, status: response.status };
            if (response.status === 404) {
              issues.push('Webhook returns 404 Not Found');
            } else if (response.status >= 400) {
              issues.push(`Webhook returns error status ${response.status}`);
            }
          } catch (err: any) {
            webhookStatus = { reachable: false, error: err.message };
            issues.push(`Webhook unreachable: ${err.message}`);
          }
        }
        
        // Get phone numbers in service
        let phoneNumbers: string[] = [];
        try {
          const pns = await client.messaging.v1.services(svc.sid).phoneNumbers.list({ limit: 10 });
          phoneNumbers = pns.map((pn: any) => pn.phoneNumber);
        } catch (e) {}
        
        return {
          sid: svc.sid,
          friendlyName: svc.friendlyName,
          inboundRequestUrl: svc.inboundRequestUrl,
          inboundMethod: svc.inboundMethod,
          fallbackUrl: svc.fallbackUrl,
          fallbackMethod: svc.fallbackMethod,
          statusCallback: svc.statusCallback,
          useInboundWebhookOnNumber: svc.useInboundWebhookOnNumber,
          phoneNumbers,
          webhookStatus,
          issues,
          warnings,
          healthy: issues.length === 0
        };
      }));
      
      const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
      const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
      
      res.json({
        timestamp: new Date().toISOString(),
        servicesCount: services.length,
        totalIssues,
        totalWarnings,
        allHealthy: totalIssues === 0,
        services: results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Messaging Service webhooks (auto-fix)
  router.patch("/api/twilio/messaging-services/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const { inboundRequestUrl, inboundMethod, fallbackUrl, fallbackMethod, statusCallback, useInboundWebhookOnNumber } = req.body;
      
      const client = await getTwilioClient();
      
      const updateData: any = {};
      if (inboundRequestUrl !== undefined) updateData.inboundRequestUrl = inboundRequestUrl;
      if (inboundMethod !== undefined) updateData.inboundMethod = inboundMethod;
      if (fallbackUrl !== undefined) updateData.fallbackUrl = fallbackUrl;
      if (fallbackMethod !== undefined) updateData.fallbackMethod = fallbackMethod;
      if (statusCallback !== undefined) updateData.statusCallback = statusCallback;
      if (useInboundWebhookOnNumber !== undefined) updateData.useInboundWebhookOnNumber = useInboundWebhookOnNumber;
      
      const updated = await client.messaging.v1.services(sid).update(updateData);
      
      res.json({
        success: true,
        sid: updated.sid,
        friendlyName: updated.friendlyName,
        inboundRequestUrl: updated.inboundRequestUrl,
        fallbackUrl: updated.fallbackUrl,
        statusCallback: updated.statusCallback
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // UNIFIED FIX: Update ALL Twilio webhooks to current domain
  router.post("/api/twilio/fix-all-webhooks", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const baseUrl = `https://${currentDomain}`;
      
      const smsWebhookUrl = `${baseUrl}/webhook/sms`;
      const smsStatusCallbackUrl = `${baseUrl}/webhook/sms/status`;
      const voiceWebhookUrl = `${baseUrl}/webhook/voice/stream`;
      const voiceFallbackUrl = `${baseUrl}/webhook/voice`;
      const voiceStatusCallbackUrl = `${baseUrl}/webhook/voice/status`;
      
      const results: any = {
        domain: currentDomain,
        baseUrl,
        messagingServices: [],
        twimlApps: [],
        phoneNumbers: []
      };
      
      // 1. Fix ALL Messaging Services using SDK properly
      console.log('[Webhook Fix] Updating Messaging Services...');
      const services = await client.messaging.v1.services.list({ limit: 20 });
      for (const svc of services) {
        try {
          // Update using the Twilio SDK as documented
          const updated = await client.messaging.v1.services(svc.sid).update({
            inboundRequestUrl: smsWebhookUrl,
            inboundMethod: 'POST',
            fallbackUrl: smsWebhookUrl,
            fallbackMethod: 'POST',
            statusCallback: smsStatusCallbackUrl
          });
          results.messagingServices.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: true,
            inboundRequestUrl: updated.inboundRequestUrl
          });
        } catch (err: any) {
          results.messagingServices.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: false,
            error: err.message
          });
        }
      }
      
      // 2. Fix ALL TwiML Apps
      console.log('[Webhook Fix] Updating TwiML Apps...');
      const apps = await client.applications.list({ limit: 20 });
      for (const app of apps) {
        try {
          const updated = await client.applications(app.sid).update({
            voiceUrl: voiceWebhookUrl,
            voiceMethod: 'POST',
            voiceFallbackUrl: voiceFallbackUrl,
            voiceFallbackMethod: 'POST',
            smsUrl: smsWebhookUrl,
            smsMethod: 'POST',
            smsFallbackUrl: smsWebhookUrl,
            smsFallbackMethod: 'POST'
          });
          results.twimlApps.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: true,
            voiceUrl: updated.voiceUrl,
            smsUrl: updated.smsUrl
          });
        } catch (err: any) {
          results.twimlApps.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: false,
            error: err.message
          });
        }
      }
      
      // 3. Fix ALL Phone Numbers
      console.log('[Webhook Fix] Updating Phone Numbers...');
      const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
      for (const num of numbers) {
        try {
          const updated = await client.incomingPhoneNumbers(num.sid).update({
            voiceUrl: voiceWebhookUrl,
            voiceMethod: 'POST',
            voiceFallbackUrl: voiceFallbackUrl,
            voiceFallbackMethod: 'POST',
            statusCallback: voiceStatusCallbackUrl,
            statusCallbackMethod: 'POST',
            smsUrl: smsWebhookUrl,
            smsMethod: 'POST',
            smsFallbackUrl: smsWebhookUrl,
            smsFallbackMethod: 'POST'
          });
          results.phoneNumbers.push({
            sid: num.sid,
            phoneNumber: num.phoneNumber,
            fixed: true,
            voiceUrl: updated.voiceUrl,
            smsUrl: updated.smsUrl
          });
        } catch (err: any) {
          results.phoneNumbers.push({
            sid: num.sid,
            phoneNumber: num.phoneNumber,
            fixed: false,
            error: err.message
          });
        }
      }
      
      const totalFixed = 
        results.messagingServices.filter((r: any) => r.fixed).length +
        results.twimlApps.filter((r: any) => r.fixed).length +
        results.phoneNumbers.filter((r: any) => r.fixed).length;
      
      console.log(`[Webhook Fix] Complete! Fixed ${totalFixed} configurations.`);
      
      res.json({
        success: true,
        summary: {
          messagingServicesFixed: results.messagingServices.filter((r: any) => r.fixed).length,
          twimlAppsFixed: results.twimlApps.filter((r: any) => r.fixed).length,
          phoneNumbersFixed: results.phoneNumbers.filter((r: any) => r.fixed).length,
          totalFixed
        },
        webhookUrls: {
          sms: smsWebhookUrl,
          voice: voiceWebhookUrl,
          voiceFallback: voiceFallbackUrl
        },
        details: results
      });
    } catch (error: any) {
      console.error('[Webhook Fix] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-fix all messaging services with current domain (legacy)
  router.post("/api/twilio/messaging-services/auto-fix", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const services = await client.messaging.v1.services.list({ limit: 20 });
      
      // Get current domain from request
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;
      
      const results = [];
      
      for (const svc of services) {
        // Fix ALL services, not just empty ones
        try {
          const updated = await client.messaging.v1.services(svc.sid).update({
            inboundRequestUrl: `${baseUrl}/webhook/sms`,
            inboundMethod: 'POST',
            fallbackUrl: `${baseUrl}/webhook/sms`,
            fallbackMethod: 'POST'
          });
          results.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: true,
            newInboundUrl: updated.inboundRequestUrl
          });
        } catch (err: any) {
          results.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: false,
            error: err.message
          });
        }
      }
      
      res.json({
        success: true,
        baseUrl,
        fixedCount: results.filter(r => r.fixed).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy endpoint kept for backward compatibility
  router.post("/api/twilio/messaging-services/auto-fix-legacy", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const services = await client.messaging.v1.services.list({ limit: 20 });
      
      // Get current domain from request
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;
      
      const results = [];
      
      for (const svc of services) {
        // Only fix services that have no inbound URL and useInboundWebhookOnNumber is false
        if (!svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber) {
          try {
            const updated = await client.messaging.v1.services(svc.sid).update({
              inboundRequestUrl: `${baseUrl}/webhook/sms`,
              inboundMethod: 'POST',
              fallbackUrl: `${baseUrl}/webhook/sms`,
              fallbackMethod: 'POST'
            });
            results.push({
              sid: svc.sid,
              friendlyName: svc.friendlyName,
              fixed: true,
              newInboundUrl: updated.inboundRequestUrl
            });
          } catch (err: any) {
            results.push({
              sid: svc.sid,
              friendlyName: svc.friendlyName,
              fixed: false,
              error: err.message
            });
          }
        } else {
          results.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: false,
            reason: 'Already configured or using phone number webhooks'
          });
        }
      }
      
      res.json({
        baseUrl,
        results,
        fixedCount: results.filter(r => r.fixed).length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send SMS
  router.post("/api/telephony/sms/send", async (req, res) => {
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
  router.post("/api/telephony/calls/make", async (req, res) => {
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
  router.post("/api/telephony/test/outbound", async (req, res) => {
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
  router.post("/api/telephony/test/inbound", async (req, res) => {
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
  router.post("/api/telephony/simulate-webhook", async (req, res) => {
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
      // Use the published app URL or dev domain, NOT the old hardcoded domain
      const webhookBaseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'http://localhost:5000';
      
      console.log(`[Webhook Simulation] Using base URL: ${webhookBaseUrl}`);
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
  router.get("/api/telephony/calls", async (req, res) => {
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
  router.get("/api/telephony/messages", async (req, res) => {
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
  router.get("/api/telephony/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create local call log
  router.post("/api/telephony/logs", async (req, res) => {
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

  // Update call log with notes and customer info
  router.patch("/api/telephony/calls/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        notes: z.string().optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const updated = await storage.updateCallLog(req.params.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: "Call log not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unified call tracking endpoint - combines database logs
  router.get("/api/call-tracking", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update caller ID
  router.patch("/api/telephony/caller-id", async (req, res) => {
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
  router.patch("/api/telephony/firewall", async (req, res) => {
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

  router.get("/api/twilio/sub-accounts", async (req, res) => {
    try {
      const accounts = await storage.getTwilioSubAccounts();
      // Strip authToken from responses - never expose credentials to client
      res.json(accounts.map(sanitizeSubAccount));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/twilio/sub-accounts", async (req, res) => {
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

  router.patch("/api/twilio/sub-accounts/:id", async (req, res) => {
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

  router.delete("/api/twilio/sub-accounts/:id", async (req, res) => {
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
  router.post("/api/webhooks/voice", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/voice - Please update Twilio config to use /webhook/voice');
    res.redirect(307, '/webhook/voice');
  });

  router.post("/api/webhooks/voice/recording", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/voice/recording - deprecated');
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  });

  router.post("/api/webhooks/sms", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/sms - Please update Twilio config to use /webhook/sms');
    res.redirect(307, '/webhook/sms');
  });

  // Status callback handler
  router.post("/api/webhooks/status", async (req, res) => {
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

        // Log energy usage for completed calls
        if (CallStatus === 'completed') {
          try {
            const siteConfigId = (config as any).siteConfigId ?? config.id;
            await logVoiceUsage({
              siteConfigId,
              callSid: CallSid,
              callType: 'phone',
              rawDurationSeconds: parseInt(CallDuration ?? '0', 10) || 0,
            });
          } catch (usageErr: any) {
            console.error('[Energy] Failed to log voice usage:', usageErr.message);
          }
        }
      }
    } catch (error) {
      console.error('Error logging call status:', error);
    }
    
    res.sendStatus(200);
  });


// ── TTS / Google Cloud Text-to-Speech ────────────────────────────────────────

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
  router.get("/api/tts/voices", async (req, res) => {
    res.json({ voices: GEMINI_TTS_VOICES });
  });

  // Synthesize speech using Gemini TTS
  router.post("/api/tts/synthesize", async (req, res) => {
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
  router.post("/webhook/sms", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body;
      
      console.log(`[SMS Webhook] From: ${From}, To: ${To}, Body: ${Body?.substring(0, 50)}...`);
      
      // ========== AI BIZ BOT - Business Owner SMS Commands ==========
      const bodyLower = (Body || '').toLowerCase().trim();
      
      // Business owner commands for website/business management
      const bizBotKeywords = ['visitors', 'how many visitors', 'traffic', 'reviews', 'bad reviews', 'update hours', 
        'change hours', 'my website', 'website stats', 'check website', 'new reviews', 'schedule', 'calendar',
        'add task', 'create task', 'my tasks', 'create event', 'schedule meeting',
        'report', 'area report', 'business report', 'competitors', 'competition', 'nearby businesses',
        'search ', 'market '];
      const isBizBotCommand = bizBotKeywords.some(kw => bodyLower.includes(kw));
      
      if (isBizBotCommand) {
        console.log(`[SMS Biz Bot] Detected business command from: ${From}`);
        
        try {
          // Check if this phone is registered as a business owner
          const customer = await storage.getCustomerByPhone(From);
          
          let responseText = '';
          
          // Handle specific commands - MVP demo mode with sample data
          // TODO: Integrate with real analytics, Google Workspace tools, and business data
          if (bodyLower.includes('visitors') || bodyLower.includes('traffic') || bodyLower.includes('website stats')) {
            responseText = '📊 Website Stats (Last 24h) [Demo]\n\n' +
              '👥 Visitors: 142\n' +
              '💬 Chat conversations: 12\n' +
              '📞 Calls handled: 3\n' +
              '⭐ New reviews: 2\n\n' +
              'Reply "reviews" to see new reviews.';
          } else if (bodyLower.includes('bad reviews') || bodyLower.includes('negative')) {
            responseText = '⚠️ Recent Low Reviews\n\n' +
              '⭐⭐ "Service was slow" - John D. (2 days ago)\n\n' +
              'Reply "respond [your message]" to reply to this review.';
          } else if (bodyLower.includes('reviews') || bodyLower.includes('new reviews')) {
            responseText = '⭐ Recent Reviews\n\n' +
              '⭐⭐⭐⭐⭐ "Great service!" - Sarah M.\n' +
              '⭐⭐⭐⭐ "Good food, nice atmosphere" - Mike T.\n' +
              '⭐⭐ "Service was slow" - John D.\n\n' +
              'Reply "bad" to filter low ratings.';
          } else if (bodyLower.includes('update hours') || bodyLower.includes('change hours')) {
            // Parse hours from message if provided
            const hoursMatch = Body.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
            if (hoursMatch) {
              responseText = `✅ Hours Updated!\n\nNew hours: ${hoursMatch[1]} - ${hoursMatch[2]}\n\nYour website now shows the updated hours.`;
            } else {
              responseText = '⏰ Update Hours\n\nTo update, reply with the new hours like:\n"Update hours 9am to 9pm"';
            }
          } else if (bodyLower.includes('schedule') || bodyLower.includes('calendar') || bodyLower.includes('create event')) {
            // Check if Google Workspace is connected for this business
            const businessId = customer?.id || 'default';
            const credentials = googleWorkspaceCredentials.get(businessId);
            
            if (credentials) {
              // Parse event details from message
              responseText = '📅 To schedule an event, reply with:\n"Schedule [title] on [date] at [time]"\n\nExample: "Schedule Team Meeting on Monday at 3pm"';
            } else {
              responseText = '📅 Google Calendar not connected.\n\nVisit your admin panel to connect Google Workspace for calendar, tasks, and docs integration.';
            }
          } else if (bodyLower.includes('add task') || bodyLower.includes('create task') || bodyLower.includes('my tasks')) {
            if (bodyLower.includes('my tasks')) {
              responseText = '📋 Your Tasks\n\n' +
                '☐ Follow up with vendor\n' +
                '☐ Review monthly reports\n' +
                '☐ Update menu prices\n\n' +
                'Reply "add task [description]" to add new.';
            } else {
              // Parse task from message
              const taskMatch = Body.match(/(?:add task|create task)\s+(.+)/i);
              if (taskMatch) {
                responseText = `✅ Task Added: "${taskMatch[1]}"\n\nYou can view all tasks by replying "my tasks".`;
              } else {
                responseText = '📋 Add Task\n\nReply with "add task [description]"\n\nExample: "add task Call supplier about delivery"';
              }
            }
          } else if (bodyLower.includes('report') || bodyLower.includes('competitors') || bodyLower.includes('competition') || bodyLower.includes('nearby businesses') || bodyLower.startsWith('search ') || bodyLower.startsWith('market ')) {
            if (!process.env.GOOGLE_CLOUD_API_KEY) {
              responseText = 'Area Reports are not available yet. API key needs to be configured by an administrator.';
            } else {
              const customerPlace = process.env.CUSTOMER_PLACE;
              const isMarketingSearch = bodyLower.startsWith('search ') || bodyLower.startsWith('market ');

              if (isMarketingSearch) {
                const searchBody = Body.replace(/^(search|market)\s*/i, '').trim();
                const categoryMatch = searchBody.match(/^(\w[\w\s]*?)\s+(?:near|in|at|around)\s+(.+?)(?:\s+(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?|km))?(?:\s+(\d(?:\.\d)?)-(\d(?:\.\d)?)\s*stars?)?$/i);
                const simpleMatch = searchBody.match(/^(\w[\w\s]*?)\s+(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?)?$/i);

                if (categoryMatch) {
                  const [, cat, location, radiusStr, minR, maxR] = categoryMatch;
                  const category = cat.trim().replace(/\s+/g, '_').toLowerCase();
                  try {
                    const report = await generateMarketingSearch({
                      mode: 'marketing',
                      address: location.trim(),
                      category,
                      radiusMiles: radiusStr ? parseFloat(radiusStr) : undefined,
                      minRating: minR ? parseFloat(minR) : undefined,
                      maxRating: maxR ? parseFloat(maxR) : undefined
                    });
                    responseText = formatMarketingReportForSms(report);
                  } catch (searchErr: any) {
                    console.error('[SMS Biz Bot] Marketing search error:', searchErr.message);
                    responseText = `Search failed: ${searchErr.message}`;
                  }
                } else if (simpleMatch) {
                  const [, cat, radiusStr] = simpleMatch;
                  const category = cat.trim().replace(/\s+/g, '_').toLowerCase();
                  if (!customerPlace) {
                    responseText = 'No default business set. Use:\n"search [category] near [location]"\n\nExample: "search restaurant near Lafayette LA"';
                  } else {
                    try {
                      const report = await generateMarketingSearch({
                        mode: 'marketing',
                        address: customerPlace,
                        category,
                        radiusMiles: parseFloat(radiusStr)
                      });
                      responseText = formatMarketingReportForSms(report);
                    } catch (searchErr: any) {
                      responseText = `Search failed: ${searchErr.message}`;
                    }
                  }
                } else {
                  responseText = 'Marketing Search\n\nFormats:\n' +
                    '"search [category] near [location]"\n' +
                    '"search [category] near [location] [miles]mi"\n' +
                    '"search [category] near [location] [miles]mi [min]-[max] stars"\n\n' +
                    'Examples:\n' +
                    '"search restaurant near Lafayette LA"\n' +
                    '"search cafe near 123 Main St 5mi"\n' +
                    '"search lodging near Lafayette LA 2mi 4-5 stars"';
                }
              } else {
                const bodyAfterReport = Body.replace(/^(report|competitors|competition|nearby businesses)\s*/i, '').trim();
                const radiusMatch = bodyAfterReport.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?|km)?$/i);
                let searchName: string | undefined;
                let radiusMiles: number | undefined;

                if (radiusMatch) {
                  searchName = radiusMatch[1].trim();
                  radiusMiles = parseFloat(radiusMatch[2]);
                } else {
                  searchName = bodyAfterReport || customerPlace;
                }

                if (!searchName) {
                  responseText = 'Area Report\n\nFormats:\n' +
                    '"report [business name]"\n' +
                    '"report [business name] [miles]"\n\n' +
                    'Examples:\n' +
                    '"report Boardwalk Suites Lafayette"\n' +
                    '"report Boardwalk Suites Lafayette 5"';
                } else {
                  try {
                    const report = await generateOwnerReport({
                      mode: 'owner',
                      businessName: searchName,
                      radiusMiles
                    });
                    responseText = formatOwnerReportForSms(report);
                  } catch (reportError: any) {
                    console.error('[SMS Biz Bot] Report generation error:', reportError.message);
                    responseText = `Could not generate report: ${reportError.message}`;
                  }
                }
              }
            }
          } else {
            responseText = 'AI Biz Bot\n\nI can help with:\n' +
              '- "visitors" - Website traffic stats\n' +
              '- "reviews" - Recent customer reviews\n' +
              '- "update hours" - Change business hours\n' +
              '- "schedule" - Calendar & events\n' +
              '- "add task" - Create reminders\n' +
              '- "report [name]" - Owner area report (3mi default)\n' +
              '- "report [name] [miles]" - Custom radius\n' +
              '- "search [category] near [location]" - Market search\n' +
              '- "competitors" - Your business competition\n\n' +
              'What would you like to do?';
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${responseText}</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        } catch (error: any) {
          console.error('[SMS Biz Bot] Error:', error.message);
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🤖 AI Biz Bot encountered an error. Please try again or visit your admin panel.</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        }
      }
      
      // ========== ADMIN COMMANDS (Health Check & Repair Agent) ==========
      
      // ========== CODING AGENT (Kimi K2) ==========
      const codingKeywords = ['error:', 'exception', 'traceback', 'syntaxerror', 'typeerror', 'referenceerror', 
        'undefined is not', 'cannot read property', 'is not defined', 'unexpected token',
        'fix this code', 'debug this', 'why is this error', 'code help', 'coding help',
        'fix my code', 'analyze this code', 'explain this code', 'review my code',
        '```', 'function(', 'const ', 'let ', 'var ', 'import ', 'def ', 'class '];
      const isCodingRequest = codingKeywords.some(kw => bodyLower.includes(kw)) || 
        (Body && Body.includes('```'));
      
      if (isCodingRequest) {
        console.log(`[SMS Coding Agent] Detected coding request from: ${From}`);
        
        try {
          // Determine if it's an error, code to fix, or code to explain
          const hasError = bodyLower.includes('error') || bodyLower.includes('exception') || 
            bodyLower.includes('traceback') || bodyLower.includes('undefined');
          const wantsFix = bodyLower.includes('fix') || bodyLower.includes('debug') || 
            bodyLower.includes('help') || bodyLower.includes('wrong');
          const wantsExplanation = bodyLower.includes('explain') || bodyLower.includes('what does');
          
          let toolName: string;
          let args: Record<string, any>;
          
          // Extract code block if present
          const codeMatch = Body.match(/```[\w]*\n?([\s\S]*?)```/);
          const code = codeMatch ? codeMatch[1].trim() : Body;
          
          // Detect language
          const langMatch = Body.match(/```(\w+)/);
          const language = langMatch ? langMatch[1] : 'javascript';
          
          if (hasError) {
            toolName = 'diagnose_error';
            args = { error: code, language };
          } else if (wantsFix) {
            toolName = 'fix_code';
            args = { code, language, issue: 'Fix the issues in this code' };
          } else if (wantsExplanation) {
            toolName = 'explain_code';
            args = { code, language, audience: 'beginner' };
          } else {
            toolName = 'analyze_code';
            args = { code, language };
          }
          
          // Get agent settings for AI model configuration
          // First try to get assigned agent from customer, otherwise get any agent
          let codingAgent = null;
          const codingCustomer = await storage.getCustomerByPhone(From);
          if (codingCustomer?.agentId) {
            codingAgent = await storage.getAgent(codingCustomer.agentId);
          }
          // Fallback to first available agent if no assignment
          if (!codingAgent) {
            const allAgents = await storage.getAgents();
            codingAgent = allAgents[0] || null;
          }
          
          let modelOptions: ModelOptions = {};
          if (codingAgent) {
            modelOptions = {
              hfToken: codingAgent.hfToken || undefined,
              temperature: codingAgent.aiTemperature || 60,
              maxTokens: codingAgent.aiMaxTokens || 4096,
              modelId: codingAgent.aiModelId || undefined,
            };
            console.log(`[SMS Coding Agent] Using agent settings: provider=${codingAgent.aiModelProvider}, temp=${modelOptions.temperature}`);
          }
          
          console.log(`[SMS Coding Agent] Using tool: ${toolName}`);
          const result = await handleMCPToolCall(toolName, args, modelOptions);
          
          // Truncate for SMS (keep it readable)
          let smsResponse = result;
          if (smsResponse.length > 1400) {
            smsResponse = smsResponse.substring(0, 1397) + '...';
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🤖 Coding Agent (Gemini)\n\n${smsResponse}</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        } catch (error: any) {
          console.error('[SMS Coding Agent] Error:', error.message);
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🤖 Coding Agent couldn't process that. Try sending your code in a code block:\n\n\`\`\`javascript\nyour code here\n\`\`\`</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        }
      }
      
      // ========== ADMIN COMMANDS (Health Check & Repair) ==========
      const adminCommands = ['health check', 'run health', 'check health', 'sms health', 'fix sms', 'repair sms', 'auto fix', 'autofix', 'repair webhooks', 'fix webhooks'];
      const isAdminCommand = adminCommands.some(cmd => bodyLower.includes(cmd));
      
      if (isAdminCommand) {
        const twilioClient = await getTwilioClient();
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['host'];
        const baseUrl = `${protocol}://${host}`;
        
        // Check if this is a fix/repair command
        const isRepairCommand = ['fix', 'repair', 'autofix'].some(cmd => bodyLower.includes(cmd));
        
        if (isRepairCommand) {
          // Run auto-fix
          console.log(`[SMS Health Agent] Running auto-fix for: ${From}`);
          const services = await twilioClient.messaging.v1.services.list({ limit: 20 });
          let fixedCount = 0;
          const fixResults: string[] = [];
          
          for (const svc of services) {
            if (!svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber) {
              try {
                await twilioClient.messaging.v1.services(svc.sid).update({
                  inboundRequestUrl: `${baseUrl}/webhook/sms`,
                  inboundMethod: 'POST',
                  fallbackUrl: `${baseUrl}/webhook/sms`,
                  fallbackMethod: 'POST'
                });
                fixedCount++;
                fixResults.push(`✅ Fixed: ${svc.friendlyName}`);
              } catch (err: any) {
                fixResults.push(`❌ Failed: ${svc.friendlyName}`);
              }
            }
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🔧 Repair Agent Complete!\n\nFixed ${fixedCount} messaging service(s).\n\n${fixResults.slice(0, 3).join('\n')}${fixResults.length > 3 ? `\n...and ${fixResults.length - 3} more` : ''}\n\nReply "health check" to verify.</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        } else {
          // Run health check
          console.log(`[SMS Health Agent] Running health check for: ${From}`);
          const services = await twilioClient.messaging.v1.services.list({ limit: 20 });
          
          let criticalCount = 0;
          let warningCount = 0;
          let healthyCount = 0;
          const issues: string[] = [];
          
          for (const svc of services) {
            const hasCritical = !svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber;
            const hasWarning = !svc.fallbackUrl || !svc.statusCallback;
            
            if (hasCritical) {
              criticalCount++;
              issues.push(`❌ ${svc.friendlyName}: No webhook!`);
            } else if (hasWarning) {
              warningCount++;
            } else {
              healthyCount++;
            }
          }
          
          let statusEmoji = criticalCount > 0 ? '🚨' : warningCount > 0 ? '⚠️' : '✅';
          let statusText = criticalCount > 0 ? 'ISSUES FOUND' : warningCount > 0 ? 'WARNINGS' : 'ALL HEALTHY';
          
          let response = `${statusEmoji} SMS Health Check\n\n` +
            `Services: ${services.length}\n` +
            `✅ Healthy: ${healthyCount}\n` +
            `⚠️ Warnings: ${warningCount}\n` +
            `❌ Critical: ${criticalCount}\n\n`;
          
          if (criticalCount > 0) {
            response += issues.slice(0, 2).join('\n') + '\n\nReply "fix sms" to repair automatically.';
          } else {
            response += 'All messaging services are operational!';
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        }
      }
      
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
      
      // Detect if this is a first message (new customer onboarding)
      const existingMessages = await storage.getMessagesByConversation(conversation.id, 5);
      const isFirstMessage = existingMessages.length <= 1; // Only the message we just stored
      
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
      
      // Special onboarding context for first-time messages
      let onboardingContext = '';
      if (isFirstMessage) {
        onboardingContext = `

THIS IS YOUR FIRST MESSAGE WITH THIS USER! Follow the 24-hour demo onboarding flow:
1. Warmly introduce yourself and confirm their number is working
2. Ask what task they'd like help with
3. Ask if they have any specific requirements or preferences to share
4. Let them know you'll complete their task within 24 hours

Be friendly and make them feel welcome! This is their first experience with Gateway.`;
      }
      
      const fullPersonality = `${agentPersonality}${customerContext}${taskContext}${onboardingContext}\n\nAddress the customer by name when appropriate. Be warm, helpful, and reference their projects if relevant to the conversation.`;
      
      // Generate AI response using Kimi (primary) or Gemini (fallback)
      let responseText = `Hi ${callerName}! Thank you for your message. An agent will respond shortly.`;
      
      // Get conversation history for context
      const messages = await storage.getMessagesByConversation(conversation.id, 10);
      const history = messages.reverse().map(m => ({
        role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
        content: m.body || '',
      }));
      
      // Sovereign: Gemini is the sole AI provider for SMS responses
      if (process.env.GEMINI_API_KEY) {
        // Gemini SMS response
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

  // Sovereign Voice webhook — Gemini Native Audio via Twilio Media Streams
  router.post("/webhook/voice/stream", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;
      
      console.log(`[Voice] From: ${From}, To: ${To}, Status: ${CallStatus}`);
      
      // Log the call
      const config = await storage.getTelephonyConfig();
      // Resolve siteConfigId: prefer the link stored on the telephony config, then fall back to config.id
      const siteConfigId: string | null = (config as any)?.siteConfigId ?? null;
      await storage.createCallLog({
        configId: config?.id || null,
        direction: 'inbound',
        phoneNumber: From,
        status: CallStatus || 'ringing',
        callSid: CallSid,
        duration: 0,
        siteConfigId,
      });
      
      // Check firewall
      const allowedNumbers = config?.allowedNumbers || [];
      if (config?.firewallEnabled && allowedNumbers.length > 0) {
        const isAllowed = allowedNumbers.some(num => 
          From.includes(num) || num.includes(From.slice(-10))
        );
        
        if (!isAllowed) {
          console.log(`[Voice] Blocked caller: ${From}`);
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
      
      console.log(`[Voice] Stream URL: ${streamUrl}, siteConfigId: ${siteConfigId ?? 'none'}`);
      
      // Return TwiML with Media Streams (voice pipeline uses Gemini Clear Voice)
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Welcome to Gateway Global AI. Connecting you to our AI assistant now.</Say>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="agentName" value="AI Assistant"/>
      <Parameter name="personality" value="helpful"/>
      ${siteConfigId ? `<Parameter name="siteConfigId" value="${escapeXml(siteConfigId)}"/>` : ''}
    </Stream>
  </Connect>
  <Say voice="Google.en-US-Neural2-F">The conversation has ended. Goodbye!</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Voice] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Sorry, we encountered an error. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Inbound Voice webhook - receives calls from Twilio
  router.post("/webhook/voice", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;
      
      console.log(`[Voice Webhook] From: ${From}, To: ${To}, Status: ${CallStatus}`);
      
      // Log the call
      const config = await storage.getTelephonyConfig();
      // Resolve siteConfigId from the telephony config's link (set during number provisioning)
      const siteConfigId: string | null = (config as any)?.siteConfigId ?? null;
      await storage.createCallLog({
        configId: config?.id || null,
        direction: 'inbound',
        phoneNumber: From,
        status: CallStatus || 'ringing',
        callSid: CallSid,
        duration: 0,
        siteConfigId,
      });

      // Energy balance guard – if the site has exhausted its prepaid minutes, play the
      // "Zuckerberg Lock" message and hang up rather than burning more AI cost.
      const effectiveSiteId = siteConfigId ?? config?.id;
      if (effectiveSiteId) {
        const hasBalance = await hasEnergyBalance(effectiveSiteId);
        if (!hasBalance) {
          console.log(`[Energy] Site ${effectiveSiteId} out of prepaid minutes – blocking call`);
          res.set('Content-Type', 'text/xml');
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm low on energy for this business. The owner needs to top up my reserves so I can keep assisting you. Please call back later. Goodbye!</Say>
  <Hangup/>
</Response>`);
        }
      }
      
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
  router.post("/webhook/voice/gather", validateTwilioSignature, async (req, res) => {
    try {
      const { SpeechResult, From, CallSid } = req.body;
      
      console.log(`[Voice Gather] From: ${From}, Speech: ${SpeechResult}`);
      
      let responseText = "I understand. Let me help you with that.";
      
      // Generate AI response using Gemini (sole provider)
      if (SpeechResult) {
        if (process.env.GEMINI_API_KEY) {
          // Sovereign: Gemini is the sole AI provider for voice gather responses
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

  // ── Jail Handshake Webhook (/webhook/voice/jail) ─────────────────────────
  // Dedicated endpoint for the bail bonds number.
  // Automatically accepts the collect-call charge (DTMF "1") before connecting
  // the AI over WebSocket in Push-to-Talk mode.
  //
  // Configure the Twilio phone number's Voice webhook URL to:
  //   POST https://your-domain.com/webhook/voice/jail?siteConfigId=<uuid>
  //
  router.post("/webhook/voice/jail", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;

      // siteConfigId is passed as a query param in the Twilio webhook URL
      const siteConfigId: string | null = (req.query.siteConfigId as string) || null;

      console.log(`[JailVoice] Jail call from ${From}, CallSid: ${CallSid}, Site: ${siteConfigId ?? "none"}`);

      // Log the call
      const config = await storage.getTelephonyConfig().catch(() => null);
      if (config) {
        await storage.createCallLog({
          configId: config.id,
          direction: "inbound",
          phoneNumber: From,
          status: CallStatus || "ringing",
          callSid: CallSid,
          duration: 0,
          siteConfigId,
        });
      }

      // Energy guard
      if (siteConfigId) {
        const hasBalance = await hasEnergyBalance(siteConfigId);
        if (!hasBalance) {
          res.set("Content-Type", "text/xml");
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>AAA Bail Services is currently unavailable. Please call back later.</Say>
  <Hangup/>
</Response>`);
        }
      }

      const host = process.env.REPLIT_DEV_DOMAIN ||
        (process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : req.get("host") || "localhost:5000");
      const wsProtocol = host.includes("localhost") ? "ws" : "wss";
      const streamUrl  = `${wsProtocol}://${host}/ws/voice-stream`;

      // Bail-specific system prompt injected via custom parameter so voiceStream.ts
      // can use it in the Gemini setup message.
      const jailPrompt = encodeURIComponent(
        "You are the 24/7 Virtual Bail Agent for AAA Bail Services. " +
        "Because callers are often in noisy holding cells, you must start every call with: " +
        "'AAA Bail Services. We accepted the call. Press 1 to speak, tell me your name and the " +
        "phone number of the person who can pay your bond, then press 1 again.' " +
        "Only respond after they finish their transmission. " +
        "Once you have the inmate name and outside phone number, immediately use the vine_lookup_and_dispatch tool."
      );

      res.set("Content-Type", "text/xml");
      // ┌─ Jail Handshake ──────────────────────────────────────────────────────
      // 1. <Pause length="3"/> — wait for the "Press 1 to accept" jail system prompt
      // 2. <Play digits="1"/>  — send DTMF 1 to accept the collect call charges
      // 3. <Connect><Stream>   — hand off to the Gemini AI over WebSocket (PTT mode)
      // └───────────────────────────────────────────────────────────────────────
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="3"/>
  <Play digits="1"/>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="agentName"    value="Bail Agent"/>
      <Parameter name="personality"  value="urgent and empathetic bail bond specialist"/>
      <Parameter name="ptt"          value="1"/>
      ${siteConfigId ? `<Parameter name="siteConfigId" value="${escapeXml(siteConfigId)}"/>` : ""}
      <Parameter name="systemPrompt" value="${escapeXml(decodeURIComponent(jailPrompt))}"/>
    </Stream>
  </Connect>
  <Say>The call has ended. Goodbye.</Say>
</Response>`);

    } catch (err: any) {
      console.error("[JailVoice] Error:", err);
      res.set("Content-Type", "text/xml");
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>AAA Bail Services is experiencing a technical issue. Please call our main line at 2 2 5, 3 0 8, 3 4 0 0.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Voice status callback - tracks call completion
  router.post("/webhook/voice/status", validateTwilioSignature, async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration, To } = req.body;
      
      console.log(`[Voice Status] CallSid: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}`);
      
      // Log usage and decrement balance for every completed call.
      // NOTE: The Media Stream handler (voiceStream.ts) already persists billing when it
      // has a siteConfigId.  Check for an existing voice_usage_log row first to avoid
      // double-billing when the call went through the Clear Voice (Media Streams) path.
      if (CallStatus === 'completed' && CallSid) {
        try {
          const config = await storage.getTelephonyConfig();
          // Prefer the explicit siteConfigId link on the telephony config.
          const siteConfigId: string | null = (config as any)?.siteConfigId ?? null;

          if (siteConfigId) {
            // Check whether voiceStream already recorded usage for this call
            const { db: _db } = await import('./db');
            const { voiceUsageLogs: _vul } = await import('@shared/schema');
            const { eq: _eq } = await import('drizzle-orm');
            const existing = await _db
              .select({ id: _vul.id })
              .from(_vul)
              .where(_eq(_vul.callSid, CallSid))
              .limit(1);

            if (existing.length > 0) {
              console.log(`[Energy] Usage already logged for call ${CallSid} by stream handler – skipping`);
            } else {
              // Fallback: bill using Twilio's reported duration (Gather path, no stream)
              const rawSeconds = parseInt(CallDuration ?? '0', 10) || 0;
              const result = await logVoiceUsage({
                siteConfigId,
                callSid: CallSid,
                callType: 'phone',
                rawDurationSeconds: rawSeconds,
              });
              console.log(`[Energy] Logged ${result.billedMinutes} billed minute(s), $${(result.billedAmountCents / 100).toFixed(2)} – balance now ${result.newBalance ?? 'unrestricted'} minute(s)`);
            }
          }
        } catch (usageErr: any) {
          console.error('[Energy] Failed to log voice usage:', usageErr.message);
        }
      }
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error('[Voice Status] Error:', error);
      res.sendStatus(500);
    }
  });

  // SMS Status Callback - for delivery status and error debugging
  router.post("/webhook/sms/status", validateTwilioSignature, async (req, res) => {
    try {
      const { 
        MessageSid, 
        MessageStatus, 
        To, 
        From,
        ErrorCode, 
        ErrorMessage 
      } = req.body;
      
      // Log all status updates
      console.log(`[SMS Status] MessageSid: ${MessageSid}, Status: ${MessageStatus}, From: ${From}, To: ${To}`);
      
      // Store delivery status in database
      try {
        const existing = await storage.getSmsDeliveryStatus(MessageSid);
        if (existing) {
          await storage.updateSmsDeliveryStatus(MessageSid, {
            status: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
          });
        } else {
          await storage.createSmsDeliveryStatus({
            messageSid: MessageSid,
            status: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
            fromNumber: From || null,
            toNumber: To || null,
          });
        }
      } catch (dbError: any) {
        console.error('[SMS Status] DB Error:', dbError.message);
      }
      
      // Log errors for debugging
      if (ErrorCode || ErrorMessage) {
        console.error(`[SMS Error] Code: ${ErrorCode}, Message: ${ErrorMessage}`);
        console.error(`[SMS Error] Details: MessageSid=${MessageSid}, From=${From}, To=${To}`);
        
        // Common error codes reference:
        // 30001 - Queue overflow
        // 30002 - Account suspended
        // 30003 - Unreachable destination
        // 30004 - Message blocked
        // 30005 - Unknown destination
        // 30006 - Landline or unreachable carrier
        // 30007 - Carrier violation
        // 30008 - Unknown error
      }
      
      // Track delivery status
      if (MessageStatus === 'delivered') {
        console.log(`[SMS Delivered] Message ${MessageSid} delivered to ${To}`);
      } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
        console.error(`[SMS Failed] Message ${MessageSid} to ${To} - ${ErrorCode}: ${ErrorMessage}`);
      }
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error('[SMS Status] Error:', error);
      res.sendStatus(500);
    }
  });

  // SMS Health Check endpoint
  router.get("/api/sms/health", async (req, res) => {
    try {
      const health: any = {
        status: 'healthy',
        checks: {},
        timestamp: new Date().toISOString(),
      };
      
      // 1. Check Twilio credentials
      try {
        const client = await getTwilioClient();
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID || '').fetch();
        health.checks.twilioCredentials = {
          status: 'ok',
          accountStatus: account.status,
          friendlyName: account.friendlyName,
        };
      } catch (twilioErr: any) {
        health.checks.twilioCredentials = {
          status: 'error',
          error: twilioErr.message,
        };
        health.status = 'unhealthy';
      }
      
      // 2. Check if at least one number is configured
      try {
        const client = await getTwilioClient();
        const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
        health.checks.phoneNumbers = {
          status: numbers.length > 0 ? 'ok' : 'warning',
          count: numbers.length,
          message: numbers.length > 0 ? 'Phone numbers available' : 'No phone numbers configured',
        };
        if (numbers.length === 0) {
          health.status = 'degraded';
        }
      } catch (numErr: any) {
        health.checks.phoneNumbers = {
          status: 'error',
          error: numErr.message,
        };
      }
      
      // 3. Check recent status callbacks (last 5 minutes)
      try {
        const recentDeliveries = await storage.getRecentSmsDeliveries(10);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentCount = recentDeliveries.filter(d => 
          d.createdAt && new Date(d.createdAt) > fiveMinutesAgo
        ).length;
        
        health.checks.statusCallbacks = {
          status: recentCount > 0 ? 'ok' : 'unknown',
          recentCallbacks: recentCount,
          message: recentCount > 0 
            ? `${recentCount} status callbacks in last 5 minutes` 
            : 'No recent status callbacks (normal if no SMS sent recently)',
        };
      } catch (cbErr: any) {
        health.checks.statusCallbacks = {
          status: 'error',
          error: cbErr.message,
        };
      }
      
      // 4. Check failed deliveries in last 24 hours
      try {
        const failedDeliveries = await storage.getFailedSmsDeliveries(100);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentFailures = failedDeliveries.filter(d => 
          d.createdAt && new Date(d.createdAt) > oneDayAgo
        );
        
        health.checks.deliveryFailures = {
          status: recentFailures.length === 0 ? 'ok' : 'warning',
          failedCount24h: recentFailures.length,
          message: recentFailures.length === 0 
            ? 'No delivery failures in last 24 hours' 
            : `${recentFailures.length} failed deliveries in last 24 hours`,
        };
        
        if (recentFailures.length > 10) {
          health.status = 'degraded';
        }
      } catch (failErr: any) {
        health.checks.deliveryFailures = {
          status: 'error',
          error: failErr.message,
        };
      }
      
      const httpStatus = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(httpStatus).json(health);
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get failed SMS deliveries
  router.get("/api/sms/failures", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const failures = await storage.getFailedSmsDeliveries(limit);
      res.json({
        count: failures.length,
        failures,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent SMS delivery status
  router.get("/api/sms/deliveries", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const deliveries = await storage.getRecentSmsDeliveries(limit);
      res.json({
        count: deliveries.length,
        deliveries,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


// ── Voice Admin & PTT ────────────────────────────────────────────────────────

  // ============================================
  // VOICE ADMIN API
  // ============================================
  
  // Get voice configuration for an agent
  router.get("/api/voice/config/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      res.json({
        model: agent.voiceModel || 'gemini-2.5-flash-native-audio-preview',
        voice: agent.voiceName || 'Puck',
        role: agent.voiceRole || 'AI Business Assistant',
        companyName: agent.voiceCompanyName || 'AI Biz Bot',
        systemPrompt: agent.systemPrompt || 'You are a helpful AI assistant for small businesses.',
        voicePersona: agent.voicePersona || 'friendly',
      });
    } catch (error: any) {
      console.error("[Voice Admin] Get config error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update voice configuration for an agent
  router.post("/api/voice/config/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { model, voice, role, companyName, systemPrompt, voicePersona } = req.body;
      
      // Validate inputs
      const validModels = [
        'gemini-2.5-flash-native-audio-preview-12-2025',
        'gemini-2.5-flash-native-audio-preview',
        'gemini-2.5-flash-latest',
        'gemini-2.0-flash-native-audio',
      ];
      
      if (model && !validModels.includes(model)) {
        return res.status(400).json({ error: "Invalid model specified" });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Update voice configuration
      const updates: any = {};
      if (model !== undefined) updates.voiceModel = model;
      if (voice !== undefined) updates.voiceName = voice;
      if (role !== undefined) updates.voiceRole = role;
      if (companyName !== undefined) updates.voiceCompanyName = companyName;
      if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
      if (voicePersona !== undefined) updates.voicePersona = voicePersona;
      
      const updatedAgent = await storage.updateAgent(agentId, updates);
      
      res.json({
        success: true,
        config: {
          model: updatedAgent.voiceModel,
          voice: updatedAgent.voiceName,
          role: updatedAgent.voiceRole,
          companyName: updatedAgent.voiceCompanyName,
          systemPrompt: updatedAgent.systemPrompt,
          voicePersona: updatedAgent.voicePersona,
        }
      });
    } catch (error: any) {
      console.error("[Voice Admin] Update config error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get available voices for a model
  router.get("/api/voice/models/:modelId/voices", (req, res) => {
    const { modelId } = req.params;
    
    const modelVoices: Record<string, Array<{ id: string; name: string; gender: string; description: string }>> = {
      'gemini-2.5-flash-native-audio-preview-12-2025': [
        { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
        { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
        { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
      ],
      'gemini-2.5-flash-native-audio-preview': [
        { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
        { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
        { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
      ],
      'gemini-2.5-flash-latest': [
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
      ],
      'gemini-2.0-flash-native-audio': [
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
      ],
    };
    
    const voices = modelVoices[modelId] || modelVoices['gemini-2.5-flash-native-audio-preview-12-2025'];
    res.json({ voices });
  });
  
  // ============================================
  // PUSH-TO-TALK API
  // ============================================
  
  // Process PTT audio recording
  router.post("/api/ptt/process", async (req, res) => {
    try {
      const { audioBase64, agentId, conversationHistory } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data required" });
      }
      
      // Get agent configuration
      let config: any = {
        agentId: agentId || 'default',
        model: 'gemini-2.5-flash-native-audio-preview',
        voice: 'Puck',
        systemPrompt: 'You are a helpful AI assistant for small businesses.'
      };
      
      if (agentId) {
        const agent = await storage.getAgent(agentId);
        if (agent) {
          config = {
            agentId,
            model: agent.voiceModel || config.model,
            voice: agent.voiceName || config.voice,
            systemPrompt: agent.systemPrompt || config.systemPrompt
          };
        }
      }
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Process with PTT service
      const { getPTTService } = await import('./pttService');
      const pttService = getPTTService();
      const result = await pttService.processPTTAudio(
        audioBuffer,
        config,
        conversationHistory || []
      );
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        transcript: result.transcript,
        responseText: result.responseText,
        responseAudio: result.responseAudio?.toString('base64')
      });
    } catch (error: any) {
      console.error("[PTT] Process error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Transcribe audio only (STT)
  router.post("/api/ptt/transcribe", async (req, res) => {
    try {
      const { audioBase64 } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data required" });
      }
      
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      const { getPTTService } = await import('./pttService');
      const pttService = getPTTService();
      const result = await pttService.transcribeAudio(audioBuffer);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        transcript: result.transcript
      });
    } catch (error: any) {
      console.error("[PTT] Transcribe error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Generate speech from text (TTS)
  router.post("/api/ptt/synthesize", async (req, res) => {
    try {
      const { text, voice } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text required" });
      }
      
      const { getPTTService } = await import('./pttService');
      const pttService = getPTTService();
      const result = await pttService.generateSpeech(text, voice || 'Puck');
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        audio: result.audio?.toString('base64')
      });
    } catch (error: any) {
      console.error("[PTT] Synthesize error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  registerVlmRoutes(app);

  // Register Agent System routes
  registerAgentRoutes(app);

  // Register Workspace Onboarding routes
  registerWorkspaceOnboardingRoutes(app);

  // Register Knowledge Base routes
  router.use("/api/knowledge", knowledgeRoutes);
  router.use("/api/business", businessRoutes);
  router.use("/api/site-configs", siteConfigRoutes);
  router.use("/api/onboarding", onboardingRoutes);

  // Register Site Claim / Assignment routes (assign + preview + OTP + Stripe checkout)
  router.use(claimRoutes);

  // Intelligence Ingestion: POST /api/ingest-plan
  router.use(ingestPlanRoutes);

  // Bail Rescue public API: GET /api/bail-rescue/:token, POST /api/bail-rescue/:token/checkout
  router.use(bailRescueRoutes);

  // Agent Deep Research: POST /api/generate-agent-persona
  router.use(agentResearchRoutes);

export default router;
