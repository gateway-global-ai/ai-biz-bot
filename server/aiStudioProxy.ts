/**
 * AI Studio PTT WebSocket Proxy
 * Dedicated /ws/ai-studio-ptt endpoint; does not modify sovereign voice pipeline.
 * All config from env: GEMINI_WS_URL (optional), GEMINI_API_KEY, GEMINI_MODEL_ID, GEMINI_VOICE_NAME,
 * GEMINI_INPUT_SAMPLE_RATE, GEMINI_OUTPUT_SAMPLE_RATE.
 */
import { WebSocket, WebSocketServer } from "ws";

/** Gemini Live WebSocket base URL; same default as geminiVoice.ts / voiceStream.ts. */
const GEMINI_LIVE_WS_BASE =
  process.env.GEMINI_WS_URL ||
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
import { Server } from "http";
import type { IncomingMessage } from "http";
import { registerWebSocketRoute } from "./websocketRouter";
import { validateAIStudioSessionToken } from "./routes/aiStudioRoutes";

const WS_PATH = "/ws/ai-studio-ptt";

function getTokenFromRequest(request: IncomingMessage): string | null {
  const url = request.url ?? "";
  const match = url.match(/[?&]token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildSetupMessage(): object {
  const modelId = process.env.GEMINI_MODEL_ID;
  const voiceName = process.env.GEMINI_VOICE_NAME ?? "Puck";
  const inputRate = process.env.GEMINI_INPUT_SAMPLE_RATE ?? "16000";
  const outputRate = process.env.GEMINI_OUTPUT_SAMPLE_RATE ?? "24000";

  if (!modelId) {
    throw new Error("GEMINI_MODEL_ID is not set in environment variables.");
  }

  return {
    setup: {
      model: modelId,
      generation_config: {
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: voiceName,
            },
          },
        },
      },
      system_instruction: {
        parts: [
          {
            text: "You are a helpful voice assistant. Respond concisely. Use the provided voice settings.",
          },
        ],
      },
    },
    _config: { inputSampleRate: inputRate, outputSampleRate: outputRate },
  };
}

export function setupAIStudioPTTProxy(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });
  registerWebSocketRoute(WS_PATH, wss, "AIStudioPTT");

  wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
    const token = getTokenFromRequest(request);
    // #region agent log
    fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiStudioProxy.ts:connection',message:'Client connected',data:{hasToken:!!token,tokenLen:token?.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (!validateAIStudioSessionToken(token ?? undefined)) {
      console.warn("[AIStudioPTT] Rejected connection: missing or invalid session token");
      clientWs.close(4008, "Invalid or expired session token");
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[AIStudioPTT] GEMINI_API_KEY not set");
      clientWs.close(1011, "Server configuration error");
      return;
    }
    const googleUrl = `${GEMINI_LIVE_WS_BASE}${GEMINI_LIVE_WS_BASE.includes("?") ? "&" : "?"}key=${apiKey}`;
    const googleWs = new WebSocket(googleUrl);
    let messageQueue: Buffer[] = [];
    let isGoogleOpen = false;
    let setupSent = false;

    const sendToClient = (data: string | Buffer) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    };

    googleWs.on("open", () => {
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiStudioProxy.ts:googleOpen',message:'Gemini upstream open',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      console.log("[AIStudioPTT] Connected to Gemini upstream. Sending setup...");
      isGoogleOpen = true;
      if (!setupSent) {
        try {
          const setup = buildSetupMessage();
          const { _config, ...payload } = setup as { setup: object; _config?: object };
          googleWs.send(JSON.stringify(payload));
          setupSent = true;
        } catch (err: any) {
          console.error("[AIStudioPTT] Setup build failed:", err.message);
          sendToClient(JSON.stringify({ type: "error", message: err.message }));
        }
      }
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg) processClientMessage(msg);
      }
    });

    const processClientMessage = (data: Buffer) => {
      try {
        const raw = data.toString();
        const message = JSON.parse(raw);

        if (message.type === "audio" && message.data) {
          const inputRate = process.env.GEMINI_INPUT_SAMPLE_RATE ?? "16000";
          const forGoogle = {
            realtime_input: {
              media_chunks: [
                {
                  mime_type: `audio/pcm;rate=${inputRate}`,
                  data: message.data,
                },
              ],
            },
          };
          googleWs.send(JSON.stringify(forGoogle));
        } else if (message.clientContent) {
          // #region agent log
          const turnComplete = message.clientContent?.turnComplete ?? message.clientContent?.turn_complete;
          if (turnComplete) fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiStudioProxy.ts:turnComplete',message:'Sent turnComplete to Gemini',data:{},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          googleWs.send(JSON.stringify(message));
        } else if (message.setup) {
          // Client must not send setup; we send it server-side. Ignore or replace.
          return;
        } else {
          googleWs.send(raw);
        }
      } catch (e) {
        console.error("[AIStudioPTT] Error processing client message:", e);
      }
    };

    googleWs.on("message", (data: Buffer | string) => {
      const str = typeof data === "string" ? data : data.toString();
      try {
        const response = JSON.parse(str);
        const hasSetupComplete = !!(response.setupComplete ?? response.setup_complete);
        const hasModelTurn = !!(response.serverContent?.modelTurn ?? response.server_content?.model_turn);
        const keys = Object.keys(response).slice(0, 8);
        // #region agent log
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiStudioProxy.ts:googleMessage',message:'From Gemini',data:{hasSetupComplete,hasModelTurn,topKeys:keys,clientOpen:clientWs.readyState===WebSocket.OPEN},timestamp:Date.now(),hypothesisId:'H1,H3,H4'})}).catch(()=>{});
        // #endregion
        const setupComplete = response.setupComplete ?? response.setup_complete;
        if (setupComplete && clientWs.readyState === WebSocket.OPEN) {
          console.log("[AIStudioPTT] Gemini Setup Complete. Server is ready.");
          sendToClient(JSON.stringify({ type: "server_ready", status: "ready" }));
        }
        if (response.serverContent?.modelTurn || response.server_content?.model_turn) {
          console.log("[AIStudioPTT] Received audio chunk from Gemini");
        }
        if (response.error) {
          console.error("[AIStudioPTT] Google error:", response.error);
        }
      } catch (_) {}
      sendToClient(str);
    });

    clientWs.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        console.warn("[AIStudioPTT] Ignoring binary message from client");
        return;
      }
      if (isGoogleOpen) {
        processClientMessage(data);
      } else {
        messageQueue.push(data);
      }
    });

    googleWs.on("error", (err) => {
      console.error("[AIStudioPTT] GEMINI WS ERROR:", err);
      sendToClient(JSON.stringify({ type: "error", message: `Upstream error: ${(err as Error).message}` }));
    });

    googleWs.on("close", (code, reason) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason?.toString());
      }
    });

    clientWs.on("error", () => {
      if (googleWs.readyState === WebSocket.OPEN || googleWs.readyState === WebSocket.CONNECTING) {
        googleWs.close(1011, "Client error");
      }
    });

    clientWs.on("close", () => {
      if (googleWs.readyState === WebSocket.OPEN || googleWs.readyState === WebSocket.CONNECTING) {
        googleWs.close();
      }
    });
  });

  console.log(`[AIStudioPTT] WebSocket proxy registered at ${WS_PATH}`);
}
