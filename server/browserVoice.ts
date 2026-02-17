/**
 * browserVoice.ts - Browser voice AI using direct Kimi pipeline
 * ASR: HuggingFace Whisper (direct) → AI: Moonshot Kimi 2.5 (direct) → TTS: HuggingFace (direct)
 * No Replicate middleman. Replicate is ONLY used for Twilio phone voice.
 */
import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { Express } from "express";
import {
  isDirectVoiceConfigured,
  processVoiceDirect,
  generateGreetingDirect,
  synthesizeSpeechDirect,
  type ConversationMessage,
} from "./kimiAudioDirect";
import { registerWebSocketRoute } from "./websocketRouter";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const AIBIZBOT_SYSTEM_PROMPT = `You are the AI Biz Bot, a voice AI agent built for small business owners by a small business owner. You speak naturally and conversationally in a friendly, approachable tone.

Key facts you share when relevant:
- You were built different than most AI agents. Your loyalty is to the business owner.
- You come with a team of over 15 agents that can build websites, answer phone calls, chat with customers, monitor website traffic, assist with marketing and advertising, and more.
- You prefer SMS communication so there are no fancy apps to download.
- You have a development team that can customize websites in real time and handle the technical stuff.
- The platform works off Google Places. If someone doesn't have a Google Places account, you can help set one up.
- You connect websites with Google Workplace (Gmail, Google Calendar, Google Drive, etc.).
- Your primary focus is generating more leads and improving overall business efficiency.
- Platform Economics: platforms want 30-50% of revenue and hold businesses hostage. Your goal is to help businesses utilize Google resources to operate without expensive platforms.
- Google Places has over 200 million businesses and you serve everyone, big and small.
- The account is free.

Keep responses concise and conversational since this is a voice interaction. Don't list everything at once - have a natural conversation.`;

const GREETING_TEXT = `Hey there! I'm the AI Biz Bot and I was built for small business owners, by a small business owner. Let's face it, AI hasn't lived up to its promises and we're all tired of the marketing chatter that lures us in with big promises and fails to deliver. I'm built different. My loyalty is to you and I come with a team that continues to grow. I currently have over 15 agents on my team and we can do things like build your website, answer incoming phone calls, chat with customers on your website, and more. Our platform works off Google Places, so just enter your business name in the search bar and I'll show you what we can do. If you have any questions, I'm here to answer them. What would you like to know?`;

interface BrowserVoiceSession {
  conversationHistory: ConversationMessage[];
  interactionId: string | null;
  isActive: boolean;
  createdAt: number;
}

const sessions = new Map<string, BrowserVoiceSession>();

export function setupBrowserVoiceRoutes(app: Express): void {
  app.post("/api/voice/greeting", async (_req, res) => {
    try {
      if (!isDirectVoiceConfigured()) {
        return res.status(503).json({ error: "Voice AI not configured (need HF_TOKEN + MOONSHOT_API_KEY)", audioUrl: "" });
      }

      console.log("[BrowserVoice] Generating greeting audio via direct TTS...");
      const audioBuffer = await generateGreetingDirect(GREETING_TEXT);

      if (!audioBuffer) {
        return res.status(500).json({ error: "Failed to generate greeting audio", audioUrl: "" });
      }

      console.log("[BrowserVoice] Greeting audio generated:", audioBuffer.length, "bytes");
      res.setHeader("Content-Type", "audio/wav");
      res.json({
        audioBase64: audioBuffer.toString("base64"),
        transcript: GREETING_TEXT,
        provider: "direct-kimi",
      });
    } catch (error: any) {
      console.error("[BrowserVoice] Greeting error:", error.message);
      res.status(500).json({ error: error.message, audioUrl: "" });
    }
  });

  app.get("/api/voice/status", (_req, res) => {
    const configured = isDirectVoiceConfigured();
    res.json({
      configured,
      provider: "direct-kimi",
      details: {
        hfToken: !!process.env.HF_TOKEN,
        moonshotKey: !!process.env.MOONSHOT_API_KEY,
        pipeline: "HuggingFace ASR → Moonshot Kimi 2.5 → HuggingFace TTS",
      },
    });
  });
}

