import { z } from 'zod';

/**
 * Agent Communication Modal Types
 */
export type AgentModal = 'voice-inbound' | 'voice-outbound' | 'sms' | 'chat';

/**
 * Agent Template Schema
 * Defines the structure for configurable AI agent templates
 */
export const agentTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  modal: z.enum(['voice-inbound', 'voice-outbound', 'sms', 'chat']),
  description: z.string(),
  systemPrompt: z.string(),
  capabilities: z.array(z.string()),
  configuration: z.object({
    // Voice-specific settings
    voiceSettings: z.object({
      provider: z.enum(['kimi', 'gemini', 'replicate']).optional(),
      voice: z.string().optional(),
      speed: z.number().min(0.5).max(2.0).optional(),
      language: z.string().optional(),
    }).optional(),
    
    // Telephony settings
    telephonySettings: z.object({
      maxCallDuration: z.number().optional(), // seconds
      recordCalls: z.boolean().optional(),
      forwardingNumber: z.string().optional(),
      voicemailEnabled: z.boolean().optional(),
    }).optional(),
    
    // SMS settings
    smsSettings: z.object({
      autoReply: z.boolean().optional(),
      maxMessageLength: z.number().optional(),
      keywordTriggers: z.array(z.string()).optional(),
    }).optional(),
    
    // Chat settings
    chatSettings: z.object({
      responseDelay: z.number().optional(), // ms
      typingIndicator: z.boolean().optional(),
      suggestedReplies: z.boolean().optional(),
      maxHistoryLength: z.number().optional(),
    }).optional(),
    
    // Behavior settings
    behaviorSettings: z.object({
      greeting: z.string().optional(),
      fallbackMessage: z.string().optional(),
      escalationRules: z.array(z.object({
        condition: z.string(),
        action: z.string(),
      })).optional(),
      businessHours: z.object({
        enabled: z.boolean(),
        timezone: z.string().optional(),
        schedule: z.array(z.object({
          day: z.number(), // 0-6 (Sunday-Saturday)
          start: z.string(), // HH:MM
          end: z.string(), // HH:MM
        })).optional(),
      }).optional(),
    }).optional(),
  }).optional(),
  
  metadata: z.object({
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    version: z.string().optional(),
    isDefault: z.boolean().optional(),
  }).optional(),
});

export type AgentTemplate = z.infer<typeof agentTemplateSchema>;

/**
 * Agent Instance Schema
 * Represents a deployed instance of an agent template
 */
export const agentInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  businessId: z.string(),
  name: z.string(),
  modal: z.enum(['voice-inbound', 'voice-outbound', 'sms', 'chat']),
  isActive: z.boolean(),
  configuration: agentTemplateSchema.shape.configuration,
  performance: z.object({
    totalInteractions: z.number().optional(),
    successRate: z.number().optional(),
    averageResponseTime: z.number().optional(),
    customerSatisfaction: z.number().optional(),
  }).optional(),
  metadata: z.object({
    deployedAt: z.date().optional(),
    lastActiveAt: z.date().optional(),
    deployedBy: z.string().optional(),
  }).optional(),
});

export type AgentInstance = z.infer<typeof agentInstanceSchema>;

/**
 * Agent Swarm Configuration
 * Manages multiple agents working together
 */
export const agentSwarmSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  managerAgentId: z.string(), // AI Biz Bot as the manager
  agents: z.array(z.object({
    agentId: z.string(),
    priority: z.number(),
    roles: z.array(z.string()),
  })),
  routingRules: z.array(z.object({
    condition: z.string(),
    targetAgentId: z.string(),
    priority: z.number(),
  })),
  metadata: z.object({
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  }).optional(),
});

export type AgentSwarm = z.infer<typeof agentSwarmSchema>;
