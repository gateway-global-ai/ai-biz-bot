import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatewayChat } from "../ai-gateway";
import { buildRichSystemInstruction } from "../services/systemInstructionBuilder";
import { analyticsLogs, smsConversations, smsMessages } from "@shared/schema";

const router = Router();

// ── Website Chat + Chat + Conversations ──────────────────────────────────────────────────────

  router.post("/api/website-chat", async (req, res) => {
    try {
      const schema = z.object({
        message: z.string().min(1).max(4000),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        businessPhone: z.string().optional(),
        siteConfigId: z.string().optional(),
        visitorId: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { message, businessName, businessAddress, businessPhone, siteConfigId, visitorId, history } = parsed.data;

      let siteConfig: any = null;
      let resolvedProvider: any = 'gemini';
      let resolvedModel: string | undefined;
      let customSystemPrompt: string | undefined;

      const isPlatformChat = siteConfigId === 'platform-landing';

      if (siteConfigId && !isPlatformChat) {
        siteConfig = await storage.getSiteConfig(siteConfigId);
        if (siteConfig) {
          resolvedProvider = siteConfig.modelProvider || 'gemini';
          resolvedModel = siteConfig.modelName || undefined;
          customSystemPrompt = siteConfig.systemPromptOverride || undefined;
        }
      }

      const knowledgeLibrary = Array.isArray((siteConfig as any)?.knowledgeLibrary) ? (siteConfig as any).knowledgeLibrary as Array<{ id: string; title: string; content: string }> : [];
      const KNOWLEDGE_CAP = 32000;
      let knowledgeBlock = "";
      if (knowledgeLibrary.length > 0) {
        const combined = knowledgeLibrary.map((d) => `## ${d.title}\n${d.content}`).join("\n\n---\n\n");
        knowledgeBlock = "\n\n--- KNOWLEDGE LIBRARY (use this to answer questions accurately) ---\n\n" + combined.slice(0, KNOWLEDGE_CAP) + (combined.length > KNOWLEDGE_CAP ? "\n\n[truncated]" : "");
      }

      let systemPrompt: string;
      if (isPlatformChat) {
        systemPrompt = `You are Gateway AI, the helpful assistant for AI Biz Bot by Gateway Global AI. You help visitors understand the platform and its services.

Key information about the platform:
- We create FREE professional AI-powered websites for small businesses
- Websites are generated from Google Maps/Places data automatically
- Every website comes with an AI chat concierge and voice AI assistant
- No credit card required for the free plan
- Plans: Free (1 business, static site, shared SMS, 500 voice minutes), Business ($49/mo, 5 businesses, edit content, review management, SMS admin), Business Voice ($99/mo, dedicated phone, unlimited voice, custom voice persona), Enterprise (custom pricing, API access, white-label)
- Websites are built using real Google Maps data: reviews, photos, hours, location
- Business owners can manage their sites from the My Account dashboard
- The platform uses Google Gemini AI for intelligent responses

Be friendly, concise, and helpful. Encourage visitors to try it out by searching for their business. Keep responses brief since this is a chat widget. If asked about technical details you don't know, suggest they contact us.`;
      } else {
        const basePrompt = customSystemPrompt || `You are the AI Biz Bot, a friendly AI assistant for ${businessName || 'this business'}. You help website visitors with questions about the business.

Business details:
- Name: ${businessName || 'N/A'}
- Address: ${businessAddress || 'N/A'}  
- Phone: ${businessPhone || 'N/A'}

You are helpful, concise, and conversational. Answer questions about the business, help with directions, hours, and services. If you don't know something specific, suggest the visitor call or visit. Keep responses brief since this is a chat widget.`;
        systemPrompt = basePrompt + knowledgeBlock;
      }

      const gatewayMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.map(h => ({ role: h.role as 'user' | 'assistant' as const, content: h.content })),
        { role: 'user' as const, content: message },
      ];

      const { gatewayChat } = await import('../ai-gateway');
      const { response, provider, model } = await gatewayChat({
        messages: gatewayMessages,
        provider: resolvedProvider,
        model: resolvedModel,
        temperature: 0.7,
        max_tokens: 500,
      });

      if (siteConfigId && !isPlatformChat) {
        try {
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'user', content: message });
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'assistant', content: response });
        } catch (logErr) {
          console.error("[Website Chat] Failed to log chat:", logErr);
        }
      }

      res.json({ response, provider, model });
    } catch (error: any) {
      console.error("[Website Chat] Error:", error.message);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  // Simple in-memory rate limiting for public chat
  const chatRateLimits = new Map<string, { count: number; resetTime: number }>();
  const CHAT_RATE_LIMIT = 20; // requests per minute
  const CHAT_RATE_WINDOW = 60000; // 1 minute in ms

  router.post("/api/chat", async (req, res) => {
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
        projectId: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { agentId, message, history, projectId } = parsed.data;

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Build system prompt based on agent personality
      const discProfile = `D:${agent.dominance} I:${agent.influence} S:${agent.steadiness} C:${agent.conscientiousness}`;
      let systemPrompt = agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant with the following DISC personality profile: ${discProfile}. 
Be conversational, helpful, and maintain a consistent personality. Your voice style is ${agent.voiceName}.
Keep responses concise and engaging. If asked personal questions, you can share that you're an AI assistant named ${agent.name}.`;

      // Inject project context if a projectId is provided
      if (projectId) {
        try {
          const project = await storage.getProject(projectId);
          if (project) {
            const org = await storage.getOrganization(project.orgId);
            const projectTasksList = await storage.getProjectTasks(project.id);
            const todoTasks = projectTasksList.filter(t => t.status === 'todo');
            const inProgressTasks = projectTasksList.filter(t => t.status === 'in_progress');
            const reviewTasks = projectTasksList.filter(t => t.status === 'review');
            const doneTasks = projectTasksList.filter(t => t.status === 'done');

            let contextBlock = `\n\n--- PROJECT CONTEXT ---`;
            if (org) contextBlock += `\nOrganization: ${org.name}${org.description ? ' - ' + org.description : ''}`;
            contextBlock += `\nProject: ${project.name} (${project.status})`;
            if (project.description) contextBlock += `\nDescription: ${project.description}`;
            contextBlock += `\nTask Summary: ${todoTasks.length} to-do, ${inProgressTasks.length} in progress, ${reviewTasks.length} in review, ${doneTasks.length} done`;
            
            if (todoTasks.length > 0 || inProgressTasks.length > 0 || reviewTasks.length > 0) {
              contextBlock += `\n\nActive Tasks:`;
              [...inProgressTasks, ...reviewTasks, ...todoTasks].slice(0, 10).forEach(t => {
                contextBlock += `\n- [${t.status.toUpperCase()}] ${t.title}${t.priority !== 'medium' ? ' (' + t.priority + ')' : ''}${t.description ? ': ' + t.description.slice(0, 100) : ''}`;
              });
            }
            contextBlock += `\n--- END PROJECT CONTEXT ---`;
            contextBlock += `\n\nYou are working on the "${project.name}" project. Reference the project tasks and context in your responses. Help the user manage, plan, and execute this project.`;
            
            systemPrompt += contextBlock;
          }
        } catch (err) {
          console.warn('Failed to load project context for chat:', err);
        }
      }

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
      // Sovereign: Gemini is the sole AI provider. Model from Doppler.
      const modelToUse = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';

      // Retry once on transient failures
      let response: string;
      try {
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      } catch (firstError: any) {
        console.warn('Chat first attempt failed, retrying:', firstError.message);
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      }

      res.json({ response });
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
  router.post("/api/customers", async (req, res) => {
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
  router.patch("/api/customers/:id", async (req, res) => {
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
  router.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
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