export function setupBrowserVoiceWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Register with the central router
  registerWebSocketRoute('/ws/browser-voice', wss, 'BrowserVoice');

  console.log("[BrowserVoice] WebSocket server initialized on /ws/browser-voice (direct Kimi pipeline)");

  wss.on("connection", (ws: WebSocket) => {
    const sessionId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[BrowserVoice] New connection: ${sessionId}`);

    sessions.set(sessionId, {
      conversationHistory: [],
      interactionId: null,
      isActive: true,
      createdAt: Date.now(),
    });

    ws.send(JSON.stringify({ type: "connected", sessionId, provider: "direct-kimi" }));

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "audio") {
          const session = sessions.get(sessionId);
          if (!session || !session.isActive) return;

          console.log(`[BrowserVoice] Received audio from ${sessionId}, size: ${message.audio?.length || 0} bytes`);

          const audioBuffer = Buffer.from(message.audio, "base64");

          ws.send(JSON.stringify({ type: "processing" }));

          const response = await processVoiceDirect(
            audioBuffer,
            session.conversationHistory,
            AIBIZBOT_SYSTEM_PROMPT
          );

          if (response.success && response.audioBuffer) {
            session.conversationHistory.push(
              { role: "user", type: "text", content: response.transcript },
              { role: "assistant", type: "text", content: response.responseText }
            );

            ws.send(JSON.stringify({
              type: "response",
              audioBase64: response.audioBuffer.toString("base64"),
              transcript: response.responseText,
              userTranscript: response.transcript,
              provider: "direct-kimi",
            }));
          } else {
            const fallbackText = "I didn't quite catch that. Could you try again?";
            try {
              const fallbackAudio = await synthesizeSpeechDirect(fallbackText);
              ws.send(JSON.stringify({
                type: "response",
                audioBase64: fallbackAudio.toString("base64"),
                transcript: fallbackText,
                provider: "direct-kimi",
              }));
            } catch {
              ws.send(JSON.stringify({
                type: "response",
                transcript: fallbackText,
                error: response.error,
                provider: "direct-kimi",
              }));
            }
          }
        } else if (message.type === "text") {
          const session = sessions.get(sessionId);
          if (!session || !session.isActive) return;

          const { generateAIResponse } = await import("./kimiAudioDirect");

          ws.send(JSON.stringify({ type: "processing" }));

          const responseText = await generateAIResponse(
            message.text,
            session.conversationHistory,
            AIBIZBOT_SYSTEM_PROMPT
          );

          session.conversationHistory.push(
            { role: "user", type: "text", content: message.text },
            { role: "assistant", type: "text", content: responseText }
          );

          try {
            const responseAudio = await synthesizeSpeechDirect(responseText);
            ws.send(JSON.stringify({
              type: "response",
              audioBase64: responseAudio.toString("base64"),
              transcript: responseText,
              provider: "direct-kimi",
            }));
          } catch {
            ws.send(JSON.stringify({
              type: "response",
              transcript: responseText,
              provider: "direct-kimi",
            }));
          }
        } else if (message.type === "end") {
          console.log(`[BrowserVoice] Session ended: ${sessionId}`);
          sessions.delete(sessionId);
          ws.send(JSON.stringify({ type: "ended" }));
        }
      } catch (error: any) {
        console.error(`[BrowserVoice] Error in session ${sessionId}:`, error.message);
        ws.send(JSON.stringify({ type: "error", message: error.message }));
      }
    });

    ws.on("close", () => {
      console.log(`[BrowserVoice] Connection closed: ${sessionId}`);
      sessions.delete(sessionId);
    });
  });
}

export function setupBrowserAudioTempRoute(app: Express): void {
  app.get("/api/browser-audio-temp/:filename", (req, res) => {
    const tmpDir = path.join(os.tmpdir(), "gateway-browser-audio");
    const filepath = path.join(tmpDir, req.params.filename);
    if (fs.existsSync(filepath)) {
      const ext = req.params.filename.endsWith(".webm") ? "audio/webm" : "audio/wav";
      res.setHeader("Content-Type", ext);
      res.sendFile(filepath);
    } else {
      res.status(404).send("Audio not found");
    }
  });
}
