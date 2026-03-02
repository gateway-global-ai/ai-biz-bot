export interface ConversationMessage { role: 'user' | 'assistant'; type: 'audio' | 'text'; content: string; }


export interface VoiceSession {
  callSid: string;
  streamSid: string | null;
  createdAt: Date;
  lastActivity: Date;
  conversationHistory: ConversationMessage[];
  interactionId: string | null;
  agentName: string;
  personality: string;
  isProcessing: boolean;
  turnCount: number;
  /** Millisecond-precision timestamp recorded when the Twilio Media Stream starts. */
  callStart: Date | null;
  /** Millisecond-precision timestamp recorded when the Twilio Media Stream stops. */
  callEnd: Date | null;
  /** Computed duration in whole seconds (callEnd - callStart). Null until call ends. */
  actualSeconds: number | null;
  /** The site/business this call belongs to – used for billing attribution. */
  siteConfigId: string | null;
}

class VoiceSessionManager {
  private sessions: Map<string, VoiceSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionTimeout = 30 * 60 * 1000;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000);
  }

  createSession(callSid: string, agentName: string = "AI Assistant", personality: string = "helpful", siteConfigId?: string | null): VoiceSession {
    const session: VoiceSession = {
      callSid,
      streamSid: null,
      createdAt: new Date(),
      lastActivity: new Date(),
      conversationHistory: [],
      interactionId: null,
      agentName,
      personality,
      isProcessing: false,
      turnCount: 0,
      callStart: null,
      callEnd: null,
      actualSeconds: null,
      siteConfigId: siteConfigId ?? null,
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

  /**
   * Start the per-call stopwatch.  Records `callStart` to the millisecond.
   */
  startCall(callSid: string): void {
    const session = this.sessions.get(callSid);
    if (session && !session.callStart) {
      session.callStart = new Date();
      session.lastActivity = new Date();
      console.log(`[VoiceSession] Stopwatch started for call ${callSid}`);
    }
  }

  /**
   * Stop the per-call stopwatch.  Records `callEnd` and computes `actualSeconds`
   * from the difference between `callEnd` and `callStart`.
   * Returns the elapsed seconds (0 if callStart was never set).
   */
  stopCall(callSid: string): number {
    const session = this.sessions.get(callSid);
    if (!session) return 0;
    session.callEnd = new Date();
    session.lastActivity = new Date();
    if (session.callStart) {
      session.actualSeconds = Math.round(
        (session.callEnd.getTime() - session.callStart.getTime()) / 1000
      );
    } else {
      session.actualSeconds = 0;
    }
    console.log(
      `[VoiceSession] Stopwatch stopped for call ${callSid}: ${session.actualSeconds}s`
    );
    return session.actualSeconds;
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
