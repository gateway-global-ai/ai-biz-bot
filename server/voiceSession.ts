import { ConversationMessage } from "./kimiAudioReplicate";

export interface VoiceSession {
  callSid: string;
  streamSid: string | null;
  createdAt: Date;
  lastActivity: Date;
  conversationHistory: ConversationMessage[];
  agentName: string;
  personality: string;
  isProcessing: boolean;
  turnCount: number;
}

class VoiceSessionManager {
  private sessions: Map<string, VoiceSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionTimeout = 30 * 60 * 1000;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000);
  }

  createSession(callSid: string, agentName: string = "AI Assistant", personality: string = "helpful"): VoiceSession {
    const session: VoiceSession = {
      callSid,
      streamSid: null,
      createdAt: new Date(),
      lastActivity: new Date(),
      conversationHistory: [],
      agentName,
      personality,
      isProcessing: false,
      turnCount: 0,
    };
    this.sessions.set(callSid, session);
    console.log(`[VoiceSession] Created session for call ${callSid}`);
    return session;
  }

  getSession(callSid: string): VoiceSession | undefined {
    const session = this.sessions.get(callSid);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  updateSession(callSid: string, updates: Partial<VoiceSession>): VoiceSession | undefined {
    const session = this.sessions.get(callSid);
    if (session) {
      Object.assign(session, updates, { lastActivity: new Date() });
      this.sessions.set(callSid, session);
    }
    return session;
  }

  addMessage(callSid: string, message: ConversationMessage): void {
    const session = this.sessions.get(callSid);
    if (session) {
      session.conversationHistory.push(message);
      session.lastActivity = new Date();
      if (message.role === "user") {
        session.turnCount++;
      }
    }
  }

  setProcessing(callSid: string, isProcessing: boolean): void {
    const session = this.sessions.get(callSid);
    if (session) {
      session.isProcessing = isProcessing;
      session.lastActivity = new Date();
    }
  }

  deleteSession(callSid: string): boolean {
    console.log(`[VoiceSession] Deleting session for call ${callSid}`);
    return this.sessions.delete(callSid);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getAllSessions(): VoiceSession[] {
    return Array.from(this.sessions.values());
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.sessions.entries());
    for (let i = 0; i < entries.length; i++) {
      const [callSid, session] = entries[i];
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        this.sessions.delete(callSid);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[VoiceSession] Cleaned up ${cleaned} stale sessions`);
    }
  }

  getSystemPrompt(session: VoiceSession): string {
    return `You are ${session.agentName}, a ${session.personality} AI voice assistant from Gateway Global AI. 

Key behaviors:
- Keep responses concise and conversational (under 100 words)
- Speak naturally as if having a phone conversation
- Be warm, helpful, and attentive
- Ask follow-up questions to understand the caller's needs
- If asked about your capabilities, explain you can help with tasks, answer questions, and have natural conversations

This is turn ${session.turnCount + 1} of the conversation. Be consistent with previous exchanges.`;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}

export const voiceSessionManager = new VoiceSessionManager();
