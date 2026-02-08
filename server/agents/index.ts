/**
 * Agent System - Main Exports
 * 
 * Central export point for the AI Agent Swarm System
 */

export * from './agent-types';
export * from './default-templates';
export * from './specialized-agents';
export * from './swarm-manager';
export * from './business-research';
export * from './agent-testing';

export { agentSwarmManager } from './swarm-manager';
export { businessResearchService } from './business-research';
export { agentTestingService } from './agent-testing';
export { DEFAULT_AGENT_TEMPLATES, getDefaultTemplate } from './default-templates';
export { SPECIALIZED_AGENT_TEMPLATES, getSpecializedTemplate, getAllSpecializedTemplates } from './specialized-agents';
