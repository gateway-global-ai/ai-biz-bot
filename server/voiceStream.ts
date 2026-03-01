import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { decodeMulaw, encodeMulaw, resampleLinear } from "./audioCodec";
import { voiceSessionManager } from "./voiceSession";
import { registerWebSocketRoute } from "./websocketRouter";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// NOTE: KIMI is not used for voice (reserved for research and other tasks). Voice uses Gemini only.

/**
 * Gemini Live API WebSocket URL.
 * Falls back to the same env var used by the browser-facing proxy (geminiVoice.ts).
 */
const GEMINI_LIVE_WS_URL =
  process.env.GEMINI_WS_URL ||
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

/**
 * Gemini model that supports real-time bidirectional audio (Clear Voice).
 * Uses GEMINI_MODEL_ID so the deployment controls the model without a code change.
 */
const GEMINI_LIVE_MODEL =
  process.env.GEMINI_MODEL_ID || "gemini-2.0-flash-live-001";

interface TwilioStreamMessage {
  event: "connected" | "start" | "media" | "mark" | "stop" | "dtmf";
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
  /** DTMF digit events from Twilio (keypad presses during a media stream) */
  dtmf?: {
    digit: string;
    duration: number;
  };
}

export function setupVoiceStreamWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Register with the central router
  registerWebSocketRoute("/ws/voice-stream", wss, "VoiceStream");

  console.log("[VoiceStream] WebSocket server initialized on /ws/voice-stream");

  wss.on("connection", (ws: WebSocket) => {
    console.log("[VoiceStream] New WebSocket connection");

    let callSid: string | null = null;
    let streamSid: string | null = null;
    let geminiWs: WebSocket | null = null;
    let geminiReady = false;
    /** μ-law payloads queued while the Gemini Live session is still in setup. */
    const audioQueue: string[] = [];
    let callEndHandled = false;
    /** Optional system prompt override (set by jail/custom webhook via TwiML parameter). */
    let systemPromptOverride: string | null = null;

    // ── Push-to-Talk (PTT) DTMF Gate ─────────────────────────────────────────
    // Enabled when customParameters.ptt === "1" (set in TwiML <Stream>).
    // Press "1" to open mic → audio flows to Gemini.
    // Press "1" again to close mic → sends end-of-utterance so Gemini responds.
    let pttEnabled = false;
    let isMicOpen = false;

    /** Open a persistent WebSocket to the Gemini Live API and wire up audio relay. */
    function openGeminiLive(agentName: string, personality: string): void {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[VoiceStream] GEMINI_API_KEY not set – cannot open Gemini Live");
        return;
      }

      const geminiUrl = `${GEMINI_LIVE_WS_URL}?key=${apiKey}`;
      geminiWs = new WebSocket(geminiUrl);

      geminiWs.on("open", () => {
        console.log(`[VoiceStream] Gemini Live WebSocket connected for call ${callSid}`);

        // Send setup: choose a natural voice and provide the agent persona.
        const setup = {
          setup: {
            model: GEMINI_LIVE_MODEL,
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: { voice_name: "Puck" },
                },
              },
            },
            system_instruction: {
              parts: [
                {
                  text: systemPromptOverride ??
                    `You are ${agentName}, a ${personality} AI voice assistant from Gateway Global AI.
Keep responses concise and conversational (under 100 words).
Speak naturally as if on a phone call. Be warm and attentive.`,
                },
              ],
            },
          },
        };

        geminiWs!.send(JSON.stringify(setup));
      });

      geminiWs.on("message", (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.setupComplete) {
            console.log(`[VoiceStream] Gemini Live setup complete for call ${callSid}`);
            geminiReady = true;
            // Flush any audio that arrived before setup completed
            if (audioQueue.length > 0) {
              console.log(`[VoiceStream] Flushing ${audioQueue.length} queued audio chunks`);
              for (const payload of audioQueue) {
                sendAudioToGemini(payload);
              }
              audioQueue.length = 0;
            }
            return;
          }

          // Relay AI audio back to Twilio
          const parts =
            msg.serverContent?.modelTurn?.parts ??
            msg.serverContent?.outputTranscription?.parts ??
            [];

          for (const part of parts) {
            if (part.inlineData?.data) {
              const mimeType: string = part.inlineData.mimeType || "";
              const rawSampleRate = mimeType.match(/rate=(\d+)/)?.[1];
              const sampleRate = rawSampleRate ? parseInt(rawSampleRate, 10) : 24000;
              const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
              const pcm = new Int16Array(
                pcmBuffer.buffer,
                pcmBuffer.byteOffset,
                pcmBuffer.byteLength / 2
              );
              // Downsample from Gemini's output rate to 8kHz for Twilio
              const pcm8k = resampleLinear(pcm, sampleRate, 8000);
              const mulaw = encodeMulaw(pcm8k);
              if (streamSid && ws.readyState === WebSocket.OPEN) {
                sendAudioToTwilio(ws, streamSid, mulaw.toString("base64"));
              }
            }
          }
        } catch (parseErr: any) {
          // Gemini may send binary heartbeat frames that are not JSON – ignore those.
          // For genuine parse errors on text frames, log them for debugging.
          if (typeof data === "string" || (data instanceof Buffer && data[0] === 0x7b /* '{' */)) {
            console.error("[VoiceStream] Failed to parse Gemini message:", parseErr.message);
          }
        }
      });

      geminiWs.on("error", (err) => {
        console.error(`[VoiceStream] Gemini Live error for call ${callSid}:`, err.message);
      });

      geminiWs.on("close", (code) => {
        console.log(`[VoiceStream] Gemini Live closed for call ${callSid} (code ${code})`);
        geminiWs = null;
        geminiReady = false;
      });
    }

    /** Forward a single μ-law base64 payload to Gemini Live as PCM 16kHz. */
    function sendAudioToGemini(base64Mulaw: string): void {
      if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) return;

      const mulawBuffer = Buffer.from(base64Mulaw, "base64");
      const pcm8k = decodeMulaw(mulawBuffer);
      const pcm16k = resampleLinear(pcm8k, 8000, 16000);
      const pcmBuf = Buffer.from(pcm16k.buffer, pcm16k.byteOffset, pcm16k.byteLength);
      const base64Pcm = pcmBuf.toString("base64");

      geminiWs.send(
        JSON.stringify({
          realtime_input: {
            media_chunks: [
              {
                mime_type: "audio/pcm;rate=16000",
                data: base64Pcm,
              },
            ],
          },
        })
      );
    }

    /** Handle call end once: stop the stopwatch and persist to DB. */
    async function handleCallEnd(): Promise<void> {
      if (callEndHandled || !callSid) return;
      callEndHandled = true;

      const actualSeconds = voiceSessionManager.stopCall(callSid);
      const session = voiceSessionManager.getSession(callSid);
      if (session) {
        await persistCallCompletion(callSid, session, actualSeconds);
      }
      voiceSessionManager.deleteSession(callSid);

      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close(1000, "Call ended");
      }
    }

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
              const params = message.start.customParameters ?? {};
              const agentName    = params.agentName    || "AI Assistant";
              const personality  = params.personality  || "helpful";
              const siteConfigId = params.siteConfigId || null;
              // Optional override system prompt (e.g., jail handshake sets this)
              systemPromptOverride = params.systemPrompt ?? null;

              // PTT mode: enabled via TwiML <Stream> customParameter ptt="1"
              pttEnabled = params.ptt === "1";
              if (pttEnabled) {
                isMicOpen = false;
                console.log(`[VoiceStream] PTT mode enabled — caller must press 1 to open mic`);
              }

              console.log(
                `[VoiceStream] Stream started – Call: ${callSid}, Site: ${siteConfigId ?? "unknown"}${pttEnabled ? " [PTT]" : ""}${systemPromptOverride ? " [CustomPrompt]" : ""}`
              );

              // Create (or reuse) session and start the stopwatch.
              // A session without siteConfigId can exist when the webhook created it before
              // the TwiML stream custom parameters were parsed (race condition on reconnect).
              let session = voiceSessionManager.getSession(callSid);
              if (!session) {
                session = voiceSessionManager.createSession(
                  callSid,
                  agentName,
                  personality,
                  siteConfigId
                );
              } else if (siteConfigId && !session.siteConfigId) {
                voiceSessionManager.updateSession(callSid, { siteConfigId });
              }
              session.streamSid = streamSid;
              voiceSessionManager.startCall(callSid);

              // Open the Gemini Live real-time audio connection (Clear Voice pipeline)
              openGeminiLive(agentName, personality);
            }
            break;

          case "media":
            if (message.media && callSid) {
              // PTT gate: when PTT mode is active, only pipe audio when mic is open
              if (pttEnabled && !isMicOpen) break;

              const payload = message.media.payload;
              if (geminiReady) {
                sendAudioToGemini(payload);
              } else {
                audioQueue.push(payload);
              }
            }
            break;

          case "dtmf":
            // Push-to-Talk: digit "1" toggles the microphone gate
            if (pttEnabled && message.dtmf?.digit === "1") {
              isMicOpen = !isMicOpen;
              console.log(`[VoiceStream] PTT ${isMicOpen ? "OPEN" : "CLOSED"} (DTMF 1) – Call: ${callSid}`);

              if (!isMicOpen && geminiWs?.readyState === WebSocket.OPEN) {
                // Closing the mic: signal end-of-utterance so Gemini begins processing
                geminiWs.send(
                  JSON.stringify({ realtime_input: { audio_stream_end: {} } })
                );
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
            await handleCallEnd();
            break;
        }
      } catch (error) {
        console.error("[VoiceStream] Error processing message:", error);
      }
    });

    ws.on("close", async () => {
      console.log(`[VoiceStream] WebSocket closed for call ${callSid}`);
      await handleCallEnd();
    });

    ws.on("error", (error) => {
      console.error("[VoiceStream] WebSocket error:", error);
    });
  });
}

