import { Router } from "express";
import { requirePolicy } from "../middleware/policyGate";
import { storage } from "../storage";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatewayChat } from "../ai-gateway";
import { buildRichSystemInstruction } from "../services/systemInstructionBuilder";
import { buildBehavioralPrompt } from "../services/promptCompiler";
import { compileFullSystemPrompt } from "../services/systemPromptCompiler";
import type { BusinessContext } from "../services/promptCompiler";
import {
  getCachedKnowledgeGapReport,
  certificationFromGapReport,
} from "../services/knowledgeCertificationContext";
import { assembleGovernedKnowledge } from "../services/knowledgeGovernanceBridge";
import { PLATFORM_GATEWAY_SYSTEM_PROMPT } from "../prompts/platformGatewayPrompt";
import { FREE_TIER_SYSTEM_INSTRUCTION } from "../prompts/freeTierPrompt";
import {
  analyticsLogs,
  insertCustomerSchema,
  smsConversations,
  smsMessages,
} from "@shared/schema";
import { detectSensitiveInput } from "../services/sensitiveInputGuard";
import {
  resolveFieldWriteMode,
  resolveIntakePolicyConfig,
} from "../services/intakePolicyService";
import {
  buildCgrForWebsiteChat,
  buildCgrForAgentChat,
  getCommunicationGovernanceFromSite,
  loadBuyerJourney,
} from "../services/conversationGrounding";
import { validateArchEnvelope } from "../services/archEnvelopeValidator";
import { analyzePppShadow, skippedPppShadowScore } from "../services/pppShadowValidator";
import { enqueuePppShadowLog } from "../services/pppShadowAnalytics";

/** When ARCH validation fails, apply deterministic fallback (see COMMUNICATION_PLANE_CONTRACT). */
function applyArchFallback(
  original: string,
  archCheck: { ok: boolean; fallbackResponse?: string },
): string {
  if (archCheck.ok || !archCheck.fallbackResponse) return original;
  const mode = (process.env.ARCH_HANDOFF_MODE || "replace").toLowerCase().trim();
  const fb = archCheck.fallbackResponse;
  if (mode === "append") {
    return `${original.trim()}\n\n${fb}`;
  }
  return fb;
}

function buildSecureInputResponse(policy: any, siteConfigId?: string) {
  return {
    requiresSecureInput: true,
    secureInput: {
      policyId: policy.policyId,
      fieldName: policy.fieldName,
      classification: policy.classification,
      allowedChannels: policy.allowedChannels,
      redactInTranscript: policy.redactInTranscript,
      storeMode: policy.storeMode,
      displayMode: policy.displayMode,
      schemaEndpoint:
        siteConfigId && siteConfigId !== "platform-landing"
          ? `/api/site-configs/${siteConfigId}/intake/secure-form/${policy.policyId}`
          : null,
      submitEndpoint:
        siteConfigId && siteConfigId !== "platform-landing"
          ? `/api/site-configs/${siteConfigId}/intake/secure-submit`
          : null,
    },
    response:
      "For your security, sensitive details must be entered through the secure form. I opened a secure step for this field.",
  };
}

const router = Router();

