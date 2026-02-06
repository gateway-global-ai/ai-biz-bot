import type { Express, Request, Response } from "express";
import { agentSwarmManager } from "./swarm-manager";
import { businessResearchService } from "./business-research";
import { getDefaultTemplate } from "./default-templates";
import { z } from "zod";

/**
 * Agent System API Routes
 * 
 * Provides endpoints for managing agent templates, instances, swarms,
 * and business research/SWOT analysis
 */
export function registerAgentRoutes(app: Express) {
  
  // ==========================================
  // Agent Templates
  // ==========================================
  
  /**
   * Get all agent templates
   */
  app.get("/api/agents/templates", async (req: Request, res: Response) => {
    try {
      const templates = agentSwarmManager.getTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get a specific template
   */
  app.get("/api/agents/templates/:id", async (req: Request, res: Response) => {
    try {
      const template = agentSwarmManager.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Agent Instances
  // ==========================================

  /**
   * Deploy a new agent from a template
   */
  app.post("/api/agents/deploy", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        templateId: z.string(),
        businessId: z.string(),
        name: z.string(),
        customConfiguration: z.any().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const agent = agentSwarmManager.deployAgent(parsed.data);
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get all agents for a business
   */
  app.get("/api/agents/business/:businessId", async (req: Request, res: Response) => {
    try {
      const agents = agentSwarmManager.getBusinessAgents(req.params.businessId);
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get a specific agent
   */
  app.get("/api/agents/:id", async (req: Request, res: Response) => {
    try {
      const agent = agentSwarmManager.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Update agent configuration
   */
  app.patch("/api/agents/:id/configuration", async (req: Request, res: Response) => {
    try {
      const { configuration } = req.body;
      if (!configuration) {
        return res.status(400).json({ error: "Configuration is required" });
      }

      agentSwarmManager.updateAgentConfiguration(req.params.id, configuration);
      const updatedAgent = agentSwarmManager.getAgent(req.params.id);
      res.json(updatedAgent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Activate/deactivate an agent
   */
  app.patch("/api/agents/:id/status", async (req: Request, res: Response) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }

      agentSwarmManager.setAgentActive(req.params.id, isActive);
      const updatedAgent = agentSwarmManager.getAgent(req.params.id);
      res.json(updatedAgent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Update agent performance metrics
   */
  app.patch("/api/agents/:id/performance", async (req: Request, res: Response) => {
    try {
      const { performance } = req.body;
      if (!performance) {
        return res.status(400).json({ error: "Performance metrics are required" });
      }

      agentSwarmManager.updateAgentPerformance(req.params.id, performance);
      const updatedAgent = agentSwarmManager.getAgent(req.params.id);
      res.json(updatedAgent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Agent Swarms
  // ==========================================

  /**
   * Create a new agent swarm
   */
  app.post("/api/swarms", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        businessId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        managerAgentId: z.string(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const swarm = agentSwarmManager.createSwarm(parsed.data);
      res.json(swarm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get all swarms for a business
   */
  app.get("/api/swarms/business/:businessId", async (req: Request, res: Response) => {
    try {
      const swarms = agentSwarmManager.getBusinessSwarms(req.params.businessId);
      res.json(swarms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get a specific swarm
   */
  app.get("/api/swarms/:id", async (req: Request, res: Response) => {
    try {
      const swarm = agentSwarmManager.getSwarm(req.params.id);
      if (!swarm) {
        return res.status(404).json({ error: "Swarm not found" });
      }
      res.json(swarm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Add an agent to a swarm
   */
  app.post("/api/swarms/:id/agents", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        agentId: z.string(),
        priority: z.number(),
        roles: z.array(z.string()),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      agentSwarmManager.addAgentToSwarm(
        req.params.id,
        parsed.data.agentId,
        parsed.data.priority,
        parsed.data.roles
      );

      const updatedSwarm = agentSwarmManager.getSwarm(req.params.id);
      res.json(updatedSwarm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Add a routing rule to a swarm
   */
  app.post("/api/swarms/:id/routing-rules", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        condition: z.string(),
        targetAgentId: z.string(),
        priority: z.number(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      agentSwarmManager.addRoutingRule(req.params.id, parsed.data);
      const updatedSwarm = agentSwarmManager.getSwarm(req.params.id);
      res.json(updatedSwarm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Route a message to the appropriate agent
   */
  app.post("/api/swarms/:id/route", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        messageType: z.enum(['voice-inbound', 'voice-outbound', 'sms', 'chat']),
        context: z.object({
          customerIntent: z.string().optional(),
          urgency: z.enum(['low', 'medium', 'high']).optional(),
          topic: z.string().optional(),
          metadata: z.any().optional(),
        }).optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const agent = agentSwarmManager.routeMessage({
        swarmId: req.params.id,
        messageType: parsed.data.messageType,
        context: parsed.data.context || {},
      });

      if (!agent) {
        return res.status(404).json({ error: "No suitable agent found" });
      }

      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Business Research & SWOT Analysis
  // ==========================================

  /**
   * Perform deep business research
   */
  app.post("/api/business-research", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        businessId: z.string(),
        name: z.string(),
        industry: z.string(),
        location: z.object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
        }),
        contact: z.object({
          phone: z.string().optional(),
          email: z.string().optional(),
          website: z.string().optional(),
        }).optional(),
        googlePlaceId: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const insights = await businessResearchService.performDeepResearch(parsed.data);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Train agents with business insights
   */
  app.post("/api/business-research/train-agents", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        businessInsights: z.any(),
        agentIds: z.array(z.string()),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      await businessResearchService.trainAgentsWithInsights(
        parsed.data.businessInsights,
        parsed.data.agentIds
      );

      res.json({ success: true, message: `Trained ${parsed.data.agentIds.length} agents` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Quick Setup
  // ==========================================

  /**
   * Quick setup: Deploy all default agents for a business
   */
  app.post("/api/agents/quick-setup", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        businessId: z.string(),
        businessName: z.string(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { businessId, businessName } = parsed.data;

      // Deploy all 4 default agents
      const chatAgent = agentSwarmManager.deployAgent({
        templateId: 'default-chat',
        businessId,
        name: `${businessName} - Chat Agent`,
      });

      const inboundAgent = agentSwarmManager.deployAgent({
        templateId: 'default-voice-inbound',
        businessId,
        name: `${businessName} - Inbound Call Agent`,
      });

      const outboundAgent = agentSwarmManager.deployAgent({
        templateId: 'default-voice-outbound',
        businessId,
        name: `${businessName} - Outbound Call Agent`,
      });

      const smsAgent = agentSwarmManager.deployAgent({
        templateId: 'default-sms',
        businessId,
        name: `${businessName} - SMS Agent`,
      });

      // Create a swarm with AI Biz Bot as manager
      const swarm = agentSwarmManager.createSwarm({
        businessId,
        name: `${businessName} - Main Agent Swarm`,
        description: 'Primary agent swarm managed by AI Biz Bot',
        managerAgentId: 'ai-biz-bot', // This would be the actual AI Biz Bot instance ID
      });

      // Add agents to swarm
      agentSwarmManager.addAgentToSwarm(swarm.id, chatAgent.id, 10, ['customer-support', 'lead-capture']);
      agentSwarmManager.addAgentToSwarm(swarm.id, inboundAgent.id, 9, ['customer-support', 'phone-support']);
      agentSwarmManager.addAgentToSwarm(swarm.id, outboundAgent.id, 8, ['sales', 'lead-qualification']);
      agentSwarmManager.addAgentToSwarm(swarm.id, smsAgent.id, 7, ['customer-support', 'quick-responses']);

      res.json({
        swarm,
        agents: {
          chat: chatAgent,
          voiceInbound: inboundAgent,
          voiceOutbound: outboundAgent,
          sms: smsAgent,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
