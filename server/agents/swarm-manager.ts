import type { AgentInstance, AgentSwarm, AgentTemplate } from './agent-types';
import { DEFAULT_AGENT_TEMPLATES } from './default-templates';

/**
 * Agent Swarm Manager
 * 
 * Manages a swarm of AI agents, with the AI Biz Bot acting as the orchestrator.
 * Handles agent delegation, routing, and configuration.
 */
export class AgentSwarmManager {
  private agents: Map<string, AgentInstance> = new Map();
  private swarms: Map<string, AgentSwarm> = new Map();
  private templates: Map<string, AgentTemplate> = new Map();

  constructor() {
    // Load default templates
    this.loadDefaultTemplates();
  }

  /**
   * Load default agent templates into the manager
   */
  private loadDefaultTemplates() {
    Object.values(DEFAULT_AGENT_TEMPLATES).forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Create a new agent swarm for a business
   */
  createSwarm(params: {
    businessId: string;
    name: string;
    description?: string;
    managerAgentId: string;
  }): AgentSwarm {
    const swarm: AgentSwarm = {
      id: `swarm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      businessId: params.businessId,
      name: params.name,
      description: params.description,
      managerAgentId: params.managerAgentId,
      agents: [],
      routingRules: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    this.swarms.set(swarm.id, swarm);
    return swarm;
  }

  /**
   * Deploy an agent instance from a template
   */
  deployAgent(params: {
    templateId: string;
    businessId: string;
    name: string;
    customConfiguration?: Partial<AgentTemplate['configuration']>;
  }): AgentInstance {
    const template = this.templates.get(params.templateId);
    if (!template) {
      throw new Error(`Template ${params.templateId} not found`);
    }

    const agent: AgentInstance = {
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateId: params.templateId,
      businessId: params.businessId,
      name: params.name,
      modal: template.modal,
      isActive: true,
      configuration: {
        ...template.configuration,
        ...params.customConfiguration,
      },
      performance: {
        totalInteractions: 0,
        successRate: 0,
        averageResponseTime: 0,
        customerSatisfaction: 0,
      },
      metadata: {
        deployedAt: new Date(),
        lastActiveAt: new Date(),
      },
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Add an agent to a swarm
   */
  addAgentToSwarm(swarmId: string, agentId: string, priority: number, roles: string[]) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    swarm.agents.push({
      agentId,
      priority,
      roles,
    });

    swarm.metadata = {
      ...swarm.metadata,
      updatedAt: new Date(),
    };
  }

  /**
   * Route a message to the appropriate agent based on rules
   */
  routeMessage(params: {
    swarmId: string;
    messageType: 'voice-inbound' | 'voice-outbound' | 'sms' | 'chat';
    context: {
      customerIntent?: string;
      urgency?: 'low' | 'medium' | 'high';
      topic?: string;
      metadata?: Record<string, any>;
    };
  }): AgentInstance | null {
    const swarm = this.swarms.get(params.swarmId);
    if (!swarm) {
      return null;
    }

    // Find agents in the swarm matching the message type
    const matchingAgents = swarm.agents
      .map(sa => this.agents.get(sa.agentId))
      .filter(agent => agent && agent.modal === params.messageType)
      .filter(agent => agent!.isActive);

    if (matchingAgents.length === 0) {
      return null;
    }

    // Apply routing rules
    for (const rule of swarm.routingRules) {
      if (this.evaluateRoutingCondition(rule.condition, params.context)) {
        const targetAgent = this.agents.get(rule.targetAgentId);
        if (targetAgent && targetAgent.isActive) {
          return targetAgent;
        }
      }
    }

    // Default: return highest priority agent of the matching type
    const sortedAgents = swarm.agents
      .filter(sa => {
        const agent = this.agents.get(sa.agentId);
        return agent && agent.modal === params.messageType && agent.isActive;
      })
      .sort((a, b) => b.priority - a.priority);

    if (sortedAgents.length > 0) {
      return this.agents.get(sortedAgents[0].agentId) || null;
    }

    return matchingAgents[0] || null;
  }

  /**
   * Evaluate routing condition (simple string matching for now)
   */
  private evaluateRoutingCondition(condition: string, context: any): boolean {
    // Simple keyword matching - can be enhanced with more sophisticated logic
    const lowerCondition = condition.toLowerCase();
    
    if (context.customerIntent && lowerCondition.includes(context.customerIntent.toLowerCase())) {
      return true;
    }
    
    if (context.urgency && lowerCondition.includes(context.urgency)) {
      return true;
    }
    
    if (context.topic && lowerCondition.includes(context.topic.toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * Add a routing rule to a swarm
   */
  addRoutingRule(swarmId: string, rule: AgentSwarm['routingRules'][number]) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    swarm.routingRules.push(rule);
    swarm.routingRules.sort((a, b) => b.priority - a.priority);
    
    swarm.metadata = {
      ...swarm.metadata,
      updatedAt: new Date(),
    };
  }

  /**
   * Update agent configuration
   */
  updateAgentConfiguration(
    agentId: string,
    configuration: Partial<AgentTemplate['configuration']>
  ) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.configuration = {
      ...agent.configuration,
      ...configuration,
    };

    if (agent.metadata) {
      agent.metadata.lastActiveAt = new Date();
    }
  }

  /**
   * Update agent system prompt
   */
  updateAgentSystemPrompt(agentId: string, systemPrompt: string) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Store the custom system prompt in the agent's configuration
    // rather than mutating the shared template
    if (!agent.configuration) {
      agent.configuration = {};
    }
    
    // Store as a custom configuration property
    (agent.configuration as any).customSystemPrompt = systemPrompt;
    
    if (agent.metadata) {
      agent.metadata.lastActiveAt = new Date();
    }
  }

  /**
   * Get all agents for a business
   */
  getBusinessAgents(businessId: string): AgentInstance[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.businessId === businessId
    );
  }

  /**
   * Get all swarms for a business
   */
  getBusinessSwarms(businessId: string): AgentSwarm[] {
    return Array.from(this.swarms.values()).filter(
      swarm => swarm.businessId === businessId
    );
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get swarm by ID
   */
  getSwarm(swarmId: string): AgentSwarm | undefined {
    return this.swarms.get(swarmId);
  }

  /**
   * Get all available templates
   */
  getTemplates(): AgentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): AgentTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Activate/deactivate an agent
   */
  setAgentActive(agentId: string, isActive: boolean) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.isActive = isActive;
    
    if (agent.metadata) {
      agent.metadata.lastActiveAt = new Date();
    }
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(
    agentId: string,
    metrics: Partial<AgentInstance['performance']>
  ) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.performance = {
      ...agent.performance,
      ...metrics,
    };
  }
}

// Export singleton instance
export const agentSwarmManager = new AgentSwarmManager();
