import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { AudioBuffer, convertWavToTwilioAudio } from "./audioCodec";
import { voiceSessionManager } from "./voiceSession";
import { processAudioWithKimi, generateSpeech, isKimiAudioConfigured } from "./kimiAudioReplicate";
import { generateVoiceResponse } from "./kimi";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
              
              const agentName = message.start.customParameters?.agentName || "Kimi";
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
  // Note: Greeting is handled by TwiML <Say> element before Media Streams starts
  // This function is reserved for future custom audio greetings via Kimi-Audio TTS
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
    console.log(`[VoiceStream] Processing ${audioBuffer.getDuration().toFixed(1)}s of audio for call ${callSid}`);
    
    const wavBuffer = audioBuffer.getWavBuffer();
    
    if (isKimiAudioConfigured()) {
      const audioUrl = await uploadAudioTemporarily(wavBuffer, callSid);
      
      if (audioUrl) {
        console.log("[VoiceStream] Uploaded audio to:", audioUrl);
        
        const systemPrompt = voiceSessionManager.getSystemPrompt(session);
        const response = await processAudioWithKimi(
          audioUrl,
          session.conversationHistory,
          systemPrompt
        );
        
        if (response.success) {
          voiceSessionManager.addMessage(callSid, {
            role: "user",
            type: "audio",
            content: audioUrl,
          });
          
          if (response.transcript) {
            voiceSessionManager.addMessage(callSid, {
              role: "assistant",
              type: "text",
              content: response.transcript,
            });
          }
          
          // If we got audio response, download and send back to Twilio
          if (response.audioUrl) {
            console.log("[VoiceStream] Got Kimi-Audio response, downloading...");
            try {
              const audioResponse = await fetch(response.audioUrl);
              if (audioResponse.ok) {
                const responseWavBuffer = Buffer.from(await audioResponse.arrayBuffer());
                const mulawPayload = convertWavToTwilioAudio(responseWavBuffer);
                
                // Send audio in chunks to avoid overwhelming the WebSocket
                const chunkSize = 640; // 80ms of audio at 8kHz
                for (let i = 0; i < mulawPayload.length; i += chunkSize) {
                  const chunk = mulawPayload.slice(i, i + chunkSize);
                  sendAudioToTwilio(ws, streamSid, chunk);
                }
                
                // Send mark to know when playback is done
                sendMarkToTwilio(ws, streamSid, `response-${Date.now()}`);
                console.log("[VoiceStream] Sent Kimi-Audio response to caller");
                return;
              }
            } catch (downloadError) {
              console.error("[VoiceStream] Error downloading Kimi-Audio response:", downloadError);
            }
          }
          
          // If we have transcript but no audio, use text fallback
          if (response.transcript) {
            console.log("[VoiceStream] Using transcript for text fallback");
          }
          return;
        }
      }
    }
    
    console.log("[VoiceStream] Falling back to text-based response");
    await processWithTextFallback(ws, callSid, streamSid, session);
    
  } catch (error) {
    console.error("[VoiceStream] Error processing audio:", error);
    await processWithTextFallback(ws, callSid, streamSid, session);
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

async function processWithTextFallback(
  ws: WebSocket,
  callSid: string,
  streamSid: string,
  session: ReturnType<typeof voiceSessionManager.getSession>
): Promise<void> {
  if (!session) return;
  
  try {
    const systemPrompt = voiceSessionManager.getSystemPrompt(session);
    const responseText = await generateVoiceResponse(
      "I'm listening. Please continue.",
      session.conversationHistory.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : 'audio'
      })),
      {
        D: 50,
        I: 50,
        S: 50,
        C: 50
      }
    );
    
    console.log("[VoiceStream] Generated text response:", responseText.substring(0, 100));
    
    voiceSessionManager.addMessage(callSid, {
      role: "assistant",
      type: "text",
      content: responseText,
    });
    
  } catch (error) {
    console.error("[VoiceStream] Text fallback error:", error);
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
