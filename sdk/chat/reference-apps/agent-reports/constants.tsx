
import { AgentConfig } from "./types";

export const COLORS = {
  D: '#ef4444', // Red
  I: '#f59e0b', // Amber
  S: '#10b981', // Emerald
  C: '#3b82f6', // Blue
  A: '#8b5cf6', // Violet
  R: '#06b6d4', // Cyan
  Cx: '#6366f1', // Indigo
  H: '#ec4899', // Pink
  G: '#22c55e', // Grounding Green
  
  // Brand Awareness
  BD: '#94a3b8', // Business Details
  EN: '#fbbf24', // Enthusiasm
  EV: '#2dd4bf', // Environment
  EX: '#a855f7', // Experience
  PA: '#10b981', // Pay
};

export const INITIAL_CONFIG: AgentConfig = {
  name: "Customer Success Voyager",
  companyName: "Gateway Global",
  voiceName: "Zephyr",
  roleDescription: "A standard customer success agent.",
  disc: {
    dominance: 25,
    influence: 45,
    steadiness: 60,
    conscientiousness: 40,
  },
  arch: {
    acknowledge: 20,
    reflect: 25,
    context: 40,
    handoff: 15,
  },
  brand: {
    businessDetails: 50,
    enthusiasm: 40,
    environment: 30,
    experience: 60,
    pay: 20,
  },
  groundingFocus: 50,
  tools: ["Gemini Search"],
  telephony: {
    phoneNumber: null,
    allowedNumbers: [],
    callHistory: [],
    firewallEnabled: true,
    maxCallDuration: 60,
    timeout: 30,
    twilio: {
        friendlyName: 'AI Agent Trunk',
        voiceUrl: 'https://api.agent-host.com/v1/voice',
        statusCallbackUrl: 'https://api.agent-host.com/v1/status'
    }
  }
};
