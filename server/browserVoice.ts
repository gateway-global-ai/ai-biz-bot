import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { Express } from "express";
import { generateSpeech, processAudioWithKimi, isKimiAudioConfigured, type ConversationMessage } from "./kimiAudio";
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
  isActive: boolean;
  createdAt: number;
}

const sessions = new Map<string, BrowserVoiceSession>();

export function setupBrowserVoiceRoutes(app: Express): void {
  app.post("/api/voice/greeting", async (_req, res) => {
    try {
      if (!isKimiAudioConfigured()) {
        return res.status(503).json({ error: "Voice AI not configured", audioUrl: "" });
      }

      console.log("[BrowserVoice] Generating greeting audio...");
      const audioUrl = await generateSpeech(GREETING_TEXT, "friendly");

      if (!audioUrl) {
        return res.status(500).json({ error: "Failed to generate greeting audio", audioUrl: "" });
      }

      console.log("[BrowserVoice] Greeting audio generated:", audioUrl);
      res.json({ audioUrl, transcript: GREETING_TEXT });
    } catch (error: any) {
      console.error("[BrowserVoice] Greeting error:", error.message);
      res.status(500).json({ error: error.message, audioUrl: "" });
    }
  });

  app.get("/api/voice/status", (_req, res) => {
    res.json({ 
      configured: isKimiAudioConfigured(),
      provider: "kimi-audio"
    });
  });
}

export function setupBrowserVoiceWebSocket(server: Server): void {
  const wss = new WebSocketServer({
    server,
    path: "/ws/browser-voice"
  });

  console.log("[BrowserVoice] WebSocket server initialized on /ws/browser-voice");

  wss.on("connection", (ws: WebSocket) => {
    const sessionId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[BrowserVoice] New connection: ${sessionId}`);

    sessions.set(sessionId, {
      conversationHistory: [],
      isActive: true,
      createdAt: Date.now(),
    });

    ws.send(JSON.stringify({ type: "connected", sessionId }));

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "audio") {
          const session = sessions.get(sessionId);
          if (!session || !session.isActive) return;

          console.log(`[BrowserVoice] Received audio from ${sessionId}, size: ${message.audio?.length || 0} bytes`);

          const audioBuffer = Buffer.from(message.audio, "base64");
          const audioUrl = await uploadBrowserAudio(audioBuffer, sessionId);

          if (!audioUrl) {
            ws.send(JSON.stringify({ type: "error", message: "Failed to process audio" }));
            return;
          }

          ws.send(JSON.stringify({ type: "processing" }));

          const response = await processAudioWithKimi(
            audioUrl,
            session.conversationHistory,
            AIBIZBOT_SYSTEM_PROMPT
          );

          if (response.success && response.audioUrl) {
            session.conversationHistory.push(
              { role: "user", type: "audio", content: audioUrl },
              { role: "assistant", type: "audio", content: response.audioUrl }
            );

            ws.send(JSON.stringify({
              type: "response",
              audioUrl: response.audioUrl,
              transcript: response.transcript,
            }));
          } else {
            const fallbackText = "I didn't quite catch that. Could you try again?";
            const fallbackAudio = await generateSpeech(fallbackText, "friendly");
            ws.send(JSON.stringify({
              type: "response",
              audioUrl: fallbackAudio || "",
              transcript: fallbackText,
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

async function uploadBrowserAudio(audioBuffer: Buffer, sessionId: string): Promise<string | null> {
  try {
    const tmpDir = path.join(os.tmpdir(), "gateway-browser-audio");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const filename = `${sessionId}-${Date.now()}.webm`;
    const filepath = path.join(tmpDir, filename);
    fs.writeFileSync(filepath, audioBuffer);

    const host = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

    return `${host}/api/browser-audio-temp/${filename}`;
  } catch (error) {
    console.error("[BrowserVoice] Error uploading audio:", error);
    return null;
  }
}

export function setupBrowserAudioTempRoute(app: Express): void {
  app.get("/api/browser-audio-temp/:filename", (req, res) => {
    const tmpDir = path.join(os.tmpdir(), "gateway-browser-audio");
    const filepath = path.join(tmpDir, req.params.filename);
    if (fs.existsSync(filepath)) {
      const ext = req.params.filename.endsWith('.webm') ? 'audio/webm' : 'audio/wav';
      res.setHeader("Content-Type", ext);
      res.sendFile(filepath);
    } else {
      res.status(404).send("Audio not found");
    }
  });
}