// ── Website Chat + Chat + Conversations ──────────────────────────────────────────────────────

  router.post("/api/website-chat", requirePolicy('chat.write'), async (req, res) => {
    try {
      const schema = z.object({
        message: z.string().min(1).max(4000),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        businessPhone: z.string().optional(),
        siteConfigId: z.string().optional(),
        visitorId: z.string().optional(),
        /** Phased industry funnel — keys for resolveCurrentPhase (see PHASED_INDUSTRY_FUNNEL_SPEC). */
        funnelContextKeys: z.record(z.string()).optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { message, businessName, businessAddress, businessPhone, siteConfigId, visitorId, history, funnelContextKeys } = parsed.data;

      const isPlatformChat = siteConfigId === "platform-landing";
      let siteConfig: any = null;
      if (siteConfigId && !isPlatformChat) {
        siteConfig = await storage.getSiteConfig(siteConfigId);
      }

      /** Load once before prompt compile so BusinessContext.buyerJourney is defined (see GOVERNANCE_EXECUTION_PLAN_V1 Phase 3). */
      const buyerJourneyLoaded =
        !isPlatformChat && siteConfigId
          ? await loadBuyerJourney(visitorId, siteConfigId)
          : null;

      const sensitiveCheck = detectSensitiveInput(message);
      if (sensitiveCheck.requiresSecureForm && sensitiveCheck.policy) {
        if (siteConfig) {
          const intakePolicy = resolveIntakePolicyConfig(siteConfig);
          const writeMode = resolveFieldWriteMode(
            intakePolicy,
            sensitiveCheck.matchedFieldName ?? sensitiveCheck.policy.fieldName
          );
          if (writeMode === "denied") {
            return res.status(200).json({
              deniedInput: true,
              response:
                "This field cannot be updated through customer conversation. Please contact your receptionist.",
            });
          }
          if (writeMode === "review") {
            return res.status(200).json({
              requiresReviewQueue: true,
              reviewQueue: {
                fieldName: sensitiveCheck.policy.fieldName,
                reviewerRole:
                  intakePolicy.fields[sensitiveCheck.policy.fieldName]?.reviewerRole ??
                  "receptionist",
              },
              response:
                "I captured your request and queued it for staff review before any account updates are committed.",
            });
          }
        }
        return res.status(200).json(buildSecureInputResponse(sensitiveCheck.policy, siteConfigId));
      }

      let resolvedProvider: any = "gemini";
      let resolvedModel: string | undefined;
      let customSystemPrompt: string | undefined;

      if (siteConfig) {
        resolvedProvider = siteConfig.modelProvider || "gemini";
        resolvedModel = siteConfig.modelName || undefined;
        customSystemPrompt = siteConfig.systemPromptOverride || undefined;
      }

      const governedKnowledge = siteConfigId
        ? await assembleGovernedKnowledge(siteConfigId, null, "concierge_qa")
        : null;
      const knowledgeBlock = governedKnowledge?.knowledgeBlock ?? "";

      let systemPrompt: string;
      if (isPlatformChat) {
        systemPrompt = PLATFORM_GATEWAY_SYSTEM_PROMPT;
      } else {
        const assignedAgentId = (siteConfig as { assignedAgentId?: string | null })?.assignedAgentId;
        const pd = (siteConfig as { placeData?: Record<string, unknown> | null })?.placeData as Record<string, unknown> | null | undefined;
        const defaultBasePrompt = `You are the AI Biz Bot, a friendly AI assistant for ${businessName || "this business"}. You help website visitors with questions about the business.\n\nBusiness details:\n- Name: ${businessName || "N/A"}\n- Address: ${businessAddress || "N/A"}\n- Phone: ${businessPhone || "N/A"}\n\nYou are helpful, concise, and conversational. Keep responses brief since this is a chat widget.`;
        let agent: Awaited<ReturnType<typeof storage.getAgent>> | null = null;
        if (assignedAgentId) agent = await storage.getAgent(assignedAgentId);
        if (agent) {
          const knowledgeCertification = governedKnowledge?.certificationInput;
          const businessContext: BusinessContext = {
            name: businessName ?? (pd && typeof pd.name === "string" ? pd.name : undefined) ?? (siteConfig as { name?: string }).name ?? "this business",
            address: businessAddress ?? (pd && typeof (pd as any).formattedAddress === "string" ? (pd as any).formattedAddress : typeof (pd as any).formatted_address === "string" ? (pd as any).formatted_address : undefined),
            phone: businessPhone ?? (pd && typeof (pd as any).formatted_phone_number === "string" ? (pd as any).formatted_phone_number : undefined),
            knowledgeCertification,
            funnelContextKeys: funnelContextKeys ?? undefined,
            buyerJourney: buyerJourneyLoaded ?? undefined,
          };
          systemPrompt = compileFullSystemPrompt(agent, siteConfig as any, businessContext) + knowledgeBlock;
        } else {
          systemPrompt = (customSystemPrompt || defaultBasePrompt) + knowledgeBlock;
        }
        if (agent?.defaultEmotion && /^(calm|engaged|focused|energized|empathetic)$/i.test(String(agent.defaultEmotion))) {
          systemPrompt += `\n\nDefault emotional tone: ${String(agent.defaultEmotion).toUpperCase()}. Maintain this tone in your responses.`;
        }
        const plan = (siteConfig as { plan?: string })?.plan ?? "free";
        if (plan === "free") {
          systemPrompt += FREE_TIER_SYSTEM_INSTRUCTION;
        }
      }

      const gatewayMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: 'user' as const, content: message },
      ];

      const { gatewayChat } = await import('../ai-gateway');
      let { response, provider, model } = await gatewayChat({
        messages: gatewayMessages,
        provider: resolvedProvider,
        model: resolvedModel,
        temperature: 0.7,
        max_tokens: 500,
      });

      const webAgentId =
        !isPlatformChat && siteConfig
          ? (siteConfig as { assignedAgentId?: string | null }).assignedAgentId
          : null;
      const archAgent = webAgentId ? await storage.getAgent(webAgentId) : null;
      const cgr = buildCgrForWebsiteChat(siteConfigId, visitorId, siteConfig, archAgent ?? null, {
        buyerJourney: buyerJourneyLoaded,
      });
      const archCheck = validateArchEnvelope(response, {
        operationalMode: archAgent?.operationalMode ?? undefined,
        archProfile: (archAgent?.archProfile ?? null) as import("@shared/schema").ArchProfile | null,
      });
      response = applyArchFallback(response, archCheck);

      const govWeb = getCommunicationGovernanceFromSite(siteConfig);
      const pppShadow = isPlatformChat
        ? skippedPppShadowScore("platform_landing")
        : analyzePppShadow(response, {
            operationalMode: archAgent?.operationalMode,
            pppEngagement: govWeb.pppEngagement,
          });
      const cgrWithPpp = { ...cgr, pppShadow };

      enqueuePppShadowLog({
        siteConfigId: isPlatformChat ? null : siteConfigId ?? null,
        agentId: archAgent?.id ?? null,
        channel: "website_chat",
        operationalMode: archAgent?.operationalMode ?? null,
        score: pppShadow,
      });

      if (siteConfigId && !isPlatformChat) {
        try {
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'user', content: message });
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'assistant', content: response });
        } catch (logErr) {
          console.error("[Website Chat] Failed to log chat:", logErr);
        }
      }

      res.json({
        response,
        provider,
        model,
        communication: {
          cgr: cgrWithPpp,
          archValidation: { ok: archCheck.ok, violations: archCheck.violations },
          pppShadow,
        },
      });
    } catch (error: any) {
      console.error("[Website Chat] Error:", error.message);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  // Simple in-memory rate limiting for public chat
  const chatRateLimits = new Map<string, { count: number; resetTime: number }>();
  const CHAT_RATE_LIMIT = 20; // requests per minute
  const CHAT_RATE_WINDOW = 60000; // 1 minute in ms

  router.post("/api/chat", requirePolicy('chat.write'), async (req, res) => {
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
      const sensitiveCheck = detectSensitiveInput(message);
      if (sensitiveCheck.requiresSecureForm && sensitiveCheck.policy) {
        return res.status(200).json(buildSecureInputResponse(sensitiveCheck.policy));
      }

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Build character-first system prompt using DISC + ARCH + Memory layers
      let systemPrompt = buildBehavioralPrompt(agent);

      // Build conversation messages
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        })),
        { role: 'user' as const, content: message },
      ];

      // Use agent's configured model, falling back to K2_TURBO
      const agentTemp = agent.aiTemperature ? agent.aiTemperature / 100 : 0.7;
      const agentMaxTokens = agent.aiMaxTokens || 4096;
      // Sovereign: Gemini is the sole AI provider. Model IDs from Doppler only (no hardcoded model strings).
      const modelToUse = process.env.GEMINI_MODEL_FALLBACK || process.env.GEMINI_MODEL_ID;
      if (!modelToUse) {
        console.error("[GOVERNANCE] Set GEMINI_MODEL_FALLBACK or GEMINI_MODEL_ID in Doppler");
        return res.status(503).json({ error: "AI model not configured" });
      }

      // Retry once on transient failures
      let response: string;
      try {
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      } catch (firstError: any) {
        console.warn('Chat first attempt failed, retrying:', firstError.message);
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      }

      const archCheck = validateArchEnvelope(response, {
        operationalMode: agent.operationalMode ?? undefined,
        archProfile: (agent.archProfile ?? null) as import("@shared/schema").ArchProfile | null,
      });
      response = applyArchFallback(response, archCheck);

      const siteForAgent =
        agent.siteConfigId != null ? await storage.getSiteConfig(agent.siteConfigId) : null;
      const cgrAgent = buildCgrForAgentChat(agent, siteForAgent);
      const govAgent = getCommunicationGovernanceFromSite(siteForAgent);
      const pppShadowAgent = analyzePppShadow(response, {
        operationalMode: agent.operationalMode,
        pppEngagement: govAgent.pppEngagement,
      });
      const cgrAgentWithPpp = { ...cgrAgent, pppShadow: pppShadowAgent };

      enqueuePppShadowLog({
        siteConfigId: agent.siteConfigId ?? null,
        agentId: agent.id,
        channel: "agent_chat",
        operationalMode: agent.operationalMode ?? null,
        score: pppShadowAgent,
      });

      res.json({
        response,
        communication: {
          cgr: cgrAgentWithPpp,
          archValidation: { ok: archCheck.ok, violations: archCheck.violations },
          pppShadow: pppShadowAgent,
        },
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
  });

  // ============================================
  // CALL LOGS API (alias for Gateway Admin)
  // ============================================

  // Get call logs (for Gateway Admin Usage & Logs tab)
  router.get("/api/call-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // CUSTOMER/LEAD MANAGEMENT API
  // ============================================

  // Get all customers (with optional search)
  router.get("/api/customers", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const customerList = await storage.getCustomers(search);
      res.json(customerList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single customer
  router.get("/api/customers/:id", async (req, res) => {
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
  router.post("/api/customers", requirePolicy('customer.write'), async (req, res) => {
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
  router.patch("/api/customers/:id", requirePolicy('customer.write'), async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id as string, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete customer
  router.delete("/api/customers/:id", requirePolicy('customer.delete'), async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ← extracted to server/routes/telephonyRoutes.ts

  // ← extracted to server/routes/billingRoutes.ts or a2pRoutes.ts

  // Get conversation history API
  router.get("/api/conversations/:phoneNumber", async (req, res) => {
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

export default router;