/** Persist call completion data (timestamps + billing) to the database. */
async function persistCallCompletion(
  callSid: string,
  session: ReturnType<typeof voiceSessionManager.getSession>,
  actualSeconds: number
): Promise<void> {
  if (!session) return;
  try {
    // Lazy imports to avoid circular deps at module load time
    const { db } = await import("./db");
    const { callLogs } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { logVoiceUsage } = await import("./services/energy-monitor");

    // Update the call_log row (matched by callSid) with precise timestamps
    await db
      .update(callLogs)
      .set({
        callStart: session.callStart ?? undefined,
        callEnd: session.callEnd ?? undefined,
        actualSeconds,
        status: "completed",
        duration: actualSeconds,
        siteConfigId: session.siteConfigId ?? undefined,
      })
      .where(eq(callLogs.callSid, callSid));

    console.log(
      `[VoiceStream] Persisted call completion: callSid=${callSid}, actualSeconds=${actualSeconds}`
    );

    // Bill energy if we have a siteConfigId
    if (session.siteConfigId && actualSeconds > 0) {
      const result = await logVoiceUsage({
        siteConfigId: session.siteConfigId,
        callSid,
        callType: "phone",
        rawDurationSeconds: actualSeconds,
      });
      console.log(
        `[VoiceStream] Energy billed: ${result.billedMinutes} min, ` +
          `$${(result.billedAmountCents / 100).toFixed(2)} – ` +
          `balance: ${result.newBalance ?? "unrestricted"}`
      );
    }
  } catch (err: any) {
    console.error("[VoiceStream] Error persisting call completion:", err.message);
  }
}

function sendAudioToTwilio(ws: WebSocket, streamSid: string, audioPayload: string): void {
  const message = {
    event: "media",
    streamSid,
    media: { payload: audioPayload },
  };
  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("[VoiceStream] Error sending audio to Twilio:", error);
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
