import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { AudioBuffer, convertWavToTwilioAudio } from "./audioCodec";
import { voiceSessionManager } from "./voiceSession";
import { generateVoiceResponseGemini, synthesizeGeminiTTS, transcribeWithGemini } from "./voiceGemini";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// NOTE: KIMI is not used for voice (reserved for research and other tasks). Voice uses Gemini only.

interface TwilioStreamMessage {
  event: "connected" | "start" | "media" | "mark" | "stop";
  sequenceNumber?: string;
  streamSid?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  mark?: {
    name: string;
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}

export function setupVoiceStreamWebSocket(server: Server): void {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws/voice-stream"
  });

  console.log("[VoiceStream] WebSocket server initialized on /ws/voice-stream");

  wss.on("connection", (ws: WebSocket) => {
    console.log("[VoiceStream] New WebSocket connection");
    
    let callSid: string | null = null;
    let streamSid: string | null = null;
    let audioBuffer = new AudioBuffer();
    let processingTimeout: NodeJS.Timeout | null = null;

    ws.on("message", async (data: Buffer) => {
      try {
        const message: TwilioStreamMessage = JSON.parse(data.toString());

        switch (message.event) {
          case "connected":
            console.log("[VoiceStream] Twilio connected");
            break;

          case "start":
            if (message.start) {
              callSid = message.start.callSid;
              streamSid = message.start.streamSid;
              console.log(`[VoiceStream] Stream started - Call: ${callSid}, Stream: ${streamSid}`);
              
              const agentName = message.start.customParameters?.agentName || "AI Assistant";
              const personality = message.start.customParameters?.personality || "helpful";
              
              let session = voiceSessionManager.getSession(callSid);
              if (!session) {
                session = voiceSessionManager.createSession(callSid, agentName, personality);
              }
              session.streamSid = streamSid;
              
              sendGreeting(ws, streamSid, session.agentName);
            }
            break;

          case "media":
            if (message.media && callSid) {
              audioBuffer.addChunk(message.media.payload);
              
              if (processingTimeout) {
                clearTimeout(processingTimeout);
              }
              
              if (audioBuffer.isEndOfSpeech() && audioBuffer.hasContent()) {
                const session = voiceSessionManager.getSession(callSid);
                if (session && !session.isProcessing) {
                  processUserAudio(ws, callSid, streamSid!, audioBuffer, session);
                  audioBuffer = new AudioBuffer();
                }
              } else {
                processingTimeout = setTimeout(() => {
                  if (audioBuffer.hasContent() && audioBuffer.getDuration() > 1.0) {
                    const session = voiceSessionManager.getSession(callSid!);
                    if (session && !session.isProcessing) {
                      processUserAudio(ws, callSid!, streamSid!, audioBuffer, session);
                      audioBuffer = new AudioBuffer();
                    }
                  }
                }, 2000);
              }
            }
            break;

          case "mark":
            if (message.mark) {
              console.log(`[VoiceStream] Mark: ${message.mark.name}`);
            }
            break;

          case "stop":
            console.log(`[VoiceStream] Stream stopped for call ${callSid}`);
            if (callSid) {
              voiceSessionManager.deleteSession(callSid);
            }
            break;
        }
      } catch (error) {
        console.error("[VoiceStream] Error processing message:", error);
      }
    });

    ws.on("close", () => {
      console.log(`[VoiceStream] WebSocket closed for call ${callSid}`);
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      if (callSid) {
        voiceSessionManager.deleteSession(callSid);
      }
    });

    ws.on("error", (error) => {
      console.error("[VoiceStream] WebSocket error:", error);
    });
  });
}

async function sendGreeting(ws: WebSocket, streamSid: string, agentName: string): Promise<void> {
  // Greeting is handled by TwiML <Say> before Media Streams starts
  console.log(`[VoiceStream] Stream started for ${agentName}, TwiML greeting played`);
}

function sendAudioToTwilio(ws: WebSocket, streamSid: string, audioPayload: string): void {
  // Send audio back to Twilio via Media Streams
  // Audio must be base64-encoded μ-law at 8kHz
  const message = {
    event: "media",
    streamSid: streamSid,
    media: {
      payload: audioPayload,
    },
  };
  
  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("[VoiceStream] Error sending audio to Twilio:", error);
  }
}

function sendMarkToTwilio(ws: WebSocket, streamSid: string, name: string): void {
  // Send a mark event to track when audio playback completes
  const message = {
    event: "mark",
    streamSid: streamSid,
    mark: {
      name: name,
    },
  };
  
  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("[VoiceStream] Error sending mark to Twilio:", error);
  }
}

