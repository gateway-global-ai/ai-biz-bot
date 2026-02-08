/**
 * Twilio Voice AI Integration Server
 * Handles incoming calls and streams audio to/from AI providers
 */

import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import twilio from 'twilio';
import { VoiceAI } from '../src/voice-ai-sdk';
import { VoiceConfig, RealtimeVoiceOptions, WebSocketMessage } from '../src/types';

// Load environment variables
require('dotenv').config();

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl: string;
}

interface CallSession {
  callSid: string;
  from: string;
  to: string;
  streamSid?: string;
  aiConnection?: any;
  audioBuffer: Buffer[];
  transcript: Array<{role: 'user' | 'assistant'; content: string}>;
  startTime: Date;
}

class TwilioVoiceServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private twilioClient: twilio.Twilio;
  private voiceAI: VoiceAI;
  private sessions: Map<string, CallSession> = new Map();
  private config: {
    twilio: TwilioConfig;
    ai: VoiceConfig;
  };

  constructor(config: { twilio: TwilioConfig; ai: VoiceConfig }) {
    this.config = config;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    
    // Initialize Voice AI SDK
    this.voiceAI = new VoiceAI({
      defaultProvider: config.ai.provider,
      providers: {
        [config.ai.provider]: config.ai
      }
    });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Incoming call webhook
    this.app.post('/voice/incoming', (req, res) => {
      const callSid = req.body.CallSid;
      const from = req.body.From;
      const to = req.body.To;

      console.log(`[Twilio] Incoming call: ${callSid} from ${from}`);

      // Create call session
      this.sessions.set(callSid, {
        callSid,
        from,
        to,
        audioBuffer: [],
        transcript: [],
        startTime: new Date()
      });

      // Generate TwiML response
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Connect to media stream
      const connect = twiml.connect();
      connect.stream({
        url: `wss://${req.headers.host}/voice/stream`,
        track: 'both_tracks'
      });

      // Greeting message
      twiml.say('Connecting you to our AI assistant. Please speak after the beep.');
      twiml.play({ digits: '1' });

      res.type('text/xml');
      res.send(twiml.toString());
    });

    // Call status webhook
    this.app.post('/voice/status', (req, res) => {
      const callSid = req.body.CallSid;
      const status = req.body.CallStatus;

      console.log(`[Twilio] Call ${callSid} status: ${status}`);

      if (status === 'completed' || status === 'failed' || status === 'busy') {
        this.cleanupSession(callSid);
      }

      res.sendStatus(200);
    });

    // Outbound call API
    this.app.post('/voice/call', async (req, res) => {
      const { to, greeting, systemPrompt } = req.body;

      try {
        const call = await this.twilioClient.calls.create({
          to,
          from: this.config.twilio.phoneNumber,
          url: `https://${req.headers.host}/voice/outbound?greeting=${encodeURIComponent(greeting || '')}&prompt=${encodeURIComponent(systemPrompt || '')}`,
          statusCallback: `https://${req.headers.host}/voice/status`,
          statusCallbackEvent: ['completed', 'failed', 'busy'],
          statusCallbackMethod: 'POST'
        });

        res.json({ success: true, callSid: call.sid });
      } catch (error) {
        console.error('[Twilio] Error making call:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    });

    // Outbound call TwiML
    this.app.post('/voice/outbound', (req, res) => {
      const greeting = req.query.greeting as string;
      const prompt = req.query.prompt as string;

      const twiml = new twilio.twiml.VoiceResponse();
      
      if (greeting) {
        twiml.say(greeting);
      }

      const connect = twiml.connect();
      connect.stream({
        url: `wss://${req.headers.host}/voice/stream?prompt=${encodeURIComponent(prompt || '')}`,
        track: 'both_tracks'
      });

      res.type('text/xml');
      res.send(twiml.toString());
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('[WebSocket] New connection');

      let session: CallSession | null = null;
      let aiConnection: any = null;

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.event) {
            case 'start':
              // Stream started
              const callSid = message.start.callSid;
              session = this.sessions.get(callSid) || null;
              
              if (session) {
                session.streamSid = message.start.streamSid;
                
                // Initialize AI connection
                const prompt = new URL(req.url || '', 'http://localhost').searchParams.get('prompt') || 
                  'You are a helpful voice assistant. Keep responses concise and natural.';
                
                aiConnection = await this.initializeAIConnection(ws, prompt);
                session.aiConnection = aiConnection;
              }
              break;

            case 'media':
              // Received audio from caller
              if (session && aiConnection) {
                const audioData = Buffer.from(message.media.payload, 'base64');
                
                // Send to AI
                if (aiConnection.sendAudio) {
                  await aiConnection.sendAudio(audioData);
                }
              }
              break;

            case 'stop':
              // Stream ended
              if (session) {
                await this.cleanupSession(session.callSid);
              }
              ws.close();
              break;

            case 'mark':
              // Mark event (for synchronization)
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Error handling message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Connection closed');
        if (session) {
          this.cleanupSession(session.callSid);
        }
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });
    });
  }

  private async initializeAIConnection(ws: WebSocket, systemPrompt: string): Promise<any> {
    const provider = this.config.ai.provider;

    try {
      const connection = await this.voiceAI.connectRealtime({
        systemPrompt,
        voice: this.config.ai.voice,
        onUserTranscript: (text) => {
          console.log('[AI] User:', text);
        },
        onAgentTranscript: (text) => {
          console.log('[AI] Agent:', text);
        },
        onAudioChunk: (chunk) => {
          // Send audio back to Twilio
          const message = {
            event: 'media',
            streamSid: '', // Will be set from session
            media: {
              payload: chunk.toString('base64')
            }
          };
          ws.send(JSON.stringify(message));
        },
        onError: (error) => {
          console.error('[AI] Error:', error);
        },
        onConnect: () => {
          console.log('[AI] Connected');
        },
        onDisconnect: () => {
          console.log('[AI] Disconnected');
        }
      });

      return connection;
    } catch (error) {
      console.error('[AI] Failed to connect:', error);
      throw error;
    }
  }

  private async cleanupSession(callSid: string): Promise<void> {
    const session = this.sessions.get(callSid);
    if (session) {
      if (session.aiConnection) {
        await session.aiConnection.disconnect?.();
      }
      
      // Log call stats
      const duration = (new Date().getTime() - session.startTime.getTime()) / 1000;
      console.log(`[Call] ${callSid} ended. Duration: ${duration}s`);
      
      this.sessions.delete(callSid);
    }
  }

  async start(port: number): Promise<void> {
    // Initialize Voice AI
    await this.voiceAI.initialize();

    // Start server
    this.server.listen(port, () => {
      console.log(`[Server] Twilio Voice Server running on port ${port}`);
      console.log(`[Server] Webhook URL: ${this.config.twilio.webhookUrl}`);
    });
  }

  async stop(): Promise<void> {
    // Close all WebSocket connections
    this.wss.close();
    
    // Close HTTP server
    this.server.close();
    
    // Dispose Voice AI
    await this.voiceAI.dispose();
    
    console.log('[Server] Stopped');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new TwilioVoiceServer({
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
    },
    ai: {
      provider: (process.env.AI_PROVIDER as any) || 'openai',
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL,
      voice: process.env.AI_VOICE
    }
  });

  const PORT = parseInt(process.env.PORT || '3000');
  server.start(PORT);
}

export { TwilioVoiceServer };
export default TwilioVoiceServer;
