/**
 * Agent System - Main Exports
 * 
 * Central export point for the AI Agent Swarm System
 */

export * from './agent-types';
export * from './default-templates';
export * from './swarm-manager';
export * from './business-research';

export { agentSwarmManager } from './swarm-manager';
export { businessResearchService } from './business-research';
export { DEFAULT_AGENT_TEMPLATES, getDefaultTemplate } from './default-templates';