function sendClearToTwilio(ws: WebSocket, streamSid: string): void {
  // Clear any queued audio (for interruption handling)
  const message = {
    event: "clear",
    streamSid: streamSid,
  };
  
  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("[VoiceStream] Error sending clear to Twilio:", error);
  }
}

async function processUserAudio(
  ws: WebSocket,
  callSid: string,
  streamSid: string,
  audioBuffer: AudioBuffer,
  session: ReturnType<typeof voiceSessionManager.getSession>
): Promise<void> {
  if (!session) return;

  voiceSessionManager.setProcessing(callSid, true);

  try {
    console.log(`[VoiceStream] Processing ${audioBuffer.getDuration().toFixed(1)}s of audio for call ${callSid} (Gemini voice)`);

    const wavBuffer = audioBuffer.getWavBuffer();
    const userTranscript = await transcribeWithGemini(wavBuffer);
    if (userTranscript) {
      voiceSessionManager.addMessage(callSid, {
        role: "user",
        type: "text",
        content: userTranscript,
      });
      console.log("[VoiceStream] STT transcript:", userTranscript.substring(0, 60));
    }

    await processWithGeminiVoice(ws, callSid, streamSid, session, userTranscript || undefined);
  } catch (error) {
    console.error("[VoiceStream] Error processing audio:", error);
    await processWithGeminiVoice(ws, callSid, streamSid, session, undefined);
  } finally {
    voiceSessionManager.setProcessing(callSid, false);
  }
}

async function uploadAudioTemporarily(wavBuffer: Buffer, callSid: string): Promise<string | null> {
  try {
    const tmpDir = path.join(os.tmpdir(), "gateway-audio");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const filename = `${callSid}-${Date.now()}.wav`;
    const filepath = path.join(tmpDir, filename);
    fs.writeFileSync(filepath, wavBuffer);
    
    const host = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG 
      ? `https://${process.env.REPLIT_DEV_DOMAIN || `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`}`
      : "http://localhost:5000";
    
    return `${host}/api/audio-temp/${filename}`;
  } catch (error) {
    console.error("[VoiceStream] Error uploading audio:", error);
    return null;
  }
}

/** Gemini voice path: generate response text + TTS and send audio to Twilio. */
async function processWithGeminiVoice(
  ws: WebSocket,
  callSid: string,
  streamSid: string,
  session: ReturnType<typeof voiceSessionManager.getSession>,
  userTranscript?: string
): Promise<void> {
  if (!session) return;

  try {
    const systemPrompt = voiceSessionManager.getSystemPrompt(session);
    const history = session.conversationHistory.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "[audio]",
    }));
    const userMessage = userTranscript && userTranscript.trim() ? userTranscript.trim() : "The caller just spoke.";
    const responseText = await generateVoiceResponseGemini(systemPrompt, history, userMessage);

    console.log("[VoiceStream] Gemini response:", responseText.substring(0, 80));

    voiceSessionManager.addMessage(callSid, {
      role: "assistant",
      type: "text",
      content: responseText,
    });

    const audioBuffer = await synthesizeGeminiTTS(responseText, "Puck");
    if (audioBuffer && audioBuffer.length > 0) {
      const mulawPayload = convertWavToTwilioAudio(audioBuffer);
      const chunkSize = 640;
      for (let i = 0; i < mulawPayload.length; i += chunkSize) {
        sendAudioToTwilio(ws, streamSid, mulawPayload.slice(i, i + chunkSize));
      }
      sendMarkToTwilio(ws, streamSid, `response-${Date.now()}`);
      console.log("[VoiceStream] Sent Gemini TTS to caller");
    }
  } catch (error) {
    console.error("[VoiceStream] Gemini voice error:", error);
  }
}

export function setupAudioTempRoute(app: any): void {
  const tmpDir = path.join(os.tmpdir(), "gateway-audio");
  
  app.get("/api/audio-temp/:filename", (req: any, res: any) => {
    const filename = req.params.filename;
    const filepath = path.join(tmpDir, filename);
    
    if (fs.existsSync(filepath)) {
      res.setHeader("Content-Type", "audio/wav");
      res.sendFile(filepath);
      
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        } catch (e) {
          console.error("[VoiceStream] Error cleaning up temp audio:", e);
        }
      }, 60000);
    } else {
      res.status(404).json({ error: "Audio not found" });
    }
  });
}
